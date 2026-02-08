'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Plus,
  Trash2,
  ChevronDown,
  Search,
  X,
  PlusCircle,
  Key,
  AlertCircle,
  Info,
  Check,
  Code,
  Database,
  FileText,
} from 'lucide-react';
import { TableDesign, ColumnDefinition } from './TableDesignerWizard';
import { useAccessibleSchemas } from '../../hooks/useAccessibleSchemas';

interface EnhancedColumnDefinitionStepProps {
  design: TableDesign;
  setDesign: (design: TableDesign) => void;
}

// Comprehensive MonkDB data types grouped by category
const COLUMN_TYPES = [
  // Numeric Types
  { value: 'BYTE', label: 'BYTE', category: 'Numeric', description: '8-bit signed integer (-128 to 127)' },
  { value: 'SHORT', label: 'SHORT', category: 'Numeric', description: '16-bit signed integer' },
  { value: 'INTEGER', label: 'INTEGER', category: 'Numeric', description: '32-bit signed integer' },
  { value: 'LONG', label: 'LONG', category: 'Numeric', description: '64-bit signed integer' },
  { value: 'FLOAT', label: 'FLOAT', category: 'Numeric', description: '32-bit IEEE 754 floating point' },
  { value: 'DOUBLE', label: 'DOUBLE', category: 'Numeric', description: '64-bit IEEE 754 floating point' },
  { value: 'NUMERIC', label: 'NUMERIC', category: 'Numeric', description: 'Arbitrary precision decimal' },
  { value: 'DECIMAL', label: 'DECIMAL', category: 'Numeric', description: 'Alias for NUMERIC' },

  // String Types
  { value: 'TEXT', label: 'TEXT', category: 'String', description: 'Variable-length text (recommended)' },
  { value: 'VARCHAR', label: 'VARCHAR', category: 'String', description: 'Variable-length text with optional limit' },
  { value: 'CHAR', label: 'CHAR', category: 'String', description: 'Fixed-length text' },

  // Boolean
  { value: 'BOOLEAN', label: 'BOOLEAN', category: 'Boolean', description: 'True or False' },

  // Date/Time Types
  { value: 'TIMESTAMP WITH TIME ZONE', label: 'TIMESTAMP WITH TIME ZONE', category: 'Date/Time', description: 'Timestamp with timezone (recommended)' },
  { value: 'TIMESTAMP WITHOUT TIME ZONE', label: 'TIMESTAMP', category: 'Date/Time', description: 'Timestamp without timezone' },
  { value: 'DATE', label: 'DATE', category: 'Date/Time', description: 'Calendar date' },
  { value: 'TIME', label: 'TIME', category: 'Date/Time', description: 'Time of day' },

  // Binary
  { value: 'BIT', label: 'BIT(n)', category: 'Binary', description: 'Fixed-length bit string' },
  { value: 'BLOB', label: 'BLOB', category: 'Binary', description: 'Binary large object' },

  // JSON Types
  { value: 'OBJECT', label: 'OBJECT', category: 'JSON', description: 'Nested JSON object (schemaless)' },
  { value: 'OBJECT(DYNAMIC)', label: 'OBJECT(DYNAMIC)', category: 'JSON', description: 'Dynamic JSON object' },
  { value: 'OBJECT(STRICT)', label: 'OBJECT(STRICT)', category: 'JSON', description: 'Strict JSON object' },
  { value: 'OBJECT(IGNORED)', label: 'OBJECT(IGNORED)', category: 'JSON', description: 'Ignored JSON object' },
  { value: 'ARRAY', label: 'ARRAY', category: 'JSON', description: 'Array of values' },

  // Geospatial Types
  { value: 'GEO_POINT', label: 'GEO_POINT', category: 'Geo', description: 'Geographic point (lat, lon)' },
  { value: 'GEO_SHAPE', label: 'GEO_SHAPE', category: 'Geo', description: 'Geographic shape (polygons, etc.)' },

  // Network Type
  { value: 'IP', label: 'IP', category: 'Network', description: 'IPv4 or IPv6 address' },

  // Vector Type (for ML/AI)
  { value: 'FLOAT_VECTOR', label: 'FLOAT_VECTOR(n)', category: 'Vector', description: 'Vector for similarity search' },
];

// Constraint options
const CONSTRAINTS = [
  { value: 'PRIMARY KEY', label: 'Primary Key', description: 'Unique identifier, non-null' },
  { value: 'NOT NULL', label: 'Not Null', description: 'Prevents null values' },
  { value: 'NULL', label: 'Nullable', description: 'Allows null values (default)' },
  { value: 'UNIQUE', label: 'Unique', description: 'All values must be unique' },
  { value: 'CHECK', label: 'CHECK', description: 'Custom validation expression' },
  { value: 'INDEX OFF', label: 'Index Off', description: 'Disable indexing for this column' },
  { value: 'INDEX PLAIN', label: 'Index Plain', description: 'Standard B-tree index' },
  { value: 'INDEX FULLTEXT', label: 'Index Fulltext', description: 'Full-text search index' },
];

// Full-text analyzers
const FULLTEXT_ANALYZERS = [
  { value: 'standard', label: 'Standard', description: 'General purpose analyzer' },
  { value: 'english', label: 'English', description: 'English language analyzer' },
  { value: 'simple', label: 'Simple', description: 'Basic lowercase tokenization' },
  { value: 'keyword', label: 'Keyword', description: 'No tokenization' },
  { value: 'whitespace', label: 'Whitespace', description: 'Split on whitespace' },
  { value: 'pattern', label: 'Pattern', description: 'Regular expression based' },
];

export default function EnhancedColumnDefinitionStep({
  design,
  setDesign,
}: EnhancedColumnDefinitionStepProps) {
  const { schemas, loading: schemasLoading } = useAccessibleSchemas();
  const [schemaDropdownOpen, setSchemaDropdownOpen] = useState(false);
  const [schemaSearchTerm, setSchemaSearchTerm] = useState('');
  const [showNewSchemaInput, setShowNewSchemaInput] = useState(false);
  const [newSchemaName, setNewSchemaName] = useState('');
  const [expandedColumns, setExpandedColumns] = useState<Set<number>>(new Set());
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
    schema.name.toLowerCase().includes(schemaSearchTerm.toLowerCase())
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
    const newColumn: ColumnDefinition = {
      name: '',
      column_type: 'INTEGER',
      constraints: [],
      default_value: undefined,
      description: '',
      generated_expression: undefined,
      index_method: undefined,
      index_analyzer: undefined,
      check_expression: undefined,
    };

    setDesign({
      ...design,
      columns: [...design.columns, newColumn],
    });

    // Auto-expand the new column
    setExpandedColumns(new Set([...expandedColumns, design.columns.length]));
  };

  const removeColumn = (index: number) => {
    setDesign({
      ...design,
      columns: design.columns.filter((_, i) => i !== index),
    });

    // Remove from expanded set
    const newExpanded = new Set(expandedColumns);
    newExpanded.delete(index);
    setExpandedColumns(newExpanded);
  };

  const updateColumn = (index: number, updates: Partial<ColumnDefinition>) => {
    const newColumns = [...design.columns];
    newColumns[index] = { ...newColumns[index], ...updates };
    setDesign({ ...design, columns: newColumns });
  };

  const toggleConstraint = (index: number, constraint: string) => {
    const newColumns = [...design.columns];
    const constraints = newColumns[index].constraints;

    // Handle mutually exclusive constraints
    if (constraint === 'PRIMARY KEY') {
      // Remove PRIMARY KEY from all other columns
      newColumns.forEach((col, i) => {
        if (i !== index) {
          col.constraints = col.constraints.filter((c) => c !== 'PRIMARY KEY');
        }
      });

      // PRIMARY KEY implies NOT NULL
      if (!constraints.includes('PRIMARY KEY')) {
        newColumns[index].constraints = constraints.filter((c) => c !== 'NULL' && c !== 'NOT NULL');
        newColumns[index].constraints.push('PRIMARY KEY', 'NOT NULL');
      } else {
        newColumns[index].constraints = constraints.filter((c) => c !== 'PRIMARY KEY' && c !== 'NOT NULL');
      }
    } else if (constraint === 'NOT NULL' || constraint === 'NULL') {
      // NOT NULL and NULL are mutually exclusive
      newColumns[index].constraints = constraints.filter(
        (c) => c !== 'NOT NULL' && c !== 'NULL'
      );

      if (!constraints.includes(constraint)) {
        newColumns[index].constraints.push(constraint);
      }
    } else if (constraint.startsWith('INDEX')) {
      // Remove other INDEX constraints
      newColumns[index].constraints = constraints.filter(
        (c) => !c.startsWith('INDEX')
      );

      if (!constraints.includes(constraint)) {
        newColumns[index].constraints.push(constraint);

        // Set index method
        if (constraint === 'INDEX FULLTEXT') {
          newColumns[index].index_method = 'FULLTEXT';
          newColumns[index].index_analyzer = 'standard';
        } else if (constraint === 'INDEX PLAIN') {
          newColumns[index].index_method = 'PLAIN';
        } else {
          newColumns[index].index_method = undefined;
        }
      } else {
        newColumns[index].index_method = undefined;
        newColumns[index].index_analyzer = undefined;
      }
    } else {
      // Toggle other constraints normally
      if (constraints.includes(constraint)) {
        newColumns[index].constraints = constraints.filter((c) => c !== constraint);

        // Clear related fields
        if (constraint === 'CHECK') {
          newColumns[index].check_expression = undefined;
        }
      } else {
        newColumns[index].constraints.push(constraint);
      }
    }

    setDesign({ ...design, columns: newColumns });
  };

  const toggleColumnExpanded = (index: number) => {
    const newExpanded = new Set(expandedColumns);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedColumns(newExpanded);
  };

  const groupedTypes = COLUMN_TYPES.reduce((acc, type) => {
    if (!acc[type.category]) {
      acc[type.category] = [];
    }
    acc[type.category].push(type);
    return acc;
  }, {} as Record<string, typeof COLUMN_TYPES>);

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div className="text-sm text-blue-900 dark:text-blue-200">
            <p className="font-semibold mb-2">Table Structure Definition</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Define table name, schema, and column specifications</li>
              <li>Primary Key columns are automatically indexed and non-null</li>
              <li>Use CHECK constraints for custom validation rules</li>
              <li>Generated columns are computed automatically from expressions</li>
              <li>Full-text indexes enable advanced search capabilities</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Schema and Table Name */}
      <div className="grid grid-cols-2 gap-4">
        {/* Schema Selection */}
        <div className="relative" ref={schemaDropdownRef}>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            <Database className="inline h-4 w-4 mr-1" />
            Schema Name <span className="text-red-600">*</span>
            <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">(searchable)</span>
          </label>
          <button
            type="button"
            onClick={() => setSchemaDropdownOpen(!schemaDropdownOpen)}
            className="flex w-full items-center justify-between rounded-lg border-2 border-gray-300 bg-white p-3 text-left transition-all hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:border-blue-500"
          >
            <span
              className={
                design.schema_name
                  ? 'font-medium text-gray-900 dark:text-white'
                  : 'text-gray-400 dark:text-gray-500'
              }
            >
              {design.schema_name || 'Select or create schema...'}
            </span>
            <ChevronDown
              className={`h-4 w-4 text-gray-500 transition-transform ${
                schemaDropdownOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Dropdown Menu */}
          {schemaDropdownOpen && (
            <div className="absolute z-50 mt-1 w-full rounded-lg border-2 border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800">
              {/* Search Bar */}
              <div className="border-b border-gray-200 p-3 dark:border-gray-700">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={schemaSearchTerm}
                    onChange={(e) => setSchemaSearchTerm(e.target.value)}
                    placeholder="Search schemas..."
                    className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-8 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                  {schemaSearchTerm && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSchemaSearchTerm('');
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-600 dark:hover:text-gray-300"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Schema List */}
              <div className="max-h-64 overflow-y-auto">
                {schemasLoading ? (
                  <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    Loading schemas...
                  </div>
                ) : filteredSchemas.length > 0 ? (
                  <div className="py-1">
                    {filteredSchemas.map((schema) => (
                      <button
                        key={schema.name}
                        onClick={() => handleSchemaSelect(schema.name)}
                        className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/20 ${
                          design.schema_name === schema.name
                            ? 'bg-blue-50 font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <Database className="h-4 w-4" />
                        <span>{schema.name}</span>
                        {design.schema_name === schema.name && (
                          <Check className="ml-auto h-4 w-4 text-blue-600" />
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    No schemas found
                  </div>
                )}
              </div>

              {/* Create New Schema */}
              <div className="border-t border-gray-200 p-2 dark:border-gray-700">
                {showNewSchemaInput ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newSchemaName}
                      onChange={(e) => setNewSchemaName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddNewSchema();
                        if (e.key === 'Escape') setShowNewSchemaInput(false);
                      }}
                      placeholder="New schema name..."
                      className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      autoFocus
                    />
                    <button
                      onClick={handleAddNewSchema}
                      className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      Create
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
                ) : (
                  <button
                    onClick={() => setShowNewSchemaInput(true)}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                  >
                    <PlusCircle className="h-4 w-4" />
                    Create New Schema
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Table Name */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            <FileText className="inline h-4 w-4 mr-1" />
            Table Name <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            value={design.table_name}
            onChange={(e) => setDesign({ ...design, table_name: e.target.value })}
            placeholder="e.g., users, orders, products"
            className="w-full rounded-lg border-2 border-gray-300 px-3 py-3 text-sm font-medium focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Must start with a letter or underscore, contain only alphanumeric characters and
            underscores
          </p>
        </div>
      </div>

      {/* Column Definition */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Column Definitions
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Define the structure and constraints for each column
            </p>
          </div>
          <button
            onClick={addColumn}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition-all hover:from-green-700 hover:to-emerald-700 hover:shadow-lg"
          >
            <Plus className="h-4 w-4" />
            Add Column
          </button>
        </div>

        {design.columns.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center dark:border-gray-700 dark:bg-gray-800">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
              <Database className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
              No columns defined
            </h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Get started by adding your first column
            </p>
            <button
              onClick={addColumn}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add First Column
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {design.columns.map((column, index) => {
              const isExpanded = expandedColumns.has(index);
              const isPrimaryKey = column.constraints.includes('PRIMARY KEY');
              const hasCheck = column.constraints.includes('CHECK');
              const hasFulltext = column.constraints.includes('INDEX FULLTEXT');
              const isGenerated = !!column.generated_expression;

              return (
                <div
                  key={index}
                  className={`rounded-lg border-2 transition-all ${
                    isPrimaryKey
                      ? 'border-yellow-300 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-900/10'
                      : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
                  }`}
                >
                  {/* Column Header */}
                  <div className="flex items-center gap-3 p-4">
                    <button
                      onClick={() => toggleColumnExpanded(index)}
                      className="flex-shrink-0 rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <ChevronDown
                        className={`h-5 w-5 text-gray-500 transition-transform ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    <div className="flex-1 grid grid-cols-12 gap-3 items-center">
                      {/* Column Number */}
                      <div className="col-span-1 text-center">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                          {index + 1}
                        </span>
                      </div>

                      {/* Column Name */}
                      <div className="col-span-4">
                        <input
                          type="text"
                          value={column.name}
                          onChange={(e) => updateColumn(index, { name: e.target.value })}
                          placeholder="column_name"
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono font-semibold focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        />
                      </div>

                      {/* Data Type */}
                      <div className="col-span-3">
                        <select
                          value={column.column_type}
                          onChange={(e) => updateColumn(index, { column_type: e.target.value })}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-medium focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        >
                          {Object.entries(groupedTypes).map(([category, types]) => (
                            <optgroup key={category} label={category}>
                              {types.map((type) => (
                                <option key={type.value} value={type.value}>
                                  {type.label}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </div>

                      {/* Primary Key Badge */}
                      <div className="col-span-3 flex items-center gap-2">
                        {isPrimaryKey && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-semibold text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
                            <Key className="h-3 w-3" />
                            PRIMARY KEY
                          </span>
                        )}
                        {isGenerated && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-1 text-xs font-semibold text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                            <Code className="h-3 w-3" />
                            GENERATED
                          </span>
                        )}
                      </div>

                      {/* Delete Button */}
                      <div className="col-span-1 text-right">
                        <button
                          onClick={() => removeColumn(index)}
                          className="rounded-md p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                          title="Delete column"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 p-4 space-y-4 dark:border-gray-700">
                      {/* Constraints */}
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Constraints
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                          {CONSTRAINTS.map((constraint) => {
                            const isActive = column.constraints.includes(constraint.value);
                            return (
                              <button
                                key={constraint.value}
                                onClick={() => toggleConstraint(index, constraint.value)}
                                className={`flex items-center justify-center gap-2 rounded-md border-2 px-3 py-2 text-xs font-medium transition-all ${
                                  isActive
                                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300'
                                }`}
                                title={constraint.description}
                              >
                                {isActive && <Check className="h-3 w-3" />}
                                {constraint.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Full-text Analyzer (if FULLTEXT index is selected) */}
                      {hasFulltext && (
                        <div>
                          <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Full-text Analyzer
                          </label>
                          <select
                            value={column.index_analyzer || 'standard'}
                            onChange={(e) => updateColumn(index, { index_analyzer: e.target.value })}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                          >
                            {FULLTEXT_ANALYZERS.map((analyzer) => (
                              <option key={analyzer.value} value={analyzer.value}>
                                {analyzer.label} - {analyzer.description}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* CHECK Expression (if CHECK constraint is selected) */}
                      {hasCheck && (
                        <div>
                          <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                            CHECK Expression
                          </label>
                          <input
                            type="text"
                            value={column.check_expression || ''}
                            onChange={(e) =>
                              updateColumn(index, { check_expression: e.target.value })
                            }
                            placeholder={`e.g., ${column.name} >= 0`}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                          />
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Boolean expression that must evaluate to true
                          </p>
                        </div>
                      )}

                      {/* Default Value */}
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Default Value (optional)
                        </label>
                        <input
                          type="text"
                          value={column.default_value || ''}
                          onChange={(e) => updateColumn(index, { default_value: e.target.value })}
                          placeholder="e.g., 0, 'default text', NOW(), true"
                          disabled={isGenerated}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-900"
                        />
                        <div className="mt-2 rounded-md border border-blue-200 bg-blue-50 p-2 dark:border-blue-800 dark:bg-blue-900/20">
                          <p className="text-xs font-semibold text-blue-900 dark:text-blue-300 mb-1">
                            Valid default value examples:
                          </p>
                          <ul className="text-xs text-blue-800 dark:text-blue-400 space-y-0.5">
                            <li>• Numbers: <code className="font-mono">0</code>, <code className="font-mono">123</code>, <code className="font-mono">-45.67</code></li>
                            <li>• Strings: <code className="font-mono">'default text'</code>, <code className="font-mono">'unknown'</code> (use single quotes)</li>
                            <li>• Boolean: <code className="font-mono">true</code>, <code className="font-mono">false</code></li>
                            <li>• Functions: <code className="font-mono">NOW()</code>, <code className="font-mono">CURRENT_TIMESTAMP()</code></li>
                            <li>• Null: <code className="font-mono">NULL</code></li>
                          </ul>
                        </div>
                      </div>

                      {/* Generated Expression */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Generated Expression (optional)
                          </label>
                          <span className="text-xs text-purple-600 dark:text-purple-400">
                            GENERATED ALWAYS AS
                          </span>
                        </div>
                        <input
                          type="text"
                          value={column.generated_expression || ''}
                          onChange={(e) =>
                            updateColumn(index, {
                              generated_expression: e.target.value,
                              default_value: e.target.value ? undefined : column.default_value,
                            })
                          }
                          placeholder={`e.g., date_trunc('day', created_at)`}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        />
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Expression to compute this column's value automatically. Cannot be used
                          with default values
                        </p>
                      </div>

                      {/* Description */}
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Description (optional)
                        </label>
                        <textarea
                          value={column.description || ''}
                          onChange={(e) => updateColumn(index, { description: e.target.value })}
                          placeholder="Document the purpose of this column..."
                          rows={2}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Validation Summary */}
      {design.columns.length > 0 && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
          <div className="flex items-start gap-3">
            <Check className="h-5 w-5 flex-shrink-0 text-green-600 dark:text-green-400 mt-0.5" />
            <div className="text-sm text-green-900 dark:text-green-200">
              <p className="font-semibold mb-1">Table Structure Summary</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Total Columns: {design.columns.length}</li>
                <li>
                  Primary Key Columns:{' '}
                  {design.columns.filter((c) => c.constraints.includes('PRIMARY KEY')).length}
                </li>
                <li>
                  Generated Columns:{' '}
                  {design.columns.filter((c) => c.generated_expression).length}
                </li>
                <li>
                  Full-text Indexed:{' '}
                  {design.columns.filter((c) => c.constraints.includes('INDEX FULLTEXT')).length}
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
