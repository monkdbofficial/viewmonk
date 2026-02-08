'use client';

import { useState } from 'react';
import { ArrowLeft, Search, Loader2, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useMonkDBClient } from '../lib/monkdb-context';
import { useToast } from '../components/ToastContext';
import ConnectionPrompt from '../components/common/ConnectionPrompt';
import { useVectorCollections } from '../hooks/useVectorCollections';
import { useFTSIndexes } from '../hooks/useFTSIndexes';
import { generateEmbedding } from '../lib/vector/embedding';
import {
  mergeSearchResults,
  reciprocalRankFusion,
  getRecommendedWeights,
  formatHybridScore,
  getSourceColor,
  HybridSearchResult,
  HybridSearchWeights,
} from '../lib/hybrid-search';
import { highlightMatches } from '../lib/fts-utils';

type RankingAlgorithm = 'weighted' | 'rrf';

export default function HybridSearchPage() {
  const client = useMonkDBClient();
  const toast = useToast();
  const { collections } = useVectorCollections();
  const { indexes } = useFTSIndexes();

  const [selectedTable, setSelectedTable] = useState<{
    schema: string;
    table: string;
    vectorColumn?: string;
    ftsColumns?: string[];
  } | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [weights, setWeights] = useState<HybridSearchWeights>({ vectorWeight: 0.5, ftsWeight: 0.5 });
  const [rankingAlgorithm, setRankingAlgorithm] = useState<RankingAlgorithm>('weighted');
  const [topK, setTopK] = useState(20);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<HybridSearchResult[]>([]);
  const [executionTime, setExecutionTime] = useState(0);

  // Find tables that have both vector and FTS capabilities
  const hybridCapableTables = collections
    .map((col) => {
      const ftsIndex = indexes.find(
        (idx) => idx.schema === col.schema && idx.table === col.table
      );

      if (ftsIndex) {
        return {
          schema: col.schema,
          table: col.table,
          vectorColumn: col.columnName,
          ftsColumns: ftsIndex.columns,
        };
      }

      return null;
    })
    .filter((t) => t !== null);

  const handleSearch = async () => {
    if (!client || !selectedTable || !searchQuery.trim()) return;

    setSearching(true);
    const startTime = Date.now();

    try {
      // Execute both searches in parallel
      const [vectorResultsRaw, ftsResultsRaw] = await Promise.all([
        // Vector search
        (async () => {
          const embedding = await generateEmbedding(searchQuery);

          const query = `
            SELECT *, _score
            FROM "${selectedTable.schema}"."${selectedTable.table}"
            WHERE knn_match(${selectedTable.vectorColumn}, $1, $2)
            ORDER BY _score DESC
          `;

          const result = await client.query(query, [embedding, topK]);

          return result.rows.map((row: any[]) => {
            const obj: any = {};
            result.cols.forEach((col: string, idx: number) => {
              obj[col] = row[idx];
            });
            return obj;
          });
        })(),

        // FTS search
        (async () => {
          const query = `
            SELECT *, _score
            FROM "${selectedTable.schema}"."${selectedTable.table}"
            WHERE MATCH((${selectedTable.ftsColumns?.join(', ')}), $1)
            ORDER BY _score DESC
            LIMIT $2
          `;

          const result = await client.query(query, [searchQuery, topK]);

          return result.rows.map((row: any[]) => {
            const obj: any = {};
            result.cols.forEach((col: string, idx: number) => {
              obj[col] = row[idx];
            });
            return obj;
          });
        })(),
      ]);

      // Merge results based on selected algorithm
      const mergedResults =
        rankingAlgorithm === 'weighted'
          ? mergeSearchResults(vectorResultsRaw, ftsResultsRaw, weights)
          : reciprocalRankFusion(vectorResultsRaw, ftsResultsRaw);

      const endTime = Date.now();
      const duration = endTime - startTime;

      setResults(mergedResults);
      setExecutionTime(duration);

      toast.success('Search Complete', `Found ${mergedResults.length} results in ${duration}ms`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Search failed';
      toast.error('Search Failed', message);
    } finally {
      setSearching(false);
    }
  };

  const handleApplyRecommendedWeights = () => {
    const recommended = getRecommendedWeights(searchQuery);
    setWeights(recommended);
    toast.info('Weights Updated', 'Applied recommended weights based on query');
  };

  if (!client) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex items-center gap-4 mb-6">
            <Link
              href="/"
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Hybrid Search
            </h1>
          </div>
          <ConnectionPrompt
            message="Connect to a database to use hybrid search"
            onConnect={() => {}}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/"
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Hybrid Search
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Combine semantic vector search with keyword FTS search
            </p>
          </div>
        </div>

        {/* Info Banner */}
        <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border border-purple-200 dark:border-purple-800 rounded-lg">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Hybrid search combines the best of both worlds
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Vector search finds semantically similar results, while FTS finds exact keyword matches.
                Results are merged and ranked for optimal relevance.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Left: Table Selection */}
          <div className="col-span-3">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Hybrid Tables ({hybridCapableTables.length})
              </h3>

              {hybridCapableTables.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    No hybrid-capable tables found
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    Tables need both vector columns and FTS indexes
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {hybridCapableTables.map((table) => (
                    <div
                      key={`${table!.schema}.${table!.table}`}
                      onClick={() => setSelectedTable(table)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedTable?.schema === table!.schema &&
                        selectedTable?.table === table!.table
                          ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700'
                          : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
                      }`}
                    >
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {table!.table}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {table!.schema}
                      </div>
                      <div className="flex gap-2 mt-2">
                        <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 text-xs rounded">
                          Vector
                        </span>
                        <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 text-xs rounded">
                          FTS
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Middle: Search Interface */}
          <div className="col-span-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Search
              </h2>

              {!selectedTable ? (
                <div className="text-center py-12">
                  <Search className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Select a table to start hybrid searching
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Search Query */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Search Query
                    </label>
                    <textarea
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Enter your search query..."
                      className="w-full h-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      disabled={searching}
                    />
                  </div>

                  {/* Ranking Algorithm */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Ranking Algorithm
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setRankingAlgorithm('weighted')}
                        className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                          rankingAlgorithm === 'weighted'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        Weighted Scores
                      </button>
                      <button
                        onClick={() => setRankingAlgorithm('rrf')}
                        className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                          rankingAlgorithm === 'rrf'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        Reciprocal Rank Fusion
                      </button>
                    </div>
                  </div>

                  {/* Weights (only for weighted algorithm) */}
                  {rankingAlgorithm === 'weighted' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Search Weights
                        </label>
                        <button
                          onClick={handleApplyRecommendedWeights}
                          disabled={!searchQuery.trim()}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
                        >
                          Use Recommended
                        </button>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            Vector (Semantic)
                          </span>
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {(weights.vectorWeight * 100).toFixed(0)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={weights.vectorWeight * 100}
                          onChange={(e) =>
                            setWeights({
                              vectorWeight: parseInt(e.target.value) / 100,
                              ftsWeight: (100 - parseInt(e.target.value)) / 100,
                            })
                          }
                          className="w-full"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            FTS (Keyword)
                          </span>
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {(weights.ftsWeight * 100).toFixed(0)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={weights.ftsWeight * 100}
                          onChange={(e) =>
                            setWeights({
                              ftsWeight: parseInt(e.target.value) / 100,
                              vectorWeight: (100 - parseInt(e.target.value)) / 100,
                            })
                          }
                          className="w-full"
                        />
                      </div>
                    </div>
                  )}

                  {/* Top K */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Results per Search
                    </label>
                    <input
                      type="number"
                      value={topK}
                      onChange={(e) => setTopK(parseInt(e.target.value) || 20)}
                      min="1"
                      max="100"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Search Button */}
                  <button
                    onClick={handleSearch}
                    disabled={searching || !searchQuery.trim()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {searching ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Hybrid Search
                      </>
                    )}
                  </button>

                  {/* Results */}
                  {results.length > 0 && (
                    <div className="mt-6">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Results ({results.length}) • {executionTime}ms
                        </span>
                      </div>

                      <div className="border border-gray-200 dark:border-gray-700 rounded-lg max-h-[500px] overflow-y-auto">
                        {results.map((result, idx) => (
                          <div
                            key={idx}
                            className="p-4 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                          >
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono text-gray-600 dark:text-gray-400">
                                  #{result.rank}
                                </span>
                                <span className={`px-2 py-0.5 text-xs rounded ${getSourceColor(result.source)}`}>
                                  {result.source}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <div className="text-right text-xs">
                                  <div className="text-gray-600 dark:text-gray-400">
                                    Vector: {(result.vectorScore * 100).toFixed(1)}%
                                  </div>
                                  <div className="text-gray-600 dark:text-gray-400">
                                    FTS: {(result.ftsScore * 100).toFixed(1)}%
                                  </div>
                                </div>
                                <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                  {formatHybridScore(result.hybridScore)}
                                </div>
                              </div>
                            </div>

                            <div
                              className="text-sm text-gray-900 dark:text-gray-100"
                              dangerouslySetInnerHTML={{
                                __html: highlightMatches(result.content || '', searchQuery),
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right: Info/Tips */}
          <div className="col-span-3">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sticky top-6">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
                How It Works
              </h3>
              <div className="space-y-3 text-xs text-gray-600 dark:text-gray-400">
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                    Weighted Scores
                  </div>
                  <p>
                    Combines normalized scores from both searches using your specified weights.
                    Best when you know which search type is more important.
                  </p>
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                    Reciprocal Rank Fusion
                  </div>
                  <p>
                    Merges results based on their rankings rather than scores. More robust
                    when scores aren't directly comparable.
                  </p>
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                    When to Use Hybrid
                  </div>
                  <p>
                    Use hybrid search when you want the precision of keyword matching
                    combined with the understanding of semantic search.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
