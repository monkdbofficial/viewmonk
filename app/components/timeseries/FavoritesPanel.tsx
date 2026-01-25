'use client';

import { useState, useRef, useEffect } from 'react';
import { Star, BookmarkPlus, Trash2, X, Eye } from 'lucide-react';

export interface Favorite {
  id: string;
  name: string;
  description?: string;
  type: 'dashboard' | 'widget' | 'query' | 'filter';
  config: any;
  createdAt: Date;
  tags?: string[];
}

interface FavoritesPanelProps {
  favorites: Favorite[];
  onLoad: (favorite: Favorite) => void;
  onDelete: (id: string) => void;
  onSave: (favorite: Omit<Favorite, 'id' | 'createdAt'>) => void;
}

export default function FavoritesPanel({ favorites, onLoad, onDelete, onSave }: FavoritesPanelProps) {
  const [showPanel, setShowPanel] = useState(false);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [newFavorite, setNewFavorite] = useState({
    name: '',
    description: '',
    type: 'dashboard' as 'dashboard' | 'widget' | 'query' | 'filter',
    config: {},
    tags: [] as string[],
  });
  const panelRef = useRef<HTMLDivElement>(null);

  // Close panel when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setShowPanel(false);
      }
    }

    if (showPanel) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showPanel]);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'dashboard': return 'from-blue-600 to-blue-700';
      case 'widget': return 'from-purple-600 to-purple-700';
      case 'query': return 'from-green-600 to-green-700';
      case 'filter': return 'from-orange-600 to-orange-700';
      default: return 'from-gray-600 to-gray-700';
    }
  };

  const getTypeBg = (type: string) => {
    switch (type) {
      case 'dashboard': return 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800';
      case 'widget': return 'bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800';
      case 'query': return 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800';
      case 'filter': return 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800';
      default: return 'bg-gray-50 dark:bg-gray-950/20 border-gray-200 dark:border-gray-800';
    }
  };

  const handleSave = () => {
    if (!newFavorite.name) {
      alert('Please enter a name');
      return;
    }

    onSave(newFavorite);
    setNewFavorite({
      name: '',
      description: '',
      type: 'dashboard',
      config: {},
      tags: [],
    });
    setShowSaveForm(false);
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Favorites Button - Icon Only */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="group relative p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm hover:shadow-md transition-all"
        title="Favorites"
      >
        <Star className="h-4 w-4" />
        {favorites.length > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-yellow-600 to-yellow-700 text-xs font-bold text-white shadow-lg">
            {favorites.length}
          </span>
        )}
        <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
          Favorites
        </span>
      </button>

      {/* Favorites Panel */}
      {showPanel && (
        <div className="absolute right-0 top-full mt-3 w-[600px] rounded-2xl border border-gray-200/50 bg-white/95 backdrop-blur-xl shadow-2xl dark:border-gray-700/50 dark:bg-gray-800/95 max-h-[600px] overflow-hidden flex flex-col" style={{ zIndex: 9999 }}>
          {/* Header */}
          <div className="border-b border-gray-200 dark:border-gray-700/50 bg-gradient-to-r from-yellow-50 via-orange-50 to-red-50 dark:from-gray-900 dark:via-gray-850 dark:to-gray-900 px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-600 to-orange-600 shadow-lg">
                  <Star className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Favorites & Bookmarks
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                    {favorites.length} saved items
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSaveForm(!showSaveForm)}
                  className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all"
                  title="Save current view"
                >
                  <BookmarkPlus className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setShowPanel(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Save Form */}
          {showSaveForm && (
            <div className="border-b border-gray-200 dark:border-gray-700 p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30">
              <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Save Current View</h4>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Name your favorite"
                  value={newFavorite.name}
                  onChange={(e) => setNewFavorite({ ...newFavorite, name: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                />
                <textarea
                  placeholder="Description (optional)"
                  value={newFavorite.description}
                  onChange={(e) => setNewFavorite({ ...newFavorite, description: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                  rows={2}
                />
                <select
                  value={newFavorite.type}
                  onChange={(e) => setNewFavorite({ ...newFavorite, type: e.target.value as any })}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                >
                  <option value="dashboard">Dashboard</option>
                  <option value="widget">Widget</option>
                  <option value="query">Query</option>
                  <option value="filter">Filter</option>
                </select>
                <button
                  onClick={handleSave}
                  className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg text-sm font-semibold shadow-lg transition-all"
                >
                  Save Favorite
                </button>
              </div>
            </div>
          )}

          {/* Favorites List */}
          <div className="flex-1 overflow-y-auto p-6">
            {favorites.length === 0 ? (
              <div className="py-12 text-center">
                <Star className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-600 dark:text-gray-400">No favorites saved yet</p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Click the bookmark icon to save your current view
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {favorites.map((favorite) => (
                  <div
                    key={favorite.id}
                    className={`rounded-xl border p-4 ${getTypeBg(favorite.type)} hover:shadow-md transition-all`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r ${getTypeColor(favorite.type)} flex-shrink-0 shadow-md`}>
                          <Star className="h-4 w-4 text-white fill-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                              {favorite.name}
                            </h4>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r ${getTypeColor(favorite.type)} text-white`}>
                              {favorite.type}
                            </span>
                          </div>
                          {favorite.description && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                              {favorite.description}
                            </p>
                          )}
                          <div className="text-xs text-gray-500 dark:text-gray-500">
                            Saved on {new Date(favorite.createdAt).toLocaleDateString()}
                          </div>
                          {favorite.tags && favorite.tags.length > 0 && (
                            <div className="flex gap-1 mt-2">
                              {favorite.tags.map((tag, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onLoad(favorite)}
                          className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-all"
                          title="Load this favorite"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onDelete(favorite.id)}
                          className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-all"
                          title="Delete favorite"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
