'use client';

import { useState } from 'react';
import { Search, Loader2, AlertCircle, X } from 'lucide-react';
import { useMonkDBClient } from '@/app/lib/monkdb-context';

interface VectorSearchResult {
  id: string;
  content: string;
  score: number;
  [key: string]: any;
}

export default function VectorSearchPanel() {
  const client = useMonkDBClient();
  const [tableName, setTableName] = useState('');
  const [embeddingColumn, setEmbeddingColumn] = useState('embedding');
  const [queryVector, setQueryVector] = useState('');
  const [kValue, setKValue] = useState(10);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<VectorSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [queryTime, setQueryTime] = useState<number | null>(null);

  const handleSearch = async () => {
    if (!client) {
      setError('No active database connection');
      return;
    }

    if (!tableName.trim()) {
      setError('Please enter a table name');
      return;
    }

    if (!queryVector.trim()) {
      setError('Please enter a query vector');
      return;
    }

    setLoading(true);
    setError(null);
    setResults([]);
    setQueryTime(null);

    try {
      // Parse query vector - support both JSON array and comma-separated values
      let vectorArray: number[];
      try {
        if (queryVector.trim().startsWith('[')) {
          vectorArray = JSON.parse(queryVector);
        } else {
          vectorArray = queryVector.split(',').map(v => parseFloat(v.trim()));
        }
      } catch (e) {
        throw new Error('Invalid vector format. Use JSON array [1,2,3] or comma-separated values 1,2,3');
      }

      if (!Array.isArray(vectorArray) || vectorArray.some(isNaN)) {
        throw new Error('Vector must be an array of numbers');
      }

      const startTime = performance.now();

      // Execute KNN search query
      // Note: Syntax may vary based on MonkDB's vector search implementation
      const query = `
        SELECT *, _score
        FROM ${tableName}
        WHERE knn_match(${embeddingColumn}, ?, ?)
        ORDER BY _score DESC
      `;

      const response = await client.query(query, [vectorArray, kValue]);

      const endTime = performance.now();
      setQueryTime(endTime - startTime);

      // Transform results
      const transformedResults: VectorSearchResult[] = response.rows.map((row) => {
        const result: any = {};
        response.cols.forEach((col, idx) => {
          result[col] = row[idx];
        });
        return {
          id: result.id || result._id || `result_${Math.random()}`,
          content: result.content || result.text || JSON.stringify(result),
          score: result._score || 0,
          ...result,
        };
      });

      setResults(transformedResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      console.error('Vector search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSearch();
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Configuration */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          KNN Vector Search
        </h3>

        <div className="space-y-4">
          {/* Table Name */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Table Name
            </label>
            <input
              type="text"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              placeholder="e.g., documents, embeddings"
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
              onKeyDown={handleKeyPress}
            />
          </div>

          {/* Embedding Column */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Embedding Column Name
            </label>
            <input
              type="text"
              value={embeddingColumn}
              onChange={(e) => setEmbeddingColumn(e.target.value)}
              placeholder="e.g., embedding, vector"
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
              onKeyDown={handleKeyPress}
            />
          </div>

          {/* Query Vector */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Query Vector
            </label>
            <textarea
              value={queryVector}
              onChange={(e) => setQueryVector(e.target.value)}
              placeholder="Enter vector as JSON array: [0.1, 0.2, 0.3, ...] or comma-separated: 0.1, 0.2, 0.3, ..."
              rows={3}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 font-mono text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
              onKeyDown={handleKeyPress}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Ctrl+Enter to search
            </p>
          </div>

          {/* K Value Slider */}
          <div>
            <label className="mb-2 flex items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300">
              <span>Top K Results</span>
              <span className="rounded-md bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                {kValue}
              </span>
            </label>
            <input
              type="range"
              min="1"
              max="100"
              value={kValue}
              onChange={(e) => setKValue(parseInt(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-blue-600 dark:bg-gray-700"
            />
            <div className="mt-1 flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>1</span>
              <span>100</span>
            </div>
          </div>

          {/* Search Button */}
          <button
            onClick={handleSearch}
            disabled={loading || !client}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Search Vectors
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-900/20">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800 dark:text-red-300">Error</p>
            <p className="mt-1 text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Search Results
            </h3>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-500 dark:text-gray-400">
                {results.length} results
              </span>
              {queryTime !== null && (
                <span className="rounded-md bg-green-100 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  {queryTime.toFixed(2)}ms
                </span>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="pb-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    Rank
                  </th>
                  <th className="pb-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    Score
                  </th>
                  <th className="pb-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    ID
                  </th>
                  <th className="pb-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    Content
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {results.map((result, idx) => (
                  <tr
                    key={result.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <td className="py-3 text-sm font-medium text-gray-900 dark:text-white">
                      #{idx + 1}
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                          <div
                            className="h-full bg-blue-500"
                            style={{ width: `${Math.min(result.score * 100, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {result.score.toFixed(4)}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 text-sm text-gray-700 dark:text-gray-300">
                      {result.id}
                    </td>
                    <td className="py-3 text-sm text-gray-700 dark:text-gray-300">
                      <div className="max-w-md truncate" title={result.content}>
                        {result.content}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && results.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50/50 p-12 text-center dark:border-gray-700 dark:bg-gray-800/50">
          <Search className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
            No Results Yet
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Configure your search parameters and click "Search Vectors" to find similar items.
          </p>
        </div>
      )}
    </div>
  );
}
