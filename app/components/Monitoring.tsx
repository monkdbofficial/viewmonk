'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Activity, Database, HardDrive, Cpu, Loader2, AlertCircle, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { useNodes, useClusterHealth, useDatabaseStats } from '../lib/monkdb-hooks';
import { useActiveConnection } from '../lib/monkdb-context';

const SystemMetricsChart = dynamic(() => import('./charts/SystemMetricsChart'), { ssr: false });

export default function Monitoring() {
  const activeConnection = useActiveConnection();
  const { data: nodes, loading: nodesLoading, error: nodesError, refetch: refetchNodes } = useNodes();
  const { data: clusterHealth, loading: healthLoading, error: healthError, refetch: refetchHealth } = useClusterHealth();
  const { data: dbStats, refetch: refetchDbStats } = useDatabaseStats();

  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      refetchNodes(),
      refetchHealth(),
      refetchDbStats()
    ]);
    setLastRefresh(new Date());
    setIsRefreshing(false);
  };

  // Auto-refresh every 5 seconds (only if enabled)
  useEffect(() => {
    if (!activeConnection || !autoRefresh) return;

    const interval = setInterval(async () => {
      await Promise.all([
        refetchNodes(),
        refetchHealth(),
        refetchDbStats()
      ]);
      setLastRefresh(new Date());
    }, 5000);

    return () => clearInterval(interval);
  }, [activeConnection, autoRefresh, refetchNodes, refetchHealth, refetchDbStats]);

  if (!activeConnection) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">No Active Connection</h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Please connect to a MonkDB instance to view monitoring data.
          </p>
        </div>
      </div>
    );
  }

  if (nodesLoading || healthLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (nodesError || healthError) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">Error Loading Monitoring Data</h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {nodesError || healthError}
          </p>
        </div>
      </div>
    );
  }

  const formatBytes = (bytes?: number) => {
    if (!bytes || bytes === 0) return '0 GB';
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(1)} GB`;
  };

  const formatHeapPercent = (used?: number, max?: number) => {
    if (!max || max === 0 || !used) return '0%';
    const percent = (used / max) * 100;
    return `${percent.toFixed(1)}%`;
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Fixed Header */}
      <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-6 py-4 dark:border-gray-700 dark:from-gray-800 dark:to-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
              <Activity className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Monitoring
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Real-time cluster and node monitoring with live metrics
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
                Auto-Refresh (5s)
              </span>
            </label>
            {/* Manual Refresh Button */}
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50 dark:bg-green-500 dark:hover:bg-green-600"
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
              Monitoring Data Sources
            </h3>
            <div className="space-y-2 text-xs text-blue-800 dark:text-blue-200">
              <p><strong>This page displays live data from MonkDB system tables:</strong></p>
              <ul className="ml-4 list-disc space-y-1">
                <li><code className="rounded bg-blue-100 px-1 dark:bg-blue-900">sys.nodes</code> - Cluster node information and metrics</li>
                <li><code className="rounded bg-blue-100 px-1 dark:bg-blue-900">sys.cluster</code> - Cluster health and state</li>
                <li><code className="rounded bg-blue-100 px-1 dark:bg-blue-900">sys.shards</code> - Shard and storage statistics</li>
                <li>Metrics include: heap usage, disk space, uptime, node count</li>
                <li>Enable <strong>Auto-Refresh</strong> checkbox to update data every 5 seconds</li>
                <li>Use the <strong>Refresh</strong> button for manual updates</li>
              </ul>
              <p className="mt-2 border-t border-blue-300 pt-2 dark:border-blue-700">
                <strong>Note:</strong> All metrics are queried directly from your connected MonkDB cluster.
              </p>
            </div>
          </div>

      {/* Cluster Health Overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Cluster Nodes</p>
              <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{clusterHealth?.nodeCount || 0}</p>
            </div>
            <Database className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            sys.nodes
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Total Storage</p>
              <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                {formatBytes(dbStats?.totalSize || 0)}
              </p>
            </div>
            <HardDrive className="h-8 w-8 text-purple-600 dark:text-purple-400" />
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            sys.shards
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Cluster Uptime</p>
              <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                {formatUptime(clusterHealth?.clusterUptime || 0)}
              </p>
            </div>
            <Cpu className="h-8 w-8 text-orange-600 dark:text-orange-400" />
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Minimum node uptime
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Nodes Online</p>
              <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                {nodes?.length || 0}/{clusterHealth?.nodeCount || 0}
              </p>
            </div>
            <Activity className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Active nodes
          </p>
        </div>
      </div>

      {/* Node Metrics Table */}
      <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Node-Specific Metrics</h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Live data from sys.nodes {autoRefresh && '(refreshing every 5 seconds)'}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-700 dark:text-gray-300">Node</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-700 dark:text-gray-300">Hostname</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-700 dark:text-gray-300">Heap Usage</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-700 dark:text-gray-300">Disk Used</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-700 dark:text-gray-300">Disk Total</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-700 dark:text-gray-300">Uptime</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {nodes && nodes.length > 0 ? (
                nodes.map((node, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{node.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{node.hostname || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                      {formatHeapPercent(node.heap_used, node.heap_max)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                      {formatBytes(node.fs_used)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                      {formatBytes(node.fs_total)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                      {formatUptime(node.uptime)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    No node data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Live Metrics Chart */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
          Real-Time System Metrics
        </h3>
        <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
          Live monitoring of system resources {autoRefresh && '(refreshing every 5 seconds)'}
        </p>
        <SystemMetricsChart />
      </div>
        </div>
      </div>
    </div>
  );
}
