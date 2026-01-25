'use client';

import { useState } from 'react';
import { Zap, ArrowLeft, TrendingUp, Download } from 'lucide-react';
import Link from 'next/link';
import PerformanceMonitor from '../components/timeseries/PerformanceMonitor';

export default function PerformancePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/timeseries"
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-all"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="text-sm font-medium">Back to Dashboard</span>
              </Link>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-600 to-orange-600 shadow-lg">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Performance Monitor
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Query performance and optimization insights
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-all text-sm font-medium">
                <TrendingUp className="h-4 w-4" />
                Analyze
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white rounded-lg transition-all text-sm font-semibold shadow-lg">
                <Download className="h-4 w-4" />
                Export Report
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Avg Query Time</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">142ms</div>
            <div className="text-xs text-green-600 dark:text-green-400 mt-1">↓ 23% faster</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Slow Queries</div>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">8</div>
            <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">&gt; 1 second</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Cache Hit Rate</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">94.2%</div>
            <div className="text-xs text-green-600 dark:text-green-400 mt-1">✓ Excellent</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Data Volume</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">2.4M</div>
            <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">rows scanned</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 pb-8">
        <PerformanceMonitor
          metrics={[]}
          onClear={() => {}}
        />
      </div>
    </div>
  );
}
