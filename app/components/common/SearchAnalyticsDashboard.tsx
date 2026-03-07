'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, Search, Clock, BarChart3 } from 'lucide-react';
import { getQueryStats } from '@/app/hooks/useQueryHistory';

interface AnalyticsData {
  searchVolume: Array<{ time: string; count: number }>;
  popularQueries: Array<{ query: string; count: number }>;
  avgResponseTimes: Array<{ time: string; avgTime: number }>;
  successRate: number;
  topCollections: Array<{ collection: string; searches: number }>;
}

interface SearchAnalyticsDashboardProps {
  feature: 'vector' | 'fts' | 'hybrid';
}

export default function SearchAnalyticsDashboard({ feature }: SearchAnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    searchVolume: [],
    popularQueries: [],
    avgResponseTimes: [],
    successRate: 0,
    topCollections: [],
  });

  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');

  useEffect(() => {
    loadAnalytics();
  }, [feature, timeRange]);

  const loadAnalytics = () => {
    if (typeof window === 'undefined') return;

    try {
      const storageKey = `monkdb-${feature}-history`;
      const stored = localStorage.getItem(storageKey);

      if (!stored) {
        return;
      }

      const history = JSON.parse(stored);

      // Filter by time range
      const now = Date.now();
      const timeRangeMs = timeRange === '24h' ? 86400000 : timeRange === '7d' ? 604800000 : 2592000000;
      const filteredHistory = history.filter(
        (item: any) => now - item.timestamp < timeRangeMs
      );

      // Calculate search volume over time
      const searchVolume = calculateSearchVolume(filteredHistory, timeRange);

      // Find popular queries
      const queryMap = new Map<string, number>();
      filteredHistory.forEach((item: any) => {
        const query = item.params.query;
        queryMap.set(query, (queryMap.get(query) || 0) + 1);
      });

      const popularQueries = Array.from(queryMap.entries())
        .map(([query, count]) => ({ query, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Calculate avg response times over time
      const avgResponseTimes = calculateAvgResponseTimes(filteredHistory, timeRange);

      // Calculate success rate (queries with results > 0)
      const successfulQueries = filteredHistory.filter((item: any) => item.resultCount > 0).length;
      const successRate = filteredHistory.length > 0
        ? (successfulQueries / filteredHistory.length) * 100
        : 0;

      // Find top collections/tables
      const collectionMap = new Map<string, number>();
      filteredHistory.forEach((item: any) => {
        const collection = item.params.collection || `${item.params.schema}.${item.params.table}`;
        if (collection) {
          collectionMap.set(collection, (collectionMap.get(collection) || 0) + 1);
        }
      });

      const topCollections = Array.from(collectionMap.entries())
        .map(([collection, searches]) => ({ collection, searches }))
        .sort((a, b) => b.searches - a.searches)
        .slice(0, 5);

      setAnalytics({
        searchVolume,
        popularQueries,
        avgResponseTimes,
        successRate,
        topCollections,
      });
    } catch {
    }
  };

  const calculateSearchVolume = (history: any[], range: string) => {
    const buckets = range === '24h' ? 24 : range === '7d' ? 7 : 30;
    const bucketSize = range === '24h' ? 3600000 : range === '7d' ? 86400000 : 86400000;

    const volumeMap = new Map<number, number>();

    history.forEach((item: any) => {
      const bucketIndex = Math.floor(item.timestamp / bucketSize);
      volumeMap.set(bucketIndex, (volumeMap.get(bucketIndex) || 0) + 1);
    });

    const result = [];
    const now = Date.now();

    for (let i = 0; i < buckets; i++) {
      const bucketStart = now - (buckets - i) * bucketSize;
      const bucketIndex = Math.floor(bucketStart / bucketSize);
      const count = volumeMap.get(bucketIndex) || 0;

      const label = range === '24h'
        ? `${i}h ago`
        : `${buckets - i}d ago`;

      result.push({ time: label, count });
    }

    return result;
  };

  const calculateAvgResponseTimes = (history: any[], range: string) => {
    const buckets = range === '24h' ? 24 : range === '7d' ? 7 : 30;
    const bucketSize = range === '24h' ? 3600000 : range === '7d' ? 86400000 : 86400000;

    const timeMap = new Map<number, { total: number; count: number }>();

    history.forEach((item: any) => {
      const bucketIndex = Math.floor(item.timestamp / bucketSize);
      const current = timeMap.get(bucketIndex) || { total: 0, count: 0 };
      current.total += item.executionTime;
      current.count += 1;
      timeMap.set(bucketIndex, current);
    });

    const result = [];
    const now = Date.now();

    for (let i = 0; i < buckets; i++) {
      const bucketStart = now - (buckets - i) * bucketSize;
      const bucketIndex = Math.floor(bucketStart / bucketSize);
      const data = timeMap.get(bucketIndex);
      const avgTime = data ? data.total / data.count : 0;

      const label = range === '24h'
        ? `${i}h`
        : `${buckets - i}d`;

      result.push({ time: label, avgTime });
    }

    return result;
  };

  const maxVolume = Math.max(...analytics.searchVolume.map(v => v.count), 1);
  const maxTime = Math.max(...analytics.avgResponseTimes.map(t => t.avgTime), 1);

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Search Analytics
        </h2>
        <div className="flex gap-2">
          {(['24h', '7d', '30d'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                timeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Search className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
              Total Searches
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {analytics.searchVolume.reduce((sum, v) => sum + v.count, 0)}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-green-600" />
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
              Avg Response Time
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {Math.round(
              analytics.avgResponseTimes.reduce((sum, t) => sum + t.avgTime, 0) /
                (analytics.avgResponseTimes.length || 1)
            )}
            ms
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-purple-600" />
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
              Success Rate
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {analytics.successRate.toFixed(1)}%
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-orange-600" />
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
              Unique Queries
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {analytics.popularQueries.length}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Search Volume Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Search Volume
          </h3>
          <div className="space-y-2">
            {analytics.searchVolume.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-xs text-gray-600 dark:text-gray-400 w-16">
                  {item.time}
                </span>
                <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all"
                    style={{ width: `${(item.count / maxVolume) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-900 dark:text-gray-100 w-8 text-right">
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Response Time Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Avg Response Time
          </h3>
          <div className="space-y-2">
            {analytics.avgResponseTimes.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-xs text-gray-600 dark:text-gray-400 w-16">
                  {item.time}
                </span>
                <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all"
                    style={{ width: `${(item.avgTime / maxTime) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-900 dark:text-gray-100 w-12 text-right">
                  {Math.round(item.avgTime)}ms
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Popular Queries */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Popular Queries
          </h3>
          {analytics.popularQueries.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No queries yet</p>
          ) : (
            <div className="space-y-2">
              {analytics.popularQueries.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded"
                >
                  <span className="text-sm text-gray-900 dark:text-gray-100 truncate flex-1">
                    {item.query}
                  </span>
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400 ml-2">
                    {item.count}x
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Collections */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Top Collections/Tables
          </h3>
          {analytics.topCollections.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No data yet</p>
          ) : (
            <div className="space-y-2">
              {analytics.topCollections.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded"
                >
                  <span className="text-sm text-gray-900 dark:text-gray-100 truncate flex-1">
                    {item.collection}
                  </span>
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400 ml-2">
                    {item.searches} searches
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
