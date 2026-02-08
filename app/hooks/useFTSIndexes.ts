/**
 * Hook to fetch and manage Full-Text Search indexes
 * Detects tables with FULLTEXT indexes and filters by accessible schemas
 */

import { useState, useEffect } from 'react';
import { useMonkDBClient } from '@/app/lib/monkdb-context';
import { useAccessibleSchemas } from './useAccessibleSchemas';

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
    if (!client) {
      setIndexes([]);
      setLoading(false);
      return;
    }

    if (schemasLoading) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Query for columns with FULLTEXT indexes
      // In MonkDB/CrateDB, fulltext indexes are defined at the column level
      const query = `
        SELECT
          table_schema,
          table_name,
          column_name,
          ordinal_position
        FROM information_schema.columns
        WHERE data_type = 'text'
          AND table_schema NOT IN ('sys', 'information_schema', 'pg_catalog')
        ORDER BY table_schema, table_name, ordinal_position
      `;

      const result = await client.query(query);

      // Convert rows to objects
      const rows = result.rows.map((row: any[]) => {
        const obj: any = {};
        result.cols.forEach((col: string, idx: number) => {
          obj[col] = row[idx];
        });
        return obj;
      });

      // Filter by accessible schemas and group columns by table
      const accessibleSchemaSet = new Set(accessibleSchemas.map(s => s.name));
      const tableMap = new Map<string, FTSIndex>();

      for (const row of rows) {
        const schema = row.table_schema;

        // Skip if user doesn't have access to this schema
        if (!accessibleSchemaSet.has(schema)) {
          continue;
        }

        const key = `${schema}.${row.table_name}`;

        if (!tableMap.has(key)) {
          tableMap.set(key, {
            schema,
            table: row.table_name,
            indexName: `fts_${row.table_name}`, // Generate a default index name
            columns: [],
          });
        }

        // Add column to the table's FTS index
        const index = tableMap.get(key)!;
        if (row.column_name && !index.columns.includes(row.column_name)) {
          index.columns.push(row.column_name);
        }
      }

      const parsedIndexes = Array.from(tableMap.values());

      // Fetch document counts for each table
      await Promise.all(
        parsedIndexes.map(async (index) => {
          try {
            const countQuery = `
              SELECT COUNT(*) as count
              FROM "${index.schema}"."${index.table}"
            `;
            const countResult = await client.query(countQuery);
            index.documentCount = parseInt(countResult.rows[0]?.[0] || '0', 10);
          } catch (err) {
            console.warn(`Failed to fetch count for ${index.schema}.${index.table}:`, err);
            index.documentCount = 0;
          }
        })
      );

      setIndexes(parsedIndexes);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch FTS indexes';
      setError(errorMessage);
      console.error('[useFTSIndexes]', err);
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
  const stored = localStorage.getItem('monkdb-fts-favorites');
  return stored ? JSON.parse(stored) : [];
}

/**
 * Add a table to FTS favorites
 */
export function addFTSFavorite(schema: string, table: string): void {
  const key = `${schema}.${table}`;
  const favorites = getFTSFavorites();
  if (!favorites.includes(key)) {
    favorites.push(key);
    localStorage.setItem('monkdb-fts-favorites', JSON.stringify(favorites));
  }
}

/**
 * Remove a table from FTS favorites
 */
export function removeFTSFavorite(schema: string, table: string): void {
  const key = `${schema}.${table}`;
  const favorites = getFTSFavorites();
  const filtered = favorites.filter(f => f !== key);
  localStorage.setItem('monkdb-fts-favorites', JSON.stringify(filtered));
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
  const stored = localStorage.getItem('monkdb-fts-saved');
  return stored ? JSON.parse(stored) : [];
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
    id: Date.now().toString(),
    timestamp: Date.now(),
    ...search,
  });
  localStorage.setItem('monkdb-fts-saved', JSON.stringify(saved));
}

/**
 * Delete a saved FTS search
 */
export function deleteSavedFTSSearch(id: string): void {
  const saved = getSavedFTSSearches();
  const filtered = saved.filter(s => s.id !== id);
  localStorage.setItem('monkdb-fts-saved', JSON.stringify(filtered));
}
