'use client';

import { useState } from 'react';
import {
  Clock,
  Play,
  Pause,
  Trash2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Settings,
  History,
  X,
} from 'lucide-react';
import { useRefreshSchedule } from '@/app/hooks/useRefreshSchedule';
import {
  RefreshSchedule,
  REFRESH_PRESETS,
  formatInterval,
  formatTimeUntilRefresh,
  calculateNextRefresh,
} from '@/app/lib/fts/refresh-automation';
import { useToast } from '@/app/components/ToastContext';

interface RefreshScheduleManagerProps {
  schema: string;
  table: string;
  onClose?: () => void;
}

export default function RefreshScheduleManager({
  schema,
  table,
  onClose,
}: RefreshScheduleManagerProps) {
  const toast = useToast();
  const {
    currentSchedule,
    history,
    refreshing,
    error,
    executeRefresh,
    saveSchedule,
    removeSchedule,
  } = useRefreshSchedule(schema, table);

  const [showConfig, setShowConfig] = useState(!currentSchedule);
  const [showHistory, setShowHistory] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  // Form state
  const [enabled, setEnabled] = useState(currentSchedule?.enabled ?? false);
  const [intervalMinutes, setIntervalMinutes] = useState(currentSchedule?.interval ?? 30);
  const [autoRefreshOnInsert, setAutoRefreshOnInsert] = useState(
    currentSchedule?.autoRefreshOnInsert ?? false
  );

  const isRefreshing = refreshing[`${schema}.${table}`] || false;
  const nextRefresh = currentSchedule ? calculateNextRefresh(currentSchedule) : 0;
  const lastRefresh = currentSchedule?.lastRefresh;

  const handleSave = () => {
    const schedule: RefreshSchedule = {
      schema,
      table,
      enabled,
      interval: intervalMinutes,
      autoRefreshOnInsert,
      lastRefresh: currentSchedule?.lastRefresh || Date.now(),
      nextRefresh: 0,
    };

    schedule.nextRefresh = calculateNextRefresh(schedule);

    saveSchedule(schedule);
    setShowConfig(false);
    toast.success('Schedule Saved', `Refresh schedule configured for ${schema}.${table}`);
  };

  const handleManualRefresh = async () => {
    const success = await executeRefresh(schema, table, 'manual');
    if (success) {
      toast.success('Refresh Complete', `Table ${schema}.${table} refreshed successfully`);
    } else {
      toast.error('Refresh Failed', error || 'Failed to refresh table');
    }
  };

  const handleRemoveSchedule = () => {
    if (!confirmRemove) { setConfirmRemove(true); return; }
    removeSchedule(schema, table);
    setShowConfig(true);
    setEnabled(false);
    setConfirmRemove(false);
    toast.success('Schedule Removed', 'Automatic refresh disabled');
  };

  const tableHistory = history.filter(h => h.schema === schema && h.table === table);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Refresh Schedule
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {schema}.{table}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Current Status */}
          {currentSchedule && !showConfig && (
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {currentSchedule.enabled ? (
                    <>
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Automatic Refresh Enabled
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 bg-gray-400 rounded-full" />
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Automatic Refresh Disabled
                      </span>
                    </>
                  )}
                </div>
                <button
                  onClick={() => setShowConfig(true)}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Edit Schedule"
                >
                  <Settings className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Interval</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {formatInterval(currentSchedule.interval)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                    Next Refresh
                  </div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {currentSchedule.enabled
                      ? formatTimeUntilRefresh(nextRefresh)
                      : 'Not scheduled'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                    Last Refresh
                  </div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {lastRefresh
                      ? new Date(lastRefresh).toLocaleString()
                      : 'Never'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                    Auto-refresh on Insert
                  </div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {currentSchedule.autoRefreshOnInsert ? 'Enabled' : 'Disabled'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Configuration Panel */}
          {showConfig && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Configure Schedule
              </h3>

              {/* Enable/Disable */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="enabled"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <label
                  htmlFor="enabled"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Enable automatic refresh
                </label>
              </div>

              {/* Interval Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Refresh Interval
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {REFRESH_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => setIntervalMinutes(preset.value)}
                      className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                        intervalMinutes === preset.value
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Interval */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Custom Interval (minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  max="10080"
                  value={intervalMinutes}
                  onChange={(e) => setIntervalMinutes(parseInt(e.target.value, 10) || 30)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Min: 1 minute, Max: 1 week (10080 minutes)
                </p>
              </div>

              {/* Auto-refresh on Insert */}
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="autoRefresh"
                  checked={autoRefreshOnInsert}
                  onChange={(e) => setAutoRefreshOnInsert(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <label
                    htmlFor="autoRefresh"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300 block"
                  >
                    Auto-refresh on insert detection
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Automatically refresh table when new documents are detected (experimental)
                  </p>
                </div>
              </div>

              {/* Save/Cancel Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Save Schedule
                </button>
                {currentSchedule && (
                  <button
                    onClick={() => setShowConfig(false)}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Manual Refresh */}
          {!showConfig && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Manual Actions
              </h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleManualRefresh}
                  disabled={isRefreshing}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isRefreshing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Refreshing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Refresh Now
                    </>
                  )}
                </button>
                {currentSchedule && (
                  confirmRemove ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Remove schedule?</span>
                      <button onClick={handleRemoveSchedule}
                        className="px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition-colors">
                        Confirm
                      </button>
                      <button onClick={() => setConfirmRemove(false)}
                        className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors">
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button onClick={handleRemoveSchedule}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors">
                      <Trash2 className="w-4 h-4" />
                      Remove Schedule
                    </button>
                  )
                )}
              </div>
            </div>
          )}

          {/* History */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Refresh History
              </h3>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                {showHistory ? 'Hide' : 'Show All'}
              </button>
            </div>

            {tableHistory.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No refresh history yet</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {(showHistory ? tableHistory : tableHistory.slice(0, 5)).map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {entry.success ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-600" />
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {new Date(entry.timestamp).toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {entry.triggeredBy === 'manual' && 'Manual refresh'}
                          {entry.triggeredBy === 'scheduled' && 'Scheduled refresh'}
                          {entry.triggeredBy === 'auto-insert' && 'Auto-refresh (insert detected)'}
                          {entry.duration && ` • ${entry.duration}ms`}
                        </div>
                        {entry.error && (
                          <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                            {entry.error}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-red-800 dark:text-red-200">
                    Refresh Failed
                  </div>
                  <div className="text-xs text-red-700 dark:text-red-300 mt-1">{error}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
