'use client';

import { useState } from 'react';
import { useSavedViews } from '../lib/saved-views-context';
import { History, Table, X, Trash2, Clock } from 'lucide-react';

/**
 * Enterprise-grade Saved Views Component
 *
 * Displays recent queries and tables with:
 * - Quick access to frequently used queries
 * - Recently viewed tables for easy navigation
 * - Clear/remove functionality
 * - Relative timestamps
 * - Execution metrics (row count, execution time)
 */

export default function SavedViews() {
  const {
    recentQueries,
    recentTables,
    removeRecentQuery,
    removeRecentTable,
    clearRecentQueries,
    clearRecentTables,
  } = useSavedViews();

  const [activeTab, setActiveTab] = useState<'queries' | 'tables'>('queries');

  /**
   * Format timestamp to relative time
   */
  const formatRelativeTime = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  /**
   * Truncate long queries for display
   */
  const truncateQuery = (query: string, maxLength = 80): string => {
    if (query.length <= maxLength) return query;
    return query.substring(0, maxLength) + '...';
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h2>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('queries')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'queries'
              ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
              : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          Recent Queries ({recentQueries.length})
        </button>
        <button
          onClick={() => setActiveTab('tables')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'tables'
              ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
              : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          Recent Tables ({recentTables.length})
        </button>
      </div>

      {/* Recent Queries */}
      {activeTab === 'queries' && (
        <div className="space-y-2">
          {recentQueries.length > 0 ? (
            <>
              <div className="mb-2 flex justify-end">
                <button
                  onClick={clearRecentQueries}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="h-3 w-3" />
                  Clear All
                </button>
              </div>
              {recentQueries.map((query) => (
                <div
                  key={query.id}
                  className="group relative rounded-lg border border-gray-200 bg-gray-50 p-3 transition-colors hover:border-blue-300 hover:bg-blue-50/50 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-blue-700 dark:hover:bg-blue-900/20"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <code className="block font-mono text-xs text-gray-900 dark:text-gray-100">
                        {truncateQuery(query.query)}
                      </code>
                      <div className="mt-1 flex items-center gap-3 text-[10px] text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatRelativeTime(query.timestamp)}
                        </span>
                        {query.rowCount !== undefined && (
                          <span>{query.rowCount} rows</span>
                        )}
                        {query.executionTime !== undefined && (
                          <span>{query.executionTime}ms</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => removeRecentQuery(query.id)}
                      className="rounded p-1 text-gray-400 opacity-0 transition-opacity hover:bg-gray-200 hover:text-gray-600 group-hover:opacity-100 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                      aria-label="Remove query"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div className="py-8 text-center">
              <History className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                No recent queries yet
              </p>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                Execute queries in the Query Editor to see them here
              </p>
            </div>
          )}
        </div>
      )}

      {/* Recent Tables */}
      {activeTab === 'tables' && (
        <div className="space-y-2">
          {recentTables.length > 0 ? (
            <>
              <div className="mb-2 flex justify-end">
                <button
                  onClick={clearRecentTables}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="h-3 w-3" />
                  Clear All
                </button>
              </div>
              {recentTables.map((table) => (
                <div
                  key={table.id}
                  className="group relative flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3 transition-colors hover:border-blue-300 hover:bg-blue-50/50 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-blue-700 dark:hover:bg-blue-900/20"
                >
                  <div className="flex items-center gap-3">
                    <Table className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {table.schema}.{table.table}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400">
                        <Clock className="h-3 w-3" />
                        {formatRelativeTime(table.timestamp)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeRecentTable(table.id)}
                    className="rounded p-1 text-gray-400 opacity-0 transition-opacity hover:bg-gray-200 hover:text-gray-600 group-hover:opacity-100 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                    aria-label="Remove table"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </>
          ) : (
            <div className="py-8 text-center">
              <Table className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                No recent tables yet
              </p>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                View tables in the Schema Viewer to see them here
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
