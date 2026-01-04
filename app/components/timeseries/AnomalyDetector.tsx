'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { AlertTriangle, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { format } from 'date-fns';

export interface Anomaly {
  timestamp: Date;
  value: number;
  expectedValue: number;
  deviation: number;
  type: 'high' | 'low';
}

interface AnomalyDetectorProps {
  data: { timestamp: Date; value: number }[];
  threshold?: number; // Number of standard deviations
  onAnomaliesDetected?: (anomalies: Anomaly[]) => void;
}

export default function AnomalyDetector({
  data,
  threshold = 2,
  onAnomaliesDetected,
}: AnomalyDetectorProps) {
  const [selectedThreshold, setSelectedThreshold] = useState(threshold);
  const [showDetails, setShowDetails] = useState(false);

  // Calculate mean and standard deviation
  const statistics = useMemo(() => {
    if (data.length === 0) {
      return { mean: 0, stdDev: 0, min: 0, max: 0 };
    }

    const values = data.map((d) => d.value);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance =
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const min = Math.min(...values);
    const max = Math.max(...values);

    return { mean, stdDev, min, max };
  }, [data]);

  // Detect anomalies
  const anomalies = useMemo(() => {
    if (data.length === 0 || statistics.stdDev === 0) {
      return [];
    }

    const detected: Anomaly[] = [];
    const upperBound = statistics.mean + selectedThreshold * statistics.stdDev;
    const lowerBound = statistics.mean - selectedThreshold * statistics.stdDev;

    data.forEach((point) => {
      if (point.value > upperBound) {
        detected.push({
          timestamp: point.timestamp,
          value: point.value,
          expectedValue: statistics.mean,
          deviation: (point.value - statistics.mean) / statistics.stdDev,
          type: 'high',
        });
      } else if (point.value < lowerBound) {
        detected.push({
          timestamp: point.timestamp,
          value: point.value,
          expectedValue: statistics.mean,
          deviation: (statistics.mean - point.value) / statistics.stdDev,
          type: 'low',
        });
      }
    });

    return detected.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [data, selectedThreshold, statistics]);

  // Track previous anomalies to avoid infinite loops
  const prevAnomaliesRef = useRef<string>('');

  // Notify parent component of detected anomalies (only when they actually change)
  useEffect(() => {
    if (!onAnomaliesDetected) return;

    // Create a stable string representation of anomalies
    const anomaliesKey = anomalies
      .map((a) => `${a.timestamp.getTime()}_${a.value}_${a.type}`)
      .join('|');

    // Only call callback if anomalies actually changed
    if (anomaliesKey !== prevAnomaliesRef.current) {
      prevAnomaliesRef.current = anomaliesKey;
      onAnomaliesDetected(anomalies);
    }
  }, [anomalies, onAnomaliesDetected]);

  const thresholdOptions = [
    { label: '1σ (68%)', value: 1 },
    { label: '2σ (95%)', value: 2 },
    { label: '3σ (99.7%)', value: 3 },
    { label: '4σ (99.99%)', value: 4 },
  ];

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
          <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          Anomaly Detection
        </h3>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
        </button>
      </div>

      {/* Threshold Selection */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Sensitivity (Standard Deviations)
        </label>
        <div className="flex flex-wrap gap-2">
          {thresholdOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setSelectedThreshold(option.value)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                selectedThreshold === option.value
                  ? 'bg-orange-600 text-white shadow-md dark:bg-orange-500'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Statistics Summary */}
      {showDetails && (
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
              <Activity className="h-4 w-4" />
              <span className="text-xs font-medium">Mean</span>
            </div>
            <p className="mt-2 text-xl font-bold text-blue-900 dark:text-blue-300">
              {statistics.mean.toFixed(2)}
            </p>
          </div>
          <div className="rounded-lg bg-purple-50 p-4 dark:bg-purple-900/20">
            <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400">
              <Activity className="h-4 w-4" />
              <span className="text-xs font-medium">Std Dev</span>
            </div>
            <p className="mt-2 text-xl font-bold text-purple-900 dark:text-purple-300">
              {statistics.stdDev.toFixed(2)}
            </p>
          </div>
          <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <TrendingDown className="h-4 w-4" />
              <span className="text-xs font-medium">Min</span>
            </div>
            <p className="mt-2 text-xl font-bold text-green-900 dark:text-green-300">
              {statistics.min.toFixed(2)}
            </p>
          </div>
          <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs font-medium">Max</span>
            </div>
            <p className="mt-2 text-xl font-bold text-red-900 dark:text-red-300">
              {statistics.max.toFixed(2)}
            </p>
          </div>
        </div>
      )}

      {/* Anomalies Count */}
      <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-900/50 dark:bg-orange-900/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-orange-700 dark:text-orange-400">
              Detected Anomalies
            </p>
            <p className="mt-1 text-2xl font-bold text-orange-900 dark:text-orange-300">
              {anomalies.length}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-orange-600 dark:text-orange-400">
              {anomalies.filter((a) => a.type === 'high').length} high,{' '}
              {anomalies.filter((a) => a.type === 'low').length} low
            </p>
            <p className="mt-1 text-xs text-orange-600 dark:text-orange-400">
              Threshold: ±{selectedThreshold}σ
            </p>
          </div>
        </div>
      </div>

      {/* Anomalies List */}
      {anomalies.length > 0 && (
        <div className="max-h-96 overflow-y-auto">
          <h4 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
            Anomaly Timeline
          </h4>
          <div className="space-y-2">
            {anomalies.map((anomaly, index) => (
              <div
                key={index}
                className={`flex items-start justify-between rounded-lg border p-3 ${
                  anomaly.type === 'high'
                    ? 'border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-900/20'
                    : 'border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-900/20'
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {anomaly.type === 'high' ? (
                      <TrendingUp className="h-4 w-4 text-red-600 dark:text-red-400" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    )}
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      {format(anomaly.timestamp, 'MMM dd, yyyy HH:mm:ss')}
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span
                      className={`text-lg font-bold ${
                        anomaly.type === 'high'
                          ? 'text-red-900 dark:text-red-300'
                          : 'text-blue-900 dark:text-blue-300'
                      }`}
                    >
                      {anomaly.value.toFixed(2)}
                    </span>
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      (expected: {anomaly.expectedValue.toFixed(2)})
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                      anomaly.type === 'high'
                        ? 'bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-200'
                        : 'bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                    }`}
                  >
                    {anomaly.deviation.toFixed(2)}σ
                  </span>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {anomaly.type === 'high' ? 'Above' : 'Below'} normal
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {anomalies.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center dark:border-gray-600 dark:bg-gray-900/50">
          <Activity className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-3 text-sm font-medium text-gray-900 dark:text-white">
            No anomalies detected
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            All data points are within {selectedThreshold} standard deviations from the mean
          </p>
        </div>
      )}
    </div>
  );
}
