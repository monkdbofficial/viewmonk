/**
 * Hook to fetch and manage vector-enabled tables (collections)
 * Detects tables with FLOAT_VECTOR columns and filters by accessible schemas
 */

import { useState, useEffect } from 'react';
import { useMonkDBClient } from '@/app/lib/monkdb-context';
import { useAccessibleSchemas } from './useAccessibleSchemas';

export interface VectorCollection {
  schema: string;
  table: string;
  columnName: string;
  dimension: number;
  documentCount?: number;
  lastUpdated?: Date;
}

interface UseVectorCollectionsResult {
  collections: VectorCollection[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useVectorCollections(): UseVectorCollectionsResult {
  const client = useMonkDBClient();
  const { schemas: accessibleSchemas, loading: schemasLoading } = useAccessibleSchemas();
  const [collections, setCollections] = useState<VectorCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCollections = async () => {
    if (!client) {
      setCollections([]);
      setLoading(false);
      return;
    }

    if (schemasLoading) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Query for all FLOAT_VECTOR columns
      const query = `
        SELECT
          table_schema,
          table_name,
          column_name,
          data_type
        FROM information_schema.columns
        WHERE data_type LIKE 'float_vector%'
          AND table_schema NOT IN ('sys', 'information_schema', 'pg_catalog')
        ORDER BY table_schema, table_name
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

      // Parse dimensions and filter by accessible schemas
      const accessibleSchemaSet = new Set(accessibleSchemas.map(s => s.name));
      const parsedCollections: VectorCollection[] = [];

      for (const row of rows) {
        const schema = row.table_schema;

        // Skip if user doesn't have access to this schema
        if (!accessibleSchemaSet.has(schema)) {
          continue;
        }

        // Parse dimension from data_type
        // Format 1: "float_vector(384)" -> 384
        // Format 2: "float_vector" -> Query the table to get actual dimension
        let dimension = 0;

        const match = row.data_type.match(/float_vector\((\d+)\)/);
        if (match) {
          dimension = parseInt(match[1], 10);
        } else if (row.data_type === 'float_vector' || row.data_type.toLowerCase().includes('float_vector')) {
          // MonkDB sometimes returns just "float_vector" without dimension
          // We'll detect dimension from actual data or use a default
          try {
            // Try to get dimension from a sample row
            const dimQuery = `
              SELECT array_length(${row.column_name}, 1) as dim
              FROM "${schema}"."${row.table_name}"
              WHERE ${row.column_name} IS NOT NULL
              LIMIT 1
            `;
            const dimResult = await client.query(dimQuery);
            if (dimResult.rows.length > 0 && dimResult.rows[0][0]) {
              dimension = parseInt(dimResult.rows[0][0], 10);
            } else {
              // No data yet, use common default (384 for all-MiniLM-L6-v2)
              dimension = 384;
            }
          } catch {
            // If query fails, assume 384 (most common embedding dimension)
            dimension = 384;
          }
        }

        if (dimension > 0) {
          parsedCollections.push({
            schema,
            table: row.table_name,
            columnName: row.column_name,
            dimension,
          });
        }
      }

      // Fetch document counts for each collection
      await Promise.all(
        parsedCollections.map(async (collection) => {
          try {
            const countQuery = `
              SELECT COUNT(*) as count
              FROM "${collection.schema}"."${collection.table}"
            `;
            const countResult = await client.query(countQuery);
            collection.documentCount = parseInt(countResult.rows[0]?.[0] || '0', 10);
          } catch {
            collection.documentCount = 0;
          }
        })
      );

      setCollections(parsedCollections);

    } catch (err) {
      let errorMessage = 'Failed to fetch vector collections';

      if (err instanceof Error) {
        errorMessage = err.message;

        // Provide more specific error messages
        if (err.message.includes('RelationUnknown')) {
          errorMessage = 'Cannot access information_schema.columns. Check database permissions.';
        } else if (err.message.includes('UnauthorizedException')) {
          errorMessage = 'You don\'t have permission to query system tables. Contact your admin.';
        } else if (err.message.includes('timeout')) {
          errorMessage = 'Query timed out. The database might be slow or unreachable.';
        }
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, [client, accessibleSchemas, schemasLoading]);

  return {
    collections,
    loading,
    error,
    refresh: fetchCollections,
  };
}

/**
 * Get vector collection favorites from localStorage
 */
export function getVectorFavorites(): string[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem('monkdb-vector-favorites');
  return stored ? JSON.parse(stored) : [];
}

/**
 * Add a collection to favorites
 */
export function addVectorFavorite(schema: string, table: string): void {
  const key = `${schema}.${table}`;
  const favorites = getVectorFavorites();
  if (!favorites.includes(key)) {
    favorites.push(key);
    localStorage.setItem('monkdb-vector-favorites', JSON.stringify(favorites));
  }
}

/**
 * Remove a collection from favorites
 */
export function removeVectorFavorite(schema: string, table: string): void {
  const key = `${schema}.${table}`;
  const favorites = getVectorFavorites();
  const filtered = favorites.filter(f => f !== key);
  localStorage.setItem('monkdb-vector-favorites', JSON.stringify(filtered));
}

/**
 * Check if a collection is favorited
 */
export function isVectorFavorite(schema: string, table: string): boolean {
  const key = `${schema}.${table}`;
  return getVectorFavorites().includes(key);
}

/**
 * Get recent vector collections from localStorage
 */
export function getRecentVectorCollections(): string[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem('monkdb-vector-recent');
  return stored ? JSON.parse(stored) : [];
}

/**
 * Add a collection to recent list (max 10)
 */
export function addRecentVectorCollection(schema: string, table: string): void {
  const key = `${schema}.${table}`;
  const recent = getRecentVectorCollections();

  // Remove if already exists
  const filtered = recent.filter(r => r !== key);

  // Add to front
  filtered.unshift(key);

  // Keep only last 10
  const trimmed = filtered.slice(0, 10);

  localStorage.setItem('monkdb-vector-recent', JSON.stringify(trimmed));
}
