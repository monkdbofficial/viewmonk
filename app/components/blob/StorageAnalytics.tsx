'use client';

import { useState, useEffect } from 'react';
import { X, Database, HardDrive, Star, Trash2, Download, TrendingUp, FileType } from 'lucide-react';
import { useBlobStorage } from '../../lib/blob-context';

interface StorageAnalyticsProps {
  table: string;
  onClose: () => void;
}

export default function StorageAnalytics({ table, onClose }: StorageAnalyticsProps) {
  const { getStorageAnalytics } = useBlobStorage();
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAnalytics = async () => {
      setLoading(true);
      const data = await getStorageAnalytics(table);
      setAnalytics(data);
      setLoading(false);
    };

    loadAnalytics();
  }, [table, getStorageAnalytics]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileTypeCategory = (contentType: string): { icon: string; label: string; color: string } => {
    if (contentType.startsWith('image/')) return { icon: '🖼️', label: 'Images', color: 'bg-blue-500' };
    if (contentType.startsWith('video/')) return { icon: '🎬', label: 'Videos', color: 'bg-blue-500' };
    if (contentType.startsWith('audio/')) return { icon: '🎵', label: 'Audio', color: 'bg-pink-500' };
    if (contentType.includes('pdf')) return { icon: '📄', label: 'PDFs', color: 'bg-red-500' };
    if (contentType.includes('word') || contentType.includes('document')) return { icon: '📝', label: 'Documents', color: 'bg-blue-600' };
    if (contentType.includes('spreadsheet') || contentType.includes('excel')) return { icon: '📊', label: 'Spreadsheets', color: 'bg-green-600' };
    if (contentType.includes('zip') || contentType.includes('compressed')) return { icon: '📦', label: 'Archives', color: 'bg-yellow-600' };
    if (contentType.startsWith('text/')) return { icon: '📋', label: 'Text', color: 'bg-gray-500' };
    return { icon: '📁', label: 'Other', color: 'bg-gray-400' };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-6xl overflow-auto rounded-xl bg-white p-6 shadow-2xl dark:bg-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-6 flex items-center justify-between border-b border-gray-200 pb-4 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-500">
              <Database className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Storage Analytics</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Table: {table}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
          </div>
        ) : analytics ? (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Total Storage */}
              <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-blue-50 to-white p-4 dark:border-gray-700 dark:from-blue-900/20 dark:to-gray-800">
                <div className="mb-2 flex items-center gap-2">
                  <HardDrive className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Storage</span>
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">{formatBytes(analytics.totalSize)}</div>
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {analytics.totalFiles} files
                </div>
              </div>

              {/* Active Files */}
              <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-green-50 to-white p-4 dark:border-gray-700 dark:from-green-900/20 dark:to-gray-800">
                <div className="mb-2 flex items-center gap-2">
                  <Database className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Files</span>
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">{analytics.activeFiles}</div>
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {Math.round((analytics.activeFiles / analytics.totalFiles) * 100)}% of total
                </div>
              </div>

              {/* Favorites */}
              <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-yellow-50 to-white p-4 dark:border-gray-700 dark:from-yellow-900/20 dark:to-gray-800">
                <div className="mb-2 flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Favorites</span>
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">{analytics.favoriteFiles}</div>
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Starred files
                </div>
              </div>

              {/* Trash */}
              <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-red-50 to-white p-4 dark:border-gray-700 dark:from-red-900/20 dark:to-gray-800">
                <div className="mb-2 flex items-center gap-2">
                  <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">In Trash</span>
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">{analytics.trashedFiles}</div>
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Recoverable
                </div>
              </div>
            </div>

            {/* Usage Statistics */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
                  <TrendingUp className="h-5 w-5" />
                  File Size Statistics
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Average Size:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{formatBytes(analytics.avgFileSize)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Largest File:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{formatBytes(analytics.maxFileSize)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Smallest File:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{formatBytes(analytics.minFileSize)}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
                  <Download className="h-5 w-5" />
                  Download Statistics
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Total Downloads:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{analytics.totalDownloads}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Average per File:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{Math.round(analytics.avgDownloads * 10) / 10}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* File Type Breakdown */}
            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
                <FileType className="h-5 w-5" />
                File Type Breakdown
              </h3>
              <div className="space-y-2">
                {analytics.fileTypeBreakdown.map((item: any, index: number) => {
                  const category = getFileTypeCategory(item.contentType);
                  const percentage = Math.round((item.count / analytics.activeFiles) * 100);

                  return (
                    <div key={index} className="rounded-lg border border-gray-100 p-3 dark:border-gray-700">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{category.icon}</span>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">{category.label}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{item.contentType}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-gray-900 dark:text-white">{item.count} files</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{formatBytes(item.totalSize)}</div>
                        </div>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                        <div
                          className={`h-full ${category.color} transition-all duration-300`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="mt-1 text-right text-xs text-gray-600 dark:text-gray-400">{percentage}%</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="py-20 text-center text-gray-500 dark:text-gray-400">
            No analytics data available
          </div>
        )}
      </div>
    </div>
  );
}
