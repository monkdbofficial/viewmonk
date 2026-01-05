'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useMonkDBClient } from './monkdb-context';
import type { NodeInfo, TableMetadata, ColumnMetadata, TableTreeNode } from './monkdb-client';

export interface UseQueryResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for executing custom SQL queries
 *
 * @param query - SQL query string to execute
 * @param args - Optional query parameters
 * @param options - Optional configuration (enabled flag)
 * @returns Query result with data, loading state, error, and refetch function
 *
 * @example
 * ```tsx
 * const { data, loading, error, refetch } = useMonkDBQuery('SELECT * FROM users');
 * ```
 */
export function useMonkDBQuery<T = any>(
  query: string,
  args?: any[],
  options?: { enabled?: boolean }
): UseQueryResult<T[]> {
  const client = useMonkDBClient();
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    // CRITICAL: Guard against no connection
    if (!client) {
      setError('No active database connection. Please connect to a database.');
      setLoading(false);
      setData(null);
      return;
    }

    // Respect enabled flag
    if (options?.enabled === false) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await client.query<T>(query, args);
      setData(result.rows as any);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Query failed');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [client, query, args, options?.enabled]);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, query, JSON.stringify(args), options?.enabled]); // Re-fetch when query/args change

  return { data, loading, error, refetch: fetchData };
}

/**
 * Hook for fetching cluster nodes
 *
 * @returns Cluster node information with loading state and error handling
 */
export function useNodes(): UseQueryResult<NodeInfo[]> {
  const client = useMonkDBClient();
  const [data, setData] = useState<NodeInfo[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    // CRITICAL: Guard against no connection
    if (!client) {
      setError('No active database connection. Please connect to a database.');
      setLoading(false);
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const nodes = await client.getNodes();
      setData(nodes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch nodes');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client]); // Only depend on client, not fetchData to avoid infinite loop

  return { data, loading, error, refetch: fetchData };
}

/**
 * Hook for fetching cluster uptime
 *
 * @returns Cluster uptime in milliseconds with loading state and error handling
 */
export function useClusterUptime(): UseQueryResult<number> {
  const client = useMonkDBClient();
  const [data, setData] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    // CRITICAL: Guard against no connection
    if (!client) {
      setError('No active database connection. Please connect to a database.');
      setLoading(false);
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const uptime = await client.getClusterUptime();
      setData(uptime);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch uptime');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client]); // Only depend on client, not fetchData to avoid infinite loop

  return { data, loading, error, refetch: fetchData };
}

/**
 * Hook for fetching tables in a schema
 *
 * @param schemaName - Schema name to fetch tables from (defaults to 'doc')
 * @returns Table metadata with loading state and error handling
 */
export function useTables(schemaName: string = 'doc'): UseQueryResult<TableMetadata[]> {
  const client = useMonkDBClient();
  const [data, setData] = useState<TableMetadata[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    // CRITICAL: Guard against no connection
    if (!client) {
      setError('No active database connection. Please connect to a database.');
      setLoading(false);
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const tables = await client.getTables(schemaName);
      setData(tables);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tables');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [client, schemaName]);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, schemaName]); // Re-fetch when schema changes

  return { data, loading, error, refetch: fetchData };
}

/**
 * Hook for fetching all schemas
 *
 * @returns List of schema names with loading state and error handling
 */
export function useSchemas(): UseQueryResult<string[]> {
  const client = useMonkDBClient();
  const [data, setData] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isFetchingRef = useRef(false);

  const fetchData = useCallback(async () => {
    // CRITICAL: Guard against no connection
    if (!client) {
      setError('No active database connection. Please connect to a database.');
      setLoading(false);
      setData(null);
      return;
    }

    // Prevent concurrent fetches
    if (isFetchingRef.current) {
      return;
    }

    isFetchingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const schemas = await client.getSchemas();
      setData(schemas);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch schemas');
      setData(null);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [client]);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client]); // Only depend on client, not fetchData to avoid infinite loop

  return { data, loading, error, refetch: fetchData };
}

/**
 * Hook for fetching table columns
 *
 * @param schemaName - Schema name containing the table
 * @param tableName - Table name to fetch columns from
 * @returns Column metadata with loading state and error handling
 */
export function useTableColumns(
  schemaName: string,
  tableName: string
): UseQueryResult<ColumnMetadata[]> {
  const client = useMonkDBClient();
  const [data, setData] = useState<ColumnMetadata[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    // CRITICAL: Guard against no connection
    if (!client) {
      setError('No active database connection. Please connect to a database.');
      setLoading(false);
      setData(null);
      return;
    }

    // Don't fetch if no table is selected (just clear data, no error)
    if (!schemaName || !tableName) {
      setError(null);
      setLoading(false);
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const columns = await client.getTableColumns(schemaName, tableName);
      setData(columns);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch columns');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [client, schemaName, tableName]);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, schemaName, tableName]); // Re-fetch when table selection changes

  return { data, loading, error, refetch: fetchData };
}

/**
 * Hook for fetching complete table tree
 *
 * @param schemaName - Schema name containing the table
 * @param tableName - Table name to fetch tree structure from
 * @returns Table tree nodes with loading state and error handling
 */
export function useTableTree(
  schemaName: string,
  tableName: string
): UseQueryResult<TableTreeNode[]> {
  const client = useMonkDBClient();
  const [data, setData] = useState<TableTreeNode[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    // CRITICAL: Guard against no connection
    if (!client) {
      setError('No active database connection. Please connect to a database.');
      setLoading(false);
      setData(null);
      return;
    }

    // Don't fetch if no table is selected (just clear data, no error)
    if (!schemaName || !tableName) {
      setError(null);
      setLoading(false);
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const tree = await client.getTableTree(schemaName, tableName);
      setData(tree);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch table tree');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [client, schemaName, tableName]);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, schemaName, tableName]); // Re-fetch when table selection changes

  return { data, loading, error, refetch: fetchData };
}

/**
 * Hook for fetching database statistics
 *
 * @returns Database statistics including total tables, schemas, and size
 */
export function useDatabaseStats(): UseQueryResult<{
  totalTables: number;
  totalSchemas: number;
  totalSize: number;
}> {
  const client = useMonkDBClient();
  const [data, setData] = useState<{
    totalTables: number;
    totalSchemas: number;
    totalSize: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    // CRITICAL: Guard against no connection
    if (!client) {
      setError('No active database connection. Please connect to a database.');
      setLoading(false);
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const stats = await client.getDatabaseStats();
      setData(stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stats');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client]); // Only depend on client, not fetchData to avoid infinite loop

  return { data, loading, error, refetch: fetchData };
}

/**
 * Hook for fetching cluster health information
 *
 * @returns Cluster health metrics including node count, healthy nodes, and uptime
 */
export function useClusterHealth(): UseQueryResult<{
  nodeCount: number;
  healthyNodes: number;
  clusterUptime: number;
}> {
  const client = useMonkDBClient();
  const [data, setData] = useState<{
    nodeCount: number;
    healthyNodes: number;
    clusterUptime: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    // CRITICAL: Guard against no connection
    if (!client) {
      setError('No active database connection. Please connect to a database.');
      setLoading(false);
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const health = await client.getClusterHealth();
      setData(health);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch health');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client]); // Only depend on client, not fetchData to avoid infinite loop

  return { data, loading, error, refetch: fetchData };
}

/**
 * Enterprise-grade hook for Read/Write ratio metrics
 *
 * Analyzes query patterns from the last hour to calculate the ratio of
 * read operations (SELECT) to write operations (INSERT, UPDATE, DELETE).
 * Provides insights into database workload characteristics.
 *
 * @returns Read/Write statistics with ratio calculation
 *
 * @example
 * ```tsx
 * const { data, loading, error, refetch } = useReadWriteRatio();
 * // data = { readOps: 150, writeOps: 50, ratio: "3.0:1" }
 * ```
 */
export function useReadWriteRatio(): UseQueryResult<{
  readOps: number;
  writeOps: number;
  ratio: string;
}> {
  const client = useMonkDBClient();
  const [data, setData] = useState<{ readOps: number; writeOps: number; ratio: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    // CRITICAL: Guard against no connection - enterprise-grade connection protection
    if (!client) {
      setError('No active database connection. Please connect to a database.');
      setLoading(false);
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await client.query(`
        SELECT
          SUM(CASE WHEN stmt LIKE 'SELECT%' THEN 1 ELSE 0 END) as read_ops,
          SUM(CASE WHEN stmt LIKE 'INSERT%' OR stmt LIKE 'UPDATE%' OR stmt LIKE 'DELETE%' THEN 1 ELSE 0 END) as write_ops
        FROM sys.jobs_log
        WHERE ended > now() - interval '1 hour'
      `);

      if (result.rows && result.rows.length > 0) {
        const readOps = Number(result.rows[0][0]) || 0;
        const writeOps = Number(result.rows[0][1]) || 0;

        // Calculate ratio (handle division by zero)
        let ratio = '0:0';
        if (writeOps === 0 && readOps === 0) {
          ratio = '0:0';
        } else if (writeOps === 0) {
          ratio = `${readOps}:0`;
        } else {
          const ratioValue = (readOps / writeOps).toFixed(1);
          ratio = `${ratioValue}:1`;
        }

        setData({ readOps, writeOps, ratio });
      } else {
        setData({ readOps: 0, writeOps: 0, ratio: '0:0' });
      }
    } catch (err) {
      console.error('[useReadWriteRatio] Error fetching read/write ratio:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch read/write ratio');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client]); // Only depend on client, not fetchData to avoid infinite loop

  return { data, loading, error, refetch: fetchData };
}
