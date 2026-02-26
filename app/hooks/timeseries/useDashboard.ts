'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  listDashboards, getDashboard, saveDashboard, deleteDashboard,
  duplicateDashboard, createNewDashboard, syncToMonkDB, loadFromMonkDB, initMonkDBStore,
} from '@/app/lib/timeseries/dashboard-store';
import { useMonkDBClient } from '@/app/lib/monkdb-context';
import type { DashboardConfig } from '@/app/lib/timeseries/types';

export function useDashboardList() {
  const client = useMonkDBClient();
  const [dashboards, setDashboards] = useState<DashboardConfig[]>([]);
  const [loading, setLoading]       = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      if (client) {
        await initMonkDBStore((sql, args) => client.query(sql, args));
        const fromDB = await loadFromMonkDB((sql) => client.query(sql));
        if (fromDB.length > 0) {
          // Merge DB dashboards into localStorage as source of truth
          fromDB.forEach((d) => saveDashboard(d));
        }
      }
    } catch { /* fall through to localStorage */ }
    setDashboards(listDashboards());
    setLoading(false);
  }, [client]);

  useEffect(() => { reload(); }, [reload]);

  const save = useCallback(async (config: DashboardConfig) => {
    saveDashboard(config);
    if (client) await syncToMonkDB(config, (sql, args) => client.query(sql, args));
    setDashboards(listDashboards());
  }, [client]);

  const remove = useCallback(async (id: string) => {
    deleteDashboard(id);
    setDashboards(listDashboards());
  }, []);

  const duplicate = useCallback((id: string) => {
    const copy = duplicateDashboard(id);
    if (copy) setDashboards(listDashboards());
    return copy;
  }, []);

  const create = useCallback((name: string, themeId: DashboardConfig['themeId'] = 'dark-navy', description?: string) => {
    const d = createNewDashboard(name, themeId, description);
    setDashboards(listDashboards());
    return d;
  }, []);

  return { dashboards, loading, reload, save, remove, duplicate, create };
}

export function useDashboard(id: string | null) {
  const [config, setConfig] = useState<DashboardConfig | null>(
    id ? getDashboard(id) : null,
  );

  useEffect(() => {
    setConfig(id ? getDashboard(id) : null);
  }, [id]);

  const update = useCallback((next: DashboardConfig) => {
    saveDashboard(next);
    setConfig(next);
  }, []);

  return { config, update };
}
