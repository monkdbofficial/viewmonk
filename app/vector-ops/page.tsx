'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Upload, Plus, Clock, Search, Cpu, Database,
  History, Bug, Trash2, Zap, GitMerge, BarChart2,
  Bookmark, TrendingUp, Play, BookmarkX,
} from 'lucide-react';
import { useMonkDBClient } from '../lib/monkdb-context';
import ConnectionPrompt from '../components/common/ConnectionPrompt';
import VectorCollectionBrowser from '../components/vector/VectorCollectionBrowser';
import VectorSearchPanel, { SavedSearchParams } from '../components/vector/VectorSearchPanel';
import CollectionSchemaPanel from '../components/vector/CollectionSchemaPanel';
import CreateVectorTableDialog from '../components/vector/CreateVectorTableDialog';
import DocumentUploadDialog from '../components/vector/DocumentUploadDialog';
import VectorStatsCards from '../components/vector/VectorStatsCards';
import VectorDebugPanel from '../components/vector/VectorDebugPanel';
import { VectorCollection, useVectorCollections } from '../hooks/useVectorCollections';

interface QueryHistoryItem {
  id: string;
  timestamp: number;
  collection: string;
  query: string;
  resultCount: number;
  executionTime: number;
}

interface SavedSearch {
  id: string;
  label: string;
  collection: string;
  timestamp: number;
  params: SavedSearchParams;
}

type RightTab = 'history' | 'saved' | 'analytics';

function formatTimestamp(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

const HISTORY_KEY = 'monkdb-vector-history';
const SAVED_KEY = 'monkdb-vector-saved';

export default function VectorOperationsPage() {
  const client = useMonkDBClient();
  const { collections, refresh: refreshCollections } = useVectorCollections();

  const [selectedCollection, setSelectedCollection] = useState<VectorCollection | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [queryHistory, setQueryHistory] = useState<QueryHistoryItem[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [rightTab, setRightTab] = useState<RightTab>('history');
  // When user clicks "Run Again" on a saved search
  const [loadedSearch, setLoadedSearch] = useState<(SavedSearchParams & { collection: string }) | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const h = localStorage.getItem(HISTORY_KEY);
      if (h) setQueryHistory(JSON.parse(h));
    } catch { /* ignore */ }
    try {
      const s = localStorage.getItem(SAVED_KEY);
      if (s) setSavedSearches(JSON.parse(s));
    } catch { /* ignore */ }
  }, []);

  const handleAddToHistory = (entry: {
    collection: string;
    query: string;
    resultCount: number;
    executionTime: number;
  }) => {
    const item: QueryHistoryItem = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      ...entry,
    };
    setQueryHistory((prev) => {
      const next = [item, ...prev].slice(0, 50);
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const clearHistory = () => {
    setQueryHistory([]);
    try { localStorage.removeItem(HISTORY_KEY); } catch { /* ignore */ }
  };

  const handleSaveSearch = (label: string, params: SavedSearchParams) => {
    if (!selectedCollection) return;
    const item: SavedSearch = {
      id: crypto.randomUUID(),
      label,
      collection: `${selectedCollection.schema}.${selectedCollection.table}`,
      timestamp: Date.now(),
      params,
    };
    setSavedSearches(prev => {
      const next = [item, ...prev].slice(0, 50);
      try { localStorage.setItem(SAVED_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
    setRightTab('saved');
  };

  const deleteSaved = (id: string) => {
    setSavedSearches(prev => {
      const next = prev.filter(s => s.id !== id);
      try { localStorage.setItem(SAVED_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const runSavedSearch = (saved: SavedSearch) => {
    // Find matching collection
    const [schema, table] = saved.collection.split('.');
    const col = collections.find(c => c.schema === schema && c.table === table);
    if (col) setSelectedCollection(col);
    setLoadedSearch({ ...saved.params, collection: saved.collection });
    setRightTab('history');
  };

  const handleCollectionDropped = (schema: string, table: string) => {
    if (
      selectedCollection?.schema === schema &&
      selectedCollection?.table === table
    ) {
      setSelectedCollection(null);
    }
  };

  // ── Analytics ────────────────────────────────────────────────────────────────
  const analytics = useMemo(() => {
    if (queryHistory.length === 0) return null;
    const avgLatency = Math.round(queryHistory.reduce((s, i) => s + i.executionTime, 0) / queryHistory.length);
    const avgResults = (queryHistory.reduce((s, i) => s + i.resultCount, 0) / queryHistory.length).toFixed(1);
    const collectionCounts: Record<string, number> = {};
    queryHistory.forEach(i => { collectionCounts[i.collection] = (collectionCounts[i.collection] ?? 0) + 1; });
    const topCollection = Object.entries(collectionCounts).sort((a, b) => b[1] - a[1])[0];
    const knnCount = queryHistory.filter(i => i.query.includes('KNN')).length;
    const simCount = queryHistory.filter(i => i.query.includes('Similarity')).length;
    return { avgLatency, avgResults, topCollection, total: queryHistory.length, knnCount, simCount };
  }, [queryHistory]);

  if (!client) {
    return (
      <div className="-m-8 h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <ConnectionPrompt
          message="Connect to a database to use vector operations"
          onConnect={() => {}}
        />
      </div>
    );
  }

  return (
    <div className="-m-8 h-[calc(100vh-4rem)] flex flex-col overflow-hidden bg-gray-50 dark:bg-[#0D1B2A]">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 shadow-sm">
            <Cpu className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900 dark:text-white">Vector Operations</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              KNN &amp; semantic search with FLOAT_VECTOR embeddings
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDebug((v) => !v)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
              showDebug
                ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-400'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
            title="Toggle diagnostics panel"
          >
            <Bug className="h-3.5 w-3.5" />
            Diagnostics
          </button>
          <button
            onClick={() => setShowCreateDialog(true)}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <Plus className="h-3.5 w-3.5" />
            New Collection
          </button>
          {selectedCollection && (
            <button
              onClick={() => setShowUploadDialog(true)}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
            >
              <Upload className="h-3.5 w-3.5" />
              Upload Documents
            </button>
          )}
        </div>
      </div>

      {/* ── Stats Strip ────────────────────────────────────────────────── */}
      <div className="flex-shrink-0">
        <VectorStatsCards />
      </div>

      {/* ── Diagnostics ─────────────────────────────────────────────────── */}
      {showDebug && (
        <div className="flex-shrink-0 border-b border-amber-200 bg-amber-50 px-6 py-4 dark:border-amber-800/40 dark:bg-amber-950/10">
          <VectorDebugPanel />
        </div>
      )}

      {/* ── Three-Column Layout ──────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Left: Collection Browser */}
        <div className="w-72 flex-shrink-0 flex flex-col border-r border-gray-200 bg-white overflow-hidden dark:border-gray-700 dark:bg-gray-800">
          <VectorCollectionBrowser
            selectedCollection={selectedCollection}
            onSelectCollection={setSelectedCollection}
            onCreateTable={() => setShowCreateDialog(true)}
            onCollectionDropped={handleCollectionDropped}
          />
        </div>

        {/* Middle: Search Panel */}
        <div className="flex flex-1 min-w-0 flex-col overflow-hidden bg-white dark:bg-gray-800/50">
          {!selectedCollection ? (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30">
                <Search className="h-8 w-8 text-blue-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Select a Collection</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Choose a vector collection from the left panel to run KNN or similarity searches
              </p>
              <div className="mt-6 grid max-w-lg grid-cols-2 gap-3">
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-left dark:border-blue-900/30 dark:bg-blue-950/10">
                  <Zap className="mb-2 h-5 w-5 text-blue-500" />
                  <p className="text-sm font-bold text-blue-700 dark:text-blue-300">KNN Search</p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    Find the k nearest neighbors using Euclidean distance
                  </p>
                </div>
                <div className="rounded-xl border border-cyan-100 bg-cyan-50 p-4 text-left dark:border-cyan-900/30 dark:bg-cyan-950/10">
                  <BarChart2 className="mb-2 h-5 w-5 text-cyan-600" />
                  <p className="text-sm font-bold text-cyan-700 dark:text-cyan-300">Similarity</p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    Score all documents by normalized vector similarity
                  </p>
                </div>
              </div>
              {/* SQL Reference */}
              <div className="mt-6 max-w-lg w-full rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 p-4 text-left">
                <p className="mb-2 text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider">MonkDB Vector SQL</p>
                <pre className="font-mono text-xs text-emerald-700 dark:text-green-400 whitespace-pre-wrap leading-relaxed">{`-- KNN Search
SELECT id, content, _score
FROM schema.table
WHERE knn_match(embedding, [0.1, 0.2, ...], 10)
ORDER BY _score DESC;

-- Vector Similarity
SELECT *, vector_similarity(embedding, [0.1, 0.2, ...]) AS sim
FROM schema.table
ORDER BY sim DESC
LIMIT 20;`}</pre>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
              {/* Collection Info Bar */}
              <div className="flex-shrink-0 flex items-center gap-3 border-b border-gray-200 bg-white px-5 py-2.5 dark:border-gray-700 dark:bg-gray-800">
                <Database className="h-4 w-4 flex-shrink-0 text-blue-500" />
                <span className="text-sm font-bold text-gray-900 dark:text-white">
                  {selectedCollection.schema}
                  <span className="text-gray-400 font-normal">.</span>
                  <span className="text-blue-600 dark:text-blue-400">{selectedCollection.table}</span>
                </span>
                <div className="flex items-center gap-2 text-xs">
                  <span className="rounded-md bg-blue-100 px-2 py-0.5 font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                    {selectedCollection.dimension}D
                  </span>
                  <span className="text-gray-400">{selectedCollection.columnName}</span>
                  {selectedCollection.documentCount != null && (
                    <span className="text-gray-400">
                      · {selectedCollection.documentCount.toLocaleString()} docs
                    </span>
                  )}
                </div>
              </div>

              {/* Schema Inspector */}
              <CollectionSchemaPanel collection={selectedCollection} />

              {/* Search Panel */}
              <div className="flex-1 min-h-0 overflow-y-auto p-5">
                <VectorSearchPanel
                  collection={selectedCollection}
                  onAddToHistory={handleAddToHistory}
                  onSaveSearch={handleSaveSearch}
                  loadedSearch={loadedSearch}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right: History / Saved / Analytics */}
        <div className="w-72 flex-shrink-0 flex flex-col border-l border-gray-200 bg-white overflow-hidden dark:border-gray-700 dark:bg-gray-800">

          {/* Tab bar */}
          <div className="flex-shrink-0 border-b border-gray-100 dark:border-gray-700">
            <div className="flex">
              {([
                { id: 'history', label: 'History', icon: History, count: queryHistory.length },
                { id: 'saved', label: 'Saved', icon: Bookmark, count: savedSearches.length },
                { id: 'analytics', label: 'Analytics', icon: TrendingUp, count: 0 },
              ] as const).map(({ id, label, icon: Icon, count }) => (
                <button
                  key={id}
                  onClick={() => setRightTab(id)}
                  className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors border-b-2 ${
                    rightTab === id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                  {count > 0 && (
                    <span className="rounded-full bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500 dark:text-gray-400">
                      {count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ── History tab ── */}
          {rightTab === 'history' && (
            <>
              {queryHistory.length > 0 && (
                <div className="flex-shrink-0 flex items-center justify-end px-4 py-1.5 border-b border-gray-100 dark:border-gray-700/60">
                  <button
                    onClick={clearHistory}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                    title="Clear history"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              <div className="flex-1 overflow-y-auto">
                {queryHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                      <History className="h-5 w-5 text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No searches yet</p>
                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Execute a vector search to build history</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
                    {queryHistory.map((item) => (
                      <div key={item.id} className="px-4 py-3 hover:bg-blue-50/30 dark:hover:bg-blue-950/10 transition-colors">
                        <div className="flex items-center justify-between mb-1">
                          <span className="max-w-[140px] truncate font-mono text-xs text-blue-600 dark:text-blue-400" title={item.collection}>
                            {item.collection.split('.').pop()}
                          </span>
                          <span className="text-[10px] text-gray-400">{formatTimestamp(item.timestamp)}</span>
                        </div>
                        <p className="mb-1.5 truncate text-sm text-gray-800 dark:text-gray-200" title={item.query}>
                          {item.query}
                        </p>
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                            <Search className="h-3 w-3" />
                            {item.resultCount} results
                          </span>
                          <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                            <Clock className="h-3 w-3" />
                            {item.executionTime}ms
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── Saved tab ── */}
          {rightTab === 'saved' && (
            <div className="flex-1 overflow-y-auto">
              {savedSearches.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                    <Bookmark className="h-5 w-5 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No saved searches</p>
                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                    Run a search and click the bookmark icon to save it
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
                  {savedSearches.map((saved) => (
                    <div key={saved.id} className="group px-4 py-3 hover:bg-blue-50/30 dark:hover:bg-blue-950/10 transition-colors">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="font-medium text-sm text-gray-800 dark:text-gray-200 truncate">{saved.label}</span>
                        <button
                          onClick={() => deleteSaved(saved.id)}
                          className="flex-shrink-0 text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                          title="Delete saved search"
                        >
                          <BookmarkX className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mb-2 font-mono truncate">
                        {saved.collection.split('.').pop()} · {saved.params.searchType.toUpperCase()} k={saved.params.topK}
                      </p>
                      <button
                        onClick={() => runSavedSearch(saved)}
                        className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                      >
                        <Play className="h-3 w-3" /> Run Again
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Analytics tab ── */}
          {rightTab === 'analytics' && (
            <div className="flex-1 overflow-y-auto p-4">
              {!analytics ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                    <TrendingUp className="h-5 w-5 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No data yet</p>
                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Run searches to see analytics</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Summary cards */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Total Searches</p>
                      <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{analytics.total}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Avg Latency</p>
                      <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{analytics.avgLatency}<span className="text-sm font-normal text-gray-400 ml-0.5">ms</span></p>
                    </div>
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Avg Results</p>
                      <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{analytics.avgResults}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">KNN / Sim</p>
                      <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
                        {analytics.knnCount}<span className="text-xs font-normal text-gray-400 mx-1">/</span>{analytics.simCount}
                      </p>
                    </div>
                  </div>

                  {/* Top collection */}
                  {analytics.topCollection && (
                    <div className="rounded-lg border border-blue-100 dark:border-blue-900/40 bg-blue-50 dark:bg-blue-950/10 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-400 dark:text-blue-500 mb-1">Most Searched</p>
                      <p className="text-sm font-mono font-medium text-blue-700 dark:text-blue-300 truncate">
                        {analytics.topCollection[0].split('.').pop()}
                      </p>
                      <p className="text-xs text-blue-500 dark:text-blue-400 mt-0.5">
                        {analytics.topCollection[1]} searches
                      </p>
                    </div>
                  )}

                  {/* Search type breakdown bar */}
                  {analytics.total > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">Search Types</p>
                      <div className="flex h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-blue-500"
                          style={{ width: `${(analytics.knnCount / analytics.total) * 100}%` }}
                          title={`KNN: ${analytics.knnCount}`}
                        />
                        <div
                          className="bg-cyan-400"
                          style={{ width: `${(analytics.simCount / analytics.total) * 100}%` }}
                          title={`Similarity: ${analytics.simCount}`}
                        />
                      </div>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400">
                          <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
                          KNN ({analytics.knnCount})
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400">
                          <span className="inline-block h-2 w-2 rounded-full bg-cyan-400" />
                          Similarity ({analytics.simCount})
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Vector Function Reference (only in history tab) */}
          {rightTab === 'history' && (
            <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 px-4 pt-3 pb-2">
                <GitMerge className="h-4 w-4 text-blue-500 flex-shrink-0" />
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Vector Functions</span>
              </div>
              <div className="px-3 pb-3 space-y-2">
                <div className="rounded-lg bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 overflow-hidden">
                  <div className="px-3 py-1.5 border-b border-slate-200 dark:border-gray-800">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-500">KNN Search</span>
                  </div>
                  <pre className="px-3 py-2 font-mono text-[11px] text-emerald-700 dark:text-green-400 whitespace-pre-wrap leading-relaxed">{`WHERE knn_match(
  embedding, [0.1, 0.2, ...], 10
)
ORDER BY _score DESC`}</pre>
                </div>
                <div className="rounded-lg bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 overflow-hidden">
                  <div className="px-3 py-1.5 border-b border-slate-200 dark:border-gray-800">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-500">Similarity Score</span>
                  </div>
                  <pre className="px-3 py-2 font-mono text-[11px] text-emerald-700 dark:text-green-400 whitespace-pre-wrap leading-relaxed">{`SELECT *,
  vector_similarity(
    embedding, [0.1, ...]
  ) AS sim
ORDER BY sim DESC
LIMIT 20`}</pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      {showCreateDialog && (
        <CreateVectorTableDialog
          onClose={() => setShowCreateDialog(false)}
          onSuccess={() => {
            setShowCreateDialog(false);
            refreshCollections();
          }}
        />
      )}
      {showUploadDialog && selectedCollection && (
        <DocumentUploadDialog
          collection={selectedCollection}
          onClose={() => setShowUploadDialog(false)}
          onSuccess={() => setShowUploadDialog(false)}
        />
      )}
    </div>
  );
}
