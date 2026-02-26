'use client';
import { useState, useEffect, useCallback } from 'react';
import { useMonkDBClient } from '@/app/lib/monkdb-context';
import type { TimeseriesTable, ColumnInfo } from '@/app/lib/timeseries/types';

const TIMESTAMP_TYPES = ['timestamp with time zone', 'timestamp without time zone', 'timestamp'];
const NUMERIC_TYPES   = ['real', 'double precision', 'float', 'integer', 'long', 'short', 'byte', 'numeric'];
const TEXT_TYPES      = ['text', 'character varying', 'varchar', 'char', 'string'];

export function useTimeseriesTables() {
  const client = useMonkDBClient();
  const [tables, setTables]   = useState<TimeseriesTable[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!client) return;
    setLoading(true);
    setError(null);
    try {
      // Get all user tables
      const tablesResult = await client.query(
        `SELECT table_schema, table_name FROM information_schema.tables
         WHERE table_schema NOT IN ('information_schema','sys','pg_catalog','blob')
         ORDER BY table_schema, table_name`,
      );

      // Get all columns for those tables
      const colsResult = await client.query(
        `SELECT table_schema, table_name, column_name, data_type
         FROM information_schema.columns
         WHERE table_schema NOT IN ('information_schema','sys','pg_catalog','blob')
         ORDER BY table_schema, table_name, ordinal_position`,
      );

      // Index columns by table key
      const colMap: Record<string, { name: string; type: string }[]> = {};
      for (const row of colsResult.rows) {
        const key = `${row[0]}.${row[1]}`;
        if (!colMap[key]) colMap[key] = [];
        colMap[key].push({ name: row[2] as string, type: (row[3] as string).toLowerCase() });
      }

      // Build TimeseriesTable list — only tables that have at least 1 timestamp column
      const result: TimeseriesTable[] = [];
      for (const row of tablesResult.rows) {
        const schema = row[0] as string;
        const table  = row[1] as string;
        const key    = `${schema}.${table}`;
        const cols   = colMap[key] ?? [];

        const tsCols      = cols.filter((c) => TIMESTAMP_TYPES.includes(c.type));
        const numericCols = cols.filter((c) => NUMERIC_TYPES.some((t) => c.type.includes(t)));
        const textCols    = cols.filter((c) => TEXT_TYPES.some((t) => c.type.includes(t)));

        if (tsCols.length > 0) {
          result.push({
            schema,
            table,
            timestampCols: tsCols.map((c) => c.name),
            numericCols:   numericCols as ColumnInfo[],
            textCols:      textCols as ColumnInfo[],
          });
        }
      }
      setTables(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tables');
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => { load(); }, [load]);

  return { tables, loading, error, refresh: load };
}
