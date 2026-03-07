'use client';

import { useState } from 'react';
import { BookMarked, Trash2, Clock, Play, ChevronDown, ChevronRight, Save } from 'lucide-react';
import type { SavedQuery } from '../../hooks/useGeoData';

interface SavedQueriesPanelProps {
  savedQueries: SavedQuery[];
  queryHistory: string[];
  currentSql: string;
  onLoad: (sql: string) => void;
  onSave: (name: string, sql: string) => void;
  onDelete: (id: string) => void;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function SavedQueriesPanel({
  savedQueries, queryHistory, currentSql, onLoad, onSave, onDelete,
}: SavedQueriesPanelProps) {
  const [saveName, setSaveName]           = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [showHistory, setShowHistory]     = useState(true);
  const [showSaved, setShowSaved]         = useState(true);

  const handleSave = () => {
    if (!saveName.trim()) return;
    onSave(saveName, currentSql);
    setSaveName('');
    setShowSaveInput(false);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden border-l border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900" style={{ width: 280, flexShrink: 0 }}>
      {/* Header */}
      <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookMarked className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-bold text-gray-800 dark:text-gray-200">Query Library</span>
          </div>
          <button
            onClick={() => setShowSaveInput(v => !v)}
            disabled={!currentSql.trim()}
            className="flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Save className="h-3 w-3" /> Save
          </button>
        </div>

        {showSaveInput && (
          <div className="mt-2 flex gap-1">
            <input
              autoFocus
              value={saveName}
              onChange={e => setSaveName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setShowSaveInput(false); }}
              placeholder="Query name…"
              className="min-w-0 flex-1 rounded border border-blue-300 bg-white px-2 py-1 text-xs text-gray-800 outline-none focus:ring-1 focus:ring-blue-400 dark:border-blue-700 dark:bg-gray-800 dark:text-gray-200"
            />
            <button
              onClick={handleSave}
              disabled={!saveName.trim()}
              className="rounded bg-blue-600 px-2 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
            >OK</button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Saved Queries */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setShowSaved(v => !v)}
            className="flex w-full items-center justify-between px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <span>Saved ({savedQueries.length})</span>
            {showSaved ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>

          {showSaved && (
            savedQueries.length === 0 ? (
              <p className="px-4 pb-3 text-xs text-gray-400 dark:text-gray-500">No saved queries yet. Run a query then click Save.</p>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {savedQueries.map(sq => (
                  <div key={sq.id} className="group relative px-4 py-2.5 hover:bg-white dark:hover:bg-gray-800">
                    <div className="flex items-start justify-between gap-1">
                      <button
                        onClick={() => onLoad(sq.sql)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="truncate text-xs font-semibold text-gray-800 group-hover:text-blue-600 dark:text-gray-200 dark:group-hover:text-blue-400">
                          {sq.name}
                        </p>
                        <p className="mt-0.5 truncate font-mono text-[10px] text-gray-400 dark:text-gray-500">
                          {sq.sql.slice(0, 60)}{sq.sql.length > 60 ? '…' : ''}
                        </p>
                        <p className="mt-0.5 text-[10px] text-gray-400 dark:text-gray-500">{relativeTime(sq.savedAt)}</p>
                      </button>
                      <div className="flex flex-shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={() => onLoad(sq.sql)}
                          className="rounded p-1 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                          title="Load query"
                        >
                          <Play className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => onDelete(sq.id)}
                          className="rounded p-1 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                          title="Delete"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        {/* Query History */}
        <div>
          <button
            onClick={() => setShowHistory(v => !v)}
            className="flex w-full items-center justify-between px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> History ({queryHistory.length})
            </span>
            {showHistory ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>

          {showHistory && (
            queryHistory.length === 0 ? (
              <p className="px-4 pb-3 text-xs text-gray-400 dark:text-gray-500">No queries run yet.</p>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {queryHistory.map((sql, i) => (
                  <button
                    key={i}
                    onClick={() => onLoad(sql)}
                    className="group w-full px-4 py-2 text-left hover:bg-white dark:hover:bg-gray-800"
                  >
                    <p className="truncate font-mono text-[11px] text-gray-600 group-hover:text-blue-600 dark:text-gray-400 dark:group-hover:text-blue-400">
                      {sql.replace(/\s+/g, ' ').slice(0, 80)}{sql.length > 80 ? '…' : ''}
                    </p>
                  </button>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
