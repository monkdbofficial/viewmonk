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
  Upload,
  Search,
  ChevronDown,
  FileJson,
  FileText,
  FileSpreadsheet
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
  const [searchTerm, setSearchTerm] = useState('');
  const [searchColumn, setSearchColumn] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importing, setImporting] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchColumns();
  }, [schema, table]);

  useEffect(() => {
    if (columns.length > 0) {
      fetchData();
    }
  }, [columns.length, page, pageSize, searchTerm, searchColumn]);

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showExportMenu) {
        const target = event.target as HTMLElement;
        if (!target.closest('.export-menu-container')) {
          setShowExportMenu(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showExportMenu]);

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
      // Build WHERE clause for search
      let whereClause = '';
      let queryParams: any[] = [];

      if (searchTerm && searchColumn) {
        // Search in specific column
        whereClause = ` WHERE CAST(${searchColumn} AS TEXT) LIKE ?`;
        queryParams = [`%${searchTerm}%`];
        setIsSearching(true);
      } else if (searchTerm && !searchColumn) {
        // Search across all columns
        const searchConditions = columns.map(col => `CAST(${col.name} AS TEXT) LIKE ?`).join(' OR ');
        whereClause = ` WHERE ${searchConditions}`;
        queryParams = columns.map(() => `%${searchTerm}%`);
        setIsSearching(true);
      } else {
        setIsSearching(false);
      }

      // Get total count with search
      const countResult = await activeConnection.client.query(
        `SELECT COUNT(*) FROM ${schema}.${table}${whereClause}`,
        queryParams
      );
      setTotalRows(countResult.rows[0][0]);

      // Get data for current page with search
      const offset = page * pageSize;
      const result = await activeConnection.client.query(
        `SELECT * FROM ${schema}.${table}${whereClause} LIMIT ${pageSize} OFFSET ${offset}`,
        queryParams
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

  const handleSearch = () => {
    setPage(0); // Reset to first page when searching
    fetchData();
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setSearchColumn('');
    setPage(0);
  };

  const exportToCSV = () => {
    try {
      // Create CSV header
      const headers = columns.map(col => col.name).join(',');

      // Create CSV rows
      const csvRows = rows.map(row => {
        return row.map(cell => {
          // Handle null values
          if (cell === null) return '';
          // Escape quotes and wrap in quotes if contains comma, quote, or newline
          const cellStr = String(cell);
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        }).join(',');
      }).join('\n');

      const csv = `${headers}\n${csvRows}`;
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${schema}_${table}_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();

      success('Export Successful', `Exported ${rows.length} rows to CSV`);
      setShowExportMenu(false);
    } catch (err: any) {
      showError('Export Failed', err.message);
    }
  };

  const exportToJSON = () => {
    try {
      // Convert rows to objects
      const data = rows.map(row => {
        const obj: Record<string, any> = {};
        columns.forEach((col, idx) => {
          obj[col.name] = row[idx];
        });
        return obj;
      });

      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${schema}_${table}_${new Date().toISOString().slice(0, 10)}.json`;
      link.click();

      success('Export Successful', `Exported ${rows.length} rows to JSON`);
      setShowExportMenu(false);
    } catch (err: any) {
      showError('Export Failed', err.message);
    }
  };

  const exportToSQL = () => {
    try {
      const columnNames = columns.map(col => col.name).join(', ');

      const sqlStatements = rows.map(row => {
        const values = row.map(cell => {
          if (cell === null) return 'NULL';
          if (typeof cell === 'number') return cell;
          if (typeof cell === 'boolean') return cell ? 'TRUE' : 'FALSE';
          // Escape single quotes
          return `'${String(cell).replace(/'/g, "''")}'`;
        }).join(', ');

        return `INSERT INTO ${schema}.${table} (${columnNames}) VALUES (${values});`;
      }).join('\n');

      const blob = new Blob([sqlStatements], { type: 'text/plain' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${schema}_${table}_${new Date().toISOString().slice(0, 10)}.sql`;
      link.click();

      success('Export Successful', `Exported ${rows.length} rows to SQL`);
      setShowExportMenu(false);
    } catch (err: any) {
      showError('Export Failed', err.message);
    }
  };

  const downloadCSVTemplate = () => {
    try {
      // Create CSV header with column names
      const headers = columns.map(col => col.name).join(',');

      // Create sample rows with column types and constraints
      const sampleRow1 = columns.map(col => {
        if (col.isPrimaryKey) return `<primary_key>`;
        if (col.type.toLowerCase().includes('int')) return `<number>`;
        if (col.type.toLowerCase().includes('bool')) return `<true/false>`;
        if (col.type.toLowerCase().includes('date') || col.type.toLowerCase().includes('timestamp')) return `<date>`;
        return `<text>`;
      }).join(',');

      const sampleRow2 = columns.map(col => {
        if (col.isPrimaryKey) return `1`;
        if (col.type.toLowerCase().includes('int')) return `100`;
        if (col.type.toLowerCase().includes('bool')) return `true`;
        if (col.type.toLowerCase().includes('date')) return `2024-01-01`;
        if (col.type.toLowerCase().includes('timestamp')) return `2024-01-01 12:00:00`;
        return `sample value`;
      }).join(',');

      const csv = `${headers}\n${sampleRow1}\n${sampleRow2}`;
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${schema}_${table}_template.csv`;
      link.click();

      success('Template Downloaded', 'CSV template downloaded successfully');
    } catch (err: any) {
      showError('Download Failed', err.message);
    }
  };

  const downloadJSONTemplate = () => {
    try {
      // Create sample objects with column information
      const template = [
        columns.reduce((obj, col) => {
          if (col.isPrimaryKey) {
            obj[col.name] = '<primary_key>';
          } else if (col.type.toLowerCase().includes('int')) {
            obj[col.name] = '<number>';
          } else if (col.type.toLowerCase().includes('bool')) {
            obj[col.name] = '<true/false>';
          } else if (col.type.toLowerCase().includes('date') || col.type.toLowerCase().includes('timestamp')) {
            obj[col.name] = '<date>';
          } else {
            obj[col.name] = '<text>';
          }
          return obj;
        }, {} as Record<string, any>),
        columns.reduce((obj, col) => {
          if (col.isPrimaryKey) {
            obj[col.name] = 1;
          } else if (col.type.toLowerCase().includes('int')) {
            obj[col.name] = 100;
          } else if (col.type.toLowerCase().includes('bool')) {
            obj[col.name] = true;
          } else if (col.type.toLowerCase().includes('date')) {
            obj[col.name] = '2024-01-01';
          } else if (col.type.toLowerCase().includes('timestamp')) {
            obj[col.name] = '2024-01-01T12:00:00Z';
          } else {
            obj[col.name] = 'sample value';
          }
          return obj;
        }, {} as Record<string, any>)
      ];

      const json = JSON.stringify(template, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${schema}_${table}_template.json`;
      link.click();

      success('Template Downloaded', 'JSON template downloaded successfully');
    } catch (err: any) {
      showError('Download Failed', err.message);
    }
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !activeConnection) return;

    setImporting(true);
    try {
      const fileContent = await file.text();
      const fileExtension = file.name.split('.').pop()?.toLowerCase();

      let importedData: Record<string, any>[] = [];

      if (fileExtension === 'json') {
        importedData = JSON.parse(fileContent);
      } else if (fileExtension === 'csv') {
        // Parse CSV
        const lines = fileContent.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));

        importedData = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          const obj: Record<string, any> = {};
          headers.forEach((header, idx) => {
            obj[header] = values[idx] === '' ? null : values[idx];
          });
          return obj;
        });
      } else {
        throw new Error('Unsupported file format. Please use CSV or JSON.');
      }

      // Validate columns
      const fileColumns = Object.keys(importedData[0] || {});
      const tableColumns = columns.map(col => col.name);
      const missingColumns = fileColumns.filter(col => !tableColumns.includes(col));

      if (missingColumns.length > 0) {
        showError('Import Failed', `Unknown columns: ${missingColumns.join(', ')}`);
        setImporting(false);
        return;
      }

      // Insert data
      let insertedCount = 0;
      for (const row of importedData) {
        const columnNames = Object.keys(row);
        const values = Object.values(row);
        const placeholders = values.map(() => '?').join(', ');

        await activeConnection.client.query(
          `INSERT INTO ${schema}.${table} (${columnNames.join(', ')}) VALUES (${placeholders})`,
          values
        );
        insertedCount++;
      }

      success('Import Successful', `Imported ${insertedCount} rows`);
      setShowImportDialog(false);
      fetchData(); // Refresh data
    } catch (err: any) {
      console.error('Import failed:', err);
      showError('Import Failed', err.message);
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
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
      <div className="border-b border-gray-200 p-4 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Data Editor
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {schema}.{table} • {totalRows} rows {isSearching && <span className="text-blue-600 dark:text-blue-400">(filtered)</span>}
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

          {/* Export Dropdown */}
          <div className="relative export-menu-container">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-2 rounded-lg border border-green-300 bg-green-50 px-3 py-2 text-sm font-medium text-green-700 hover:bg-green-100 dark:border-green-700 dark:bg-green-900/20 dark:text-green-300 dark:hover:bg-green-900/30"
            >
              <Download className="h-4 w-4" />
              Export
              <ChevronDown className="h-3 w-3" />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1 z-10 w-48 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                <div className="p-1">
                  <button
                    onClick={exportToCSV}
                    className="flex w-full items-center gap-3 rounded px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    <FileText className="h-4 w-4 text-blue-600" />
                    Export as CSV
                  </button>
                  <button
                    onClick={exportToJSON}
                    className="flex w-full items-center gap-3 rounded px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    <FileJson className="h-4 w-4 text-orange-600" />
                    Export as JSON
                  </button>
                  <button
                    onClick={exportToSQL}
                    className="flex w-full items-center gap-3 rounded px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    <FileSpreadsheet className="h-4 w-4 text-green-600" />
                    Export as SQL
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Import Button */}
          <button
            onClick={() => setShowImportDialog(true)}
            className="flex items-center gap-2 rounded-lg border border-purple-300 bg-purple-50 px-3 py-2 text-sm font-medium text-purple-700 hover:bg-purple-100 dark:border-purple-700 dark:bg-purple-900/20 dark:text-purple-300 dark:hover:bg-purple-900/30"
          >
            <Upload className="h-4 w-4" />
            Import
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

        {/* Search Bar */}
        <div className="flex items-center gap-3 rounded-lg border border-gray-300 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-900/50">
          <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <Search className="h-4 w-4 text-gray-500" />
            <span className="font-medium">Search:</span>
          </div>

          {/* Column Selector */}
          <select
            value={searchColumn}
            onChange={(e) => setSearchColumn(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="">All Columns</option>
            {columns.map((col) => (
              <option key={col.name} value={col.name}>
                {col.name}
              </option>
            ))}
          </select>

          {/* Search Input */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch();
              }}
              placeholder="Enter search term..."
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 pr-20 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            {searchTerm && (
              <button
                onClick={handleClearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-600 dark:hover:text-gray-300"
                title="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Search Info */}
          {isSearching && (
            <div className="flex items-center gap-2 rounded-lg bg-blue-100 px-3 py-1.5 dark:bg-blue-900/30">
              <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                {totalRows} result{totalRows !== 1 ? 's' : ''} found
              </span>
            </div>
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

      {/* Import Dialog */}
      {showImportDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white dark:bg-gray-800 shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <Upload className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Import Data
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Import data into {schema}.{table}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowImportDialog(false)}
                className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Supported Formats */}
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div className="text-xs text-blue-800 dark:text-blue-200">
                    <p className="font-medium mb-1">Supported Formats:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li><strong>CSV</strong> - Comma-separated values with header row</li>
                      <li><strong>JSON</strong> - Array of objects with column names as keys</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Download Template Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Download Template
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={downloadCSVTemplate}
                    disabled={importing}
                    className="flex items-center justify-center gap-2 rounded-lg border-2 border-blue-300 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/30"
                  >
                    <FileText className="h-5 w-5" />
                    <div className="text-left">
                      <div className="font-semibold">CSV Template</div>
                      <div className="text-xs text-blue-600 dark:text-blue-400">
                        {columns.length} columns
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={downloadJSONTemplate}
                    disabled={importing}
                    className="flex items-center justify-center gap-2 rounded-lg border-2 border-orange-300 bg-orange-50 px-4 py-3 text-sm font-medium text-orange-700 hover:bg-orange-100 disabled:opacity-50 disabled:cursor-not-allowed dark:border-orange-700 dark:bg-orange-900/20 dark:text-orange-300 dark:hover:bg-orange-900/30"
                  >
                    <FileJson className="h-5 w-5" />
                    <div className="text-left">
                      <div className="font-semibold">JSON Template</div>
                      <div className="text-xs text-orange-600 dark:text-orange-400">
                        {columns.length} fields
                      </div>
                    </div>
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Templates include all table columns with sample data and type hints
                </p>
              </div>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-2 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                    OR UPLOAD YOUR FILE
                  </span>
                </div>
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select File
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.json"
                  onChange={handleImportFile}
                  disabled={importing}
                  className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 dark:text-gray-400 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 dark:file:bg-purple-900/30 dark:file:text-purple-300"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Column names in the file must match table column names
                </p>
              </div>

              {/* Progress Indicator */}
              {importing && (
                <div className="flex items-center gap-3 rounded-lg border border-purple-200 bg-purple-50 p-3 dark:border-purple-800 dark:bg-purple-900/20">
                  <RefreshCw className="h-5 w-5 animate-spin text-purple-600 dark:text-purple-400" />
                  <div>
                    <p className="text-sm font-medium text-purple-900 dark:text-purple-300">
                      Importing data...
                    </p>
                    <p className="text-xs text-purple-700 dark:text-purple-400">
                      Please wait while we process your file
                    </p>
                  </div>
                </div>
              )}

              {/* Warning */}
              <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 dark:border-orange-800 dark:bg-orange-900/20">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 text-orange-600 dark:text-orange-400 mt-0.5" />
                  <div className="text-xs text-orange-800 dark:text-orange-200">
                    <p className="font-medium mb-1">Important:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Data will be inserted as new rows</li>
                      <li>Primary key conflicts may cause errors</li>
                      <li>Large files may take time to process</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-gray-200 p-4 dark:border-gray-700">
              <button
                onClick={() => setShowImportDialog(false)}
                disabled={importing}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
