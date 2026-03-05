'use client';
// ─────────────────────────────────────────────────────────────────────────────
// MonkDB Workbench — Dashboard Store
// Two-tier storage: localStorage (immediate) + MonkDB _dashboards table (enterprise)
// ─────────────────────────────────────────────────────────────────────────────

import type { DashboardConfig } from './types';

const LOCAL_KEY = 'monkdb_ts_dashboards';

// Typed query function accepted by all MonkDB sync helpers
type QueryFn = (sql: string, args?: unknown[]) => Promise<{ rows?: unknown[][] }>;

// ── MonkDB persistence table DDL ──────────────────────────────────────────────

const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS monkdb._dashboards (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    description TEXT,
    config      TEXT NOT NULL,
    created_at  TIMESTAMP WITH TIME ZONE,
    updated_at  TIMESTAMP WITH TIME ZONE,
    is_template BOOLEAN DEFAULT false
  )
`;

// ── localStorage layer ────────────────────────────────────────────────────────

function readLocal(): DashboardConfig[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeLocal(dashboards: DashboardConfig[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(dashboards));
  } catch {
    console.warn('[DashboardStore] localStorage write failed');
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export function listDashboards(): DashboardConfig[] {
  return readLocal().sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function getDashboard(id: string): DashboardConfig | null {
  return readLocal().find((d) => d.id === id) ?? null;
}

export function saveDashboard(config: DashboardConfig): void {
  const all = readLocal();
  const idx = all.findIndex((d) => d.id === config.id);
  const updated = { ...config, updatedAt: new Date().toISOString() };

  if (idx >= 0) {
    all[idx] = updated;
  } else {
    all.unshift(updated);
  }
  writeLocal(all);
}

export function deleteDashboard(id: string): void {
  writeLocal(readLocal().filter((d) => d.id !== id));
}

export function duplicateDashboard(id: string): DashboardConfig | null {
  const original = getDashboard(id);
  if (!original) return null;
  const copy: DashboardConfig = {
    ...original,
    id: `dash_${crypto.randomUUID()}`,
    name: `${original.name} (copy)`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  saveDashboard(copy);
  return copy;
}

export function createNewDashboard(
  name: string,
  themeId: DashboardConfig['themeId'] = 'dark-navy',
  description?: string,
): DashboardConfig {
  const now = new Date().toISOString();
  const config: DashboardConfig = {
    id: `dash_${crypto.randomUUID()}`,
    name,
    ...(description?.trim() ? { description: description.trim() } : {}),
    themeId,
    refreshInterval: 30_000,
    createdAt: now,
    updatedAt: now,
    widgets: [],
  };
  saveDashboard(config);
  return config;
}

// ── Cross-device merge ────────────────────────────────────────────────────────

/**
 * Merges remote (MonkDB) dashboards into localStorage using updatedAt as the
 * tiebreaker — whichever copy is newer wins. Returns any local-only dashboards
 * (not present in remote) so the caller can push them up to MonkDB.
 */
export function mergeDashboards(remote: DashboardConfig[]): DashboardConfig[] {
  const remoteById = new Map(remote.map((d) => [d.id, d]));
  const local = readLocal();

  // Upsert each remote dashboard — only overwrite if remote is strictly newer
  for (const remoteDash of remote) {
    const localDash = local.find((d) => d.id === remoteDash.id);
    if (!localDash || new Date(remoteDash.updatedAt) > new Date(localDash.updatedAt)) {
      saveDashboard(remoteDash);
    }
  }

  // Return local-only dashboards (offline creations not yet in MonkDB)
  return local.filter((d) => !remoteById.has(d.id));
}

// ── MonkDB sync (enterprise persistence) ─────────────────────────────────────
// Called when a MonkDB client is available — syncs to DB table for cross-device access

export async function initMonkDBStore(queryFn: QueryFn): Promise<void> {
  try {
    await queryFn(CREATE_TABLE_SQL);
  } catch {
    // Table might already exist or permission issue — silently degrade to localStorage
  }
}

export async function syncToMonkDB(config: DashboardConfig, queryFn: QueryFn): Promise<void> {
  try {
    const sql = `
      INSERT INTO monkdb._dashboards (id, name, description, config, created_at, updated_at, is_template)
      VALUES (?, ?, ?, ?, ?, ?, false)
      ON CONFLICT (id) DO UPDATE SET
        name        = excluded.name,
        description = excluded.description,
        config      = excluded.config,
        updated_at  = excluded.updated_at
    `;
    await queryFn(sql, [
      config.id,
      config.name,
      config.description ?? null,
      JSON.stringify(config),
      config.createdAt,
      new Date().toISOString(),
    ]);
    // Force immediate visibility — MonkDB's ~1s background refresh is unreliable
    // right after a write, so any loadFromMonkDB call that follows would miss the row.
    await queryFn(`REFRESH TABLE monkdb._dashboards`);
  } catch {
    // Silently fall back to localStorage-only
  }
}

export async function loadFromMonkDB(queryFn: QueryFn): Promise<DashboardConfig[]> {
  try {
    const result = await queryFn(
      `SELECT config FROM monkdb._dashboards WHERE is_template = false ORDER BY updated_at DESC`,
    );
    return (result.rows ?? [])
      .map((row: unknown[]) => {
        try { return JSON.parse(row[0] as string) as DashboardConfig; } catch { return null; }
      })
      .filter((d): d is DashboardConfig => d !== null);
  } catch {
    return [];
  }
}

export async function deleteFromMonkDB(id: string, queryFn: QueryFn): Promise<void> {
  try {
    await queryFn(`DELETE FROM monkdb._dashboards WHERE id = ?`, [id]);
  } catch {
    // Silently ignore
  }
}
