'use client';

import { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, ChevronDown, Search, X, PlusCircle } from 'lucide-react';
import { TableDesign, ColumnDefinition } from './TableDesignerWizard';
import { useSchemas } from '../../lib/monkdb-hooks';

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
  { value: 'PRIMARYKEY', label: 'Primary Key' },
  { value: 'NOTNULL', label: 'Not Null' },
  { value: 'UNIQUE', label: 'Unique' },
];

export default function ColumnDefinitionStep({ design, setDesign }: ColumnDefinitionStepProps) {
  const { data: schemas, loading: schemasLoading } = useSchemas();
  const [schemaDropdownOpen, setSchemaDropdownOpen] = useState(false);
  const [schemaSearchTerm, setSchemaSearchTerm] = useState('');
  const [showNewSchemaInput, setShowNewSchemaInput] = useState(false);
  const [newSchemaName, setNewSchemaName] = useState('');
  const schemaDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (schemaDropdownRef.current && !schemaDropdownRef.current.contains(event.target as Node)) {
        setSchemaDropdownOpen(false);
        setShowNewSchemaInput(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter schemas based on search
  const filteredSchemas = (schemas || []).filter((schema) =>
    schema.toLowerCase().includes(schemaSearchTerm.toLowerCase())
  );

  const handleSchemaSelect = (schema: string) => {
    setDesign({ ...design, schema_name: schema });
    setSchemaDropdownOpen(false);
    setSchemaSearchTerm('');
  };

  const handleAddNewSchema = () => {
    if (newSchemaName.trim()) {
      setDesign({ ...design, schema_name: newSchemaName.trim() });
      setNewSchemaName('');
      setShowNewSchemaInput(false);
      setSchemaDropdownOpen(false);
    }
  };

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

    if (constraint === 'PRIMARYKEY') {
      // Only one column can be primary key
      newColumns.forEach((col, i) => {
        col.constraints = col.constraints.filter((c) => c !== 'PRIMARYKEY');
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
        <div className="relative" ref={schemaDropdownRef}>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Schema Name
            <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">(searchable)</span>
          </label>
          <button
            type="button"
            onClick={() => setSchemaDropdownOpen(!schemaDropdownOpen)}
            className="flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white p-2 text-left transition-colors hover:border-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:border-gray-500"
          >
            <span className={design.schema_name ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}>
              {design.schema_name || 'Select or create schema...'}
            </span>
            <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${schemaDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {schemaDropdownOpen && (
            <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
              {/* Search Bar */}
              <div className="border-b border-gray-200 p-2 dark:border-gray-700">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={schemaSearchTerm}
                    onChange={(e) => setSchemaSearchTerm(e.target.value)}
                    placeholder="Search schemas..."
                    className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-8 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                  {schemaSearchTerm && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSchemaSearchTerm('');
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Schema List */}
              <div className="max-h-60 overflow-y-auto">
                {schemasLoading ? (
                  <div className="p-3 text-center text-sm text-gray-500 dark:text-gray-400">
                    Loading schemas...
                  </div>
                ) : filteredSchemas.length > 0 ? (
                  <div className="py-1">
                    {filteredSchemas.map((schema) => (
                      <button
                        key={schema}
                        onClick={() => handleSchemaSelect(schema)}
                        className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/20 ${
                          design.schema_name === schema
                            ? 'bg-blue-50 font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                        <span>{schema}</span>
                        {design.schema_name === schema && (
                          <svg className="ml-auto h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                ) : schemaSearchTerm ? (
                  <div className="p-3 text-center text-sm text-gray-500 dark:text-gray-400">
                    No schemas found matching "{schemaSearchTerm}"
                  </div>
                ) : (
                  <div className="p-3 text-center text-sm text-gray-500 dark:text-gray-400">
                    No schemas available
                  </div>
                )}
              </div>

              {/* Add New Schema */}
              <div className="border-t border-gray-200 dark:border-gray-700">
                {showNewSchemaInput ? (
                  <div className="p-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newSchemaName}
                        onChange={(e) => setNewSchemaName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleAddNewSchema();
                          } else if (e.key === 'Escape') {
                            setShowNewSchemaInput(false);
                            setNewSchemaName('');
                          }
                        }}
                        placeholder="Enter new schema name..."
                        className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        autoFocus
                      />
                      <button
                        onClick={handleAddNewSchema}
                        className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => {
                          setShowNewSchemaInput(false);
                          setNewSchemaName('');
                        }}
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Press Enter to add or Escape to cancel
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowNewSchemaInput(true)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                  >
                    <PlusCircle className="h-4 w-4" />
                    Create New Schema
                  </button>
                )}
              </div>
            </div>
          )}
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
