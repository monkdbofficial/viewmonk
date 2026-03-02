'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

/**
 * Enterprise-grade Saved Views Context
 *
 * Tracks user activity for improved UX:
 * - Recent queries (last 10, persisted to localStorage)
 * - Recently viewed tables (last 10, persisted to localStorage)
 *
 * Features:
 * - Automatic deduplication
 * - Timestamp tracking
 * - Local storage persistence
 * - Clear/remove operations
 */

export interface RecentQuery {
  id: string;
  query: string;
  timestamp: number;
  rowCount?: number;
  executionTime?: number;
}

export interface RecentTable {
  id: string;
  schema: string;
  table: string;
  timestamp: number;
}

interface SavedViewsContextType {
  recentQueries: RecentQuery[];
  recentTables: RecentTable[];
  addRecentQuery: (query: string, rowCount?: number, executionTime?: number) => void;
  addRecentTable: (schema: string, table: string) => void;
  removeRecentQuery: (id: string) => void;
  removeRecentTable: (id: string) => void;
  clearRecentQueries: () => void;
  clearRecentTables: () => void;
}

const SavedViewsContext = createContext<SavedViewsContextType | undefined>(undefined);

const STORAGE_KEYS = {
  RECENT_QUERIES: 'monkdb_recent_queries',
  RECENT_TABLES: 'monkdb_recent_tables',
};

const MAX_ITEMS = 10;

export function SavedViewsProvider({ children }: { children: React.ReactNode }) {
  const [recentQueries, setRecentQueries] = useState<RecentQuery[]>([]);
  const [recentTables, setRecentTables] = useState<RecentTable[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const savedQueries = localStorage.getItem(STORAGE_KEYS.RECENT_QUERIES);
      const savedTables = localStorage.getItem(STORAGE_KEYS.RECENT_TABLES);

      if (savedQueries) {
        setRecentQueries(JSON.parse(savedQueries));
      }
      if (savedTables) {
        setRecentTables(JSON.parse(savedTables));
      }
    } catch {
      // ignore malformed localStorage data
    }
  }, []);

  /**
   * Add a recent query (with deduplication)
   */
  const addRecentQuery = useCallback((query: string, rowCount?: number, executionTime?: number) => {
    if (!query.trim()) return;

    setRecentQueries((prev) => {
      // Remove duplicates (same query text)
      const filtered = prev.filter((q) => q.query !== query);

      // Create new entry
      const newQuery: RecentQuery = {
        id: crypto.randomUUID(),
        query: query.trim(),
        timestamp: Date.now(),
        rowCount,
        executionTime,
      };

      // Add to front and limit to MAX_ITEMS
      const updated = [newQuery, ...filtered].slice(0, MAX_ITEMS);

      // Save to localStorage
      try {
        localStorage.setItem(STORAGE_KEYS.RECENT_QUERIES, JSON.stringify(updated));
      } catch {
        // storage quota exceeded — ignore
      }

      return updated;
    });
  }, []);

  /**
   * Add a recently viewed table (with deduplication)
   */
  const addRecentTable = useCallback((schema: string, table: string) => {
    if (!schema || !table) return;

    setRecentTables((prev) => {
      // Remove duplicates (same schema.table)
      const filtered = prev.filter((t) => !(t.schema === schema && t.table === table));

      // Create new entry
      const newTable: RecentTable = {
        id: crypto.randomUUID(),
        schema,
        table,
        timestamp: Date.now(),
      };

      // Add to front and limit to MAX_ITEMS
      const updated = [newTable, ...filtered].slice(0, MAX_ITEMS);

      // Save to localStorage
      try {
        localStorage.setItem(STORAGE_KEYS.RECENT_TABLES, JSON.stringify(updated));
      } catch {
        // storage quota exceeded — ignore
      }

      return updated;
    });
  }, []);

  /**
   * Remove a specific recent query
   */
  const removeRecentQuery = useCallback((id: string) => {
    setRecentQueries((prev) => {
      const updated = prev.filter((q) => q.id !== id);
      try {
        localStorage.setItem(STORAGE_KEYS.RECENT_QUERIES, JSON.stringify(updated));
      } catch {
        // storage quota exceeded — ignore
      }
      return updated;
    });
  }, []);

  /**
   * Remove a specific recent table
   */
  const removeRecentTable = useCallback((id: string) => {
    setRecentTables((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      try {
        localStorage.setItem(STORAGE_KEYS.RECENT_TABLES, JSON.stringify(updated));
      } catch {
        // storage quota exceeded — ignore
      }
      return updated;
    });
  }, []);

  /**
   * Clear all recent queries
   */
  const clearRecentQueries = useCallback(() => {
    setRecentQueries([]);
    try {
      localStorage.removeItem(STORAGE_KEYS.RECENT_QUERIES);
    } catch {
      // ignore
    }
  }, []);

  /**
   * Clear all recent tables
   */
  const clearRecentTables = useCallback(() => {
    setRecentTables([]);
    try {
      localStorage.removeItem(STORAGE_KEYS.RECENT_TABLES);
    } catch {
      // ignore
    }
  }, []);

  const value: SavedViewsContextType = {
    recentQueries,
    recentTables,
    addRecentQuery,
    addRecentTable,
    removeRecentQuery,
    removeRecentTable,
    clearRecentQueries,
    clearRecentTables,
  };

  return <SavedViewsContext.Provider value={value}>{children}</SavedViewsContext.Provider>;
}

/**
 * Hook to access Saved Views context
 */
export function useSavedViews() {
  const context = useContext(SavedViewsContext);
  if (context === undefined) {
    throw new Error('useSavedViews must be used within a SavedViewsProvider');
  }
  return context;
}
