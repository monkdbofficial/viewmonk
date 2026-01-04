'use client';

import { useState } from 'react';
import { X, Edit, AlertCircle, Info } from 'lucide-react';
import { useActiveConnection } from '../../lib/monkdb-context';
import { useToast } from '../ToastContext';
import type { ColumnMetadata } from '../../lib/monkdb-client';

interface TableUpdateFormProps {
  schema: string;
  tableName: string;
  columns: ColumnMetadata[];
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * Table Update Form Component
 *
 * Dynamic form for updating rows in a table with WHERE clause builder.
 * - Type-appropriate inputs for each data type
 * - WHERE clause builder for targeting rows
 * - SQL generation and execution
 * - Success/error feedback with affected row count
 */
export default function TableUpdateForm({
  schema,
  tableName,
  columns,
  onClose,
  onSuccess,
}: TableUpdateFormProps) {
  const activeConnection = useActiveConnection();
  const toast = useToast();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [whereClause, setWhereClause] = useState('');
  const [updating, setUpdating] = useState(false);
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
    return `Enter ${column.column_name}`;
  };

  /**
   * Validate JSON fields
   */
  const validateField = (column: ColumnMetadata, value: any): string | null => {
    if (value === undefined || value === null || value === '') {
      return null; // Empty is OK for updates
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

    // Check if at least one field is being updated
    const fieldsToUpdate = Object.entries(formData).filter(
      ([_, value]) => value !== undefined && value !== null && value !== ''
    );

    if (fieldsToUpdate.length === 0) {
      toast.error('No Changes', 'Please specify at least one field to update');
      return;
    }

    // Validate all fields being updated
    const errors: Record<string, string> = {};
    fieldsToUpdate.forEach(([columnName, value]) => {
      const column = columns.find((col) => col.column_name === columnName);
      if (column) {
        const error = validateField(column, value);
        if (error) {
          errors[columnName] = error;
        }
      }
    });

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      toast.error('Validation Failed', 'Please fix the errors in the form');
      return;
    }

    // Warn if no WHERE clause
    if (!whereClause.trim()) {
      if (
        !confirm(
          'WARNING: No WHERE clause specified! This will update ALL rows in the table. Continue?'
        )
      ) {
        return;
      }
    }

    setValidationErrors({});
    setUpdating(true);

    try {
      // Build SET clause
      const setColumns: string[] = [];
      const setValues: any[] = [];

      fieldsToUpdate.forEach(([columnName, value], idx) => {
        const column = columns.find((col) => col.column_name === columnName);
        if (!column) return;

        setColumns.push(`"${columnName}" = $${idx + 1}`);

        const type = column.data_type.toUpperCase();

        // Parse JSON fields
        if (type.includes('ARRAY') || type.includes('OBJECT') || type.includes('JSON')) {
          setValues.push(JSON.parse(value));
        }
        // Handle boolean
        else if (type.includes('BOOLEAN')) {
          setValues.push(value === true || value === 'true');
        }
        // Handle numbers
        else if (type.includes('INT') || type.includes('FLOAT') || type.includes('DOUBLE')) {
          setValues.push(Number(value));
        }
        // Handle strings
        else {
          setValues.push(value);
        }
      });

      // Generate SQL
      const setClause = setColumns.join(', ');
      const whereCondition = whereClause.trim() ? ` WHERE ${whereClause.trim()}` : '';
      const sql = `UPDATE "${schema}"."${tableName}" SET ${setClause}${whereCondition}`;

      console.log('[Update Query]', sql, 'Values:', setValues);

      // Execute query
      const client = activeConnection.client;
      const result = await client.query(sql, setValues);

      const rowsAffected = result.rowcount || 0;
      toast.success(
        'Update Successful',
        `Updated ${rowsAffected} row(s) in ${schema}.${tableName}`
      );

      // Reset form
      setFormData({});
      setWhereClause('');

      // Call success callback
      if (onSuccess) onSuccess();

      // Close dialog
      onClose();
    } catch (error) {
      console.error('Update failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Could not update rows';
      toast.error('Update Failed', errorMessage);
    } finally {
      setUpdating(false);
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
          <Edit className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Update Rows</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {schema}.{tableName}
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
          {/* WHERE Clause */}
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
            <div className="mb-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <label className="text-sm font-medium text-amber-900 dark:text-amber-100">
                WHERE Clause (Optional)
              </label>
            </div>
            <input
              type="text"
              value={whereClause}
              onChange={(e) => setWhereClause(e.target.value)}
              placeholder='e.g., id = 123 OR name = "John"'
              className="w-full rounded-lg border border-amber-300 px-3 py-2 font-mono text-sm text-gray-900 focus:border-amber-500 focus:ring-amber-500 dark:border-amber-700 dark:bg-amber-900/30 dark:text-white"
            />
            <p className="mt-1.5 flex items-start gap-1 text-xs text-amber-800 dark:text-amber-200">
              <Info className="mt-0.5 h-3 w-3 flex-shrink-0" />
              <span>
                If left empty, ALL rows in the table will be updated. Use conditions like{' '}
                <code className="rounded bg-amber-200 px-1 dark:bg-amber-800">id = 1</code> to target
                specific rows.
              </span>
            </p>
          </div>

          {/* Fields to Update */}
          <div className="space-y-4">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Fields to Update (leave empty to keep current value):
            </p>
            {columns.map((column) => (
              <div key={column.column_name}>
                <label
                  htmlFor={column.column_name}
                  className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  {column.column_name}
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
            disabled={updating}
            className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50 dark:bg-amber-500 dark:hover:bg-amber-600"
          >
            <Edit className="h-4 w-4" />
            {updating ? 'Updating...' : 'Update Rows'}
          </button>
        </div>
      </form>
    </div>
  );
}
