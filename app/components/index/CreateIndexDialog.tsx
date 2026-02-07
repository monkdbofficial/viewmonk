'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Info, AlertCircle, Check } from 'lucide-react';
import { useActiveConnection } from '../../lib/monkdb-context';
import { useSchemaMetadata } from '../../lib/hooks/useSchemaMetadata';
import { useToast } from '../ToastContext';

interface CreateIndexDialogProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface TableInfo {
  schema: string;
  name: string;
}

interface ColumnInfo {
  name: string;
  type: string;
}

export default function CreateIndexDialog({ onClose, onSuccess }: CreateIndexDialogProps) {
  const activeConnection = useActiveConnection();
  const { success, error: showError } = useToast();

  const [schemas, setSchemas] = useState<string[]>([]);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [columns, setColumns] = useState<ColumnInfo[]>([]);

  const [selectedSchemaValue, setSelectedSchemaValue] = useState('');
  const [selectedTable, setSelectedTable] = useState('');
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [indexName, setIndexName] = useState('');
  const [indexMethod, setIndexMethod] = useState<'btree' | 'hash' | 'gist' | 'gin'>('btree');
  const [isUnique, setIsUnique] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSchemas();
  }, []);

  useEffect(() => {
    if (selectedSchemaValue) {
      fetchTables();
    }
  }, [selectedSchemaValue]);

  useEffect(() => {
    if (selectedTable) {
      fetchColumns();
    }
  }, [selectedTable]);

  useEffect(() => {
    // Auto-generate index name
    if (selectedTable && selectedColumns.length > 0) {
      const tablePart = selectedTable.substring(0, 20);
      const columnPart = selectedColumns[0].substring(0, 10);
      const methodPart = indexMethod === 'btree' ? 'idx' : indexMethod;
      setIndexName(`${tablePart}_${columnPart}_${methodPart}`);
    }
  }, [selectedTable, selectedColumns, indexMethod]);

  const fetchSchemas = async () => {
    if (!activeConnection) return;

    try {
      const result = await activeConnection.client.query(`
        SELECT schema_name
        FROM information_schema.schemata
        WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'sys')
        ORDER BY schema_name
      `);

      const schemaList = result.rows.map((row: any[]) => row[0]);
      setSchemas(schemaList);

      if (!selectedSchemaValue && schemaList.length > 0) {
        setSelectedSchemaValue(schemaList[0]);
      }
    } catch (err) {
      console.error('Failed to fetch schemas:', err);
    }
  };

  const fetchTables = async () => {
    if (!activeConnection || !selectedSchemaValue) return;

    try {
      const result = await activeConnection.client.query(`
        SELECT table_schema, table_name
        FROM information_schema.tables
        WHERE table_schema = '${selectedSchemaValue}'
          AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `);

      const tableList = result.rows.map((row: any[]) => ({
        schema: row[0],
        name: row[1]
      }));
      setTables(tableList);
    } catch (err) {
      console.error('Failed to fetch tables:', err);
    }
  };

  const fetchColumns = async () => {
    if (!activeConnection || !selectedSchemaValue || !selectedTable) return;

    try {
      const result = await activeConnection.client.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = '${selectedSchemaValue}'
          AND table_name = '${selectedTable}'
        ORDER BY ordinal_position
      `);

      const columnList = result.rows.map((row: any[]) => ({
        name: row[0],
        type: row[1]
      }));
      setColumns(columnList);
    } catch (err) {
      console.error('Failed to fetch columns:', err);
    }
  };

  const toggleColumn = (columnName: string) => {
    setSelectedColumns(prev =>
      prev.includes(columnName)
        ? prev.filter(c => c !== columnName)
        : [...prev, columnName]
    );
  };

  const handleCreate = async () => {
    setError('');

    // Validation
    if (!selectedSchemaValue || !selectedTable) {
      setError('Please select a schema and table');
      return;
    }

    if (selectedColumns.length === 0) {
      setError('Please select at least one column');
      return;
    }

    if (!indexName.trim()) {
      setError('Please provide an index name');
      return;
    }

    // Validate index name
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(indexName)) {
      setError('Index name must start with a letter or underscore and contain only letters, numbers, and underscores');
      return;
    }

    setLoading(true);

    try {
      const uniqueClause = isUnique ? 'UNIQUE ' : '';
      const columnList = selectedColumns.join(', ');
      const methodClause = indexMethod !== 'btree' ? ` USING ${indexMethod}` : '';

      const sql = `CREATE ${uniqueClause}INDEX ${indexName} ON ${selectedSchemaValue}.${selectedTable}${methodClause} (${columnList})`;

      await activeConnection?.client.query(sql);

      success('Index Created', `Successfully created index ${indexName}`);
      onSuccess();
    } catch (err: any) {
      console.error('Failed to create index:', err);
      setError(err.message || 'Failed to create index');
      showError('Failed to Create Index', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Create New Index
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[calc(100vh-200px)] overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
              </div>
            )}

            {/* Schema Selection */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Schema <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedSchemaValue}
                onChange={(e) => {
                  setSelectedSchemaValue(e.target.value);
                  setSelectedTable('');
                  setSelectedColumns([]);
                }}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Select Schema</option>
                {schemas.map(schema => (
                  <option key={schema} value={schema}>
                    {schema}
                  </option>
                ))}
              </select>
            </div>

            {/* Table Selection */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Table <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedTable}
                onChange={(e) => {
                  setSelectedTable(e.target.value);
                  setSelectedColumns([]);
                }}
                disabled={!selectedSchemaValue}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Select Table</option>
                {tables.map(table => (
                  <option key={table.name} value={table.name}>
                    {table.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Column Selection */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Columns <span className="text-red-500">*</span>
              </label>
              {!selectedTable ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Select a table first
                </p>
              ) : columns.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No columns found
                </p>
              ) : (
                <div className="space-y-2 rounded-lg border border-gray-300 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-900/50">
                  {columns.map(col => (
                    <label
                      key={col.name}
                      className="flex items-center gap-3 rounded-lg p-2 hover:bg-white dark:hover:bg-gray-800"
                    >
                      <input
                        type="checkbox"
                        checked={selectedColumns.includes(col.name)}
                        onChange={() => toggleColumn(col.name)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500/20"
                      />
                      <div className="flex-1">
                        <span className="font-mono text-sm font-medium text-gray-900 dark:text-white">
                          {col.name}
                        </span>
                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                          ({col.type})
                        </span>
                      </div>
                      {selectedColumns.includes(col.name) && (
                        <Check className="h-4 w-4 text-green-600" />
                      )}
                    </label>
                  ))}
                </div>
              )}
              {selectedColumns.length > 0 && (
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Selected: {selectedColumns.join(', ')}
                </p>
              )}
            </div>

            {/* Index Name */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Index Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={indexName}
                onChange={(e) => setIndexName(e.target.value)}
                placeholder="e.g., users_email_idx"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Must start with a letter or underscore
              </p>
            </div>

            {/* Index Method */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Index Method
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'btree', label: 'B-Tree', desc: 'Default, best for most queries' },
                  { value: 'hash', label: 'Hash', desc: 'Fast equality lookups only' },
                  { value: 'gist', label: 'GiST', desc: 'Geometric and full-text' },
                  { value: 'gin', label: 'GIN', desc: 'Arrays and JSONB' }
                ].map(method => (
                  <label
                    key={method.value}
                    className={`cursor-pointer rounded-lg border-2 p-3 transition-all ${
                      indexMethod === method.value
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-300 bg-white hover:border-gray-400 dark:border-gray-600 dark:bg-gray-800'
                    }`}
                  >
                    <input
                      type="radio"
                      name="indexMethod"
                      value={method.value}
                      checked={indexMethod === method.value}
                      onChange={(e) => setIndexMethod(e.target.value as any)}
                      className="sr-only"
                    />
                    <div className="flex items-start gap-2">
                      <div className={`mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                        indexMethod === method.value
                          ? 'border-blue-600'
                          : 'border-gray-300'
                      }`}>
                        {indexMethod === method.value && (
                          <div className="h-2 w-2 rounded-full bg-blue-600" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {method.label}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {method.desc}
                        </p>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Unique Constraint */}
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isUnique}
                  onChange={(e) => setIsUnique(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500/20"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Create as UNIQUE index
                </span>
              </label>
              <p className="ml-6 mt-1 text-xs text-gray-500 dark:text-gray-400">
                Ensures all values in the indexed columns are unique
              </p>
            </div>

            {/* Info Box */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
              <div className="flex items-start gap-2">
                <Info className="h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <p className="font-semibold mb-1">Index Best Practices:</p>
                  <ul className="list-inside list-disc space-y-1">
                    <li>Index columns used in WHERE, JOIN, and ORDER BY</li>
                    <li>B-Tree is the default and works for most cases</li>
                    <li>Multi-column indexes: put most selective column first</li>
                    <li>Too many indexes can slow down INSERT/UPDATE</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-200 p-4 dark:border-gray-700">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={loading || !selectedTable || selectedColumns.length === 0}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Create Index
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
