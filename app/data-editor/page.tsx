'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Database,
  Table,
  Search,
  Star,
  StarOff,
  Clock,
  TrendingUp,
  FileText,
  Grid3x3,
  ChevronRight,
  Layers,
  BarChart3,
  RefreshCw,
  Filter,
  SortAsc,
  Edit3,
} from 'lucide-react';
import { useActiveConnection } from '../lib/monkdb-context';
import { useSchemaMetadata } from '../lib/hooks/useSchemaMetadata';
import { useToast } from '../components/ToastContext';
import DataGrid from '../components/data-editor/DataGrid';
import ConnectionPrompt from '../components/common/ConnectionPrompt';

interface TableInfo {
  schema: string;
  name: string;
  rowCount: number;
  size: string;
  lastAccessed?: Date;
}

export default function DataEditorPage() {
  const router = useRouter();
  const activeConnection = useActiveConnection();
  const { schemas } = useSchemaMetadata();
  const { error: showError } = useToast();

  const [selectedSchema, setSelectedSchema] = useState('');
  const [selectedTable, setSelectedTable] = useState('');
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [filteredTables, setFilteredTables] = useState<TableInfo[]>([]);
  const [showGrid, setShowGrid] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [recentTables, setRecentTables] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'name' | 'rows' | 'size'>('name');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Load favorites and recent tables from localStorage
  useEffect(() => {
    const storedFavorites = localStorage.getItem('monkdb-favorite-tables');
    if (storedFavorites) {
      setFavorites(new Set(JSON.parse(storedFavorites)));
    }

    const storedRecent = localStorage.getItem('monkdb-recent-tables');
    if (storedRecent) {
      setRecentTables(JSON.parse(storedRecent));
    }
  }, []);

  useEffect(() => {
    if (selectedSchema) {
      fetchTables();
    }
  }, [selectedSchema]);

  useEffect(() => {
    filterAndSortTables();
  }, [tables, searchTerm, sortBy]);

  const fetchTables = async () => {
    if (!activeConnection || !selectedSchema) return;

    setLoading(true);
    try {
      // Get list of tables in the schema
      const result = await activeConnection.client.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = ?
          AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `, [selectedSchema]);

      const tableList: TableInfo[] = [];

      // For each table, get row count and size
      for (const row of result.rows) {
        const tableName = row[0];

        try {
          // Get row count
          const countResult = await activeConnection.client.query(
            `SELECT COUNT(*) FROM "${selectedSchema}"."${tableName}"`
          );
          const rowCount = countResult.rows[0][0] || 0;

          // Get size from sys.shards (CrateDB/MonkDB specific)
          let size = 'N/A';
          try {
            const sizeResult = await activeConnection.client.query(`
              SELECT SUM(num_docs) as docs, SUM(size) as bytes
              FROM sys.shards
              WHERE schema_name = ?
                AND table_name = ?
            `, [selectedSchema, tableName]);

            if (sizeResult.rows.length > 0 && sizeResult.rows[0][1] !== null) {
              const bytes = sizeResult.rows[0][1];
              size = formatBytes(bytes);
            }
          } catch (sizeErr) {
            console.warn(`Could not get size for ${tableName}:`, sizeErr);
          }

          tableList.push({
            schema: selectedSchema,
            name: tableName,
            rowCount: rowCount,
            size: size,
          });
        } catch (err) {
          console.error(`Failed to get info for ${tableName}:`, err);
          tableList.push({
            schema: selectedSchema,
            name: tableName,
            rowCount: 0,
            size: 'N/A',
          });
        }
      }

      setTables(tableList);
      setFilteredTables(tableList);
    } catch (err: any) {
      console.error('Failed to fetch tables:', err);
      showError('Failed to Load Tables', err.message);
      setTables([]);
      setFilteredTables([]);
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const filterAndSortTables = () => {
    let filtered = tables;

    // Filter by search
    if (searchTerm) {
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'rows':
          return b.rowCount - a.rowCount;
        case 'size':
          return b.size.localeCompare(a.size);
        default:
          return 0;
      }
    });

    setFilteredTables(filtered);
  };

  const handleOpenGrid = (schema: string, table: string) => {
    // Add to recent tables
    const tableKey = `${schema}.${table}`;
    const updatedRecent = [tableKey, ...recentTables.filter(t => t !== tableKey)].slice(0, 10);
    setRecentTables(updatedRecent);
    localStorage.setItem('monkdb-recent-tables', JSON.stringify(updatedRecent));

    setSelectedSchema(schema);
    setSelectedTable(table);
    setShowGrid(true);
  };

  const toggleFavorite = (schema: string, table: string) => {
    const tableKey = `${schema}.${table}`;
    const newFavorites = new Set(favorites);

    if (newFavorites.has(tableKey)) {
      newFavorites.delete(tableKey);
    } else {
      newFavorites.add(tableKey);
    }

    setFavorites(newFavorites);
    localStorage.setItem('monkdb-favorite-tables', JSON.stringify([...newFavorites]));
  };

  if (!activeConnection) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <ConnectionPrompt onConnect={() => router.push('/connections')} />
      </div>
    );
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

  const favoriteTablesList = recentTables
    .filter(t => favorites.has(t))
    .map(key => {
      const [schema, table] = key.split('.');
      return tables.find(t => t.schema === schema && t.name === table);
    })
    .filter(Boolean) as TableInfo[];

  const recentTablesList = recentTables
    .filter(t => !favorites.has(t))
    .slice(0, 5)
    .map(key => {
      const [schema, table] = key.split('.');
      return tables.find(t => t.schema === schema && t.name === table);
    })
    .filter(Boolean) as TableInfo[];

  return (
    <div className="flex h-full flex-col overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-5 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-green-600 to-emerald-600 shadow-lg">
              <Table className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Data Editor
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                View, edit, and manage table data with spreadsheet-like interface
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 rounded-lg border border-gray-300 dark:border-gray-600 p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`rounded p-1.5 transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                }`}
                title="Grid view"
              >
                <Grid3x3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`rounded p-1.5 transition-colors ${
                  viewMode === 'list'
                    ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                }`}
                title="List view"
              >
                <Layers className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4">
          <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-blue-50 to-blue-100/50 p-4 dark:from-blue-900/20 dark:to-blue-900/10 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-blue-600 dark:text-blue-400">Available Schemas</p>
                <p className="mt-1 text-3xl font-bold text-blue-900 dark:text-blue-300">{schemas.length}</p>
              </div>
              <Database className="h-10 w-10 text-blue-500/30" />
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-green-50 to-green-100/50 p-4 dark:from-green-900/20 dark:to-green-900/10 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-green-600 dark:text-green-400">Tables in Schema</p>
                <p className="mt-1 text-3xl font-bold text-green-900 dark:text-green-300">{tables.length}</p>
              </div>
              <Table className="h-10 w-10 text-green-500/30" />
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-purple-50 to-purple-100/50 p-4 dark:from-purple-900/20 dark:to-purple-900/10 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-purple-600 dark:text-purple-400">Favorite Tables</p>
                <p className="mt-1 text-3xl font-bold text-purple-900 dark:text-purple-300">{favorites.size}</p>
              </div>
              <Star className="h-10 w-10 text-purple-500/30" />
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-orange-50 to-orange-100/50 p-4 dark:from-orange-900/20 dark:to-orange-900/10 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-orange-600 dark:text-orange-400">Recent Tables</p>
                <p className="mt-1 text-3xl font-bold text-orange-900 dark:text-orange-300">{recentTables.length}</p>
              </div>
              <Clock className="h-10 w-10 text-orange-500/30" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Schema & Table Selection */}
        <div className="w-80 border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 overflow-auto">
          <div className="p-4 space-y-4">
            {/* Schema Selection */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                <Database className="inline h-4 w-4 mr-1" />
                Select Schema
              </label>
              <select
                value={selectedSchema}
                onChange={(e) => {
                  setSelectedSchema(e.target.value);
                  setSelectedTable('');
                  setSearchTerm('');
                }}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Choose a schema...</option>
                {schemas.map(schema => (
                  <option key={schema.name} value={schema.name}>
                    {schema.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Search & Sort */}
            {selectedSchema && (
              <>
                <div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search tables..."
                      className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <SortAsc className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="name">Sort by Name</option>
                    <option value="rows">Sort by Row Count</option>
                    <option value="size">Sort by Size</option>
                  </select>
                </div>

                <button
                  onClick={fetchTables}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh Tables
                </button>
              </>
            )}
          </div>

          {/* Tables List */}
          {selectedSchema && (
            <div className="border-t border-gray-200 dark:border-gray-700">
              {loading ? (
                <div className="p-6 text-center">
                  <RefreshCw className="mx-auto h-6 w-6 animate-spin text-green-600 dark:text-green-400" />
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading tables...</p>
                </div>
              ) : filteredTables.length === 0 ? (
                <div className="p-6 text-center">
                  <Table className="mx-auto h-8 w-8 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    {searchTerm ? 'No tables match your search' : 'No tables in this schema'}
                  </p>
                </div>
              ) : (
                <div className="p-2">
                  {filteredTables.map((table) => {
                    const tableKey = `${table.schema}.${table.name}`;
                    const isFavorite = favorites.has(tableKey);

                    return (
                      <div
                        key={table.name}
                        className="group mb-1 rounded-lg border border-gray-200 bg-white p-3 transition-all hover:border-green-300 hover:shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:hover:border-green-700"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div
                            className="flex-1 min-w-0 cursor-pointer"
                            onClick={() => handleOpenGrid(table.schema, table.name)}
                          >
                            <div className="flex items-center gap-2">
                              <Table className="h-4 w-4 flex-shrink-0 text-green-600 dark:text-green-400" />
                              <span className="font-mono text-sm font-medium text-gray-900 dark:text-white truncate">
                                {table.name}
                              </span>
                            </div>
                            <div className="mt-1.5 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                              <span className="flex items-center gap-1">
                                <BarChart3 className="h-3 w-3" />
                                {table.rowCount.toLocaleString()} rows
                              </span>
                              <span className="flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                {table.size}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => toggleFavorite(table.schema, table.name)}
                            className="flex-shrink-0 rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
                            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                          >
                            {isFavorite ? (
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            ) : (
                              <StarOff className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Main Panel - Favorites & Recent */}
        <div className="flex-1 overflow-auto p-6">
          {!selectedSchema ? (
            <div className="flex h-full items-center justify-center">
              <div className="max-w-md text-center">
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                  <Database className="h-10 w-10 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Select a Schema to Begin
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  Choose a schema from the sidebar to view and edit table data
                </p>
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
                  <p className="text-sm text-green-800 dark:text-green-200">
                    <strong>💡 Pro Tip:</strong> Use favorites (⭐) to quickly access your most-used tables
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Favorites Section */}
              {favoriteTablesList.length > 0 && (
                <div>
                  <div className="mb-4 flex items-center gap-2">
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                      Favorite Tables
                    </h2>
                    <span className="rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-semibold text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
                      {favoriteTablesList.length} {favoriteTablesList.length === 1 ? 'table' : 'tables'}
                    </span>
                  </div>

                  {/* Professional Data Table */}
                  <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-900/50">
                        <tr>
                          <th className="w-12 px-4 py-3 text-center">
                            <Star className="h-4 w-4 text-yellow-400 mx-auto fill-yellow-400" />
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                            Table Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                            Schema
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                            <div className="flex items-center justify-end gap-1">
                              <BarChart3 className="h-3.5 w-3.5" />
                              Rows
                            </div>
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                            <div className="flex items-center justify-end gap-1">
                              <FileText className="h-3.5 w-3.5" />
                              Size
                            </div>
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {favoriteTablesList.map((table, index) => {
                          const tableKey = `${table.schema}.${table.name}`;
                          const isFavorite = favorites.has(tableKey);

                          return (
                            <tr
                              key={tableKey}
                              className="group hover:bg-yellow-50 dark:hover:bg-yellow-900/10 transition-colors cursor-pointer"
                              onClick={() => handleOpenGrid(table.schema, table.name)}
                            >
                              {/* Favorite Star */}
                              <td className="px-4 py-4 text-center">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleFavorite(table.schema, table.name);
                                  }}
                                  className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                  title="Remove from favorites"
                                >
                                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                </button>
                              </td>

                              {/* Table Name */}
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                                    <Table className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                                  </div>
                                  <div>
                                    <div className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                                      {table.name}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                      Favorite #{index + 1}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Schema */}
                              <td className="px-6 py-4">
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                  <Database className="h-3 w-3" />
                                  {table.schema}
                                </span>
                              </td>

                              {/* Row Count */}
                              <td className="px-6 py-4 text-right">
                                <div className="inline-flex items-center gap-2 rounded-lg bg-purple-50 px-3 py-1.5 dark:bg-purple-900/20">
                                  <div className="text-sm font-bold text-purple-900 dark:text-purple-300">
                                    {table.rowCount.toLocaleString()}
                                  </div>
                                </div>
                              </td>

                              {/* Size */}
                              <td className="px-6 py-4 text-right">
                                <div className="inline-flex items-center gap-2 rounded-lg bg-orange-50 px-3 py-1.5 dark:bg-orange-900/20">
                                  <div className="text-sm font-bold text-orange-900 dark:text-orange-300">
                                    {table.size}
                                  </div>
                                </div>
                              </td>

                              {/* Actions */}
                              <td className="px-6 py-4 text-center">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenGrid(table.schema, table.name);
                                  }}
                                  className="inline-flex items-center gap-2 rounded-lg bg-yellow-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-yellow-700 transition-colors dark:bg-yellow-500 dark:hover:bg-yellow-600"
                                >
                                  <Edit3 className="h-4 w-4" />
                                  Open Editor
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {/* Table Footer with Summary */}
                    <div className="border-t border-gray-200 bg-yellow-50 px-6 py-4 dark:border-gray-700 dark:bg-yellow-900/10">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-2">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-gray-600 dark:text-gray-400">
                              Favorite Tables: <span className="font-semibold text-gray-900 dark:text-white">{favoriteTablesList.length}</span>
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-purple-600"></div>
                            <span className="text-gray-600 dark:text-gray-400">
                              Total Rows: <span className="font-semibold text-gray-900 dark:text-white">
                                {favoriteTablesList.reduce((sum, t) => sum + t.rowCount, 0).toLocaleString()}
                              </span>
                            </span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Your most-used tables for quick access
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Recent Tables Section */}
              {recentTablesList.length > 0 && (
                <div>
                  <div className="mb-4 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                      Recently Opened
                    </h2>
                    <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                      {recentTablesList.length} {recentTablesList.length === 1 ? 'table' : 'tables'}
                    </span>
                  </div>

                  {/* Professional Data Table */}
                  <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-900/50">
                        <tr>
                          <th className="w-12 px-4 py-3 text-center">
                            <Star className="h-4 w-4 text-gray-400 mx-auto" />
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                            Table Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                            Schema
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                            <div className="flex items-center justify-end gap-1">
                              <BarChart3 className="h-3.5 w-3.5" />
                              Rows
                            </div>
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                            <div className="flex items-center justify-end gap-1">
                              <FileText className="h-3.5 w-3.5" />
                              Size
                            </div>
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {recentTablesList.map((table, index) => {
                          const tableKey = `${table.schema}.${table.name}`;
                          const isFavorite = favorites.has(tableKey);

                          return (
                            <tr
                              key={tableKey}
                              className="group hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-colors cursor-pointer"
                              onClick={() => handleOpenGrid(table.schema, table.name)}
                            >
                              {/* Favorite Star */}
                              <td className="px-4 py-4 text-center">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleFavorite(table.schema, table.name);
                                  }}
                                  className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                  title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                                >
                                  {isFavorite ? (
                                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                  ) : (
                                    <StarOff className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  )}
                                </button>
                              </td>

                              {/* Table Name */}
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
                                    <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                                  </div>
                                  <div>
                                    <div className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                                      {table.name}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                      Recent #{index + 1}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Schema */}
                              <td className="px-6 py-4">
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                  <Database className="h-3 w-3" />
                                  {table.schema}
                                </span>
                              </td>

                              {/* Row Count */}
                              <td className="px-6 py-4 text-right">
                                <div className="inline-flex items-center gap-2 rounded-lg bg-purple-50 px-3 py-1.5 dark:bg-purple-900/20">
                                  <div className="text-sm font-bold text-purple-900 dark:text-purple-300">
                                    {table.rowCount.toLocaleString()}
                                  </div>
                                </div>
                              </td>

                              {/* Size */}
                              <td className="px-6 py-4 text-right">
                                <div className="inline-flex items-center gap-2 rounded-lg bg-orange-50 px-3 py-1.5 dark:bg-orange-900/20">
                                  <div className="text-sm font-bold text-orange-900 dark:text-orange-300">
                                    {table.size}
                                  </div>
                                </div>
                              </td>

                              {/* Actions */}
                              <td className="px-6 py-4 text-center">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenGrid(table.schema, table.name);
                                  }}
                                  className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-700 transition-colors dark:bg-orange-500 dark:hover:bg-orange-600"
                                >
                                  <Edit3 className="h-4 w-4" />
                                  Open Editor
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {/* Table Footer with Summary */}
                    <div className="border-t border-gray-200 bg-orange-50 px-6 py-4 dark:border-gray-700 dark:bg-orange-900/10">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                            <span className="text-gray-600 dark:text-gray-400">
                              Recent Tables: <span className="font-semibold text-gray-900 dark:text-white">{recentTablesList.length}</span>
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-purple-600"></div>
                            <span className="text-gray-600 dark:text-gray-400">
                              Total Rows: <span className="font-semibold text-gray-900 dark:text-white">
                                {recentTablesList.reduce((sum, t) => sum + t.rowCount, 0).toLocaleString()}
                              </span>
                            </span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Tables you've accessed recently
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* All Tables Section */}
              {selectedSchema && (
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Table className="h-5 w-5 text-green-600 dark:text-green-400" />
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                        All Tables in {selectedSchema}
                      </h2>
                      <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-300">
                        {filteredTables.length} {filteredTables.length === 1 ? 'table' : 'tables'}
                      </span>
                    </div>
                  </div>

                  {/* Professional Data Table */}
                  <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-900/50">
                        <tr>
                          <th className="w-12 px-4 py-3 text-center">
                            <Star className="h-4 w-4 text-gray-400 mx-auto" />
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                            Table Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                            Schema
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                            <div className="flex items-center justify-end gap-1">
                              <BarChart3 className="h-3.5 w-3.5" />
                              Rows
                            </div>
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                            <div className="flex items-center justify-end gap-1">
                              <FileText className="h-3.5 w-3.5" />
                              Size
                            </div>
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredTables.map((table, index) => {
                          const tableKey = `${table.schema}.${table.name}`;
                          const isFavorite = favorites.has(tableKey);

                          return (
                            <tr
                              key={tableKey}
                              className="group hover:bg-green-50 dark:hover:bg-green-900/10 transition-colors cursor-pointer"
                              onClick={() => handleOpenGrid(table.schema, table.name)}
                            >
                              {/* Favorite Star */}
                              <td className="px-4 py-4 text-center">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleFavorite(table.schema, table.name);
                                  }}
                                  className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                  title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                                >
                                  {isFavorite ? (
                                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                  ) : (
                                    <StarOff className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  )}
                                </button>
                              </td>

                              {/* Table Name */}
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                                    <Table className="h-5 w-5 text-green-600 dark:text-green-400" />
                                  </div>
                                  <div>
                                    <div className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                                      {table.name}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                      Table #{index + 1}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Schema */}
                              <td className="px-6 py-4">
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                  <Database className="h-3 w-3" />
                                  {table.schema}
                                </span>
                              </td>

                              {/* Row Count */}
                              <td className="px-6 py-4 text-right">
                                <div className="inline-flex items-center gap-2 rounded-lg bg-purple-50 px-3 py-1.5 dark:bg-purple-900/20">
                                  <div className="text-sm font-bold text-purple-900 dark:text-purple-300">
                                    {table.rowCount.toLocaleString()}
                                  </div>
                                </div>
                              </td>

                              {/* Size */}
                              <td className="px-6 py-4 text-right">
                                <div className="inline-flex items-center gap-2 rounded-lg bg-orange-50 px-3 py-1.5 dark:bg-orange-900/20">
                                  <div className="text-sm font-bold text-orange-900 dark:text-orange-300">
                                    {table.size}
                                  </div>
                                </div>
                              </td>

                              {/* Actions */}
                              <td className="px-6 py-4 text-center">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenGrid(table.schema, table.name);
                                  }}
                                  className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700 transition-colors dark:bg-green-500 dark:hover:bg-green-600"
                                >
                                  <Edit3 className="h-4 w-4" />
                                  Open Editor
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {/* Table Footer with Summary */}
                    <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-700 dark:bg-gray-900/50">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-green-600"></div>
                            <span className="text-gray-600 dark:text-gray-400">
                              Total Tables: <span className="font-semibold text-gray-900 dark:text-white">{filteredTables.length}</span>
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-purple-600"></div>
                            <span className="text-gray-600 dark:text-gray-400">
                              Total Rows: <span className="font-semibold text-gray-900 dark:text-white">
                                {filteredTables.reduce((sum, t) => sum + t.rowCount, 0).toLocaleString()}
                              </span>
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-yellow-600"></div>
                            <span className="text-gray-600 dark:text-gray-400">
                              Favorites: <span className="font-semibold text-gray-900 dark:text-white">{favorites.size}</span>
                            </span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Click any row to open the data editor
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Table Card Component
function TableCard({ table, onOpen, isFavorite, onToggleFavorite }: any) {
  return (
    <div
      className="group rounded-xl border-2 border-gray-200 bg-white p-4 transition-all hover:border-green-500 hover:shadow-lg dark:border-gray-700 dark:bg-gray-800 cursor-pointer"
      onClick={() => onOpen(table.schema, table.name)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
            <Table className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-mono text-sm font-semibold text-gray-900 dark:text-white truncate">
              {table.name}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {table.schema}
            </p>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(table.schema, table.name);
          }}
          className="flex-shrink-0 rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          {isFavorite ? (
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          ) : (
            <StarOff className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100" />
          )}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-blue-50 p-2 dark:bg-blue-900/20">
          <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 mb-1">
            <BarChart3 className="h-3 w-3" />
            Rows
          </div>
          <div className="font-bold text-blue-900 dark:text-blue-300">
            {table.rowCount.toLocaleString()}
          </div>
        </div>
        <div className="rounded-lg bg-purple-50 p-2 dark:bg-purple-900/20">
          <div className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 mb-1">
            <FileText className="h-3 w-3" />
            Size
          </div>
          <div className="font-bold text-purple-900 dark:text-purple-300 truncate">
            {table.size}
          </div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-center gap-2 text-xs font-medium text-green-600 dark:text-green-400">
          Open Editor
          <ChevronRight className="h-3 w-3" />
        </div>
      </div>
    </div>
  );
}

// Table List Item Component
function TableListItem({ table, onOpen, isFavorite, onToggleFavorite }: any) {
  return (
    <div
      className="group flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 transition-all hover:border-green-500 hover:shadow-sm dark:border-gray-700 dark:bg-gray-800 cursor-pointer"
      onClick={() => onOpen(table.schema, table.name)}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
          <Table className="h-5 w-5 text-green-600 dark:text-green-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-mono text-sm font-semibold text-gray-900 dark:text-white truncate">
            {table.name}
          </h3>
          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <BarChart3 className="h-3 w-3" />
              {table.rowCount.toLocaleString()} rows
            </span>
            <span className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              {table.size}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(table.schema, table.name);
          }}
          className="rounded p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          {isFavorite ? (
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          ) : (
            <StarOff className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100" />
          )}
        </button>
        <ChevronRight className="h-5 w-5 text-gray-400" />
      </div>
    </div>
  );
}
