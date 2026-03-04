'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Loader2, Table, Key } from 'lucide-react';
import { VectorCollection } from '@/app/hooks/useVectorCollections';
import { useMonkDBClient } from '@/app/lib/monkdb-context';

interface SchemaColumn {
  name: string;
  type: string;
  isPK: boolean;
  isVector: boolean;
}

interface CollectionSchemaPanelProps {
  collection: VectorCollection;
}

export default function CollectionSchemaPanel({ collection }: CollectionSchemaPanelProps) {
  const client = useMonkDBClient();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ddl, setDdl] = useState('');
  const [columns, setColumns] = useState<SchemaColumn[]>([]);

  // Reset when collection changes
  useEffect(() => {
    setDdl('');
    setColumns([]);
    setOpen(false);
  }, [collection.schema, collection.table]);

  const load = async () => {
    if (!client) return;
    setLoading(true);
    try {
      // Get columns from information_schema
      const colResult = await client.query(
        `SELECT column_name, data_type
         FROM information_schema.columns
         WHERE table_schema = ? AND table_name = ?
         ORDER BY ordinal_position`,
        [collection.schema, collection.table]
      );

      // Detect PK columns
      let pkCols: string[] = [];
      try {
        const pkResult = await client.query(
          `SELECT kcu.column_name
           FROM information_schema.key_column_usage kcu
           JOIN information_schema.table_constraints tc
             ON kcu.constraint_name = tc.constraint_name
             AND kcu.table_schema = tc.table_schema
             AND kcu.table_name = tc.table_name
           WHERE tc.constraint_type = 'PRIMARY KEY'
             AND kcu.table_schema = ?
             AND kcu.table_name = ?`,
          [collection.schema, collection.table]
        );
        pkCols = pkResult.rows.map((r: unknown[]) => String(r[0]));
      } catch {
        /* PK detection is optional */
      }

      const cols: SchemaColumn[] = colResult.rows.map((row: unknown[]) => ({
        name: String(row[0]),
        type: String(row[1]),
        isPK: pkCols.includes(String(row[0])),
        isVector: String(row[1]).toLowerCase().includes('float_vector'),
      }));
      setColumns(cols);

      // Try SHOW CREATE TABLE (DDL)
      try {
        const ddlResult = await client.query(
          `SHOW CREATE TABLE "${collection.schema}"."${collection.table}"`
        );
        if (ddlResult.rows.length > 0) {
          // MonkDB returns [table_name, ddl_text] or just [ddl_text]
          const row = ddlResult.rows[0] as unknown[];
          setDdl(String(row[row.length - 1] ?? ''));
        }
      } catch {
        /* DDL not critical — skip silently */
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next && columns.length === 0) load();
  };

  return (
    <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700">
      <button
        onClick={handleToggle}
        className="flex w-full items-center justify-between px-5 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Table className="h-3.5 w-3.5" />
          Schema Inspector
        </div>
        {loading
          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
          : open
            ? <ChevronUp className="h-3.5 w-3.5" />
            : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {open && !loading && (
        <div className="border-t border-gray-100 dark:border-gray-700/60 px-5 py-3 bg-gray-50/50 dark:bg-gray-800/40 space-y-3">
          {/* Column table */}
          {columns.length > 0 && (
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Columns ({columns.length})
              </p>
              <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full text-xs">
                  <thead className="bg-gray-100 dark:bg-gray-800">
                    <tr>
                      <th className="px-3 py-1.5 text-left font-semibold text-gray-600 dark:text-gray-400">Name</th>
                      <th className="px-3 py-1.5 text-left font-semibold text-gray-600 dark:text-gray-400">Type</th>
                      <th className="px-3 py-1.5 text-left font-semibold text-gray-600 dark:text-gray-400"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                    {columns.map((col) => (
                      <tr key={col.name} className="bg-white dark:bg-gray-900">
                        <td className="px-3 py-1.5 font-mono text-gray-800 dark:text-gray-200">{col.name}</td>
                        <td className="px-3 py-1.5 font-mono text-gray-500 dark:text-gray-400">{col.type}</td>
                        <td className="px-3 py-1.5">
                          <div className="flex items-center gap-1">
                            {col.isPK && (
                              <span className="inline-flex items-center gap-0.5 rounded bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                                <Key className="h-2.5 w-2.5" /> PK
                              </span>
                            )}
                            {col.isVector && (
                              <span className="inline-flex rounded bg-blue-100 dark:bg-blue-900/30 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:text-blue-300">
                                VECTOR
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* DDL */}
          {ddl && (
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">DDL</p>
              <pre className="rounded-lg bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-3 font-mono text-[10px] text-gray-700 dark:text-gray-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                {ddl}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
