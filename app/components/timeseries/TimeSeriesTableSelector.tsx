'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Database, Table, Columns, Search, X, ChevronDown, Check, Clock } from 'lucide-react';
import { useSchemaMetadata } from '@/app/lib/hooks/useSchemaMetadata';
import SearchableSelect from '../common/SearchableSelect';

interface TimeSeriesTableSelectorProps {
  onSelectionChange: (selection: TimeSeriesTableSelection | null) => void;
  initialTable?: string;
}

export interface TimeSeriesTableSelection {
  schema: string;
  table: string;
  fullTableName: string;
  allColumns: ColumnInfo[];
  timestampColumns: ColumnInfo[];
  numericColumns: ColumnInfo[];
  textColumns: ColumnInfo[];
  selectedTimestamp: string | null;
  selectedMetrics: string[];
}

interface ColumnInfo {
  name: string;
  type: string;
  category: 'timestamp' | 'number' | 'text' | 'other';
}

export default function TimeSeriesTableSelector({
  onSelectionChange,
  initialTable = '',
}: TimeSeriesTableSelectorProps) {
  const { tables, columns, loading } = useSchemaMetadata();

  const [selectedSchema, setSelectedSchema] = useState<string>('');
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [selectedTimestamp, setSelectedTimestamp] = useState<string | null>(null);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [showMetricPicker, setShowMetricPicker] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const metricPickerRef = useRef<HTMLDivElement>(null);
  const lastEmittedRef = useRef<string>('');

  // Categorize column types
  const categorizeColumn = (type: string): 'timestamp' | 'number' | 'text' | 'other' => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('timestamp') || lowerType.includes('date') || lowerType.includes('time')) {
      return 'timestamp';
    } else if (lowerType.includes('int') || lowerType.includes('float') || lowerType.includes('double') ||
               lowerType.includes('numeric') || lowerType.includes('decimal') || lowerType.includes('real')) {
      return 'number';
    } else if (lowerType.includes('char') || lowerType.includes('text') || lowerType.includes('string')) {
      return 'text';
    }
    return 'other';
  };

  // Extract schemas from tables
  const schemas = [...new Set(tables.map(t => t.schema))].sort();

  // Get tables for selected schema
  const tablesForSchema = tables
    .filter(t => !selectedSchema || t.schema === selectedSchema)
    .map(t => ({ schema: t.schema, name: t.name, fullName: `${t.schema}.${t.name}` }));

  // Get columns for selected table (memoized to prevent infinite loops)
  const columnsForTable = useMemo(() => {
    return columns
      .filter(c => {
        if (!selectedSchema || !selectedTable) return false;
        return c.schema === selectedSchema && c.table === selectedTable;
      })
      .map(c => ({
        name: c.name,
        type: c.type,
        category: categorizeColumn(c.type),
      }));
  }, [columns, selectedSchema, selectedTable]);

  // Categorize columns (memoized)
  const timestampColumns = useMemo(() => columnsForTable.filter(c => c.category === 'timestamp'), [columnsForTable]);
  const numericColumns = useMemo(() => columnsForTable.filter(c => c.category === 'number'), [columnsForTable]);
  const textColumns = useMemo(() => columnsForTable.filter(c => c.category === 'text'), [columnsForTable]);

  // Auto-select first timestamp column if only one exists
  useEffect(() => {
    if (timestampColumns.length === 1 && !selectedTimestamp) {
      setSelectedTimestamp(timestampColumns[0].name);
    }
  }, [timestampColumns, selectedTimestamp]);

  // Auto-select first numeric column if available
  useEffect(() => {
    if (numericColumns.length > 0 && selectedMetrics.length === 0) {
      setSelectedMetrics([numericColumns[0].name]);
    }
  }, [numericColumns, selectedMetrics.length]);

  // Parse initial table
  useEffect(() => {
    if (initialTable && initialTable.includes('.')) {
      const [schema, table] = initialTable.split('.');
      setSelectedSchema(schema);
      setSelectedTable(table);
    }
  }, [initialTable]);

  // Close metric picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (metricPickerRef.current && !metricPickerRef.current.contains(event.target as Node)) {
        setShowMetricPicker(false);
      }
    };

    if (showMetricPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMetricPicker]);

  // Emit selection changes (with deduplication to prevent infinite loops)
  useEffect(() => {
    const currentKey = `${selectedSchema}.${selectedTable}|${selectedTimestamp}|${selectedMetrics.join(',')}`;

    if (selectedSchema && selectedTable && selectedTimestamp && selectedMetrics.length > 0) {
      // Only emit if the selection actually changed
      if (lastEmittedRef.current !== currentKey) {
        lastEmittedRef.current = currentKey;
        onSelectionChange({
          schema: selectedSchema,
          table: selectedTable,
          fullTableName: `${selectedSchema}.${selectedTable}`,
          allColumns: columnsForTable,
          timestampColumns,
          numericColumns,
          textColumns,
          selectedTimestamp,
          selectedMetrics,
        });
      }
    } else if (!selectedTable && lastEmittedRef.current !== 'null') {
      lastEmittedRef.current = 'null';
      onSelectionChange(null);
    }
  }, [selectedSchema, selectedTable, selectedTimestamp, selectedMetrics, columnsForTable, timestampColumns, numericColumns, textColumns, onSelectionChange]);

  const handleSchemaChange = (schema: string) => {
    setSelectedSchema(schema);
    setSelectedTable('');
    setSelectedTimestamp(null);
    setSelectedMetrics([]);
  };

  const handleTableChange = (tableName: string) => {
    setSelectedTable(tableName);
    setSelectedTimestamp(null);
    setSelectedMetrics([]);
  };

  const toggleMetric = (metricName: string) => {
    setSelectedMetrics(prev => {
      if (prev.includes(metricName)) {
        return prev.filter(c => c !== metricName);
      } else {
        return [...prev, metricName];
      }
    });
  };

  const selectAllMetrics = () => {
    setSelectedMetrics(numericColumns.map(c => c.name));
  };

  const deselectAllMetrics = () => {
    setSelectedMetrics([]);
  };

  // Filter metrics based on search (memoized)
  const filteredMetrics = useMemo(() => {
    return numericColumns.filter(c =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.type.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [numericColumns, searchTerm]);

  return (
    <div className="space-y-4 relative z-10">
      {/* Schema and Table Selection */}
      <div className="grid grid-cols-2 gap-4 relative">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            <Database className="mb-1 inline h-4 w-4" /> Schema
          </label>
          <SearchableSelect
            value={selectedSchema}
            onChange={handleSchemaChange}
            options={schemas}
            placeholder="Select schema..."
            loading={loading}
            onClear={() => handleSchemaChange('')}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            <Table className="mb-1 inline h-4 w-4" /> Table
          </label>
          <SearchableSelect
            value={selectedTable}
            onChange={handleTableChange}
            options={tablesForSchema.map(t => t.name)}
            placeholder={selectedSchema ? 'Select table...' : 'Select schema first'}
            disabled={!selectedSchema}
            loading={loading}
            onClear={() => handleTableChange('')}
          />
        </div>
      </div>

      {/* Timestamp Column Selection */}
      {selectedTable && timestampColumns.length > 0 && (
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            <Clock className="mb-1 inline h-4 w-4" /> Timestamp Column (X-Axis)
          </label>
          <SearchableSelect
            value={selectedTimestamp || ''}
            onChange={setSelectedTimestamp}
            options={timestampColumns.map(c => c.name)}
            placeholder="Select timestamp column..."
            onClear={() => setSelectedTimestamp(null)}
          />
          {timestampColumns.length === 1 && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Auto-selected the only timestamp column
            </p>
          )}
        </div>
      )}

      {/* No Timestamp Column Warning */}
      {selectedTable && timestampColumns.length === 0 && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-900/20">
          <p className="text-sm text-yellow-800 dark:text-yellow-300">
            <strong>Warning:</strong> No timestamp columns found in this table. Time series analysis requires a timestamp column.
          </p>
        </div>
      )}

      {/* Metric Columns Selection */}
      {selectedTable && numericColumns.length > 0 && (
        <div className="relative" ref={metricPickerRef}>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              <Columns className="mb-1 inline h-4 w-4" /> Metric Columns (Y-Axis) - {selectedMetrics.length} selected
            </label>
            <div className="flex gap-2">
              <button
                onClick={selectAllMetrics}
                className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Select All
              </button>
              <button
                onClick={deselectAllMetrics}
                className="text-xs text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Metric Picker Button */}
          <button
            onClick={() => setShowMetricPicker(!showMetricPicker)}
            className="flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm hover:border-gray-400 dark:border-gray-600 dark:bg-gray-700 dark:hover:border-gray-500"
          >
            <span className="text-gray-700 dark:text-gray-300">
              {selectedMetrics.length > 0
                ? `${selectedMetrics.length} metric${selectedMetrics.length > 1 ? 's' : ''} selected`
                : 'Select metrics...'}
            </span>
            <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${showMetricPicker ? 'rotate-180' : ''}`} />
          </button>

          {/* Metric Picker Dropdown */}
          {showMetricPicker && (
            <div className="absolute z-50 mt-2 w-full rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
              {/* Search */}
              <div className="border-b border-gray-200 p-3 dark:border-gray-700">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search metrics..."
                    className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Metric List */}
              <div className="max-h-64 overflow-y-auto p-2">
                {filteredMetrics.length > 0 ? (
                  <div className="space-y-1">
                    {filteredMetrics.map((metric) => (
                      <label
                        key={metric.name}
                        className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <input
                          type="checkbox"
                          checked={selectedMetrics.includes(metric.name)}
                          onChange={() => toggleMetric(metric.name)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {metric.name}
                            </span>
                            <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-300">
                              NUMERIC
                            </span>
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {metric.type}
                          </span>
                        </div>
                        {selectedMetrics.includes(metric.name) && (
                          <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        )}
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    No metrics found matching "{searchTerm}"
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Selected Metrics Preview */}
          {selectedMetrics.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedMetrics.map((metricName) => {
                const metric = numericColumns.find(c => c.name === metricName);
                return (
                  <span
                    key={metricName}
                    className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                  >
                    {metricName}
                    <button
                      onClick={() => toggleMetric(metricName)}
                      className="ml-1 hover:text-blue-900 dark:hover:text-blue-200"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* No Numeric Columns Warning */}
      {selectedTable && numericColumns.length === 0 && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-900/20">
          <p className="text-sm text-yellow-800 dark:text-yellow-300">
            <strong>Warning:</strong> No numeric columns found in this table. Time series analysis requires numeric data to visualize.
          </p>
        </div>
      )}

      {/* Summary */}
      {selectedTable && selectedTimestamp && selectedMetrics.length > 0 && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
          <p className="text-xs text-blue-800 dark:text-blue-300">
            <strong>Selection:</strong> {selectedSchema}.{selectedTable}
            <br />
            <strong>Time:</strong> {selectedTimestamp} | <strong>Metrics:</strong> {selectedMetrics.join(', ')}
          </p>
        </div>
      )}

      {/* Table Info */}
      {selectedTable && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            <strong>Table Info:</strong> {columnsForTable.length} total columns |
            {timestampColumns.length} timestamp |
            {numericColumns.length} numeric |
            {textColumns.length} text
          </p>
        </div>
      )}
    </div>
  );
}
