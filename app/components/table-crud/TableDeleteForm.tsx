'use client';

import { useState } from 'react';
import { Trash2, AlertTriangle, Play, Copy, Info } from 'lucide-react';
import { useActiveConnection } from '../../lib/monkdb-context';
import { useToast } from '../ToastContext';
import type { ColumnMetadata } from '../../lib/monkdb-client';

interface TableDeleteFormProps {
  schema: string;
  tableName: string;
  columns: ColumnMetadata[];
  onClose: () => void;
  onSuccess?: () => void;
}

export default function TableDeleteForm({
  schema,
  tableName,
  columns,
  onClose,
  onSuccess,
}: TableDeleteFormProps) {
  const activeConnection = useActiveConnection();
  const toast = useToast();

  const [whereClause, setWhereClause] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [result, setResult] = useState<{ rowsAffected: number } | null>(null);

  const pkCol = columns.find(c => c.column_default?.toLowerCase().includes('primary key')) || columns[0];

  const generatedSQL = whereClause.trim()
    ? `DELETE FROM "${schema}"."${tableName}"\nWHERE ${whereClause.trim()};`
    : `DELETE FROM "${schema}"."${tableName}";`;

  const isDeleteAll = !whereClause.trim();

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedSQL);
    toast.success('Copied', 'DELETE SQL copied to clipboard');
  };

  const handleExecute = async () => {
    if (!activeConnection) return;
    if (isDeleteAll && !confirmed) return;

    setDeleting(true);
    setResult(null);
    try {
      const sql = whereClause.trim()
        ? `DELETE FROM "${schema}"."${tableName}" WHERE ${whereClause.trim()}`
        : `DELETE FROM "${schema}"."${tableName}"`;
      const res = await activeConnection.client.query(sql);
      const rowsAffected = res.rowcount ?? 0;
      setResult({ rowsAffected });
      toast.success('Delete Successful', `Deleted ${rowsAffected} row(s) from ${schema}.${tableName}`);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error('Delete Failed', err.message || 'Could not delete rows');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Danger Banner */}
      <div className="flex items-start gap-3 rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
        <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
        <div>
          <p className="text-sm font-semibold text-red-900 dark:text-red-100">Destructive Operation</p>
          <p className="mt-0.5 text-xs text-red-700 dark:text-red-300">
            Deleted rows cannot be recovered. Use a WHERE clause to target specific rows.
          </p>
        </div>
      </div>

      {/* WHERE Clause */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
          WHERE Clause <span className="font-normal text-gray-400">(leave empty to delete ALL rows)</span>
        </label>
        <textarea
          value={whereClause}
          onChange={e => { setWhereClause(e.target.value); setConfirmed(false); setResult(null); }}
          rows={3}
          placeholder={pkCol ? `e.g., ${pkCol.column_name} = 42` : 'e.g., id = 42 OR status = \'inactive\''}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        />

        {/* Column hint chips */}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {columns.map(col => (
            <button
              key={col.column_name}
              type="button"
              onClick={() => setWhereClause(prev => prev ? `${prev} AND ${col.column_name} = ` : `${col.column_name} = `)}
              className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 font-mono text-xs text-gray-600 hover:border-gray-400 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              title={col.data_type}
            >
              {col.column_name}
            </button>
          ))}
        </div>
      </div>

      {/* SQL Preview */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">SQL Preview</p>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Copy className="h-3 w-3" />
            Copy
          </button>
        </div>
        <pre className="overflow-x-auto rounded-lg bg-slate-100 dark:bg-gray-900 p-3 text-xs font-mono text-red-600 dark:text-red-400">
          {generatedSQL}
        </pre>
      </div>

      {/* Delete-all confirmation checkbox */}
      {isDeleteAll && (
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-red-300 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={e => setConfirmed(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-red-400 text-red-600 focus:ring-red-500"
          />
          <span className="text-sm font-medium text-red-800 dark:text-red-200">
            I understand this will delete <strong>ALL rows</strong> in{' '}
            <code className="font-mono">{schema}.{tableName}</code> permanently.
          </span>
        </label>
      )}

      {/* Result */}
      {result && (
        <div className="flex items-center gap-2 rounded-lg border border-green-300 bg-green-50 px-4 py-3 dark:border-green-800 dark:bg-green-900/20">
          <Info className="h-4 w-4 text-green-600 dark:text-green-400" />
          <p className="text-sm text-green-800 dark:text-green-200">
            <strong>{result.rowsAffected}</strong> row(s) deleted successfully.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <button
          onClick={handleExecute}
          disabled={deleting || (isDeleteAll && !confirmed)}
          className="flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
          {deleting ? 'Deleting…' : isDeleteAll ? 'Delete All Rows' : 'Delete Rows'}
        </button>
      </div>
    </div>
  );
}
