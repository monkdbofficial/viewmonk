'use client';

import { useState } from 'react';
import { MessageSquare, ArrowLeft, BellRing, Filter } from 'lucide-react';
import Link from 'next/link';
import NotificationCenter from '../components/timeseries/NotificationCenter';

export default function NotificationsPage() {
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
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 shadow-lg relative">
                  <MessageSquare className="h-6 w-6 text-white" />
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">
                    5
                  </span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Notification Center
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    All system and user notifications
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-all text-sm font-medium">
                <Filter className="h-4 w-4" />
                Filter
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition-all text-sm font-semibold shadow-lg">
                <BellRing className="h-4 w-4" />
                Mark All Read
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Stats */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-4 border-2 border-purple-500 dark:border-purple-600 shadow-sm">
            <div className="text-sm text-purple-700 dark:text-purple-400 mb-1 font-semibold">Unread</div>
            <div className="text-2xl font-bold text-purple-800 dark:text-purple-300">5</div>
            <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">Requires attention</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Today</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">23</div>
            <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">New notifications</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">This Week</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">142</div>
            <div className="text-xs text-green-600 dark:text-green-400 mt-1">All processed</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Archived</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">1,847</div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Last 30 days</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 pb-8">
        <NotificationCenter
          notifications={[]}
          onMarkAsRead={() => {}}
          onMarkAllAsRead={() => {}}
          onDelete={() => {}}
          onClearAll={() => {}}
        />
      </div>
    </div>
  );
}
