'use client';

import { useState } from 'react';
import { X, Database, AlertCircle, Loader2 } from 'lucide-react';

interface CreateTableDialogProps {
  onClose: () => void;
  onCreate: (tableName: string) => Promise<void>;
}

export default function CreateTableDialog({ onClose, onCreate }: CreateTableDialogProps) {
  const [tableName, setTableName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateTableName = (name: string): string | null => {
    if (!name.trim()) {
      return 'Table name cannot be empty';
    }

    // SQL identifier validation
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
      return 'Table name must start with a letter or underscore and contain only letters, numbers, and underscores';
    }

    if (name.length > 63) {
      return 'Table name must be 63 characters or less';
    }

    // Check for SQL reserved words (basic list)
    const reservedWords = ['table', 'select', 'insert', 'update', 'delete', 'from', 'where', 'join'];
    if (reservedWords.includes(name.toLowerCase())) {
      return 'Table name cannot be a SQL reserved word';
    }

    return null;
  };

  const handleCreate = async () => {
    const validationError = validateTableName(tableName);
    if (validationError) {
      setError(validationError);
      return;
    }

    setCreating(true);
    setError(null);

    try {
      await onCreate(tableName);
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create table';
      setError(errorMessage);
    } finally {
      setCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !creating) {
      handleCreate();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl dark:bg-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-6 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Database className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Create BLOB Table
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Create a new table for BLOB storage
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={creating}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Table Name
            </label>
            <input
              type="text"
              value={tableName}
              onChange={(e) => {
                setTableName(e.target.value);
                setError(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder="e.g., documents, images, files"
              disabled={creating}
              autoFocus
              className={`w-full rounded-lg border px-4 py-2.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-700 dark:text-white ${
                error
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500 dark:border-red-600'
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600'
              }`}
            />
            {error ? (
              <div className="mt-2 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900/50 dark:bg-red-900/20">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600 dark:text-red-400" />
                <p className="text-xs text-red-700 dark:text-red-400">{error}</p>
              </div>
            ) : (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Must start with a letter or underscore. Only letters, numbers, and underscores allowed.
              </p>
            )}
          </div>

          {/* Info Panel */}
          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
            <p className="text-xs text-blue-900 dark:text-blue-200">
              <strong>Note:</strong> This will create a table with columns for storing BLOB metadata (filename, size, content type, etc.)
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 p-6 dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={creating}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={creating || !tableName.trim()}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            {creating && <Loader2 className="h-4 w-4 animate-spin" />}
            {creating ? 'Creating...' : 'Create Table'}
          </button>
        </div>
      </div>
    </div>
  );
}
