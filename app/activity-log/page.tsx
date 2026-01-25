'use client';

import { useState } from 'react';
import { ScrollText, ArrowLeft, Download, Filter, Search, Calendar } from 'lucide-react';
import Link from 'next/link';
import ActivityLog from '../components/timeseries/ActivityLog';

export default function ActivityLogPage() {
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
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 shadow-lg">
                  <ScrollText className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Activity Log
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Complete audit trail of all dashboard activities
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-all text-sm font-medium">
                <Filter className="h-4 w-4" />
                Filter
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-all text-sm font-semibold shadow-lg">
                <Download className="h-4 w-4" />
                Export Log
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Activities</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">1,247</div>
            <div className="text-xs text-green-600 dark:text-green-400 mt-1">↑ 12% this week</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Active Users</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">23</div>
            <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">8 online now</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Today's Actions</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">156</div>
            <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">Last: 2 min ago</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Retention</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">90 days</div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Compliance ready</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 pb-8">
        <ActivityLog
          activities={[]}
          onClear={() => {}}
        />
      </div>
    </div>
  );
}
