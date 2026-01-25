'use client';

import { useState } from 'react';
import { Upload, ArrowLeft, FileUp, Download } from 'lucide-react';
import Link from 'next/link';
import DataImportPanel from '../components/timeseries/DataImportPanel';

export default function DataImportPage() {
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
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-600 to-blue-600 shadow-lg">
                  <Upload className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Data Import & Insert
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Import data from CSV, Excel, SQL, and JSON files
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-all text-sm font-medium">
                <Download className="h-4 w-4" />
                Download Template
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-lg transition-all text-sm font-semibold shadow-lg">
                <FileUp className="h-4 w-4" />
                Import Data
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Import Stats */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Imported</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">2.4M</div>
            <div className="text-xs text-green-600 dark:text-green-400 mt-1">↑ Rows added</div>
          </div>
          <div className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-xl p-4 border-2 border-cyan-500 dark:border-cyan-600 shadow-sm">
            <div className="text-sm text-cyan-700 dark:text-cyan-400 mb-1 font-semibold">Today's Imports</div>
            <div className="text-2xl font-bold text-cyan-800 dark:text-cyan-300">156</div>
            <div className="text-xs text-cyan-600 dark:text-cyan-400 mt-1">Files processed</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Success Rate</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">98.4%</div>
            <div className="text-xs text-green-600 dark:text-green-400 mt-1">✓ High quality</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Avg Time</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">3.2s</div>
            <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">Per 1K rows</div>
          </div>
        </div>
      </div>

      {/* Format Guide */}
      <div className="max-w-7xl mx-auto px-6 pb-6">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white shadow-lg">
          <h3 className="text-lg font-bold mb-2">📁 Supported Formats</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
              <div className="font-bold mb-1">CSV Files</div>
              <div className="text-xs opacity-90">Comma-separated values with headers</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
              <div className="font-bold mb-1">Excel Files</div>
              <div className="text-xs opacity-90">.xlsx and .xls spreadsheets</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
              <div className="font-bold mb-1">JSON Files</div>
              <div className="text-xs opacity-90">Array of objects or single records</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
              <div className="font-bold mb-1">SQL Scripts</div>
              <div className="text-xs opacity-90">INSERT statements and queries</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 pb-8">
        <DataImportPanel
          availableTables={[]}
          onFetchSchema={async () => []}
          onImportData={async () => ({ success: 0, errors: 0 })}
          onExecuteSQL={async () => ({})}
        />
      </div>
    </div>
  );
}
