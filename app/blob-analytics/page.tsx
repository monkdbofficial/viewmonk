'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  BarChart3,
  HardDrive,
  FileText,
  Users,
  Trash2,
  Download,
  Upload,
  Star,
  Clock,
  Database,
  ArrowLeft,
  Activity,
  Loader2,
  AlertCircle,
  TrendingUp,
  RefreshCw,
  PieChart,
  TrendingDown,
} from 'lucide-react';
import { useBlobStorage } from '../lib/blob-context';
import QuotaMonitoringDialog from '../components/blob/QuotaMonitoringDialog';
import AuditLogViewer from '../components/blob/AuditLogViewer';

const BlobFileTypeChart = dynamic(() => import('../components/charts/BlobFileTypeChart'), { ssr: false });
const BlobStorageTrendsChart = dynamic(() => import('../components/charts/BlobStorageTrendsChart'), { ssr: false });
const BlobActivityChart = dynamic(() => import('../components/charts/BlobActivityChart'), { ssr: false });

export default function BlobAnalyticsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const table = searchParams.get('table');
  const { getStorageAnalytics } = useBlobStorage();

  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showQuotaDialog, setShowQuotaDialog] = useState(false);
  const [showAuditDialog, setShowAuditDialog] = useState(false);

  const loadAnalytics = async () => {
    if (!table) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getStorageAnalytics(table);
      setAnalytics(data);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('[Analytics] Failed to load:', error);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [table, getStorageAnalytics]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadAnalytics();
    setIsRefreshing(false);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const getFileTypeColor = (type: string) => {
    if (type.startsWith('image/')) return 'bg-blue-500';
    if (type.startsWith('video/')) return 'bg-purple-500';
    if (type.startsWith('audio/')) return 'bg-pink-500';
    if (type.includes('pdf')) return 'bg-red-500';
    if (type.includes('text')) return 'bg-green-500';
    return 'bg-gray-500';
  };

  const getFileTypeIcon = (type: string) => {
    if (type.startsWith('image/')) return '🖼️';
    if (type.startsWith('video/')) return '🎥';
    if (type.startsWith('audio/')) return '🎵';
    if (type.includes('pdf')) return '📄';
    if (type.includes('text')) return '📝';
    return '📁';
  };

  if (!table) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="max-w-md rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/50 p-12 text-center dark:border-gray-700 dark:bg-gray-800/50">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
            <Database className="h-10 w-10 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="mt-6 text-xl font-bold text-gray-900 dark:text-white">
            No Table Selected
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Please select a blob table to view analytics
          </p>
          <button
            onClick={() => router.push('/blob-storage')}
            className="mt-6 inline-block rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            Go to Blob Storage
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Fixed Header */}
      <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-6 py-4 dark:border-gray-700 dark:from-gray-800 dark:to-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/blob-storage')}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
            >
              <ArrowLeft className="h-5 w-5 text-gray-700 dark:text-gray-300" />
            </button>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <BarChart3 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Storage Analytics
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Comprehensive insights for <span className="font-mono font-semibold">{table}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {lastRefresh && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Last: {lastRefresh.toLocaleTimeString()}
              </span>
            )}

            <button
              onClick={() => setShowQuotaDialog(true)}
              className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              title="Storage Quota"
            >
              <HardDrive className="h-4 w-4" />
              Quota
            </button>

            <button
              onClick={() => setShowAuditDialog(true)}
              className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              title="Audit Log"
            >
              <FileText className="h-4 w-4" />
              Audit
            </button>

            <button
              onClick={handleRefresh}
              disabled={isRefreshing || loading}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-auto">
        <div className="space-y-4 p-4">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="text-center">
                <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-600 dark:text-blue-400" />
                <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">Loading analytics...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex h-64 items-center justify-center">
              <div className="text-center">
                <AlertCircle className="mx-auto h-12 w-12 text-red-600 dark:text-red-400" />
                <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
                <button
                  onClick={handleRefresh}
                  className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Key Metrics Cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Total Storage */}
                <div className="group rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-lg dark:border-gray-700 dark:bg-gray-800">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Total Storage</p>
                      <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                        {formatBytes(analytics?.totalSize || 0)}
                      </p>
                      <p className="mt-2 flex items-center text-xs text-green-600 dark:text-green-400">
                        <TrendingUp className="mr-1 h-3 w-3" />
                        {analytics?.totalFiles || 0} total files
                      </p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                      <HardDrive className="h-5 w-5" />
                    </div>
                  </div>
                </div>

                {/* Active Files */}
                <div className="group rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-lg dark:border-gray-700 dark:bg-gray-800">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Active Files</p>
                      <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                        {analytics?.activeFiles || 0}
                      </p>
                      <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                        {analytics?.recentUploads || 0} recent uploads
                      </p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                      <FileText className="h-5 w-5" />
                    </div>
                  </div>
                </div>

                {/* Favorites */}
                <div className="group rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-lg dark:border-gray-700 dark:bg-gray-800">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Favorites</p>
                      <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                        {analytics?.favoriteCount || 0}
                      </p>
                      <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                        {((analytics?.favoriteCount / analytics?.totalFiles) * 100 || 0).toFixed(1)}% of files
                      </p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400">
                      <Star className="h-5 w-5" />
                    </div>
                  </div>
                </div>

                {/* Trash */}
                <div className="group rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-lg dark:border-gray-700 dark:bg-gray-800">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400">In Trash</p>
                      <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                        {analytics?.trashedFiles || 0}
                      </p>
                      <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                        {formatBytes(analytics?.trashedSize || 0)} recoverable
                      </p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                      <Trash2 className="h-5 w-5" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Charts Section */}
              <div className="grid gap-4 lg:grid-cols-2">
                {/* File Type Distribution Chart */}
                <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                  <div className="mb-3 flex items-center gap-2">
                    <PieChart className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                      File Type Distribution
                    </h3>
                  </div>
                  {analytics?.fileTypeBreakdown && analytics.fileTypeBreakdown.length > 0 ? (
                    <BlobFileTypeChart data={analytics.fileTypeBreakdown} />
                  ) : (
                    <div className="flex h-[300px] items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                      No file type data available
                    </div>
                  )}
                </div>

                {/* Storage Trends Chart */}
                <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                  <div className="mb-3 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                      Storage Overview
                    </h3>
                  </div>
                  <BlobStorageTrendsChart
                    totalSize={analytics?.totalSize || 0}
                    activeFiles={analytics?.activeFiles || 0}
                    trashedSize={analytics?.trashedSize || 0}
                    totalFiles={analytics?.totalFiles || 0}
                  />
                </div>
              </div>

              {/* Activity Chart - Full Width */}
              <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <div className="mb-3 flex items-center gap-2">
                  <Activity className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Activity Metrics
                  </h3>
                </div>
                <BlobActivityChart
                  recentUploads={analytics?.recentUploads || 0}
                  totalDownloads={analytics?.totalDownloads || 0}
                  activeUsers={analytics?.activeUsers || 0}
                  favoriteCount={analytics?.favoriteCount || 0}
                />
              </div>

              {/* Additional Info - Two Column */}
              <div className="grid gap-4 lg:grid-cols-2">

                {/* Largest Files */}
                <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                  <div className="mb-3 flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                      Largest Files
                    </h3>
                  </div>

                  <div className="space-y-2">
                    {analytics?.largestFiles?.slice(0, 6).map((file: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-lg border border-gray-200 p-2 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700/50"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded bg-gray-100 dark:bg-gray-700">
                            <FileText className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium text-gray-900 dark:text-white">
                              {file.filename}
                            </p>
                            <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                              {file.content_type}
                            </p>
                          </div>
                        </div>
                        <div className="ml-2 text-right flex-shrink-0">
                          <p className="text-xs font-semibold text-gray-900 dark:text-white">
                            {formatBytes(file.file_size)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Activity Timeline */}
                <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                  <div className="mb-3 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                      Recent Activity
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {analytics?.recentActivity?.slice(0, 6).map((activity: any, idx: number) => (
                      <div key={idx} className="flex gap-2">
                        <div className="flex flex-col items-center flex-shrink-0">
                          <div className="rounded-full bg-green-100 p-1.5 dark:bg-green-900/30">
                            <Upload className="h-3 w-3 text-green-600 dark:text-green-400" />
                          </div>
                          {idx < 5 && (
                            <div className="h-full w-px bg-gray-200 dark:bg-gray-700" style={{ minHeight: '20px' }} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 pb-3">
                          <p className="truncate text-xs font-medium text-gray-900 dark:text-white">
                            {activity.filename}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(activity.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Quota Monitoring Dialog */}
      {showQuotaDialog && (
        <QuotaMonitoringDialog onClose={() => setShowQuotaDialog(false)} />
      )}

      {/* Audit Log Viewer */}
      {showAuditDialog && (
        <AuditLogViewer onClose={() => setShowAuditDialog(false)} />
      )}
    </div>
  );
}
