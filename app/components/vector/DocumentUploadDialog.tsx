'use client';

import { useState, useRef } from 'react';
import { X, Upload, FileText, Loader2, CheckCircle, AlertCircle, Pause, Play } from 'lucide-react';
import { VectorCollection } from '@/app/hooks/useVectorCollections';
import { batchGenerateEmbeddings } from '@/app/lib/vector/embedding';
import { BatchDocumentProcessor, formatTimeRemaining } from '@/app/lib/vector/batch-processor';
import { useMonkDBClient } from '@/app/lib/monkdb-context';
import { useToast } from '@/app/components/ToastContext';

interface DocumentUploadDialogProps {
  collection: VectorCollection;
  onClose: () => void;
  onSuccess: () => void;
}

interface Document {
  id: string;
  content: string;
}

export default function DocumentUploadDialog({
  collection,
  onClose,
  onSuccess,
}: DocumentUploadDialogProps) {
  const client = useMonkDBClient();
  const toast = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, stage: '', estimatedTime: 0 });
  const [errors, setErrors] = useState<string[]>([]);
  const [paused, setPaused] = useState(false);
  const batchProcessorRef = useRef<BatchDocumentProcessor | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const ext = file.name.split('.').pop()?.toLowerCase();

      let parsed: Document[] = [];

      if (ext === 'json') {
        const data = JSON.parse(text);
        // Support both array and object with documents field
        const items = Array.isArray(data) ? data : data.documents || [];
        parsed = items.map((item: any, idx: number) => ({
          id: item.id || `doc_${Date.now()}_${idx}`,
          content: item.content || item.text || JSON.stringify(item),
        }));
      } else if (ext === 'csv') {
        const lines = text.split('\n').filter(l => l.trim());
        const hasHeader = lines[0].toLowerCase().includes('id') || lines[0].toLowerCase().includes('content');
        const dataLines = hasHeader ? lines.slice(1) : lines;

        parsed = dataLines.map((line, idx) => {
          const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''));
          return {
            id: parts[0] || `doc_${Date.now()}_${idx}`,
            content: parts.slice(1).join(',') || parts[0],
          };
        });
      } else if (ext === 'txt') {
        const lines = text.split('\n').filter(l => l.trim());
        parsed = lines.map((line, idx) => ({
          id: `doc_${Date.now()}_${idx}`,
          content: line.trim(),
        }));
      } else {
        throw new Error('Unsupported file format. Use JSON, CSV, or TXT');
      }

      if (parsed.length === 0) {
        throw new Error('No documents found in file');
      }

      setDocuments(parsed);
      toast.success('Documents Loaded', `Loaded ${parsed.length} documents from file`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to parse file';
      toast.error('Parse Failed', message);
      setErrors([message]);
    }
  };

  const handleTextInput = (text: string) => {
    if (!text.trim()) {
      setDocuments([]);
      return;
    }

    try {
      // Try parsing as JSON first
      const data = JSON.parse(text);
      const items = Array.isArray(data) ? data : data.documents || [];
      const parsed = items.map((item: any, idx: number) => ({
        id: item.id || `doc_${Date.now()}_${idx}`,
        content: item.content || item.text || JSON.stringify(item),
      }));
      setDocuments(parsed);
    } catch {
      // Treat as plain text, one document per line
      const lines = text.split('\n').filter(l => l.trim());
      const parsed = lines.map((line, idx) => ({
        id: `doc_${Date.now()}_${idx}`,
        content: line.trim(),
      }));
      setDocuments(parsed);
    }
  };

  const handleUpload = async () => {
    if (!client || documents.length === 0) return;

    setUploading(true);
    setErrors([]);

    try {
      // Use batch processor for large uploads (>1000 docs)
      if (documents.length > 1000) {
        const processor = new BatchDocumentProcessor(
          documents,
          client,
          collection,
          {
            chunkSize: 500,
            pauseBetweenChunks: 100,
            onProgress: (batchProgress) => {
              setProgress({
                current: batchProgress.processedDocuments,
                total: batchProgress.totalDocuments,
                stage: batchProgress.stage,
                estimatedTime: batchProgress.estimatedTimeRemaining || 0,
              });

              if (batchProgress.errors.length > 0) {
                setErrors(batchProgress.errors.map(e => `${e.documentId}: ${e.error}`));
              }

              if (batchProgress.stage === 'paused') {
                setPaused(true);
              }
            },
          }
        );

        batchProcessorRef.current = processor;

        const result = await processor.process();

        if (result.errors.length === 0) {
          toast.success('Upload Complete', `Successfully uploaded ${documents.length} documents`);
          onSuccess();
          onClose();
        } else {
          toast.warning(
            'Partial Upload',
            `Uploaded ${documents.length - result.errors.length}/${documents.length} documents`
          );
        }
      } else {
        // Simple upload for small batches
        setProgress({ current: 0, total: documents.length, stage: 'Generating embeddings', estimatedTime: 0 });

        const embeddings = await batchGenerateEmbeddings(
          documents.map(d => d.content),
          (completed, total) => {
            setProgress({ current: completed, total, stage: 'Generating embeddings', estimatedTime: 0 });
          }
        );

        setProgress({ current: 0, total: documents.length, stage: 'Uploading documents', estimatedTime: 0 });

        const uploadErrors: string[] = [];

        for (let i = 0; i < documents.length; i++) {
          const doc = documents[i];
          const embedding = embeddings[i];

          try {
            const query = `
              INSERT INTO "${collection.schema}"."${collection.table}" (id, content, ${collection.columnName})
              VALUES ($1, $2, $3)
              ON CONFLICT (id) DO UPDATE SET
                content = EXCLUDED.content,
                ${collection.columnName} = EXCLUDED.${collection.columnName}
            `;

            await client.query(query, [doc.id, doc.content, embedding]);
          } catch (err) {
            const message = `Document ${doc.id}: ${err instanceof Error ? err.message : 'Unknown error'}`;
            uploadErrors.push(message);
          }

          setProgress({
            current: i + 1,
            total: documents.length,
            stage: 'Uploading documents',
            estimatedTime: 0,
          });
        }

        if (uploadErrors.length === 0) {
          toast.success('Upload Complete', `Successfully uploaded ${documents.length} documents`);
          onSuccess();
          onClose();
        } else {
          setErrors(uploadErrors);
          toast.warning(
            'Partial Upload',
            `Uploaded ${documents.length - uploadErrors.length}/${documents.length} documents`
          );
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      toast.error('Upload Failed', message);
      setErrors([message]);
    } finally {
      setUploading(false);
      setPaused(false);
      batchProcessorRef.current = null;
    }
  };

  const handlePauseResume = () => {
    if (batchProcessorRef.current) {
      if (paused) {
        batchProcessorRef.current.resume();
        setPaused(false);
      } else {
        batchProcessorRef.current.pause();
        setPaused(true);
      }
    }
  };

  const progressPercent = progress.total > 0
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Upload Documents
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {collection.schema}.{collection.table} ({collection.dimension}D)
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={uploading}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Upload File
            </label>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <input
                type="file"
                accept=".json,.csv,.txt"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                Choose file
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                JSON, CSV, or TXT (max 10MB)
              </p>
            </div>
          </div>

          {/* Text Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Or Paste Documents
            </label>
            <textarea
              placeholder={`JSON: [{"id": "1", "content": "text"}]\nor one document per line`}
              onChange={(e) => handleTextInput(e.target.value)}
              disabled={uploading}
              className="w-full h-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Document Preview */}
          {documents.length > 0 && !uploading && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Documents ({documents.length})
                </span>
                <button
                  onClick={() => setDocuments([])}
                  className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  Clear
                </button>
              </div>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg max-h-48 overflow-y-auto">
                {documents.slice(0, 5).map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                  >
                    <div className="text-xs font-mono text-gray-600 dark:text-gray-400">
                      {doc.id}
                    </div>
                    <div className="text-sm text-gray-900 dark:text-gray-100 truncate mt-1">
                      {doc.content}
                    </div>
                  </div>
                ))}
                {documents.length > 5 && (
                  <div className="p-3 text-xs text-gray-500 dark:text-gray-400 text-center">
                    +{documents.length - 5} more documents
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Progress */}
          {uploading && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {!paused ? (
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                ) : (
                  <Pause className="w-5 h-5 text-orange-600" />
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {paused ? 'Paused' : progress.stage}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {progress.current} / {progress.total}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  {progress.estimatedTime > 0 && !paused && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Estimated time remaining: {formatTimeRemaining(progress.estimatedTime)}
                    </div>
                  )}
                </div>
                {/* Pause/Resume button for large uploads */}
                {documents.length > 1000 && batchProcessorRef.current && (
                  <button
                    onClick={handlePauseResume}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title={paused ? 'Resume' : 'Pause'}
                  >
                    {paused ? (
                      <Play className="w-5 h-5 text-green-600" />
                    ) : (
                      <Pause className="w-5 h-5 text-orange-600" />
                    )}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <div className="border border-red-200 dark:border-red-800 rounded-lg p-4 bg-red-50 dark:bg-red-950/30">
              <div className="flex items-start gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5" />
                <span className="text-sm font-medium text-red-800 dark:text-red-200">
                  {errors.length} Error{errors.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {errors.map((error, idx) => (
                  <div key={idx} className="text-xs text-red-700 dark:text-red-300">
                    {error}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={uploading}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={uploading || documents.length === 0}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Upload {documents.length} Document{documents.length !== 1 ? 's' : ''}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
