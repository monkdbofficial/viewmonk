'use client';

import { useState, useRef, useEffect } from 'react';
import { Zap, TrendingUp, TrendingDown, Clock, Database, Activity, X, AlertCircle } from 'lucide-react';

export interface QueryPerformance {
  id: string;
  widgetId: string;
  widgetName: string;
  query: string;
  executionTime: number;
  rowsReturned: number;
  timestamp: Date;
  status: 'success' | 'error' | 'slow';
}

interface PerformanceMonitorProps {
  metrics: QueryPerformance[];
  onClear?: () => void;
}

export default function PerformanceMonitor({ metrics, onClear }: PerformanceMonitorProps) {
  const [showPanel, setShowPanel] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close panel when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setShowPanel(false);
      }
    }

    if (showPanel) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showPanel]);

  // Calculate stats
  const avgExecutionTime = metrics.length > 0
    ? metrics.reduce((sum, m) => sum + m.executionTime, 0) / metrics.length
    : 0;

  const slowQueries = metrics.filter(m => m.executionTime > 1000).length;
  const errorQueries = metrics.filter(m => m.status === 'error').length;
  const totalRows = metrics.reduce((sum, m) => sum + m.rowsReturned, 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'from-green-600 to-green-700';
      case 'error': return 'from-red-600 to-red-700';
      case 'slow': return 'from-yellow-600 to-yellow-700';
      default: return 'from-gray-600 to-gray-700';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800';
      case 'error': return 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800';
      case 'slow': return 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800';
      default: return 'bg-gray-50 dark:bg-gray-950/20 border-gray-200 dark:border-gray-800';
    }
  };

  const formatExecutionTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Performance Button - Icon Only */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className={`group relative p-2.5 rounded-lg border transition-all shadow-sm hover:shadow-md ${
          slowQueries > 0 || errorQueries > 0
            ? 'border-yellow-200 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-950/50 text-yellow-700 dark:text-yellow-300'
            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
        }`}
        title="Performance"
      >
        <Zap className="h-4 w-4" />
        {(slowQueries > 0 || errorQueries > 0) && (
          <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-yellow-600 to-yellow-700 text-xs font-bold text-white shadow-lg">
            {slowQueries + errorQueries}
          </span>
        )}
        <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
          Performance
        </span>
      </button>

      {/* Performance Panel */}
      {showPanel && (
        <div className="absolute right-0 top-full mt-3 w-[700px] rounded-2xl border border-gray-200/50 bg-white/95 backdrop-blur-xl shadow-2xl dark:border-gray-700/50 dark:bg-gray-800/95 max-h-[600px] overflow-hidden flex flex-col" style={{ zIndex: 9999 }}>
          {/* Header */}
          <div className="border-b border-gray-200 dark:border-gray-700/50 bg-gradient-to-r from-yellow-50 via-orange-50 to-red-50 dark:from-gray-900 dark:via-gray-850 dark:to-gray-900 px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-600 to-orange-600 shadow-lg">
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Performance Monitor
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                    Query execution metrics and optimization insights
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {onClear && metrics.length > 0 && (
                  <button
                    onClick={onClear}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg font-semibold transition-all"
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={() => setShowPanel(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="border-b border-gray-200 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-900/30">
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                <div className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">Avg Time</div>
                <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {formatExecutionTime(avgExecutionTime)}
                </div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/50 rounded-xl p-4 border border-green-200 dark:border-green-800">
                <div className="text-xs font-medium text-green-700 dark:text-green-300 mb-1">Total Rows</div>
                <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                  {totalRows.toLocaleString()}
                </div>
              </div>
              <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950/50 dark:to-yellow-900/50 rounded-xl p-4 border border-yellow-200 dark:border-yellow-800">
                <div className="text-xs font-medium text-yellow-700 dark:text-yellow-300 mb-1">Slow Queries</div>
                <div className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
                  {slowQueries}
                </div>
              </div>
              <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/50 dark:to-red-900/50 rounded-xl p-4 border border-red-200 dark:border-red-800">
                <div className="text-xs font-medium text-red-700 dark:text-red-300 mb-1">Errors</div>
                <div className="text-2xl font-bold text-red-900 dark:text-red-100">
                  {errorQueries}
                </div>
              </div>
            </div>
          </div>

          {/* Metrics List */}
          <div className="flex-1 overflow-y-auto p-6">
            {metrics.length === 0 ? (
              <div className="py-12 text-center">
                <Zap className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-600 dark:text-gray-400">No performance data yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {metrics.slice().reverse().slice(0, 20).map((metric) => (
                  <div
                    key={metric.id}
                    className={`rounded-xl border p-4 ${getStatusBg(metric.status)} hover:shadow-md transition-all`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1">
                        <div className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                          {metric.widgetName}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatExecutionTime(metric.executionTime)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Database className="h-3 w-3" />
                            {metric.rowsReturned.toLocaleString()} rows
                          </span>
                          <span className="flex items-center gap-1">
                            {metric.executionTime < 500 ? (
                              <TrendingDown className="h-3 w-3 text-green-600" />
                            ) : metric.executionTime > 1000 ? (
                              <TrendingUp className="h-3 w-3 text-red-600" />
                            ) : (
                              <Activity className="h-3 w-3 text-yellow-600" />
                            )}
                            {new Date(metric.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                      <div className={`px-2 py-1 rounded-lg text-xs font-bold bg-gradient-to-r ${getStatusColor(metric.status)} text-white shadow-md`}>
                        {metric.status.toUpperCase()}
                      </div>
                    </div>
                    <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 text-xs font-mono text-gray-700 dark:text-gray-300 overflow-x-auto">
                      {metric.query.length > 200 ? `${metric.query.substring(0, 200)}...` : metric.query}
                    </div>
                    {metric.status === 'slow' && (
                      <div className="mt-2 flex items-start gap-2 text-xs text-yellow-700 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg p-2">
                        <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                        <span>Consider adding indexes or optimizing the WHERE clause to improve performance.</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
