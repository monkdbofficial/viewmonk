'use client';

import { TrendingUp } from 'lucide-react';

export default function TimeSeriesPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-8 py-16">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600">
            <TrendingUp className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Time Series</h1>
        </div>
        <p className="mt-4 text-gray-500 dark:text-gray-400">Coming soon.</p>
      </div>
    </div>
  );
}
