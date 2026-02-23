'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Database,
  Table,
  Search,
  Star,
  StarOff,
  Clock,
  FileText,
  Grid3x3,
  ChevronRight,
  ChevronDown,
  Layers,
  BarChart3,
  RefreshCw,
  SortAsc,
  Edit3,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useActiveConnection } from '../lib/monkdb-context';
import { useToast } from '../components/ToastContext';
import DataGrid from '../components/data-editor/DataGrid';
import ConnectionPrompt from '../components/common/ConnectionPrompt';
import { useAccessibleSchemas } from '../hooks/useAccessibleSchemas';

interface TableInfo {
  schema: string;
  name: string;
  rowCount: number;
  size: string;
  lastAccessed?: Date;
}

type FilterType = 'all' | 'user' | 'system';
const SYSTEM_SCHEMAS = new Set(['information_schema', 'sys', 'pg_catalog']);
const isSysSchema = (n: string) => SYSTEM_SCHEMAS.has(n) || n.startsWith('pg_');

export default function DataEditorPage() {
  const router = useRouter();
  const activeConnection = useActiveConnection();
  const { error: showError } = useToast();
  const { schemas, loading: schemasLoading, error: schemasError } = useAccessibleSchemas();

  // ── Right-panel state (original) ────────────────────────────────
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

  // ── Sidebar tree state ───────────────────────────────────────────
  const [expandedSchemas, setExpandedSchemas] = useState<Set<string>>(new Set());
  const [schemaTableMap, setSchemaTableMap] = useState<Record<string, string[]>>({});
  const [loadingTables, setLoadingTables] = useState<Set<string>>(new Set());
  const [treeSearch, setTreeSearch] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');

  // ── Load favorites / recent from localStorage ────────────────────
  useEffect(() => {
    const storedFav = localStorage.getItem('monkdb-favorite-tables');
    if (storedFav) setFavorites(new Set(JSON.parse(storedFav)));
    const storedRecent = localStorage.getItem('monkdb-recent-tables');
    if (storedRecent) setRecentTables(JSON.parse(storedRecent));
  }, []);

  // ── Fetch tables for right panel ─────────────────────────────────
  const fetchTables = async () => {
    if (!activeConnection || !selectedSchema) return;
    setLoading(true);
    try {
      const result = await activeConnection.client.query(
        `SELECT table_name FROM information_schema.tables
         WHERE table_schema = ?
           AND table_type = 'BASE TABLE'
         ORDER BY table_name`,
        [selectedSchema]
      );

      const tableList: TableInfo[] = [];
      for (const row of result.rows) {
        const tableName = row[0];
        try {
          const countResult = await activeConnection.client.query(
            `SELECT COUNT(*) FROM "${selectedSchema}"."${tableName}"`
          );
          const rowCount = countResult.rows[0][0] || 0;
          let size = 'N/A';
          try {
            const sizeResult = await activeConnection.client.query(
              `SELECT SUM(num_docs) as docs, SUM(size) as bytes
               FROM sys.shards WHERE schema_name = ? AND table_name = ?`,
              [selectedSchema, tableName]
            );
            if (sizeResult.rows.length > 0 && sizeResult.rows[0][1] !== null) {
              size = formatBytes(sizeResult.rows[0][1]);
            }
          } catch {}
          tableList.push({ schema: selectedSchema, name: tableName, rowCount, size });
        } catch {
          tableList.push({ schema: selectedSchema, name: tableName, rowCount: 0, size: 'N/A' });
        }
      }
      setTables(tableList);
      setFilteredTables(tableList);
    } catch (err: any) {
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
    if (searchTerm) {
      filtered = filtered.filter((t) =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    filtered = [...filtered].sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'rows') return b.rowCount - a.rowCount;
      return b.size.localeCompare(a.size);
    });
    setFilteredTables(filtered);
  };

  useEffect(() => { if (selectedSchema) fetchTables(); }, [selectedSchema]);
  useEffect(() => { filterAndSortTables(); }, [tables, searchTerm, sortBy]);

  // ── Grid open ────────────────────────────────────────────────────
  const handleOpenGrid = (schema: string, table: string) => {
    const key = `${schema}.${table}`;
    const updated = [key, ...recentTables.filter((t) => t !== key)].slice(0, 10);
    setRecentTables(updated);
    localStorage.setItem('monkdb-recent-tables', JSON.stringify(updated));
    setSelectedSchema(schema);
    setSelectedTable(table);
    setShowGrid(true);
  };

  const toggleFavorite = (schema: string, table: string) => {
    const key = `${schema}.${table}`;
    const next = new Set(favorites);
    if (next.has(key)) next.delete(key); else next.add(key);
    setFavorites(next);
    localStorage.setItem('monkdb-favorite-tables', JSON.stringify([...next]));
  };

  // ── Sidebar tree: lazy load tables ──────────────────────────────
  const loadTablesForSchema = useCallback(
    async (schemaName: string) => {
      if (!activeConnection || schemaTableMap[schemaName] !== undefined) return;
      setLoadingTables((p) => new Set(p).add(schemaName));
      try {
        const result = await activeConnection.client.getTables(schemaName);
        const names = (result as any[]).map((t) => t.table_name as string).sort();
        setSchemaTableMap((p) => ({ ...p, [schemaName]: names }));
      } catch {
        setSchemaTableMap((p) => ({ ...p, [schemaName]: [] }));
      } finally {
        setLoadingTables((p) => { const s = new Set(p); s.delete(schemaName); return s; });
      }
    },
    [activeConnection, schemaTableMap]
  );

  const toggleSchema = (schemaName: string) => {
    setExpandedSchemas((prev) => {
      const next = new Set(prev);
      if (next.has(schemaName)) {
        next.delete(schemaName);
      } else {
        next.add(schemaName);
        loadTablesForSchema(schemaName);
        // Also set selected schema for right panel
        setSelectedSchema(schemaName);
        setSearchTerm('');
      }
      return next;
    });
  };

  // ── Derived ──────────────────────────────────────────────────────
  const filteredSidebarSchemas = (schemas ?? []).filter((s) => {
    if (filterType === 'system') return isSysSchema(s.name);
    if (filterType === 'user') return !isSysSchema(s.name);
    return true;
  });

  const treeTablesFor = (schemaName: string) => {
    const list = schemaTableMap[schemaName] ?? [];
    if (!treeSearch.trim()) return list;
    return list.filter((t) => t.toLowerCase().includes(treeSearch.toLowerCase()));
  };

  const favoriteTablesList = recentTables
    .filter((t) => favorites.has(t))
    .map((key) => {
      const [s, t] = key.split('.');
      return tables.find((x) => x.schema === s && x.name === t);
    })
    .filter(Boolean) as TableInfo[];

  const recentTablesList = recentTables
    .filter((t) => !favorites.has(t))
    .slice(0, 5)
    .map((key) => {
      const [s, t] = key.split('.');
      return tables.find((x) => x.schema === s && x.name === t);
    })
    .filter(Boolean) as TableInfo[];

  // ── No connection ────────────────────────────────────────────────
  if (!activeConnection) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <ConnectionPrompt onConnect={() => router.push('/connections')} />
      </div>
    );
  }

  // ── Full-screen data grid ─────────────────────────────────────────
  if (showGrid && selectedSchema && selectedTable) {
    return (
      <div className="flex h-full flex-col">
        <DataGrid schema={selectedSchema} table={selectedTable} onClose={() => setShowGrid(false)} />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* ── Header (original) ──────────────────────────────────────── */}
      <div className="border-b border-gray-200 bg-white px-6 py-5 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-green-600 to-emerald-600 shadow-lg">
              <Table className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Data Editor</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                View, edit, and manage table data with spreadsheet-like interface
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-gray-300 dark:border-gray-600 p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`rounded p-1.5 transition-colors ${viewMode === 'grid' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'}`}
              title="Grid view"
            >
              <Grid3x3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`rounded p-1.5 transition-colors ${viewMode === 'list' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'}`}
              title="List view"
            >
              <Layers className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4">
          <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-blue-50 to-blue-100/50 p-4 dark:from-blue-900/20 dark:to-blue-900/10 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-blue-600 dark:text-blue-400">Available Schemas</p>
                <p className="mt-1 text-3xl font-bold text-blue-900 dark:text-blue-300">{(schemas ?? []).length}</p>
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

      {/* ── Body ────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left sidebar: tree explorer (new) ─────────────────────── */}
        <aside className="w-72 flex-shrink-0 flex flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
          {/* Header */}
          <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-3">
            <div className="flex items-center gap-2 mb-0.5">
              <Edit3 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">Table Browser</h2>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{activeConnection.name}</p>
          </div>

          {/* Search + filter */}
          <div className="space-y-2 border-b border-gray-200 dark:border-gray-700 px-3 py-2.5">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search tables…"
                value={treeSearch}
                onChange={(e) => setTreeSearch(e.target.value)}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 py-1.5 pl-8 pr-3 text-xs focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 dark:text-white"
              />
            </div>
            <div className="flex gap-1">
              {(['all', 'user', 'system'] as FilterType[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilterType(f)}
                  className={`flex-1 rounded px-2 py-1 text-xs font-medium capitalize transition-colors ${
                    filterType === f
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Tree */}
          <div className="flex-1 overflow-y-auto p-2">
            {schemasLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            ) : schemasError ? (
              <div className="m-2 flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-red-700 dark:text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span className="text-xs">Failed to load schemas</span>
              </div>
            ) : filteredSidebarSchemas.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-gray-400 dark:text-gray-500">No schemas found</p>
            ) : (
              <div className="space-y-0.5">
                {filteredSidebarSchemas.map((schema) => {
                  const name = schema.name;
                  const isExpanded = expandedSchemas.has(name);
                  const isLoading = loadingTables.has(name);
                  const treeTables = treeTablesFor(name);
                  const allLoaded = schemaTableMap[name];
                  const sys = isSysSchema(name);

                  if (treeSearch && allLoaded !== undefined && treeTables.length === 0) return null;

                  return (
                    <div key={name}>
                      {/* Schema row */}
                      <button
                        onClick={() => toggleSchema(name)}
                        className="group flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-xs font-medium transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-gray-500" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-500" />
                        )}
                        <Layers className={`h-3.5 w-3.5 shrink-0 ${sys ? 'text-orange-500 dark:text-orange-400' : 'text-purple-600 dark:text-purple-400'}`} />
                        <span className="flex-1 truncate text-left text-gray-800 dark:text-gray-200">{name}</span>
                        {isLoading ? (
                          <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
                        ) : allLoaded && allLoaded.length > 0 ? (
                          <span className="shrink-0 rounded-full bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 dark:text-gray-400">
                            {treeTables.length}
                          </span>
                        ) : null}
                      </button>

                      {/* Table rows — use div to avoid button-in-button nesting */}
                      {isExpanded && (
                        <div className="ml-3 mt-0.5 space-y-0.5 border-l-2 border-gray-200 dark:border-gray-700 pl-2">
                          {isLoading ? (
                            <div className="flex items-center gap-2 px-2 py-2 text-xs text-gray-400">
                              <Loader2 className="h-3 w-3 animate-spin" />Loading…
                            </div>
                          ) : treeTables.length === 0 ? (
                            <p className="px-2 py-2 text-xs text-gray-400 dark:text-gray-500">
                              {treeSearch ? 'No matches' : 'No tables'}
                            </p>
                          ) : (
                            treeTables.map((tableName) => {
                              const key = `${name}.${tableName}`;
                              const isFav = favorites.has(key);
                              const isActive = selectedSchema === name && selectedTable === tableName;

                              return (
                                <div
                                  key={key}
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => handleOpenGrid(name, tableName)}
                                  onKeyDown={(e) => e.key === 'Enter' && handleOpenGrid(name, tableName)}
                                  className={`group/row flex w-full cursor-pointer items-center gap-1.5 rounded px-2 py-1.5 text-left text-xs transition-colors ${
                                    isActive
                                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                                  }`}
                                >
                                  <Table
                                    className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-green-600 dark:text-green-400' : 'text-green-500'}`}
                                  />
                                  <span className="flex-1 truncate font-mono">{tableName}</span>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); toggleFavorite(name, tableName); }}
                                    className="shrink-0 opacity-0 group-hover/row:opacity-100 transition-opacity p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                                    title={isFav ? 'Remove favorite' : 'Add favorite'}
                                  >
                                    <Star className={`h-3 w-3 ${isFav ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`} />
                                  </button>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sidebar controls (original Search & Sort) */}
          {selectedSchema && (
            <div className="border-t border-gray-200 dark:border-gray-700 p-3 space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filter tables in panel…"
                  className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="flex items-center gap-2">
                <SortAsc className="h-4 w-4 text-gray-500 dark:text-gray-400 shrink-0" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'name' | 'rows' | 'size')}
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
            </div>
          )}
        </aside>

        {/* ── Right panel (original, unchanged) ─────────────────────── */}
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
                  Expand a schema in the sidebar to view and edit table data
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
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Favorite Tables</h2>
                    <span className="rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-semibold text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
                      {favoriteTablesList.length} {favoriteTablesList.length === 1 ? 'table' : 'tables'}
                    </span>
                  </div>
                  <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-900/50">
                        <tr>
                          <th className="w-12 px-4 py-3 text-center"><Star className="h-4 w-4 text-yellow-400 mx-auto fill-yellow-400" /></th>
                          <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">Table Name</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">Schema</th>
                          <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300"><div className="flex items-center justify-end gap-1"><BarChart3 className="h-3.5 w-3.5" />Rows</div></th>
                          <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300"><div className="flex items-center justify-end gap-1"><FileText className="h-3.5 w-3.5" />Size</div></th>
                          <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {favoriteTablesList.map((table, index) => {
                          const tableKey = `${table.schema}.${table.name}`;
                          return (
                            <tr key={tableKey} className="group hover:bg-yellow-50 dark:hover:bg-yellow-900/10 transition-colors cursor-pointer" onClick={() => handleOpenGrid(table.schema, table.name)}>
                              <td className="px-4 py-4 text-center">
                                <button onClick={(e) => { e.stopPropagation(); toggleFavorite(table.schema, table.name); }} className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Remove from favorites">
                                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                </button>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                                    <Table className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                                  </div>
                                  <div>
                                    <div className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{table.name}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">Favorite #{index + 1}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4"><span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"><Database className="h-3 w-3" />{table.schema}</span></td>
                              <td className="px-6 py-4 text-right"><div className="inline-flex items-center gap-2 rounded-lg bg-purple-50 px-3 py-1.5 dark:bg-purple-900/20"><div className="text-sm font-bold text-purple-900 dark:text-purple-300">{table.rowCount.toLocaleString()}</div></div></td>
                              <td className="px-6 py-4 text-right"><div className="inline-flex items-center gap-2 rounded-lg bg-orange-50 px-3 py-1.5 dark:bg-orange-900/20"><div className="text-sm font-bold text-orange-900 dark:text-orange-300">{table.size}</div></div></td>
                              <td className="px-6 py-4 text-center">
                                <button onClick={(e) => { e.stopPropagation(); handleOpenGrid(table.schema, table.name); }} className="inline-flex items-center gap-2 rounded-lg bg-yellow-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-yellow-700 transition-colors dark:bg-yellow-500 dark:hover:bg-yellow-600">
                                  <Edit3 className="h-4 w-4" />Open Editor
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <div className="border-t border-gray-200 bg-yellow-50 px-6 py-4 dark:border-gray-700 dark:bg-yellow-900/10">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-2"><Star className="h-4 w-4 fill-yellow-400 text-yellow-400" /><span className="text-gray-600 dark:text-gray-400">Favorite Tables: <span className="font-semibold text-gray-900 dark:text-white">{favoriteTablesList.length}</span></span></div>
                          <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-purple-600"></div><span className="text-gray-600 dark:text-gray-400">Total Rows: <span className="font-semibold text-gray-900 dark:text-white">{favoriteTablesList.reduce((sum, t) => sum + t.rowCount, 0).toLocaleString()}</span></span></div>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Your most-used tables for quick access</div>
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
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Recently Opened</h2>
                    <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                      {recentTablesList.length} {recentTablesList.length === 1 ? 'table' : 'tables'}
                    </span>
                  </div>
                  <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-900/50">
                        <tr>
                          <th className="w-12 px-4 py-3 text-center"><Star className="h-4 w-4 text-gray-400 mx-auto" /></th>
                          <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">Table Name</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">Schema</th>
                          <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300"><div className="flex items-center justify-end gap-1"><BarChart3 className="h-3.5 w-3.5" />Rows</div></th>
                          <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300"><div className="flex items-center justify-end gap-1"><FileText className="h-3.5 w-3.5" />Size</div></th>
                          <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {recentTablesList.map((table, index) => {
                          const tableKey = `${table.schema}.${table.name}`;
                          const isFavorite = favorites.has(tableKey);
                          return (
                            <tr key={tableKey} className="group hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-colors cursor-pointer" onClick={() => handleOpenGrid(table.schema, table.name)}>
                              <td className="px-4 py-4 text-center">
                                <button onClick={(e) => { e.stopPropagation(); toggleFavorite(table.schema, table.name); }} className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}>
                                  {isFavorite ? <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" /> : <StarOff className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />}
                                </button>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
                                    <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                                  </div>
                                  <div>
                                    <div className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{table.name}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">Recent #{index + 1}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4"><span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"><Database className="h-3 w-3" />{table.schema}</span></td>
                              <td className="px-6 py-4 text-right"><div className="inline-flex items-center gap-2 rounded-lg bg-purple-50 px-3 py-1.5 dark:bg-purple-900/20"><div className="text-sm font-bold text-purple-900 dark:text-purple-300">{table.rowCount.toLocaleString()}</div></div></td>
                              <td className="px-6 py-4 text-right"><div className="inline-flex items-center gap-2 rounded-lg bg-orange-50 px-3 py-1.5 dark:bg-orange-900/20"><div className="text-sm font-bold text-orange-900 dark:text-orange-300">{table.size}</div></div></td>
                              <td className="px-6 py-4 text-center">
                                <button onClick={(e) => { e.stopPropagation(); handleOpenGrid(table.schema, table.name); }} className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-700 transition-colors dark:bg-orange-500 dark:hover:bg-orange-600">
                                  <Edit3 className="h-4 w-4" />Open Editor
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <div className="border-t border-gray-200 bg-orange-50 px-6 py-4 dark:border-gray-700 dark:bg-orange-900/10">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" /><span className="text-gray-600 dark:text-gray-400">Recent Tables: <span className="font-semibold text-gray-900 dark:text-white">{recentTablesList.length}</span></span></div>
                          <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-purple-600"></div><span className="text-gray-600 dark:text-gray-400">Total Rows: <span className="font-semibold text-gray-900 dark:text-white">{recentTablesList.reduce((sum, t) => sum + t.rowCount, 0).toLocaleString()}</span></span></div>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Tables you've accessed recently</div>
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
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white">All Tables in {selectedSchema}</h2>
                      <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-300">
                        {filteredTables.length} {filteredTables.length === 1 ? 'table' : 'tables'}
                      </span>
                    </div>
                  </div>
                  <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                    {loading ? (
                      <div className="p-10 text-center">
                        <RefreshCw className="mx-auto h-6 w-6 animate-spin text-green-600 dark:text-green-400" />
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading tables…</p>
                      </div>
                    ) : (
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-900/50">
                          <tr>
                            <th className="w-12 px-4 py-3 text-center"><Star className="h-4 w-4 text-gray-400 mx-auto" /></th>
                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">Table Name</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">Schema</th>
                            <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300"><div className="flex items-center justify-end gap-1"><BarChart3 className="h-3.5 w-3.5" />Rows</div></th>
                            <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300"><div className="flex items-center justify-end gap-1"><FileText className="h-3.5 w-3.5" />Size</div></th>
                            <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {filteredTables.map((table, index) => {
                            const tableKey = `${table.schema}.${table.name}`;
                            const isFavorite = favorites.has(tableKey);
                            return (
                              <tr key={tableKey} className="group hover:bg-green-50 dark:hover:bg-green-900/10 transition-colors cursor-pointer" onClick={() => handleOpenGrid(table.schema, table.name)}>
                                <td className="px-4 py-4 text-center">
                                  <button onClick={(e) => { e.stopPropagation(); toggleFavorite(table.schema, table.name); }} className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}>
                                    {isFavorite ? <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" /> : <StarOff className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />}
                                  </button>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                                      <Table className="h-5 w-5 text-green-600 dark:text-green-400" />
                                    </div>
                                    <div>
                                      <div className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{table.name}</div>
                                      <div className="text-xs text-gray-500 dark:text-gray-400">Table #{index + 1}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4"><span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"><Database className="h-3 w-3" />{table.schema}</span></td>
                                <td className="px-6 py-4 text-right"><div className="inline-flex items-center gap-2 rounded-lg bg-purple-50 px-3 py-1.5 dark:bg-purple-900/20"><div className="text-sm font-bold text-purple-900 dark:text-purple-300">{table.rowCount.toLocaleString()}</div></div></td>
                                <td className="px-6 py-4 text-right"><div className="inline-flex items-center gap-2 rounded-lg bg-orange-50 px-3 py-1.5 dark:bg-orange-900/20"><div className="text-sm font-bold text-orange-900 dark:text-orange-300">{table.size}</div></div></td>
                                <td className="px-6 py-4 text-center">
                                  <button onClick={(e) => { e.stopPropagation(); handleOpenGrid(table.schema, table.name); }} className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700 transition-colors dark:bg-green-500 dark:hover:bg-green-600">
                                    <Edit3 className="h-4 w-4" />Open Editor
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                    <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-700 dark:bg-gray-900/50">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-green-600"></div><span className="text-gray-600 dark:text-gray-400">Total Tables: <span className="font-semibold text-gray-900 dark:text-white">{filteredTables.length}</span></span></div>
                          <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-purple-600"></div><span className="text-gray-600 dark:text-gray-400">Total Rows: <span className="font-semibold text-gray-900 dark:text-white">{filteredTables.reduce((sum, t) => sum + t.rowCount, 0).toLocaleString()}</span></span></div>
                          <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-yellow-600"></div><span className="text-gray-600 dark:text-gray-400">Favorites: <span className="font-semibold text-gray-900 dark:text-white">{favorites.size}</span></span></div>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Click any row to open the data editor</div>
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
