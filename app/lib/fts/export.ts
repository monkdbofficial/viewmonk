/**
 * Full-text search results export utilities
 */

interface FTSSearchResult {
  _score: number;
  [key: string]: any;
}

/**
 * Export FTS search results to JSON
 * @param results - Array of search results
 * @param metadata - Optional metadata to include
 */
export function exportSearchResults(
  results: FTSSearchResult[],
  metadata?: {
    schema?: string;
    table?: string;
    query?: string;
    columns?: string[];
    timestamp?: number;
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
  a.download = `fts-search-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export FTS search results to CSV
 * @param results - Array of search results
 * @param columns - Columns to include (null = all columns)
 */
export function exportToCSV(
  results: FTSSearchResult[],
  columns?: string[]
): void {
  if (results.length === 0) {
    throw new Error('No results to export');
  }

  // Determine columns to export
  const firstResult = results[0];
  const allColumns = Object.keys(firstResult);
  const exportColumns = columns || allColumns;

  // Always include _score if it exists
  if (!exportColumns.includes('_score') && '_score' in firstResult) {
    exportColumns.unshift('_score');
  }

  // Build CSV
  const headers = exportColumns.join(',');
  const rows = results.map((result) =>
    exportColumns
      .map((col) => {
        const value = result[col];

        // Handle different data types
        if (value === null || value === undefined) return '';
        if (typeof value === 'string') {
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
  a.download = `fts-search-${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export FTS results with highlighted matches as HTML
 * @param results - Array of search results
 * @param query - Search query
 * @param searchColumns - Columns that were searched
 */
export function highlightedHTML(
  results: FTSSearchResult[],
  query: string,
  searchColumns: string[]
): void {
  const escapeRegExp = (string: string): string => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  // highlightTerms expects pre-HTML-escaped text; it highlights on the escaped string
  const highlightTerms = (escapedText: string, terms: string[]): string => {
    let highlighted = escapedText;
    terms.forEach((term) => {
      const regex = new RegExp(`(${escapeRegExp(escapeHTMLStr(term))})`, 'gi');
      highlighted = highlighted.replace(
        regex,
        '<mark style="background-color: #fef08a; padding: 2px 4px; border-radius: 2px;">$1</mark>'
      );
    });
    return highlighted;
  };

  // Extract search terms
  const terms = query
    .toLowerCase()
    .replace(/[+\-"]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2);

  const escapeHTMLStr = (s: string): string =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  // Build HTML
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FTS Search Results</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #f9fafb;
      color: #111827;
    }
    h1 {
      color: #1f2937;
      border-bottom: 2px solid #3b82f6;
      padding-bottom: 10px;
    }
    .result {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
    }
    .result-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .rank {
      font-weight: bold;
      color: #6b7280;
    }
    .score {
      background: #dbeafe;
      color: #1e40af;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 14px;
      font-weight: 600;
    }
    .field {
      margin-bottom: 8px;
    }
    .field-name {
      font-weight: 600;
      color: #6b7280;
      font-size: 12px;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .field-value {
      line-height: 1.6;
    }
    mark {
      background-color: #fef08a;
      padding: 2px 4px;
      border-radius: 2px;
    }
    .meta {
      background: #f3f4f6;
      padding: 12px;
      border-radius: 6px;
      margin-bottom: 20px;
      font-size: 14px;
      color: #6b7280;
    }
  </style>
</head>
<body>
  <h1>Full-Text Search Results</h1>
  <div class="meta">
    <strong>Query:</strong> ${escapeHTMLStr(query)}<br>
    <strong>Results:</strong> ${results.length}<br>
    <strong>Exported:</strong> ${new Date().toLocaleString()}
  </div>
  ${results
    .map((result, idx) => {
      const fields = searchColumns
        .filter((col) => result[col])
        .map((col) => {
          const escaped = escapeHTMLStr(String(result[col]));
          const highlighted = highlightTerms(escaped, terms);
          return `
            <div class="field">
              <div class="field-name">${escapeHTMLStr(col)}</div>
              <div class="field-value">${highlighted}</div>
            </div>
          `;
        })
        .join('');

      return `
        <div class="result">
          <div class="result-header">
            <span class="rank">Result #${idx + 1}</span>
            <span class="score">Score: ${result._score.toFixed(2)}</span>
          </div>
          ${fields}
        </div>
      `;
    })
    .join('')}
</body>
</html>
  `;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fts-search-${Date.now()}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Copy FTS results to clipboard
 * @param results - Array of search results
 * @param format - Format for clipboard
 */
export async function copyToClipboard(
  results: FTSSearchResult[],
  format: 'text' | 'json' = 'text'
): Promise<void> {
  let content: string;

  if (format === 'json') {
    content = JSON.stringify(results, null, 2);
  } else {
    content = results
      .map((result, idx) => {
        const lines = [`Result #${idx + 1}`, `Score: ${result._score.toFixed(2)}`];

        Object.keys(result).forEach((key) => {
          if (key !== '_score') {
            lines.push(`${key}: ${result[key]}`);
          }
        });

        return lines.join('\n');
      })
      .join('\n\n---\n\n');
  }

  await navigator.clipboard.writeText(content);
}
