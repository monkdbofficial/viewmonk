'use client';

import { useState, useRef, useEffect } from 'react';
import { Upload, Table, FileSpreadsheet, FileCode, Plus, X, Download, CheckCircle, AlertCircle, Database, FileText, Sparkles, Play, Copy } from 'lucide-react';

export interface TableColumn {
  name: string;
  type: string;
  nullable: boolean;
  default_value?: string;
  is_primary_key?: boolean;
  is_auto_increment?: boolean;
}

export interface TableSchema {
  schema: string;
  table: string;
  columns: TableColumn[];
}

export interface ImportRecord {
  [key: string]: any;
}

interface DataImportPanelProps {
  availableTables?: { schema: string; table: string }[];
  onFetchSchema?: (schema: string, table: string) => Promise<TableColumn[]>;
  onImportData?: (schema: string, table: string, records: ImportRecord[]) => Promise<{ success: number; errors: number }>;
  onExecuteSQL?: (sql: string) => Promise<any>;
}

export default function DataImportPanel({
  availableTables = [],
  onFetchSchema,
  onImportData,
  onExecuteSQL,
}: DataImportPanelProps) {
  const [showPanel, setShowPanel] = useState(false);
  const [selectedSchema, setSelectedSchema] = useState<string>('');
  const [selectedTable, setSelectedTable] = useState<{ schema: string; table: string } | null>(null);
  const [tableSchema, setTableSchema] = useState<TableColumn[]>([]);
  const [importMode, setImportMode] = useState<'form' | 'csv' | 'excel' | 'sql'>('form');
  const [formData, setFormData] = useState<ImportRecord>({});
  const [importRecords, setImportRecords] = useState<ImportRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; errors: number } | null>(null);
  const [sqlPreview, setSqlPreview] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close panel when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setShowPanel(false);
      }
    }

    if (showPanel) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showPanel]);

  // Fetch table schema when table is selected
  useEffect(() => {
    if (selectedTable && onFetchSchema) {
      setLoading(true);
      onFetchSchema(selectedTable.schema, selectedTable.table)
        .then((columns) => {
          setTableSchema(columns);
          // Initialize form data with defaults
          const defaults: ImportRecord = {};
          columns.forEach((col) => {
            if (!col.is_auto_increment) {
              defaults[col.name] = col.default_value || '';
            }
          });
          setFormData(defaults);
        })
        .catch((err) => {
          console.error('Failed to fetch schema:', err);
          alert('Failed to fetch table schema');
        })
        .finally(() => setLoading(false));
    }
  }, [selectedTable, onFetchSchema]);

  const getTypeIcon = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('int') || lowerType.includes('serial') || lowerType.includes('number')) {
      return '🔢';
    } else if (lowerType.includes('char') || lowerType.includes('text') || lowerType.includes('varchar')) {
      return '📝';
    } else if (lowerType.includes('bool')) {
      return '✓';
    } else if (lowerType.includes('date') || lowerType.includes('time')) {
      return '📅';
    } else if (lowerType.includes('float') || lowerType.includes('decimal') || lowerType.includes('numeric')) {
      return '💯';
    } else if (lowerType.includes('json')) {
      return '{ }';
    }
    return '•';
  };

  const getInputType = (columnType: string): string => {
    const lowerType = columnType.toLowerCase();
    if (lowerType.includes('int') || lowerType.includes('serial') || lowerType.includes('number')) {
      return 'number';
    } else if (lowerType.includes('bool')) {
      return 'checkbox';
    } else if (lowerType.includes('date') && !lowerType.includes('time')) {
      return 'date';
    } else if (lowerType.includes('time') && !lowerType.includes('stamp')) {
      return 'time';
    } else if (lowerType.includes('timestamp') || lowerType.includes('datetime')) {
      return 'datetime-local';
    } else if (lowerType.includes('email')) {
      return 'email';
    } else if (lowerType.includes('url')) {
      return 'url';
    } else if (lowerType.includes('text') || lowerType.includes('json')) {
      return 'textarea';
    }
    return 'text';
  };

  const handleFormChange = (columnName: string, value: any) => {
    setFormData({ ...formData, [columnName]: value });
  };

  const handleAddRecord = () => {
    // Validate required fields
    const missingFields = tableSchema
      .filter((col) => !col.nullable && !col.is_auto_increment && !formData[col.name])
      .map((col) => col.name);

    if (missingFields.length > 0) {
      alert(`Missing required fields: ${missingFields.join(', ')}`);
      return;
    }

    setImportRecords([...importRecords, { ...formData }]);

    // Reset form
    const defaults: ImportRecord = {};
    tableSchema.forEach((col) => {
      if (!col.is_auto_increment) {
        defaults[col.name] = col.default_value || '';
      }
    });
    setFormData(defaults);
  };

  const handleRemoveRecord = (index: number) => {
    setImportRecords(importRecords.filter((_, i) => i !== index));
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);

    try {
      if (file.name.endsWith('.csv')) {
        const text = await file.text();
        const records = parseCSV(text);
        setImportRecords(records);
        setImportMode('csv');
      } else if (file.name.endsWith('.json')) {
        const text = await file.text();
        const records = JSON.parse(text);
        setImportRecords(Array.isArray(records) ? records : [records]);
        setImportMode('csv');
      } else if (file.name.endsWith('.sql')) {
        const text = await file.text();
        setSqlPreview(text);
        setImportMode('sql');
      } else {
        alert('Unsupported file format. Use CSV, JSON, or SQL files.');
      }
    } catch (err) {
      console.error('File upload error:', err);
      alert('Failed to parse file');
    } finally {
      setLoading(false);
    }
  };

  const parseCSV = (text: string): ImportRecord[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map((h) => h.trim());
    const records: ImportRecord[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim());
      const record: ImportRecord = {};
      headers.forEach((header, idx) => {
        record[header] = values[idx] || '';
      });
      records.push(record);
    }

    return records;
  };

  const generateInsertSQL = (): string => {
    if (!selectedTable || importRecords.length === 0) return '';

    const tableName = `${selectedTable.schema}.${selectedTable.table}`;
    const columns = Object.keys(importRecords[0]);

    let sql = `-- Insert ${importRecords.length} record(s) into ${tableName}\n\n`;

    importRecords.forEach((record, idx) => {
      const values = columns.map((col) => {
        const value = record[col];
        if (value === null || value === undefined || value === '') {
          return 'NULL';
        }
        const colSchema = tableSchema.find((c) => c.name === col);
        const colType = colSchema?.type.toLowerCase() || '';

        if (colType.includes('int') || colType.includes('numeric') || colType.includes('float') || colType.includes('decimal')) {
          return value;
        } else if (colType.includes('bool')) {
          return value ? 'TRUE' : 'FALSE';
        } else {
          return `'${String(value).replace(/'/g, "''")}'`;
        }
      });

      sql += `INSERT INTO ${tableName} (${columns.join(', ')})\n`;
      sql += `VALUES (${values.join(', ')});\n`;

      if (idx < importRecords.length - 1) {
        sql += '\n';
      }
    });

    return sql;
  };

  const handleImport = async () => {
    if (!selectedTable) {
      alert('Please select a table first');
      return;
    }

    if (importMode === 'sql' && sqlPreview && onExecuteSQL) {
      setLoading(true);
      try {
        await onExecuteSQL(sqlPreview);
        setImportResult({ success: 1, errors: 0 });
        alert('SQL executed successfully');
      } catch (err) {
        console.error('SQL execution error:', err);
        alert('Failed to execute SQL');
        setImportResult({ success: 0, errors: 1 });
      } finally {
        setLoading(false);
      }
      return;
    }

    if (importRecords.length === 0) {
      alert('No records to import. Add records or upload a file.');
      return;
    }

    if (onImportData) {
      setLoading(true);
      try {
        const result = await onImportData(selectedTable.schema, selectedTable.table, importRecords);
        setImportResult(result);

        if (result.errors === 0) {
          alert(`Successfully imported ${result.success} record(s)!`);
          setImportRecords([]);
        } else {
          alert(`Imported ${result.success} record(s) with ${result.errors} error(s)`);
        }
      } catch (err) {
        console.error('Import error:', err);
        alert('Failed to import data');
      } finally {
        setLoading(false);
      }
    }
  };

  const exportTemplate = () => {
    if (tableSchema.length === 0) {
      alert('Please select a table first');
      return;
    }

    const headers = tableSchema
      .filter((col) => !col.is_auto_increment)
      .map((col) => col.name)
      .join(',');

    const csv = headers + '\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedTable?.table}_template.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Import Button - Icon Only */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className={`group relative p-2.5 rounded-lg border transition-all shadow-sm hover:shadow-md ${
          importRecords.length > 0
            ? 'border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-300'
            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
        }`}
        title="Import Data"
      >
        <Upload className="h-4 w-4" />
        {importRecords.length > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-green-600 to-emerald-600 text-xs font-bold text-white shadow-lg">
            {importRecords.length > 99 ? '99+' : importRecords.length}
          </span>
        )}
        <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
          Import Data {importRecords.length > 0 && `(${importRecords.length})`}
        </span>
      </button>

      {/* Data Import Panel */}
      {showPanel && (
        <div className="absolute right-0 top-full mt-3 w-[1000px] rounded-2xl border border-gray-200/50 bg-white/95 backdrop-blur-xl shadow-2xl dark:border-gray-700/50 dark:bg-gray-800/95 max-h-[750px] overflow-hidden flex flex-col" style={{ zIndex: 9999 }}>
          {/* Header */}
          <div className="border-b border-gray-200 dark:border-gray-700/50 bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 dark:from-gray-900 dark:via-gray-850 dark:to-gray-900 px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-green-600 to-emerald-600 shadow-lg">
                  <Upload className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Smart Data Import & Insert
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                    Auto-generated forms • CSV/Excel/SQL import • Batch insert
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPanel(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Schema & Table Selection - Two Step */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                1. Select Schema
              </label>
              <select
                value={selectedSchema}
                onChange={(e) => {
                  setSelectedSchema(e.target.value);
                  setSelectedTable(null);
                  setImportRecords([]);
                  setImportResult(null);
                }}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-green-500"
              >
                <option value="">-- Choose a schema --</option>
                {[...new Set(availableTables.map(t => t.schema))].map((schema) => (
                  <option key={schema} value={schema}>
                    {schema} ({availableTables.filter(t => t.schema === schema).length} tables)
                  </option>
                ))}
              </select>

              {selectedSchema && (
                <div className="mt-4">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    2. Select Table from "{selectedSchema}" schema
                  </label>
                  <select
                    value={selectedTable?.table || ''}
                    onChange={(e) => {
                      if (e.target.value) {
                        setSelectedTable({ schema: selectedSchema, table: e.target.value });
                      } else {
                        setSelectedTable(null);
                      }
                      setImportRecords([]);
                      setImportResult(null);
                    }}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">-- Choose a table --</option>
                    {availableTables
                      .filter(t => t.schema === selectedSchema)
                      .map((t) => (
                        <option key={t.table} value={t.table}>
                          {t.table}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {availableTables.length > 0 && (
                <p className="mt-3 text-xs text-gray-600 dark:text-gray-400">
                  💾 {availableTables.length} table(s) available across {[...new Set(availableTables.map(t => t.schema))].length} schema(s)
                  {availableTables.some(t => t.schema === 'public' && t.table === 'sensors') && (
                    <span className="ml-2 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-semibold">
                      ⚠️ Demo Tables - Connect DB for real tables
                    </span>
                  )}
                </p>
              )}
            </div>

            {/* Table Schema Display */}
            {selectedTable && tableSchema.length > 0 && (
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                    Table Schema: {selectedTable.schema}.{selectedTable.table}
                  </h4>
                  <button
                    onClick={exportTemplate}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg font-semibold transition-all"
                  >
                    <Download className="h-3.5 w-3.5" />
                    CSV Template
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                  {tableSchema.map((col) => (
                    <div
                      key={col.name}
                      className="flex items-center gap-2 text-xs bg-white dark:bg-gray-800 rounded px-2 py-1.5"
                    >
                      <span className="text-base">{getTypeIcon(col.type)}</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{col.name}</span>
                      <span className="text-gray-500 dark:text-gray-400">({col.type})</span>
                      {!col.nullable && <span className="text-red-600 dark:text-red-400">*</span>}
                      {col.is_primary_key && <span className="text-blue-600 dark:text-blue-400 text-xs">PK</span>}
                      {col.is_auto_increment && <span className="text-purple-600 dark:text-purple-400 text-xs">AUTO</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Import Mode Selection */}
            {selectedTable && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Import Method
                </label>
                <div className="grid grid-cols-4 gap-3">
                  <button
                    onClick={() => setImportMode('form')}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      importMode === 'form'
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600'
                    }`}
                  >
                    <Plus className="h-5 w-5 text-green-600 dark:text-green-400 mb-2" />
                    <div className="text-sm font-bold text-gray-900 dark:text-white">Manual Form</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Add records one by one</div>
                  </button>

                  <button
                    onClick={() => {
                      setImportMode('csv');
                      fileInputRef.current?.click();
                    }}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      importMode === 'csv'
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600'
                    }`}
                  >
                    <FileSpreadsheet className="h-5 w-5 text-blue-600 dark:text-blue-400 mb-2" />
                    <div className="text-sm font-bold text-gray-900 dark:text-white">CSV/JSON</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Upload bulk data</div>
                  </button>

                  <button
                    onClick={() => {
                      setImportMode('excel');
                      fileInputRef.current?.click();
                    }}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      importMode === 'excel'
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600'
                    }`}
                  >
                    <Table className="h-5 w-5 text-purple-600 dark:text-purple-400 mb-2" />
                    <div className="text-sm font-bold text-gray-900 dark:text-white">Excel</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Import spreadsheet</div>
                  </button>

                  <button
                    onClick={() => {
                      setImportMode('sql');
                      fileInputRef.current?.click();
                    }}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      importMode === 'sql'
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600'
                    }`}
                  >
                    <FileCode className="h-5 w-5 text-orange-600 dark:text-orange-400 mb-2" />
                    <div className="text-sm font-bold text-gray-900 dark:text-white">SQL File</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Execute SQL</div>
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.json,.sql"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            )}

            {/* Manual Form Mode */}
            {importMode === 'form' && selectedTable && tableSchema.length > 0 && (
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-5">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Add New Record</h4>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {tableSchema
                    .filter((col) => !col.is_auto_increment)
                    .map((col) => {
                      const inputType = getInputType(col.type);

                      return (
                        <div key={col.name}>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-400 mb-1">
                            {getTypeIcon(col.type)} {col.name}
                            {!col.nullable && <span className="text-red-600 ml-1">*</span>}
                          </label>

                          {inputType === 'textarea' ? (
                            <textarea
                              value={formData[col.name] || ''}
                              onChange={(e) => handleFormChange(col.name, e.target.value)}
                              placeholder={col.default_value || `Enter ${col.name}`}
                              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:ring-2 focus:ring-green-500"
                              rows={2}
                            />
                          ) : inputType === 'checkbox' ? (
                            <input
                              type="checkbox"
                              checked={!!formData[col.name]}
                              onChange={(e) => handleFormChange(col.name, e.target.checked)}
                              className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                            />
                          ) : (
                            <input
                              type={inputType}
                              value={formData[col.name] || ''}
                              onChange={(e) => handleFormChange(col.name, e.target.value)}
                              placeholder={col.default_value || `Enter ${col.name}`}
                              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:ring-2 focus:ring-green-500"
                            />
                          )}
                        </div>
                      );
                    })}
                </div>
                <button
                  onClick={handleAddRecord}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg text-sm font-semibold transition-all"
                >
                  <Plus className="h-4 w-4" />
                  Add Record to Batch
                </button>
              </div>
            )}

            {/* SQL Preview Mode */}
            {importMode === 'sql' && sqlPreview && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    SQL Preview
                  </label>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(sqlPreview);
                      alert('SQL copied to clipboard!');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded-lg font-semibold transition-all"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </button>
                </div>
                <pre className="p-4 rounded-xl bg-gray-900 dark:bg-black text-green-400 text-xs font-mono overflow-x-auto border border-gray-700 max-h-64">
                  {sqlPreview}
                </pre>
              </div>
            )}

            {/* Import Records Preview */}
            {importRecords.length > 0 && importMode !== 'sql' && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Records to Import ({importRecords.length})
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const sql = generateInsertSQL();
                        navigator.clipboard.writeText(sql);
                        alert('SQL copied to clipboard!');
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded-lg font-semibold transition-all"
                    >
                      <FileCode className="h-3.5 w-3.5" />
                      Generate SQL
                    </button>
                    <button
                      onClick={() => setImportRecords([])}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg font-semibold transition-all"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 overflow-hidden">
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-100 dark:bg-gray-800 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold">#</th>
                          {Object.keys(importRecords[0] || {}).slice(0, 5).map((key) => (
                            <th key={key} className="px-3 py-2 text-left font-semibold">{key}</th>
                          ))}
                          <th className="px-3 py-2 text-right font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importRecords.map((record, idx) => (
                          <tr key={idx} className="border-t border-gray-200 dark:border-gray-700">
                            <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
                            {Object.keys(record).slice(0, 5).map((key) => (
                              <td key={key} className="px-3 py-2 text-gray-900 dark:text-white">
                                {String(record[key]).substring(0, 30)}
                                {String(record[key]).length > 30 && '...'}
                              </td>
                            ))}
                            <td className="px-3 py-2 text-right">
                              <button
                                onClick={() => handleRemoveRecord(idx)}
                                className="text-red-600 hover:text-red-800 dark:text-red-400"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Import Result */}
            {importResult && (
              <div className={`rounded-xl border p-4 ${
                importResult.errors === 0
                  ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                  : 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20'
              }`}>
                <div className="flex items-center gap-3">
                  {importResult.errors === 0 ? (
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  )}
                  <div>
                    <div className="text-sm font-bold text-gray-900 dark:text-white">
                      Import Complete
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                      {importResult.success} successful • {importResult.errors} errors
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="border-t border-gray-200 dark:border-gray-700/50 p-6 bg-gray-50 dark:bg-gray-900/50 flex gap-3">
            <button
              onClick={handleImport}
              disabled={loading || (!importRecords.length && !sqlPreview)}
              className="flex-1 flex items-center justify-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Importing...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Import {importRecords.length || 'Data'}
                </>
              )}
            </button>
            <button
              onClick={() => setShowPanel(false)}
              className="px-6 py-3.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
