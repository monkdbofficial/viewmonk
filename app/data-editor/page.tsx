'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Database } from 'lucide-react';
import { useActiveConnection } from '../lib/monkdb-context';
import { useSchemaMetadata } from '../lib/hooks/useSchemaMetadata';
import { useToast } from '../components/ToastContext';
import DataGrid from '../components/data-editor/DataGrid';
import ConnectionPrompt from '../components/common/ConnectionPrompt';

export default function DataEditorPage() {
  const router = useRouter();
  const activeConnection = useActiveConnection();
  const { schemas } = useSchemaMetadata();
  const { error: showError } = useToast();

  const [selectedSchema, setSelectedSchema] = useState('');
  const [selectedTable, setSelectedTable] = useState('');
  const [tables, setTables] = useState<string[]>([]);
  const [showGrid, setShowGrid] = useState(false);

  useEffect(() => {
    if (selectedSchema) {
      fetchTables();
    }
  }, [selectedSchema]);

  const fetchTables = async () => {
    if (!activeConnection || !selectedSchema) return;

    try {
      const result = await activeConnection.client.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = ?
          AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `, [selectedSchema]);

      setTables(result.rows.map((row: any[]) => row[0]));
    } catch (err: any) {
      console.error('Failed to fetch tables:', err);
      showError('Failed to Load Tables', err.message);
    }
  };

  const handleOpenGrid = () => {
    if (!selectedSchema || !selectedTable) {
      showError('Invalid Selection', 'Please select both a schema and a table');
      return;
    }
    setShowGrid(true);
  };

  if (!activeConnection) {
    return <ConnectionPrompt onConnect={() => router.push('/connections')} />;
  }

  if (showGrid && selectedSchema && selectedTable) {
    return (
      <div className="flex h-full flex-col">
        <DataGrid
          schema={selectedSchema}
          table={selectedTable}
          onClose={() => setShowGrid(false)}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 shadow-lg dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-6 flex items-center gap-3">
          <Database className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Data Editor
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Select a table to edit
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Schema Selection */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Schema
            </label>
            <select
              value={selectedSchema}
              onChange={(e) => {
                setSelectedSchema(e.target.value);
                setSelectedTable('');
              }}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Select Schema</option>
              {schemas.map(schema => (
                <option key={schema.name} value={schema.name}>
                  {schema.name}
                </option>
              ))}
            </select>
          </div>

          {/* Table Selection */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Table
            </label>
            <select
              value={selectedTable}
              onChange={(e) => setSelectedTable(e.target.value)}
              disabled={!selectedSchema}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Select Table</option>
              {tables.map(table => (
                <option key={table} value={table}>
                  {table}
                </option>
              ))}
            </select>
          </div>

          {/* Open Button */}
          <button
            onClick={handleOpenGrid}
            disabled={!selectedSchema || !selectedTable}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Open Data Editor
          </button>

          {/* Info */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
            <p className="text-xs text-blue-800 dark:text-blue-200">
              <strong>Tip:</strong> The data editor allows you to view and edit table data in a
              spreadsheet-like interface. You can add, edit, and delete rows directly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
