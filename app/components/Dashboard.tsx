'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Database, HardDrive, Table, Activity, AlertCircle, Loader2, LayoutDashboard, CheckCircle, AlertTriangle, RefreshCw, TrendingUp } from 'lucide-react';
import { useDatabaseStats, useClusterHealth, useNodes, useReadWriteRatio } from '../lib/monkdb-hooks';
import { useActiveConnection } from '../lib/monkdb-context';

const PerformanceChart = dynamic(() => import('./charts/PerformanceChart'), { ssr: false });
const CollectionDistribution = dynamic(() => import('./charts/CollectionDistribution'), { ssr: false });
const QueryPerformanceChart = dynamic(() => import('./charts/QueryPerformanceChart'), { ssr: false });
const SavedViews = dynamic(() => import('./SavedViews'), { ssr: false });

export default function Dashboard() {
  const activeConnection = useActiveConnection();
  const { data: dbStats, loading: statsLoading, error: statsError, refetch: refetchStats } = useDatabaseStats();
  const { data: clusterHealth, loading: healthLoading, error: healthError, refetch: refetchHealth } = useClusterHealth();
  const { data: nodes, loading: nodesLoading, error: nodesError, refetch: refetchNodes } = useNodes();
  const { data: readWriteRatio, loading: ratioLoading, error: ratioError, refetch: refetchRatio } = useReadWriteRatio();

  const [autoRefresh, setAutoRefresh] = useState(false); // Disabled by default for testing
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Store refetch functions in refs to avoid recreating interval
  const refetchFunctionsRef = useRef({ refetchStats, refetchHealth, refetchNodes, refetchRatio });

  // Update refs when functions change
  useEffect(() => {
    refetchFunctionsRef.current = { refetchStats, refetchHealth, refetchNodes, refetchRatio };
  }, [refetchStats, refetchHealth, refetchNodes, refetchRatio]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      refetchStats(),
      refetchHealth(),
      refetchNodes(),
      refetchRatio()
    ]);
    setLastRefresh(new Date());
    setIsRefreshing(false);
  };

  // Auto-refresh every 30 seconds (only if enabled)
  useEffect(() => {
    if (!activeConnection || !autoRefresh) return;

    const interval = setInterval(async () => {
      // Use refs to avoid recreating interval when functions change
      await Promise.all([
        refetchFunctionsRef.current.refetchStats(),
        refetchFunctionsRef.current.refetchHealth(),
        refetchFunctionsRef.current.refetchNodes(),
        refetchFunctionsRef.current.refetchRatio()
      ]);
      setLastRefresh(new Date());
    }, 30000);

    return () => clearInterval(interval);
  }, [activeConnection, autoRefresh]);

  // Format bytes to readable size
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 KB';
    const mb = bytes / (1024 * 1024);
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    return `${(mb / 1024).toFixed(2)} GB`;
  };

  // Format uptime
  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  // Stats configuration
  const stats = [
    {
      label: 'Total Tables',
      value: dbStats ? dbStats.totalTables.toString() : '-',
      change: `${dbStats?.totalSchemas || 0} schemas`,
      trend: 'up',
      icon: Table,
      color: 'blue' as const,
      loading: statsLoading,
      error: statsError,
    },
    {
      label: 'Total Storage',
      value: dbStats ? formatBytes(dbStats.totalSize) : '-',
      change: 'Primary shards',
      trend: 'up',
      icon: HardDrive,
      color: 'green' as const,
      loading: statsLoading,
      error: statsError,
    },
    {
      label: 'Cluster Nodes',
      value: clusterHealth ? clusterHealth.nodeCount.toString() : '-',
      change: clusterHealth
        ? `${clusterHealth.healthyNodes} healthy`
        : 'Checking...',
      trend: clusterHealth && clusterHealth.healthyNodes === clusterHealth.nodeCount ? 'up' : 'down',
      icon: Database,
      color: 'purple' as const,
      loading: healthLoading,
      error: healthError,
    },
    {
      label: 'Cluster Uptime',
      value: clusterHealth ? formatUptime(clusterHealth.clusterUptime) : '-',
      change: 'Min node uptime',
      trend: 'up',
      icon: Activity,
      color: 'orange' as const,
      loading: healthLoading,
      error: healthError,
    },
    {
      label: 'Read/Write Ratio',
      value: readWriteRatio ? readWriteRatio.ratio : '-',
      change: readWriteRatio
        ? `${readWriteRatio.readOps} reads, ${readWriteRatio.writeOps} writes`
        : 'Last hour',
      trend: 'up',
      icon: TrendingUp,
      color: 'indigo' as const,
      loading: ratioLoading,
      error: ratioError,
    },
  ];

  // Show no connection state
  if (!activeConnection) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="max-w-md rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/50 p-12 text-center dark:border-gray-700 dark:bg-gray-800/50">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
            <Database className="h-10 w-10 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="mt-6 text-xl font-bold text-gray-900 dark:text-white">
            No Active Connection
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Please connect to a MonkDB database to view the dashboard.
          </p>
          <a
            href="/connections"
            className="mt-6 inline-block rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            Manage Connections
          </a>
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
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <LayoutDashboard className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Dashboard
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Overview of {activeConnection.name} cluster
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Last Refresh */}
            {lastRefresh && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Last: {lastRefresh.toLocaleTimeString()}
              </span>
            )}
            {/* Auto-Refresh Toggle */}
            <label className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-800">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Auto-Refresh (30s)
              </span>
            </label>
            {/* Manual Refresh Button */}
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing || statsLoading || healthLoading || nodesLoading}
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
          {/* Setup Instructions */}
          <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-blue-900 dark:text-blue-300">
              <AlertTriangle className="h-4 w-4" />
              Dashboard Overview
            </h3>
            <div className="space-y-2 text-xs text-blue-800 dark:text-blue-200">
              <p><strong>This dashboard provides a comprehensive overview of your MonkDB cluster:</strong></p>
              <ul className="ml-4 list-disc space-y-1">
                <li><strong>Statistics</strong> - Total tables, storage, cluster nodes, and uptime from <code className="rounded bg-blue-100 px-1 dark:bg-blue-900">sys.shards</code> and <code className="rounded bg-blue-100 px-1 dark:bg-blue-900">sys.cluster</code></li>
                <li><strong>Cluster Nodes</strong> - Real-time node health, heap usage, and disk usage from <code className="rounded bg-blue-100 px-1 dark:bg-blue-900">sys.nodes</code></li>
                <li><strong>Performance Metrics</strong> - Query performance and system resource trends</li>
                <li><strong>Schema Distribution</strong> - Table and data distribution across schemas</li>
                <li><strong>Auto-Refresh</strong> is available - toggle ON for automatic data updates every 30 seconds</li>
                <li>Use the <strong>Refresh</strong> button for manual updates anytime</li>
              </ul>
              <p className="mt-2 border-t border-blue-300 pt-2 dark:border-blue-700">
                <strong>Note:</strong> All data is live from your MonkDB cluster and updates in real-time.
              </p>
            </div>
          </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const colorClasses = {
            blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
            green: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
            purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
            orange: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
            indigo: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
          };

          return (
            <div
              key={index}
              className="group rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-lg dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    {stat.label}
                  </p>
                  {stat.loading ? (
                    <div className="mt-2 flex items-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                      <span className="text-xs text-gray-500">Loading...</span>
                    </div>
                  ) : stat.error ? (
                    <div className="mt-2 flex items-center gap-2 text-red-600 dark:text-red-400">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-xs">Error</span>
                    </div>
                  ) : (
                    <>
                      <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                        {stat.value}
                      </p>
                      <p
                        className={`mt-2 flex items-center text-xs ${
                          stat.trend === 'down'
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-green-600 dark:text-green-400'
                        }`}
                      >
                        {stat.change}
                      </p>
                    </>
                  )}
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${colorClasses[stat.color]}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Nodes Status */}
      {nodes && nodes.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
            Cluster Nodes
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="pb-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    Node Name
                  </th>
                  <th className="pb-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    Hostname
                  </th>
                  <th className="pb-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    Uptime
                  </th>
                  <th className="pb-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    Heap Usage
                  </th>
                  <th className="pb-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    FS Usage
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {nodes.map((node, idx) => {
                  const heapPercent = node.heap_max
                    ? ((node.heap_used || 0) / node.heap_max) * 100
                    : 0;
                  const fsPercent = node.fs_total
                    ? ((node.fs_used || 0) / node.fs_total) * 100
                    : 0;

                  return (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="py-3 text-sm font-medium text-gray-900 dark:text-white">
                        {node.name}
                      </td>
                      <td className="py-3 text-sm text-gray-700 dark:text-gray-300">
                        {node.hostname || '-'}
                      </td>
                      <td className="py-3 text-sm text-gray-700 dark:text-gray-300">
                        {formatUptime(node.uptime)}
                      </td>
                      <td className="py-3 text-sm text-gray-700 dark:text-gray-300">
                        {node.heap_used && node.heap_max ? (
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                              <div
                                className={`h-full ${
                                  heapPercent > 80
                                    ? 'bg-red-500'
                                    : heapPercent > 60
                                    ? 'bg-yellow-500'
                                    : 'bg-green-500'
                                }`}
                                style={{ width: `${heapPercent}%` }}
                              />
                            </div>
                            <span className="text-xs">{heapPercent.toFixed(1)}%</span>
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-3 text-sm text-gray-700 dark:text-gray-300">
                        {node.fs_used && node.fs_total ? (
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                              <div
                                className={`h-full ${
                                  fsPercent > 80
                                    ? 'bg-red-500'
                                    : fsPercent > 60
                                    ? 'bg-yellow-500'
                                    : 'bg-green-500'
                                }`}
                                style={{ width: `${fsPercent}%` }}
                              />
                            </div>
                            <span className="text-xs">{fsPercent.toFixed(1)}%</span>
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
            Performance Metrics
          </h3>
          <PerformanceChart />
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
            Schema Distribution
          </h3>
          <CollectionDistribution />
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
          Query Performance
        </h3>
        <QueryPerformanceChart />
      </div>

      {/* Recent Activity - Saved Views */}
      <SavedViews />
        </div>
      </div>
    </div>
  );
}
