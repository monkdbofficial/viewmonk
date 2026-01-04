'use client';

import { useState } from 'react';
import { useMonkDB } from '../lib/monkdb-context';
import ConnectionDialog, { ConnectionFormData } from './ConnectionDialog';
import { Loader2, RefreshCw, Database, Plus, AlertTriangle } from 'lucide-react';

export default function ConnectionManager() {
  const {
    connections,
    activeConnectionId,
    addConnection,
    removeConnection,
    setActiveConnection,
    refreshConnection,
  } = useMonkDB();

  const [showAddModal, setShowAddModal] = useState(false);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  const handleAddConnection = async (connectionData: ConnectionFormData) => {
    try {
      const id = await addConnection(`${connectionData.database} (${connectionData.host})`, {
        host: connectionData.host,
        port: connectionData.port,
        username: connectionData.username,
        password: connectionData.password,
      });

      // Automatically set the new connection as active after a short delay
      // to ensure the connection test has completed
      setTimeout(() => {
        setActiveConnection(id);
      }, 2000);

      setShowAddModal(false);
    } catch (error) {
      console.error('Failed to add connection:', error);
      alert('Failed to add connection: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleDelete = (connectionId: string) => {
    if (confirm('Are you sure you want to delete this connection?')) {
      removeConnection(connectionId);
    }
  };

  const handleRefresh = async (connectionId: string) => {
    setRefreshingId(connectionId);
    try {
      await refreshConnection(connectionId);
    } finally {
      setRefreshingId(null);
    }
  };

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 KB';
    const mb = bytes / (1024 * 1024);
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    return `${(mb / 1024).toFixed(2)} GB`;
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Fixed Header */}
      <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-6 py-4 dark:border-gray-700 dark:from-gray-800 dark:to-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Database className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Database Connections
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Manage your MonkDB database connections
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            <Plus className="h-4 w-4" />
            Add Connection
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-auto">
        <div className="space-y-4 p-4">
          {/* Info Panel */}
          <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-blue-900 dark:text-blue-300">
              <AlertTriangle className="h-4 w-4" />
              Connection Information
            </h3>
            <div className="space-y-2 text-xs text-blue-800 dark:text-blue-200">
              <p><strong>Manage your MonkDB cluster connections:</strong></p>
              <ul className="ml-4 list-disc space-y-1">
                <li>Click <strong>Add Connection</strong> to create a new database connection</li>
                <li>Click <strong>Use</strong> to set a connection as active for all operations</li>
                <li>Click <strong>Refresh</strong> to update connection status and metadata</li>
                <li>Active connection shows connection details (version, nodes, uptime)</li>
                <li>Status badges: <span className="rounded bg-green-100 px-1 text-green-800 dark:bg-green-900 dark:text-green-200">connected</span> / <span className="rounded bg-yellow-100 px-1 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">connecting</span> / <span className="rounded bg-red-100 px-1 text-red-800 dark:bg-red-900 dark:text-red-200">error</span></li>
              </ul>
            </div>
          </div>

      {/* Connections Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {connections.length === 0 ? (
          <div className="col-span-full rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center dark:border-gray-700 dark:bg-gray-800/50">
            <p className="text-gray-600 dark:text-gray-400">
              No connections yet. Add your first MonkDB connection to get started.
            </p>
          </div>
        ) : (
          connections.map((connection) => (
            <div
              key={connection.id}
              className={`rounded-lg border p-4 ${
                activeConnectionId === connection.id
                  ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20'
                  : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
              }`}
            >
              <div className="mb-3 flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                    {connection.name}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {connection.config.host}:{connection.config.port}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    connection.status === 'connected'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : connection.status === 'connecting'
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      : connection.status === 'error'
                      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                  }`}
                >
                  {connection.status === 'connecting' ? (
                    <span className="flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      connecting
                    </span>
                  ) : (
                    connection.status
                  )}
                </span>
              </div>

              {connection.error && (
                <div className="mb-3 rounded-md bg-red-50 p-2.5 dark:bg-red-900/20">
                  <p className="text-xs text-red-700 dark:text-red-400">{connection.error}</p>
                </div>
              )}

              <div className="space-y-1.5 text-sm">
                {connection.metadata?.version && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Version:</span>
                    <span className="font-mono text-xs text-gray-900 dark:text-white">
                      {connection.metadata.version}
                    </span>
                  </div>
                )}
                {connection.metadata?.nodeCount !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Nodes:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {connection.metadata.nodeCount}
                    </span>
                  </div>
                )}
                {connection.metadata?.uptime !== undefined && connection.status === 'connected' && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Uptime:</span>
                    <span className="text-gray-900 dark:text-white">
                      {formatUptime(connection.metadata.uptime)}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-3 flex gap-2">
                {activeConnectionId === connection.id ? (
                  <button
                    disabled
                    className="flex-1 rounded bg-blue-100 px-3 py-2 text-sm font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                  >
                    Active
                  </button>
                ) : (
                  <button
                    onClick={() => setActiveConnection(connection.id)}
                    disabled={connection.status !== 'connected'}
                    className="flex-1 rounded bg-green-50 px-3 py-2 text-sm font-medium text-green-700 hover:bg-green-100 disabled:opacity-50 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30"
                  >
                    Use
                  </button>
                )}
                <button
                  onClick={() => handleRefresh(connection.id)}
                  disabled={refreshingId === connection.id}
                  className="rounded bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                  title="Refresh connection"
                >
                  {refreshingId === connection.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={() => handleDelete(connection.id)}
                  className="rounded bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
                  title="Delete connection"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
        </div>
      </div>

      {/* Add Connection Modal */}
      <ConnectionDialog
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onConnect={handleAddConnection}
        mode="add"
      />
    </div>
  );
}
