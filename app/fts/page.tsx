'use client';

import { useState } from 'react';
import { ArrowLeft, Search, RefreshCw, Clock, Settings, X } from 'lucide-react';
import Link from 'next/link';
import { useMonkDBClient } from '../lib/monkdb-context';
import { useToast } from '../components/ToastContext';
import ConnectionPrompt from '../components/common/ConnectionPrompt';
import { useFTSIndexes, FTSIndex } from '../hooks/useFTSIndexes';
import { buildMatchQuery, highlightMatches, validateFTSQuery } from '../lib/fts-utils';
import FTSStatsCards from '../components/fts/FTSStatsCards';
import RefreshScheduleManager from '../components/fts/RefreshScheduleManager';
import { formatInterval, formatTimeUntilRefresh, calculateNextRefresh, getTableSchedule } from '../lib/fts/refresh-automation';

interface SearchResult {
  _score: number;
  [key: string]: any;
}

export default function FullTextSearchPage() {
  const client = useMonkDBClient();
  const toast = useToast();
  const { indexes, loading: indexesLoading } = useFTSIndexes();

  const [selectedIndex, setSelectedIndex] = useState<FTSIndex | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [tableSearchQuery, setTableSearchQuery] = useState('');
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [fieldBoosts, setFieldBoosts] = useState<Record<string, number>>({});
  const [limit, setLimit] = useState(50);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [executionTime, setExecutionTime] = useState(0);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [showScheduleManager, setShowScheduleManager] = useState(false);

  // Filter indexes based on table search query
  const filteredIndexes = indexes.filter(idx => {
    if (!tableSearchQuery.trim()) return true;
    const query = tableSearchQuery.toLowerCase();
    return (
      idx.table.toLowerCase().includes(query) ||
      idx.schema.toLowerCase().includes(query) ||
      idx.indexName.toLowerCase().includes(query) ||
      idx.columns.some(col => col.toLowerCase().includes(query)) ||
      `${idx.schema}.${idx.table}`.toLowerCase().includes(query)
    );
  });

  const handleSelectIndex = (index: FTSIndex) => {
    setSelectedIndex(index);
    setSelectedColumns(index.columns);
    setResults([]);
    setNeedsRefresh(false);

    // Initialize field boosts
    const boosts: Record<string, number> = {};
    index.columns.forEach(col => {
      boosts[col] = 1.0;
    });
    setFieldBoosts(boosts);
  };

  const handleRefreshTable = async () => {
    if (!client || !selectedIndex) return;

    try {
      await client.query(`REFRESH TABLE "${selectedIndex.schema}"."${selectedIndex.table}"`);
      toast.success('Success', 'Table refreshed successfully');
      setNeedsRefresh(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to refresh table';
      toast.error('Error', message);
    }
  };

  const handleSearch = async () => {
    if (!client || !selectedIndex || !searchQuery.trim()) return;

    // Validate query
    const validation = validateFTSQuery(searchQuery);
    if (!validation.valid) {
      toast.error('Error', validation.error || 'Invalid query');
      return;
    }

    setSearching(true);
    const startTime = Date.now();

    try {
      // Build MATCH clause
      const matchClause = buildMatchQuery(selectedColumns, searchQuery, fieldBoosts);

      // Build full query
      const query = `
        SELECT *, _score
        FROM "${selectedIndex.schema}"."${selectedIndex.table}"
        WHERE ${matchClause}
        ORDER BY _score DESC
        LIMIT $2
      `;

      const result = await client.query(query, [searchQuery, limit]);

      // Convert rows to objects
      const resultsObjects = result.rows.map((row: any[]) => {
        const obj: any = {};
        result.cols.forEach((col: string, idx: number) => {
          obj[col] = row[idx];
        });
        return obj;
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      setResults(resultsObjects);
      setExecutionTime(duration);

      toast.success('Success', `Found ${result.rows.length} results in ${duration}ms`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Search failed';
      toast.error('Error', message);

      // Check if error indicates need for refresh
      if (message.includes('refresh') || message.includes('index')) {
        setNeedsRefresh(true);
      }
    } finally {
      setSearching(false);
    }
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
              Full-Text Search
            </h1>
          </div>
          <ConnectionPrompt
            message="Connect to a database to use full-text search"
            onConnect={() => {}}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-[1800px] mx-auto p-6">
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
              Full-Text Search
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              BM25-ranked keyword search with relevance scoring
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <FTSStatsCards />

        {/* Three-Column Layout */}
        <div className="grid grid-cols-12 gap-6">
          {/* Left: FTS Tables */}
          <div className="col-span-3">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sticky top-6">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
                FTS Tables
              </h3>

              {/* Search Bar */}
              {indexes.length > 0 && (
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={tableSearchQuery}
                    onChange={(e) => setTableSearchQuery(e.target.value)}
                    placeholder="Search tables..."
                    className="w-full pl-9 pr-9 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {tableSearchQuery && (
                    <button
                      onClick={() => setTableSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}

              {indexesLoading ? (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Loading...</p>
                </div>
              ) : filteredIndexes.length === 0 && tableSearchQuery ? (
                <div className="text-center py-8">
                  <Search className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    No tables found
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    Try a different search term
                  </p>
                </div>
              ) : indexes.length === 0 ? (
                <div className="text-center py-8">
                  <Search className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    No FTS indexes found
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    Create a FULLTEXT index first
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {filteredIndexes.map((index) => (
                    <div
                      key={`${index.schema}.${index.table}.${index.indexName}`}
                      onClick={() => handleSelectIndex(index)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedIndex?.schema === index.schema &&
                        selectedIndex?.table === index.table
                          ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700'
                          : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
                      }`}
                    >
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {index.table}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {index.schema}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                        {index.columns.join(', ')}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        {index.documentCount?.toLocaleString() || 0} docs
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

              {!selectedIndex ? (
                <div className="text-center py-12">
                  <Search className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Select a table to start searching
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Refresh Banner */}
                  {needsRefresh && (
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <div className="flex items-start gap-3">
                        <RefreshCw className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                            Table needs refresh
                          </p>
                          <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                            Run REFRESH TABLE before searching to update the FTS index
                          </p>
                        </div>
                        <button
                          onClick={handleRefreshTable}
                          className="px-3 py-1.5 bg-yellow-600 text-white text-xs font-medium rounded-lg hover:bg-yellow-700 transition-colors"
                        >
                          Refresh Now
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Refresh Schedule Info */}
                  {selectedIndex && (() => {
                    const schedule = getTableSchedule(selectedIndex.schema, selectedIndex.table);
                    if (!schedule) {
                      return (
                        <div className="p-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-gray-400" />
                              <span className="text-xs text-gray-600 dark:text-gray-400">
                                No refresh schedule
                              </span>
                            </div>
                            <button
                              onClick={() => setShowScheduleManager(true)}
                              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              Configure
                            </button>
                          </div>
                        </div>
                      );
                    }

                    const nextRefresh = calculateNextRefresh(schedule);

                    return (
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-700 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${schedule.enabled ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                            <div>
                              <div className="text-xs font-medium text-gray-900 dark:text-gray-100">
                                Auto-refresh: {schedule.enabled ? 'Enabled' : 'Disabled'}
                              </div>
                              {schedule.enabled && (
                                <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                                  Every {formatInterval(schedule.interval)} • Next in {formatTimeUntilRefresh(nextRefresh)}
                                </div>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => setShowScheduleManager(true)}
                            className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded transition-colors"
                            title="Configure Schedule"
                          >
                            <Settings className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Search Query */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Search Query
                    </label>
                    <textarea
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder='Enter search query (e.g., "error database")'
                      className="w-full h-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      disabled={searching}
                    />
                  </div>

                  {/* Field Boosts */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Field Boosts
                    </label>
                    <div className="space-y-3">
                      {selectedColumns.map((col) => (
                        <div key={col} className="flex items-center gap-3">
                          <span className="text-sm text-gray-700 dark:text-gray-300 w-32 truncate">
                            {col}
                          </span>
                          <input
                            type="range"
                            min="0.5"
                            max="3"
                            step="0.1"
                            value={fieldBoosts[col] || 1.0}
                            onChange={(e) =>
                              setFieldBoosts((prev) => ({
                                ...prev,
                                [col]: parseFloat(e.target.value),
                              }))
                            }
                            className="flex-1"
                            disabled={searching}
                          />
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 w-12 text-right">
                            {(fieldBoosts[col] || 1.0).toFixed(1)}x
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Limit */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Result Limit
                    </label>
                    <input
                      type="number"
                      value={limit}
                      onChange={(e) => setLimit(parseInt(e.target.value) || 50)}
                      min="1"
                      max="1000"
                      disabled={searching}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Search Button */}
                  <button
                    onClick={handleSearch}
                    disabled={searching || !searchQuery.trim()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Search className="w-4 h-4" />
                    {searching ? 'Searching...' : 'Search'}
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
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-mono text-gray-600 dark:text-gray-400">
                                #{idx + 1}
                              </span>
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full w-20 overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-green-500 to-blue-500"
                                    style={{
                                      width: `${Math.min((result._score / 10) * 100, 100)}%`,
                                    }}
                                  />
                                </div>
                                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                  {result._score.toFixed(2)}
                                </span>
                              </div>
                            </div>

                            {/* Display matched columns */}
                            {selectedColumns.map((col) => (
                              result[col] && (
                                <div key={col} className="mb-2">
                                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                    {col}
                                  </div>
                                  <div
                                    className="text-sm text-gray-900 dark:text-gray-100"
                                    dangerouslySetInnerHTML={{
                                      __html: highlightMatches(
                                        String(result[col]),
                                        searchQuery
                                      ),
                                    }}
                                  />
                                </div>
                              )
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right: Query History (placeholder) */}
          <div className="col-span-3">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sticky top-6">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Query Tips
              </h3>
              <div className="space-y-3 text-xs text-gray-600 dark:text-gray-400">
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                    Basic Search
                  </div>
                  <code className="bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded">
                    error
                  </code>
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                    Phrase Search
                  </div>
                  <code className="bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded">
                    "connection timeout"
                  </code>
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                    Boolean Operators
                  </div>
                  <code className="bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded">
                    error +database -warning
                  </code>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Refresh Schedule Manager Dialog */}
      {showScheduleManager && selectedIndex && (
        <RefreshScheduleManager
          schema={selectedIndex.schema}
          table={selectedIndex.table}
          onClose={() => setShowScheduleManager(false)}
        />
      )}
    </div>
  );
}
