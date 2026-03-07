'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, AlertTriangle, Zap, Info, BarChart3 } from 'lucide-react';

interface Anomaly {
  station_id: string;
  timestamp: string;
  current_aqi: number;
  expected_aqi: number;
  severity: string;
  zscore: number;
  alert_message: string;
  station_name?: string;
}

interface AnomalyAlertCardProps {
  hoursBack?: number;
  maxAlerts?: number;
}

export default function AnomalyAlertCard({ hoursBack = 24, maxAlerts = 5 }: AnomalyAlertCardProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);

  useEffect(() => {
    fetchAnomalies();
    const interval = setInterval(fetchAnomalies, 2 * 60 * 1000); // Refresh every 2 minutes
    return () => clearInterval(interval);
  }, [hoursBack]);

  const fetchAnomalies = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/aqi/anomalies?hours_back=${hoursBack}`);
      const data = await response.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      setAnomalies(data.anomalies?.slice(0, maxAlerts) || []);
      setError(null);
    } catch (err) {
      setError('Failed to fetch anomaly data');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string): string => {
    const colors: Record<string, string> = {
      critical: 'bg-gradient-to-br from-red-500/20 to-red-600/10 text-red-100 border-red-500/30',
      very_high: 'bg-gradient-to-br from-orange-500/20 to-orange-600/10 text-orange-100 border-orange-500/30',
      high: 'bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 text-yellow-100 border-yellow-500/30',
      moderate: 'bg-gradient-to-br from-blue-500/20 to-blue-600/10 text-blue-100 border-blue-500/30',
    };
    return colors[severity] || 'bg-gradient-to-br from-slate-700/50 to-slate-800/50 text-slate-300 border-slate-600/50';
  };

  const getSeverityIcon = (severity: string): React.ReactNode => {
    const icons: Record<string, React.ReactNode> = {
      critical: <AlertCircle className="h-6 w-6" />,
      very_high: <AlertTriangle className="h-6 w-6" />,
      high: <Zap className="h-6 w-6" />,
      moderate: <Info className="h-6 w-6" />,
    };
    return icons[severity] || <BarChart3 className="h-6 w-6" />;
  };

  const getTimeAgo = (timestamp: string): string => {
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
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Anomaly Alerts</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-500 border-t-transparent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 shadow-lg overflow-hidden">
      <div className="border-b border-slate-700/50 bg-slate-800/30 p-5 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`rounded-lg p-2.5 shadow-lg ${
              anomalies.length > 0
                ? 'bg-gradient-to-br from-red-500 to-red-600'
                : 'bg-gradient-to-br from-green-500 to-green-600'
            }`}>
              <AlertTriangle className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-lg font-bold text-white">Anomaly Alerts</h3>
          </div>
          <span className={`rounded-full px-3 py-1.5 text-xs font-bold shadow-sm ${
            anomalies.length > 0
              ? 'bg-gradient-to-r from-red-500 to-red-600 text-white'
              : 'bg-gradient-to-r from-green-500 to-green-600 text-white'
          }`}>
            {anomalies.length} active
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 min-h-0">
        {error && (
          <div className="rounded-lg bg-gradient-to-br from-red-500/20 to-red-600/10 p-4 border border-red-500/30">
            <p className="text-sm font-semibold text-red-400">{error}</p>
          </div>
        )}

        {!error && anomalies.length === 0 && (
          <div className="text-center py-8">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-gradient-to-br from-green-500/20 to-green-600/10 flex items-center justify-center border border-green-500/30">
              <svg className="h-8 w-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-base font-bold text-white mb-1">All Clear!</p>
            <p className="text-sm text-slate-400">
              No anomalies detected in last {hoursBack} hours
            </p>
          </div>
        )}

        {!error && anomalies.length > 0 && (
          <div className="space-y-3">
            {anomalies.map((anomaly, index) => (
              <div
                key={index}
                className={`rounded-lg border p-4 transition-all hover:shadow-lg backdrop-blur-sm ${getSeverityColor(anomaly.severity)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`rounded-lg p-2 shadow-sm ${
                      anomaly.severity === 'critical' ? 'bg-gradient-to-br from-red-500 to-red-600' :
                      anomaly.severity === 'very_high' ? 'bg-gradient-to-br from-orange-500 to-orange-600' :
                      anomaly.severity === 'high' ? 'bg-gradient-to-br from-yellow-500 to-yellow-600' :
                      'bg-gradient-to-br from-blue-500 to-blue-600'
                    }`}>
                      {getSeverityIcon(anomaly.severity)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-sm text-white">
                          {anomaly.station_name || anomaly.station_id}
                        </h4>
                        <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-bold backdrop-blur-sm border border-white/20">
                          {anomaly.severity.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm mb-3 text-slate-200">{anomaly.alert_message}</p>
                      <div className="grid grid-cols-3 gap-3 text-xs">
                        <div className="rounded-lg bg-black/20 px-2 py-1.5 backdrop-blur-sm border border-white/10">
                          <span className="text-slate-400 block mb-0.5">Current</span>
                          <strong className="text-white font-bold text-sm">{Math.round(anomaly.current_aqi)}</strong>
                        </div>
                        <div className="rounded-lg bg-black/20 px-2 py-1.5 backdrop-blur-sm border border-white/10">
                          <span className="text-slate-400 block mb-0.5">Expected</span>
                          <strong className="text-white font-bold text-sm">{Math.round(anomaly.expected_aqi)}</strong>
                        </div>
                        <div className="rounded-lg bg-black/20 px-2 py-1.5 backdrop-blur-sm border border-white/10">
                          <span className="text-slate-400 block mb-0.5">Z-score</span>
                          <strong className="text-white font-bold text-sm">{anomaly.zscore.toFixed(1)}σ</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 whitespace-nowrap ml-2 font-medium">
                    {getTimeAgo(anomaly.timestamp)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {anomalies.length >= maxAlerts && (
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Showing top {maxAlerts} anomalies. Total: {anomalies.length}+
            </p>
          </div>
        )}
      </div>

      {anomalies.length > 0 && (
        <div className="border-t border-slate-700/50 bg-slate-800/20 p-4 flex-shrink-0">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">
              Last updated: {new Date().toLocaleTimeString()}
            </span>
            <button
              onClick={fetchAnomalies}
              className="rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-1.5 text-white font-semibold hover:from-blue-600 hover:to-blue-700 shadow-sm transition-all"
            >
              Refresh
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
