'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Database,
  Table,
  Columns,
  Key,
  Search,
  Loader2,
  AlertCircle,
  FileText,
  BarChart3,
  Code2,
  Copy,
  Play,
  Eye,
  Filter,
  SortAsc,
  Hash,
  Calendar,
  HardDrive,
  Layers,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  Download,
} from 'lucide-react';
import { useSchemas, useTables, useTableColumns } from '../lib/monkdb-hooks';
import { useActiveConnection } from '../lib/monkdb-context';
import { useToast } from './ToastContext';
import type { ColumnMetadata } from '../lib/monkdb-client';
import dynamic from 'next/dynamic';

const TableExporter = dynamic(() => import('./TableExporter'), { ssr: false });
const TableInsertForm = dynamic(() => import('./table-crud/TableInsertForm'), { ssr: false });
const TableUpdateForm = dynamic(() => import('./table-crud/TableUpdateForm'), { ssr: false });
const TableQueryForm = dynamic(() => import('./table-crud/TableQueryForm'), { ssr: false });

interface SelectedTable {
  schema: string;
  name: string;
}

interface TableStats {
  rowCount: number;
  size: string;
  shards: number;
  replicas: number;
}

type ViewType = 'columns' | 'preview' | 'indexes' | 'details' | 'ddl' | 'insert-form' | 'update-form' | 'query-form';
type FilterType = 'all' | 'user' | 'system';

export default function SchemaViewer() {
  const activeConnection = useActiveConnection();
  const toast = useToast();
  const { data: schemas, loading: schemasLoading, error: schemasError, refetch: refetchSchemas } = useSchemas();
  const [expandedSchemas, setExpandedSchemas] = useState<Set<string>>(new Set());
  const [selectedTable, setSelectedTable] = useState<SelectedTable | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewType, setViewType] = useState<ViewType>('columns');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [tableStats, setTableStats] = useState<TableStats | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [previewSortConfig, setPreviewSortConfig] = useState<{col: string; dir: 'asc' | 'desc'} | null>(null);

  // Fetch tables for each schema
  const [schemaTableMap, setSchemaTableMap] = useState<Record<string, any[]>>({});
  const [loadingTables, setLoadingTables] = useState<Set<string>>(new Set());
  const [editColumnModal, setEditColumnModal] = useState<{open: boolean; column: ColumnMetadata | null}>({open: false, column: null});
  const [deleteColumnModal, setDeleteColumnModal] = useState<{open: boolean; column: ColumnMetadata | null}>({open: false, column: null});
  const [showExportModal, setShowExportModal] = useState(false);

  // Fetch table columns when a table is selected
  const { data: columns, loading: columnsLoading, error: columnsError } = useTableColumns(
    selectedTable?.schema || '',
    selectedTable?.name || ''
  );

  // Load tables for expanded schemas
  useEffect(() => {
    if (!activeConnection || !schemas) return;

    expandedSchemas.forEach(async (schema) => {
      if (schemaTableMap[schema]) return; // Already loaded

      setLoadingTables((prev) => new Set(prev).add(schema));

      try {
        const client = activeConnection.client;
        const tables = await client.getTables(schema);
        setSchemaTableMap((prev) => ({ ...prev, [schema]: tables }));
      } catch (error) {
        console.error(`Failed to load tables for schema ${schema}:`, error);
      } finally {
        setLoadingTables((prev) => {
          const newSet = new Set(prev);
          newSet.delete(schema);
          return newSet;
        });
      }
    });
  }, [expandedSchemas, activeConnection, schemas]);

  // Load table statistics
  useEffect(() => {
    if (!selectedTable || !activeConnection) return;

    const loadStats = async () => {
      setLoadingStats(true);
      try {
        const client = activeConnection.client;

        // Get row count and size from sys.shards (primary shards only)
        const shardsQuery = `
          SELECT
            SUM(num_docs) as row_count,
            SUM(size) as total_bytes
          FROM sys.shards
          WHERE schema_name = '${selectedTable.schema}'
            AND table_name = '${selectedTable.name}'
            AND "primary" = true
        `;

        const shardsResult = await client.query(shardsQuery);

        // Get shards and replicas from information_schema.tables
        const tableInfoQuery = `
          SELECT
            number_of_shards,
            number_of_replicas
          FROM information_schema.tables
          WHERE table_schema = '${selectedTable.schema}'
            AND table_name = '${selectedTable.name}'
        `;

        const tableInfoResult = await client.query(tableInfoQuery);

        if (shardsResult.rows && shardsResult.rows.length > 0) {
          const shardsRow = shardsResult.rows[0];
          const bytes = shardsRow[1] || 0;

          // Format size
          let size = '0 bytes';
          if (bytes >= 1099511627776) {
            size = `${(bytes / 1099511627776).toFixed(2)} TB`;
          } else if (bytes >= 1073741824) {
            size = `${(bytes / 1073741824).toFixed(2)} GB`;
          } else if (bytes >= 1048576) {
            size = `${(bytes / 1048576).toFixed(2)} MB`;
          } else if (bytes >= 1024) {
            size = `${(bytes / 1024).toFixed(2)} KB`;
          } else {
            size = `${bytes} bytes`;
          }

          const tableInfoRow = tableInfoResult.rows && tableInfoResult.rows.length > 0
            ? tableInfoResult.rows[0]
            : [0, 0];

          setTableStats({
            rowCount: shardsRow[0] || 0,
            size,
            shards: tableInfoRow[0] || 0,
            replicas: tableInfoRow[1] || 0,
          });
        }
      } catch (error) {
        console.error('Failed to load table stats:', error);
        setTableStats(null);
      } finally {
        setLoadingStats(false);
      }
    };

    loadStats();
  }, [selectedTable, activeConnection]);

  const toggleSchema = (schemaName: string) => {
    setExpandedSchemas((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(schemaName)) {
        newSet.delete(schemaName);
      } else {
        newSet.add(schemaName);
      }
      return newSet;
    });
  };

  const handleTableClick = (schema: string, tableName: string) => {
    setSelectedTable({ schema, name: tableName });
    setViewType('columns');
    setPreviewData(null);
  };

  const loadDataPreview = async () => {
    if (!selectedTable || !activeConnection) return;

    setLoadingPreview(true);
    try {
      const client = activeConnection.client;
      const query = `SELECT * FROM "${selectedTable.schema}"."${selectedTable.name}" LIMIT 50`;

      // Log SQL query to console
      console.log('[Preview Query]', query);

      const result = await client.query(query);
      setPreviewData(result);

      // Reset sort config when loading new data
      setPreviewSortConfig(null);

      // Show success toast with SQL query
      toast.success('Data Loaded', `Loaded ${result.rowcount} rows\nSQL: ${query}`);
    } catch (error) {
      console.error('Failed to load preview data:', error);
      toast.error('Preview Failed', 'Could not load sample data');
      setPreviewData(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handlePreviewSort = (colName: string) => {
    setPreviewSortConfig((prev) => {
      if (!prev || prev.col !== colName) {
        return { col: colName, dir: 'asc' };
      }
      if (prev.dir === 'asc') {
        return { col: colName, dir: 'desc' };
      }
      return null; // Clear sort
    });
  };

  // Sort preview data based on sort config
  const sortedPreviewData = useMemo(() => {
    if (!previewData || !previewData.rows || !previewSortConfig) {
      return previewData;
    }

    const colIndex = previewData.cols.indexOf(previewSortConfig.col);
    if (colIndex === -1) return previewData;

    const sortedRows = [...previewData.rows].sort((a, b) => {
      const aVal = a[colIndex];
      const bVal = b[colIndex];

      // Handle nulls - always put them at the end
      if (aVal === null && bVal === null) return 0;
      if (aVal === null) return 1;
      if (bVal === null) return -1;

      // Compare values
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return previewSortConfig.dir === 'asc' ? aVal - bVal : bVal - aVal;
      }

      const aStr = String(aVal);
      const bStr = String(bVal);
      return previewSortConfig.dir === 'asc'
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr);
    });

    return { ...previewData, rows: sortedRows };
  }, [previewData, previewSortConfig]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied', `${label} copied to clipboard`);
  };

  const generateSelectQuery = () => {
    if (!selectedTable) return;
    const query = `SELECT * FROM "${selectedTable.schema}"."${selectedTable.name}" LIMIT 100;`;
    copyToClipboard(query, 'SELECT query');
  };

  const generateInsertQuery = () => {
    if (!selectedTable || !columns) return;

    const columnNames = columns.map(col => col.column_name).join(', ');
    const valuePlaceholders = columns.map(col => {
      // Generate sample values based on data type
      if (col.data_type.includes('INT') || col.data_type.includes('BIGINT')) return '0';
      if (col.data_type.includes('DOUBLE') || col.data_type.includes('FLOAT')) return '0.0';
      if (col.data_type.includes('BOOLEAN')) return 'true';
      if (col.data_type.includes('TIMESTAMP')) return 'CURRENT_TIMESTAMP';
      if (col.data_type.includes('ARRAY')) return '[]';
      if (col.data_type.includes('OBJECT')) return '{}';
      return "''"; // Default to empty string for TEXT and others
    }).join(', ');

    const query = `INSERT INTO "${selectedTable.schema}"."${selectedTable.name}" (${columnNames})
VALUES (${valuePlaceholders});

-- Replace placeholders with actual values
-- To see changes immediately, run: REFRESH TABLE "${selectedTable.schema}"."${selectedTable.name}";`;

    copyToClipboard(query, 'INSERT query template');
  };

  const generateUpdateQuery = () => {
    if (!selectedTable || !columns) return;

    // Generate SET clause with sample values
    const setClause = columns
      .filter(col => !col.column_default || !col.column_default.includes('GENERATED'))
      .map(col => {
        if (col.data_type.includes('INT') || col.data_type.includes('BIGINT')) {
          return `  ${col.column_name} = 0`;
        } else if (col.data_type.includes('DOUBLE') || col.data_type.includes('FLOAT')) {
          return `  ${col.column_name} = 0.0`;
        } else if (col.data_type.includes('BOOLEAN')) {
          return `  ${col.column_name} = true`;
        } else if (col.data_type.includes('TIMESTAMP')) {
          return `  ${col.column_name} = CURRENT_TIMESTAMP`;
        } else if (col.data_type.includes('ARRAY')) {
          return `  ${col.column_name} = []`;
        } else if (col.data_type.includes('OBJECT')) {
          return `  ${col.column_name} = {}`;
        } else {
          return `  ${col.column_name} = ''`;
        }
      })
      .join(',\n');

    const primaryKeyCol = columns.find(col => col.column_default?.includes('PRIMARY KEY')) || columns[0];

    const query = `UPDATE "${selectedTable.schema}"."${selectedTable.name}"
SET
${setClause}
WHERE ${primaryKeyCol.column_name} = ?;

-- Replace ? with actual condition value
-- To see changes immediately, run: REFRESH TABLE "${selectedTable.schema}"."${selectedTable.name}";`;

    copyToClipboard(query, 'UPDATE query template');
  };

  const generateDeleteQuery = () => {
    if (!selectedTable || !columns) return;

    const primaryKeyCol = columns.find(col => col.column_default?.includes('PRIMARY KEY')) || columns[0];

    const query = `DELETE FROM "${selectedTable.schema}"."${selectedTable.name}"
WHERE ${primaryKeyCol.column_name} = ?;

-- Replace ? with actual condition value
-- WARNING: This will permanently delete data
-- To see changes immediately, run: REFRESH TABLE "${selectedTable.schema}"."${selectedTable.name}";`;

    copyToClipboard(query, 'DELETE query template');
  };

  const generateDDL = () => {
    if (!selectedTable || !columns) return;

    const columnDefs = columns.map(col => {
      let def = `  "${col.column_name}" ${col.data_type}`;
      if (col.is_nullable === 'NO') def += ' NOT NULL';
      if (col.column_default) def += ` DEFAULT ${col.column_default}`;
      return def;
    }).join(',\n');

    const ddl = `CREATE TABLE "${selectedTable.schema}"."${selectedTable.name}" (\n${columnDefs}\n);`;
    return ddl;
  };

  const filterSchemas = (schemaList: string[]) => {
    if (filterType === 'all') return schemaList;

    const systemSchemas = ['information_schema', 'sys', 'pg_catalog'];

    if (filterType === 'system') {
      return schemaList.filter(s => systemSchemas.includes(s) || s.startsWith('pg_'));
    } else {
      return schemaList.filter(s => !systemSchemas.includes(s) && !s.startsWith('pg_'));
    }
  };

  const filterTables = (tables: any[]) => {
    if (!searchTerm) return tables;
    return tables.filter((table) =>
      table.table_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  if (!activeConnection) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="max-w-md rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/50 p-12 text-center dark:border-gray-700 dark:bg-gray-800/50">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
            <Database className="h-10 w-10 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="mt-6 text-xl font-bold text-gray-900 dark:text-white">
            No Active Connection
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Please connect to a MonkDB database to browse schemas.
          </p>
          <a
            href="/connections"
            className="mt-6 inline-block rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            Manage Connections
          </a>
        </div>
      </div>
    );
  }

  const filteredSchemas = schemas ? filterSchemas(schemas) : [];

  return (
    <div className="flex h-full gap-4 p-4">
      {/* Left Panel - Tree View */}
      <div className="w-80 flex-shrink-0">
        <div className="flex h-full flex-col rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          {/* Header */}
          <div className="border-b border-gray-200 p-4 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                  Schema Explorer
                </h2>
              </div>
              <button
                onClick={() => refetchSchemas()}
                className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Refresh schemas"
              >
                <RefreshCw className="h-4 w-4 text-gray-500" />
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {activeConnection.name}
            </p>
          </div>

          {/* Search & Filter */}
          <div className="space-y-2 border-b border-gray-200 p-3 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search tables..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white py-1.5 pl-8 pr-3 text-xs transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex gap-1">
              <button
                onClick={() => setFilterType('all')}
                className={`flex-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
                  filterType === 'all'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterType('user')}
                className={`flex-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
                  filterType === 'user'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
                }`}
              >
                User
              </button>
              <button
                onClick={() => setFilterType('system')}
                className={`flex-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
                  filterType === 'system'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
                }`}
              >
                System
              </button>
            </div>
          </div>

          {/* Tree View */}
          <div className="flex-1 overflow-y-auto p-2">
            {schemasLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : schemasError ? (
              <div className="m-2 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-red-700 dark:bg-red-900/20 dark:text-red-400">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span className="text-xs">Failed to load schemas</span>
              </div>
            ) : filteredSchemas.length > 0 ? (
              <div className="space-y-0.5">
                {filteredSchemas.map((schema) => {
                  const tables = schemaTableMap[schema] || [];
                  const filteredTables = filterTables(tables);
                  const isLoading = loadingTables.has(schema);
                  const isExpanded = expandedSchemas.has(schema);
                  const isSystemSchema = ['information_schema', 'sys', 'pg_catalog'].includes(schema) || schema.startsWith('pg_');

                  if (searchTerm && filteredTables.length === 0 && !isExpanded) return null;

                  return (
                    <div key={schema}>
                      {/* Schema Node */}
                      <button
                        onClick={() => toggleSchema(schema)}
                        className="flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-xs font-medium transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-gray-500" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-gray-500" />
                        )}
                        <Layers className={`h-3.5 w-3.5 flex-shrink-0 ${
                          isSystemSchema
                            ? 'text-orange-600 dark:text-orange-400'
                            : 'text-purple-600 dark:text-purple-400'
                        }`} />
                        <span className="flex-1 truncate text-left text-gray-800 dark:text-gray-200">
                          {schema}
                        </span>
                        {isLoading ? (
                          <Loader2 className="h-3 w-3 flex-shrink-0 animate-spin text-gray-400" />
                        ) : tables.length > 0 ? (
                          <span className="flex-shrink-0 rounded-full bg-gray-200 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                            {filteredTables.length}
                          </span>
                        ) : null}
                      </button>

                      {/* Tables */}
                      {isExpanded && (
                        <div className="ml-3 mt-0.5 space-y-0.5 border-l-2 border-gray-200 pl-2 dark:border-gray-700">
                          {filteredTables.length > 0 ? (
                            filteredTables.map((table) => {
                              const isSelected =
                                selectedTable?.schema === schema && selectedTable?.name === table.table_name;

                              return (
                                <button
                                  key={`${schema}.${table.table_name}`}
                                  onClick={() => handleTableClick(schema, table.table_name)}
                                  className={`flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-xs transition-colors ${
                                    isSelected
                                      ? 'bg-blue-50 font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                                  }`}
                                >
                                  <Table className={`h-3.5 w-3.5 flex-shrink-0 ${
                                    isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-green-600 dark:text-green-400'
                                  }`} />
                                  <span className="flex-1 truncate text-left">{table.table_name}</span>
                                </button>
                              );
                            })
                          ) : isLoading ? (
                            <div className="flex items-center justify-center py-2">
                              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                            </div>
                          ) : (
                            <div className="px-2 py-2 text-[10px] text-gray-500 dark:text-gray-400">
                              No tables
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-gray-500 dark:text-gray-400">
                {filterType === 'user' ? 'No user schemas found' : 'No schemas found'}
              </div>
            )}
          </div>

          {/* Footer Stats */}
          {schemas && (
            <div className="border-t border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-900">
              <div className="flex items-center justify-between text-[10px] text-gray-600 dark:text-gray-400">
                <span>{filteredSchemas.length} schemas</span>
                {selectedTable && <span className="text-blue-600 dark:text-blue-400">Table selected</span>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Table Details */}
      <div className="flex-1 overflow-hidden">
        {selectedTable ? (
          <div className="flex h-full flex-col rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            {/* Header */}
            <div className="border-b border-gray-200 p-4 dark:border-gray-700">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Table className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                      {selectedTable.schema}<span className="text-gray-400">.</span>{selectedTable.name}
                    </h2>
                  </div>

                  {/* Stats Row */}
                  <div className="mt-3 flex flex-wrap items-center gap-4">
                    {loadingStats ? (
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    ) : tableStats ? (
                      <>
                        <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                          <Hash className="h-3.5 w-3.5" />
                          <span className="font-medium">{tableStats.rowCount.toLocaleString()}</span>
                          <span>rows</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                          <HardDrive className="h-3.5 w-3.5" />
                          <span className="font-medium">{tableStats.size}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                          <Layers className="h-3.5 w-3.5" />
                          <span className="font-medium">{tableStats.shards}</span>
                          <span>shards</span>
                        </div>
                        {columns && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                            <Columns className="h-3.5 w-3.5" />
                            <span className="font-medium">{columns.length}</span>
                            <span>columns</span>
                          </div>
                        )}
                      </>
                    ) : null}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => copyToClipboard(`${selectedTable.schema}.${selectedTable.name}`, 'Table name')}
                    className="rounded-lg bg-gray-100 p-2 text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                    title="Copy table name"
                  >
                    <Copy className="h-4 w-4" />
                  </button>

                  {/* Export Button */}
                  <button
                    onClick={() => setShowExportModal(true)}
                    disabled={!previewData || !previewData.rows || previewData.rows.length === 0}
                    className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:opacity-50 dark:bg-purple-500 dark:hover:bg-purple-600"
                    title="Export table data"
                  >
                    <Download className="h-4 w-4" />
                    <span>EXPORT</span>
                  </button>

                  {/* CRUD Operations */}
                  <button
                    onClick={generateSelectQuery}
                    className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                    title="Generate SELECT query (Read)"
                  >
                    <Code2 className="h-4 w-4" />
                    <span>SELECT</span>
                  </button>
                  <button
                    onClick={generateInsertQuery}
                    className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
                    title="Generate INSERT query (Create)"
                  >
                    <Plus className="h-4 w-4" />
                    <span>INSERT</span>
                  </button>
                  <button
                    onClick={generateUpdateQuery}
                    className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600"
                    title="Generate UPDATE query (Update)"
                  >
                    <Edit className="h-4 w-4" />
                    <span>UPDATE</span>
                  </button>
                  <button
                    onClick={generateDeleteQuery}
                    className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
                    title="Generate DELETE query (Delete)"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>DELETE</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700">
              <div className="flex gap-1 px-4">
                <button
                  onClick={() => setViewType('columns')}
                  className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors ${
                    viewType === 'columns'
                      ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  <Columns className="h-4 w-4" />
                  Columns
                </button>
                <button
                  onClick={() => {
                    setViewType('preview');
                    if (!previewData) loadDataPreview();
                  }}
                  className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors ${
                    viewType === 'preview'
                      ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  <Eye className="h-4 w-4" />
                  Preview
                </button>
                <button
                  onClick={() => setViewType('details')}
                  className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors ${
                    viewType === 'details'
                      ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  <BarChart3 className="h-4 w-4" />
                  Details
                </button>
                <button
                  onClick={() => setViewType('ddl')}
                  className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors ${
                    viewType === 'ddl'
                      ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  <FileText className="h-4 w-4" />
                  DDL
                </button>
                <button
                  onClick={() => setViewType('query-form')}
                  className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors ${
                    viewType === 'query-form'
                      ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  <Search className="h-4 w-4" />
                  Query
                </button>
                <button
                  onClick={() => setViewType('insert-form')}
                  className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors ${
                    viewType === 'insert-form'
                      ? 'border-b-2 border-green-600 text-green-600 dark:text-green-400'
                      : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  <Plus className="h-4 w-4" />
                  Insert
                </button>
                <button
                  onClick={() => setViewType('update-form')}
                  className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors ${
                    viewType === 'update-form'
                      ? 'border-b-2 border-amber-600 text-amber-600 dark:text-amber-400'
                      : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  <Edit className="h-4 w-4" />
                  Update
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {viewType === 'columns' && (
                <>
                  {columnsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                    </div>
                  ) : columnsError ? (
                    <div className="flex items-center gap-2 rounded-lg bg-red-50 p-4 text-red-700 dark:bg-red-900/20 dark:text-red-400">
                      <AlertCircle className="h-5 w-5" />
                      <span className="text-sm">Failed to load columns</span>
                    </div>
                  ) : columns && columns.length > 0 ? (
                    <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                      <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-900">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-700 dark:text-gray-300">
                              #
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-700 dark:text-gray-300">
                              Column Name
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-700 dark:text-gray-300">
                              Data Type
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-700 dark:text-gray-300">
                              Nullable
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-700 dark:text-gray-300">
                              Default
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-bold uppercase text-gray-700 dark:text-gray-300">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                          {columns.map((col) => (
                            <tr key={col.ordinal_position} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                              <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                                {col.ordinal_position}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  {col.column_name === 'id' && <Key className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-400" />}
                                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                                    {col.column_name}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <code className="rounded bg-gray-100 px-2 py-1 text-xs font-mono text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                                  {col.data_type}
                                </code>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {col.is_nullable === 'YES' ? (
                                  <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    <span className="text-xs">YES</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
                                    <XCircle className="h-3.5 w-3.5" />
                                    <span className="text-xs">NO</span>
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                                {col.column_default ? (
                                  <code className="text-xs">{col.column_default}</code>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={() => setEditColumnModal({open: true, column: col})}
                                    className="rounded p-1.5 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                                    title="Edit column"
                                  >
                                    <Edit className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setDeleteColumnModal({open: true, column: col})}
                                    className="rounded p-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                    title="Delete column"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => copyToClipboard(col.column_name, 'Column name')}
                                    className="rounded p-1.5 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                                    title="Copy column name"
                                  >
                                    <Copy className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                      No columns found
                    </div>
                  )}
                </>
              )}

              {viewType === 'preview' && (
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Showing up to 50 sample rows
                      {previewSortConfig && (
                        <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">
                          (Sorted by {previewSortConfig.col} {previewSortConfig.dir === 'asc' ? '↑' : '↓'})
                        </span>
                      )}
                    </p>
                    <button
                      onClick={loadDataPreview}
                      disabled={loadingPreview}
                      className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${loadingPreview ? 'animate-spin' : ''}`} />
                      Refresh
                    </button>
                  </div>

                  {loadingPreview ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                    </div>
                  ) : sortedPreviewData && sortedPreviewData.rows && sortedPreviewData.rows.length > 0 ? (
                    <div className="overflow-auto rounded-lg border border-gray-200 dark:border-gray-700">
                      <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-900">
                          <tr>
                            {sortedPreviewData.cols.map((col: string, idx: number) => (
                              <th
                                key={idx}
                                onClick={() => handlePreviewSort(col)}
                                className="cursor-pointer select-none px-4 py-3 text-left text-xs font-bold uppercase text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                              >
                                <div className="flex items-center gap-1">
                                  {col}
                                  {previewSortConfig?.col === col && (
                                    <span className="text-blue-600 dark:text-blue-400">
                                      {previewSortConfig.dir === 'asc' ? '↑' : '↓'}
                                    </span>
                                  )}
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {sortedPreviewData.rows.map((row: any[], rowIdx: number) => (
                            <tr
                              key={rowIdx}
                              className={`hover:bg-gray-100 dark:hover:bg-gray-700/50 ${
                                rowIdx % 2 === 0
                                  ? 'bg-white dark:bg-gray-800'
                                  : 'bg-gray-50/50 dark:bg-gray-800/50'
                              }`}
                            >
                              {row.map((cell: any, cellIdx: number) => (
                                <td key={cellIdx} className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                                  {cell === null ? (
                                    <span className="italic text-gray-400">NULL</span>
                                  ) : typeof cell === 'object' ? (
                                    <code className="text-xs">{JSON.stringify(cell)}</code>
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
                  ) : (
                    <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 py-12 text-center dark:border-gray-600 dark:bg-gray-900">
                      <Eye className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="mt-3 text-sm font-medium text-gray-900 dark:text-white">
                        No preview data loaded
                      </p>
                      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                        Click Refresh to load sample data
                      </p>
                    </div>
                  )}
                </div>
              )}

              {viewType === 'details' && (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
                      <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                        <Hash className="h-4 w-4" />
                        <span className="text-sm font-medium">Total Rows</span>
                      </div>
                      <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                        {tableStats ? tableStats.rowCount.toLocaleString() : '-'}
                      </p>
                    </div>

                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
                      <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                        <HardDrive className="h-4 w-4" />
                        <span className="text-sm font-medium">Storage Size</span>
                      </div>
                      <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                        {tableStats ? tableStats.size : '-'}
                      </p>
                    </div>

                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
                      <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                        <Layers className="h-4 w-4" />
                        <span className="text-sm font-medium">Shards</span>
                      </div>
                      <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                        {tableStats ? tableStats.shards : '-'}
                      </p>
                    </div>

                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
                      <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                        <Columns className="h-4 w-4" />
                        <span className="text-sm font-medium">Columns</span>
                      </div>
                      <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                        {columns ? columns.length : '-'}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                    <h3 className="mb-3 text-sm font-bold text-gray-900 dark:text-white">
                      Table Information
                    </h3>
                    <dl className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <dt className="text-gray-600 dark:text-gray-400">Schema</dt>
                        <dd className="font-medium text-gray-900 dark:text-white">{selectedTable.schema}</dd>
                      </div>
                      <div className="flex justify-between text-sm">
                        <dt className="text-gray-600 dark:text-gray-400">Table Name</dt>
                        <dd className="font-medium text-gray-900 dark:text-white">{selectedTable.name}</dd>
                      </div>
                      <div className="flex justify-between text-sm">
                        <dt className="text-gray-600 dark:text-gray-400">Full Name</dt>
                        <dd className="font-mono text-xs text-gray-900 dark:text-white">
                          {selectedTable.schema}.{selectedTable.name}
                        </dd>
                      </div>
                      {tableStats && (
                        <div className="flex justify-between text-sm">
                          <dt className="text-gray-600 dark:text-gray-400">Replicas</dt>
                          <dd className="font-medium text-gray-900 dark:text-white">{tableStats.replicas}</dd>
                        </div>
                      )}
                    </dl>
                  </div>
                </div>
              )}

              {viewType === 'ddl' && (
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      CREATE TABLE statement
                    </p>
                    <button
                      onClick={() => {
                        const ddl = generateDDL();
                        if (ddl) copyToClipboard(ddl, 'DDL');
                      }}
                      className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </button>
                  </div>

                  <div className="rounded-lg border border-gray-200 bg-gray-900 p-4 dark:border-gray-700">
                    <pre className="overflow-x-auto text-sm text-green-400">
                      <code>{generateDDL()}</code>
                    </pre>
                  </div>
                </div>
              )}

              {viewType === 'insert-form' && selectedTable && columns && columns.length > 0 && (
                <TableInsertForm
                  schema={selectedTable.schema}
                  tableName={selectedTable.name}
                  columns={columns}
                  onClose={() => setViewType('columns')}
                  onSuccess={() => {
                    setViewType('preview');
                    if (previewData) loadDataPreview();
                  }}
                />
              )}

              {viewType === 'update-form' && selectedTable && columns && columns.length > 0 && (
                <TableUpdateForm
                  schema={selectedTable.schema}
                  tableName={selectedTable.name}
                  columns={columns}
                  onClose={() => setViewType('columns')}
                  onSuccess={() => {
                    setViewType('preview');
                    if (previewData) loadDataPreview();
                  }}
                />
              )}

              {viewType === 'query-form' && selectedTable && columns && columns.length > 0 && (
                <TableQueryForm
                  schema={selectedTable.schema}
                  tableName={selectedTable.name}
                  columns={columns}
                  onClose={() => setViewType('columns')}
                />
              )}
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50/50 dark:border-gray-700 dark:bg-gray-800/50">
            <div className="px-6 py-12 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                <Table className="h-10 w-10 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="mt-6 text-xl font-bold text-gray-900 dark:text-white">
                No Table Selected
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Select a table from the schema explorer to view details
              </p>
            </div>
          </div>
        )}

        {/* Edit Column Modal */}
        {editColumnModal.open && editColumnModal.column && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-xl bg-white shadow-2xl dark:bg-gray-800">
              <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Edit Column</h3>
                <button
                  onClick={() => setEditColumnModal({open: false, column: null})}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Current Column Name
                    </label>
                    <input
                      type="text"
                      value={editColumnModal.column.column_name}
                      disabled
                      className="w-full rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      New Column Name
                    </label>
                    <input
                      type="text"
                      id="new-column-name"
                      placeholder="Enter new column name"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-900/20">
                    <p className="text-xs text-yellow-700 dark:text-yellow-400">
                      <strong>Note:</strong> Column renaming in CrateDB requires recreating the table. Consider the impact on your application.
                    </p>
                  </div>
                </div>
                <div className="mt-6 flex gap-2">
                  <button
                    onClick={() => setEditColumnModal({open: false, column: null})}
                    className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      const newName = (document.getElementById('new-column-name') as HTMLInputElement)?.value;
                      if (newName && editColumnModal.column && newName !== editColumnModal.column.column_name) {
                        const sql = `ALTER TABLE "${selectedTable?.schema}"."${selectedTable?.name}" RENAME COLUMN "${editColumnModal.column.column_name}" TO "${newName}"`;
                        copyToClipboard(sql, 'ALTER TABLE SQL');
                        toast.success('SQL Copied', 'Execute this SQL in the Query Editor to rename the column');
                      }
                      setEditColumnModal({open: false, column: null});
                    }}
                    className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                  >
                    Copy SQL
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Column Modal */}
        {deleteColumnModal.open && deleteColumnModal.column && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-xl bg-white shadow-2xl dark:bg-gray-800">
              <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                <h3 className="text-lg font-bold text-red-600 dark:text-red-400">Delete Column</h3>
                <button
                  onClick={() => setDeleteColumnModal({open: false, column: null})}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-red-900 dark:text-red-100">
                        Destructive Operation
                      </p>
                      <p className="mt-1 text-xs text-red-700 dark:text-red-300">
                        Deleting a column will permanently remove all data in that column. This action cannot be undone.
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Column to Delete
                    </label>
                    <div className="rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 dark:border-gray-600 dark:bg-gray-700">
                      <code className="text-sm font-mono text-gray-900 dark:text-white">
                        {deleteColumnModal.column.column_name}
                      </code>
                      <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                        ({deleteColumnModal.column.data_type})
                      </span>
                    </div>
                  </div>
                  <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-900/20">
                    <p className="text-xs text-yellow-700 dark:text-yellow-400">
                      <strong>Note:</strong> In CrateDB, ALTER TABLE DROP COLUMN may have limitations. Verify compatibility before executing.
                    </p>
                  </div>
                </div>
                <div className="mt-6 flex gap-2">
                  <button
                    onClick={() => setDeleteColumnModal({open: false, column: null})}
                    className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      const sql = `ALTER TABLE "${selectedTable?.schema}"."${selectedTable?.name}" DROP COLUMN "${deleteColumnModal.column?.column_name}"`;
                      copyToClipboard(sql, 'DROP COLUMN SQL');
                      toast.success('SQL Copied', 'Execute this SQL in the Query Editor to delete the column');
                      setDeleteColumnModal({open: false, column: null});
                    }}
                    className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
                  >
                    Copy SQL
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Export Modal */}
        {showExportModal && previewData && previewData.rows && selectedTable && (
          <TableExporter
            schema={selectedTable.schema}
            tableName={selectedTable.name}
            columns={previewData.cols}
            rows={previewData.rows}
            onClose={() => setShowExportModal(false)}
          />
        )}
      </div>
    </div>
  );
}
