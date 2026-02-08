/**
 * Full-Text Search utility functions for MonkDB
 * Handles MATCH query building, BM25 scoring, and text highlighting
 */

/**
 * Build a MATCH query with optional field boosting
 * @param columns - Array of column names to search
 * @param query - Search query text
 * @param boosts - Optional map of column names to boost values (e.g., { title: 2.0, description: 1.0 })
 * @returns MATCH clause string
 */
export function buildMatchQuery(
  columns: string[],
  query: string,
  boosts?: Record<string, number>
): string {
  if (columns.length === 0) {
    throw new Error('At least one column is required');
  }

  if (columns.length === 1) {
    // Single column - no boosting syntax needed
    return `MATCH(${columns[0]}, ?)`;
  }

  // Multi-column with optional boosting
  if (boosts && Object.keys(boosts).length > 0) {
    const boostedColumns = columns.map((col) => {
      const boost = boosts[col];
      return boost && boost !== 1.0 ? `${col} ${boost.toFixed(1)}` : col;
    });
    return `MATCH((${boostedColumns.join(', ')}), ?)`;
  }

  // Multi-column without boosting
  return `MATCH((${columns.join(', ')}), ?)`;
}

/**
 * Highlight matched terms in text (simple implementation)
 * @param text - Text to highlight
 * @param query - Search query
 * @returns HTML string with highlighted terms
 */
export function highlightMatches(text: string, query: string): string {
  if (!text || !query) return text;

  // Extract individual terms from query (remove operators)
  const terms = query
    .toLowerCase()
    .replace(/[+\-"]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2); // Ignore very short terms

  let highlighted = text;

  terms.forEach((term) => {
    const regex = new RegExp(`(${escapeRegExp(term)})`, 'gi');
    highlighted = highlighted.replace(
      regex,
      '<mark class="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">$1</mark>'
    );
  });

  return highlighted;
}

/**
 * Format BM25 score as a percentage
 * @param score - Raw BM25 score
 * @returns Formatted score string
 */
export function formatBM25Score(score: number): string {
  if (score === 0) return '0%';
  if (score < 0.01) return '<1%';

  // BM25 scores are typically between 0-10+
  // Normalize to 0-100% for display
  const normalized = Math.min((score / 10) * 100, 100);

  return `${normalized.toFixed(1)}%`;
}

/**
 * Check if a table needs REFRESH before searching
 * Note: This is a placeholder - actual implementation would query sys.operations_log
 * or track table modifications
 * @param schema - Schema name
 * @param table - Table name
 * @returns Whether refresh is needed
 */
export function needsRefresh(schema: string, table: string): boolean {
  // In production, this would check:
  // 1. Last REFRESH TABLE timestamp
  // 2. Last INSERT/UPDATE timestamp
  // 3. Return true if modifications exist after last refresh

  // For now, return false (assume refreshed)
  return false;
}

/**
 * Escape special regex characters
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Parse FTS analyzer from index metadata
 * @param analyzerString - Analyzer string from database
 * @returns Analyzer name
 */
export function parseAnalyzer(analyzerString: string): string {
  // Default analyzer if not specified
  if (!analyzerString) return 'standard';

  // Extract analyzer name from various formats
  const match = analyzerString.match(/analyzer[=:\s]+['"]?(\w+)['"]?/i);
  return match ? match[1] : analyzerString;
}

/**
 * Get analyzer description
 * @param analyzer - Analyzer name
 * @returns Human-readable description
 */
export function getAnalyzerDescription(analyzer: string): string {
  const descriptions: Record<string, string> = {
    standard: 'Basic tokenization, no stemming or stop words',
    english: 'English stemming and stop words',
    keyword: 'Treats entire field as single token (exact match)',
    simple: 'Lowercase and split on non-letters',
    whitespace: 'Split on whitespace only',
  };

  return descriptions[analyzer.toLowerCase()] || 'Custom analyzer';
}

/**
 * Validate FTS query syntax
 * @param query - Search query
 * @returns Validation result with any errors
 */
export function validateFTSQuery(query: string): {
  valid: boolean;
  error?: string;
} {
  if (!query || query.trim().length === 0) {
    return { valid: false, error: 'Query cannot be empty' };
  }

  // Check for balanced quotes
  const quoteCount = (query.match(/"/g) || []).length;
  if (quoteCount % 2 !== 0) {
    return { valid: false, error: 'Unbalanced quotes in query' };
  }

  // Check for balanced parentheses
  let parenCount = 0;
  for (const char of query) {
    if (char === '(') parenCount++;
    if (char === ')') parenCount--;
    if (parenCount < 0) {
      return { valid: false, error: 'Unbalanced parentheses in query' };
    }
  }

  if (parenCount !== 0) {
    return { valid: false, error: 'Unbalanced parentheses in query' };
  }

  return { valid: true };
}

/**
 * Build example FTS queries for tutorials
 */
export const FTS_QUERY_EXAMPLES = {
  basic: {
    query: 'error',
    description: 'Find documents containing "error"',
  },
  phrase: {
    query: '"connection timeout"',
    description: 'Exact phrase search',
  },
  boolean: {
    query: 'error +database -warning',
    description: 'Must have "database", exclude "warning"',
  },
  wildcard: {
    query: 'connect*',
    description: 'Prefix matching (connection, connected, etc.)',
  },
  proximity: {
    query: '"database error"~5',
    description: 'Words within 5 positions of each other',
  },
};
