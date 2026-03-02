/**
 * Shared query history management hook
 * Used by both Vector Operations and Full-Text Search
 */

import { useState, useEffect } from 'react';

export interface QueryHistoryItem {
  id: string;
  timestamp: number;
  feature: 'vector' | 'fts';
  params: {
    collection?: string;
    schema?: string;
    table?: string;
    query: string;
    searchType?: string;
    columns?: string[];
    boosts?: Record<string, number>;
  };
  resultCount: number;
  executionTime: number;
}

const MAX_HISTORY_ITEMS = 50;

/**
 * Get query history for a specific feature
 * @param feature - 'vector' or 'fts'
 * @returns Array of query history items
 */
export function useQueryHistory(feature: 'vector' | 'fts') {
  const [history, setHistory] = useState<QueryHistoryItem[]>([]);

  const storageKey = `monkdb-${feature}-history`;

  // Load history from localStorage on mount
  useEffect(() => {
    loadHistory();
  }, [feature]);

  const loadHistory = () => {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        setHistory(parsed);
      }
    } catch {
      // malformed localStorage data — start with empty history
    }
  };

  const saveHistory = (items: QueryHistoryItem[]) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(items));
    } catch {
      // storage quota exceeded — in-memory history still intact
    }
  };

  const addQuery = (query: Omit<QueryHistoryItem, 'id' | 'timestamp' | 'feature'>) => {
    const item: QueryHistoryItem = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      feature,
      ...query,
    };

    const newHistory = [item, ...history].slice(0, MAX_HISTORY_ITEMS);
    setHistory(newHistory);
    saveHistory(newHistory);

    return item;
  };

  const deleteQuery = (id: string) => {
    const newHistory = history.filter((item) => item.id !== id);
    setHistory(newHistory);
    saveHistory(newHistory);
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(storageKey);
  };

  const getRecentQueries = (limit: number = 10) => {
    return history.slice(0, limit);
  };

  const getQueryById = (id: string) => {
    return history.find((item) => item.id === id);
  };

  return {
    history,
    addQuery,
    deleteQuery,
    clearHistory,
    getRecentQueries,
    getQueryById,
    refresh: loadHistory,
  };
}

/**
 * Format timestamp as relative time
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return new Date(timestamp).toLocaleDateString();
}

/**
 * Get query statistics
 */
export function getQueryStats(history: QueryHistoryItem[]) {
  if (history.length === 0) {
    return {
      totalQueries: 0,
      avgExecutionTime: 0,
      avgResultCount: 0,
      last24Hours: 0,
    };
  }

  const now = Date.now();
  const last24h = history.filter((item) => now - item.timestamp < 86400000);

  const totalExecutionTime = history.reduce((sum, item) => sum + item.executionTime, 0);
  const totalResults = history.reduce((sum, item) => sum + item.resultCount, 0);

  return {
    totalQueries: history.length,
    avgExecutionTime: totalExecutionTime / history.length,
    avgResultCount: totalResults / history.length,
    last24Hours: last24h.length,
  };
}
