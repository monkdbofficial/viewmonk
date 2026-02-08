/**
 * Hook to fetch and calculate full-text search statistics
 */

import { useState, useEffect } from 'react';
import { useMonkDBClient } from '@/app/lib/monkdb-context';
import { useFTSIndexes } from './useFTSIndexes';
import { getQueryStats } from './useQueryHistory';

export interface FTSStats {
  totalIndexes: number;
  totalTables: number;
  totalDocuments: number;
  avgExecutionTime: number;
  loading: boolean;
}

export function useFTSStats(): FTSStats {
  const client = useMonkDBClient();
  const { indexes, loading: indexesLoading } = useFTSIndexes();
  const [stats, setStats] = useState<FTSStats>({
    totalIndexes: 0,
    totalTables: 0,
    totalDocuments: 0,
    avgExecutionTime: 0,
    loading: true,
  });

  useEffect(() => {
    calculateStats();
  }, [indexes, client]);

  const calculateStats = async () => {
    if (indexesLoading) return;

    try {
      // Total indexes
      const totalIndexes = indexes.length;

      // Unique tables with FTS indexes
      const uniqueTables = new Set(indexes.map((idx) => `${idx.schema}.${idx.table}`));
      const totalTables = uniqueTables.size;

      // Total documents across all indexed tables
      const totalDocuments = indexes.reduce(
        (sum, idx) => sum + (idx.documentCount || 0),
        0
      );

      // Get query history stats
      const historyKey = 'monkdb-fts-history';
      let queryStats = { avgExecutionTime: 0 };

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
        totalIndexes,
        totalTables,
        totalDocuments,
        avgExecutionTime: queryStats.avgExecutionTime,
        loading: false,
      });
    } catch (err) {
      console.error('Failed to calculate FTS stats:', err);
      setStats({
        totalIndexes: 0,
        totalTables: 0,
        totalDocuments: 0,
        avgExecutionTime: 0,
        loading: false,
      });
    }
  };

  return stats;
}
