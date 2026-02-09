'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useMonkDBClient } from '../lib/monkdb-context';
import ConnectionPrompt from '../components/common/ConnectionPrompt';
import RefreshScheduleList from '../components/fts/RefreshScheduleList';

export default function FTSSchedulesPage() {
  const client = useMonkDBClient();

  if (!client) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex items-center gap-4 mb-6">
            <Link
              href="/fts"
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              FTS Refresh Schedules
            </h1>
          </div>
          <ConnectionPrompt
            message="Connect to a database to manage refresh schedules"
            onConnect={() => {}}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/fts"
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              FTS Refresh Schedules
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Manage automatic table refresh schedules for full-text search indexes
            </p>
          </div>
        </div>

        {/* Schedule List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <RefreshScheduleList />
        </div>

        {/* Information Panel */}
        <div className="mt-6 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
            About FTS Table Refresh
          </h3>
          <div className="text-xs text-blue-800 dark:text-blue-200 space-y-2">
            <p>
              MonkDB's full-text search uses an eventually consistent index that requires periodic
              refreshes to reflect new or updated documents.
            </p>
            <p>
              <strong>Manual Refresh:</strong> Run REFRESH TABLE immediately to update the index.
            </p>
            <p>
              <strong>Scheduled Refresh:</strong> Configure automatic refresh intervals (e.g., every
              15 minutes) to keep indexes updated without manual intervention.
            </p>
            <p>
              <strong>Auto-execute:</strong> Enable the "Auto-execute" toggle to automatically run
              scheduled refreshes in the background while this page is open.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
