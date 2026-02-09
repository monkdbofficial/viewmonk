'use client';

import { useState, useEffect, useCallback } from 'react';
import { useMonkDBClient } from '@/app/lib/monkdb-context';
import {
  RefreshSchedule,
  RefreshHistoryEntry,
  getRefreshSchedules,
  updateTableSchedule,
  deleteTableSchedule,
  getTableSchedule,
  addRefreshHistory,
  getRefreshHistory,
  getTableRefreshHistory,
  needsRefresh,
  calculateNextRefresh,
} from '@/app/lib/fts/refresh-automation';

export function useRefreshSchedule(schema?: string, table?: string) {
  const client = useMonkDBClient();
  const [schedules, setSchedules] = useState<RefreshSchedule[]>([]);
  const [history, setHistory] = useState<RefreshHistoryEntry[]>([]);
  const [refreshing, setRefreshing] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  // Load schedules from localStorage
  const loadSchedules = useCallback(() => {
    const allSchedules = getRefreshSchedules();
    setSchedules(allSchedules);
  }, []);

  // Load history from localStorage
  const loadHistory = useCallback(() => {
    if (schema && table) {
      const tableHistory = getTableRefreshHistory(schema, table);
      setHistory(tableHistory);
    } else {
      const allHistory = getRefreshHistory();
      setHistory(allHistory);
    }
  }, [schema, table]);

  // Initial load
  useEffect(() => {
    loadSchedules();
    loadHistory();
  }, [loadSchedules, loadHistory]);

  // Execute REFRESH TABLE
  const executeRefresh = useCallback(
    async (
      targetSchema: string,
      targetTable: string,
      triggeredBy: 'manual' | 'scheduled' | 'auto-insert' = 'manual'
    ): Promise<boolean> => {
      if (!client) {
        setError('Database client not available');
        return false;
      }

      const key = `${targetSchema}.${targetTable}`;
      setRefreshing(prev => ({ ...prev, [key]: true }));
      setError(null);

      const startTime = Date.now();

      try {
        const query = `REFRESH TABLE "${targetSchema}"."${targetTable}"`;
        await client.query(query);

        const duration = Date.now() - startTime;

        // Add to history
        addRefreshHistory({
          schema: targetSchema,
          table: targetTable,
          timestamp: Date.now(),
          success: true,
          duration,
          triggeredBy,
        });

        // Update last refresh time in schedule
        const schedule = getTableSchedule(targetSchema, targetTable);
        if (schedule) {
          const updatedSchedule = {
            ...schedule,
            lastRefresh: Date.now(),
            nextRefresh: calculateNextRefresh({
              ...schedule,
              lastRefresh: Date.now(),
            }),
          };
          updateTableSchedule(updatedSchedule);
        }

        loadHistory();
        loadSchedules();

        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Refresh failed';
        setError(errorMessage);

        // Add to history
        addRefreshHistory({
          schema: targetSchema,
          table: targetTable,
          timestamp: Date.now(),
          success: false,
          error: errorMessage,
          triggeredBy,
        });

        loadHistory();

        return false;
      } finally {
        setRefreshing(prev => ({ ...prev, [key]: false }));
      }
    },
    [client, loadHistory, loadSchedules]
  );

  // Save or update schedule
  const saveSchedule = useCallback(
    (schedule: RefreshSchedule) => {
      updateTableSchedule(schedule);
      loadSchedules();
    },
    [loadSchedules]
  );

  // Remove schedule
  const removeSchedule = useCallback(
    (targetSchema: string, targetTable: string) => {
      deleteTableSchedule(targetSchema, targetTable);
      loadSchedules();
    },
    [loadSchedules]
  );

  // Get schedule for current table
  const currentSchedule = schema && table ? getTableSchedule(schema, table) : null;

  // Check if any tables need refresh
  const tablesToRefresh = schedules.filter(s => needsRefresh(s));

  return {
    schedules,
    history,
    currentSchedule,
    refreshing,
    error,
    tablesToRefresh,
    executeRefresh,
    saveSchedule,
    removeSchedule,
    loadSchedules,
    loadHistory,
  };
}
