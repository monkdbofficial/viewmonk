'use client';

import { useState, useRef, useEffect } from 'react';
import { Shield, CheckCircle, XCircle, AlertTriangle, TrendingUp, TrendingDown, X, Database } from 'lucide-react';

export interface DataQualityMetric {
  id: string;
  widgetId: string;
  widgetName: string;
  metric: string;
  timestamp: Date;
  completeness: number; // percentage of non-null values
  accuracy: number; // percentage of values within expected range
  consistency: number; // percentage of values matching expected format
  timeliness: number; // freshness score
  issues: string[];
  overallScore: number;
}

interface DataQualityMonitorProps {
  metrics: DataQualityMetric[];
  onRefresh?: () => void;
}

export default function DataQualityMonitor({ metrics, onRefresh }: DataQualityMonitorProps) {
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

  // Calculate overall stats
  const avgCompleteness = metrics.length > 0
    ? metrics.reduce((sum, m) => sum + m.completeness, 0) / metrics.length
    : 0;

  const avgAccuracy = metrics.length > 0
    ? metrics.reduce((sum, m) => sum + m.accuracy, 0) / metrics.length
    : 0;

  const avgConsistency = metrics.length > 0
    ? metrics.reduce((sum, m) => sum + m.consistency, 0) / metrics.length
    : 0;

  const avgTimeliness = metrics.length > 0
    ? metrics.reduce((sum, m) => sum + m.timeliness, 0) / metrics.length
    : 0;

  const totalIssues = metrics.reduce((sum, m) => sum + m.issues.length, 0);

  const criticalMetrics = metrics.filter(m => m.overallScore < 70);

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'from-green-600 to-green-700';
    if (score >= 70) return 'from-yellow-600 to-yellow-700';
    return 'from-red-600 to-red-700';
  };

  const getScoreBg = (score: number) => {
    if (score >= 90) return 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800';
    if (score >= 70) return 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800';
    return 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 90) return <CheckCircle className="h-5 w-5" />;
    if (score >= 70) return <AlertTriangle className="h-5 w-5" />;
    return <XCircle className="h-5 w-5" />;
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Data Quality Button - Icon Only */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className={`group relative p-2.5 rounded-lg border transition-all shadow-sm hover:shadow-md ${
          criticalMetrics.length > 0
            ? 'border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300'
            : totalIssues > 0
            ? 'border-yellow-200 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-950/50 text-yellow-700 dark:text-yellow-300'
            : 'border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-300'
        }`}
        title="Data Quality"
      >
        <Shield className="h-4 w-4" />
        {totalIssues > 0 && (
          <span className={`absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white shadow-lg bg-gradient-to-r ${
            criticalMetrics.length > 0 ? 'from-red-600 to-red-700' : 'from-yellow-600 to-yellow-700'
          }`}>
            {totalIssues}
          </span>
        )}
        <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
          Data Quality
        </span>
      </button>

      {/* Data Quality Panel */}
      {showPanel && (
        <div className="absolute right-0 top-full mt-3 w-[800px] rounded-2xl border border-gray-200/50 bg-white/95 backdrop-blur-xl shadow-2xl dark:border-gray-700/50 dark:bg-gray-800/95 max-h-[600px] overflow-hidden flex flex-col" style={{ zIndex: 9999 }}>
          {/* Header */}
          <div className="border-b border-gray-200 dark:border-gray-700/50 bg-gradient-to-r from-green-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-850 dark:to-gray-900 px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-green-600 to-blue-600 shadow-lg">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Data Quality Monitor
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                    {totalIssues} issues found • {metrics.length} datasets monitored
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {onRefresh && (
                  <button
                    onClick={onRefresh}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg font-semibold transition-all"
                  >
                    Refresh
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

          {/* Overall Stats */}
          <div className="border-b border-gray-200 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-900/30">
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-medium text-blue-700 dark:text-blue-300">Completeness</div>
                  <Database className="h-4 w-4 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {avgCompleteness.toFixed(1)}%
                </div>
                <div className="flex items-center gap-1 mt-1 text-xs text-blue-600 dark:text-blue-400">
                  {avgCompleteness >= 95 ? (
                    <><TrendingUp className="h-3 w-3" /> Excellent</>
                  ) : (
                    <><TrendingDown className="h-3 w-3" /> Needs attention</>
                  )}
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/50 rounded-xl p-4 border border-green-200 dark:border-green-800">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-medium text-green-700 dark:text-green-300">Accuracy</div>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                  {avgAccuracy.toFixed(1)}%
                </div>
                <div className="flex items-center gap-1 mt-1 text-xs text-green-600 dark:text-green-400">
                  {avgAccuracy >= 90 ? (
                    <><TrendingUp className="h-3 w-3" /> Good</>
                  ) : (
                    <><TrendingDown className="h-3 w-3" /> Review needed</>
                  )}
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/50 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-medium text-purple-700 dark:text-purple-300">Consistency</div>
                  <AlertTriangle className="h-4 w-4 text-purple-600" />
                </div>
                <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                  {avgConsistency.toFixed(1)}%
                </div>
                <div className="flex items-center gap-1 mt-1 text-xs text-purple-600 dark:text-purple-400">
                  {avgConsistency >= 95 ? (
                    <><TrendingUp className="h-3 w-3" /> Consistent</>
                  ) : (
                    <><TrendingDown className="h-3 w-3" /> Inconsistencies found</>
                  )}
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/50 dark:to-orange-900/50 rounded-xl p-4 border border-orange-200 dark:border-orange-800">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-medium text-orange-700 dark:text-orange-300">Timeliness</div>
                  <TrendingUp className="h-4 w-4 text-orange-600" />
                </div>
                <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                  {avgTimeliness.toFixed(1)}%
                </div>
                <div className="flex items-center gap-1 mt-1 text-xs text-orange-600 dark:text-orange-400">
                  {avgTimeliness >= 90 ? (
                    <><TrendingUp className="h-3 w-3" /> Up to date</>
                  ) : (
                    <><TrendingDown className="h-3 w-3" /> Stale data</>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Metrics List */}
          <div className="flex-1 overflow-y-auto p-6">
            {metrics.length === 0 ? (
              <div className="py-12 text-center">
                <Shield className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-600 dark:text-gray-400">No quality metrics available</p>
              </div>
            ) : (
              <div className="space-y-3">
                {metrics.map((metric) => (
                  <div
                    key={metric.id}
                    className={`rounded-xl border p-4 ${getScoreBg(metric.overallScore)} hover:shadow-md transition-all`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r ${getScoreColor(metric.overallScore)} flex-shrink-0 shadow-md`}>
                          {getScoreIcon(metric.overallScore)}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                            {metric.widgetName}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            Metric: {metric.metric} • Last checked: {new Date(metric.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className={`px-3 py-1.5 rounded-lg text-sm font-bold bg-gradient-to-r ${getScoreColor(metric.overallScore)} text-white shadow-md`}>
                        {metric.overallScore}%
                      </div>
                    </div>

                    {/* Quality Dimensions */}
                    <div className="grid grid-cols-4 gap-3 mb-3">
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-2 border border-gray-200 dark:border-gray-700">
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Complete</div>
                        <div className="text-sm font-bold text-gray-900 dark:text-white">{metric.completeness}%</div>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-2 border border-gray-200 dark:border-gray-700">
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Accurate</div>
                        <div className="text-sm font-bold text-gray-900 dark:text-white">{metric.accuracy}%</div>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-2 border border-gray-200 dark:border-gray-700">
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Consistent</div>
                        <div className="text-sm font-bold text-gray-900 dark:text-white">{metric.consistency}%</div>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-2 border border-gray-200 dark:border-gray-700">
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Timely</div>
                        <div className="text-sm font-bold text-gray-900 dark:text-white">{metric.timeliness}%</div>
                      </div>
                    </div>

                    {/* Issues */}
                    {metric.issues.length > 0 && (
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                        <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Issues Found ({metric.issues.length}):
                        </div>
                        <ul className="space-y-1">
                          {metric.issues.map((issue, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                              <AlertTriangle className="h-3 w-3 text-yellow-600 flex-shrink-0 mt-0.5" />
                              <span>{issue}</span>
                            </li>
                          ))}
                        </ul>
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
