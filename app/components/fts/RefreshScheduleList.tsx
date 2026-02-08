'use client';

import { useState, useEffect } from 'react';
import {
  Clock,
  AlertCircle,
  CheckCircle,
  Settings,
  RefreshCw,
  Calendar,
} from 'lucide-react';
import { useRefreshSchedule } from '@/app/hooks/useRefreshSchedule';
import RefreshScheduleManager from './RefreshScheduleManager';
import {
  formatInterval,
  formatTimeUntilRefresh,
  calculateNextRefresh,
  needsRefresh,
} from '@/app/lib/fts/refresh-automation';
import { useToast } from '@/app/components/ToastContext';

export default function RefreshScheduleList() {
  const toast = useToast();
  const { schedules, refreshing, executeRefresh, loadSchedules } = useRefreshSchedule();
  const [selectedTable, setSelectedTable] = useState<{
    schema: string;
    table: string;
  } | null>(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);

  // Auto-refresh tables that need it
  useEffect(() => {
    if (!autoRefreshEnabled) return;

    const interval = setInterval(() => {
      const tablesToRefresh = schedules.filter(s => needsRefresh(s));

      tablesToRefresh.forEach(async (schedule) => {
        const key = `${schedule.schema}.${schedule.table}`;
        if (!refreshing[key]) {
          const success = await executeRefresh(
            schedule.schema,
            schedule.table,
            'scheduled'
          );
          if (success) {
            toast.success(
              'Auto-Refresh',
              `${schedule.schema}.${schedule.table} refreshed automatically`
            );
          }
        }
      });

      loadSchedules();
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [autoRefreshEnabled, schedules, refreshing, executeRefresh, loadSchedules, toast]);

  const handleManualRefresh = async (schema: string, table: string) => {
    const success = await executeRefresh(schema, table, 'manual');
    if (success) {
      toast.success('Refresh Complete', `${schema}.${table} refreshed successfully`);
    } else {
      toast.error('Refresh Failed', `Failed to refresh ${schema}.${table}`);
    }
  };

  const enabledSchedules = schedules.filter(s => s.enabled);
  const tablesToRefresh = schedules.filter(s => needsRefresh(s));

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Scheduled Refreshes
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {enabledSchedules.length} active schedule{enabledSchedules.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={autoRefreshEnabled}
                onChange={(e) => setAutoRefreshEnabled(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
              />
              Auto-execute
            </label>
          </div>
        </div>

        {/* Pending Refreshes Alert */}
        {tablesToRefresh.length > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  {tablesToRefresh.length} table{tablesToRefresh.length !== 1 ? 's' : ''} need
                  refresh
                </div>
                <div className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                  {autoRefreshEnabled
                    ? 'Auto-execute is enabled, refreshes will run automatically'
                    : 'Enable auto-execute or refresh manually'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Schedule List */}
        {schedules.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-600 dark:text-gray-400">No scheduled refreshes</p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              Configure refresh schedules from the FTS search page
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {schedules.map((schedule) => {
              const key = `${schedule.schema}.${schedule.table}`;
              const isRefreshing = refreshing[key] || false;
              const needsRefreshNow = needsRefresh(schedule);
              const nextRefresh = calculateNextRefresh(schedule);

              return (
                <div
                  key={key}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {schedule.schema}.{schedule.table}
                        </span>
                        {schedule.enabled ? (
                          <div className="w-2 h-2 bg-green-500 rounded-full" />
                        ) : (
                          <div className="w-2 h-2 bg-gray-400 rounded-full" />
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Interval: </span>
                          <span className="text-gray-900 dark:text-gray-100">
                            {formatInterval(schedule.interval)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Next: </span>
                          <span
                            className={
                              needsRefreshNow
                                ? 'text-yellow-600 dark:text-yellow-400 font-medium'
                                : 'text-gray-900 dark:text-gray-100'
                            }
                          >
                            {schedule.enabled
                              ? formatTimeUntilRefresh(nextRefresh)
                              : 'Disabled'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Last: </span>
                          <span className="text-gray-900 dark:text-gray-100">
                            {schedule.lastRefresh
                              ? new Date(schedule.lastRefresh).toLocaleTimeString()
                              : 'Never'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Auto-insert: </span>
                          <span className="text-gray-900 dark:text-gray-100">
                            {schedule.autoRefreshOnInsert ? 'Yes' : 'No'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handleManualRefresh(schedule.schema, schedule.table)}
                        disabled={isRefreshing}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Refresh Now"
                      >
                        <RefreshCw
                          className={`w-4 h-4 text-gray-600 dark:text-gray-400 ${
                            isRefreshing ? 'animate-spin' : ''
                          }`}
                        />
                      </button>
                      <button
                        onClick={() =>
                          setSelectedTable({ schema: schedule.schema, table: schedule.table })
                        }
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="Configure Schedule"
                      >
                        <Settings className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      </button>
                    </div>
                  </div>

                  {needsRefreshNow && !isRefreshing && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-yellow-700 dark:text-yellow-300">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>This table needs refresh</span>
                    </div>
                  )}

                  {isRefreshing && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Refreshing...</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Schedule Manager Dialog */}
      {selectedTable && (
        <RefreshScheduleManager
          schema={selectedTable.schema}
          table={selectedTable.table}
          onClose={() => {
            setSelectedTable(null);
            loadSchedules();
          }}
        />
      )}
    </>
  );
}
