// ── Dashboard Snapshot Store ───────────────────────────────────────────────────
// Point-in-time saves of a dashboard config, stored in localStorage.
// Max 10 snapshots per dashboard — oldest auto-evicted.

import type { DashboardConfig } from './types';

const MAX_SNAPSHOTS = 10;

export interface DashboardSnapshot {
  id: string;
  dashboardId: string;
  name: string;
  savedAt: string;   // ISO timestamp
  config: DashboardConfig;
}

function storageKey(dashboardId: string) {
  return `monkdb_snapshots_${dashboardId}`;
}

export function listSnapshots(dashboardId: string): DashboardSnapshot[] {
  try {
    const raw = localStorage.getItem(storageKey(dashboardId));
    return raw ? (JSON.parse(raw) as DashboardSnapshot[]) : [];
  } catch {
    return [];
  }
}

export function saveSnapshot(dashboardId: string, name: string, config: DashboardConfig): DashboardSnapshot {
  const snapshot: DashboardSnapshot = {
    id: `snap_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    dashboardId,
    name: name.trim() || `Snapshot ${new Date().toLocaleString()}`,
    savedAt: new Date().toISOString(),
    config,
  };

  const existing = listSnapshots(dashboardId);
  const updated  = [snapshot, ...existing].slice(0, MAX_SNAPSHOTS);
  try {
    localStorage.setItem(storageKey(dashboardId), JSON.stringify(updated));
  } catch {
    // localStorage full — drop oldest
    localStorage.setItem(storageKey(dashboardId), JSON.stringify([snapshot, ...existing].slice(0, MAX_SNAPSHOTS - 1)));
  }
  return snapshot;
}

export function deleteSnapshot(dashboardId: string, snapshotId: string): void {
  const updated = listSnapshots(dashboardId).filter((s) => s.id !== snapshotId);
  localStorage.setItem(storageKey(dashboardId), JSON.stringify(updated));
}

export function renameSnapshot(dashboardId: string, snapshotId: string, newName: string): void {
  const updated = listSnapshots(dashboardId).map((s) =>
    s.id === snapshotId ? { ...s, name: newName } : s,
  );
  localStorage.setItem(storageKey(dashboardId), JSON.stringify(updated));
}
