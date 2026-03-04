/**
 * Batch processor for large-scale document uploads
 * Handles chunked processing with pause/resume and error recovery
 */

import { batchGenerateEmbeddings } from './embedding';
import { MonkDBClient } from '../monkdb-client';

export interface BatchDocument {
  id: string;
  content: string;
}

export interface BatchProcessingOptions {
  chunkSize: number;
  pauseBetweenChunks?: number;
  onProgress?: (progress: BatchProgress) => void;
  onError?: (error: BatchError) => void;
  shouldPause?: () => boolean;
}

export interface BatchProgress {
  totalDocuments: number;
  processedDocuments: number;
  currentChunk: number;
  totalChunks: number;
  stage: 'embedding' | 'uploading' | 'complete' | 'paused' | 'error';
  errors: BatchError[];
  startTime: number;
  estimatedTimeRemaining?: number;
}

export interface BatchError {
  documentId: string;
  error: string;
  timestamp: number;
}

export class BatchDocumentProcessor {
  private paused: boolean = false;
  private cancelled: boolean = false;
  private progress: BatchProgress;
  private processingTimes: number[] = [];

  constructor(
    private documents: BatchDocument[],
    private client: MonkDBClient,
    private collection: {
      schema: string;
      table: string;
      columnName: string;
      dimension: number;
    },
    private options: BatchProcessingOptions
  ) {
    const totalChunks = Math.ceil(documents.length / options.chunkSize);
    this.progress = {
      totalDocuments: documents.length,
      processedDocuments: 0,
      currentChunk: 0,
      totalChunks,
      stage: 'embedding',
      errors: [],
      startTime: Date.now(),
    };
  }

  /**
   * Start batch processing
   */
  async process(): Promise<BatchProgress> {
    const { chunkSize, pauseBetweenChunks = 0 } = this.options;

    try {
      for (let i = 0; i < this.documents.length; i += chunkSize) {
        // Check for pause request
        if (this.options.shouldPause?.() || this.paused) {
          this.progress.stage = 'paused';
          this.notifyProgress();
          await this.waitForResume();
        }

        // Check for cancellation
        if (this.cancelled) {
          throw new Error('Processing cancelled by user');
        }

        const chunkStart = i;
        const chunkEnd = Math.min(i + chunkSize, this.documents.length);
        const chunk = this.documents.slice(chunkStart, chunkEnd);

        this.progress.currentChunk = Math.floor(i / chunkSize) + 1;

        // Process chunk
        await this.processChunk(chunk, chunkStart);

        // Pause between chunks to avoid overwhelming the system
        if (pauseBetweenChunks > 0 && chunkEnd < this.documents.length) {
          await this.sleep(pauseBetweenChunks);
        }

        // Update estimated time
        this.updateEstimatedTime();
      }

      this.progress.stage = 'complete';
      this.notifyProgress();
      return this.progress;
    } catch (error) {
      this.progress.stage = 'error';
      this.progress.errors.push({
        documentId: 'batch',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      });
      this.notifyProgress();
      throw error;
    }
  }

  /**
   * Process a single chunk of documents
   */
  private async processChunk(chunk: BatchDocument[], startIndex: number): Promise<void> {
    const chunkStartTime = Date.now();

    try {
      // Stage 1: Generate embeddings
      this.progress.stage = 'embedding';
      this.notifyProgress();

      const embeddings = await batchGenerateEmbeddings(
        chunk.map((d) => d.content),
        (completed, total) => {
          this.progress.processedDocuments = startIndex + completed;
          this.notifyProgress();
        }
      );

      // Stage 2: Upload to database
      this.progress.stage = 'uploading';
      this.notifyProgress();

      const errors: BatchError[] = [];

      // MonkDB uses ? placeholders (not $1/$2/... PostgreSQL style).
      // Column name is double-quoted to handle reserved words and special chars.
      const colRef = `"${this.collection.columnName.replace(/"/g, '""')}"`;

      // Build bulk insert: one (?, ?, ?) group per document, flat args array.
      const values: unknown[] = [];
      const valuePlaceholders: string[] = [];

      chunk.forEach((doc, idx) => {
        valuePlaceholders.push(`(?, ?, ?)`);
        values.push(doc.id, doc.content, embeddings[idx]);
      });

      const bulkQuery = `
        INSERT INTO "${this.collection.schema}"."${this.collection.table}"
        (id, content, ${colRef})
        VALUES ${valuePlaceholders.join(', ')}
        ON CONFLICT (id) DO UPDATE SET
          content = excluded.content,
          ${colRef} = excluded.${colRef}
      `;

      try {
        await this.client.query(bulkQuery, values);
        this.progress.processedDocuments = startIndex + chunk.length;
      } catch (err) {
        // Fallback: Insert one by one using ? placeholders
        for (let i = 0; i < chunk.length; i++) {
          const doc = chunk[i];
          const embedding = embeddings[i];

          try {
            const singleQuery = `
              INSERT INTO "${this.collection.schema}"."${this.collection.table}"
              (id, content, ${colRef})
              VALUES (?, ?, ?)
              ON CONFLICT (id) DO UPDATE SET
                content = excluded.content,
                ${colRef} = excluded.${colRef}
            `;

            await this.client.query(singleQuery, [doc.id, doc.content, embedding]);
            this.progress.processedDocuments = startIndex + i + 1;
          } catch (docErr) {
            errors.push({
              documentId: doc.id,
              error: docErr instanceof Error ? docErr.message : 'Unknown error',
              timestamp: Date.now(),
            });
          }

          this.notifyProgress();
        }
      }

      this.progress.errors.push(...errors);

      // Record processing time for this chunk
      const chunkTime = Date.now() - chunkStartTime;
      this.processingTimes.push(chunkTime);

      // Keep only last 10 chunk times for estimation
      if (this.processingTimes.length > 10) {
        this.processingTimes.shift();
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Pause processing
   */
  pause(): void {
    this.paused = true;
  }

  /**
   * Resume processing
   */
  resume(): void {
    this.paused = false;
  }

  /**
   * Cancel processing
   */
  cancel(): void {
    this.cancelled = true;
  }

  /**
   * Wait until resumed
   */
  private async waitForResume(): Promise<void> {
    while (this.paused && !this.cancelled) {
      await this.sleep(100);
    }
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Update estimated time remaining
   */
  private updateEstimatedTime(): void {
    if (this.processingTimes.length === 0) return;

    const avgChunkTime = this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length;
    const remainingChunks = this.progress.totalChunks - this.progress.currentChunk;
    this.progress.estimatedTimeRemaining = avgChunkTime * remainingChunks;
  }

  /**
   * Notify progress callback
   */
  private notifyProgress(): void {
    this.options.onProgress?.(this.progress);
  }

  /**
   * Get current progress
   */
  getProgress(): BatchProgress {
    return { ...this.progress };
  }
}

/**
 * Helper function to format time remaining
 */
export function formatTimeRemaining(ms: number): string {
  if (ms < 1000) return 'Less than a second';

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }

  if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }

  return `${seconds}s`;
}
