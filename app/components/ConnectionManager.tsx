'use client';

import { useState, useMemo } from 'react';
import { useMonkDB } from '../lib/monkdb-context';
import { MonkDBClient } from '../lib/monkdb-client';
import ConnectionDialog, { ConnectionFormData } from './ConnectionDialog';
import {
  Loader2, RefreshCw, Database, Plus, AlertTriangle, Search,
  TrendingUp, Clock, Server, Zap, Shield, Check, X, Edit2,
  Download, Upload, Filter, Star, StarOff
} from 'lucide-react';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const handleAddConnection = async (connectionData: ConnectionFormData) => {
    try {
      // Check for duplicate connections
      const duplicate = connections.find(
        c => c.config.host === connectionData.host &&
             c.config.port === connectionData.port &&
             c.config.username === connectionData.username
      );

      if (duplicate) {
        const confirmDuplicate = confirm(
          `A connection to ${connectionData.host}:${connectionData.port} with user "${connectionData.username}" already exists.\n\nDo you want to add it anyway?`
        );
        if (!confirmDuplicate) {
          return;
        }
      }

      // Detect user role by querying the database
      const tempClient = new MonkDBClient({
        host: connectionData.host,
        port: connectionData.port,
        username: connectionData.username,
        password: connectionData.password,
        protocol: 'http',
      });

      let detectedRole: 'read-only' | 'read-write' | 'superuser' = 'superuser'; // Default to superuser for better UX

      try {
        console.log('[ConnectionManager] Detecting role for user:', connectionData.username);

        // Special case: "monkdb" user is always superuser (default trust auth user)
        if (connectionData.username === 'monkdb' || connectionData.username === '' || !connectionData.username) {
          console.log('[ConnectionManager] User is "monkdb" or empty → superuser');
          detectedRole = 'superuser';
        } else {
          // For MonkDB/CrateDB, check sys.users table first (most reliable)
          try {
            const superuserCheck = await tempClient.query(
              `SELECT superuser FROM sys.users WHERE name = ?`,
              [connectionData.username]
            );
            console.log('[ConnectionManager] sys.users query result:', superuserCheck);

            const isSuperuser = superuserCheck.rows[0]?.[0] === true;

            if (isSuperuser) {
              console.log('[ConnectionManager] User has superuser=true → superuser');
              detectedRole = 'superuser';
            } else {
              console.log('[ConnectionManager] User is NOT superuser, checking MonkDB privileges (DQL/DML/DDL/AL)...');

              // Check MonkDB privilege types using sys.privileges table
              const privCheck = await tempClient.query(`
                SELECT DISTINCT type
                FROM sys.privileges
                WHERE grantee = ?
              `, [connectionData.username]);

              console.log('[ConnectionManager] Privilege rows:', privCheck.rows);

              const privileges = new Set(privCheck.rows.map(r => r[0]));
              console.log('[ConnectionManager] Unique privileges:', Array.from(privileges));

              // AL (Admin Level) = Superuser
              if (privileges.has('AL')) {
                console.log('[ConnectionManager] User has AL privilege → superuser');
                detectedRole = 'superuser';
              }
              // DDL (Data Definition Language: CREATE, ALTER, DROP) = Superuser
              else if (privileges.has('DDL')) {
                console.log('[ConnectionManager] User has DDL privilege → superuser');
                detectedRole = 'superuser';
              }
              // DML (Data Manipulation Language: INSERT, UPDATE, DELETE) = Read-Write
              else if (privileges.has('DML')) {
                console.log('[ConnectionManager] User has DML privilege (no DDL) → read-write');
                detectedRole = 'read-write';
              }
              // Only DQL (Data Query Language: SELECT) = Read-Only
              else if (privileges.has('DQL')) {
                console.log('[ConnectionManager] User has only DQL privilege → read-only');
                detectedRole = 'read-only';
              }
              // No privileges found - assume full access (enterprise: trust by default)
              else {
                console.log('[ConnectionManager] No MonkDB privileges found, assuming superuser (fail-safe)');
                detectedRole = 'superuser';
              }
            }
          } catch (queryError) {
            console.error('[ConnectionManager] Error querying user info:', queryError);
            console.log('[ConnectionManager] Permission query failed, defaulting to superuser (enterprise fail-safe)');
            detectedRole = 'superuser';
          }
        }
      } catch (error) {
        console.error('[ConnectionManager] Failed to detect user role:', error);
        // If detection completely fails, default to superuser (enterprise-grade: trust the user)
        detectedRole = 'superuser';
      }

      console.log('[ConnectionManager] ✅ Final detected role:', detectedRole);

      // Create unique connection name with timestamp if needed
      let connectionName = `${connectionData.host}:${connectionData.port} (${connectionData.username})`;
      if (duplicate) {
        const timestamp = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        connectionName += ` [${timestamp}]`;
      }

      const id = await addConnection(connectionName, {
        host: connectionData.host,
        port: connectionData.port,
        username: connectionData.username,
        password: connectionData.password,
        role: detectedRole,
      });

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
    if (confirm('Are you sure you want to delete this connection? This action cannot be undone.')) {
      removeConnection(connectionId);
      // Remove from favorites if it was favorited
      const newFavorites = new Set(favorites);
      newFavorites.delete(connectionId);
      setFavorites(newFavorites);
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

  const toggleFavorite = (connectionId: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(connectionId)) {
      newFavorites.delete(connectionId);
    } else {
      newFavorites.add(connectionId);
    }
    setFavorites(newFavorites);
  };

  const formatUptime = (seconds: number): string => {
    // Handle invalid values
    if (!seconds || seconds < 0) {
      return 'N/A';
    }

    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 KB';
    const mb = bytes / (1024 * 1024);
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    return `${(mb / 1024).toFixed(2)} GB`;
  };

  // Filter and search connections
  const filteredConnections = useMemo(() => {
    return connections.filter(conn => {
      // Search filter
      const matchesSearch = conn.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           conn.config.host.toLowerCase().includes(searchQuery.toLowerCase());

      // Status filter
      const matchesStatus = filterStatus === 'all' || conn.status === filterStatus;

      return matchesSearch && matchesStatus;
    });
  }, [connections, searchQuery, filterStatus]);

  // Separate favorites and regular connections
  const favoriteConnections = filteredConnections.filter(c => favorites.has(c.id));
  const regularConnections = filteredConnections.filter(c => !favorites.has(c.id));

  // Connection stats
  const stats = useMemo(() => {
    const connected = connections.filter(c => c.status === 'connected').length;
    const errored = connections.filter(c => c.status === 'error').length;
    const totalNodes = connections.reduce((sum, c) => sum + (c.metadata?.nodeCount || 0), 0);

    return { total: connections.length, connected, errored, totalNodes };
  }, [connections]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* Enhanced Header with Stats */}
      <div className="border-b border-gray-200 bg-white px-6 py-6 dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
              <Database className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Database Connections
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Manage and monitor your MonkDB cluster connections
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-blue-700 transition-all hover:shadow-xl dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            <Plus className="h-5 w-5" />
            New Connection
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Connections</p>
                <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              </div>
              <Server className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Connected</p>
                <p className="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">{stats.connected}</p>
              </div>
              <Check className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Errors</p>
                <p className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">{stats.errored}</p>
              </div>
              <X className="h-8 w-8 text-red-500" />
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Nodes</p>
                <p className="mt-1 text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.totalNodes}</p>
              </div>
              <Zap className="h-8 w-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mt-4 flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search connections by name or host..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="connected">Connected</option>
            <option value="connecting">Connecting</option>
            <option value="error">Error</option>
          </select>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Quick Start Guide (show when empty) */}
        {connections.length === 0 && (
          <div className="mx-auto max-w-2xl">
            <div className="rounded-xl border-2 border-dashed border-gray-300 bg-white p-12 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                <Database className="h-10 w-10 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
                No Connections Yet
              </h3>
              <p className="mb-6 text-gray-600 dark:text-gray-400">
                Get started by adding your first MonkDB connection. Connect to local or remote databases.
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                <Plus className="h-5 w-5" />
                Add Your First Connection
              </button>

              {/* Quick Tips */}
              <div className="mt-8 rounded-lg bg-blue-50 p-6 text-left dark:bg-blue-900/20">
                <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-blue-900 dark:text-blue-300">
                  <Shield className="h-4 w-4" />
                  Quick Tips
                </h4>
                <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                  <li className="flex gap-2">
                    <span className="text-blue-600">•</span>
                    <span>Use <strong>localhost:4200</strong> for local development</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-600">•</span>
                    <span>Create users with <strong>"Create New MonkDB User"</strong> button</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-600">•</span>
                    <span>Enable SSL/TLS for production connections</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-600">•</span>
                    <span>Test connections before saving to verify credentials</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Favorites Section */}
        {favoriteConnections.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              Favorites
            </h2>
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {favoriteConnections.map((connection) => (
                <ConnectionCard
                  key={connection.id}
                  connection={connection}
                  isActive={activeConnectionId === connection.id}
                  isFavorite={true}
                  isRefreshing={refreshingId === connection.id}
                  onUse={() => setActiveConnection(connection.id)}
                  onRefresh={() => handleRefresh(connection.id)}
                  onDelete={() => handleDelete(connection.id)}
                  onToggleFavorite={() => toggleFavorite(connection.id)}
                  formatUptime={formatUptime}
                />
              ))}
            </div>
          </div>
        )}

        {/* All Connections */}
        {regularConnections.length > 0 && (
          <div>
            {favoriteConnections.length > 0 && (
              <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                <Server className="h-4 w-4" />
                All Connections
              </h2>
            )}
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {regularConnections.map((connection) => (
                <ConnectionCard
                  key={connection.id}
                  connection={connection}
                  isActive={activeConnectionId === connection.id}
                  isFavorite={false}
                  isRefreshing={refreshingId === connection.id}
                  onUse={() => setActiveConnection(connection.id)}
                  onRefresh={() => handleRefresh(connection.id)}
                  onDelete={() => handleDelete(connection.id)}
                  onToggleFavorite={() => toggleFavorite(connection.id)}
                  formatUptime={formatUptime}
                />
              ))}
            </div>
          </div>
        )}

        {/* No Results */}
        {filteredConnections.length === 0 && connections.length > 0 && (
          <div className="mx-auto max-w-md text-center">
            <Search className="mx-auto h-16 w-16 text-gray-400" />
            <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
              No connections found
            </h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Try adjusting your search or filter criteria
            </p>
          </div>
        )}
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

// Connection Card Component
function ConnectionCard({
  connection,
  isActive,
  isFavorite,
  isRefreshing,
  onUse,
  onRefresh,
  onDelete,
  onToggleFavorite,
  formatUptime,
}: any) {
  return (
    <div
      className={`group relative rounded-xl border p-5 transition-all hover:shadow-lg ${
        isActive
          ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-white shadow-md dark:from-blue-900/20 dark:to-gray-800 dark:border-blue-400'
          : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600'
      }`}
    >
      {/* Favorite Star */}
      <button
        onClick={onToggleFavorite}
        className="absolute right-3 top-3 text-gray-400 opacity-0 transition-opacity hover:text-yellow-400 group-hover:opacity-100"
        title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      >
        {isFavorite ? (
          <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
        ) : (
          <StarOff className="h-5 w-5" />
        )}
      </button>

      {/* Header */}
      <div className="mb-4">
        <div className="mb-2 flex items-start gap-3">
          <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${
            connection.status === 'connected'
              ? 'bg-green-100 dark:bg-green-900/30'
              : connection.status === 'error'
              ? 'bg-red-100 dark:bg-red-900/30'
              : 'bg-gray-100 dark:bg-gray-700'
          }`}>
            <Database className={`h-5 w-5 ${
              connection.status === 'connected'
                ? 'text-green-600 dark:text-green-400'
                : connection.status === 'error'
                ? 'text-red-600 dark:text-red-400'
                : 'text-gray-600 dark:text-gray-400'
            }`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-gray-900 truncate dark:text-white">
              {connection.config.host}:{connection.config.port}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              <span className="font-medium">User:</span> {connection.config.username || 'anonymous'}
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
            connection.status === 'connected'
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : connection.status === 'connecting'
              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
              : connection.status === 'error'
              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
          }`}
        >
          {connection.status === 'connecting' ? (
            <span className="flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin" />
              Connecting
            </span>
          ) : (
            <span className="capitalize">{connection.status}</span>
          )}
        </span>

        {/* Active Badge */}
        {isActive && (
          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
            <Zap className="h-3 w-3" />
            Active
          </span>
        )}
      </div>

      {/* Error Message */}
      {connection.error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
          <p className="text-xs text-red-700 dark:text-red-400 line-clamp-2">
            {connection.error}
          </p>
        </div>
      )}

      {/* Metadata */}
      {connection.status === 'connected' && connection.metadata && (
        <div className="mb-4 space-y-2 rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
          {connection.metadata.version && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-400">Version</span>
              <span className="font-mono font-semibold text-gray-900 dark:text-white">
                {connection.metadata.version}
              </span>
            </div>
          )}
          {connection.metadata.nodeCount !== undefined && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-400">Cluster Nodes</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {connection.metadata.nodeCount}
              </span>
            </div>
          )}
          {connection.metadata.uptime !== undefined && (
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                <Clock className="h-3 w-3" />
                Uptime
              </span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {formatUptime(connection.metadata.uptime)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {isActive ? (
          <button
            disabled
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-blue-100 px-3 py-2 text-sm font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
          >
            <Check className="h-4 w-4" />
            In Use
          </button>
        ) : (
          <button
            onClick={onUse}
            disabled={connection.status !== 'connected'}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-green-50 px-3 py-2 text-sm font-semibold text-green-700 hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30"
          >
            <Zap className="h-4 w-4" />
            Use
          </button>
        )}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="rounded-lg bg-gray-100 p-2 text-gray-700 hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          title="Refresh connection status"
        >
          {isRefreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </button>
        <button
          onClick={onDelete}
          className="rounded-lg bg-red-50 p-2 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
          title="Delete connection"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
