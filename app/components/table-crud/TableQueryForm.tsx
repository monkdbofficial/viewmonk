'use client';

import { useState } from 'react';
import { X, Search, Copy, Play } from 'lucide-react';
import { useActiveConnection } from '../../lib/monkdb-context';
import { useToast } from '../ToastContext';
import type { ColumnMetadata } from '../../lib/monkdb-client';

interface TableQueryFormProps {
  schema: string;
  tableName: string;
  columns: ColumnMetadata[];
  onClose: () => void;
  onExecute?: (sql: string) => void;
}

/**
 * Table Query Form Component
 *
 * Form-based query builder for creating SELECT queries.
 * - Column selection
 * - WHERE clause builder
 * - ORDER BY clause
 * - LIMIT clause
 * - SQL generation and execution
 */
export default function TableQueryForm({
  schema,
  tableName,
  columns,
  onClose,
  onExecute,
}: TableQueryFormProps) {
  const activeConnection = useActiveConnection();
  const toast = useToast();

  // Form state
  const [selectedColumns, setSelectedColumns] = useState<string[]>(['*']);
  const [whereClause, setWhereClause] = useState('');
  const [orderByColumn, setOrderByColumn] = useState('');
  const [orderDirection, setOrderDirection] = useState<'ASC' | 'DESC'>('ASC');
  const [limitValue, setLimitValue] = useState('100');

  // Results state
  const [queryResult, setQueryResult] = useState<any>(null);
  const [executing, setExecuting] = useState(false);

  /**
   * Toggle column selection
   */
  const toggleColumn = (columnName: string) => {
    if (columnName === '*') {
      setSelectedColumns(['*']);
      return;
    }

    setSelectedColumns((prev) => {
      // Remove '*' if selecting specific columns
      const filtered = prev.filter((col) => col !== '*');

      if (filtered.includes(columnName)) {
        const newCols = filtered.filter((col) => col !== columnName);
        return newCols.length === 0 ? ['*'] : newCols;
      } else {
        return [...filtered, columnName];
      }
    });
  };

  /**
   * Generate SQL query from form inputs
   */
  const generateSQL = (): string => {
    // SELECT clause
    const columnList =
      selectedColumns.includes('*') || selectedColumns.length === 0
        ? '*'
        : selectedColumns.map((col) => `"${col}"`).join(', ');

    let sql = `SELECT ${columnList}\nFROM "${schema}"."${tableName}"`;

    // WHERE clause
    if (whereClause.trim()) {
      sql += `\nWHERE ${whereClause.trim()}`;
    }

    // ORDER BY clause
    if (orderByColumn) {
      sql += `\nORDER BY "${orderByColumn}" ${orderDirection}`;
    }

    // LIMIT clause
    if (limitValue) {
      sql += `\nLIMIT ${limitValue}`;
    }

    return sql;
  };

  /**
   * Copy SQL to clipboard
   */
  const handleCopySQL = () => {
    const sql = generateSQL();
    navigator.clipboard.writeText(sql);
    toast.success('Copied', 'Query copied to clipboard');
  };

  /**
   * Execute the query
   */
  const handleExecute = async () => {
    if (!activeConnection) {
      toast.error('No Connection', 'No active database connection');
      return;
    }

    const sql = generateSQL();
    setExecuting(true);
    setQueryResult(null);

    try {
      const client = activeConnection.client;
      const result = await client.query(sql);

      setQueryResult(result);
      toast.success('Query Executed', `Retrieved ${result.rowcount || 0} rows`);

      // Call execute callback if provided
      if (onExecute) {
        onExecute(sql);
      }
    } catch (error) {
      console.error('Query execution failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Could not execute query';
      toast.error('Query Failed', errorMessage);
      setQueryResult(null);
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <Search className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Query Builder</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {schema}.{tableName}
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-6">
          {/* Left: Form Inputs */}
          <div className="space-y-6">
            {/* Column Selection */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Select Columns
              </label>
              <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedColumns.includes('*')}
                    onChange={() => toggleColumn('*')}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    * (All Columns)
                  </span>
                </label>
                {columns.map((column) => (
                  <label key={column.column_name} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={
                        !selectedColumns.includes('*') &&
                        selectedColumns.includes(column.column_name)
                      }
                      onChange={() => toggleColumn(column.column_name)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {column.column_name}
                      <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                        {column.data_type}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* WHERE Clause */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                WHERE Clause (Optional)
              </label>
              <textarea
                value={whereClause}
                onChange={(e) => setWhereClause(e.target.value)}
                placeholder='e.g., age > 25 AND city = "New York"'
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* ORDER BY */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                ORDER BY (Optional)
              </label>
              <div className="flex gap-2">
                <select
                  value={orderByColumn}
                  onChange={(e) => setOrderByColumn(e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">None</option>
                  {columns.map((column) => (
                    <option key={column.column_name} value={column.column_name}>
                      {column.column_name}
                    </option>
                  ))}
                </select>
                <select
                  value={orderDirection}
                  onChange={(e) => setOrderDirection(e.target.value as 'ASC' | 'DESC')}
                  disabled={!orderByColumn}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="ASC">ASC</option>
                  <option value="DESC">DESC</option>
                </select>
              </div>
            </div>

            {/* LIMIT */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                LIMIT
              </label>
              <input
                type="number"
                value={limitValue}
                onChange={(e) => setLimitValue(e.target.value)}
                min="1"
                placeholder="100"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* SQL Preview & Results */}
          <div className="space-y-6">
            {/* SQL Preview */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Generated SQL
                </label>
                <button
                  onClick={handleCopySQL}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                >
                  <Copy className="h-3 w-3" />
                  Copy
                </button>
              </div>
              <pre className="overflow-x-auto rounded-lg border border-gray-200 bg-gray-50 p-3 font-mono text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100">
                {generateSQL()}
              </pre>
            </div>

            {/* Query Results */}
            {queryResult && (
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Results ({queryResult.rowcount || 0} rows)
                </label>
                <div className="max-h-96 overflow-auto rounded-lg border border-gray-200 dark:border-gray-700">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-gray-50 dark:bg-gray-900">
                      <tr>
                        {queryResult.cols?.map((col: string, idx: number) => (
                          <th
                            key={idx}
                            className="px-3 py-2 text-left font-bold uppercase text-gray-700 dark:text-gray-300"
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {queryResult.rows?.map((row: any[], rowIdx: number) => (
                        <tr
                          key={rowIdx}
                          className="bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700/50"
                        >
                          {row.map((cell: any, cellIdx: number) => (
                            <td
                              key={cellIdx}
                              className="px-3 py-2 text-gray-700 dark:text-gray-300"
                            >
                              {cell === null ? (
                                <span className="italic text-gray-400">NULL</span>
                              ) : typeof cell === 'object' ? (
                                <code>{JSON.stringify(cell)}</code>
                              ) : (
                                String(cell)
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Close
          </button>
          <button
            onClick={handleExecute}
            disabled={executing || !activeConnection}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            <Play className="h-4 w-4" />
            {executing ? 'Executing...' : 'Execute Query'}
          </button>
        </div>
      </div>
    </div>
  );
}
