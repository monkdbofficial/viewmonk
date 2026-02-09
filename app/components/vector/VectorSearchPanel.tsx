'use client';

import { useState } from 'react';
import { Search, Loader2, Download, Copy, Check, FileCode } from 'lucide-react';
import { VectorCollection } from '@/app/hooks/useVectorCollections';
import { useMonkDBClient } from '@/app/lib/monkdb-context';
import { useToast } from '@/app/components/ToastContext';
import PythonScriptGenerator from './PythonScriptGenerator';
import EmbeddingHelper from './EmbeddingHelper';

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

  const [searchMode, setSearchMode] = useState<'python' | 'manual' | 'api'>('python');
  const [showEmbeddingHelper, setShowEmbeddingHelper] = useState(false);
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
    <div className="space-y-4">
      {/* Search Mode Tabs */}
      <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <button
          onClick={() => setSearchMode('python')}
          className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${
            searchMode === 'python'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
        >
          <FileCode className="w-4 h-4" />
          Python Script
        </button>
        <button
          onClick={() => setSearchMode('manual')}
          className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
            searchMode === 'manual'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
        >
          Manual Search
        </button>
        <button
          onClick={() => setSearchMode('api')}
          className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
            searchMode === 'api'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
        >
          API Examples
        </button>
      </div>

      {/* Python Script Mode (Official MonkDB Workflow) */}
      {searchMode === 'python' && (
        <div className="space-y-4">
          <PythonScriptGenerator collection={collection} />
        </div>
      )}

      {/* Manual Search Mode - For pasting pre-computed embeddings */}
      {searchMode === 'manual' && (
        <div className="space-y-3">
          {/* Info Banner */}
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
            <div className="text-xs text-blue-800 dark:text-blue-200">
              <p className="font-semibold mb-1">Paste Pre-computed Embeddings</p>
              <p>
                After generating embeddings using the Python script or external APIs, paste the vector array below to search.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Vector Array ({collection.dimension} dimensions)
            </label>
            <textarea
              value={manualVector}
              onChange={(e) => setManualVector(e.target.value)}
              placeholder={`[0.1, 0.2, 0.3, ... ${collection.dimension} numbers total]`}
              className="w-full h-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              disabled={searching}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Expected format: JSON array of {collection.dimension} numbers
            </p>
          </div>
        </div>
      )}

      {/* API Examples Mode - External embedding generation */}
      {searchMode === 'api' && (
        <div className="space-y-4">
          <EmbeddingHelper />
        </div>
      )}

      {/* Search Options - Only show in Manual mode */}
      {searchMode === 'manual' && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search Type
              </label>
              <select
                value={searchType}
                onChange={(e) => setSearchType(e.target.value as 'knn' | 'similarity')}
                disabled={searching}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="knn">KNN Match</option>
                <option value="similarity">Vector Similarity</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Top K
              </label>
              <input
                type="number"
                value={topK}
                onChange={(e) => setTopK(parseInt(e.target.value) || 5)}
                min="1"
                max="100"
                disabled={searching}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Search Button */}
          <button
            onClick={handleSearch}
            disabled={searching || !manualVector.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {searching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Search
              </>
            )}
          </button>
        </>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Results ({results.length}) • {executionTime}ms
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={copyResults}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Copy to clipboard"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-500" />
                )}
              </button>
              <button
                onClick={exportToCSV}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Export to CSV"
              >
                <Download className="w-4 h-4 text-gray-500" />
              </button>
              <button
                onClick={exportToJSON}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Export to JSON"
              >
                <Download className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>

          <div className="border border-gray-200 dark:border-gray-700 rounded-lg max-h-[500px] overflow-y-auto">
            {results.map((result, idx) => (
              <div
                key={idx}
                className="p-4 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <span className="text-xs font-mono text-gray-600 dark:text-gray-400">
                    {result.id}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full w-20 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-500 to-blue-500"
                        style={{ width: `${result.score * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 min-w-[3rem] text-right">
                      {(result.score * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-900 dark:text-gray-100">
                  {result.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
