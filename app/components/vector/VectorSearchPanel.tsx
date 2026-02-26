'use client';

import { useState } from 'react';
import { Search, Loader2, Download, Copy, Check } from 'lucide-react';
import { VectorCollection } from '@/app/hooks/useVectorCollections';
import { useMonkDBClient } from '@/app/lib/monkdb-context';
import { useToast } from '@/app/components/ToastContext';

interface VectorSearchPanelProps {
  collection: VectorCollection | null;
  onAddToHistory: (query: {
    collection: string;
    query: string;
    resultCount: number;
    executionTime: number;
  }) => void;
}

interface SearchResult {
  id: string;
  content: string;
  score: number;
  [key: string]: any;
}

export default function VectorSearchPanel({
  collection,
  onAddToHistory,
}: VectorSearchPanelProps) {
  const client = useMonkDBClient();
  const toast = useToast();

  const [manualVector, setManualVector] = useState('');
  const [searchType, setSearchType] = useState<'knn' | 'similarity'>('knn');
  const [topK, setTopK] = useState(5);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [executionTime, setExecutionTime] = useState<number>(0);
  const [copied, setCopied] = useState(false);

  const handleManualSearch = async () => {
    if (!client || !collection || !manualVector.trim()) return;

    setSearching(true);
    const startTime = Date.now();

    try {
      // Parse manual vector input
      const vectorStr = manualVector.trim().replace(/^\[|\]$/g, '');
      const vector = vectorStr.split(',').map((v) => parseFloat(v.trim()));

      if (vector.length !== collection.dimension) {
        throw new Error(
          `Vector dimension mismatch. Expected ${collection.dimension}, got ${vector.length}`
        );
      }

      if (vector.some((v) => isNaN(v))) {
        throw new Error('Invalid vector format. All values must be numbers');
      }

      // Execute search query
      let query: string;
      if (searchType === 'knn') {
        query = `
          SELECT *, _score
          FROM "${collection.schema}"."${collection.table}"
          WHERE knn_match(${collection.columnName}, $1, $2)
          ORDER BY _score DESC
        `;
      } else {
        query = `
          SELECT *, vector_similarity(${collection.columnName}, $1) AS _score
          FROM "${collection.schema}"."${collection.table}"
          ORDER BY _score DESC
          LIMIT $2
        `;
      }

      const result = await client.query(query, [vector, topK]);

      const endTime = Date.now();
      const duration = endTime - startTime;

      setResults(
        result.rows.map((row: any) => ({
          ...row,
          score: parseFloat(row._score || 0),
        }))
      );
      setExecutionTime(duration);

      onAddToHistory({
        collection: `${collection.schema}.${collection.table}`,
        query: `Manual vector (${collection.dimension}D)`,
        resultCount: result.rows.length,
        executionTime: duration,
      });

      toast.success('Search Complete', `Found ${result.rows.length} results in ${duration}ms`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Search failed';
      toast.error('Search Failed', message);
    } finally {
      setSearching(false);
    }
  };

  const handleSearch = () => {
    handleManualSearch();
  };

  const exportToJSON = () => {
    const data = JSON.stringify(results, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vector-search-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Search Complete', 'Results exported to JSON');
  };

  const exportToCSV = () => {
    if (results.length === 0) return;

    const headers = ['id', 'content', 'score'];
    const rows = results.map((r) => [
      r.id,
      `"${r.content?.toString().replace(/"/g, '""') || ''}"`,
      r.score,
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vector-search-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Search Complete', 'Results exported to CSV');
  };

  const copyResults = () => {
    const text = results
      .map((r) => `${r.id}: ${r.content} (score: ${r.score.toFixed(4)})`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Search Complete', 'Results copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  if (!collection) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Search className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Select a collection to start searching
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Vector Input */}
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Vector Array <span className="normal-case font-normal text-gray-400">({collection.dimension} dimensions)</span>
        </label>
        <textarea
          value={manualVector}
          onChange={(e) => setManualVector(e.target.value)}
          placeholder={`[0.1, 0.2, 0.3, ... ${collection.dimension} numbers total]`}
          className="w-full h-20 resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 font-mono text-xs text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500"
          disabled={searching}
        />
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
          Paste a JSON array of {collection.dimension} numbers
        </p>
      </div>

      {/* Search Options + Button in one row */}
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
            Search Type
          </label>
          <select
            value={searchType}
            onChange={(e) => setSearchType(e.target.value as 'knn' | 'similarity')}
            disabled={searching}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          >
            <option value="knn">KNN Match</option>
            <option value="similarity">Vector Similarity</option>
          </select>
        </div>
        <div className="w-24">
          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
            Top K
          </label>
          <input
            type="number"
            value={topK}
            onChange={(e) => setTopK(parseInt(e.target.value) || 5)}
            min="1"
            max="100"
            disabled={searching}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
        </div>
        {/* Search Button */}
        <button
          onClick={handleSearch}
          disabled={searching || !manualVector.trim()}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
        >
          {searching ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Search className="h-4 w-4" />
              Search
            </>
          )}
        </button>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-2">
          {/* Results toolbar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                {results.length} results
              </span>
              <span className="text-xs text-gray-400">{executionTime}ms</span>
            </div>
            <div className="flex items-center gap-0.5">
              <button
                onClick={copyResults}
                className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 transition-colors"
                title="Copy to clipboard"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-green-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                onClick={exportToCSV}
                className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 transition-colors"
                title="Export CSV"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={exportToJSON}
                className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 transition-colors"
                title="Export JSON"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Result rows */}
          <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
            {results.map((result, idx) => (
              <div
                key={idx}
                className="border-b border-gray-100 px-3 py-2.5 last:border-b-0 hover:bg-gray-50/60 dark:border-gray-700/60 dark:hover:bg-gray-700/30"
              >
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <span className="truncate font-mono text-xs text-gray-500 dark:text-gray-400">
                    {result.id}
                  </span>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                      <div
                        className="h-full bg-blue-500"
                        style={{ width: `${Math.min(result.score * 100, 100)}%` }}
                      />
                    </div>
                    <span className="w-10 text-right text-xs font-semibold text-gray-700 dark:text-gray-300">
                      {(result.score * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-800 dark:text-gray-200">{result.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
