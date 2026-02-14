'use client';

import { useState, useEffect } from 'react';
import {
  Activity,
  Cpu,
  Zap,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  ArrowLeft,
  XCircle,
  Brain,
  FileSearch,
} from 'lucide-react';
import Link from 'next/link';

interface AgentActivity {
  id: number;
  agent_type: string;
  agent_name: string;
  execution_id: string;
  status: 'running' | 'completed' | 'failed';
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  error_message: string | null;
  metrics: any;
}

interface AgentSummary {
  total_count: number;
  by_agent: Record<string, number>;
  by_status: Record<string, number>;
  avg_duration_ms: number;
  success_rate: number;
}

const AGENT_TYPES = [
  { id: 'ingestion', name: 'Ingestion', description: 'Sensor data normalization', icon: TrendingUp, color: 'blue' },
  { id: 'correlation', name: 'Correlation', description: 'Geo-temporal analysis', icon: Zap, color: 'purple' },
  { id: 'classification', name: 'Classification', description: 'Source identification', icon: CheckCircle, color: 'green' },
  { id: 'forecasting', name: 'Forecasting', description: 'AQI predictions', icon: Activity, color: 'teal' },
  { id: 'mitigation', name: 'Mitigation', description: 'Automated actions', icon: Target, color: 'orange' },
  { id: 'compliance', name: 'Compliance', description: 'Violation tracking', icon: FileSearch, color: 'red' },
  { id: 'learning', name: 'Learning', description: 'Model improvement', icon: Brain, color: 'indigo' },
  { id: 'alert', name: 'Alert', description: '24×7 notifications', icon: AlertTriangle, color: 'yellow' },
];

export default function AQIAgentsPage() {
  const [activities, setActivities] = useState<AgentActivity[]>([]);
  const [summary, setSummary] = useState<AgentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [usingDemoData, setUsingDemoData] = useState(false);

  useEffect(() => {
    fetchAgentActivities();
    const interval = setInterval(fetchAgentActivities, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [selectedAgent, selectedStatus]);

  const fetchAgentActivities = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        hours_back: '24',
        limit: '50',
      });

      if (selectedAgent !== 'all') {
        params.append('agent_type', selectedAgent);
      }

      if (selectedStatus !== 'all') {
        params.append('status', selectedStatus);
      }

      const response = await fetch(`/api/aqi/agents/activity?${params}`);
      const data = await response.json();

      if (data.success && data.activities && data.activities.length > 0) {
        setActivities(data.activities);
        setSummary(data.summary);
        setUsingDemoData(false);
      } else {
        // Use demo data if no real data available
        useDemoData();
      }
    } catch (error) {
      console.error('Failed to fetch agent activities:', error);
      useDemoData();
    } finally {
      setLoading(false);
    }
  };

  const useDemoData = () => {
    const now = new Date();
    const demoActivities: AgentActivity[] = [
      {
        id: 1,
        agent_type: 'ingestion',
        agent_name: 'Real-time Sensor Ingestion',
        execution_id: 'exec-ing-001',
        status: 'completed',
        started_at: new Date(now.getTime() - 2 * 60000).toISOString(),
        completed_at: new Date(now.getTime() - 1.5 * 60000).toISOString(),
        duration_ms: 30000,
        error_message: null,
        metrics: { sensors_processed: 124, records_ingested: 1248 },
      },
      {
        id: 2,
        agent_type: 'correlation',
        agent_name: 'Geo-temporal Correlation',
        execution_id: 'exec-cor-001',
        status: 'completed',
        started_at: new Date(now.getTime() - 5 * 60000).toISOString(),
        completed_at: new Date(now.getTime() - 4 * 60000).toISOString(),
        duration_ms: 60000,
        error_message: null,
        metrics: { events_correlated: 45, patterns_found: 12 },
      },
      {
        id: 3,
        agent_type: 'classification',
        agent_name: 'Source Classification',
        execution_id: 'exec-cls-001',
        status: 'completed',
        started_at: new Date(now.getTime() - 8 * 60000).toISOString(),
        completed_at: new Date(now.getTime() - 7 * 60000).toISOString(),
        duration_ms: 45000,
        error_message: null,
        metrics: { sources_identified: 32, confidence_avg: 0.87 },
      },
      {
        id: 4,
        agent_type: 'forecasting',
        agent_name: 'LSTM Forecasting',
        execution_id: 'exec-for-001',
        status: 'running',
        started_at: new Date(now.getTime() - 3 * 60000).toISOString(),
        completed_at: null,
        duration_ms: null,
        error_message: null,
        metrics: null,
      },
      {
        id: 5,
        agent_type: 'mitigation',
        agent_name: 'Automated Mitigation',
        execution_id: 'exec-mit-001',
        status: 'completed',
        started_at: new Date(now.getTime() - 15 * 60000).toISOString(),
        completed_at: new Date(now.getTime() - 14 * 60000).toISOString(),
        duration_ms: 55000,
        error_message: null,
        metrics: { actions_triggered: 8, effectiveness_score: 0.82 },
      },
      {
        id: 6,
        agent_type: 'alert',
        agent_name: 'Alert Dispatcher',
        execution_id: 'exec-alt-001',
        status: 'failed',
        started_at: new Date(now.getTime() - 20 * 60000).toISOString(),
        completed_at: new Date(now.getTime() - 19.5 * 60000).toISOString(),
        duration_ms: 5000,
        error_message: 'SMS gateway timeout',
        metrics: null,
      },
    ];

    setActivities(demoActivities);
    setSummary({
      total_count: demoActivities.length,
      by_agent: {
        ingestion: 1,
        correlation: 1,
        classification: 1,
        forecasting: 1,
        mitigation: 1,
        alert: 1,
      },
      by_status: {
        completed: 4,
        running: 1,
        failed: 1,
      },
      avg_duration_ms: 38333,
      success_rate: 83,
    });
    setUsingDemoData(true);
  };

  const getAgentColor = (agentType: string) => {
    const agent = AGENT_TYPES.find(a => a.id === agentType);
    return agent?.color || 'gray';
  };

  const getColorClasses = (color: string) => {
    const colors: Record<string, any> = {
      blue: { bg: 'from-blue-500 to-blue-600', bgLight: 'from-blue-500/20 to-blue-600/10', border: 'border-blue-500/30', text: 'text-blue-400' },
      purple: { bg: 'from-purple-500 to-purple-600', bgLight: 'from-purple-500/20 to-purple-600/10', border: 'border-purple-500/30', text: 'text-purple-400' },
      green: { bg: 'from-green-500 to-green-600', bgLight: 'from-green-500/20 to-green-600/10', border: 'border-green-500/30', text: 'text-green-400' },
      teal: { bg: 'from-teal-500 to-teal-600', bgLight: 'from-teal-500/20 to-teal-600/10', border: 'border-teal-500/30', text: 'text-teal-400' },
      orange: { bg: 'from-orange-500 to-orange-600', bgLight: 'from-orange-500/20 to-orange-600/10', border: 'border-orange-500/30', text: 'text-orange-400' },
      red: { bg: 'from-red-500 to-red-600', bgLight: 'from-red-500/20 to-red-600/10', border: 'border-red-500/30', text: 'text-red-400' },
      indigo: { bg: 'from-indigo-500 to-indigo-600', bgLight: 'from-indigo-500/20 to-indigo-600/10', border: 'border-indigo-500/30', text: 'text-indigo-400' },
      yellow: { bg: 'from-yellow-500 to-yellow-600', bgLight: 'from-yellow-500/20 to-yellow-600/10', border: 'border-yellow-500/30', text: 'text-yellow-400' },
    };
    return colors[color] || colors.gray;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'running':
        return <Activity className="h-4 w-4 text-blue-400 animate-pulse" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-400" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'running':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'failed':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return 'N/A';
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="border-b border-slate-700/50 bg-slate-800/50 backdrop-blur-sm">
        <div className="mx-auto max-w-[1920px] px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/aqi-dashboard"
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-700/50 hover:text-white transition-all"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 p-3 shadow-lg">
                  <Cpu className="h-7 w-7 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-2xl font-bold text-white">
                      24×7 Automated Agent Architecture
                    </h1>
                    <div className="rounded-full bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 px-3 py-1 border border-emerald-500/30">
                      <span className="text-xs font-bold text-emerald-400">Always Running</span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-400 font-medium">
                    MCP + MonkAgents Intelligence • No Human Dependency • Enterprise SLA Monitoring • Real-Time System Health
                  </p>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3">
              <select
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                className="rounded-lg border border-slate-600 bg-slate-700/50 px-4 py-2 text-sm text-white focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
              >
                <option value="all">All Agents</option>
                {AGENT_TYPES.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="rounded-lg border border-slate-600 bg-slate-700/50 px-4 py-2 text-sm text-white focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="running">Running</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-[1920px] px-6 py-6 space-y-6">
        {/* Stats Row */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-5 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/10 p-2.5 border border-blue-500/30">
                  <Activity className="h-5 w-5 text-blue-400" />
                </div>
                <span className="text-xs font-bold text-blue-400">24h</span>
              </div>
              <div className="text-3xl font-bold text-white mb-1">{summary.total_count}</div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Agent Executions (24h)
              </div>
            </div>

            <div className="rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-5 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="rounded-lg bg-gradient-to-br from-green-500/20 to-green-600/10 p-2.5 border border-green-500/30">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                </div>
                <span className="text-xs font-bold text-green-400">Success</span>
              </div>
              <div className="text-3xl font-bold text-white mb-1">{summary.success_rate}%</div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                System Reliability (SLA)
              </div>
            </div>

            <div className="rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-5 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-600/10 p-2.5 border border-purple-500/30">
                  <Clock className="h-5 w-5 text-purple-400" />
                </div>
                <span className="text-xs font-bold text-purple-400">Avg</span>
              </div>
              <div className="text-3xl font-bold text-white mb-1">
                {formatDuration(summary.avg_duration_ms)}
              </div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Avg Response Time
              </div>
            </div>

            <div className="rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-5 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="rounded-lg bg-gradient-to-br from-teal-500/20 to-teal-600/10 p-2.5 border border-teal-500/30">
                  <Cpu className="h-5 w-5 text-teal-400" />
                </div>
                <span className="text-xs font-bold text-teal-400">Active</span>
              </div>
              <div className="text-3xl font-bold text-white mb-1">
                {summary.by_status?.running || 0}
              </div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Active Agents (Live)
              </div>
            </div>
          </div>
        )}

        {/* Agent Type Grid */}
        <div className="rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 shadow-lg overflow-hidden">
          <div className="border-b border-slate-700/50 bg-slate-800/30 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 p-2.5 shadow-lg">
                  <Cpu className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Agent Fleet Status</h2>
                  <p className="text-sm text-slate-400 font-medium">
                    8 specialized AI agents running 24×7
                  </p>
                </div>
              </div>
              {usingDemoData && (
                <div className="rounded-full bg-yellow-500/20 px-3 py-1.5 border border-yellow-500/30">
                  <span className="text-xs font-bold text-yellow-400">Demo Data</span>
                </div>
              )}
            </div>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {AGENT_TYPES.map((agent) => {
              const Icon = agent.icon;
              const colors = getColorClasses(agent.color);
              const count = summary?.by_agent[agent.id] || 0;

              return (
                <div
                  key={agent.id}
                  className={`rounded-lg border p-4 bg-gradient-to-br ${colors.bgLight} ${colors.border}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className={`rounded-lg bg-gradient-to-br ${colors.bg} p-2 shadow-sm`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <span className={`text-xs font-bold ${colors.text}`}>{count}</span>
                  </div>
                  <h3 className="font-bold text-white mb-1">{agent.name}</h3>
                  <p className="text-xs text-slate-400">{agent.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Activity Log */}
        <div className="rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 shadow-lg overflow-hidden">
          <div className="border-b border-slate-700/50 bg-slate-800/30 p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 p-2.5 shadow-lg">
                <Activity className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Execution Log</h2>
                <p className="text-sm text-slate-400 font-medium">
                  Recent agent activity and performance metrics
                </p>
              </div>
            </div>
          </div>

          <div className="max-h-[600px] overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent"></div>
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="mx-auto h-12 w-12 text-slate-600 mb-3 opacity-50" />
                <p className="text-sm font-semibold text-slate-400">No activities found</p>
                <p className="text-xs text-slate-500 mt-1">Agent execution logs will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activities.map((activity) => {
                  const agent = AGENT_TYPES.find(a => a.id === activity.agent_type);
                  const Icon = agent?.icon || Activity;
                  const colors = getColorClasses(agent?.color || 'gray');

                  return (
                    <div
                      key={activity.id}
                      className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-4 hover:bg-slate-800/50 transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`rounded-lg bg-gradient-to-br ${colors.bg} p-2 shadow-sm flex-shrink-0`}>
                          <Icon className="h-5 w-5 text-white" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-white">{activity.agent_name}</h3>
                              <div className={`flex items-center gap-1 rounded-full px-2 py-0.5 border ${getStatusColor(activity.status)}`}>
                                {getStatusIcon(activity.status)}
                                <span className="text-xs font-bold capitalize">{activity.status}</span>
                              </div>
                            </div>
                            <span className="text-xs text-slate-400">{formatTimeAgo(activity.started_at)}</span>
                          </div>

                          <div className="text-xs text-slate-400 font-mono mb-2">
                            {activity.execution_id}
                          </div>

                          {activity.error_message && (
                            <div className="rounded bg-red-500/20 px-3 py-2 text-xs text-red-400 mb-2 border border-red-500/30">
                              <strong>Error:</strong> {activity.error_message}
                            </div>
                          )}

                          <div className="flex items-center gap-4 text-xs text-slate-400">
                            {activity.duration_ms && (
                              <div>
                                <Clock className="inline h-3 w-3 mr-1" />
                                {formatDuration(activity.duration_ms)}
                              </div>
                            )}
                            {activity.metrics && Object.keys(activity.metrics).length > 0 && (
                              <div className="flex gap-3">
                                {Object.entries(activity.metrics).slice(0, 2).map(([key, value]) => (
                                  <div key={key}>
                                    <span className="text-slate-500">{key}:</span>
                                    <span className="ml-1 font-semibold text-white">{String(value)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
