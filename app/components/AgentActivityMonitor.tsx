'use client';

import { useEffect, useState } from 'react';
import { Activity, CheckCircle, XCircle, Clock, Zap, TrendingUp, AlertTriangle } from 'lucide-react';

interface AgentActivity {
  id: number;
  agent_type: string;
  agent_name: string;
  execution_id: string;
  status: string;
  started_at: string;
  completed_at: string;
  duration_ms: number;
  error_message: string;
  metrics: any;
}

interface AgentActivityMonitorProps {
  refreshKey?: number;
}

export default function AgentActivityMonitor({ refreshKey }: AgentActivityMonitorProps) {
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<AgentActivity[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [setupRequired, setSetupRequired] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string>('all');

  useEffect(() => {
    fetchAgentActivities();
  }, [refreshKey, selectedAgent]);

  const fetchAgentActivities = async () => {
    try {
      setLoading(true);
      setSetupRequired(false);
      setErrorMessage(null);

      const params = new URLSearchParams({
        hours_back: '24',
        limit: '50',
      });

      if (selectedAgent !== 'all') {
        params.append('agent_type', selectedAgent);
      }

      const response = await fetch(`/api/aqi/agents/activity?${params}`);
      const data = await response.json();

      if (data.setup_required) {
        setSetupRequired(true);
        setErrorMessage(data.message);
      } else if (data.success) {
        setActivities(data.activities || []);
        setSummary(data.summary || {});
      } else {
        setErrorMessage(data.error || 'Failed to fetch agent activities');
      }
    } catch (error) {
      console.error('Failed to fetch agent activities:', error);
      setErrorMessage('Network error: Unable to connect to the API');
    } finally {
      setLoading(false);
    }
  };

  const agentTypes = [
    { id: 'all', name: 'All Agents', icon: Activity },
    { id: 'ingestion', name: 'Ingestion', icon: TrendingUp },
    { id: 'correlation', name: 'Correlation', icon: Zap },
    { id: 'classification', name: 'Classification', icon: CheckCircle },
    { id: 'forecasting', name: 'Forecasting', icon: Clock },
    { id: 'mitigation', name: 'Mitigation', icon: Zap },
    { id: 'compliance', name: 'Compliance', icon: CheckCircle },
    { id: 'learning', name: 'Learning', icon: TrendingUp },
    { id: 'alert', name: 'Alert', icon: Activity },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20';
      case 'running':
        return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/20';
      case 'failed':
        return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20';
      default:
        return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'running':
        return <Activity className="h-4 w-4 animate-pulse" />;
      case 'failed':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
        </div>
      </div>
    );
  }

  if (setupRequired) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 shadow-sm dark:border-amber-900 dark:bg-amber-900/20">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-6 w-6 flex-shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-100">
              Database Setup Required
            </h3>
            <p className="mt-2 text-sm text-amber-800 dark:text-amber-200">
              {errorMessage || 'Enterprise tables need to be initialized before using this feature.'}
            </p>
            <div className="mt-4 rounded-lg bg-white/50 p-4 dark:bg-black/20">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                Setup Instructions:
              </p>
              <ol className="mt-2 space-y-1 text-sm text-amber-800 dark:text-amber-200">
                <li>1. Open a terminal and navigate to the schema directory</li>
                <li className="font-mono text-xs">   cd schema</li>
                <li>2. Run the setup script</li>
                <li className="font-mono text-xs">   ./setup-all.sh</li>
                <li>3. Refresh this page after setup completes</li>
              </ol>
            </div>
            <button
              onClick={fetchAgentActivities}
              className="mt-4 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600"
            >
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 shadow-sm dark:border-red-900 dark:bg-red-900/20">
        <div className="flex items-start gap-3">
          <XCircle className="h-6 w-6 flex-shrink-0 text-red-600 dark:text-red-400" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-red-900 dark:text-red-100">
              Error Loading Agent Activities
            </h3>
            <p className="mt-2 text-sm text-red-800 dark:text-red-200">{errorMessage}</p>
            <button
              onClick={fetchAgentActivities}
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 shadow-lg overflow-hidden">
      {/* Header with Stats */}
      <div className="border-b border-slate-700/50 bg-slate-800/30 p-5 flex-shrink-0">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 p-2.5 shadow-lg">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-lg font-bold text-white">
              24×7 Agent Activity Monitor
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-3 py-1.5 text-xs font-bold shadow-sm ${
              summary?.success_rate >= 90
                ? 'bg-gradient-to-r from-green-500 to-green-600 text-white'
                : summary?.success_rate >= 70
                ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white'
                : 'bg-gradient-to-r from-red-500 to-red-600 text-white'
            }`}>
              {summary?.success_rate || 0}% Success Rate
            </span>
          </div>
        </div>

        {/* Summary Stats */}
        {summary && (
          <div className="grid grid-cols-4 gap-3">
            <div className="rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/10 p-4 border border-blue-500/30 backdrop-blur-sm">
              <div className="text-3xl font-bold text-blue-400">
                {summary.total_count || 0}
              </div>
              <div className="text-xs font-semibold uppercase tracking-wide text-blue-300 mt-1">Total Executions</div>
            </div>
            <div className="rounded-lg bg-gradient-to-br from-green-500/20 to-green-600/10 p-4 border border-green-500/30 backdrop-blur-sm">
              <div className="text-3xl font-bold text-green-400">
                {summary.by_status?.completed || 0}
              </div>
              <div className="text-xs font-semibold uppercase tracking-wide text-green-300 mt-1">Completed</div>
            </div>
            <div className="rounded-lg bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 p-4 border border-yellow-500/30 backdrop-blur-sm">
              <div className="text-3xl font-bold text-yellow-400">
                {summary.by_status?.running || 0}
              </div>
              <div className="text-xs font-semibold uppercase tracking-wide text-yellow-300 mt-1">Running</div>
            </div>
            <div className="rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-600/10 p-4 border border-purple-500/30 backdrop-blur-sm">
              <div className="text-3xl font-bold text-purple-400">
                {summary.avg_duration_ms ? formatDuration(summary.avg_duration_ms) : 'N/A'}
              </div>
              <div className="text-xs font-semibold uppercase tracking-wide text-purple-300 mt-1">Avg Duration</div>
            </div>
          </div>
        )}

        {/* Agent Type Filter */}
        <div className="mt-4 flex flex-wrap gap-2">
          {agentTypes.map((type) => {
            const Icon = type.icon;
            const count = type.id === 'all' ? summary?.total_count : summary?.by_agent?.[type.id];
            return (
              <button
                key={type.id}
                onClick={() => setSelectedAgent(type.id)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-all shadow-sm ${
                  selectedAgent === type.id
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-blue-500/50'
                    : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700 border border-slate-600/50'
                }`}
              >
                <Icon className="h-4 w-4" />
                {type.name}
                {count > 0 && (
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Activity List */}
      <div className="flex-1 overflow-y-auto p-5 min-h-0">
        {activities.length === 0 ? (
          <div className="py-12 text-center">
            <Activity className="mx-auto h-12 w-12 text-slate-600 mb-3 opacity-50" />
            <p className="text-sm font-semibold text-slate-400">No agent activities found in the last 24 hours</p>
            <p className="text-xs text-slate-500 mt-1">Activities will appear here as agents execute tasks</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-3 rounded-lg border border-gray-200 p-3 transition-all hover:border-blue-300 hover:shadow-sm dark:border-gray-700 dark:hover:border-blue-600"
              >
                <div className={`rounded-lg p-2 ${getStatusColor(activity.status)}`}>
                  {getStatusIcon(activity.status)}
                </div>

                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {activity.agent_name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {activity.agent_type} • {activity.execution_id.slice(0, 8)}
                      </div>
                    </div>
                    <div className="text-right text-xs text-gray-500">
                      {formatTimeAgo(activity.started_at)}
                      {activity.duration_ms && (
                        <div className="mt-1 font-medium text-gray-700 dark:text-gray-300">
                          {formatDuration(activity.duration_ms)}
                        </div>
                      )}
                    </div>
                  </div>

                  {activity.error_message && (
                    <div className="mt-2 rounded bg-red-50 p-2 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
                      Error: {activity.error_message}
                    </div>
                  )}

                  {activity.metrics && Object.keys(activity.metrics).length > 0 && (
                    <div className="mt-2 flex gap-3 text-xs">
                      {Object.entries(activity.metrics).slice(0, 3).map(([key, value]) => (
                        <div key={key} className="text-gray-600 dark:text-gray-400">
                          <span className="font-medium">{key}:</span> {String(value)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
