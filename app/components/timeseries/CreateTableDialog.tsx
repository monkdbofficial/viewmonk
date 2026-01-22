'use client';

import { useState } from 'react';
import { X, Plus, Trash2, AlertCircle, CheckCircle, Table as TableIcon } from 'lucide-react';
import { useActiveConnection } from '../../lib/monkdb-context';

interface CreateTableDialogProps {
  schemaName: string;
  onSuccess: (tableName: string) => void;
  onClose: () => void;
}

interface ColumnDefinition {
  name: string;
  type: string;
  primaryKey: boolean;
}

const COMMON_DATA_TYPES = [
  'TEXT',
  'INTEGER',
  'BIGINT',
  'DOUBLE',
  'FLOAT',
  'BOOLEAN',
  'TIMESTAMP',
  'DATE',
  'OBJECT',
  'ARRAY(TEXT)',
  'ARRAY(INTEGER)',
  'ARRAY(DOUBLE)',
];

const TIME_SERIES_TEMPLATES = {
  'IoT Sensors': [
    { name: 'sensor_id', type: 'TEXT', primaryKey: true },
    { name: 'timestamp', type: 'TIMESTAMP', primaryKey: true },
    { name: 'location', type: 'TEXT', primaryKey: false },
    { name: 'temperature', type: 'DOUBLE', primaryKey: false },
    { name: 'humidity', type: 'DOUBLE', primaryKey: false },
    { name: 'pressure', type: 'DOUBLE', primaryKey: false },
  ],
  'Application Metrics': [
    { name: 'app_name', type: 'TEXT', primaryKey: true },
    { name: 'timestamp', type: 'TIMESTAMP', primaryKey: true },
    { name: 'request_count', type: 'INTEGER', primaryKey: false },
    { name: 'error_count', type: 'INTEGER', primaryKey: false },
    { name: 'avg_response_ms', type: 'DOUBLE', primaryKey: false },
    { name: 'active_users', type: 'INTEGER', primaryKey: false },
  ],
  'Stock Market': [
    { name: 'symbol', type: 'TEXT', primaryKey: true },
    { name: 'timestamp', type: 'TIMESTAMP', primaryKey: true },
    { name: 'open_price', type: 'DOUBLE', primaryKey: false },
    { name: 'close_price', type: 'DOUBLE', primaryKey: false },
    { name: 'high_price', type: 'DOUBLE', primaryKey: false },
    { name: 'low_price', type: 'DOUBLE', primaryKey: false },
    { name: 'volume', type: 'BIGINT', primaryKey: false },
  ],
  'Custom': [],
};

export default function CreateTableDialog({ schemaName, onSuccess, onClose }: CreateTableDialogProps) {
  const activeConnection = useActiveConnection();
  const [tableName, setTableName] = useState('');
  const [columns, setColumns] = useState<ColumnDefinition[]>([
    { name: 'id', type: 'TEXT', primaryKey: true },
    { name: 'timestamp', type: 'TIMESTAMP', primaryKey: false },
  ]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('Custom');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTemplateChange = (template: string) => {
    setSelectedTemplate(template);
    if (template !== 'Custom') {
      setColumns(TIME_SERIES_TEMPLATES[template as keyof typeof TIME_SERIES_TEMPLATES]);
    }
  };

  const addColumn = () => {
    setColumns([...columns, { name: '', type: 'TEXT', primaryKey: false }]);
  };

  const removeColumn = (index: number) => {
    setColumns(columns.filter((_, i) => i !== index));
  };

  const updateColumn = (index: number, field: keyof ColumnDefinition, value: any) => {
    const updated = [...columns];
    updated[index] = { ...updated[index], [field]: value };
    setColumns(updated);
  };

  const validateTable = (): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Check table name
    if (!tableName.trim()) {
      errors.push('Table name is required');
    } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
      errors.push('Table name must start with letter/underscore and contain only alphanumeric characters');
    }

    // Check columns
    if (columns.length === 0) {
      errors.push('At least one column is required');
    }

    // Check for duplicate column names
    const columnNames = columns.map(c => c.name.toLowerCase());
    const duplicates = columnNames.filter((name, index) => columnNames.indexOf(name) !== index);
    if (duplicates.length > 0) {
      errors.push(`Duplicate column names: ${duplicates.join(', ')}`);
    }

    // Check each column
    columns.forEach((col, idx) => {
      if (!col.name.trim()) {
        errors.push(`Column ${idx + 1}: Name is required`);
      } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(col.name)) {
        errors.push(`Column ${idx + 1}: Invalid name format`);
      }
      if (!col.type) {
        errors.push(`Column ${idx + 1}: Type is required`);
      }
    });

    // Check for primary key
    const hasPrimaryKey = columns.some(c => c.primaryKey);
    if (!hasPrimaryKey) {
      errors.push('At least one column must be marked as PRIMARY KEY');
    }

    return { valid: errors.length === 0, errors };
  };

  const generateCreateSQL = (): string => {
    const primaryKeys = columns.filter(c => c.primaryKey).map(c => c.name);
    const columnDefs = columns.map(c => `  ${c.name} ${c.type}`).join(',\n');
    const primaryKeyClause = primaryKeys.length > 0 ? `,\n  PRIMARY KEY (${primaryKeys.join(', ')})` : '';

    return `CREATE TABLE ${schemaName}.${tableName} (
${columnDefs}${primaryKeyClause}
);`;
  };

  const handleCreate = async () => {
    const validation = validateTable();
    if (!validation.valid) {
      setError(validation.errors.join('\n'));
      return;
    }

    if (!activeConnection) {
      setError('No active connection');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const sql = generateCreateSQL();
      console.log('Creating table with SQL:', sql);

      await activeConnection.client.query(sql);

      // Success!
      onSuccess(tableName);
      onClose();
    } catch (err) {
      console.error('Failed to create table:', err);
      setError('Failed to create table: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <TableIcon className="w-6 h-6 text-green-500" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Create New Table
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Create a time-series table in schema: <strong>{schemaName}</strong>
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
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-red-900 dark:text-red-300 mb-1">
                    Validation Error
                  </h4>
                  <pre className="text-sm text-red-800 dark:text-red-200 whitespace-pre-wrap">
                    {error}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Template Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Quick Start Template
            </label>
            <select
              value={selectedTemplate}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg"
            >
              {Object.keys(TIME_SERIES_TEMPLATES).map((template) => (
                <option key={template} value={template}>
                  {template}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Select a template or choose "Custom" to define your own structure
            </p>
          </div>

          {/* Table Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Table Name *
            </label>
            <input
              type="text"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              placeholder="e.g., sensor_readings, app_metrics"
              className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Full table name will be: <strong>{schemaName}.{tableName || 'table_name'}</strong>
            </p>
          </div>

          {/* Columns */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Columns *
              </label>
              <button
                onClick={addColumn}
                className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Column
              </button>
            </div>

            <div className="space-y-2">
              {columns.map((column, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                >
                  <div className="flex-1 grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={column.name}
                      onChange={(e) => updateColumn(index, 'name', e.target.value)}
                      placeholder="Column name"
                      className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-sm"
                    />
                    <select
                      value={column.type}
                      onChange={(e) => updateColumn(index, 'type', e.target.value)}
                      className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-sm"
                    >
                      {COMMON_DATA_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                    <label className="flex items-center gap-2 px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={column.primaryKey}
                        onChange={(e) => updateColumn(index, 'primaryKey', e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-gray-700 dark:text-gray-300">Primary Key</span>
                    </label>
                  </div>
                  <button
                    onClick={() => removeColumn(index)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                    title="Remove column"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              💡 Tip: Mark at least one column as PRIMARY KEY. For time-series data, typically use (id, timestamp) or (sensor_id, timestamp)
            </p>
          </div>

          {/* SQL Preview */}
          {tableName && columns.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                SQL Preview
              </h4>
              <pre className="text-xs bg-gray-900 text-green-400 p-3 rounded overflow-x-auto">
                {generateCreateSQL()}
              </pre>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-medium mb-1">Time-Series Best Practices</p>
                <ul className="space-y-1 text-xs list-disc list-inside">
                  <li>Always include a TIMESTAMP column for time-based queries</li>
                  <li>Use composite PRIMARY KEY (e.g., sensor_id + timestamp) for uniqueness</li>
                  <li>Use DOUBLE for numeric metrics (temperature, pressure, etc.)</li>
                  <li>Use TEXT for identifiers (sensor_id, location, etc.)</li>
                  <li>Consider ARRAY(TEXT) for tags or labels</li>
                </ul>
              </div>
            </div>
          </div>
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
            onClick={handleCreate}
            disabled={creating || !tableName || columns.length === 0}
            className="px-6 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
          >
            <TableIcon className="w-4 h-4" />
            {creating ? 'Creating Table...' : 'Create Table'}
          </button>
        </div>
      </div>
    </div>
  );
}
