'use client';

import { useState, useEffect, useCallback } from 'react';
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
    if (!client || (options?.enabled === false)) {
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
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Hook for fetching cluster nodes
 */
export function useNodes(): UseQueryResult<NodeInfo[]> {
  const client = useMonkDBClient();
  const [data, setData] = useState<NodeInfo[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!client) return;

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
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Hook for fetching cluster uptime
 */
export function useClusterUptime(): UseQueryResult<number> {
  const client = useMonkDBClient();
  const [data, setData] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!client) return;

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
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Hook for fetching tables in a schema
 */
export function useTables(schemaName: string = 'doc'): UseQueryResult<TableMetadata[]> {
  const client = useMonkDBClient();
  const [data, setData] = useState<TableMetadata[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!client) return;

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
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Hook for fetching all schemas
 */
export function useSchemas(): UseQueryResult<string[]> {
  const client = useMonkDBClient();
  const [data, setData] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!client) return;

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
    }
  }, [client]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Hook for fetching table columns
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
    if (!client || !schemaName || !tableName) return;

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
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Hook for fetching complete table tree
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
    if (!client || !schemaName || !tableName) return;

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
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Hook for fetching database statistics
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
    if (!client) return;

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
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Hook for fetching cluster health
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
    if (!client) return;

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
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
