'use client';

import { useState, useCallback, useEffect } from 'react';
import { useActiveConnection } from '../lib/monkdb-context';
import { useToast } from '../components/ToastContext';

export interface GeoPoint {
  id: string;
  coordinates: [number, number];
  properties?: Record<string, unknown>;
}

export interface GeoShape {
  id: string;
  type: 'Polygon' | 'LineString' | 'MultiPolygon';
  coordinates: unknown;
  properties?: Record<string, unknown>;
}

export interface SavedQuery {
  id: string;
  name: string;
  sql: string;
  savedAt: string; // ISO timestamp
}

const HISTORY_KEY     = 'geo_query_history';
const SAVED_KEY       = 'geo_saved_queries';
const MAX_HISTORY     = 20;

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function useGeoData() {
  const activeConnection = useActiveConnection();
  const toast = useToast();

  const [geoPoints,    setGeoPoints]    = useState<GeoPoint[]>([]);
  const [geoShapes,    setGeoShapes]    = useState<GeoShape[]>([]);
  const [queryResults, setQueryResults] = useState<Record<string, unknown>[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [hasExecutedQuery, setHasExecutedQuery] = useState(false);

  // Persisted history
  const [queryHistory, setQueryHistory] = useState<string[]>(() =>
    loadFromStorage<string[]>(HISTORY_KEY, [])
  );
  useEffect(() => {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(queryHistory)); } catch { /* quota */ }
  }, [queryHistory]);

  // Persisted saved queries
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>(() =>
    loadFromStorage<SavedQuery[]>(SAVED_KEY, [])
  );
  useEffect(() => {
    try { localStorage.setItem(SAVED_KEY, JSON.stringify(savedQueries)); } catch { /* quota */ }
  }, [savedQueries]);

  const saveQuery = useCallback((name: string, sql: string) => {
    const trimmed = name.trim();
    if (!trimmed || !sql.trim()) return;
    setSavedQueries(prev => {
      // Replace if same name exists
      const filtered = prev.filter(q => q.name !== trimmed);
      return [
        { id: crypto.randomUUID(), name: trimmed, sql: sql.trim(), savedAt: new Date().toISOString() },
        ...filtered,
      ].slice(0, 50);
    });
    toast.success('Query Saved', `"${trimmed}" saved to your library`);
  }, [toast]);

  const deleteSavedQuery = useCallback((id: string) => {
    setSavedQueries(prev => prev.filter(q => q.id !== id));
  }, []);

  const handleQueryExecute = useCallback(async (query: string, params?: unknown[]) => {
    if (!activeConnection) {
      toast.error('No Database Connection', 'Please connect to a MonkDB database first.');
      return;
    }

    setLoading(true);
    setError(null);
    setHasExecutedQuery(true);

    // Dedupe history, keep newest first
    setQueryHistory(prev => {
      const updated = [query, ...prev.filter(q => q !== query)];
      return updated.slice(0, MAX_HISTORY);
    });

    try {
      const result = await activeConnection.client.query(query, params);

      const results: Record<string, unknown>[] = result.rows.map((row: unknown[], index: number) => {
        const obj: Record<string, unknown> = {};
        result.cols.forEach((col: string, colIndex: number) => {
          obj[col] = row[colIndex];
        });
        if (!obj.id && obj.id !== 0) obj.id = index;
        if (!obj.name) obj.name = `Result ${index + 1}`;
        return obj;
      });

      setQueryResults(results);

      const newPoints: GeoPoint[] = results
        .filter(r => r.latitude !== null && r.latitude !== undefined && r.longitude !== null && r.longitude !== undefined)
        .map(r => ({
          id: String(r.id),
          coordinates: [r.longitude as number, r.latitude as number] as [number, number],
          properties: r,
        }));

      if (newPoints.length > 0) {
        setGeoPoints(newPoints);
        toast.success('Query Executed', `Found ${results.length} results, ${newPoints.length} mapped points`);
      } else {
        toast.success('Query Executed', `${results.length} results returned`);
      }
    } catch (err) {
      const errorMessage = (err as Error).message;
      setError(errorMessage);
      setQueryResults([]);
      toast.error('Query Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [activeConnection, toast]);

  return {
    geoPoints,    setGeoPoints,
    geoShapes,    setGeoShapes,
    queryResults,
    loading,
    error,        setError,
    hasExecutedQuery,
    queryHistory,
    savedQueries, saveQuery, deleteSavedQuery,
    handleQueryExecute,
  };
}
