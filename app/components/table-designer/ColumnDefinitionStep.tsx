'use client';

import { Plus, Trash2 } from 'lucide-react';
import { TableDesign, ColumnDefinition } from './TableDesignerWizard';

interface ColumnDefinitionStepProps {
  design: TableDesign;
  setDesign: (design: TableDesign) => void;
}

const COLUMN_TYPES = [
  { value: 'INTEGER', label: 'Integer', category: 'Numeric' },
  { value: 'LONG', label: 'Long', category: 'Numeric' },
  { value: 'SHORT', label: 'Short', category: 'Numeric' },
  { value: 'BYTE', label: 'Byte', category: 'Numeric' },
  { value: 'DOUBLE', label: 'Double', category: 'Numeric' },
  { value: 'FLOAT', label: 'Float', category: 'Numeric' },
  { value: 'TEXT', label: 'Text', category: 'String' },
  { value: 'VARCHAR', label: 'Varchar', category: 'String' },
  { value: 'BOOLEAN', label: 'Boolean', category: 'Boolean' },
  { value: 'TIMESTAMP', label: 'Timestamp', category: 'Date/Time' },
  { value: 'DATE', label: 'Date', category: 'Date/Time' },
  { value: 'TIME', label: 'Time', category: 'Date/Time' },
  { value: 'BLOB', label: 'BLOB', category: 'Binary' },
  { value: 'OBJECT', label: 'Object (JSON)', category: 'JSON' },
  { value: 'ARRAY', label: 'Array', category: 'JSON' },
  { value: 'GEO_POINT', label: 'Geo Point', category: 'Geo' },
  { value: 'GEO_SHAPE', label: 'Geo Shape', category: 'Geo' },
  { value: 'IP', label: 'IP Address', category: 'Network' },
];

const CONSTRAINTS = [
  { value: 'PRIMARY_KEY', label: 'Primary Key' },
  { value: 'NOT_NULL', label: 'Not Null' },
  { value: 'UNIQUE', label: 'Unique' },
];

export default function ColumnDefinitionStep({ design, setDesign }: ColumnDefinitionStepProps) {
  const addColumn = () => {
    setDesign({
      ...design,
      columns: [
        ...design.columns,
        {
          name: '',
          column_type: 'INTEGER',
          constraints: [],
        },
      ],
    });
  };

  const removeColumn = (index: number) => {
    setDesign({
      ...design,
      columns: design.columns.filter((_, i) => i !== index),
    });
  };

  const updateColumn = (index: number, updates: Partial<ColumnDefinition>) => {
    const newColumns = [...design.columns];
    newColumns[index] = { ...newColumns[index], ...updates };
    setDesign({ ...design, columns: newColumns });
  };

  const toggleConstraint = (index: number, constraint: string) => {
    const newColumns = [...design.columns];
    const constraints = newColumns[index].constraints;

    if (constraint === 'PRIMARY_KEY') {
      // Only one column can be primary key
      newColumns.forEach((col, i) => {
        col.constraints = col.constraints.filter((c) => c !== 'PRIMARY_KEY');
      });
    }

    if (constraints.includes(constraint)) {
      newColumns[index].constraints = constraints.filter((c) => c !== constraint);
    } else {
      newColumns[index].constraints = [...constraints, constraint];
    }

    setDesign({ ...design, columns: newColumns });
  };

  return (
    <div className="space-y-6">
      {/* Table Name */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Schema Name
          </label>
          <input
            type="text"
            value={design.schema_name}
            onChange={(e) => setDesign({ ...design, schema_name: e.target.value })}
            className="w-full rounded-lg border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            placeholder="public"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Table Name <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            value={design.table_name}
            onChange={(e) => setDesign({ ...design, table_name: e.target.value })}
            className="w-full rounded-lg border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            placeholder="my_table"
            required
          />
        </div>
      </div>

      {/* Columns */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Columns</h3>
          <button
            onClick={addColumn}
            className="flex items-center gap-2 rounded-lg bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-700"
          >
            <Plus className="h-4 w-4" />
            Add Column
          </button>
        </div>

        {design.columns.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center dark:border-gray-600">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No columns defined. Click "Add Column" to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {design.columns.map((column, index) => (
              <div
                key={index}
                className="rounded-lg border border-gray-200 p-4 dark:border-gray-700"
              >
                <div className="grid grid-cols-12 gap-4">
                  {/* Column Name */}
                  <div className="col-span-3">
                    <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                      Column Name <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={column.name}
                      onChange={(e) => updateColumn(index, { name: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 p-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      placeholder="column_name"
                      required
                    />
                  </div>

                  {/* Data Type */}
                  <div className="col-span-3">
                    <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                      Data Type
                    </label>
                    <select
                      value={column.column_type}
                      onChange={(e) => updateColumn(index, { column_type: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 p-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    >
                      {COLUMN_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label} ({type.category})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Constraints */}
                  <div className="col-span-4">
                    <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                      Constraints
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {CONSTRAINTS.map((constraint) => (
                        <button
                          key={constraint.value}
                          onClick={() => toggleConstraint(index, constraint.value)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                            column.constraints.includes(constraint.value)
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                          }`}
                        >
                          {constraint.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Default Value */}
                  <div className="col-span-2">
                    <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                      Default
                    </label>
                    <input
                      type="text"
                      value={column.default_value || ''}
                      onChange={(e) =>
                        updateColumn(index, { default_value: e.target.value || undefined })
                      }
                      className="w-full rounded-lg border border-gray-300 p-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      placeholder="NULL"
                    />
                  </div>

                  {/* Delete Button */}
                  <div className="col-span-12 flex justify-end">
                    <button
                      onClick={() => removeColumn(index)}
                      className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="h-3 w-3" />
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Help Text */}
      <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
        <h4 className="mb-2 text-sm font-medium text-blue-900 dark:text-blue-300">Tips:</h4>
        <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-400">
          <li>• At least one column with a Primary Key is recommended</li>
          <li>• Use appropriate data types for better query performance</li>
          <li>• Consider adding NOT NULL constraints for required fields</li>
          <li>• Default values can use SQL expressions (e.g., CURRENT_TIMESTAMP)</li>
        </ul>
      </div>
    </div>
  );
}
