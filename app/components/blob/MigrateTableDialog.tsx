'use client';

import { useState } from 'react';
import { X, Database, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useActiveConnection } from '../../lib/monkdb-context';

interface MigrateTableDialogProps {
  table: string;
  onClose: () => void;
  onComplete: () => void;
}

export default function MigrateTableDialog({ table, onClose, onComplete }: MigrateTableDialogProps) {
  const activeConnection = useActiveConnection();
  const [migrating, setMigrating] = useState(false);
  const [status, setStatus] = useState<'idle' | 'migrating' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const migrateTable = async () => {
    if (!activeConnection) return;

    setMigrating(true);
    setStatus('migrating');
    setMessage('Starting migration...');

    try {
      const metadataTable = `${table}_blob_metadata`;
      const quotedMetadataTable = `"${metadataTable}"`;

      // First, check which columns already exist
      setMessage('Checking existing columns...');
      const checkColumnsResponse = await fetch('/api/sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-monkdb-host': activeConnection.config.host,
          'x-monkdb-port': activeConnection.config.port.toString(),
        },
        body: JSON.stringify({
          stmt: `SELECT column_name FROM information_schema.columns WHERE table_name = '${metadataTable}' AND table_schema = 'doc'`
        }),
      });

      const existingColumnsData = await checkColumnsResponse.json();
      const existingColumns = (existingColumnsData.rows || []).map((row: any[]) => row[0]);

      // Define all enterprise columns
      const columns = [
        { name: 'deleted_at', type: 'TIMESTAMP', description: 'Soft delete support' },
        { name: 'deleted_by', type: 'TEXT', description: 'Track who deleted' },
        { name: 'thumbnail_hash', type: 'TEXT', description: 'Thumbnail support' },
        { name: 'tags', type: 'ARRAY(TEXT)', description: 'File tags/labels' },
        { name: 'is_favorite', type: 'BOOLEAN DEFAULT FALSE', description: 'Favorite/star files' },
        { name: 'file_description', type: 'TEXT', description: 'File descriptions' },
        { name: 'download_count', type: 'INT DEFAULT 0', description: 'Download tracking' },
        { name: 'last_accessed_at', type: 'TIMESTAMP', description: 'Access tracking' },
        { name: 'share_token', type: 'TEXT', description: 'Shareable links' },
        { name: 'share_expires_at', type: 'TIMESTAMP', description: 'Link expiration' },
        { name: 'share_password', type: 'TEXT', description: 'Link password' },
        { name: 'share_access_count', type: 'INT DEFAULT 0', description: 'Share tracking' },
        { name: 'parent_version_id', type: 'TEXT', description: 'File versioning' },
        { name: 'version_number', type: 'INT DEFAULT 1', description: 'Version number' },
      ];

      // Filter to only columns that don't exist
      const columnsToAdd = columns.filter(col => !existingColumns.includes(col.name));

      if (columnsToAdd.length === 0) {
        setStatus('success');
        setMessage('✅ All enterprise columns already exist! No migration needed.');
        setTimeout(() => {
          onComplete();
          onClose();
        }, 2000);
        return;
      }

      let addedCount = 0;
      const errors: string[] = [];

      for (const col of columnsToAdd) {
        setMessage(`Adding column: ${col.name}...`);

        const alterSql = `ALTER TABLE ${quotedMetadataTable} ADD COLUMN ${col.name} ${col.type}`;

        const response = await fetch('/api/sql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-monkdb-host': activeConnection.config.host,
            'x-monkdb-port': activeConnection.config.port.toString(),
          },
          body: JSON.stringify({ stmt: alterSql }),
        });

        if (response.ok) {
          addedCount++;
        } else {
          const error = await response.text();
          errors.push(`${col.name}: ${error}`);
        }
      }

      // Refresh table to make columns available
      setMessage('Refreshing table schema...');
      await fetch('/api/sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-monkdb-host': activeConnection.config.host,
          'x-monkdb-port': activeConnection.config.port.toString(),
        },
        body: JSON.stringify({ stmt: `REFRESH TABLE ${quotedMetadataTable}` }),
      });

      // Wait for schema to propagate
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify columns were added
      setMessage('Verifying schema changes...');
      const verifyResponse = await fetch('/api/sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-monkdb-host': activeConnection.config.host,
          'x-monkdb-port': activeConnection.config.port.toString(),
        },
        body: JSON.stringify({
          stmt: `SELECT column_name FROM information_schema.columns WHERE table_name = '${metadataTable}' AND table_schema = 'doc'`
        }),
      });

      if (verifyResponse.ok) {
        const verifyData = await verifyResponse.json();
        const updatedColumns = (verifyData.rows || []).map((row: any[]) => row[0]);

        const missingColumns = columnsToAdd.filter(col => !updatedColumns.includes(col.name));
        if (missingColumns.length > 0) {
          throw new Error(`Failed to add columns: ${missingColumns.map(c => c.name).join(', ')}`);
        }
      }

      if (errors.length > 0) {
        setStatus('error');
        setMessage(`⚠️ Migration completed with errors:\n${errors.slice(0, 3).join('\n')}`);
        return;
      }

      setStatus('success');
      setMessage(`✅ Migration complete! Added ${addedCount} columns. Enterprise features are now enabled.`);

      // Auto-close and reload after success
      setTimeout(() => {
        onComplete();
        onClose();
      }, 2000);

    } catch (error: any) {
      setStatus('error');
      setMessage(`❌ Migration failed: ${error.message}`);
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4">
      <div className="max-w-lg w-full rounded-xl bg-white p-6 shadow-2xl dark:bg-gray-800">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
              <Database className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Upgrade Table
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {table}
              </p>
            </div>
          </div>
          {!migrating && (
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {status === 'idle' && (
          <>
            <div className="mb-6 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                This will add <strong>14 new columns</strong> to enable enterprise features:
              </p>
              <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <li>• ⭐ Favorites/starred files</li>
                <li>• 🏷️ Tags and labels</li>
                <li>• 🗑️ Trash/recycle bin (soft delete)</li>
                <li>• 📊 Download tracking</li>
                <li>• 🔗 Shareable links</li>
                <li>• 📝 File descriptions</li>
                <li>• 🔄 File versioning</li>
                <li>• 🖼️ Thumbnail support</li>
              </ul>
            </div>

            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 mb-6 dark:border-yellow-800 dark:bg-yellow-900/20">
              <p className="text-xs text-yellow-800 dark:text-yellow-200">
                ⚠️ <strong>Note:</strong> This is a non-destructive operation. Your existing files and data will not be affected.
                New columns will be added with default values.
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={migrateTable}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                Upgrade Table
              </button>
            </div>
          </>
        )}

        {status === 'migrating' && (
          <div className="py-8 text-center">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-600 dark:text-blue-400" />
            <p className="mt-4 text-sm font-medium text-gray-900 dark:text-white">{message}</p>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Please wait, this may take a moment...
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="py-8 text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-green-600 dark:text-green-400" />
            <p className="mt-4 text-sm font-medium text-green-900 dark:text-green-200">{message}</p>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Reloading page...
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="py-8 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-600 dark:text-red-400" />
            <p className="mt-4 text-sm font-medium text-red-900 dark:text-red-200">{message}</p>
            <button
              onClick={onClose}
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
