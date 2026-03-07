'use client';

import { useState } from 'react';
import { Target, Loader2, AlertCircle, X, TrendingUp } from 'lucide-react';
import { useMonkDBClient } from '@/app/lib/monkdb-context';
import SearchableSelect from '../common/SearchableSelect';
import { useSchemaMetadata } from '@/app/lib/hooks/useSchemaMetadata';

interface SimilarityResult {
  id: string;
  content: string;
  similarity: number;
  [key: string]: any;
}

export default function VectorSimilarityPanel() {
  const client = useMonkDBClient();
  const { tables, columns, loading: schemaLoading } = useSchemaMetadata();

  const [tableName, setTableName] = useState('');
  const [embeddingColumn, setEmbeddingColumn] = useState('');
  const [referenceVector, setReferenceVector] = useState('');
  const [similarityThreshold, setSimilarityThreshold] = useState(0.7);
  const [limitResults, setLimitResults] = useState(20);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SimilarityResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [queryTime, setQueryTime] = useState<number | null>(null);

  // Get table names with vector columns
  const tableNames = [...new Set(
    columns
      .filter(col => col.type.toUpperCase().includes('FLOAT_VECTOR'))
      .map(col => `${col.schema}.${col.table}`)
  )];

  // Get vector columns for selected table
  const vectorColumns = tableName
    ? columns
        .filter(col => {
          const fullTableName = `${col.schema}.${col.table}`;
          return fullTableName === tableName && col.type.toUpperCase().includes('FLOAT_VECTOR');
        })
        .map(col => col.name)
    : [];

  const handleSearch = async () => {
    if (!client) {
      setError('No active database connection');
      return;
    }

    if (!tableName.trim()) {
      setError('Please enter a table name');
      return;
    }

    if (!referenceVector.trim()) {
      setError('Please enter a reference vector');
      return;
    }

    setLoading(true);
    setError(null);
    setResults([]);
    setQueryTime(null);

    try {
      // Validate block-level format only (starts with [, {, or ()
      const trimmedVector = referenceVector.trim();
      if (!trimmedVector.match(/^[\[\{\(].*[\]\}\)]$/)) {
        throw new Error(
          'Vector must be in block-level format. Examples:\n' +
          '• JSON array: [0.1, 0.2, 0.3]\n' +
          '• Object notation: {vec: [0.1, 0.2]}\n' +
          '• Parentheses: ([0.1, 0.2, 0.3])'
        );
      }

      // Parse reference vector
      let vectorArray: number[];
      try {
        if (trimmedVector.startsWith('[')) {
          vectorArray = JSON.parse(trimmedVector);
        } else if (trimmedVector.startsWith('{')) {
          const obj = JSON.parse(trimmedVector);
          // Try to extract vector from object
          vectorArray = obj.vec || obj.vector || obj.embedding || Object.values(obj)[0];
        } else {
          // Handle parentheses - strip and parse inner content
          const inner = trimmedVector.slice(1, -1);
          vectorArray = JSON.parse(inner);
        }
      } catch (e) {
        throw new Error('Invalid vector format. Could not parse as valid JSON structure.');
      }

      if (!Array.isArray(vectorArray) || vectorArray.some(isNaN)) {
        throw new Error('Vector must be an array of numbers');
      }

      const startTime = performance.now();

      // Execute similarity search query
      const query = `
        SELECT *, vector_similarity(${embeddingColumn}, ?) AS similarity
        FROM ${tableName}
        WHERE vector_similarity(${embeddingColumn}, ?) >= ?
        ORDER BY similarity DESC
        LIMIT ?
      `;

      const response = await client.query(query, [vectorArray, vectorArray, similarityThreshold, limitResults]);

      const endTime = performance.now();
      setQueryTime(endTime - startTime);

      // Transform results
      const transformedResults: SimilarityResult[] = response.rows.map((row) => {
        const result: any = {};
        response.cols.forEach((col, idx) => {
          result[col] = row[idx];
        });
        return {
          id: result.id || result._id || `result_${Math.random()}`,
          content: result.content || result.text || JSON.stringify(result),
          similarity: result.similarity || 0,
          ...result,
        };
      });

      setResults(transformedResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Similarity search failed');
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
          Vector Similarity Search
        </h3>

        <div className="space-y-4">
          {/* Table Name */}
          <SearchableSelect
            label="Table Name"
            value={tableName}
            onChange={(value) => {
              setTableName(value);
              setEmbeddingColumn(''); // Reset column when table changes
            }}
            options={tableNames}
            placeholder="Select table with vector columns..."
            loading={schemaLoading}
            onClear={() => {
              setTableName('');
              setEmbeddingColumn('');
            }}
          />

          {/* Embedding Column */}
          <SearchableSelect
            label="Embedding Column Name"
            value={embeddingColumn}
            onChange={setEmbeddingColumn}
            options={vectorColumns}
            placeholder={tableName ? 'Select vector column...' : 'Select a table first'}
            disabled={!tableName || vectorColumns.length === 0}
            loading={schemaLoading}
            onClear={() => setEmbeddingColumn('')}
          />

          {/* Reference Vector */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Reference Vector
            </label>
            <textarea
              value={referenceVector}
              onChange={(e) => setReferenceVector(e.target.value)}
              placeholder="Enter vector in block-level format: [0.1, 0.2, 0.3, ...] or {vec: [0.1, 0.2]}"
              rows={3}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 font-mono text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
              onKeyDown={handleKeyPress}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Block-level format only (must start with [, {"{" }, or ()  •  Ctrl+Enter to search
            </p>
          </div>

          {/* Similarity Threshold Slider */}
          <div>
            <label className="mb-2 flex items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300">
              <span>Similarity Threshold</span>
              <span className="rounded-md bg-purple-100 px-2 py-1 text-xs font-semibold text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                {similarityThreshold.toFixed(2)}
              </span>
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={similarityThreshold}
              onChange={(e) => setSimilarityThreshold(parseFloat(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-purple-600 dark:bg-gray-700"
            />
            <div className="mt-1 flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>0.00 (Low)</span>
              <span>1.00 (Exact)</span>
            </div>
          </div>

          {/* Limit Results */}
          <div>
            <label className="mb-2 flex items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300">
              <span>Result Limit</span>
              <span className="rounded-md bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                {limitResults}
              </span>
            </label>
            <input
              type="range"
              min="5"
              max="100"
              step="5"
              value={limitResults}
              onChange={(e) => setLimitResults(parseInt(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-blue-600 dark:bg-gray-700"
            />
            <div className="mt-1 flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>5</span>
              <span>100</span>
            </div>
          </div>

          {/* Search Button */}
          <button
            onClick={handleSearch}
            disabled={loading || !client}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-purple-500 dark:hover:bg-purple-600"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Target className="h-4 w-4" />
                Find Similar Vectors
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
              Similar Vectors
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

          {/* Similarity Distribution Chart */}
          <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50">
            <h4 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
              Similarity Distribution
            </h4>
            <div className="space-y-2">
              {results.slice(0, 10).map((result, idx) => (
                <div key={result.id} className="flex items-center gap-3">
                  <span className="w-8 text-xs text-gray-500 dark:text-gray-400">
                    #{idx + 1}
                  </span>
                  <div className="flex-1">
                    <div className="h-6 overflow-hidden rounded-md bg-gray-200 dark:bg-gray-700">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all"
                        style={{ width: `${result.similarity * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="w-16 text-right text-xs font-medium text-gray-700 dark:text-gray-300">
                    {(result.similarity * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Results Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="pb-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    Rank
                  </th>
                  <th className="pb-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    Similarity
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
                        <TrendingUp className="h-4 w-4 text-purple-500" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {(result.similarity * 100).toFixed(2)}%
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
          <Target className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
            No Results Yet
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Configure your similarity search parameters and click "Find Similar Vectors" to discover related items.
          </p>
        </div>
      )}
    </div>
  );
}
