'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  listDashboards, getDashboard, saveDashboard, deleteDashboard,
  duplicateDashboard, createNewDashboard, syncToMonkDB, loadFromMonkDB,
  initMonkDBStore, mergeDashboards, deleteFromMonkDB,
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
        // Merge: remote wins when newer; returns dashboards only in localStorage (offline edits)
        const localOnly = mergeDashboards(fromDB);
        // Push local-only dashboards up to MonkDB so they're available on other devices
        for (const d of localOnly) {
          await syncToMonkDB(d, (sql, args) => client.query(sql, args));
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
    setDashboards(listDashboards()); // immediate UI update
    if (client) await deleteFromMonkDB(id, (sql, args) => client.query(sql, args));
  }, [client]);

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
