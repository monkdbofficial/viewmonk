'use client';

import { useState } from 'react';
import { Database, Star, Clock, Plus, RefreshCw, Search, X } from 'lucide-react';
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
  const [showRecent, setShowRecent] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter collections based on search query
  const filteredCollections = collections.filter(c => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      c.table.toLowerCase().includes(query) ||
      c.schema.toLowerCase().includes(query) ||
      `${c.schema}.${c.table}`.toLowerCase().includes(query)
    );
  });

  const recentKeys = getRecentVectorCollections();
  const recentCollections = filteredCollections.filter(c =>
    recentKeys.includes(`${c.schema}.${c.table}`)
  );

  const favoriteCollections = filteredCollections.filter(c =>
    favorites.includes(`${c.schema}.${c.table}`)
  );

  const handleToggleFavorite = (collection: VectorCollection) => {
    const key = `${collection.schema}.${collection.table}`;
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

  const formatNumber = (num?: number) => {
    if (num === undefined) return '—';
    return num.toLocaleString();
  };

  const CollectionItem = ({ collection }: { collection: VectorCollection }) => {
    const key = `${collection.schema}.${collection.table}`;
    const isFavorited = favorites.includes(key);
    const isSelected =
      selectedCollection?.schema === collection.schema &&
      selectedCollection?.table === collection.table;

    return (
      <div
        className={`group flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
          isSelected
            ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700'
            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
        }`}
        onClick={() => handleSelectCollection(collection)}
      >
        <Database className="w-4 h-4 mt-1 text-gray-500 dark:text-gray-400" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {collection.table}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToggleFavorite(collection);
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Star
                className={`w-3 h-3 ${
                  isFavorited
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-400 hover:text-yellow-400'
                }`}
              />
            </button>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {collection.schema}
          </div>
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-600 dark:text-gray-400">
            <span>{collection.dimension}D</span>
            <span>•</span>
            <span>{formatNumber(collection.documentCount)} docs</span>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="w-6 h-6 animate-spin text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading collections...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
        <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        <button
          onClick={handleRefresh}
          className="mt-2 text-xs text-red-600 dark:text-red-400 hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Collections
        </h3>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="Refresh collections"
        >
          <RefreshCw className={`w-4 h-4 text-gray-500 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search collections..."
          className="w-full pl-9 pr-9 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Favorites Section */}
      {favoriteCollections.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-2">
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Favorites
            </span>
          </div>
          <div className="space-y-2">
            {favoriteCollections.map((collection) => (
              <CollectionItem
                key={`${collection.schema}.${collection.table}`}
                collection={collection}
              />
            ))}
          </div>
        </div>
      )}

      {/* Recent Section */}
      {recentCollections.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-2">
            <Clock className="w-3 h-3 text-gray-500" />
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Recent
            </span>
          </div>
          <div className="space-y-2">
            {recentCollections.slice(0, 5).map((collection) => (
              <CollectionItem
                key={`${collection.schema}.${collection.table}`}
                collection={collection}
              />
            ))}
          </div>
        </div>
      )}

      {/* All Collections */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 px-2">
          <Database className="w-3 h-3 text-gray-500" />
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            All ({filteredCollections.length})
          </span>
        </div>
        {filteredCollections.length === 0 && searchQuery ? (
          <div className="text-center py-8">
            <Search className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
              No collections found
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Try a different search term
            </p>
          </div>
        ) : filteredCollections.length === 0 ? (
          <div className="text-center py-8">
            <Database className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
              No vector collections found
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
              Tables with FLOAT_VECTOR columns will appear here
            </p>

            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-700 rounded-lg p-3 mb-4 text-left">
              <p className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-2">
                Quick Start:
              </p>
              <ol className="text-xs text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
                <li>Create a table with FLOAT_VECTOR column</li>
                <li>Upload documents with embeddings</li>
                <li>Start searching semantically!</li>
              </ol>
            </div>

            <div className="space-y-2">
              <button
                onClick={onCreateTable}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Vector Table
              </button>

              <p className="text-xs text-gray-500 dark:text-gray-500">
                Already have a table?{' '}
                <button
                  onClick={handleRefresh}
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Refresh the list
                </button>
                {' '}or check the{' '}
                <strong className="text-purple-600 dark:text-purple-400">
                  Debug & Diagnostics
                </strong>
                {' '}panel above
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {filteredCollections.map((collection) => (
              <CollectionItem
                key={`${collection.schema}.${collection.table}`}
                collection={collection}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Button */}
      {collections.length > 0 && (
        <button
          onClick={onCreateTable}
          className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Vector Table
        </button>
      )}
    </div>
  );
}
