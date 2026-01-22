'use client';

import { Settings, Upload, Database, BarChart3, ArrowRight, CheckCircle } from 'lucide-react';

interface OnboardingGuideProps {
  onConfigure: () => void;
  onImport: () => void;
}

export default function OnboardingGuide({ onConfigure, onImport }: OnboardingGuideProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-900/20">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 mb-4">
            <BarChart3 className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome to Time-Series Analytics
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Let's get you started with powerful time-series data visualization and analysis
          </p>
        </div>

        {/* Getting Started Steps */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Option 1: Configure Existing Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-blue-200 dark:border-blue-800 p-6 hover:border-blue-400 dark:hover:border-blue-600 transition-all hover:shadow-lg group">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Settings className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Connect Existing Data
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Already have time-series data in your database? Select your table and start analyzing immediately.
                </p>
              </div>
            </div>

            <div className="space-y-2 mb-6">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Select Schema & Table</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Browse your database and choose any table</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Auto-Detect Columns</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">System finds timestamp and metric columns</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Start Analyzing</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Instant charts, aggregations, and insights</p>
                </div>
              </div>
            </div>

            <button
              onClick={onConfigure}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              <Settings className="w-5 h-5" />
              Configure Data Source
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          {/* Option 2: Import Data */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-purple-200 dark:border-purple-800 p-6 hover:border-purple-400 dark:hover:border-purple-600 transition-all hover:shadow-lg group">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Upload className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Import Your Data
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Upload CSV or JSON files. We'll create the table and import your data automatically.
                </p>
              </div>
            </div>

            <div className="space-y-2 mb-6">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Upload CSV/JSON</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Drag & drop or select files from your computer</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Auto-Create Table</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">System detects types and creates schema</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Batch Import</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Efficiently imports thousands of rows</p>
                </div>
              </div>
            </div>

            <button
              onClick={onImport}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
            >
              <Upload className="w-5 h-5" />
              Import Data File
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Additional Features */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            What You Can Do After Setup
          </h3>

          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <div className="text-2xl mb-2">📊</div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-1">Create Dashboards</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Build custom dashboards with 7 chart types - line, bar, area, pie, scatter, gauge, and tables
              </p>
            </div>

            <div>
              <div className="text-2xl mb-2">🔍</div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-1">Analyze Trends</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Use aggregations (AVG, SUM, MIN, MAX), anomaly detection, and time-series analysis
              </p>
            </div>

            <div>
              <div className="text-2xl mb-2">📤</div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-1">Export Results</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Export your data and insights in CSV, JSON, Excel, or SQL format for sharing
              </p>
            </div>
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Need help? Click the <strong className="text-blue-600 dark:text-blue-400">SQL Guide</strong> button for examples and best practices
          </p>
        </div>
      </div>
    </div>
  );
}
