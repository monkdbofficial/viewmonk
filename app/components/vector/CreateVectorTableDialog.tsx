'use client';

import { useState } from 'react';
import { X, Plus, Loader2 } from 'lucide-react';
import { useMonkDBClient } from '@/app/lib/monkdb-context';
import { useAccessibleSchemas } from '@/app/hooks/useAccessibleSchemas';
import { useToast } from '@/app/components/ToastContext';

interface CreateVectorTableDialogProps {
  onClose: () => void;
  onSuccess: () => void;
}

const DIMENSION_PRESETS = [
  { label: 'MiniLM (384D)', value: 384, description: 'Small, fast, good for most use cases' },
  { label: 'MPNet (768D)', value: 768, description: 'Larger, better quality' },
  { label: 'OpenAI (1536D)', value: 1536, description: 'OpenAI ada-002 compatible' },
  { label: 'Custom', value: 0, description: 'Enter custom dimension' },
];

export default function CreateVectorTableDialog({
  onClose,
  onSuccess,
}: CreateVectorTableDialogProps) {
  const client = useMonkDBClient();
  const { schemas } = useAccessibleSchemas();
  const toast = useToast();

  const [schema, setSchema] = useState('');
  const [tableName, setTableName] = useState('');
  const [preset, setPreset] = useState(384);
  const [customDimension, setCustomDimension] = useState(384);
  const [creating, setCreating] = useState(false);

  const dimension = preset === 0 ? customDimension : preset;

  const sqlPreview = schema && tableName
    ? `CREATE TABLE "${schema}"."${tableName}" (
  id TEXT PRIMARY KEY,
  content TEXT,
  embedding FLOAT_VECTOR(${dimension})
);`
    : '';

  const handleCreate = async () => {
    if (!client || !schema || !tableName || dimension <= 0) return;

    setCreating(true);

    try {
      await client.query(sqlPreview);
      toast.success('Table Created', `Created table ${schema}.${tableName}`);
      onSuccess();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create table';
      toast.error('Create Failed', message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Create Vector Table
          </h2>
          <button
            onClick={onClose}
            disabled={creating}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Schema Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Schema
            </label>
            <select
              value={schema}
              onChange={(e) => setSchema(e.target.value)}
              disabled={creating}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select schema...</option>
              {schemas.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Table Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Table Name
            </label>
            <input
              type="text"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              placeholder="my_documents"
              disabled={creating}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Dimension Presets */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Vector Dimension
            </label>
            <div className="grid grid-cols-2 gap-3">
              {DIMENSION_PRESETS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPreset(p.value)}
                  disabled={creating}
                  className={`p-4 border-2 rounded-lg text-left transition-colors ${
                    preset === p.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
                  }`}
                >
                  <div className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                    {p.label}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {p.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Dimension Input */}
          {preset === 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Custom Dimension
              </label>
              <input
                type="number"
                value={customDimension}
                onChange={(e) => setCustomDimension(parseInt(e.target.value) || 384)}
                min="1"
                max="4096"
                disabled={creating}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          {/* SQL Preview */}
          {sqlPreview && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                SQL Preview
              </label>
              <pre className="p-4 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-mono text-gray-900 dark:text-gray-100 overflow-x-auto">
                {sqlPreview}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={creating}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={creating || !schema || !tableName || dimension <= 0}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Create Table
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
