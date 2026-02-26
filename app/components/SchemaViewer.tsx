'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
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
import { useTables, useTableColumns } from '../lib/monkdb-hooks';
import { useActiveConnection } from '../lib/monkdb-context';
import { useToast } from './ToastContext';
import { usePermissions } from '../hooks/usePermissions';
import { useAccessibleSchemas } from '../hooks/useAccessibleSchemas';
import { useSchema } from '../contexts/schema-context';
import { useSavedViews } from '../lib/saved-views-context';
import PermissionBadge from './common/PermissionBadge';
import type { ColumnMetadata } from '../lib/monkdb-client';
import dynamic from 'next/dynamic';

const TableExporter = dynamic(() => import('./TableExporter'), { ssr: false });
const TableInsertForm = dynamic(() => import('./table-crud/TableInsertForm'), { ssr: false });
const TableUpdateForm = dynamic(() => import('./table-crud/TableUpdateForm'), { ssr: false });
const TableQueryForm = dynamic(() => import('./table-crud/TableQueryForm'), { ssr: false });
const TableDeleteForm = dynamic(() => import('./table-crud/TableDeleteForm'), { ssr: false });
const TableImportForm = dynamic(() => import('./table-crud/TableImportForm'), { ssr: false });

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

type ViewType = 'columns' | 'preview' | 'indexes' | 'details' | 'ddl' | 'query-form' | 'insert-form' | 'update-form' | 'delete-form' | 'import-form';
type FilterType = 'all' | 'user' | 'system';

export default function SchemaViewer() {
  const activeConnection = useActiveConnection();
  const toast = useToast();
  const { canWrite, canDelete, canCreate, role } = usePermissions();
  const { schemas, loading: schemasLoading, error: schemasError } = useAccessibleSchemas();
  const { activeSchema } = useSchema();
  const { addRecentTable } = useSavedViews();
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
  const [previewPage, setPreviewPage] = useState(1);
  const [previewPageSize, setPreviewPageSize] = useState(50);
  const [previewPageSizeInput, setPreviewPageSizeInput] = useState('50');
  const [previewTotal, setPreviewTotal] = useState<number | null>(null);
  const [previewExecTime, setPreviewExecTime] = useState<number | null>(null);
  const [columnSearch, setColumnSearch] = useState('');
  const [previewSearch, setPreviewSearch] = useState('');

  // Row selection + CRUD state
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [rowContextMenu, setRowContextMenu] = useState<{x: number; y: number; rowIdx: number} | null>(null);
  const [editRowOpen, setEditRowOpen] = useState(false);
  const [editingRowIdx, setEditingRowIdx] = useState<number | null>(null);
  const [editRowValues, setEditRowValues] = useState<Record<string, string>>({});
  const [savingRow, setSavingRow] = useState(false);
  const [deleteRowConfirm, setDeleteRowConfirm] = useState(false);
  const [deletingRow, setDeletingRow] = useState(false);
  const [insertRowOpen, setInsertRowOpen] = useState(false);
  const [insertRowValues, setInsertRowValues] = useState<Record<string, string>>({});
  const [insertingRow, setInsertingRow] = useState(false);
  const [pkColumnNames, setPkColumnNames] = useState<string[]>([]);
  const headerCheckboxRef = useRef<HTMLInputElement>(null);

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

  // Fetch actual primary key columns from information_schema
  useEffect(() => {
    if (!selectedTable || !activeConnection) { setPkColumnNames([]); return; }
    const fetchPKs = async () => {
      try {
        const result = await activeConnection.client.query(
          `SELECT kcu.column_name
           FROM information_schema.table_constraints tc
           JOIN information_schema.key_column_usage kcu
             ON tc.constraint_name = kcu.constraint_name
             AND tc.table_schema = kcu.table_schema
             AND tc.table_name = kcu.table_name
           WHERE tc.constraint_type = 'PRIMARY KEY'
             AND tc.table_schema = '${selectedTable.schema}'
             AND tc.table_name = '${selectedTable.name}'`
        );
        setPkColumnNames(result.rows ? result.rows.map((r: any[]) => r[0]) : []);
      } catch {
        setPkColumnNames([]);
      }
    };
    fetchPKs();
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

  // Type badge color by data type family
  const getTypeColor = (dataType: string) => {
    const t = dataType.toLowerCase();
    if (t.includes('text') || t.includes('char') || t.includes('varchar') || t.includes('string')) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    if (t.includes('int') || t.includes('long') || t.includes('short') || t.includes('float') || t.includes('double') || t.includes('numeric') || t.includes('decimal') || t.includes('real') || t === 'integer' || t === 'bigint') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
    if (t.includes('timestamp') || t.includes('date') || t.includes('time') || t.includes('interval')) return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
    if (t.includes('bool')) return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
    if (t.includes('object') || t.includes('array') || t.includes('json')) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
    if (t.includes('ip') || t.includes('geo')) return 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300';
    return 'bg-gray-100 text-gray-600 dark:bg-gray-700/50 dark:text-gray-300';
  };

  const isPrimaryKey = (col: ColumnMetadata) =>
    col.column_name === '_id' || pkColumnNames.includes(col.column_name);

  const handleTableClick = (schema: string, tableName: string) => {
    setSelectedTable({ schema, name: tableName });
    setViewType('columns');
    setPreviewData(null);
    setPreviewPage(1);
    setPreviewTotal(null);
    setPreviewExecTime(null);
    setColumnSearch('');
    setPreviewSearch('');
    setPreviewPageSizeInput('50');
    setSelectedRows(new Set());
    setRowContextMenu(null);
    setEditRowOpen(false);
    setInsertRowOpen(false);
    setDeleteRowConfirm(false);
    addRecentTable(schema, tableName);
  };

  const loadDataPreview = async (page = previewPage, pageSize = previewPageSize) => {
    if (!selectedTable || !activeConnection) return;
    setLoadingPreview(true);
    const t0 = Date.now();
    try {
      const client = activeConnection.client;
      const offset = (page - 1) * pageSize;
      const query = `SELECT * FROM "${selectedTable.schema}"."${selectedTable.name}" LIMIT ${pageSize} OFFSET ${offset}`;
      const result = await client.query(query);
      setPreviewData(result);
      setPreviewSortConfig(null);
      setSelectedRows(new Set());
      setDeleteRowConfirm(false);
      setRowContextMenu(null);
      setPreviewExecTime(Date.now() - t0);
      // Use tableStats rowCount as total if available
      if (tableStats) setPreviewTotal(tableStats.rowCount);
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

  // Sync header checkbox indeterminate state
  useEffect(() => {
    if (!headerCheckboxRef.current) return;
    if (!sortedPreviewData?.rows) {
      headerCheckboxRef.current.indeterminate = false;
      return;
    }
    const getFilteredIdxs = () => sortedPreviewData.rows
      .map((_: any, i: number) => i)
      .filter((i: number) => !previewSearch || sortedPreviewData.rows[i].some((cell: any) =>
        cell !== null && String(typeof cell === 'object' ? JSON.stringify(cell) : cell).toLowerCase().includes(previewSearch.toLowerCase())
      ));
    const filteredIdxs = getFilteredIdxs();
    const allSelected = filteredIdxs.length > 0 && filteredIdxs.every((i: number) => selectedRows.has(i));
    const someSelected = filteredIdxs.some((i: number) => selectedRows.has(i));
    headerCheckboxRef.current.indeterminate = someSelected && !allSelected;
  }, [selectedRows, sortedPreviewData, previewSearch]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied', `${label} copied to clipboard`);
  };

  // Build WHERE clause from a row: prefer user-defined PKs, then _id, then all columns
  const buildRowWhereClause = (row: any[], cols: string[]) => {
    // Use fetched PK column names if available
    if (pkColumnNames.length > 0) {
      return pkColumnNames.map(c => {
        const ci = cols.indexOf(c);
        const val = ci !== -1 ? row[ci] : null;
        if (val === null) return `"${c}" IS NULL`;
        if (typeof val === 'number') return `"${c}" = ${val}`;
        return `"${c}" = '${String(val).replace(/'/g, "''")}'`;
      }).join(' AND ');
    }
    // Fall back to _id (CrateDB system column)
    const idIdx = cols.indexOf('_id');
    if (idIdx !== -1 && row[idIdx] !== null) return `_id = '${row[idIdx]}'`;
    // Last resort: all columns
    return cols.map(c => {
      const ci = cols.indexOf(c);
      const val = row[ci];
      if (val === null) return `"${c}" IS NULL`;
      if (typeof val === 'number') return `"${c}" = ${val}`;
      return `"${c}" = '${String(val).replace(/'/g, "''")}'`;
    }).join(' AND ');
  };

  const openEditRow = (rowIdx: number) => {
    if (!sortedPreviewData) return;
    const row = sortedPreviewData.rows[rowIdx];
    const vals: Record<string, string> = {};
    sortedPreviewData.cols.forEach((c: string, i: number) => {
      vals[c] = row[i] === null ? '' : typeof row[i] === 'object' ? JSON.stringify(row[i]) : String(row[i]);
    });
    setEditRowValues(vals);
    setEditingRowIdx(rowIdx);
    setEditRowOpen(true);
  };

  const handleSaveRow = async () => {
    if (editingRowIdx === null || !sortedPreviewData || !activeConnection || !selectedTable) return;
    const row = sortedPreviewData.rows[editingRowIdx];
    const cols: string[] = sortedPreviewData.cols;
    const whereClause = buildRowWhereClause(row, cols);
    // Determine non-editable columns: user-defined PKs + _id
    const nonEditableCols = new Set([...pkColumnNames, '_id']);
    const setClauses = cols
      .filter(c => !nonEditableCols.has(c))
      .map(c => {
        const val = editRowValues[c];
        if (val === '' || val === undefined) return `"${c}" = NULL`;
        const cm = columns?.find(col => col.column_name === c);
        const isNum = cm?.data_type.toLowerCase().match(/int|float|double|long|short|decimal|numeric|real/);
        if (isNum && !isNaN(Number(val))) return `"${c}" = ${val}`;
        return `"${c}" = '${val.replace(/'/g, "''")}'`;
      }).join(', ');
    if (!setClauses.trim()) {
      toast.error('Nothing to Update', 'All columns are primary keys and cannot be modified.');
      setSavingRow(false);
      return;
    }
    setSavingRow(true);
    try {
      const sql = `UPDATE "${selectedTable.schema}"."${selectedTable.name}" SET ${setClauses} WHERE ${whereClause}`;
      await activeConnection.client.query(sql);
      await activeConnection.client.query(`REFRESH TABLE "${selectedTable.schema}"."${selectedTable.name}"`);
      toast.success('Row Updated', 'Row updated successfully');
      setEditRowOpen(false);
      setSelectedRows(new Set());
      loadDataPreview();
    } catch (err: any) {
      toast.error('Update Failed', err.message || 'Could not update row');
    } finally {
      setSavingRow(false);
    }
  };

  const handleDeleteRow = async () => {
    if (selectedRows.size === 0 || !sortedPreviewData || !activeConnection || !selectedTable) return;
    const cols: string[] = sortedPreviewData.cols;
    const whereClauses = [...selectedRows].map(rowIdx => `(${buildRowWhereClause(sortedPreviewData.rows[rowIdx], cols)})`);
    setDeletingRow(true);
    try {
      const sql = `DELETE FROM "${selectedTable.schema}"."${selectedTable.name}" WHERE ${whereClauses.join(' OR ')}`;
      await activeConnection.client.query(sql);
      await activeConnection.client.query(`REFRESH TABLE "${selectedTable.schema}"."${selectedTable.name}"`);
      toast.success('Deleted', `${selectedRows.size} row${selectedRows.size !== 1 ? 's' : ''} deleted successfully`);
      setSelectedRows(new Set());
      setDeleteRowConfirm(false);
      loadDataPreview();
    } catch (err: any) {
      toast.error('Delete Failed', err.message || 'Could not delete rows');
    } finally {
      setDeletingRow(false);
    }
  };

  const openInsertRow = () => {
    const vals: Record<string, string> = {};
    if (columns) {
      columns.forEach(col => {
        if (col.column_name !== '_id') vals[col.column_name] = '';
      });
    }
    setInsertRowValues(vals);
    setInsertRowOpen(true);
  };

  const handleInsertRow = async () => {
    if (!activeConnection || !selectedTable || !columns) return;
    const insertCols = columns.filter(col => col.column_name !== '_id' && insertRowValues[col.column_name] !== '' && insertRowValues[col.column_name] !== undefined);
    if (insertCols.length === 0) {
      toast.error('Insert Failed', 'Please fill in at least one column value.');
      return;
    }
    const colNames = insertCols.map(col => col.column_name);
    const vals = insertCols.map(col => {
      const val = insertRowValues[col.column_name];
      if (val.toLowerCase() === 'null') return 'NULL';
      const isNum = col.data_type.toLowerCase().match(/int|float|double|long|short|decimal|numeric|real/);
      if (isNum && !isNaN(Number(val))) return val;
      return `'${val.replace(/'/g, "''")}'`;
    });
    setInsertingRow(true);
    try {
      const sql = `INSERT INTO "${selectedTable.schema}"."${selectedTable.name}" (${colNames.map(c => `"${c}"`).join(', ')}) VALUES (${vals.join(', ')})`;
      await activeConnection.client.query(sql);
      await activeConnection.client.query(`REFRESH TABLE "${selectedTable.schema}"."${selectedTable.name}"`);
      toast.success('Row Inserted', 'New row added successfully');
      setInsertRowOpen(false);
      loadDataPreview();
    } catch (err: any) {
      toast.error('Insert Failed', err.message || 'Could not insert row');
    } finally {
      setInsertingRow(false);
    }
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

  const filterSchemas = (schemaList: any[]) => {
    if (filterType === 'all') return schemaList;

    const systemSchemas = ['information_schema', 'sys', 'pg_catalog'];

    if (filterType === 'system') {
      return schemaList.filter(s => systemSchemas.includes(s.name) || s.name.startsWith('pg_'));
    } else {
      return schemaList.filter(s => !systemSchemas.includes(s.name) && !s.name.startsWith('pg_'));
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
    <div className="flex h-full overflow-hidden">
      {/* Left Panel - Tree View */}
      <div className="w-64 flex-shrink-0">
        <div className="flex h-full flex-col border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          {/* Header */}
          <div className="border-b border-gray-200 px-3 py-1.5 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-semibold text-gray-900 dark:text-white">Schema Explorer</span>
            </div>
            <p className="mt-0.5 truncate text-xs text-gray-400 dark:text-gray-500">{activeConnection.name}</p>
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
                className="w-full rounded-md border border-gray-300 bg-white py-1.5 pl-8 pr-3 text-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
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
                <span className="text-sm">Failed to load schemas</span>
              </div>
            ) : filteredSchemas.length > 0 ? (
              <div className="space-y-0.5">
                {filteredSchemas.map((schema) => {
                  const schemaName = schema.name; // Extract schema name from object
                  const tables = schemaTableMap[schemaName] || [];
                  const filteredTables = filterTables(tables);
                  const isLoading = loadingTables.has(schemaName);
                  const isExpanded = expandedSchemas.has(schemaName);
                  const isSystemSchema = ['information_schema', 'sys', 'pg_catalog'].includes(schemaName) || schemaName.startsWith('pg_');

                  if (searchTerm && filteredTables.length === 0 && !isExpanded) return null;

                  return (
                    <div key={schemaName}>
                      {/* Schema Node */}
                      <button
                        onClick={() => toggleSchema(schemaName)}
                        className="flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-sm font-medium transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
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
                          {schemaName}
                        </span>
                        {isLoading ? (
                          <Loader2 className="h-3 w-3 flex-shrink-0 animate-spin text-gray-400" />
                        ) : tables.length > 0 ? (
                          <span className="flex-shrink-0 rounded-full bg-gray-200 px-1.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-400">
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
                                selectedTable?.schema === schemaName && selectedTable?.name === table.table_name;

                              return (
                                <button
                                  key={`${schemaName}.${table.table_name}`}
                                  onClick={() => handleTableClick(schemaName, table.table_name)}
                                  className={`flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-sm transition-colors ${
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
                            <div className="px-2 py-2 text-sm text-gray-500 dark:text-gray-400">
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
              <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                {filterType === 'user' ? 'No user schemas found' : 'No schemas found'}
              </div>
            )}
          </div>

          {/* Footer Stats */}
          {schemas && (
            <div className="border-t border-gray-200 bg-gray-50/80 px-3 py-1.5 dark:border-gray-700 dark:bg-gray-900/50">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 dark:text-gray-500">{filteredSchemas.length} schemas</span>
                {selectedTable && (
                  <span className="truncate text-xs text-blue-500 dark:text-blue-400">
                    {selectedTable.schema}.{selectedTable.name}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Table Details */}
      <div className="flex-1 overflow-hidden">
        {selectedTable ? (
          <div className="flex h-full flex-col bg-white dark:bg-gray-800">
            {/* Header */}
            <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Table className="h-4 w-4 flex-shrink-0 text-green-600 dark:text-green-400" />
                    <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                      <span className="text-gray-500 dark:text-gray-400">{selectedTable.schema}.</span>{selectedTable.name}
                    </h2>
                    {role !== 'superuser' && <PermissionBadge role={role} size="sm" />}
                    {role === 'read-only' && (
                      <span className="flex items-center gap-1 rounded-md border border-yellow-200 bg-yellow-50 px-1.5 py-0.5 text-xs text-yellow-700 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
                        <Eye className="h-3 w-3" />Read-Only
                      </span>
                    )}
                  </div>

                  {/* Stats Row */}
                  <div className="mt-1.5 flex flex-wrap items-center gap-3">
                    {loadingStats ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />
                    ) : tableStats ? (
                      <>
                        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                          <Hash className="h-3 w-3" />
                          <span className="font-semibold text-gray-700 dark:text-gray-300">{tableStats.rowCount.toLocaleString()}</span>
                          <span>rows</span>
                        </div>
                        <span className="text-gray-300 dark:text-gray-600">·</span>
                        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                          <HardDrive className="h-3 w-3" />
                          <span className="font-semibold text-gray-700 dark:text-gray-300">{tableStats.size}</span>
                        </div>
                        <span className="text-gray-300 dark:text-gray-600">·</span>
                        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                          <Layers className="h-3 w-3" />
                          <span className="font-semibold text-gray-700 dark:text-gray-300">{tableStats.shards}</span>
                          <span>shards</span>
                        </div>
                        {columns && (
                          <>
                            <span className="text-gray-300 dark:text-gray-600">·</span>
                            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                              <Columns className="h-3 w-3" />
                              <span className="font-semibold text-gray-700 dark:text-gray-300">{columns.length}</span>
                              <span>columns</span>
                            </div>
                          </>
                        )}
                      </>
                    ) : null}
                  </div>
                </div>

                {/* Header Actions */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => copyToClipboard(`${selectedTable.schema}.${selectedTable.name}`, 'Table name')}
                    className="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                    title="Copy table name"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setShowExportModal(true)}
                    disabled={!previewData || !previewData.rows || previewData.rows.length === 0}
                    className="flex items-center gap-1.5 rounded-md bg-gray-100 px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-200 disabled:opacity-40 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                    title="Export table data"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Export
                  </button>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center px-3 overflow-x-auto">
                {/* View tabs */}
                {[
                  { id: 'columns' as ViewType, label: 'Columns', icon: <Columns className="h-3.5 w-3.5" /> },
                  { id: 'preview' as ViewType, label: 'Preview', icon: <Eye className="h-3.5 w-3.5" />, onClick: () => { setViewType('preview'); if (!previewData) loadDataPreview(); } },
                  { id: 'details' as ViewType, label: 'Details', icon: <BarChart3 className="h-3.5 w-3.5" /> },
                  { id: 'ddl' as ViewType, label: 'DDL', icon: <FileText className="h-3.5 w-3.5" /> },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={tab.onClick ?? (() => setViewType(tab.id))}
                    className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-2 text-sm font-medium transition-colors border-b-2 ${
                      viewType === tab.id
                        ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                  >
                    {tab.icon}{tab.label}
                  </button>
                ))}

                {/* Divider */}
                <div className="mx-3 h-5 w-px flex-shrink-0 bg-gray-300 dark:bg-gray-600" />

                {/* Operation tabs */}
                <button
                  onClick={() => setViewType('query-form')}
                  className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-2 text-sm font-medium transition-colors border-b-2 ${
                    viewType === 'query-form'
                      ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  <Search className="h-3.5 w-3.5" />Query
                </button>
                {canWrite && (
                  <button
                    onClick={() => setViewType('insert-form')}
                    className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-2 text-sm font-medium transition-colors border-b-2 ${
                      viewType === 'insert-form'
                        ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                  >
                    <Plus className="h-3.5 w-3.5" />Insert
                  </button>
                )}
                {canWrite && (
                  <button
                    onClick={() => setViewType('update-form')}
                    className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-2 text-sm font-medium transition-colors border-b-2 ${
                      viewType === 'update-form'
                        ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                  >
                    <Edit className="h-3.5 w-3.5" />Update
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={() => setViewType('delete-form')}
                    className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-2 text-sm font-medium transition-colors border-b-2 ${
                      viewType === 'delete-form'
                        ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />Delete
                  </button>
                )}
                {canWrite && (
                  <button
                    onClick={() => setViewType('import-form')}
                    className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-2 text-sm font-medium transition-colors border-b-2 ${
                      viewType === 'import-form'
                        ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                  >
                    <Download className="h-3.5 w-3.5 rotate-180" />Import
                  </button>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-h-0 overflow-hidden">
              {viewType === 'columns' && (
                <div className="h-full overflow-y-auto p-4">
                  {columnsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                    </div>
                  ) : columnsError ? (
                    <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
                      <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                        <AlertCircle className="h-5 w-5" />
                        <span className="text-sm font-medium">Failed to load columns</span>
                      </div>
                      <p className="mt-2 text-sm text-red-600 dark:text-red-300">{columnsError}</p>
                    </div>
                  ) : columns && columns.length > 0 ? (
                    <div className="flex flex-col gap-3">
                      {/* Column search */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search columns by name or type…"
                          value={columnSearch}
                          onChange={e => setColumnSearch(e.target.value)}
                          className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
                        />
                        {columnSearch && (
                          <button onClick={() => setColumnSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">×</button>
                        )}
                      </div>

                    <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-900/80">
                          <tr>
                            <th className="w-10 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">#</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Column Name</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Data Type</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Nullable</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Default</th>
                            <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                          {columns.filter(col =>
                            !columnSearch ||
                            col.column_name.toLowerCase().includes(columnSearch.toLowerCase()) ||
                            col.data_type.toLowerCase().includes(columnSearch.toLowerCase())
                          ).map((col) => {
                            const pk = isPrimaryKey(col);
                            return (
                              <tr key={col.ordinal_position} className="group bg-white transition-colors hover:bg-blue-50/40 dark:bg-gray-800 dark:hover:bg-gray-700/30">
                                <td className="px-3 py-1.5 font-mono text-xs text-gray-400">{col.ordinal_position}</td>
                                <td className="px-4 py-1.5">
                                  <div className="flex items-center gap-2">
                                    {pk
                                      ? <span title="Primary Key"><Key className="h-3.5 w-3.5 flex-shrink-0 text-yellow-500" /></span>
                                      : <div className="h-3.5 w-3.5 flex-shrink-0" />
                                    }
                                    <span className={`font-mono font-medium ${pk ? 'text-yellow-700 dark:text-yellow-400' : 'text-gray-900 dark:text-gray-100'}`}>
                                      {col.column_name}
                                    </span>
                                    {pk && <span className="rounded bg-yellow-100 px-1.5 py-0.5 text-xs font-semibold text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">PK</span>}
                                  </div>
                                </td>
                                <td className="px-4 py-1.5">
                                  <span className={`inline-block rounded-md px-2 py-0.5 font-mono text-xs font-medium ${getTypeColor(col.data_type)}`}>
                                    {col.data_type}
                                  </span>
                                </td>
                                <td className="px-4 py-1.5">
                                  {col.is_nullable === 'YES' ? (
                                    <span className="inline-flex items-center gap-1 text-sm text-gray-400 dark:text-gray-500">
                                      <CheckCircle2 className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600" />
                                      YES
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-sm font-medium text-red-600 dark:text-red-400">
                                      <XCircle className="h-3.5 w-3.5" />
                                      NOT NULL
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-1.5">
                                  {col.column_default
                                    ? <code className="rounded bg-gray-100 px-1.5 py-0.5 text-sm text-gray-600 dark:bg-gray-700 dark:text-gray-300">{col.column_default}</code>
                                    : <span className="text-sm text-gray-300 dark:text-gray-600">—</span>
                                  }
                                </td>
                                <td className="px-3 py-1.5">
                                  <div className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                                    <button onClick={() => setEditColumnModal({open: true, column: col})} className="rounded p-1.5 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/30" title="Rename column"><Edit className="h-3.5 w-3.5" /></button>
                                    <button onClick={() => setDeleteColumnModal({open: true, column: col})} className="rounded p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30" title="Drop column"><Trash2 className="h-3.5 w-3.5" /></button>
                                    <button onClick={() => copyToClipboard(col.column_name, 'Column name')} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700" title="Copy column name"><Copy className="h-3.5 w-3.5" /></button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      <div className="border-t border-gray-100 bg-gray-50/80 px-4 py-2 text-sm text-gray-400 dark:border-gray-700 dark:bg-gray-900/50">
                        {columnSearch
                          ? `${columns.filter(c => c.column_name.toLowerCase().includes(columnSearch.toLowerCase()) || c.data_type.toLowerCase().includes(columnSearch.toLowerCase())).length} of ${columns.length} columns`
                          : `${columns.length} column${columns.length !== 1 ? 's' : ''}`
                        }
                      </div>
                    </div>
                    </div>
                  ) : (
                    <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                      No columns found
                    </div>
                  )}
                </div>
              )}

              {viewType === 'preview' && (
                <div className="flex h-full flex-col overflow-hidden">
                  {/* Toolbar — fixed height */}
                  <div className="flex flex-shrink-0 flex-col gap-2 border-b border-gray-100 px-4 py-2 dark:border-gray-700">
                    <div className="flex items-center justify-between gap-3">
                      {/* Row info */}
                      <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                        {sortedPreviewData?.rows && (
                          <>
                            <span>
                              {previewSearch
                                ? `${sortedPreviewData.rows.filter((row: any[]) => row.some((cell: any) => cell !== null && String(typeof cell === 'object' ? JSON.stringify(cell) : cell).toLowerCase().includes(previewSearch.toLowerCase()))).length} filtered`
                                : <>Rows {((previewPage - 1) * previewPageSize) + 1}–{Math.min(previewPage * previewPageSize, previewTotal ?? previewPage * previewPageSize)}{previewTotal !== null && <span className="ml-1 text-gray-400">of {previewTotal.toLocaleString()}</span>}</>
                              }
                            </span>
                            {previewSortConfig && (
                              <span className="flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                <SortAsc className="h-3 w-3" />
                                {previewSortConfig.col} {previewSortConfig.dir === 'asc' ? '↑' : '↓'}
                                <button onClick={() => setPreviewSortConfig(null)} className="ml-0.5 opacity-60 hover:opacity-100">×</button>
                              </span>
                            )}
                            {previewExecTime !== null && <span className="text-gray-400">{previewExecTime}ms</span>}
                          </>
                        )}
                      </div>

                      {/* Page size controls */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-400 whitespace-nowrap">Page size:</span>
                        {/* Quick presets */}
                        <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-0.5 dark:border-gray-700 dark:bg-gray-900">
                          {[25, 50, 100, 250].map(n => (
                            <button
                              key={n}
                              onClick={() => {
                                const s = String(n);
                                setPreviewPageSize(n);
                                setPreviewPageSizeInput(s);
                                setPreviewPage(1);
                                loadDataPreview(1, n);
                              }}
                              className={`rounded px-2.5 py-1 text-sm font-medium transition-colors ${
                                previewPageSize === n && [25, 50, 100, 250].map(String).includes(previewPageSizeInput)
                                  ? 'bg-white text-blue-600 shadow-sm dark:bg-gray-700 dark:text-blue-400'
                                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                              }`}
                            >{n}</button>
                          ))}
                        </div>
                        {/* Free-entry input — always shows current value, always editable */}
                        <div className="relative flex items-center">
                          <input
                            type="number"
                            min="1"
                            value={previewPageSizeInput}
                            onChange={e => setPreviewPageSizeInput(e.target.value)}
                            onBlur={() => {
                              const v = Math.max(1, parseInt(previewPageSizeInput, 10) || previewPageSize);
                              setPreviewPageSizeInput(String(v));
                              if (v !== previewPageSize) {
                                setPreviewPageSize(v);
                                setPreviewPage(1);
                                loadDataPreview(1, v);
                              }
                            }}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                const v = Math.max(1, parseInt(previewPageSizeInput, 10) || previewPageSize);
                                setPreviewPageSizeInput(String(v));
                                setPreviewPageSize(v);
                                setPreviewPage(1);
                                loadDataPreview(1, v);
                                (e.target as HTMLInputElement).blur();
                              }
                            }}
                            className="w-20 rounded-lg border border-gray-200 bg-white px-3 py-1 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                          />
                          <span className="pointer-events-none absolute right-2.5 text-xs text-gray-400">rows</span>
                        </div>
                        <button
                          onClick={() => loadDataPreview()}
                          disabled={loadingPreview}
                          className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                        >
                          <RefreshCw className={`h-3 w-3 ${loadingPreview ? 'animate-spin' : ''}`} />
                          Refresh
                        </button>
                        {canWrite && columns && columns.length > 0 && (
                          <button
                            onClick={openInsertRow}
                            className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Add Row
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Row search bar */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Filter rows by any value…"
                        value={previewSearch}
                        onChange={e => setPreviewSearch(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 bg-white py-1.5 pl-9 pr-8 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
                      />
                      {previewSearch && (
                        <button onClick={() => setPreviewSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-lg text-gray-400 hover:text-gray-600">×</button>
                      )}
                    </div>
                  </div>

                  {/* Table — the only scroll source */}
                  <div className="flex-1 min-h-0 overflow-auto">
                    {loadingPreview ? (
                      <div className="flex h-full flex-col items-center justify-center gap-2">
                        <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
                        <p className="text-sm text-gray-400">Loading data…</p>
                      </div>
                    ) : sortedPreviewData?.rows && sortedPreviewData.rows.length > 0 ? (
                      <table className="min-w-full border-collapse text-sm">
                        <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-900">
                          <tr>
                            <th className="w-10 border-b border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-900">
                              <input
                                ref={headerCheckboxRef}
                                type="checkbox"
                                checked={(() => {
                                  if (!sortedPreviewData?.rows || sortedPreviewData.rows.length === 0) return false;
                                  const filteredIdxs = sortedPreviewData.rows
                                    .map((_: any, i: number) => i)
                                    .filter((i: number) => !previewSearch || sortedPreviewData.rows[i].some((cell: any) =>
                                      cell !== null && String(typeof cell === 'object' ? JSON.stringify(cell) : cell).toLowerCase().includes(previewSearch.toLowerCase())
                                    ));
                                  return filteredIdxs.length > 0 && filteredIdxs.every((i: number) => selectedRows.has(i));
                                })()}
                                onChange={() => {
                                  if (!sortedPreviewData?.rows) return;
                                  const filteredIdxs = sortedPreviewData.rows
                                    .map((_: any, i: number) => i)
                                    .filter((i: number) => !previewSearch || sortedPreviewData.rows[i].some((cell: any) =>
                                      cell !== null && String(typeof cell === 'object' ? JSON.stringify(cell) : cell).toLowerCase().includes(previewSearch.toLowerCase())
                                    ));
                                  const allSelected = filteredIdxs.every((i: number) => selectedRows.has(i));
                                  if (allSelected) {
                                    setSelectedRows(prev => { const next = new Set(prev); filteredIdxs.forEach((i: number) => next.delete(i)); return next; });
                                  } else {
                                    setSelectedRows(prev => { const next = new Set(prev); filteredIdxs.forEach((i: number) => next.add(i)); return next; });
                                  }
                                  setDeleteRowConfirm(false);
                                }}
                                className="h-4 w-4 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600"
                              />
                            </th>
                            <th className="w-10 border-b border-gray-200 bg-gray-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 dark:border-gray-700 dark:bg-gray-900">#</th>
                            {sortedPreviewData.cols.map((col: string, idx: number) => (
                              <th
                                key={idx}
                                onClick={() => handlePreviewSort(col)}
                                className="cursor-pointer select-none whitespace-nowrap border-b border-gray-200 bg-gray-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 hover:text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:hover:text-gray-200"
                              >
                                <div className="flex items-center gap-1">
                                  {col}
                                  {previewSortConfig?.col === col
                                    ? <span className="text-blue-500">{previewSortConfig.dir === 'asc' ? '↑' : '↓'}</span>
                                    : <SortAsc className="h-3 w-3 opacity-20" />
                                  }
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                          {sortedPreviewData.rows
                            .map((row: any[], originalIdx: number) => ({ row, originalIdx }))
                            .filter(({ row }: { row: any[]; originalIdx: number }) =>
                              !previewSearch ||
                              row.some((cell: any) =>
                                cell !== null &&
                                String(typeof cell === 'object' ? JSON.stringify(cell) : cell)
                                  .toLowerCase()
                                  .includes(previewSearch.toLowerCase())
                              )
                            )
                            .map(({ row, originalIdx }: { row: any[]; originalIdx: number }) => (
                            <tr
                              key={originalIdx}
                              onClick={() => {
                                setSelectedRows(prev => { const next = new Set(prev); if (next.has(originalIdx)) { next.delete(originalIdx); } else { next.add(originalIdx); } return next; });
                                setRowContextMenu(null); setDeleteRowConfirm(false);
                              }}
                              onContextMenu={e => { e.preventDefault(); setSelectedRows(new Set([originalIdx])); setRowContextMenu({x: e.clientX, y: e.clientY, rowIdx: originalIdx}); }}
                              className={`cursor-pointer group transition-colors ${selectedRows.has(originalIdx) ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-white hover:bg-blue-50/40 dark:bg-gray-800 dark:hover:bg-gray-700/30'}`}
                            >
                              <td className="w-10 whitespace-nowrap px-3 py-1.5 text-center" onClick={e => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={selectedRows.has(originalIdx)}
                                  onChange={() => {
                                    setSelectedRows(prev => { const next = new Set(prev); if (next.has(originalIdx)) { next.delete(originalIdx); } else { next.add(originalIdx); } return next; });
                                    setDeleteRowConfirm(false);
                                  }}
                                  className="h-4 w-4 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600"
                                />
                              </td>
                              <td className="w-10 whitespace-nowrap px-3 py-1.5 font-mono text-xs text-gray-300 dark:text-gray-600">
                                {(previewPage - 1) * previewPageSize + originalIdx + 1}
                              </td>
                              {row.map((cell: any, cellIdx: number) => {
                                const displayVal = cell === null
                                  ? null
                                  : typeof cell === 'object'
                                    ? JSON.stringify(cell)
                                    : String(cell);
                                return (
                                  <td
                                    key={cellIdx}
                                    className="whitespace-nowrap px-3 py-1.5 font-mono text-sm"
                                    title={displayVal ?? 'NULL'}
                                  >
                                    {cell === null
                                      ? <span className="italic text-gray-300 dark:text-gray-600">NULL</span>
                                      : typeof cell === 'object'
                                        ? <span className="text-amber-700 dark:text-amber-400">{displayVal}</span>
                                        : <span className="text-gray-700 dark:text-gray-300">{displayVal}</span>
                                    }
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                        <Eye className="h-10 w-10 text-gray-300 dark:text-gray-600" />
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No data loaded</p>
                        <button onClick={() => loadDataPreview()} className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
                          Load Data
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Selected row action bar */}
                  {selectedRows.size > 0 && sortedPreviewData?.rows && (
                    <div className="flex flex-shrink-0 items-center justify-between border-t border-blue-200 bg-blue-50 px-4 py-2 dark:border-blue-800/60 dark:bg-blue-900/20">
                      <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                        {selectedRows.size} row{selectedRows.size !== 1 ? 's' : ''} selected
                      </span>
                      <div className="flex items-center gap-2">
                        {canWrite && selectedRows.size === 1 && (
                          <button
                            onClick={() => { openEditRow([...selectedRows][0]); setRowContextMenu(null); }}
                            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                          >
                            <Edit className="h-3.5 w-3.5" />Edit Row
                          </button>
                        )}
                        {canDelete && !deleteRowConfirm && (
                          <button
                            onClick={() => setDeleteRowConfirm(true)}
                            className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
                          >
                            <Trash2 className="h-3.5 w-3.5" />Delete {selectedRows.size > 1 ? `(${selectedRows.size})` : ''}
                          </button>
                        )}
                        {canDelete && deleteRowConfirm && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm text-red-700 dark:text-red-300">Delete {selectedRows.size} row{selectedRows.size !== 1 ? 's' : ''}?</span>
                            <button onClick={handleDeleteRow} disabled={deletingRow} className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
                              {deletingRow ? 'Deleting…' : 'Yes, Delete'}
                            </button>
                            <button onClick={() => setDeleteRowConfirm(false)} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800">Cancel</button>
                          </div>
                        )}
                        {selectedRows.size === 1 && (
                          <>
                            <button
                              onClick={() => {
                                const row = sortedPreviewData.rows[[...selectedRows][0]];
                                const cols: string[] = sortedPreviewData.cols;
                                const obj: Record<string, any> = {};
                                cols.forEach((c: string, i: number) => { obj[c] = row[i]; });
                                copyToClipboard(JSON.stringify(obj, null, 2), 'Row JSON');
                              }}
                              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                            >
                              <Copy className="h-3.5 w-3.5" />JSON
                            </button>
                            <button
                              onClick={() => {
                                const row = sortedPreviewData.rows[[...selectedRows][0]];
                                const cols: string[] = sortedPreviewData.cols;
                                const vals = cols.map((c: string, i: number) => {
                                  const v = row[i];
                                  if (v === null) return 'NULL';
                                  if (typeof v === 'number') return String(v);
                                  return `'${String(v).replace(/'/g, "''")}'`;
                                });
                                const sql = `INSERT INTO "${selectedTable?.schema}"."${selectedTable?.name}" (${cols.map((c: string) => `"${c}"`).join(', ')}) VALUES (${vals.join(', ')});`;
                                copyToClipboard(sql, 'INSERT SQL');
                              }}
                              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                            >
                              <Copy className="h-3.5 w-3.5" />INSERT SQL
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => { setSelectedRows(new Set()); setDeleteRowConfirm(false); setRowContextMenu(null); }}
                          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800"
                        >
                          Deselect All
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Pagination — fixed height */}
                  {!loadingPreview && sortedPreviewData?.rows && previewTotal !== null && previewTotal > previewPageSize && (() => {
                    const totalPages = Math.ceil(previewTotal / previewPageSize);
                    const isFirst = previewPage === 1;
                    const isLast = previewPage >= totalPages;
                    const btnBase = 'inline-flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg border px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-35';
                    const btnIdle = `${btnBase} border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white`;
                    const btnActive = `${btnBase} border-blue-600 bg-blue-600 text-white shadow-sm`;

                    // page window: show up to 5 page numbers centred on current page
                    const window = 2;
                    const pageNums: number[] = [];
                    for (let i = Math.max(1, previewPage - window); i <= Math.min(totalPages, previewPage + window); i++) {
                      pageNums.push(i);
                    }

                    return (
                      <div className="flex flex-shrink-0 items-center justify-between border-t border-gray-100 bg-white px-4 py-1.5 dark:border-gray-700 dark:bg-gray-800/50">
                        {/* Left: summary */}
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Showing{' '}
                          <span className="font-semibold text-gray-800 dark:text-gray-200">
                            {((previewPage - 1) * previewPageSize) + 1}
                          </span>
                          {' – '}
                          <span className="font-semibold text-gray-800 dark:text-gray-200">
                            {Math.min(previewPage * previewPageSize, previewTotal).toLocaleString()}
                          </span>
                          {' of '}
                          <span className="font-semibold text-gray-800 dark:text-gray-200">
                            {previewTotal.toLocaleString()}
                          </span>
                          {' rows'}
                        </p>

                        {/* Right: nav controls */}
                        <div className="flex items-center gap-1.5">
                          {/* First */}
                          <button
                            disabled={isFirst}
                            onClick={() => { setPreviewPage(1); loadDataPreview(1); }}
                            title="First page"
                            className={btnIdle}
                          >
                            «
                          </button>
                          {/* Prev */}
                          <button
                            disabled={isFirst}
                            onClick={() => { const p = previewPage - 1; setPreviewPage(p); loadDataPreview(p); }}
                            title="Previous page"
                            className={btnIdle}
                          >
                            ‹ Prev
                          </button>

                          {/* Page number window */}
                          {pageNums[0] > 1 && (
                            <>
                              <button onClick={() => { setPreviewPage(1); loadDataPreview(1); }} className={btnIdle}>1</button>
                              {pageNums[0] > 2 && <span className="px-1 text-gray-400">…</span>}
                            </>
                          )}
                          {pageNums.map(p => (
                            <button
                              key={p}
                              onClick={() => { setPreviewPage(p); loadDataPreview(p); }}
                              className={p === previewPage ? btnActive : btnIdle}
                            >
                              {p}
                            </button>
                          ))}
                          {pageNums[pageNums.length - 1] < totalPages && (
                            <>
                              {pageNums[pageNums.length - 1] < totalPages - 1 && <span className="px-1 text-gray-400">…</span>}
                              <button onClick={() => { setPreviewPage(totalPages); loadDataPreview(totalPages); }} className={btnIdle}>{totalPages}</button>
                            </>
                          )}

                          {/* Next */}
                          <button
                            disabled={isLast}
                            onClick={() => { const p = previewPage + 1; setPreviewPage(p); loadDataPreview(p); }}
                            title="Next page"
                            className={btnIdle}
                          >
                            Next ›
                          </button>
                          {/* Last */}
                          <button
                            disabled={isLast}
                            onClick={() => { setPreviewPage(totalPages); loadDataPreview(totalPages); }}
                            title="Last page"
                            className={btnIdle}
                          >
                            »
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {viewType === 'details' && (
                <div className="h-full overflow-y-auto p-4">
                <div className="space-y-4">
                  {/* Stat cards */}
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {[
                      { label: 'Total Rows', value: tableStats?.rowCount.toLocaleString() ?? '—', icon: <Hash className="h-4 w-4" />, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400' },
                      { label: 'Storage', value: tableStats?.size ?? '—', icon: <HardDrive className="h-4 w-4" />, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400' },
                      { label: 'Shards', value: String(tableStats?.shards ?? '—'), icon: <Layers className="h-4 w-4" />, color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400' },
                      { label: 'Columns', value: String(columns?.length ?? '—'), icon: <Columns className="h-4 w-4" />, color: 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400' },
                    ].map(stat => (
                      <div key={stat.label} className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800/80">
                        <div className={`mb-2 inline-flex rounded-lg p-2 ${stat.color}`}>{stat.icon}</div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Table identity */}
                  <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800/80">
                    <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-700">
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Table Identity</h3>
                    </div>
                    <dl className="divide-y divide-gray-100 dark:divide-gray-700/60">
                      {[
                        { label: 'Schema', value: selectedTable.schema },
                        { label: 'Table', value: selectedTable.name },
                        { label: 'Qualified Name', value: `${selectedTable.schema}.${selectedTable.name}`, mono: true },
                        ...(tableStats ? [{ label: 'Replicas', value: String(tableStats.replicas) }] : []),
                      ].map(row => (
                        <div key={row.label} className="flex items-center justify-between px-4 py-1.5">
                          <dt className="text-sm text-gray-500 dark:text-gray-400">{row.label}</dt>
                          <dd className={`text-sm font-medium text-gray-900 dark:text-white ${row.mono ? 'font-mono text-xs' : ''}`}>{row.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>

                  {/* Column type breakdown */}
                  {columns && columns.length > 0 && (() => {
                    const typeGroups: Record<string, number> = {};
                    columns.forEach(c => {
                      const t = c.data_type.split(' ')[0].toLowerCase();
                      typeGroups[t] = (typeGroups[t] || 0) + 1;
                    });
                    return (
                      <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800/80">
                        <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-700">
                          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Column Types</h3>
                        </div>
                        <div className="flex flex-wrap gap-2 p-4">
                          {Object.entries(typeGroups).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                            <span key={type} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-medium ${getTypeColor(type)}`}>
                              <span>{type}</span>
                              <span className="rounded-full bg-white/50 px-1 py-0.5 text-sm font-bold">{count}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
                </div>
              )}

              {viewType === 'ddl' && (
                <div className="h-full overflow-y-auto p-4">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Auto-generated CREATE TABLE statement</p>
                    <button
                      onClick={() => { const ddl = generateDDL(); if (ddl) copyToClipboard(ddl, 'DDL'); }}
                      className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy DDL
                    </button>
                  </div>
                  <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-100 px-4 py-2 dark:border-gray-700 dark:bg-gray-900">
                      <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
                      <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                      <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
                      <span className="ml-2 text-sm text-gray-400 font-mono">{selectedTable.schema}.{selectedTable.name}.sql</span>
                    </div>
                    <div className="flex overflow-x-auto bg-slate-100 dark:bg-gray-950">
                      {/* Line numbers */}
                      <div className="select-none border-r border-slate-300 dark:border-gray-800 bg-slate-200 dark:bg-gray-900 px-3 py-4 text-right font-mono text-xs leading-5 text-slate-400 dark:text-gray-600">
                        {(generateDDL() || '').split('\n').map((_, i) => (
                          <div key={i}>{i + 1}</div>
                        ))}
                      </div>
                      <pre className="flex-1 overflow-x-auto p-4 text-sm leading-5 text-emerald-700 dark:text-green-300 font-mono">
                        <code>{generateDDL()}</code>
                      </pre>
                    </div>
                  </div>
                </div>
                </div>
              )}

              {viewType === 'query-form' && selectedTable && columns && columns.length > 0 && (
                <div className="h-full overflow-hidden">
                  <TableQueryForm
                    schema={selectedTable.schema}
                    tableName={selectedTable.name}
                    columns={columns}
                    onClose={() => setViewType('columns')}
                  />
                </div>
              )}

              {viewType === 'insert-form' && selectedTable && columns && columns.length > 0 && (
                <div className="h-full overflow-y-auto p-6">
                  <TableInsertForm
                    schema={selectedTable.schema}
                    tableName={selectedTable.name}
                    columns={columns}
                    onClose={() => setViewType('columns')}
                    onSuccess={() => { loadDataPreview(); }}
                  />
                </div>
              )}

              {viewType === 'update-form' && selectedTable && columns && columns.length > 0 && (
                <div className="h-full overflow-y-auto p-6">
                  <TableUpdateForm
                    schema={selectedTable.schema}
                    tableName={selectedTable.name}
                    columns={columns}
                    onClose={() => setViewType('columns')}
                    onSuccess={() => { loadDataPreview(); }}
                  />
                </div>
              )}

              {viewType === 'delete-form' && selectedTable && columns && columns.length > 0 && (
                <div className="h-full overflow-y-auto p-6">
                  <TableDeleteForm
                    schema={selectedTable.schema}
                    tableName={selectedTable.name}
                    columns={columns}
                    onClose={() => setViewType('columns')}
                    onSuccess={() => { loadDataPreview(); }}
                  />
                </div>
              )}

              {viewType === 'import-form' && selectedTable && columns && (
                <div className="h-full overflow-hidden">
                  <TableImportForm
                    schema={selectedTable.schema}
                    tableName={selectedTable.name}
                    columns={columns}
                    onImportComplete={() => {
                      setViewType('preview');
                      loadDataPreview(1, previewPageSize);
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center bg-gray-50/50 dark:bg-gray-900/20">
            <div className="px-8 py-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
                <Table className="h-7 w-7 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                No table selected
              </h3>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                Select a table from the schema explorer on the left
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
                    <p className="text-sm text-yellow-700 dark:text-yellow-400">
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
                      <p className="mt-1 text-sm text-red-700 dark:text-red-300">
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
                      <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                        ({deleteColumnModal.column.data_type})
                      </span>
                    </div>
                  </div>
                  <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-900/20">
                    <p className="text-sm text-yellow-700 dark:text-yellow-400">
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

        {/* Row Right-Click Context Menu */}
        {rowContextMenu && sortedPreviewData?.rows && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setRowContextMenu(null)} />
            <div
              className="fixed z-50 min-w-[200px] rounded-lg border border-gray-200 bg-white py-1 shadow-xl dark:border-gray-700 dark:bg-gray-800"
              style={{ top: rowContextMenu.y, left: rowContextMenu.x }}
            >
              {canWrite && (
                <button
                  onClick={() => { openEditRow(rowContextMenu.rowIdx); setRowContextMenu(null); }}
                  className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <Edit className="h-4 w-4 text-blue-500" />Edit Row
                </button>
              )}
              {canDelete && (
                <button
                  onClick={() => { setDeleteRowConfirm(true); setRowContextMenu(null); }}
                  className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="h-4 w-4" />Delete Row
                </button>
              )}
              <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
              <button
                onClick={() => {
                  const row = sortedPreviewData.rows[rowContextMenu.rowIdx];
                  const cols: string[] = sortedPreviewData.cols;
                  const obj: Record<string, any> = {};
                  cols.forEach((c: string, i: number) => { obj[c] = row[i]; });
                  copyToClipboard(JSON.stringify(obj, null, 2), 'Row JSON');
                  setRowContextMenu(null);
                }}
                className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <Copy className="h-4 w-4" />Copy as JSON
              </button>
              <button
                onClick={() => {
                  const row = sortedPreviewData.rows[rowContextMenu.rowIdx];
                  const cols: string[] = sortedPreviewData.cols;
                  const vals = cols.map((c: string, i: number) => {
                    const v = row[i];
                    if (v === null) return 'NULL';
                    if (typeof v === 'number') return String(v);
                    return `'${String(v).replace(/'/g, "''")}'`;
                  });
                  const sql = `INSERT INTO "${selectedTable?.schema}"."${selectedTable?.name}" (${cols.map((c: string) => `"${c}"`).join(', ')}) VALUES (${vals.join(', ')});`;
                  copyToClipboard(sql, 'INSERT SQL');
                  setRowContextMenu(null);
                }}
                className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <Copy className="h-4 w-4" />Copy as INSERT SQL
              </button>
              <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
              <button
                onClick={() => { setSelectedRows(new Set()); setDeleteRowConfirm(false); setRowContextMenu(null); }}
                className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
              >
                Deselect All
              </button>
            </div>
          </>
        )}

        {/* Edit Row Modal */}
        {editRowOpen && editingRowIdx !== null && sortedPreviewData?.rows && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="flex h-[80vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-2xl dark:bg-gray-800">
              <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Edit Row</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedTable?.schema}.{selectedTable?.name} · Row {(previewPage - 1) * previewPageSize + editingRowIdx + 1}
                  </p>
                </div>
                <button onClick={() => setEditRowOpen(false)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-4">
                  {sortedPreviewData.cols.map((col: string) => {
                    const colMeta = columns?.find(c => c.column_name === col);
                    const pk = pkColumnNames.includes(col) || col === '_id';
                    return (
                      <div key={col}>
                        <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                          <span className="font-mono">{col}</span>
                          {colMeta && <span className={`rounded px-1.5 py-0.5 text-xs ${getTypeColor(colMeta.data_type)}`}>{colMeta.data_type}</span>}
                          {pk && <span className="rounded bg-yellow-100 px-1.5 py-0.5 text-xs text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">PK</span>}
                        </label>
                        <input
                          type="text"
                          value={editRowValues[col] ?? ''}
                          onChange={e => setEditRowValues(prev => ({ ...prev, [col]: e.target.value }))}
                          disabled={pk}
                          placeholder={pk ? '(Primary key — read only)' : 'Enter value, or leave empty for NULL'}
                          className={`w-full rounded-lg border px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-white ${pk ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-500' : 'border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-700'}`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
                <button onClick={() => setEditRowOpen(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
                  Cancel
                </button>
                <button onClick={handleSaveRow} disabled={savingRow} className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                  {savingRow ? <><RefreshCw className="h-4 w-4 animate-spin" />Saving…</> : <><CheckCircle2 className="h-4 w-4" />Save Changes</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Insert Row Modal */}
        {insertRowOpen && columns && columns.length > 0 && selectedTable && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="flex h-[80vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-2xl dark:bg-gray-800">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Add New Row</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedTable.schema}.{selectedTable.name}
                  </p>
                </div>
                <button onClick={() => setInsertRowOpen(false)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              {/* Fields */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-4">
                  {columns.filter(col => col.column_name !== '_id').map(col => {
                    const isPK = pkColumnNames.includes(col.column_name);
                    const isRequired = col.is_nullable === 'NO' && !isPK;
                    return (
                      <div key={col.column_name}>
                        <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                          <span className="font-mono">{col.column_name}</span>
                          <span className={`rounded px-1.5 py-0.5 text-xs ${getTypeColor(col.data_type)}`}>{col.data_type}</span>
                          {isPK && <span className="rounded bg-yellow-100 px-1.5 py-0.5 text-xs text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">PK</span>}
                          {isRequired && <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-600 dark:bg-red-900/30 dark:text-red-400">required</span>}
                          {col.is_nullable === 'YES' && <span className="text-xs text-gray-400">optional</span>}
                        </label>
                        <input
                          type="text"
                          value={insertRowValues[col.column_name] ?? ''}
                          onChange={e => setInsertRowValues(prev => ({ ...prev, [col.column_name]: e.target.value }))}
                          placeholder={col.is_nullable === 'YES' ? 'Leave empty for NULL' : `Enter ${col.data_type} value`}
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
                        />
                        {col.column_default && (
                          <p className="mt-1 text-xs text-gray-400">Default: <code className="font-mono">{col.column_default}</code></p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4 dark:border-gray-700">
                <p className="text-xs text-gray-400">
                  Leave optional fields empty to insert NULL · <code className="font-mono">_id</code> is auto-generated
                </p>
                <div className="flex items-center gap-3">
                  <button onClick={() => setInsertRowOpen(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
                    Cancel
                  </button>
                  <button onClick={handleInsertRow} disabled={insertingRow} className="flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
                    {insertingRow
                      ? <><RefreshCw className="h-4 w-4 animate-spin" />Inserting…</>
                      : <><Plus className="h-4 w-4" />Insert Row</>
                    }
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
