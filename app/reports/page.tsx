'use client';

import { useState } from 'react';
import { FileText, ArrowLeft, Plus, Calendar } from 'lucide-react';
import Link from 'next/link';
import ScheduledReports from '../components/timeseries/ScheduledReports';

export default function ReportsPage() {
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
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-green-600 to-teal-600 shadow-lg">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Scheduled Reports
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Automated report generation and distribution
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-all text-sm font-medium">
                <Calendar className="h-4 w-4" />
                Schedule
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white rounded-lg transition-all text-sm font-semibold shadow-lg">
                <Plus className="h-4 w-4" />
                New Report
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Report Stats */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Active Reports</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">8</div>
            <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">Scheduled</div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 rounded-xl p-4 border-2 border-green-500 dark:border-green-600 shadow-sm">
            <div className="text-sm text-green-700 dark:text-green-400 mb-1 font-semibold">Sent Today</div>
            <div className="text-2xl font-bold text-green-800 dark:text-green-300">12</div>
            <div className="text-xs text-green-600 dark:text-green-400 mt-1">✓ Delivered</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">This Week</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">67</div>
            <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">Reports generated</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Recipients</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">34</div>
            <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">Team members</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Success Rate</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">99.8%</div>
            <div className="text-xs text-green-600 dark:text-green-400 mt-1">Reliable delivery</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 pb-8">
        <ScheduledReports
          reports={[]}
          onCreateReport={() => {}}
          onUpdateReport={() => {}}
          onDeleteReport={() => {}}
          dashboards={[]}
        />
      </div>
    </div>
  );
}
