'use client';

import { useEffect, useState } from 'react';

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
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string): string => {
    const colors: Record<string, string> = {
      critical: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
      very_high: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800',
      high: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800',
      moderate: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
    };
    return colors[severity] || 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700';
  };

  const getSeverityIcon = (severity: string): string => {
    const icons: Record<string, string> = {
      critical: '🚨',
      very_high: '⚠️',
      high: '⚡',
      moderate: 'ℹ️',
    };
    return icons[severity] || '📊';
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
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
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
    <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="border-b border-gray-200 p-4 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Anomaly Alerts</h3>
          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800 dark:bg-red-900/20 dark:text-red-400">
            {anomalies.length} active
          </span>
        </div>
      </div>

      <div className="max-h-64 overflow-y-auto p-3">
        {error && (
          <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
            <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
          </div>
        )}

        {!error && anomalies.length === 0 && (
          <div className="text-center py-4">
            <svg className="mx-auto mb-2 h-10 w-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-medium text-gray-900 dark:text-white">All Clear!</p>
            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
              No anomalies in last {hoursBack}h
            </p>
          </div>
        )}

        {!error && anomalies.length > 0 && (
          <div className="space-y-3">
            {anomalies.map((anomaly, index) => (
              <div
                key={index}
                className={`rounded-lg border p-4 transition-all hover:shadow-md ${getSeverityColor(anomaly.severity)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{getSeverityIcon(anomaly.severity)}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-sm">
                          {anomaly.station_name || anomaly.station_id}
                        </h4>
                        <span className="rounded-full bg-white/50 px-2 py-0.5 text-xs font-medium dark:bg-black/20">
                          {anomaly.severity.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm mb-2">{anomaly.alert_message}</p>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="opacity-75">Current:</span>
                          <strong className="ml-1">{Math.round(anomaly.current_aqi)}</strong>
                        </div>
                        <div>
                          <span className="opacity-75">Expected:</span>
                          <strong className="ml-1">{Math.round(anomaly.expected_aqi)}</strong>
                        </div>
                        <div>
                          <span className="opacity-75">Z-score:</span>
                          <strong className="ml-1">{anomaly.zscore.toFixed(1)}σ</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                  <span className="text-xs opacity-75 whitespace-nowrap ml-2">
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
        <div className="border-t border-gray-200 p-3 dark:border-gray-700">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600 dark:text-gray-400">
              Last updated: {new Date().toLocaleTimeString()}
            </span>
            <button
              onClick={fetchAnomalies}
              className="rounded px-3 py-1 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
            >
              Refresh
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
