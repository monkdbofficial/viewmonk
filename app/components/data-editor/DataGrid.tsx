'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Save,
  Plus,
  Trash2,
  X,
  Check,
  Edit3,
  RefreshCw,
  AlertCircle,
  Download,
  Upload
} from 'lucide-react';
import { useActiveConnection } from '../../lib/monkdb-context';
import { useToast } from '../ToastContext';

interface Column {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string;
  isPrimaryKey: boolean;
}

interface DataGridProps {
  schema: string;
  table: string;
  onClose?: () => void;
}

interface CellEdit {
  rowIndex: number;
  columnName: string;
  value: any;
}

interface RowChange {
  type: 'insert' | 'update' | 'delete';
  rowIndex: number;
  data?: Record<string, any>;
  originalData?: Record<string, any>;
}

export default function DataGrid({ schema, table, onClose }: DataGridProps) {
  const activeConnection = useActiveConnection();
  const { success, error: showError } = useToast();

  const [columns, setColumns] = useState<Column[]>([]);
  const [rows, setRows] = useState<any[][]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [changes, setChanges] = useState<Map<number, RowChange>>(new Map());
  const [newRows, setNewRows] = useState<Map<number, Record<string, any>>>(new Map());
  const [deletedRows, setDeletedRows] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [totalRows, setTotalRows] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchColumns();
  }, [schema, table]);

  useEffect(() => {
    if (columns.length > 0) {
      fetchData();
    }
  }, [columns.length, page, pageSize]);

  const fetchColumns = async () => {
    if (!activeConnection) return;

    try {
      const result = await activeConnection.client.query(`
        SELECT
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_schema = ?
          AND table_name = ?
        ORDER BY ordinal_position
      `, [schema, table]);

      // Get primary key information
      const pkResult = await activeConnection.client.query(`
        SELECT column_name
        FROM information_schema.key_column_usage
        WHERE table_schema = ?
          AND table_name = ?
          AND constraint_name LIKE '%_pkey'
      `, [schema, table]);

      const pkColumns = new Set(pkResult.rows.map((row: any[]) => row[0]));

      const columnList: Column[] = result.rows.map((row: any[]) => ({
        name: row[0],
        type: row[1],
        nullable: row[2] === 'YES',
        defaultValue: row[3],
        isPrimaryKey: pkColumns.has(row[0])
      }));

      setColumns(columnList);
    } catch (err: any) {
      console.error('Failed to fetch columns:', err);
      showError('Failed to Load Columns', err.message);
    }
  };

  const fetchData = async () => {
    if (!activeConnection) return;

    setLoading(true);
    try {
      // Get total count
      const countResult = await activeConnection.client.query(
        `SELECT COUNT(*) FROM ${schema}.${table}`
      );
      setTotalRows(countResult.rows[0][0]);

      // Get data for current page
      const offset = page * pageSize;
      const result = await activeConnection.client.query(
        `SELECT * FROM ${schema}.${table} LIMIT ${pageSize} OFFSET ${offset}`
      );

      setRows(result.rows);
    } catch (err: any) {
      console.error('Failed to fetch data:', err);
      showError('Failed to Load Data', err.message);
      setTotalRows(0);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCellClick = (rowIndex: number, colIndex: number) => {
    if (!deletedRows.has(rowIndex)) {
      setEditingCell({ row: rowIndex, col: colIndex });
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
    const columnName = columns[colIndex].name;
    const newRows = [...rows];
    newRows[rowIndex][colIndex] = value;
    setRows(newRows);

    // Track change
    const changeKey = rowIndex;
    const existingChange = changes.get(changeKey);

    if (existingChange) {
      existingChange.data = existingChange.data || {};
      existingChange.data[columnName] = value;
    } else {
      const originalData: Record<string, any> = {};
      columns.forEach((col, idx) => {
        originalData[col.name] = rows[rowIndex][idx];
      });

      changes.set(changeKey, {
        type: 'update',
        rowIndex,
        data: { [columnName]: value },
        originalData
      });
    }

    setChanges(new Map(changes));
  };

  const handleCellBlur = () => {
    setEditingCell(null);
  };

  const handleAddRow = () => {
    const newRow = columns.map(col => col.defaultValue || null);
    const newIndex = rows.length;
    setRows([...rows, newRow]);

    const newRowData: Record<string, any> = {};
    columns.forEach((col, idx) => {
      newRowData[col.name] = newRow[idx];
    });

    newRows.set(newIndex, newRowData);
    setNewRows(new Map(newRows));
  };

  const handleDeleteRow = (rowIndex: number) => {
    deletedRows.add(rowIndex);
    setDeletedRows(new Set(deletedRows));

    // Track as delete change
    const originalData: Record<string, any> = {};
    columns.forEach((col, idx) => {
      originalData[col.name] = rows[rowIndex][idx];
    });

    changes.set(rowIndex, {
      type: 'delete',
      rowIndex,
      originalData
    });
    setChanges(new Map(changes));
  };

  const handleSaveChanges = async () => {
    if (!activeConnection) return;

    try {
      setLoading(true);

      // Process all changes
      for (const [index, change] of changes.entries()) {
        if (change.type === 'insert') {
          // Insert new row
          const columnNames = Object.keys(change.data || {});
          const values = Object.values(change.data || {});
          const placeholders = values.map(() => '?').join(', ');

          await activeConnection.client.query(
            `INSERT INTO ${schema}.${table} (${columnNames.join(', ')}) VALUES (${placeholders})`,
            values
          );
        } else if (change.type === 'update') {
          // Update existing row
          const setParts = Object.keys(change.data || {}).map(col => `${col} = ?`);
          const values = Object.values(change.data || {});

          // Build WHERE clause using primary keys
          const pkColumns = columns.filter(col => col.isPrimaryKey);
          const whereParts = pkColumns.map(col => `${col.name} = ?`);
          const whereValues = pkColumns.map(col => change.originalData?.[col.name]);

          await activeConnection.client.query(
            `UPDATE ${schema}.${table} SET ${setParts.join(', ')} WHERE ${whereParts.join(' AND ')}`,
            [...values, ...whereValues]
          );
        } else if (change.type === 'delete') {
          // Delete row
          const pkColumns = columns.filter(col => col.isPrimaryKey);
          const whereParts = pkColumns.map(col => `${col.name} = ?`);
          const whereValues = pkColumns.map(col => change.originalData?.[col.name]);

          await activeConnection.client.query(
            `DELETE FROM ${schema}.${table} WHERE ${whereParts.join(' AND ')}`,
            whereValues
          );
        }
      }

      success('Changes Saved', `Successfully saved ${changes.size} change(s)`);

      // Clear changes and refresh
      setChanges(new Map());
      setNewRows(new Map());
      setDeletedRows(new Set());
      fetchData();
    } catch (err: any) {
      console.error('Failed to save changes:', err);
      showError('Failed to Save Changes', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDiscardChanges = () => {
    setChanges(new Map());
    setNewRows(new Map());
    setDeletedRows(new Set());
    fetchData();
  };

  const formatCellValue = (value: any, column: Column): string => {
    if (value === null) return 'NULL';
    if (value === undefined) return '';

    const type = column.type.toLowerCase();

    if (type.includes('timestamp') || type.includes('date')) {
      return new Date(value).toLocaleString();
    }

    if (type.includes('json')) {
      return JSON.stringify(value);
    }

    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }

    return String(value);
  };

  const hasChanges = changes.size > 0;
  const totalPages = Math.ceil(totalRows / pageSize);

  return (
    <div className="flex h-full flex-col bg-white dark:bg-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Data Editor
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {schema}.{table} • {totalRows} rows
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <>
              <span className="text-sm text-orange-600 dark:text-orange-400">
                {changes.size} unsaved change(s)
              </span>
              <button
                onClick={handleDiscardChanges}
                className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              >
                <X className="h-4 w-4" />
                Discard
              </button>
              <button
                onClick={handleSaveChanges}
                disabled={loading}
                className="flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                Save Changes
              </button>
            </>
          )}
          <button
            onClick={handleAddRow}
            className="flex items-center gap-2 rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/30"
          >
            <Plus className="h-4 w-4" />
            Add Row
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          )}
        </div>
      </div>

      {/* Data Grid */}
      <div className="flex-1 overflow-auto">
        {loading && rows.length === 0 && columns.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <RefreshCw className="mx-auto h-8 w-8 animate-spin text-blue-600" />
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading table data...</p>
            </div>
          </div>
        ) : rows.length === 0 && !loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="text-lg text-gray-600 dark:text-gray-400">No data in this table</p>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-500">
                Click "Add Row" to insert new data
              </p>
            </div>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead className="sticky top-0 bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="w-12 border-b border-r border-gray-200 p-2 text-center text-xs font-medium text-gray-600 dark:border-gray-700 dark:text-gray-400">
                  #
                </th>
                {columns.map((col, idx) => (
                  <th
                    key={idx}
                    className="border-b border-r border-gray-200 p-2 text-left text-xs font-medium text-gray-600 dark:border-gray-700 dark:text-gray-400"
                  >
                    <div className="flex items-center gap-1">
                      {col.isPrimaryKey && (
                        <span className="text-yellow-600" title="Primary Key">
                          🔑
                        </span>
                      )}
                      <span className="font-mono">{col.name}</span>
                      <span className="text-gray-400">({col.type})</span>
                      {!col.nullable && (
                        <span className="text-red-500" title="NOT NULL">
                          *
                        </span>
                      )}
                    </div>
                  </th>
                ))}
                <th className="w-16 border-b border-gray-200 p-2 text-center text-xs font-medium text-gray-600 dark:border-gray-700 dark:text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => {
                const isDeleted = deletedRows.has(rowIndex);
                const isNew = newRows.has(rowIndex);
                const hasRowChanges = changes.has(rowIndex);

                return (
                  <tr
                    key={rowIndex}
                    className={`${
                      isDeleted
                        ? 'bg-red-50 opacity-50 dark:bg-red-900/20'
                        : isNew
                        ? 'bg-green-50 dark:bg-green-900/20'
                        : hasRowChanges
                        ? 'bg-yellow-50 dark:bg-yellow-900/20'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <td className="border-b border-r border-gray-200 p-2 text-center text-xs text-gray-500 dark:border-gray-700">
                      {page * pageSize + rowIndex + 1}
                    </td>
                    {row.map((cell, colIndex) => {
                      const isEditing =
                        editingCell?.row === rowIndex && editingCell?.col === colIndex;

                      return (
                        <td
                          key={colIndex}
                          className="border-b border-r border-gray-200 p-0 dark:border-gray-700"
                          onClick={() => !isDeleted && handleCellClick(rowIndex, colIndex)}
                        >
                          {isEditing ? (
                            <input
                              ref={inputRef}
                              type="text"
                              value={cell === null ? '' : cell}
                              onChange={(e) =>
                                handleCellChange(rowIndex, colIndex, e.target.value)
                              }
                              onBlur={handleCellBlur}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleCellBlur();
                                if (e.key === 'Escape') {
                                  handleDiscardChanges();
                                  handleCellBlur();
                                }
                              }}
                              className="w-full border-2 border-blue-500 bg-white p-2 text-sm font-mono focus:outline-none dark:bg-gray-800 dark:text-white"
                            />
                          ) : (
                            <div
                              className={`cursor-pointer p-2 text-sm font-mono ${
                                cell === null
                                  ? 'italic text-gray-400'
                                  : 'text-gray-900 dark:text-white'
                              }`}
                            >
                              {formatCellValue(cell, columns[colIndex])}
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td className="border-b border-gray-200 p-2 text-center dark:border-gray-700">
                      <button
                        onClick={() => handleDeleteRow(rowIndex)}
                        disabled={isDeleted}
                        className="rounded p-1 text-red-600 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-red-900/30"
                        title="Delete row"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer with Pagination */}
      <div className="flex items-center justify-between border-t border-gray-200 p-4 dark:border-gray-700">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, totalRows)} of{' '}
          {totalRows} rows
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
          >
            Next
          </button>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(0);
            }}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1 text-sm font-medium text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
          >
            <option value={25}>25 rows</option>
            <option value={50}>50 rows</option>
            <option value={100}>100 rows</option>
            <option value={200}>200 rows</option>
          </select>
        </div>
      </div>
    </div>
  );
}
