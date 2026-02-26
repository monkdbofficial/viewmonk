'use client';

import { useState } from 'react';
import { Database, Star, Clock, Plus, RefreshCw, Search, X, Loader2 } from 'lucide-react';
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

interface VectorCollectionBrowserProps {
  selectedCollection: VectorCollection | null;
  onSelectCollection: (collection: VectorCollection) => void;
  onCreateTable: () => void;
}

export default function VectorCollectionBrowser({
  selectedCollection,
  onSelectCollection,
  onCreateTable,
}: VectorCollectionBrowserProps) {
  const { collections, loading, error, refresh } = useVectorCollections();
  const [favorites, setFavorites] = useState<string[]>(getVectorFavorites());
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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

  const CollectionRow = ({ collection }: { collection: VectorCollection }) => {
    const key = `${collection.schema}.${collection.table}`;
    const isFavorited = favorites.includes(key);
    const isSelected =
      selectedCollection?.schema === collection.schema &&
      selectedCollection?.table === collection.table;
    const isRecent = recentKeys.includes(key);

    return (
      <div
        onClick={() => handleSelectCollection(collection)}
        className={`group flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 transition-colors ${
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
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleToggleFavorite(collection);
          }}
          className={`flex-shrink-0 transition-opacity ${
            isFavorited ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
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
      </div>
    );
  };

  return (
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
            <button onClick={handleRefresh} className="mt-1 block text-xs underline">
              Try again
            </button>
          </div>
        ) : filteredCollections.length === 0 ? (
          <div className="px-2 py-8 text-center">
            {searchQuery ? (
              <>
                <Search className="mx-auto mb-2 h-7 w-7 text-gray-300 dark:text-gray-600" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No results for &ldquo;{searchQuery}&rdquo;
                </p>
              </>
            ) : (
              <>
                <Database className="mx-auto mb-3 h-7 w-7 text-gray-300 dark:text-gray-600" />
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  No vector collections
                </p>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  Tables with FLOAT_VECTOR columns appear here
                </p>
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
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Favorites
                  </span>
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
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      All
                    </span>
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
  );
}
