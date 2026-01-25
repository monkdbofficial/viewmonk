'use client';

import { useState } from 'react';
import { Bell, ArrowLeft, Plus, Settings } from 'lucide-react';
import Link from 'next/link';
import AlertMonitor from '../components/timeseries/AlertMonitor';

export default function AlertsPage() {
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
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-red-600 to-orange-600 shadow-lg">
                  <Bell className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Alert Monitor
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Real-time alerting and threshold monitoring
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-all text-sm font-medium">
                <Settings className="h-4 w-4" />
                Configure
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white rounded-lg transition-all text-sm font-semibold shadow-lg">
                <Plus className="h-4 w-4" />
                New Alert
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Alert Stats */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Active Alerts</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">12</div>
            <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">Monitoring</div>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-xl p-4 border-2 border-red-500 dark:border-red-600 shadow-sm">
            <div className="text-sm text-red-700 dark:text-red-400 mb-1 font-semibold">Critical</div>
            <div className="text-2xl font-bold text-red-800 dark:text-red-300">3</div>
            <div className="text-xs text-red-600 dark:text-red-400 mt-1">⚠️ Attention needed</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Warnings</div>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">7</div>
            <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">Under review</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Resolved Today</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">18</div>
            <div className="text-xs text-green-600 dark:text-green-400 mt-1">✓ All good</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Response Time</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">4.2m</div>
            <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">↓ 15% faster</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 pb-8">
        <AlertMonitor
          visualizations={[]}
          onCreateAlert={() => {}}
          alerts={[]}
          onUpdateAlert={() => {}}
          onDeleteAlert={() => {}}
        />
      </div>
    </div>
  );
}
