/**
 * Hybrid search utilities - combining vector and FTS search
 */

export interface HybridSearchResult {
  id: string;
  content: string;
  vectorScore: number;
  ftsScore: number;
  hybridScore: number;
  rank: number;
  source: 'vector' | 'fts' | 'both';
  [key: string]: any;
}

export interface HybridSearchWeights {
  vectorWeight: number; // 0-1
  ftsWeight: number; // 0-1
}

/**
 * Merge and rank results from vector and FTS searches
 * @param vectorResults - Results from vector search with _score
 * @param ftsResults - Results from FTS search with _score
 * @param weights - Weights for each search type
 * @param idField - Field to use as unique identifier
 * @returns Merged and ranked results
 */
export function mergeSearchResults(
  vectorResults: any[],
  ftsResults: any[],
  weights: HybridSearchWeights,
  idField: string = 'id'
): HybridSearchResult[] {
  // Normalize weights to sum to 1
  const totalWeight = weights.vectorWeight + weights.ftsWeight;
  const normalizedVectorWeight = weights.vectorWeight / totalWeight;
  const normalizedFTSWeight = weights.ftsWeight / totalWeight;

  // Normalize scores to 0-1 range
  const maxVectorScore = Math.max(...vectorResults.map(r => r._score || 0), 1);
  const maxFTSScore = Math.max(...ftsResults.map(r => r._score || 0), 1);

  // Create result map
  const resultMap = new Map<string, HybridSearchResult>();

  // Process vector results
  vectorResults.forEach((result) => {
    const id = result[idField];
    const normalizedScore = (result._score || 0) / maxVectorScore;

    resultMap.set(id, {
      ...result,
      id,
      content: result.content || '',
      vectorScore: normalizedScore,
      ftsScore: 0,
      hybridScore: normalizedScore * normalizedVectorWeight,
      rank: 0,
      source: 'vector',
    });
  });

  // Process FTS results and merge
  ftsResults.forEach((result) => {
    const id = result[idField];
    const normalizedScore = (result._score || 0) / maxFTSScore;

    if (resultMap.has(id)) {
      // Merge with existing
      const existing = resultMap.get(id)!;
      existing.ftsScore = normalizedScore;
      existing.hybridScore =
        existing.vectorScore * normalizedVectorWeight +
        normalizedScore * normalizedFTSWeight;
      existing.source = 'both';
    } else {
      // Add new result
      resultMap.set(id, {
        ...result,
        id,
        content: result.content || '',
        vectorScore: 0,
        ftsScore: normalizedScore,
        hybridScore: normalizedScore * normalizedFTSWeight,
        rank: 0,
        source: 'fts',
      });
    }
  });

  // Sort by hybrid score and assign ranks
  const sortedResults = Array.from(resultMap.values()).sort(
    (a, b) => b.hybridScore - a.hybridScore
  );

  sortedResults.forEach((result, idx) => {
    result.rank = idx + 1;
  });

  return sortedResults;
}

/**
 * Calculate Reciprocal Rank Fusion (RRF) score
 * Alternative ranking algorithm that combines rankings rather than scores
 * @param vectorResults - Results from vector search
 * @param ftsResults - Results from FTS search
 * @param k - RRF constant (default 60)
 * @param idField - Field to use as unique identifier
 * @returns Merged results ranked by RRF
 */
export function reciprocalRankFusion(
  vectorResults: any[],
  ftsResults: any[],
  k: number = 60,
  idField: string = 'id'
): HybridSearchResult[] {
  const resultMap = new Map<string, HybridSearchResult>();

  // Process vector results
  vectorResults.forEach((result, rank) => {
    const id = result[idField];
    const rrfScore = 1 / (k + rank + 1);

    resultMap.set(id, {
      ...result,
      id,
      content: result.content || '',
      vectorScore: result._score || 0,
      ftsScore: 0,
      hybridScore: rrfScore,
      rank: 0,
      source: 'vector',
    });
  });

  // Process FTS results
  ftsResults.forEach((result, rank) => {
    const id = result[idField];
    const rrfScore = 1 / (k + rank + 1);

    if (resultMap.has(id)) {
      const existing = resultMap.get(id)!;
      existing.ftsScore = result._score || 0;
      existing.hybridScore += rrfScore;
      existing.source = 'both';
    } else {
      resultMap.set(id, {
        ...result,
        id,
        content: result.content || '',
        vectorScore: 0,
        ftsScore: result._score || 0,
        hybridScore: rrfScore,
        rank: 0,
        source: 'fts',
      });
    }
  });

  // Sort by RRF score
  const sortedResults = Array.from(resultMap.values()).sort(
    (a, b) => b.hybridScore - a.hybridScore
  );

  sortedResults.forEach((result, idx) => {
    result.rank = idx + 1;
  });

  return sortedResults;
}

/**
 * Get recommended weights based on query characteristics
 * @param query - Search query
 * @returns Recommended weights
 */
export function getRecommendedWeights(query: string): HybridSearchWeights {
  const words = query.trim().split(/\s+/);

  // Short queries (1-2 words) - favor semantic search
  if (words.length <= 2) {
    return { vectorWeight: 0.7, ftsWeight: 0.3 };
  }

  // Long queries (>10 words) - favor keyword search
  if (words.length > 10) {
    return { vectorWeight: 0.3, ftsWeight: 0.7 };
  }

  // Has operators (+, -, ") - favor FTS
  if (/[+\-"]/.test(query)) {
    return { vectorWeight: 0.2, ftsWeight: 0.8 };
  }

  // Medium length - balanced
  return { vectorWeight: 0.5, ftsWeight: 0.5 };
}

/**
 * Format hybrid score as percentage
 */
export function formatHybridScore(score: number): string {
  return `${(score * 100).toFixed(1)}%`;
}

/**
 * Get source badge color
 */
export function getSourceColor(source: 'vector' | 'fts' | 'both'): string {
  switch (source) {
    case 'vector':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200';
    case 'fts':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200';
    case 'both':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200';
  }
}
