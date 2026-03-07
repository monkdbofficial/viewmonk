'use client';

import { useState, useEffect, useMemo } from 'react';
import { Database, Table, Columns, Search, X, ChevronDown, Check } from 'lucide-react';
import { useSchemaMetadata } from '@/app/lib/hooks/useSchemaMetadata';
import SearchableSelect from '../common/SearchableSelect';

interface TableColumnSelectorProps {
  onSelectionChange: (selection: TableColumnSelection) => void;
  initialTable?: string;
  initialColumns?: string[];
  showGeoColumnsOnly?: boolean;
  compact?: boolean;
}

export interface TableColumnSelection {
  schema: string;
  table: string;
  fullTableName: string;
  columns: ColumnInfo[];
  geoColumn: string | null;
}

interface ColumnInfo {
  name: string;
  type: string;
  isGeo: boolean;
}

export default function TableColumnSelector({
  onSelectionChange,
  initialTable = '',
  initialColumns = [],
  showGeoColumnsOnly = false,
  compact = false,
}: TableColumnSelectorProps) {
  const { tables, columns, loading } = useSchemaMetadata();

  const [selectedSchema, setSelectedSchema] = useState<string>('');
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [selectedColumns, setSelectedColumns] = useState<string[]>(initialColumns);
  const [geoColumn, setGeoColumn] = useState<string | null>(null);
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateTableModal, setShowCreateTableModal] = useState(false);

  // Helper function to check if a column type is geospatial
  const isGeoType = (type: string): boolean => {
    const lowerType = type.toLowerCase();
    return lowerType.includes('geo') || lowerType.includes('point') || lowerType.includes('shape');
  };

  // Extract schemas from tables
  const schemas = [...new Set(tables.map(t => t.schema))].sort();

  // Get tables for selected schema
  const tablesForSchema = tables
    .filter(t => !selectedSchema || t.schema === selectedSchema)
    .map(t => ({ schema: t.schema, name: t.name, fullName: `${t.schema}.${t.name}` }));

  // Get columns for selected table (memoized to prevent effect loops from reference changes)
  const columnsForTable = useMemo(() => columns
    .filter(c => {
      if (!selectedSchema || !selectedTable) return false;
      const matchesTable = c.schema === selectedSchema && c.table === selectedTable;
      if (!matchesTable) return false;

      // In compact mode, always get ALL columns (not just geo columns)
      // In normal mode, respect showGeoColumnsOnly flag
      if (showGeoColumnsOnly && !compact) {
        const lowerType = c.type.toLowerCase();
        return lowerType.includes('geo') || lowerType.includes('point') || lowerType.includes('shape');
      }

      return true;
    })
    .map(c => ({
      name: c.name,
      type: c.type,
      isGeo: isGeoType(c.type),
    })), [columns, selectedSchema, selectedTable, showGeoColumnsOnly, compact]);

  // Auto-select geo column if only one exists
  useEffect(() => {
    const geoColumns = columnsForTable.filter(c => c.isGeo);
    if (geoColumns.length === 1) {
      setGeoColumn(geoColumns[0].name);
    }
  }, [columnsForTable]);

  // In compact mode, auto-select all columns when table changes
  useEffect(() => {
    if (compact && columnsForTable.length > 0 && selectedColumns.length === 0) {
      setSelectedColumns(columnsForTable.map(c => c.name));
    }
  }, [compact, columnsForTable, selectedColumns.length]);

  // Parse initial table
  useEffect(() => {
    if (initialTable && initialTable.includes('.')) {
      const [schema, table] = initialTable.split('.');
      setSelectedSchema(schema);
      setSelectedTable(table);
    }
  }, [initialTable]);

  // Emit selection changes
  useEffect(() => {
    if (selectedSchema && selectedTable && selectedColumns.length > 0) {
      onSelectionChange({
        schema: selectedSchema,
        table: selectedTable,
        fullTableName: `${selectedSchema}.${selectedTable}`,
        columns: selectedColumns.map(name => {
          const col = columnsForTable.find(c => c.name === name);
          return col || { name, type: 'TEXT', isGeo: false };
        }),
        geoColumn,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSchema, selectedTable, selectedColumns, geoColumn]);

  const handleSchemaChange = (schema: string) => {
    setSelectedSchema(schema);
    setSelectedTable('');
    setSelectedColumns([]);
    setGeoColumn(null);
  };

  const handleTableChange = (tableName: string) => {
    setSelectedTable(tableName);
    setSelectedColumns([]);
    setGeoColumn(null);
  };

  const toggleColumn = (columnName: string) => {
    setSelectedColumns(prev => {
      if (prev.includes(columnName)) {
        return prev.filter(c => c !== columnName);
      } else {
        return [...prev, columnName];
      }
    });
  };

  const selectAllColumns = () => {
    setSelectedColumns(columnsForTable.map(c => c.name));
  };

  const deselectAllColumns = () => {
    setSelectedColumns([]);
  };

  const filteredColumns = columnsForTable.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Compact inline version for map control bar
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <SearchableSelect
          value={selectedSchema}
          onChange={handleSchemaChange}
          options={schemas}
          placeholder="Schema"
          loading={loading}
          onClear={() => handleSchemaChange('')}
        />
        <SearchableSelect
          value={selectedTable}
          onChange={handleTableChange}
          options={tablesForSchema.map(t => t.name)}
          placeholder="Table"
          disabled={!selectedSchema}
          loading={loading}
          onClear={() => handleTableChange('')}
        />
        {(() => {
          const geoOptions = columnsForTable.filter(c => c.isGeo).map(c => c.name);
          // Only show the picker when there are 2+ geo columns — single geo col is auto-selected
          return showGeoColumnsOnly && selectedTable && geoOptions.length > 1 ? (
            <SearchableSelect
              value={geoColumn || ''}
              onChange={setGeoColumn}
              options={geoOptions}
              placeholder="Geo Column"
              loading={loading}
              onClear={() => setGeoColumn(null)}
            />
          ) : null;
        })()}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Schema and Table Selection */}
      <div className="grid grid-cols-2 gap-4">
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

      {/* Column Selection */}
      {selectedTable && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              <Columns className="mb-1 inline h-4 w-4" /> Columns ({selectedColumns.length} selected)
            </label>
            <div className="flex gap-2">
              <button
                onClick={selectAllColumns}
                className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Select All
              </button>
              <button
                onClick={deselectAllColumns}
                className="text-xs text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Column Picker Button */}
          <button
            onClick={() => setShowColumnPicker(!showColumnPicker)}
            className="flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm hover:border-gray-400 dark:border-gray-600 dark:bg-gray-700 dark:hover:border-gray-500"
          >
            <span className="text-gray-700 dark:text-gray-300">
              {selectedColumns.length > 0
                ? `${selectedColumns.length} column${selectedColumns.length > 1 ? 's' : ''} selected`
                : 'Select columns...'}
            </span>
            <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${showColumnPicker ? 'rotate-180' : ''}`} />
          </button>

          {/* Column Picker Dropdown */}
          {showColumnPicker && (
            <div className="mt-2 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
              {/* Search */}
              <div className="border-b border-gray-200 p-3 dark:border-gray-700">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search columns..."
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

              {/* Column List */}
              <div className="max-h-64 overflow-y-auto p-2">
                {filteredColumns.length > 0 ? (
                  <div className="space-y-1">
                    {filteredColumns.map((column) => (
                      <label
                        key={column.name}
                        className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <input
                          type="checkbox"
                          checked={selectedColumns.includes(column.name)}
                          onChange={() => toggleColumn(column.name)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {column.name}
                            </span>
                            {column.isGeo && (
                              <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                GEO
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {column.type}
                          </span>
                        </div>
                        {selectedColumns.includes(column.name) && (
                          <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        )}
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    No columns found matching "{searchTerm}"
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Selected Columns Preview */}
          {selectedColumns.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedColumns.map((columnName) => {
                const column = columnsForTable.find(c => c.name === columnName);
                return (
                  <span
                    key={columnName}
                    className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                  >
                    {columnName}
                    {column?.isGeo && ' 🌍'}
                    <button
                      onClick={() => toggleColumn(columnName)}
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

      {/* Geo Column Selection */}
      {selectedTable && columnsForTable.some(c => c.isGeo) && (
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            🌍 Geo Column (for map visualization)
          </label>
          <SearchableSelect
            value={geoColumn || ''}
            onChange={setGeoColumn}
            options={columnsForTable.filter(c => c.isGeo).map(c => c.name)}
            placeholder="Select geo column..."
            onClear={() => setGeoColumn(null)}
          />
        </div>
      )}

      {/* Summary */}
      {selectedTable && selectedColumns.length > 0 && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
          <p className="text-xs text-blue-800 dark:text-blue-300">
            <strong>Selection:</strong> {selectedSchema}.{selectedTable} with {selectedColumns.length} column(s)
            {geoColumn && ` | Geo column: ${geoColumn}`}
          </p>
        </div>
      )}
    </div>
  );
}
