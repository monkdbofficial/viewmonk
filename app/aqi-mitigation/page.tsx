'use client';

import { useState, useEffect } from 'react';
import {
  Zap,
  Navigation,
  AlertTriangle,
  XCircle,
  TrendingDown,
  Users,
  Factory,
  Construction,
  Car,
  Bell,
  CheckCircle,
  Clock,
  Target,
  ArrowLeft,
  DollarSign,
  Activity,
} from 'lucide-react';
import Link from 'next/link';

interface MitigationAction {
  id: number;
  action_id: string;
  station_id: string;
  action_type: string;
  action_details: any;
  target_system: string;
  status: 'initiated' | 'executed' | 'completed' | 'failed';
  triggered_at: string;
  executed_at: string | null;
  effectiveness_score: number | null;
  aqi_before: number | null;
  aqi_after: number | null;
  aqi_reduction: number | null;
  outcome_notes: string | null;
}

interface Summary {
  total_count: number;
  by_type: Record<string, number>;
  by_status: Record<string, number>;
  avg_effectiveness: number;
  total_aqi_reduction: number;
  successful_count: number;
}

const ACTION_TYPES = [
  { id: 'traffic_rerouting', name: 'Traffic Rerouting', description: 'Adaptive signal control', icon: Navigation, color: 'blue' },
  { id: 'citizen_alert', name: 'Citizen Alerts', description: 'SMS/App notifications', icon: Users, color: 'green' },
  { id: 'industrial_throttle', name: 'Industrial Control', description: 'Emissions throttling', icon: Factory, color: 'orange' },
  { id: 'construction_stopwork', name: 'Construction Halt', description: 'Dust control enforcement', icon: Construction, color: 'yellow' },
  { id: 'public_advisory', name: 'Public Advisory', description: 'Health warnings', icon: Bell, color: 'purple' },
  { id: 'enforcement_alert', name: 'Enforcement Alert', description: 'Alert teams', icon: AlertTriangle, color: 'red' },
];

export default function AQIMitigationPage() {
  const [actions, setActions] = useState<MitigationAction[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [usingDemoData, setUsingDemoData] = useState(false);

  useEffect(() => {
    fetchMitigationActions();
    const interval = setInterval(fetchMitigationActions, 30000);
    return () => clearInterval(interval);
  }, [selectedType, selectedStatus]);

  const fetchMitigationActions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        hours_back: '24',
      });

      if (selectedType !== 'all') {
        params.append('action_type', selectedType);
      }

      if (selectedStatus !== 'all') {
        params.append('status', selectedStatus);
      }

      const response = await fetch(`/api/aqi/mitigation/actions?${params}`);
      const data = await response.json();

      if (data.success && data.actions && data.actions.length > 0) {
        setActions(data.actions);
        setSummary(data.summary);
        setUsingDemoData(false);
      } else {
        useDemoData();
      }
    } catch (error) {
      console.error('Failed to fetch mitigation actions:', error);
      useDemoData();
    } finally {
      setLoading(false);
    }
  };

  const useDemoData = () => {
    const now = new Date();
    const demoActions: MitigationAction[] = [
      {
        id: 1,
        action_id: 'act-001',
        station_id: 'STN001',
        action_type: 'traffic_rerouting',
        action_details: { route: 'Highway 101', duration_mins: 120 },
        target_system: 'Traffic Management API',
        status: 'completed',
        triggered_at: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
        executed_at: new Date(now.getTime() - 1.5 * 60 * 60 * 1000).toISOString(),
        effectiveness_score: 0.85,
        aqi_before: 165,
        aqi_after: 142,
        aqi_reduction: 23,
        outcome_notes: 'Successfully reduced traffic congestion',
      },
      {
        id: 2,
        action_id: 'act-002',
        station_id: 'STN002',
        action_type: 'citizen_alert',
        action_details: { recipients: 12500, message_type: 'health_advisory' },
        target_system: 'SMS Gateway',
        status: 'completed',
        triggered_at: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
        executed_at: new Date(now.getTime() - 2.8 * 60 * 60 * 1000).toISOString(),
        effectiveness_score: 0.92,
        aqi_before: 158,
        aqi_after: 158,
        aqi_reduction: 0,
        outcome_notes: 'Awareness campaign successful, no direct AQI impact',
      },
      {
        id: 3,
        action_id: 'act-003',
        station_id: 'STN001',
        action_type: 'industrial_throttle',
        action_details: { facility: 'Industrial Zone A', reduction_pct: 30 },
        target_system: 'Industrial Monitoring API',
        status: 'completed',
        triggered_at: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString(),
        executed_at: new Date(now.getTime() - 4.5 * 60 * 60 * 1000).toISOString(),
        effectiveness_score: 0.78,
        aqi_before: 185,
        aqi_after: 152,
        aqi_reduction: 33,
        outcome_notes: 'Industrial emissions reduced by 30%',
      },
      {
        id: 4,
        action_id: 'act-004',
        station_id: 'STN003',
        action_type: 'construction_stopwork',
        action_details: { site: 'Metro Construction', duration_hours: 4 },
        target_system: 'Construction Authority',
        status: 'completed',
        triggered_at: new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString(),
        executed_at: new Date(now.getTime() - 7.5 * 60 * 60 * 1000).toISOString(),
        effectiveness_score: 0.65,
        aqi_before: 148,
        aqi_after: 132,
        aqi_reduction: 16,
        outcome_notes: 'Dust levels reduced significantly',
      },
      {
        id: 5,
        action_id: 'act-005',
        station_id: 'STN002',
        action_type: 'public_advisory',
        action_details: { advisory_level: 'orange', channels: ['web', 'app', 'tv'] },
        target_system: 'Public Health API',
        status: 'completed',
        triggered_at: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
        executed_at: new Date(now.getTime() - 0.9 * 60 * 60 * 1000).toISOString(),
        effectiveness_score: 0.88,
        aqi_before: 172,
        aqi_after: 172,
        aqi_reduction: 0,
        outcome_notes: 'Advisory broadcast successfully',
      },
    ];

    setActions(demoActions);
    setSummary({
      total_count: 5,
      by_type: {
        traffic_rerouting: 1,
        citizen_alert: 1,
        industrial_throttle: 1,
        construction_stopwork: 1,
        public_advisory: 1,
      },
      by_status: {
        completed: 5,
      },
      avg_effectiveness: 0.82,
      total_aqi_reduction: 72,
      successful_count: 5,
    });
    setUsingDemoData(true);
  };

  const getActionIcon = (actionType: string) => {
    const action = ACTION_TYPES.find(a => a.id === actionType);
    return action?.icon || Zap;
  };

  const getActionColor = (actionType: string) => {
    const action = ACTION_TYPES.find(a => a.id === actionType);
    return action?.color || 'gray';
  };

  const getColorClasses = (color: string) => {
    const colors: Record<string, any> = {
      blue: { bg: 'from-blue-500 to-blue-600', bgLight: 'from-blue-500/20 to-blue-600/10', border: 'border-blue-500/30', text: 'text-blue-400' },
      green: { bg: 'from-green-500 to-green-600', bgLight: 'from-green-500/20 to-green-600/10', border: 'border-green-500/30', text: 'text-green-400' },
      orange: { bg: 'from-orange-500 to-orange-600', bgLight: 'from-orange-500/20 to-orange-600/10', border: 'border-orange-500/30', text: 'text-orange-400' },
      yellow: { bg: 'from-yellow-500 to-yellow-600', bgLight: 'from-yellow-500/20 to-yellow-600/10', border: 'border-yellow-500/30', text: 'text-yellow-400' },
      purple: { bg: 'from-purple-500 to-purple-600', bgLight: 'from-purple-500/20 to-purple-600/10', border: 'border-purple-500/30', text: 'text-purple-400' },
      red: { bg: 'from-red-500 to-red-600', bgLight: 'from-red-500/20 to-red-600/10', border: 'border-red-500/30', text: 'text-red-400' },
    };
    return colors[color] || colors.blue;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'executed':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'initiated':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'failed':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
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
                <div className="rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 p-3 shadow-lg">
                  <Zap className="h-7 w-7 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-2xl font-bold text-white">
                      Automated Mitigation & ROI Tracking
                    </h1>
                    <div className="rounded-full bg-gradient-to-r from-green-500/20 to-green-600/20 px-3 py-1 border border-green-500/30">
                      <span className="text-xs font-bold text-green-400">Measurable Outcomes</span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-400 font-medium">
                    Real-Time Action Effectiveness • AQI Reduction Impact • Budget Justification • Regulatory Compliance
                  </p>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="rounded-lg border border-slate-600 bg-slate-700/50 px-4 py-2 text-sm text-white focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              >
                <option value="all">All Actions</option>
                {ACTION_TYPES.map((action) => (
                  <option key={action.id} value={action.id}>
                    {action.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="rounded-lg border border-slate-600 bg-slate-700/50 px-4 py-2 text-sm text-white focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="executed">Executed</option>
                <option value="initiated">Initiated</option>
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
                Interventions Deployed
              </div>
            </div>

            <div className="rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-5 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="rounded-lg bg-gradient-to-br from-green-500/20 to-green-600/10 p-2.5 border border-green-500/30">
                  <TrendingDown className="h-5 w-5 text-green-400" />
                </div>
                <span className="text-xs font-bold text-green-400">Total</span>
              </div>
              <div className="text-3xl font-bold text-white mb-1">-{summary.total_aqi_reduction}</div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Total Pollution Reduction
              </div>
            </div>

            <div className="rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-5 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-600/10 p-2.5 border border-purple-500/30">
                  <Target className="h-5 w-5 text-purple-400" />
                </div>
                <span className="text-xs font-bold text-purple-400">Avg</span>
              </div>
              <div className="text-3xl font-bold text-white mb-1">
                {Math.round(summary.avg_effectiveness * 100)}%
              </div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Avg Action ROI Score
              </div>
            </div>

            <div className="rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-5 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="rounded-lg bg-gradient-to-br from-orange-500/20 to-orange-600/10 p-2.5 border border-orange-500/30">
                  <CheckCircle className="h-5 w-5 text-orange-400" />
                </div>
                <span className="text-xs font-bold text-orange-400">Success</span>
              </div>
              <div className="text-3xl font-bold text-white mb-1">
                {summary.successful_count}
              </div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Successful Actions
              </div>
            </div>
          </div>
        )}

        {/* Action Types Grid */}
        <div className="rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 shadow-lg overflow-hidden">
          <div className="border-b border-slate-700/50 bg-slate-800/30 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 p-2.5 shadow-lg">
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Mitigation Strategy Matrix</h2>
                  <p className="text-sm text-slate-400 font-medium">
                    Automated Interventions • Immediate + Long-Term Actions • Government-Approved Playbooks
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

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ACTION_TYPES.map((actionType) => {
              const Icon = actionType.icon;
              const colors = getColorClasses(actionType.color);
              const count = summary?.by_type[actionType.id] || 0;

              return (
                <div
                  key={actionType.id}
                  className={`rounded-lg border p-4 bg-gradient-to-br ${colors.bgLight} ${colors.border}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className={`rounded-lg bg-gradient-to-br ${colors.bg} p-2 shadow-sm`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <span className={`text-2xl font-bold ${colors.text}`}>{count}</span>
                  </div>
                  <h3 className="font-bold text-white mb-1">{actionType.name}</h3>
                  <p className="text-xs text-slate-400">{actionType.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions Log */}
        <div className="rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 shadow-lg overflow-hidden">
          <div className="border-b border-slate-700/50 bg-slate-800/30 p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-gradient-to-br from-green-500 to-green-600 p-2.5 shadow-lg">
                <TrendingDown className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Action Log: AQI Impact & ROI Analysis</h2>
                <p className="text-sm text-slate-400 font-medium">
                  Before/After Comparison • Effectiveness Scores • Budget Justification • Audit-Ready Documentation
                </p>
              </div>
            </div>
          </div>

          <div className="max-h-[600px] overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent"></div>
              </div>
            ) : actions.length === 0 ? (
              <div className="text-center py-12">
                <Zap className="mx-auto h-12 w-12 text-slate-600 mb-3 opacity-50" />
                <p className="text-sm font-semibold text-slate-400">No mitigation actions found</p>
                <p className="text-xs text-slate-500 mt-1">Actions will appear here as they're triggered</p>
              </div>
            ) : (
              <div className="space-y-3">
                {actions.map((action) => {
                  const Icon = getActionIcon(action.action_type);
                  const color = getActionColor(action.action_type);
                  const colors = getColorClasses(color);

                  return (
                    <div
                      key={action.id}
                      className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-4 hover:bg-slate-800/50 transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`rounded-lg bg-gradient-to-br ${colors.bg} p-2 shadow-sm flex-shrink-0`}>
                          <Icon className="h-5 w-5 text-white" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-white">
                                {ACTION_TYPES.find(a => a.id === action.action_type)?.name || action.action_type}
                              </h3>
                              <div className={`flex items-center gap-1 rounded-full px-2 py-0.5 border ${getStatusColor(action.status)}`}>
                                <span className="text-xs font-bold capitalize">{action.status}</span>
                              </div>
                            </div>
                            <span className="text-xs text-slate-400">{formatTimeAgo(action.triggered_at)}</span>
                          </div>

                          {action.outcome_notes && (
                            <p className="text-sm text-slate-300 mb-3">{action.outcome_notes}</p>
                          )}

                          <div className="grid grid-cols-4 gap-3 text-xs">
                            {action.aqi_before !== null && (
                              <div className="rounded bg-slate-700/50 px-3 py-2">
                                <span className="text-slate-400 block mb-0.5">AQI Before</span>
                                <span className="font-bold text-white text-lg">{action.aqi_before}</span>
                              </div>
                            )}
                            {action.aqi_after !== null && (
                              <div className="rounded bg-slate-700/50 px-3 py-2">
                                <span className="text-slate-400 block mb-0.5">AQI After</span>
                                <span className="font-bold text-white text-lg">{action.aqi_after}</span>
                              </div>
                            )}
                            {action.aqi_reduction !== null && (
                              <div className={`rounded px-3 py-2 ${action.aqi_reduction > 0 ? 'bg-green-500/20 border border-green-500/30' : 'bg-slate-700/50'}`}>
                                <span className="text-slate-400 block mb-0.5">Reduction</span>
                                <span className={`font-bold text-lg ${action.aqi_reduction > 0 ? 'text-green-400' : 'text-white'}`}>
                                  {action.aqi_reduction > 0 ? `-${action.aqi_reduction}` : action.aqi_reduction}
                                </span>
                              </div>
                            )}
                            {action.effectiveness_score !== null && (
                              <div className="rounded bg-purple-500/20 px-3 py-2 border border-purple-500/30">
                                <span className="text-slate-400 block mb-0.5">Effectiveness</span>
                                <span className="font-bold text-purple-400 text-lg">
                                  {Math.round(action.effectiveness_score * 100)}%
                                </span>
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
