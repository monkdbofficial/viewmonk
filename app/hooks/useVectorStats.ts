/**
 * Hook to fetch and calculate vector operations statistics
 */

import { useState, useEffect } from 'react';
import { useMonkDBClient } from '@/app/lib/monkdb-context';
import { useVectorCollections } from './useVectorCollections';
import { getQueryStats } from './useQueryHistory';

export interface VectorStats {
  totalCollections: number;
  totalDocuments: number;
  recentSearches: number;
  avgExecutionTime: number;
  loading: boolean;
}

export function useVectorStats(): VectorStats {
  const client = useMonkDBClient();
  const { collections, loading: collectionsLoading } = useVectorCollections();
  const [stats, setStats] = useState<VectorStats>({
    totalCollections: 0,
    totalDocuments: 0,
    recentSearches: 0,
    avgExecutionTime: 0,
    loading: true,
  });

  useEffect(() => {
    calculateStats();
  }, [collections, client]);

  const calculateStats = async () => {
    if (collectionsLoading) return;

    try {
      // Total collections
      const totalCollections = collections.length;

      // Total documents across all collections
      const totalDocuments = collections.reduce(
        (sum, col) => sum + (col.documentCount || 0),
        0
      );

      // Get query history stats
      const historyKey = 'monkdb-vector-history';
      let queryStats = { last24Hours: 0, avgExecutionTime: 0 };

      if (typeof window !== 'undefined') {
        try {
          const stored = localStorage.getItem(historyKey);
          if (stored) {
            const history = JSON.parse(stored);
            queryStats = getQueryStats(history);
          }
        } catch (err) {
          console.error('Failed to load query stats:', err);
        }
      }

      setStats({
        totalCollections,
        totalDocuments,
        recentSearches: queryStats.last24Hours,
        avgExecutionTime: queryStats.avgExecutionTime,
        loading: false,
      });
    } catch (err) {
      console.error('Failed to calculate vector stats:', err);
      setStats({
        totalCollections: 0,
        totalDocuments: 0,
        recentSearches: 0,
        avgExecutionTime: 0,
        loading: false,
      });
    }
  };

  return stats;
}
