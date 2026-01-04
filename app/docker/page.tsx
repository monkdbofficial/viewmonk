'use client';

import { useState } from 'react';
import {
  Container,
  RefreshCw,
  Play,
  Square,
  RotateCw,
  Trash2,
  Plus,
  Eye,
  FileText,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Settings,
} from 'lucide-react';
import { useDocker } from '../lib/docker-context';
import { useContainerUptime, useContainersByState, useContainerStats } from '../lib/docker-hooks';

// Container card component
function ContainerCard({ container }: { container: any }) {
  const { startContainer, stopContainer, restartContainer, removeContainer } = useDocker();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const uptime = useContainerUptime(container.created);

  const handleAction = async (action: string, fn: () => Promise<void>) => {
    setActionLoading(action);
    try {
      await fn();
    } catch (error) {
      console.error(`Failed to ${action}:`, error);
      alert(`Failed to ${action}: ${error}`);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (state: string) => {
    switch (state) {
      case 'running':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'exited':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
      case 'paused':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      default:
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    }
  };

  const getStatusIcon = (state: string) => {
    switch (state) {
      case 'running':
        return <CheckCircle className="h-4 w-4" />;
      case 'exited':
        return <XCircle className="h-4 w-4" />;
      case 'paused':
        return <Clock className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const isMonkDB = container.image.toLowerCase().includes('monk');

  return (
    <div
      className={`group rounded-lg border p-4 transition-all hover:shadow-md ${
        isMonkDB
          ? 'border-blue-200 bg-blue-50/50 dark:border-blue-900/50 dark:bg-blue-900/10'
          : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
      }`}
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Container className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {container.name.startsWith('/') ? container.name.slice(1) : container.name}
            </h3>
            {isMonkDB && (
              <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-medium text-white dark:bg-blue-500">
                MonkDB
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{container.image}</p>
        </div>
        <div className={`flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(container.state)}`}>
          {getStatusIcon(container.state)}
          <span>{container.state}</span>
        </div>
      </div>

      {/* Details */}
      <div className="mb-3 space-y-2 text-xs text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-2">
          <Clock className="h-3 w-3" />
          <span>Uptime: {uptime}</span>
        </div>
        {container.ports.length > 0 && (
          <div className="flex items-center gap-2">
            <Settings className="h-3 w-3" />
            <span>
              Ports:{' '}
              {container.ports
                .map((p: any) =>
                  p.host_port
                    ? `${p.host_port}:${p.container_port}`
                    : p.container_port
                )
                .join(', ')}
            </span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-gray-500 dark:text-gray-500">
            {container.id.substring(0, 12)}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {container.state === 'running' ? (
          <>
            <button
              onClick={() => handleAction('stop', () => stopContainer(container.id))}
              disabled={actionLoading !== null}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50 dark:bg-red-500 dark:hover:bg-red-600"
            >
              {actionLoading === 'stop' ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Square className="h-3.5 w-3.5" />
              )}
              Stop
            </button>
            <button
              onClick={() => handleAction('restart', () => restartContainer(container.id))}
              disabled={actionLoading !== null}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-yellow-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-yellow-700 disabled:opacity-50 dark:bg-yellow-500 dark:hover:bg-yellow-600"
            >
              {actionLoading === 'restart' ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RotateCw className="h-3.5 w-3.5" />
              )}
            </button>
          </>
        ) : (
          <button
            onClick={() => handleAction('start', () => startContainer(container.id))}
            disabled={actionLoading !== null}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50 dark:bg-green-500 dark:hover:bg-green-600"
          >
            {actionLoading === 'start' ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
            Start
          </button>
        )}
        <button
          onClick={() => {
            if (confirm(`Delete container "${container.name}"?`)) {
              handleAction('remove', () => removeContainer(container.id));
            }
          }}
          disabled={actionLoading !== null}
          className="flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          title="Delete container"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function DockerPage() {
  const {
    dockerAvailable,
    dockerVersion,
    dockerError,
    loading,
    refreshing,
    refreshContainers,
    autoRefresh,
    setAutoRefresh,
  } = useDocker();

  const { running, stopped, all } = useContainersByState();
  const stats = useContainerStats();

  const [filter, setFilter] = useState<'all' | 'running' | 'stopped' | 'monkdb'>('all');

  const filteredContainers =
    filter === 'all'
      ? all
      : filter === 'running'
      ? running
      : filter === 'stopped'
      ? stopped
      : all.filter((c) => c.image.toLowerCase().includes('monk'));

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center">
          <RefreshCw className="mx-auto h-12 w-12 animate-spin text-blue-600 dark:text-blue-400" />
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            Checking Docker availability...
          </p>
        </div>
      </div>
    );
  }

  if (!dockerAvailable) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="max-w-md rounded-xl border-2 border-dashed border-red-300 bg-red-50/50 p-12 text-center dark:border-red-900/50 dark:bg-red-900/10">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <AlertCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="mt-6 text-xl font-bold text-gray-900 dark:text-white">
            Docker Not Available
          </h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {dockerError || 'Docker daemon is not running or not accessible'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 inline-block rounded-lg bg-red-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-7xl space-y-6 p-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Docker Management
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Manage Docker containers and MonkDB deployments
            </p>
            {dockerVersion && (
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                Docker version: {dockerVersion}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                autoRefresh
                  ? 'bg-green-600 text-white hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
              {autoRefresh ? 'Auto-Refresh On' : 'Auto-Refresh Off'}
            </button>
            <button
              onClick={refreshContainers}
              disabled={refreshing}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Containers
                </p>
                <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                  {stats.total}
                </p>
              </div>
              <Container className="h-12 w-12 text-gray-400" />
            </div>
          </div>

          <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900/50 dark:bg-green-900/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">
                  Running
                </p>
                <p className="mt-2 text-3xl font-bold text-green-900 dark:text-green-300">
                  {stats.running}
                </p>
              </div>
              <CheckCircle className="h-12 w-12 text-green-500 dark:text-green-400" />
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Stopped
                </p>
                <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                  {stats.stopped}
                </p>
              </div>
              <XCircle className="h-12 w-12 text-gray-400" />
            </div>
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/50 dark:bg-blue-900/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  MonkDB
                </p>
                <p className="mt-2 text-3xl font-bold text-blue-900 dark:text-blue-300">
                  {stats.monkdb}
                </p>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-xs text-blue-600 dark:text-blue-400">
                  {stats.monkdbRunning} running
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white shadow-md dark:bg-blue-500'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            All ({all.length})
          </button>
          <button
            onClick={() => setFilter('running')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              filter === 'running'
                ? 'bg-green-600 text-white shadow-md dark:bg-green-500'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            Running ({stats.running})
          </button>
          <button
            onClick={() => setFilter('stopped')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              filter === 'stopped'
                ? 'bg-gray-600 text-white shadow-md dark:bg-gray-500'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            Stopped ({stats.stopped})
          </button>
          <button
            onClick={() => setFilter('monkdb')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              filter === 'monkdb'
                ? 'bg-blue-600 text-white shadow-md dark:bg-blue-500'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            MonkDB Only ({stats.monkdb})
          </button>
        </div>

        {/* Container Grid */}
        {filteredContainers.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center dark:border-gray-700 dark:bg-gray-900/50">
            <Container className="mx-auto h-16 w-16 text-gray-400" />
            <p className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
              No containers found
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Start by creating a new container or adjust your filters
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredContainers.map((container) => (
              <ContainerCard key={container.id} container={container} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
