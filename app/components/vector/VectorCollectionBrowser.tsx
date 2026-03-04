'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Database, Star, Clock, Plus, RefreshCw, Search, X, Loader2,
  MoreVertical, Eye, Pencil, PlusCircle, Trash2, AlertTriangle,
} from 'lucide-react';
import {
  VectorCollection,
  useVectorCollections,
  getVectorFavorites,
  addVectorFavorite,
  removeVectorFavorite,
  isVectorFavorite,
  getRecentVectorCollections,
  addRecentVectorCollection,
} from '@/app/hooks/useVectorCollections';
import { useMonkDBClient } from '@/app/lib/monkdb-context';
import { useToast } from '@/app/components/ToastContext';

const EXTRA_COL_TYPES = [
  'TEXT', 'INTEGER', 'BIGINT', 'FLOAT', 'DOUBLE', 'BOOLEAN', 'TIMESTAMP WITH TIME ZONE',
];

interface VectorCollectionBrowserProps {
  selectedCollection: VectorCollection | null;
  onSelectCollection: (collection: VectorCollection) => void;
  onCreateTable: () => void;
  onCollectionDropped?: (schema: string, table: string) => void;
}

interface DDLModal {
  schema: string;
  table: string;
  loading: boolean;
  text: string;
}

export default function VectorCollectionBrowser({
  selectedCollection,
  onSelectCollection,
  onCreateTable,
  onCollectionDropped,
}: VectorCollectionBrowserProps) {
  const { collections, loading, error, refresh } = useVectorCollections();
  const client = useMonkDBClient();
  const toast = useToast();
  const [favorites, setFavorites] = useState<string[]>(getVectorFavorites());
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // DDL modal at VCB level (renders via portal to escape overflow/stacking contexts)
  const [ddlModal, setDdlModal] = useState<DDLModal | null>(null);

  const recentKeys = getRecentVectorCollections();

  const filteredCollections = collections.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.table.toLowerCase().includes(q) ||
      c.schema.toLowerCase().includes(q) ||
      `${c.schema}.${c.table}`.toLowerCase().includes(q)
    );
  });

  const favoriteCollections = filteredCollections.filter((c) =>
    favorites.includes(`${c.schema}.${c.table}`)
  );

  const otherCollections = filteredCollections.filter(
    (c) => !favorites.includes(`${c.schema}.${c.table}`)
  );

  const handleToggleFavorite = (collection: VectorCollection) => {
    if (isVectorFavorite(collection.schema, collection.table)) {
      removeVectorFavorite(collection.schema, collection.table);
    } else {
      addVectorFavorite(collection.schema, collection.table);
    }
    setFavorites(getVectorFavorites());
  };

  const handleSelectCollection = (collection: VectorCollection) => {
    onSelectCollection(collection);
    addRecentVectorCollection(collection.schema, collection.table);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const openDDL = async (schema: string, table: string) => {
    const qi = (n: string) => `"${n.replace(/"/g, '""')}"`;
    setDdlModal({ schema, table, loading: true, text: '' });
    try {
      if (!client) return;
      const r = await client.query(`SHOW CREATE TABLE ${qi(schema)}.${qi(table)}`);
      if (r.rows.length > 0) {
        const row = r.rows[0] as unknown[];
        setDdlModal(m => m ? { ...m, loading: false, text: String(row[row.length - 1] ?? '') } : null);
      } else {
        setDdlModal(m => m ? { ...m, loading: false, text: 'No DDL returned' } : null);
      }
    } catch (err) {
      setDdlModal(m => m ? { ...m, loading: false, text: `Error: ${err instanceof Error ? err.message : 'Unknown error'}` } : null);
    }
  };

  // ── CollectionRow ────────────────────────────────────────────────────────────
  const CollectionRow = ({ collection }: { collection: VectorCollection }) => {
    const key = `${collection.schema}.${collection.table}`;
    const isFavorited = favorites.includes(key);
    const isSelected =
      selectedCollection?.schema === collection.schema &&
      selectedCollection?.table === collection.table;
    const isRecent = recentKeys.includes(key);

    // Menu state
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Rename state
    const [renaming, setRenaming] = useState(false);
    const [newName, setNewName] = useState('');
    const [renameLoading, setRenameLoading] = useState(false);

    // Add column state
    const [addColOpen, setAddColOpen] = useState(false);
    const [newColName, setNewColName] = useState('');
    const [newColType, setNewColType] = useState('TEXT');
    const [addColLoading, setAddColLoading] = useState(false);

    // Drop state
    const [dropConfirm, setDropConfirm] = useState(false);
    const [dropLoading, setDropLoading] = useState(false);

    // Close menu when clicking outside
    useEffect(() => {
      const handler = (e: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
          setMenuOpen(false);
        }
      };
      if (menuOpen) document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }, [menuOpen]);

    const qi = (n: string) => `"${n.replace(/"/g, '""')}"`;

    const handleViewDDL = () => {
      setMenuOpen(false);
      openDDL(collection.schema, collection.table);
    };

    const handleRename = async () => {
      if (!client || !newName.trim()) return;
      setRenameLoading(true);
      try {
        await client.query(
          `ALTER TABLE ${qi(collection.schema)}.${qi(collection.table)} RENAME TO ${qi(newName.trim())}`
        );
        toast.success('Renamed', `Table renamed to ${newName.trim()}`);
        setRenaming(false);
        setMenuOpen(false);
        await refresh();
        // Deselect if this was the selected collection
        if (isSelected && onCollectionDropped) {
          onCollectionDropped(collection.schema, collection.table);
        }
      } catch (err) {
        toast.error('Rename Failed', err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setRenameLoading(false);
      }
    };

    const handleAddColumn = async () => {
      if (!client || !newColName.trim()) return;
      setAddColLoading(true);
      try {
        await client.query(
          `ALTER TABLE ${qi(collection.schema)}.${qi(collection.table)} ADD COLUMN ${qi(newColName.trim())} ${newColType}`
        );
        toast.success('Column Added', `Added column ${newColName.trim()} (${newColType})`);
        setAddColOpen(false);
        setNewColName('');
        setMenuOpen(false);
      } catch (err) {
        toast.error('Add Column Failed', err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setAddColLoading(false);
      }
    };

    const handleDrop = async () => {
      if (!client) return;
      setDropLoading(true);
      try {
        await client.query(
          `DROP TABLE IF EXISTS ${qi(collection.schema)}.${qi(collection.table)}`
        );
        toast.success('Dropped', `Collection ${collection.table} deleted`);
        setDropConfirm(false);
        setMenuOpen(false);
        await refresh();
        if (onCollectionDropped) {
          onCollectionDropped(collection.schema, collection.table);
        }
      } catch (err) {
        toast.error('Drop Failed', err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setDropLoading(false);
      }
    };

    return (
      <>
        <div
          data-testid={`vec-row-${collection.schema}-${collection.table}`}
          onClick={() => handleSelectCollection(collection)}
          className={`group relative flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 transition-colors ${
            isSelected
              ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
          }`}
        >
          <Database
            className={`h-3.5 w-3.5 flex-shrink-0 ${
              isSelected ? 'text-blue-500' : 'text-gray-400 dark:text-gray-500'
            }`}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <span className={`truncate text-sm ${isSelected ? 'font-medium' : ''}`}>
                {collection.table}
              </span>
              {isRecent && (
                <Clock className="h-3 w-3 flex-shrink-0 text-gray-400 dark:text-gray-500" />
              )}
            </div>
            <div className="text-xs text-gray-400 dark:text-gray-500">
              {collection.schema} · {collection.dimension}D
              {collection.documentCount != null && ` · ${collection.documentCount.toLocaleString()} docs`}
            </div>
          </div>

          {/* Action buttons (visible on hover) */}
          <div className="flex flex-shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Star */}
            <button
              onClick={(e) => { e.stopPropagation(); handleToggleFavorite(collection); }}
              className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Star
                className={`h-3 w-3 ${
                  isFavorited
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-400 hover:text-yellow-400'
                }`}
              />
            </button>

            {/* Three-dot menu */}
            <div ref={menuRef} className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(v => !v); }}
                className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                title="Collection actions"
              >
                <MoreVertical className="h-3 w-3 text-gray-400" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-5 z-50 w-44 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg py-1 text-sm">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleViewDDL(); }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Eye className="h-3.5 w-3.5 text-gray-400" /> View Schema
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setRenaming(true); setNewName(collection.table); setMenuOpen(false); }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5 text-gray-400" /> Rename
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setAddColOpen(true); setMenuOpen(false); }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <PlusCircle className="h-3.5 w-3.5 text-gray-400" /> Add Column
                  </button>
                  <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
                  <button
                    onClick={(e) => { e.stopPropagation(); setDropConfirm(true); setMenuOpen(false); }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Drop Table
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Inline Rename */}
        {renaming && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="mx-1 mb-1 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 p-2 space-y-2"
          >
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">Rename Table</p>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="new_table_name"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRenaming(false); }}
              className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <div className="flex gap-1.5">
              <button
                onClick={handleRename}
                disabled={renameLoading || !newName.trim()}
                className="flex-1 rounded bg-blue-600 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {renameLoading ? <Loader2 className="mx-auto h-3 w-3 animate-spin" /> : 'Rename'}
              </button>
              <button
                onClick={() => setRenaming(false)}
                className="flex-1 rounded border border-gray-300 dark:border-gray-600 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Inline Add Column */}
        {addColOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="mx-1 mb-1 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20 p-2 space-y-2"
          >
            <p className="text-xs font-semibold text-green-700 dark:text-green-300">Add Column</p>
            <input
              type="text"
              value={newColName}
              onChange={(e) => setNewColName(e.target.value)}
              placeholder="column_name"
              autoFocus
              className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-green-500"
            />
            <select
              value={newColType}
              onChange={(e) => setNewColType(e.target.value)}
              className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-green-500"
            >
              {EXTRA_COL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <div className="flex gap-1.5">
              <button
                onClick={handleAddColumn}
                disabled={addColLoading || !newColName.trim()}
                className="flex-1 rounded bg-green-600 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {addColLoading ? <Loader2 className="mx-auto h-3 w-3 animate-spin" /> : 'Add'}
              </button>
              <button
                onClick={() => { setAddColOpen(false); setNewColName(''); }}
                className="flex-1 rounded border border-gray-300 dark:border-gray-600 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Inline Drop Confirmation */}
        {dropConfirm && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="mx-1 mb-1 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-2 space-y-2"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
              <p className="text-xs text-red-700 dark:text-red-300">
                Drop <strong>{collection.table}</strong>? This cannot be undone.
              </p>
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={handleDrop}
                disabled={dropLoading}
                className="flex-1 rounded bg-red-600 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {dropLoading ? <Loader2 className="mx-auto h-3 w-3 animate-spin" /> : 'Drop'}
              </button>
              <button
                onClick={() => setDropConfirm(false)}
                className="flex-1 rounded border border-gray-300 dark:border-gray-600 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

      </>
    );
  };

  return (
    <>
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 px-3 py-2 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-semibold text-gray-900 dark:text-white">Collections</span>
          {!loading && collections.length > 0 && (
            <span className="rounded-full bg-gray-200 px-1.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-400">
              {filteredCollections.length}
            </span>
          )}
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          title="Refresh collections"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Search */}
      <div className="flex-shrink-0 border-b border-gray-200 px-2 py-2 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search collections..."
            className="w-full rounded-md border border-gray-200 bg-white py-1.5 pl-8 pr-7 text-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <div className="mx-1 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
            {error}
            <button onClick={handleRefresh} className="mt-1 block text-xs underline">Try again</button>
          </div>
        ) : filteredCollections.length === 0 ? (
          <div className="px-2 py-8 text-center">
            {searchQuery ? (
              <>
                <Search className="mx-auto mb-2 h-7 w-7 text-gray-300 dark:text-gray-600" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No results for &ldquo;{searchQuery}&rdquo;</p>
              </>
            ) : (
              <>
                <Database className="mx-auto mb-3 h-7 w-7 text-gray-300 dark:text-gray-600" />
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No vector collections</p>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Tables with FLOAT_VECTOR columns appear here</p>
                <button
                  onClick={onCreateTable}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create Vector Table
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-0.5">
            {/* Favorites */}
            {favoriteCollections.length > 0 && (
              <>
                <div className="flex items-center gap-1.5 px-2 py-1">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Favorites</span>
                </div>
                {favoriteCollections.map((c) => (
                  <CollectionRow key={`fav-${c.schema}.${c.table}`} collection={c} />
                ))}
                {otherCollections.length > 0 && (
                  <div className="my-1.5 border-t border-gray-100 dark:border-gray-700/60" />
                )}
              </>
            )}
            {/* All (non-favorite) */}
            {otherCollections.length > 0 && (
              <>
                {favoriteCollections.length > 0 && (
                  <div className="flex items-center gap-1.5 px-2 py-1">
                    <Database className="h-3 w-3 text-gray-400" />
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">All</span>
                  </div>
                )}
                {otherCollections.map((c) => (
                  <CollectionRow key={`all-${c.schema}.${c.table}`} collection={c} />
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      {collections.length > 0 && (
        <div className="flex-shrink-0 border-t border-gray-200 p-2 dark:border-gray-700">
          <button
            onClick={onCreateTable}
            className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-gray-300 py-2 text-xs text-gray-500 transition-colors hover:border-blue-400 hover:text-blue-600 dark:border-gray-600 dark:text-gray-400 dark:hover:border-blue-500 dark:hover:text-blue-400"
          >
            <Plus className="h-3.5 w-3.5" />
            Create Vector Table
          </button>
        </div>
      )}
    </div>

    {/* DDL Modal — rendered via portal to escape overflow/stacking contexts */}
    {ddlModal && createPortal(
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
        onClick={() => setDdlModal(null)}
      >
        <div
          className="max-w-2xl w-full rounded-xl bg-white dark:bg-gray-800 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-5 py-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white" data-testid="ddl-modal-header">
              {ddlModal.schema}.{ddlModal.table} — Schema
            </h3>
            <button
              title="Close DDL"
              onClick={() => setDdlModal(null)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="p-5">
            {ddlModal.loading
              ? <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
              : ddlModal.text
                ? <pre className="rounded-lg bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-4 font-mono text-xs text-gray-700 dark:text-gray-300 overflow-x-auto whitespace-pre-wrap max-h-96">{ddlModal.text}</pre>
                : <p className="text-sm text-gray-500 dark:text-gray-400">No DDL available</p>
            }
          </div>
        </div>
      </div>,
      document.body
    )}
    </>
  );
}
