'use client';

import { useState } from 'react';
import { X, Plus, AlertCircle } from 'lucide-react';
import { useActiveConnection } from '../../lib/monkdb-context';
import { useToast } from '../ToastContext';
import type { ColumnMetadata } from '../../lib/monkdb-client';

interface TableInsertFormProps {
  schema: string;
  tableName: string;
  columns: ColumnMetadata[];
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * Table Insert Form Component
 *
 * Dynamic form for inserting new rows into a table based on column metadata.
 * - Type-appropriate inputs for each data type
 * - Validation for required fields
 * - SQL generation and execution
 * - Success/error feedback
 */
export default function TableInsertForm({
  schema,
  tableName,
  columns,
  onClose,
  onSuccess,
}: TableInsertFormProps) {
  const activeConnection = useActiveConnection();
  const toast = useToast();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [inserting, setInserting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  /**
   * Get appropriate input type based on column data type
   */
  const getInputType = (dataType: string): string => {
    const type = dataType.toUpperCase();
    if (type.includes('INT') || type.includes('BIGINT') || type.includes('LONG')) return 'number';
    if (type.includes('FLOAT') || type.includes('DOUBLE') || type.includes('REAL')) return 'number';
    if (type.includes('BOOLEAN')) return 'checkbox';
    if (type.includes('TIMESTAMP')) return 'datetime-local';
    if (type.includes('DATE')) return 'date';
    if (type.includes('TIME')) return 'time';
    if (type.includes('ARRAY') || type.includes('OBJECT') || type.includes('JSON')) return 'json';
    return 'text';
  };

  /**
   * Get placeholder text for input
   */
  const getPlaceholder = (column: ColumnMetadata): string => {
    const type = column.data_type.toUpperCase();
    if (type.includes('INT')) return '0';
    if (type.includes('FLOAT') || type.includes('DOUBLE')) return '0.0';
    if (type.includes('BOOLEAN')) return 'true/false';
    if (type.includes('ARRAY')) return '[]';
    if (type.includes('OBJECT')) return '{}';
    if (type.includes('TIMESTAMP')) return 'Select date and time';
    return `Enter ${column.column_name}`;
  };

  /**
   * Validate field value
   */
  const validateField = (column: ColumnMetadata, value: any): string | null => {
    // Check required fields (non-nullable columns without defaults)
    if (!column.is_nullable && value === undefined || value === null || value === '') {
      return `${column.column_name} is required`;
    }

    const type = column.data_type.toUpperCase();

    // Validate JSON fields
    if ((type.includes('ARRAY') || type.includes('OBJECT') || type.includes('JSON')) && value) {
      try {
        JSON.parse(value);
      } catch (e) {
        return 'Invalid JSON format';
      }
    }

    return null;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!activeConnection) {
      toast.error('No Connection', 'No active database connection');
      return;
    }

    // Validate all fields
    const errors: Record<string, string> = {};
    columns.forEach((column) => {
      const error = validateField(column, formData[column.column_name]);
      if (error) {
        errors[column.column_name] = error;
      }
    });

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      toast.error('Validation Failed', 'Please fix the errors in the form');
      return;
    }

    setValidationErrors({});
    setInserting(true);

    try {
      // Build column list and values
      const columnsToInsert: string[] = [];
      const valuesToInsert: any[] = [];

      columns.forEach((column) => {
        const value = formData[column.column_name];

        // Skip undefined values (will use defaults)
        if (value === undefined || value === null || value === '') {
          if (!column.is_nullable) {
            columnsToInsert.push(`"${column.column_name}"`);
            valuesToInsert.push(null);
          }
          return;
        }

        columnsToInsert.push(`"${column.column_name}"`);

        const type = column.data_type.toUpperCase();

        // Parse JSON fields
        if (type.includes('ARRAY') || type.includes('OBJECT') || type.includes('JSON')) {
          valuesToInsert.push(JSON.parse(value));
        }
        // Handle boolean
        else if (type.includes('BOOLEAN')) {
          valuesToInsert.push(value === true || value === 'true');
        }
        // Handle numbers
        else if (type.includes('INT') || type.includes('FLOAT') || type.includes('DOUBLE')) {
          valuesToInsert.push(Number(value));
        }
        // Handle strings
        else {
          valuesToInsert.push(value);
        }
      });

      // Generate SQL
      const columnList = columnsToInsert.join(', ');
      const placeholders = columnsToInsert.map((_, idx) => `$${idx + 1}`).join(', ');
      const sql = `INSERT INTO "${schema}"."${tableName}" (${columnList}) VALUES (${placeholders})`;

      // Execute query
      const client = activeConnection.client;
      const result = await client.query(sql, valuesToInsert);

      toast.success('Insert Successful', `Inserted 1 row into ${schema}.${tableName}`);

      // Reset form
      setFormData({});

      // Call success callback
      if (onSuccess) onSuccess();

      // Close dialog
      onClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Could not insert row';
      toast.error('Insert Failed', errorMessage);
    } finally {
      setInserting(false);
    }
  };

  /**
   * Render input field based on column type
   */
  const renderInput = (column: ColumnMetadata) => {
    const inputType = getInputType(column.data_type);
    const hasError = validationErrors[column.column_name];

    if (inputType === 'checkbox') {
      return (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id={column.column_name}
            checked={formData[column.column_name] || false}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, [column.column_name]: e.target.checked }))
            }
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
          />
          <label htmlFor={column.column_name} className="text-sm text-gray-700 dark:text-gray-300">
            {formData[column.column_name] ? 'True' : 'False'}
          </label>
        </div>
      );
    }

    if (inputType === 'json') {
      return (
        <textarea
          id={column.column_name}
          value={formData[column.column_name] || ''}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, [column.column_name]: e.target.value }))
          }
          placeholder={getPlaceholder(column)}
          rows={3}
          className={`w-full rounded-lg border px-3 py-2 font-mono text-sm ${
            hasError
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
          } dark:border-gray-600 dark:bg-gray-700 dark:text-white`}
        />
      );
    }

    return (
      <input
        type={inputType}
        id={column.column_name}
        value={formData[column.column_name] || ''}
        onChange={(e) =>
          setFormData((prev) => ({ ...prev, [column.column_name]: e.target.value }))
        }
        placeholder={getPlaceholder(column)}
        step={inputType === 'number' && column.data_type.toUpperCase().includes('FLOAT') ? '0.01' : undefined}
        className={`w-full rounded-lg border px-3 py-2 text-sm ${
          hasError
            ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
            : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
        } dark:border-gray-600 dark:bg-gray-700 dark:text-white`}
      />
    );
  };

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <Plus className="h-6 w-6 text-green-600 dark:text-green-400" />
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Insert New Row</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {schema}.{tableName}
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            {columns.map((column) => (
              <div key={column.column_name}>
                <label
                  htmlFor={column.column_name}
                  className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  {column.column_name}
                  {!column.is_nullable && (
                    <span className="ml-1 text-red-600 dark:text-red-400">*</span>
                  )}
                  <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">
                    {column.data_type}
                  </span>
                </label>
                {renderInput(column)}
                {validationErrors[column.column_name] && (
                  <div className="mt-1 flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                    <AlertCircle className="h-3 w-3" />
                    <span>{validationErrors[column.column_name]}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={inserting}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 dark:bg-green-500 dark:hover:bg-green-600"
          >
            <Plus className="h-4 w-4" />
            {inserting ? 'Inserting...' : 'Insert Row'}
          </button>
        </div>
      </form>
    </div>
  );
}
