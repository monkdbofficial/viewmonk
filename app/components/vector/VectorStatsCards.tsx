'use client';

import { Database, FileText, Search, TrendingUp } from 'lucide-react';
import { useVectorStats } from '@/app/hooks/useVectorStats';

export default function VectorStatsCards() {
  const stats = useVectorStats();

  const formatNumber = (num: number) => {
    if (num === 0) return '0';
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const formatTime = (ms: number) => {
    if (ms === 0) return '—';
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const items = [
    { label: 'Collections', value: formatNumber(stats.totalCollections), icon: Database },
    { label: 'Documents', value: formatNumber(stats.totalDocuments), icon: FileText },
    { label: 'Searches (24h)', value: stats.recentSearches.toString(), icon: Search },
    { label: 'Avg Query Time', value: formatTime(stats.avgExecutionTime), icon: TrendingUp },
  ];

  return (
    <div className="flex items-stretch border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      {items.map((item, idx) => {
        const Icon = item.icon;
        return (
          <div
            key={idx}
            className={`flex items-center gap-3 px-5 py-2.5 ${
              idx > 0 ? 'border-l border-gray-200 dark:border-gray-700' : ''
            }`}
          >
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-gray-100 dark:bg-gray-700">
              <Icon className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
            </div>
            <div>
              {stats.loading ? (
                <div className="h-4 w-10 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              ) : (
                <p className="text-sm font-bold text-gray-900 dark:text-white">{item.value}</p>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400">{item.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
