/**
 * Hook to fetch and manage Full-Text Search indexes
 * Detects tables with FULLTEXT indexes and filters by accessible schemas
 */

import { useState, useEffect } from 'react';
import { useMonkDBClient } from '@/app/lib/monkdb-context';
import { useAccessibleSchemas } from './useAccessibleSchemas';

// ── localStorage key constants ──────────────────────────────────────────────
const LS_FTS_FAVORITES = 'monkdb-fts-favorites';
const LS_FTS_SAVED     = 'monkdb-fts-saved';

// ── Concurrency helpers ──────────────────────────────────────────────────────
/** Run an array of async tasks in batches to avoid overwhelming the DB. */
async function batchedMap<T, R>(
  items: T[],
  batchSize: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
}

export interface FTSIndex {
  schema: string;
  table: string;
  indexName: string;
  columns: string[];
  analyzer?: string;
  documentCount?: number;
}

interface UseFTSIndexesResult {
  indexes: FTSIndex[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useFTSIndexes(): UseFTSIndexesResult {
  const client = useMonkDBClient();
  const { schemas: accessibleSchemas, loading: schemasLoading } = useAccessibleSchemas();
  const [indexes, setIndexes] = useState<FTSIndex[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIndexes = async () => {
    if (!client) { setIndexes([]); setLoading(false); return; }
    if (schemasLoading) return;

    setLoading(true);
    setError(null);

    try {
      // Step 1: Get all base tables in accessible schemas.
      // Exclude built-in and special schemas:
      //   sys, information_schema, pg_catalog — system metadata (no user tables)
      //   blob — MonkDB BLOB-table schema; SHOW CREATE TABLE is not supported there
      const tableResult = await client.query(`
        SELECT table_schema, table_name
        FROM information_schema.tables
        WHERE table_type = 'BASE TABLE'
          AND table_schema NOT IN ('sys', 'information_schema', 'pg_catalog', 'blob')
        ORDER BY table_schema, table_name
      `);

      const accessibleSchemaSet = new Set(accessibleSchemas.map(s => s.name));
      const tables = tableResult.rows
        .map((r: any[]) => ({ schema: r[0], table: r[1] }))
        .filter((t: { schema: string }) => accessibleSchemaSet.has(t.schema));

      // Step 2: For each table run SHOW CREATE TABLE and parse named FULLTEXT indexes.
      // MonkDB 6+ requires MATCH("index_name", ?) — column-name syntax does not work.
      // Process in batches of 10 to avoid overwhelming the DB with concurrent requests.
      const ftsIndexes: FTSIndex[] = [];
      const IDX_REGEX = /INDEX\s+"([^"]+)"\s+USING\s+FULLTEXT\s+\(([^)]+)\)/i;
      const ANALYZER_REGEX = /analyzer\s*=\s*'([^']+)'/i;

      await batchedMap(
        tables,
        10,
        async ({ schema, table }: { schema: string; table: string }) => {
          try {
            const result = await client.query(`SHOW CREATE TABLE "${schema}"."${table}"`);
            const ddl: string = result.rows[0]?.[0] || '';
            const lines = ddl.split('\n');
            for (let i = 0; i < lines.length; i++) {
              const m = IDX_REGEX.exec(lines[i]);
              if (m) {
                const indexName = m[1];
                const cols = m[2].split(',').map((c: string) => c.trim().replace(/^"|"$/g, ''));
                // Analyzer appears in the WITH (...) block on following lines
                const context = lines.slice(i, i + 5).join(' ');
                const am = ANALYZER_REGEX.exec(context);
                ftsIndexes.push({
                  schema,
                  table,
                  indexName,
                  columns: cols,
                  analyzer: am ? am[1] : 'standard',
                });
              }
            }
          } catch {
            // table not accessible or SHOW failed — skip
          }
        }
      );

      // Step 3: Fetch document counts (batched)
      await batchedMap(ftsIndexes, 10, async (idx) => {
        try {
          const r = await client.query(`SELECT COUNT(*) FROM "${idx.schema}"."${idx.table}"`);
          idx.documentCount = parseInt(r.rows[0]?.[0] || '0', 10);
        } catch {
          idx.documentCount = 0;
        }
      });

      setIndexes(
        ftsIndexes.sort((a, b) =>
          `${a.schema}.${a.table}.${a.indexName}`.localeCompare(`${b.schema}.${b.table}.${b.indexName}`)
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch FTS indexes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIndexes();
  }, [client, accessibleSchemas, schemasLoading]);

  return {
    indexes,
    loading,
    error,
    refresh: fetchIndexes,
  };
}

/**
 * Get FTS table favorites from localStorage
 */
export function getFTSFavorites(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(LS_FTS_FAVORITES);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Add a table to FTS favorites
 */
export function addFTSFavorite(schema: string, table: string): void {
  const key = `${schema}.${table}`;
  const favorites = getFTSFavorites();
  if (!favorites.includes(key)) {
    favorites.push(key);
    localStorage.setItem(LS_FTS_FAVORITES, JSON.stringify(favorites));
  }
}

/**
 * Remove a table from FTS favorites
 */
export function removeFTSFavorite(schema: string, table: string): void {
  const key = `${schema}.${table}`;
  const favorites = getFTSFavorites();
  const filtered = favorites.filter(f => f !== key);
  localStorage.setItem(LS_FTS_FAVORITES, JSON.stringify(filtered));
}

/**
 * Check if a table is favorited
 */
export function isFTSFavorite(schema: string, table: string): boolean {
  const key = `${schema}.${table}`;
  return getFTSFavorites().includes(key);
}

/**
 * Get saved FTS searches from localStorage
 */
export function getSavedFTSSearches(): Array<{
  id: string;
  name: string;
  schema: string;
  table: string;
  columns: string[];
  query: string;
  boosts?: Record<string, number>;
  timestamp: number;
}> {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(LS_FTS_SAVED);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Save an FTS search
 */
export function saveFTSSearch(search: {
  name: string;
  schema: string;
  table: string;
  columns: string[];
  query: string;
  boosts?: Record<string, number>;
}): void {
  const saved = getSavedFTSSearches();
  saved.push({
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    ...search,
  });
  localStorage.setItem(LS_FTS_SAVED, JSON.stringify(saved));
}

/**
 * Delete a saved FTS search
 */
export function deleteSavedFTSSearch(id: string): void {
  const saved = getSavedFTSSearches();
  const filtered = saved.filter(s => s.id !== id);
  localStorage.setItem(LS_FTS_SAVED, JSON.stringify(filtered));
}
