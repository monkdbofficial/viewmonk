'use client';

import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useToast } from './ToastContext';
import {
  BookmarkIcon,
  FolderIcon,
  TagIcon,
  SearchIcon,
  PlusIcon,
  TrashIcon,
  StarIcon,
  PlayIcon,
  EditIcon,
  XIcon,
  ClockIcon,
} from 'lucide-react';

export interface SavedQuery {
  id: string;
  name: string;
  description?: string;
  query: string;
  connection_id?: string;
  folder?: string;
  tags: string[];
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
  last_executed?: string;
  execution_count: number;
}

interface SavedQueriesProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectQuery: (query: string) => void;
  connectionId?: string;
}

export default function SavedQueries({
  isOpen,
  onClose,
  onSelectQuery,
  connectionId,
}: SavedQueriesProps) {
  const [queries, setQueries] = useState<SavedQuery[]>([]);
  const [filteredQueries, setFilteredQueries] = useState<SavedQuery[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [folders, setFolders] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedQuery, setSelectedQuery] = useState<SavedQuery | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newQuery, setNewQuery] = useState({
    name: '',
    description: '',
    query: '',
    folder: '',
    tags: '',
  });

  const toast = useToast();

  // Load saved queries
  const loadQueries = async () => {
    // Check if running in Tauri environment
    if (typeof window === 'undefined' || !window.__TAURI__) {
      console.log('Saved queries require Tauri desktop app');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const result = await invoke<SavedQuery[]>('list_saved_queries', {
        filter: null,
      });
      setQueries(result);
      applyFilters(result);

      // Extract folders and tags
      const folderList = await invoke<string[]>('list_query_folders');
      const tagList = await invoke<string[]>('list_query_tags');
      setFolders(folderList);
      setTags(tagList);
    } catch (error) {
      console.error('Failed to load saved queries:', error);
      toast.error('Failed to Load', 'Could not load saved queries');
    } finally {
      setLoading(false);
    }
  };

  // Apply filters
  const applyFilters = (queriesList: SavedQuery[] = queries) => {
    let filtered = [...queriesList];

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (q) =>
          q.name.toLowerCase().includes(search) ||
          q.query.toLowerCase().includes(search) ||
          q.description?.toLowerCase().includes(search)
      );
    }

    // Folder filter
    if (selectedFolder !== 'all') {
      filtered = filtered.filter((q) => q.folder === selectedFolder);
    }

    // Tag filter
    if (selectedTag !== 'all') {
      filtered = filtered.filter((q) => q.tags.includes(selectedTag));
    }

    // Favorites filter
    if (showFavoritesOnly) {
      filtered = filtered.filter((q) => q.is_favorite);
    }

    setFilteredQueries(filtered);
  };

  // Toggle favorite
  const toggleFavorite = async (query: SavedQuery) => {
    if (typeof window === 'undefined' || !window.__TAURI__) {
      toast.error('Desktop App Required', 'This feature requires the Tauri desktop app');
      return;
    }

    try {
      await invoke('update_saved_query', {
        request: {
          id: query.id,
          is_favorite: !query.is_favorite,
        },
      });
      await loadQueries();
      toast.success('Updated', `Query ${query.is_favorite ? 'removed from' : 'added to'} favorites`);
    } catch (error) {
      toast.error('Failed', 'Could not update query');
    }
  };

  // Delete query
  const deleteQuery = async (id: string, name: string) => {
    if (!confirm(`Delete query "${name}"?`)) return;

    if (typeof window === 'undefined' || !window.__TAURI__) {
      toast.error('Desktop App Required', 'This feature requires the Tauri desktop app');
      return;
    }

    try {
      await invoke('delete_saved_query', { id });
      await loadQueries();
      toast.success('Deleted', 'Query deleted successfully');
    } catch (error) {
      toast.error('Failed', 'Could not delete query');
    }
  };

  // Execute query
  const executeQuery = async (query: SavedQuery) => {
    // Always allow loading the query text, but only mark as executed in Tauri
    onSelectQuery(query.query);
    onClose();
    toast.success('Query Loaded', `Loaded "${query.name}"`);

    // Try to mark as executed if in Tauri environment
    if (typeof window !== 'undefined' && window.__TAURI__) {
      try {
        await invoke('mark_query_executed', { id: query.id });
      } catch (error) {
        console.error('Failed to mark query as executed:', error);
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadQueries();
    }
  }, [isOpen]);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, selectedFolder, selectedTag, showFavoritesOnly, queries]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-5xl max-h-[90vh] mx-4 bg-white dark:bg-gray-800 rounded-lg shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <BookmarkIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Saved Queries
            </h2>
            <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-400">
              {filteredQueries.length} queries
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <XIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
          {/* Search */}
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search queries..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filter buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                showFavoritesOnly
                  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <StarIcon className={`h-4 w-4 ${showFavoritesOnly ? 'fill-current' : ''}`} />
              Favorites
            </button>

            {/* Folder filter */}
            <select
              value={selectedFolder}
              onChange={(e) => setSelectedFolder(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border-0 focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Folders</option>
              {folders.map((folder) => (
                <option key={folder} value={folder}>
                  📁 {folder}
                </option>
              ))}
            </select>

            {/* Tag filter */}
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border-0 focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Tags</option>
              {tags.map((tag) => (
                <option key={tag} value={tag}>
                  🏷️ {tag}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Query List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500 dark:text-gray-400">Loading...</div>
            </div>
          ) : filteredQueries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <BookmarkIcon className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                {queries.length === 0
                  ? 'No saved queries yet'
                  : 'No queries match your filters'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredQueries.map((query) => (
                <div
                  key={query.id}
                  className="group relative p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all bg-white dark:bg-gray-900"
                >
                  {/* Favorite star */}
                  <button
                    onClick={() => toggleFavorite(query)}
                    className="absolute top-2 right-2 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <StarIcon
                      className={`h-4 w-4 ${
                        query.is_favorite
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-400'
                      }`}
                    />
                  </button>

                  {/* Query name */}
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2 pr-6">
                    {query.name}
                  </h3>

                  {/* Description */}
                  {query.description && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                      {query.description}
                    </p>
                  )}

                  {/* Query preview */}
                  <div className="mb-3 p-2 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                    <code className="text-xs text-gray-700 dark:text-gray-300 line-clamp-3">
                      {query.query}
                    </code>
                  </div>

                  {/* Metadata */}
                  <div className="space-y-2 mb-3">
                    {query.folder && (
                      <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <FolderIcon className="h-3 w-3" />
                        {query.folder}
                      </div>
                    )}
                    {query.tags.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap">
                        {query.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    {query.execution_count > 0 && (
                      <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <ClockIcon className="h-3 w-3" />
                        Executed {query.execution_count} times
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => executeQuery(query)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
                    >
                      <PlayIcon className="h-3.5 w-3.5" />
                      Load
                    </button>
                    <button
                      onClick={() => deleteQuery(query.id, query.name)}
                      className="px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                      title="Delete query"
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
