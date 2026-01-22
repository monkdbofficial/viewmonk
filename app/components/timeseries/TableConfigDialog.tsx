'use client';

import { useState, useEffect } from 'react';
import { X, Database, Table as TableIcon, Calendar, CheckCircle, AlertCircle, Plus } from 'lucide-react';
import { useActiveConnection } from '../../lib/monkdb-context';
import CreateTableDialog from './CreateTableDialog';

export interface TableConfig {
  schemaName: string;
  tableName: string;
  timestampColumn: string;
  availableColumns: string[];
}

interface TableConfigDialogProps {
  currentConfig: TableConfig | null;
  onSave: (config: TableConfig) => void;
  onClose: () => void;
}

interface SchemaInfo {
  name: string;
  tables: string[];
}

export default function TableConfigDialog({ currentConfig, onSave, onClose }: TableConfigDialogProps) {
  const activeConnection = useActiveConnection();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateTable, setShowCreateTable] = useState(false);

  // Configuration state
  const [schemas, setSchemas] = useState<SchemaInfo[]>([]);
  const [selectedSchema, setSelectedSchema] = useState(currentConfig?.schemaName || '');
  const [selectedTable, setSelectedTable] = useState(currentConfig?.tableName || '');
  const [availableTables, setAvailableTables] = useState<string[]>([]);
  const [tableColumns, setTableColumns] = useState<string[]>([]);
  const [timestampColumn, setTimestampColumn] = useState(currentConfig?.timestampColumn || '');

  // Load schemas on mount
  useEffect(() => {
    loadSchemas();
  }, []);

  // Load tables when schema changes
  useEffect(() => {
    if (selectedSchema) {
      loadTables(selectedSchema);
    }
  }, [selectedSchema]);

  // Load columns when table changes
  useEffect(() => {
    if (selectedSchema && selectedTable) {
      loadTableColumns(selectedSchema, selectedTable);
    }
  }, [selectedSchema, selectedTable]);

  const loadSchemas = async () => {
    if (!activeConnection) return;

    setLoading(true);
    setError(null);

    try {
      const sql = `
        SELECT DISTINCT table_schema
        FROM information_schema.tables
        WHERE table_schema NOT IN ('sys', 'information_schema', 'pg_catalog')
        ORDER BY table_schema
      `;

      const result = await activeConnection.client.query(sql);

      if (result.rows) {
        const schemaNames = result.rows.map((row: any[]) => row[0] as string);
        const schemaInfos: SchemaInfo[] = schemaNames.map(name => ({ name, tables: [] }));
        setSchemas(schemaInfos);

        // If current schema exists, load its tables
        if (currentConfig && schemaNames.includes(currentConfig.schemaName)) {
          setSelectedSchema(currentConfig.schemaName);
        } else if (schemaNames.length > 0) {
          setSelectedSchema(schemaNames[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load schemas:', err);
      setError('Failed to load database schemas');
    } finally {
      setLoading(false);
    }
  };

  const loadTables = async (schemaName: string) => {
    if (!activeConnection) return;

    setLoading(true);
    setError(null);

    try {
      const sql = `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = '${schemaName}'
          AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `;

      const result = await activeConnection.client.query(sql);

      if (result.rows) {
        const tables = result.rows.map((row: any[]) => row[0] as string);
        setAvailableTables(tables);

        // If current table exists in this schema, select it
        if (currentConfig && tables.includes(currentConfig.tableName) && schemaName === currentConfig.schemaName) {
          setSelectedTable(currentConfig.tableName);
        } else if (tables.length > 0) {
          setSelectedTable(tables[0]);
        } else {
          setSelectedTable('');
        }
      }
    } catch (err) {
      console.error('Failed to load tables:', err);
      setError('Failed to load tables');
    } finally {
      setLoading(false);
    }
  };

  const loadTableColumns = async (schemaName: string, tableName: string) => {
    if (!activeConnection) return;

    setLoading(true);
    setError(null);

    try {
      const sql = `
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = '${schemaName}'
          AND table_name = '${tableName}'
        ORDER BY ordinal_position
      `;

      const result = await activeConnection.client.query(sql);

      if (result.rows) {
        const columns = result.rows.map((row: any[]) => row[0] as string);
        setTableColumns(columns);

        // Auto-detect timestamp column
        const timestampCandidates = result.rows.filter((row: any[]) => {
          const colName = row[0].toLowerCase();
          const dataType = row[1].toLowerCase();
          return (
            dataType.includes('timestamp') ||
            colName.includes('timestamp') ||
            colName.includes('time') ||
            colName === 'ts' ||
            colName === 'date'
          );
        });

        if (timestampCandidates.length > 0) {
          setTimestampColumn(timestampCandidates[0][0]);
        } else if (columns.length > 0) {
          setTimestampColumn(columns[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load table columns:', err);
      setError('Failed to load table columns');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!selectedSchema || !selectedTable || !timestampColumn) {
      setError('Please select schema, table, and timestamp column');
      return;
    }

    const newConfig: TableConfig = {
      schemaName: selectedSchema,
      tableName: selectedTable,
      timestampColumn: timestampColumn,
      availableColumns: tableColumns,
    };

    onSave(newConfig);
    onClose();
  };

  const handleTableCreated = (newTableName: string) => {
    // Refresh tables and select the new one
    setSelectedTable(newTableName);
    loadTables(selectedSchema);
    setShowCreateTable(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <Database className="w-6 h-6 text-blue-500" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Configure Time-Series Source
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Select the table and columns for time-series analysis
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Info Box - What This Does */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              What Happens After Configuration
            </h3>
            <div className="space-y-2 text-xs text-blue-800 dark:text-blue-200">
              <div className="flex items-start gap-2">
                <span className="font-bold min-w-[20px]">1️⃣</span>
                <span><strong>This step:</strong> Select your primary data source (one table with time-series data)</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold min-w-[20px]">2️⃣</span>
                <span><strong>Next step:</strong> Add unlimited metrics from ALL available columns using the Aggregation Builder</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold min-w-[20px]">3️⃣</span>
                <span><strong>Then:</strong> Create custom dashboards with multiple charts, different metrics, and various visualizations</span>
              </div>
              <div className="mt-3 pt-3 border-t border-blue-300 dark:border-blue-700">
                <strong>📊 You're not limited to one column!</strong> After selecting the table, you'll be able to visualize as many columns as you want in multiple ways.
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* Schema Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Database className="w-4 h-4 inline mr-2" />
              Schema
            </label>
            <select
              value={selectedSchema}
              onChange={(e) => setSelectedSchema(e.target.value)}
              className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            >
              <option value="">Select a schema...</option>
              {schemas.map((schema) => (
                <option key={schema.name} value={schema.name}>
                  {schema.name}
                </option>
              ))}
            </select>
          </div>

          {/* Table Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                <TableIcon className="w-4 h-4 inline mr-2" />
                Table
              </label>
              <button
                onClick={() => setShowCreateTable(true)}
                disabled={!selectedSchema}
                className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded transition-colors"
              >
                <Plus className="w-3 h-3" />
                Create New
              </button>
            </div>
            <select
              value={selectedTable}
              onChange={(e) => setSelectedTable(e.target.value)}
              className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading || !selectedSchema}
            >
              <option value="">Select a table...</option>
              {availableTables.map((table) => (
                <option key={table} value={table}>
                  {table}
                </option>
              ))}
            </select>
            {selectedSchema && availableTables.length === 0 && !loading && (
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                No tables found in schema "{selectedSchema}". Click "Create New" to create one.
              </p>
            )}
          </div>

          {/* Timestamp Column Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Calendar className="w-4 h-4 inline mr-2" />
              Timestamp Column
            </label>
            <select
              value={timestampColumn}
              onChange={(e) => setTimestampColumn(e.target.value)}
              className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading || !selectedTable}
            >
              <option value="">Select timestamp column...</option>
              {tableColumns.map((column) => (
                <option key={column} value={column}>
                  {column}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              This column will be used for time-based aggregations and filtering
            </p>
          </div>

          {/* Available Columns Info */}
          {tableColumns.length > 0 && (
            <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/10 dark:to-blue-900/10 border-2 border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  All Available Metrics ({tableColumns.length})
                </h3>
                <span className="text-xs font-medium text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full">
                  ✓ Ready to Use
                </span>
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                {tableColumns.map((column) => (
                  <span
                    key={column}
                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-700"
                  >
                    {column}
                  </span>
                ))}
              </div>
              <div className="bg-white/50 dark:bg-gray-800/50 rounded p-3 space-y-2 text-xs">
                <p className="font-medium text-gray-900 dark:text-white">
                  💡 After configuration, you can:
                </p>
                <ul className="space-y-1 text-gray-700 dark:text-gray-300 ml-4">
                  <li>• Use <strong>ANY combination</strong> of these columns in charts</li>
                  <li>• Add <strong>unlimited metrics</strong> with different aggregations (AVG, SUM, MIN, MAX)</li>
                  <li>• Create <strong>multiple dashboards</strong> with different visualizations</li>
                  <li>• Mix and match columns in <strong>7 chart types</strong> (line, bar, area, pie, scatter, gauge, table)</li>
                </ul>
              </div>
            </div>
          )}

          {/* Current Configuration Summary */}
          {selectedSchema && selectedTable && timestampColumn && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-green-900 dark:text-green-300 mb-2">
                    Configuration Ready
                  </h4>
                  <div className="text-xs text-green-800 dark:text-green-200 space-y-1">
                    <p><strong>Table:</strong> {selectedSchema}.{selectedTable}</p>
                    <p><strong>Timestamp:</strong> {timestampColumn}</p>
                    <p><strong>Columns:</strong> {tableColumns.length} available for analysis</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!selectedSchema || !selectedTable || !timestampColumn || loading}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2 group relative"
          >
            <CheckCircle className="w-4 h-4" />
            Apply & Continue to Metrics →
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-64 px-3 py-2 text-xs bg-gray-900 text-white rounded-lg shadow-lg z-50">
              Next: Add multiple metrics, create dashboards, and visualize your data!
            </span>
          </button>
        </div>
      </div>

      {/* Create Table Dialog */}
      {showCreateTable && (
        <CreateTableDialog
          schemaName={selectedSchema}
          onSuccess={handleTableCreated}
          onClose={() => setShowCreateTable(false)}
        />
      )}
    </div>
  );
}
