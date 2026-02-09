/**
 * Vector search results export utilities
 */

interface VectorSearchResult {
  id: string;
  content: string;
  score: number;
  [key: string]: any;
}

/**
 * Export vector search results to JSON
 * @param results - Array of search results
 * @param metadata - Optional metadata to include
 */
export function exportToJSON(
  results: VectorSearchResult[],
  metadata?: {
    collection?: string;
    query?: string;
    timestamp?: number;
    searchType?: string;
    topK?: number;
  }
): void {
  const data = {
    metadata: {
      exportedAt: new Date().toISOString(),
      resultCount: results.length,
      ...metadata,
    },
    results,
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vector-search-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Export vector search results to CSV
 * @param results - Array of search results
 * @param includeEmbeddings - Whether to include embedding vectors
 */
export function exportToCSV(
  results: VectorSearchResult[],
  includeEmbeddings: boolean = false
): void {
  if (results.length === 0) {
    throw new Error('No results to export');
  }

  // Determine columns (exclude embedding unless requested)
  const firstResult = results[0];
  const columns = Object.keys(firstResult).filter(
    (key) =>
      includeEmbeddings || (!key.toLowerCase().includes('embedding') && !key.toLowerCase().includes('vector'))
  );

  // Build CSV
  const headers = columns.join(',');
  const rows = results.map((result) =>
    columns
      .map((col) => {
        const value = result[col];

        // Handle different data types
        if (value === null || value === undefined) return '';
        if (typeof value === 'string') {
          // Escape quotes and wrap in quotes if contains comma/newline
          const escaped = value.replace(/"/g, '""');
          return /[,\n"]/.test(value) ? `"${escaped}"` : escaped;
        }
        if (Array.isArray(value)) {
          return `"[${value.join(', ')}]"`;
        }
        if (typeof value === 'object') {
          return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        }
        return value.toString();
      })
      .join(',')
  );

  const csv = [headers, ...rows].join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vector-search-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Copy vector search results to clipboard
 * @param results - Array of search results
 * @param format - Format for clipboard (text or json)
 */
export async function copyToClipboard(
  results: VectorSearchResult[],
  format: 'text' | 'json' = 'text'
): Promise<void> {
  let content: string;

  if (format === 'json') {
    content = JSON.stringify(results, null, 2);
  } else {
    // Format as readable text
    content = results
      .map((result, idx) => {
        const lines = [
          `Result #${idx + 1}`,
          `ID: ${result.id}`,
          `Score: ${result.score.toFixed(4)}`,
          `Content: ${result.content}`,
        ];

        // Include other fields
        Object.keys(result).forEach((key) => {
          if (!['id', 'score', 'content'].includes(key) && !key.toLowerCase().includes('embedding')) {
            lines.push(`${key}: ${result[key]}`);
          }
        });

        return lines.join('\n');
      })
      .join('\n\n---\n\n');
  }

  await navigator.clipboard.writeText(content);
}

/**
 * Export search results as Markdown table
 * @param results - Array of search results
 */
export function exportToMarkdown(results: VectorSearchResult[]): void {
  if (results.length === 0) {
    throw new Error('No results to export');
  }

  const columns = ['Rank', 'ID', 'Score', 'Content'];

  // Build markdown table
  const headers = `| ${columns.join(' | ')} |`;
  const separator = `| ${columns.map(() => '---').join(' | ')} |`;
  const rows = results.map((result, idx) =>
    `| ${idx + 1} | ${result.id} | ${result.score.toFixed(4)} | ${result.content.substring(0, 100)}... |`
  );

  const markdown = [
    '# Vector Search Results',
    '',
    headers,
    separator,
    ...rows,
  ].join('\n');

  const blob = new Blob([markdown], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vector-search-${Date.now()}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Generate shareable link for search results
 * @param results - Array of search results
 * @param query - Search query metadata
 * @returns Base64 encoded search state
 */
export function generateShareableLink(
  results: VectorSearchResult[],
  query: {
    collection: string;
    query: string;
    searchType: string;
    topK: number;
  }
): string {
  const state = {
    query,
    resultCount: results.length,
    timestamp: Date.now(),
  };

  const encoded = btoa(JSON.stringify(state));
  return `${window.location.origin}/vector-ops?share=${encoded}`;
}
