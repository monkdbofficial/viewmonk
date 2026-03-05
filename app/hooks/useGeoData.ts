'use client';

import { useState, useCallback } from 'react';
import { useActiveConnection } from '../lib/monkdb-context';
import { useToast } from '../components/ToastContext';

export interface GeoPoint {
  id: string;
  coordinates: [number, number];
  properties?: Record<string, any>;
}

export interface GeoShape {
  id: string;
  type: 'Polygon' | 'LineString' | 'MultiPolygon';
  coordinates: any;
  properties?: Record<string, any>;
}

export function useGeoData() {
  const activeConnection = useActiveConnection();
  const toast = useToast();

  const [geoPoints, setGeoPoints] = useState<GeoPoint[]>([]);
  const [geoShapes, setGeoShapes] = useState<GeoShape[]>([]);
  const [queryResults, setQueryResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasExecutedQuery, setHasExecutedQuery] = useState(false);
  const [queryHistory, setQueryHistory] = useState<string[]>([]);

  const handleQueryExecute = useCallback(async (query: string, params?: unknown[]) => {
    if (!activeConnection) {
      toast.error('No Database Connection', 'Please connect to a MonkDB database first.');
      return;
    }

    setLoading(true);
    setError(null);
    setHasExecutedQuery(true);

    // Dedupe + keep last 10
    setQueryHistory(prev => {
      const updated = [query, ...prev.filter(q => q !== query)];
      return updated.slice(0, 10);
    });

    try {
      const result = await activeConnection.client.query(query, params);

      const results = result.rows.map((row: unknown[], index: number) => {
        const obj: any = {};
        result.cols.forEach((col: string, colIndex: number) => {
          obj[col] = row[colIndex];
        });
        if (!obj.id && obj.id !== 0) obj.id = index;
        if (!obj.name) obj.name = `Result ${index + 1}`;
        return obj;
      });

      setQueryResults(results);

      // Transform to map points (GEO_POINT rows have latitude + longitude)
      const newPoints: GeoPoint[] = results
        .filter((r: any) =>
          r.latitude !== null && r.latitude !== undefined &&
          r.longitude !== null && r.longitude !== undefined
        )
        .map((r: any) => ({
          id: String(r.id),
          coordinates: [r.longitude, r.latitude] as [number, number],
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
    geoPoints,
    setGeoPoints,
    geoShapes,
    setGeoShapes,
    queryResults,
    loading,
    error,
    setError,
    hasExecutedQuery,
    queryHistory,
    handleQueryExecute,
  };
}
