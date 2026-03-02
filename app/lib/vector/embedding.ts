/**
 * Client-side embedding generation using ONNX Runtime Web
 * Uses all-MiniLM-L6-v2 model (384 dimensions, 22MB)
 * Privacy-preserving - no external API calls
 */

// Model configuration
const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';
const EMBEDDING_DIMENSION = 384;

// Singleton pipeline instance
let embeddingPipeline: any = null;
let isLoading = false;
let loadError: Error | null = null;
let transformersModule: any = null;

/**
 * Dynamically import transformers library (client-side only)
 */
async function loadTransformers() {
  if (transformersModule) {
    return transformersModule;
  }

  // Strict browser-only check
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('Vector embeddings require a browser environment');
  }

  try {
    // Use dynamic import with error boundary
    const module = await import('@xenova/transformers').catch(() => {
      throw new Error(
        'Failed to load AI model library. This might be due to:\n' +
        '1. Browser compatibility issues\n' +
        '2. Network connectivity problems\n' +
        '3. Ad blockers or content security policies\n\n' +
        'Try refreshing the page or using a different browser.'
      );
    });

    // Wait a tick to ensure module is fully initialized
    await new Promise(resolve => setTimeout(resolve, 100));

    // Configure transformers.js to use local cache
    try {
      if (module && module.env && typeof module.env === 'object') {
        module.env.allowLocalModels = false;
        module.env.allowRemoteModels = true;
        module.env.backends = module.env.backends || {};
      }
    } catch {
      // Configuration is optional — continue
    }

    transformersModule = module;
    return module;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(
      'Cannot load embedding model:\n' +
      errorMsg + '\n\n' +
      'Possible solutions:\n' +
      '• Refresh the page\n' +
      '• Clear browser cache\n' +
      '• Try a different browser (Chrome, Firefox, Edge)\n' +
      '• Disable ad blockers temporarily\n' +
      '• Check browser console for more details'
    );
  }
}

/**
 * Initialize the embedding model pipeline
 * Lazy loads on first use and caches for subsequent calls
 */
async function getEmbeddingPipeline(): Promise<any> {
  if (embeddingPipeline) {
    return embeddingPipeline;
  }

  if (loadError) {
    throw loadError;
  }

  if (isLoading) {
    // Wait for existing load to complete
    while (isLoading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (embeddingPipeline) {
      return embeddingPipeline;
    }
    if (loadError) {
      throw loadError;
    }
  }

  isLoading = true;

  try {
    const { pipeline } = await loadTransformers();
    embeddingPipeline = await pipeline('feature-extraction', MODEL_NAME);
    return embeddingPipeline;
  } catch (error) {
    loadError = error instanceof Error ? error : new Error('Failed to load model');
    throw loadError;
  } finally {
    isLoading = false;
  }
}

/**
 * Generate embedding vector for a single text string
 * @param text - Input text to embed
 * @returns Array of 384 floating point numbers
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    throw new Error('Text cannot be empty');
  }

  const pipe = await getEmbeddingPipeline();

  // Generate embeddings
  const output = await pipe(text, {
    pooling: 'mean',
    normalize: true,
  });

  // Extract the embedding vector
  const embedding = Array.from(output.data) as number[];

  if (embedding.length !== EMBEDDING_DIMENSION) {
    throw new Error(
      `Expected ${EMBEDDING_DIMENSION} dimensions, got ${embedding.length}`
    );
  }

  return embedding;
}

/**
 * Generate embeddings for multiple texts in batch
 * More efficient than calling generateEmbedding multiple times
 * @param texts - Array of input texts
 * @param onProgress - Optional callback for progress updates (called for each text)
 * @returns Array of embedding vectors
 */
export async function batchGenerateEmbeddings(
  texts: string[],
  onProgress?: (completed: number, total: number) => void
): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  const pipe = await getEmbeddingPipeline();
  const embeddings: number[][] = [];

  // Process in batches of 10 for better performance
  const BATCH_SIZE = 10;

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, Math.min(i + BATCH_SIZE, texts.length));

    // Process batch items sequentially to avoid memory issues
    for (const text of batch) {
      if (!text || text.trim().length === 0) {
        embeddings.push(new Array(EMBEDDING_DIMENSION).fill(0));
      } else {
        const output = await pipe(text, {
          pooling: 'mean',
          normalize: true,
        });
        embeddings.push(Array.from(output.data) as number[]);
      }

      if (onProgress) {
        onProgress(embeddings.length, texts.length);
      }
    }
  }

  return embeddings;
}

/**
 * Preload the model to avoid delay on first use
 * Call this on app initialization for better UX
 */
export async function preloadModel(): Promise<void> {
  await getEmbeddingPipeline();
}

/**
 * Check if the model is currently loaded
 */
export function isModelLoaded(): boolean {
  return embeddingPipeline !== null;
}

/**
 * Get model information
 */
export function getModelInfo() {
  return {
    name: MODEL_NAME,
    dimension: EMBEDDING_DIMENSION,
    loaded: isModelLoaded(),
    loading: isLoading,
    error: loadError?.message,
  };
}

/**
 * Calculate cosine similarity between two vectors
 * @param a - First vector
 * @param b - Second vector
 * @returns Similarity score between -1 and 1 (1 = identical)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
