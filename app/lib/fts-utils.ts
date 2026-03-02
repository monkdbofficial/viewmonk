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
/**
 * Build a MATCH predicate for MonkDB 6+.
 * MonkDB requires MATCH("index_name", ?) — column-name syntax does not work.
 * @param indexName - The named FULLTEXT index as defined in CREATE TABLE
 */
export function buildMatchQuery(indexName: string): string {
  if (!indexName) throw new Error('index name is required');
  // Escape any double-quotes in the index name
  return `MATCH("${indexName.replace(/"/g, '""')}", ?)`;
}

/**
 * Highlight matched terms in text (simple implementation)
 * @param text - Text to highlight
 * @param query - Search query
 * @returns HTML string with highlighted terms
 */
export function highlightMatches(text: string, query: string): string {
  if (!text || !query) return escapeHTML(text);

  // HTML-escape the raw text first to prevent XSS when used in dangerouslySetInnerHTML
  const escaped = escapeHTML(text);

  // Extract individual terms from query (remove operators)
  const terms = query
    .toLowerCase()
    .replace(/[+\-"]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2); // Ignore very short terms

  let highlighted = escaped;

  terms.forEach((term) => {
    const regex = new RegExp(`(${escapeRegExp(escapeHTML(term))})`, 'gi');
    highlighted = highlighted.replace(
      regex,
      '<mark class="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">$1</mark>'
    );
  });

  return highlighted;
}

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}


/**
 * Escape special regex characters
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

