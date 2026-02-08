'use client';

import { FileSearch, Table, Database, Zap, Loader2 } from 'lucide-react';
import { useFTSStats } from '@/app/hooks/useFTSStats';

export default function FTSStatsCards() {
  const stats = useFTSStats();

  const formatNumber = (num: number) => {
    if (num === 0) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const formatTime = (ms: number) => {
    if (ms === 0) return '—';
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const cards = [
    {
      title: 'FTS Indexes',
      value: formatNumber(stats.totalIndexes),
      icon: FileSearch,
      gradient: 'from-blue-500 to-blue-600',
      bgGradient: 'from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30',
    },
    {
      title: 'Searchable Tables',
      value: formatNumber(stats.totalTables),
      icon: Table,
      gradient: 'from-green-500 to-green-600',
      bgGradient: 'from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/30',
    },
    {
      title: 'Documents Indexed',
      value: formatNumber(stats.totalDocuments),
      icon: Database,
      gradient: 'from-purple-500 to-purple-600',
      bgGradient: 'from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/30',
    },
    {
      title: 'Avg Query Time',
      value: formatTime(stats.avgExecutionTime),
      icon: Zap,
      gradient: 'from-orange-500 to-orange-600',
      bgGradient: 'from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/30',
    },
  ];

  if (stats.loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, idx) => (
          <div
            key={idx}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
          >
            <div className="flex items-center justify-center h-20">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className={`bg-gradient-to-br ${card.bgGradient} rounded-lg border border-gray-200 dark:border-gray-700 p-6 relative overflow-hidden`}
          >
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {card.title}
                </span>
                <div className={`p-2 rounded-lg bg-gradient-to-br ${card.gradient}`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {card.value}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
