'use client';

import { useEffect, useState } from 'react';
import { Zap, TrendingDown, CheckCircle, XCircle, Clock, Navigation, AlertTriangle } from 'lucide-react';

interface MitigationAction {
  id: number;
  action_id: string;
  station_id: string;
  action_type: string;
  action_details: any;
  target_system: string;
  status: string;
  triggered_at: string;
  executed_at: string;
  effectiveness_score: number;
  aqi_before: number;
  aqi_after: number;
  aqi_reduction: number;
  outcome_notes: string;
}

interface MitigationActionsTrackerProps {
  stationId?: string;
  refreshKey?: number;
}

export default function MitigationActionsTracker({ stationId, refreshKey }: MitigationActionsTrackerProps) {
  const [loading, setLoading] = useState(true);
  const [actions, setActions] = useState<MitigationAction[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [setupRequired, setSetupRequired] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchMitigationActions();
  }, [refreshKey, stationId]);

  const fetchMitigationActions = async () => {
    try {
      setLoading(true);
      setSetupRequired(false);
      setErrorMessage(null);

      const params = new URLSearchParams({
        hours_back: '24',
      });

      if (stationId) {
        params.append('station_id', stationId);
      }

      const response = await fetch(`/api/aqi/mitigation/actions?${params}`);
      const data = await response.json();

      if (data.setup_required) {
        setSetupRequired(true);
        setErrorMessage(data.message);
      } else if (data.success) {
        setActions(data.actions || []);
        setSummary(data.summary || {});
      } else {
        setErrorMessage(data.error || 'Failed to fetch mitigation actions');
      }
    } catch (error) {
      setErrorMessage('Network error: Unable to connect to the API');
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (actionType: string) => {
    const icons: Record<string, any> = {
      traffic_rerouting: Navigation,
      route_diversion: Navigation,
      enforcement_alert: Zap,
      citizen_alert: Zap,
      industrial_throttle: TrendingDown,
      construction_stopwork: XCircle,
    };
    const Icon = icons[actionType] || Zap;
    return <Icon className="h-5 w-5" />;
  };

  const getActionColor = (actionType: string) => {
    const colors: Record<string, string> = {
      traffic_rerouting: 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
      route_diversion: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/20 dark:text-cyan-400',
      enforcement_alert: 'bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
      citizen_alert: 'bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
      industrial_throttle: 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400',
      construction_stopwork: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400',
    };
    return colors[actionType] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; text: string }> = {
      completed: { color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400', text: 'Completed' },
      executed: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400', text: 'Executed' },
      initiated: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400', text: 'Initiated' },
      failed: { color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400', text: 'Failed' },
    };
    const badge = badges[status] || { color: 'bg-gray-100 text-gray-800', text: status };
    return (
      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  const formatActionType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
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
              onClick={fetchMitigationActions}
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
              Error Loading Mitigation Actions
            </h3>
            <p className="mt-2 text-sm text-red-800 dark:text-red-200">{errorMessage}</p>
            <button
              onClick={fetchMitigationActions}
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
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      {/* Header */}
      <div className="border-b border-gray-200 p-4 dark:border-gray-700">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Automated Mitigation Actions
          </h3>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
              {summary?.total_count || 0} Actions (24h)
            </span>
          </div>
        </div>

        {/* Summary Stats */}
        {summary && (
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {summary.total_aqi_reduction || 0}
              </div>
              <div className="text-xs text-green-600 dark:text-green-400">Total AQI Reduction</div>
            </div>
            <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {summary.successful_count || 0}
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400">Successful Actions</div>
            </div>
            <div className="rounded-lg bg-purple-50 p-3 dark:bg-purple-900/20">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {summary.avg_effectiveness ? (summary.avg_effectiveness * 100).toFixed(0) : 0}%
              </div>
              <div className="text-xs text-purple-600 dark:text-purple-400">Avg Effectiveness</div>
            </div>
          </div>
        )}
      </div>

      {/* Actions List */}
      <div className="max-h-96 overflow-y-auto p-4">
        {actions.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-500">
            No mitigation actions recorded in the last 24 hours
          </div>
        ) : (
          <div className="space-y-3">
            {actions.map((action) => (
              <div
                key={action.id}
                className="rounded-lg border border-gray-200 p-4 transition-all hover:border-blue-300 hover:shadow-sm dark:border-gray-700 dark:hover:border-blue-600"
              >
                <div className="flex items-start gap-3">
                  <div className={`rounded-lg p-2 ${getActionColor(action.action_type)}`}>
                    {getActionIcon(action.action_type)}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {formatActionType(action.action_type)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {action.target_system || 'Automated System'} • {action.action_id.slice(0, 8)}
                        </div>
                      </div>
                      <div className="text-right">
                        {getStatusBadge(action.status)}
                        <div className="mt-1 text-xs text-gray-500">
                          {formatTimeAgo(action.triggered_at)}
                        </div>
                      </div>
                    </div>

                    {/* AQI Impact */}
                    {action.aqi_before && action.aqi_after && (
                      <div className="mt-3 flex items-center gap-4 rounded-lg bg-gradient-to-r from-red-50 to-green-50 p-3 dark:from-red-900/10 dark:to-green-900/10">
                        <div className="text-center">
                          <div className="text-xs text-gray-600 dark:text-gray-400">Before</div>
                          <div className="text-lg font-bold text-red-600 dark:text-red-400">
                            {Math.round(action.aqi_before)}
                          </div>
                        </div>
                        <TrendingDown className="h-5 w-5 text-green-600 dark:text-green-400" />
                        <div className="text-center">
                          <div className="text-xs text-gray-600 dark:text-gray-400">After</div>
                          <div className="text-lg font-bold text-green-600 dark:text-green-400">
                            {Math.round(action.aqi_after)}
                          </div>
                        </div>
                        <div className="ml-auto text-center">
                          <div className="text-xs text-gray-600 dark:text-gray-400">Reduction</div>
                          <div className="text-lg font-bold text-green-600 dark:text-green-400">
                            -{Math.round(action.aqi_reduction)}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Effectiveness Score */}
                    {action.effectiveness_score !== null && (
                      <div className="mt-2">
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="text-gray-600 dark:text-gray-400">Effectiveness</span>
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {(action.effectiveness_score * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                          <div
                            className={`h-full transition-all ${
                              action.effectiveness_score >= 0.7
                                ? 'bg-green-500'
                                : action.effectiveness_score >= 0.4
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${action.effectiveness_score * 100}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Outcome Notes */}
                    {action.outcome_notes && (
                      <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                        {action.outcome_notes}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
