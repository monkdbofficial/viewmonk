'use client';

import { useState } from 'react';
import {
  Plus, Upload, Download, Table as TableIcon,
  Database, Save, X, AlertCircle, CheckCircle,
  FileSpreadsheet, FileJson, Globe
} from 'lucide-react';
import TableColumnSelector, { TableColumnSelection } from './TableColumnSelector';
import { useActiveConnection } from '@/app/lib/monkdb-context';
import { useToast } from '../ToastContext';
import { geospatialConfig } from '@/app/config/geospatial.config';
import { useSchemaMetadata } from '@/app/lib/hooks/useSchemaMetadata';

type Tab = 'add-data' | 'import' | 'export' | 'create-table';

interface EnterpriseDataPanelProps {
  onDataChange?: () => void;
}

export default function EnterpriseDataPanel({ onDataChange }: EnterpriseDataPanelProps) {
  const activeConnection = useActiveConnection();
  const toast = useToast();
  const { tables, columns } = useSchemaMetadata();

  const [activeTab, setActiveTab] = useState<Tab>('add-data');
  const [selectedTable, setSelectedTable] = useState<TableColumnSelection | null>(null);
  const [loading, setLoading] = useState(false);

  // Add Data State
  const [formData, setFormData] = useState<Record<string, any>>({});

  // Import State
  const [importFormat, setImportFormat] = useState<'csv' | 'geojson' | 'json'>('csv');
  const [importData, setImportData] = useState('');
  const [importPreview, setImportPreview] = useState<any[]>([]);

  // Export State
  const [exportFormat, setExportFormat] = useState<'csv' | 'geojson' | 'json' | 'excel'>('csv');
  const [exportQuery, setExportQuery] = useState('');

  // Create Table State
  const [newTableSchema, setNewTableSchema] = useState('monkdb');
  const [isNewSchema, setIsNewSchema] = useState(false);
  const [customSchemaName, setCustomSchemaName] = useState('');
  const [newTableName, setNewTableName] = useState('');
  const [isNewTable, setIsNewTable] = useState(false);
  const [customTableName, setCustomTableName] = useState('');
  const [selectedExistingTable, setSelectedExistingTable] = useState('');
  const [newTableColumns, setNewTableColumns] = useState<Array<{name: string; type: string; isGeo: boolean}>>([
    { name: 'id', type: 'TEXT', isGeo: false },
    { name: 'name', type: 'TEXT', isGeo: false },
    { name: 'location', type: 'GEO_POINT', isGeo: true },
  ]);

  // Get unique schemas
  const existingSchemas = [...new Set(tables.map(t => t.schema))].sort();

  // Get tables for selected schema (for Create Table tab)
  const schemaToCheck = isNewSchema ? customSchemaName : newTableSchema;
  const existingTablesInSchema = tables
    .filter(t => t.schema === schemaToCheck)
    .map(t => t.name)
    .sort();

  const tabs = [
    { id: 'add-data', label: 'Add Data', icon: Plus },
    { id: 'import', label: 'Import', icon: Upload },
    { id: 'export', label: 'Export', icon: Download },
    { id: 'create-table', label: 'Create Table', icon: TableIcon },
  ];

  // Add Data Functions
  const handleFormChange = (columnName: string, value: any) => {
    setFormData(prev => ({ ...prev, [columnName]: value }));
  };

  const handleAddData = async () => {
    if (!activeConnection || !selectedTable) {
      toast.error('Missing Information', 'Please select a table first');
      return;
    }

    setLoading(true);
    try {
      // Build INSERT query
      const columns = Object.keys(formData);
      const values = Object.values(formData).map(v => {
        if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`;
        if (v === null || v === undefined) return 'NULL';
        return v;
      });

      const query = `INSERT INTO ${selectedTable.fullTableName} (${columns.join(', ')})
                     VALUES (${values.join(', ')})`;

      await activeConnection.client.query(query);

      toast.success('Data Added', 'Record successfully inserted');
      setFormData({});
      if (onDataChange) onDataChange();
    } catch (error: any) {
      toast.error('Insert Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Import Functions
  const handleImport = async () => {
    if (!activeConnection || !selectedTable || !importData) {
      toast.error('Missing Information', 'Please select a table and provide data');
      return;
    }

    setLoading(true);
    try {
      let records: any[] = [];

      if (importFormat === 'csv') {
        records = parseCSV(importData);
      } else if (importFormat === 'geojson') {
        records = parseGeoJSON(importData);
      } else if (importFormat === 'json') {
        records = JSON.parse(importData);
      }

      if (records.length === 0) {
        throw new Error('No records to import');
      }

      // Batch insert
      const batchSize = geospatialConfig.importExport.batchSize;
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        await insertBatch(batch);
      }

      toast.success('Import Complete', `Successfully imported ${records.length} records`);
      setImportData('');
      setImportPreview([]);
      if (onDataChange) onDataChange();
    } catch (error: any) {
      toast.error('Import Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const insertBatch = async (records: any[]) => {
    if (!activeConnection || !selectedTable) return;

    const columns = Object.keys(records[0]);
    const valuesList = records.map(record => {
      const values = columns.map(col => {
        const value = record[col];
        if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
        if (value === null || value === undefined) return 'NULL';
        return value;
      });
      return `(${values.join(', ')})`;
    });

    const query = `INSERT INTO ${selectedTable.fullTableName} (${columns.join(', ')})
                   VALUES ${valuesList.join(', ')}`;

    await activeConnection.client.query(query);
  };

  const parseCSV = (csvData: string): any[] => {
    const lines = csvData.trim().split('\n');
    if (lines.length < 2) throw new Error('CSV must have headers and data');

    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const obj: any = {};
      headers.forEach((header, i) => {
        obj[header] = values[i];
      });
      return obj;
    });
  };

  const parseGeoJSON = (geojsonData: string): any[] => {
    const geojson = JSON.parse(geojsonData);
    if (geojson.type === 'FeatureCollection') {
      return geojson.features.map((feature: any) => ({
        ...feature.properties,
        location: `POINT(${feature.geometry.coordinates.join(' ')})`,
      }));
    }
    throw new Error('Invalid GeoJSON format');
  };

  // Export Functions
  const handleExport = async () => {
    if (!activeConnection || !selectedTable) {
      toast.error('Missing Information', 'Please select a table first');
      return;
    }

    setLoading(true);
    try {
      const query = exportQuery || `SELECT * FROM ${selectedTable.fullTableName} LIMIT 10000`;
      const result = await activeConnection.client.query(query);

      let exportContent = '';
      let filename = '';
      let mimeType = '';

      if (exportFormat === 'csv') {
        exportContent = exportToCSV(result);
        filename = `export_${Date.now()}.csv`;
        mimeType = 'text/csv';
      } else if (exportFormat === 'json') {
        exportContent = JSON.stringify(result.rows, null, 2);
        filename = `export_${Date.now()}.json`;
        mimeType = 'application/json';
      } else if (exportFormat === 'geojson') {
        exportContent = exportToGeoJSON(result);
        filename = `export_${Date.now()}.geojson`;
        mimeType = 'application/json';
      }

      downloadFile(exportContent, filename, mimeType);
      toast.success('Export Complete', `Downloaded ${result.rows.length} records`);
    } catch (error: any) {
      toast.error('Export Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = (result: any): string => {
    if (result.rows.length === 0) return '';

    const headers = Object.keys(result.rows[0]);
    const csvLines = [headers.join(',')];

    result.rows.forEach((row: any) => {
      const values = headers.map(header => {
        const value = row[header];
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`;
        }
        return value;
      });
      csvLines.push(values.join(','));
    });

    return csvLines.join('\n');
  };

  const exportToGeoJSON = (result: any): string => {
    const features = result.rows.map((row: any) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [row.longitude || 0, row.latitude || 0],
      },
      properties: row,
    }));

    return JSON.stringify({
      type: 'FeatureCollection',
      features,
    }, null, 2);
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Create Table Functions
  const handleCreateTable = async () => {
    // Determine which schema to use
    const schemaToUse = isNewSchema ? customSchemaName : newTableSchema;

    if (!activeConnection || !newTableName || !schemaToUse) {
      toast.error('Missing Information', 'Please provide schema and table name');
      return;
    }

    setLoading(true);
    try {
      // If creating a new schema, create it first
      if (isNewSchema && customSchemaName) {
        try {
          const safeSchema = customSchemaName.replace(/"/g, '""');
          await activeConnection.client.query(`CREATE SCHEMA IF NOT EXISTS "${safeSchema}"`);
          toast.success('Schema Created', `Schema ${customSchemaName} created successfully`);
        } catch {
          // Schema might already exist — continue
        }
      }

      const columnDefs = newTableColumns.map(col => {
        return `${col.name} ${col.type}`;
      }).join(',\n  ');

      const query = `CREATE TABLE ${schemaToUse}.${newTableName} (
  ${columnDefs}
)`;

      await activeConnection.client.query(query);

      toast.success('Table Created', `Table ${schemaToUse}.${newTableName} created successfully`);
      setNewTableName('');
      setIsNewSchema(false);
      setCustomSchemaName('');
      setNewTableColumns([
        { name: 'id', type: 'TEXT', isGeo: false },
        { name: 'name', type: 'TEXT', isGeo: false },
        { name: 'location', type: 'GEO_POINT', isGeo: true },
      ]);
      if (onDataChange) onDataChange();
    } catch (error: any) {
      toast.error('Create Table Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const addColumn = () => {
    setNewTableColumns([...newTableColumns, { name: '', type: 'TEXT', isGeo: false }]);
  };

  const updateColumn = (index: number, field: 'name' | 'type', value: string) => {
    const updated = [...newTableColumns];
    updated[index][field] = value;
    if (field === 'type') {
      updated[index].isGeo = value.includes('GEO');
    }
    setNewTableColumns(updated);
  };

  const removeColumn = (index: number) => {
    setNewTableColumns(newTableColumns.filter((_, i) => i !== index));
  };

  const handleLoadTableColumns = (tableName: string) => {
    const schemaToUse = isNewSchema ? customSchemaName : newTableSchema;

    // Get columns for the selected table
    const tableColumns = columns.filter(
      c => c.schema === schemaToUse && c.table === tableName
    );

    // Convert to our format
    const columnList = tableColumns.map(col => ({
      name: col.name,
      type: col.type,
      isGeo: col.type.toLowerCase().includes('geo') ||
             col.type.toLowerCase().includes('point') ||
             col.type.toLowerCase().includes('shape')
    }));

    if (columnList.length > 0) {
      setNewTableColumns(columnList);
      toast.success('Columns Loaded', `Loaded ${columnList.length} columns from ${tableName}`);
    }
  };

  if (!activeConnection) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50/50 p-8 dark:border-gray-700 dark:bg-gray-800/50">
        <div className="text-center">
          <Database className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            No active database connection
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      {/* Header */}
      <div className="border-b border-gray-200 p-4 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Enterprise Data Management
        </h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Add, import, export data and create tables
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-4 px-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                    : 'border-transparent text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Table Selector (for add-data, import, export tabs) */}
        {activeTab !== 'create-table' && (
          <div className="mb-4">
            <TableColumnSelector
              onSelectionChange={setSelectedTable}
              showGeoColumnsOnly={false}
            />
          </div>
        )}

        {/* Add Data Tab */}
        {activeTab === 'add-data' && selectedTable && (
          <div className="space-y-4">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
              <p className="text-xs text-blue-800 dark:text-blue-300">
                Fill in the form below to add a new record to {selectedTable.fullTableName}
              </p>
            </div>

            {selectedTable.columns.map((column) => (
              <div key={column.name}>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {column.name}
                  {column.isGeo && ' 🌍'}
                  <span className="ml-2 text-xs text-gray-500">({column.type})</span>
                </label>
                <input
                  type="text"
                  value={formData[column.name] || ''}
                  onChange={(e) => handleFormChange(column.name, e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder={column.isGeo ? 'POINT(lng lat) e.g. POINT(-74.006 40.7128)' : `Enter ${column.name}...`}
                />
              </div>
            ))}

            <button
              onClick={handleAddData}
              disabled={loading || Object.keys(formData).length === 0}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Adding...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Add Record
                </>
              )}
            </button>
          </div>
        )}

        {/* Import Tab */}
        {activeTab === 'import' && selectedTable && (
          <div className="space-y-4">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
              <p className="text-xs text-blue-800 dark:text-blue-300">
                Import data into {selectedTable.fullTableName} in bulk
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Import Format
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(['csv', 'geojson', 'json'] as const).map((format) => (
                  <button
                    key={format}
                    onClick={() => setImportFormat(format)}
                    className={`rounded-lg border p-3 text-sm font-medium transition-colors ${
                      importFormat === format
                        ? 'border-blue-500 bg-blue-50 text-blue-900 dark:border-blue-400 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                    }`}
                  >
                    {format.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Paste Data
              </label>
              <textarea
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                rows={10}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder={`Paste ${importFormat.toUpperCase()} data here...`}
              />
            </div>

            <button
              onClick={handleImport}
              disabled={loading || !importData}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Import Data
                </>
              )}
            </button>
          </div>
        )}

        {/* Export Tab */}
        {activeTab === 'export' && selectedTable && (
          <div className="space-y-4">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
              <p className="text-xs text-blue-800 dark:text-blue-300">
                Export data from {selectedTable.fullTableName}
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Export Format
              </label>
              <div className="grid grid-cols-4 gap-3">
                {(['csv', 'json', 'geojson', 'excel'] as const).map((format) => (
                  <button
                    key={format}
                    onClick={() => setExportFormat(format)}
                    className={`rounded-lg border p-3 text-sm font-medium transition-colors ${
                      exportFormat === format
                        ? 'border-blue-500 bg-blue-50 text-blue-900 dark:border-blue-400 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                    }`}
                  >
                    {format.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Custom Query (optional)
              </label>
              <textarea
                value={exportQuery}
                onChange={(e) => setExportQuery(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder={`Leave empty to export all data, or enter custom query...\nExample: SELECT * FROM ${selectedTable.fullTableName} WHERE ...`}
              />
            </div>

            <button
              onClick={handleExport}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Export Data
                </>
              )}
            </button>
          </div>
        )}

        {/* Create Table Tab */}
        {activeTab === 'create-table' && (
          <div className="space-y-4">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
              <p className="text-xs text-blue-800 dark:text-blue-300">
                Create a new table with custom schema
              </p>
            </div>

            {isNewSchema && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
                <p className="text-xs text-blue-800 dark:text-blue-300">
                  ✨ Creating a new schema! The schema will be created first, then your table.
                </p>
              </div>
            )}

            {!isNewTable && selectedExistingTable && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20">
                <p className="text-xs text-green-800 dark:text-green-300">
                  📋 Columns loaded from <strong>{selectedExistingTable}</strong>. You can modify them below before creating the new table.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Schema
                </label>
                {!isNewSchema ? (
                  <select
                    value={newTableSchema}
                    onChange={(e) => {
                      if (e.target.value === '__NEW__') {
                        setIsNewSchema(true);
                        setCustomSchemaName('');
                      } else {
                        setNewTableSchema(e.target.value);
                        // Reset table selection when schema changes
                        setSelectedExistingTable('');
                        setNewTableName('');
                      }
                    }}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select schema...</option>
                    {existingSchemas.map(schema => (
                      <option key={schema} value={schema}>{schema}</option>
                    ))}
                    <option value="__NEW__" className="font-semibold text-blue-600">
                      + Add New Schema
                    </option>
                  </select>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customSchemaName}
                      onChange={(e) => setCustomSchemaName(e.target.value)}
                      placeholder="Enter new schema name..."
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      autoFocus
                    />
                    <button
                      onClick={() => {
                        setIsNewSchema(false);
                        setCustomSchemaName('');
                      }}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
                      title="Cancel"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Table Name
                  {isNewTable && (
                    <span className="ml-2 text-xs font-normal text-blue-600 dark:text-blue-400">
                      (New table)
                    </span>
                  )}
                  {!isNewTable && selectedExistingTable && (
                    <span className="ml-2 text-xs font-normal text-green-600 dark:text-green-400">
                      (Copying from {selectedExistingTable})
                    </span>
                  )}
                </label>
                {isNewTable ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customTableName}
                      onChange={(e) => {
                        setCustomTableName(e.target.value);
                        setNewTableName(e.target.value);
                      }}
                      placeholder="Enter new table name..."
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      autoFocus
                    />
                    <button
                      onClick={() => {
                        setIsNewTable(false);
                        setCustomTableName('');
                        setNewTableName('');
                        setSelectedExistingTable('');
                      }}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
                      title="Select existing table"
                    >
                      <Database className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <select
                      value={selectedExistingTable}
                      onChange={(e) => {
                        if (e.target.value === '__NEW__') {
                          setIsNewTable(true);
                          setCustomTableName('');
                          setNewTableName('');
                          setSelectedExistingTable('');
                          // Reset columns to defaults
                          setNewTableColumns([
                            { name: 'id', type: 'TEXT', isGeo: false },
                            { name: 'name', type: 'TEXT', isGeo: false },
                            { name: 'location', type: 'GEO_POINT', isGeo: true },
                          ]);
                        } else {
                          setSelectedExistingTable(e.target.value);
                          setNewTableName('');
                          if (e.target.value) {
                            handleLoadTableColumns(e.target.value);
                          }
                        }
                      }}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      disabled={!schemaToCheck}
                    >
                      <option value="">
                        {!schemaToCheck
                          ? 'Select schema first...'
                          : 'Select table or add new...'
                        }
                      </option>
                      {existingTablesInSchema.length > 0 && (
                        <optgroup label="Existing Tables">
                          {existingTablesInSchema.map(table => (
                            <option key={table} value={table}>📋 {table}</option>
                          ))}
                        </optgroup>
                      )}
                      <optgroup label="Create New">
                        <option value="__NEW__">➕ Add New Table</option>
                      </optgroup>
                    </select>
                    {selectedExistingTable && (
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        💡 Columns will be copied. Enter a new name below to create the table.
                      </p>
                    )}
                    {!schemaToCheck && (
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Select a schema first to see available tables
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* New Table Name Input (when copying from existing) */}
              {!isNewTable && selectedExistingTable && (
                <div className="col-span-2">
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    New Table Name
                  </label>
                  <input
                    type="text"
                    value={newTableName}
                    onChange={(e) => setNewTableName(e.target.value)}
                    placeholder="Enter name for new table..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    autoFocus
                  />
                </div>
              )}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Columns {selectedExistingTable && !isNewTable && (
                    <span className="ml-2 text-xs font-normal text-green-600 dark:text-green-400">
                      (from {selectedExistingTable})
                    </span>
                  )}
                </label>
                <button
                  onClick={addColumn}
                  className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  + Add Column
                </button>
              </div>

              <div className="space-y-2">
                {newTableColumns.map((column, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={column.name}
                      onChange={(e) => updateColumn(index, 'name', e.target.value)}
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      placeholder="column_name"
                    />
                    <select
                      value={column.type}
                      onChange={(e) => updateColumn(index, 'type', e.target.value)}
                      className="w-40 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    >
                      {geospatialConfig.tableCreation.supportedColumnTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => removeColumn(index)}
                      className="rounded-lg border border-red-300 p-2 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleCreateTable}
              disabled={loading || !newTableName || (!isNewSchema && !newTableSchema) || (isNewSchema && !customSchemaName)}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  {isNewSchema ? 'Creating Schema & Table...' : 'Creating...'}
                </>
              ) : (
                <>
                  <TableIcon className="h-4 w-4" />
                  {isNewSchema ? 'Create Schema & Table' : 'Create Table'}
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
