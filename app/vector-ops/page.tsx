'use client';

import { useState, useEffect } from 'react';
import {
  Upload, Plus, Clock, Search, Cpu, Database,
  History, Bug, Trash2, Zap, GitMerge, BarChart2,
} from 'lucide-react';
import { useMonkDBClient } from '../lib/monkdb-context';
import ConnectionPrompt from '../components/common/ConnectionPrompt';
import VectorCollectionBrowser from '../components/vector/VectorCollectionBrowser';
import VectorSearchPanel from '../components/vector/VectorSearchPanel';
import CreateVectorTableDialog from '../components/vector/CreateVectorTableDialog';
import DocumentUploadDialog from '../components/vector/DocumentUploadDialog';
import VectorStatsCards from '../components/vector/VectorStatsCards';
import VectorDebugPanel from '../components/vector/VectorDebugPanel';
import { VectorCollection } from '../hooks/useVectorCollections';

interface QueryHistoryItem {
  id: string;
  timestamp: number;
  collection: string;
  query: string;
  resultCount: number;
  executionTime: number;
}

function formatTimestamp(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

const HISTORY_KEY = 'monkdb-vector-history';

export default function VectorOperationsPage() {
  const client = useMonkDBClient();

  const [selectedCollection, setSelectedCollection] = useState<VectorCollection | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [queryHistory, setQueryHistory] = useState<QueryHistoryItem[]>([]);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) setQueryHistory(JSON.parse(stored));
    } catch {
      /* ignore */
    }
  }, []);

  const handleAddToHistory = (entry: {
    collection: string;
    query: string;
    resultCount: number;
    executionTime: number;
  }) => {
    const item: QueryHistoryItem = {
      id: `${Date.now()}_${Math.random()}`,
      timestamp: Date.now(),
      ...entry,
    };
    setQueryHistory((prev) => {
      const next = [item, ...prev].slice(0, 50);
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      } catch { /* ignore */ }
      return next;
    });
  };

  const clearHistory = () => {
    setQueryHistory([]);
    try { localStorage.removeItem(HISTORY_KEY); } catch { /* ignore */ }
  };

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

      {/* ── Diagnostics (collapsible) ───────────────────────────────────── */}
      {showDebug && (
        <div className="flex-shrink-0 border-b border-amber-200 bg-amber-50 px-6 py-4 dark:border-amber-800/40 dark:bg-amber-950/10">
          <VectorDebugPanel />
        </div>
      )}

      {/* ── Three-Column Layout ─────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Left: Collection Browser */}
        <div className="w-72 flex-shrink-0 flex flex-col border-r border-gray-200 bg-white overflow-hidden dark:border-gray-700 dark:bg-gray-800">
          <VectorCollectionBrowser
            selectedCollection={selectedCollection}
            onSelectCollection={setSelectedCollection}
            onCreateTable={() => setShowCreateDialog(true)}
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
                  <span className="text-gray-400">
                    {selectedCollection.columnName}
                  </span>
                  {selectedCollection.documentCount != null && (
                    <span className="text-gray-400">
                      · {selectedCollection.documentCount.toLocaleString()} docs
                    </span>
                  )}
                </div>
              </div>

              {/* Search Panel */}
              <div className="flex-1 min-h-0 overflow-y-auto p-5">
                <VectorSearchPanel
                  collection={selectedCollection}
                  onAddToHistory={handleAddToHistory}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right: Query History */}
        <div className="w-72 flex-shrink-0 flex flex-col border-l border-gray-200 bg-white overflow-hidden dark:border-gray-700 dark:bg-gray-800">
          <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Query History
              </span>
              {queryHistory.length > 0 && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                  {queryHistory.length}
                </span>
              )}
            </div>
            {queryHistory.length > 0 && (
              <button
                onClick={clearHistory}
                className="text-gray-400 hover:text-red-500 transition-colors"
                title="Clear history"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {queryHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                  <History className="h-5 w-5 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No searches yet</p>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  Execute a vector search to build history
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {queryHistory.map((item) => (
                  <div
                    key={item.id}
                    className="group px-4 py-3 hover:bg-blue-50/30 dark:hover:bg-blue-950/10 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="max-w-[140px] truncate font-mono text-xs text-blue-600 dark:text-blue-400" title={item.collection}>
                        {item.collection.split('.').pop()}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {formatTimestamp(item.timestamp)}
                      </span>
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

          {/* Vector Function Reference */}
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
        </div>
      </div>

      {/* Dialogs */}
      {showCreateDialog && (
        <CreateVectorTableDialog
          onClose={() => setShowCreateDialog(false)}
          onSuccess={() => {
            setShowCreateDialog(false);
            window.location.reload();
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
