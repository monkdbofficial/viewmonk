'use client';

import { useState } from 'react';
import { Plus, X, TrendingUp } from 'lucide-react';

export type TimeBucket = '1m' | '5m' | '15m' | '30m' | '1h' | '6h' | '12h' | '1d' | '7d';
export type AggregationFunction = 'AVG' | 'SUM' | 'MIN' | 'MAX' | 'COUNT' | 'PERCENTILE_95' | 'PERCENTILE_99';

export interface AggregationConfig {
  timeBucket: TimeBucket;
  metrics: MetricAggregation[];
  groupBy: string[];
}

export interface MetricAggregation {
  column: string;
  function: AggregationFunction;
  alias?: string;
}

interface AggregationBuilderProps {
  availableColumns?: string[];
  value: AggregationConfig;
  onChange: (config: AggregationConfig) => void;
  onGenerateSQL?: () => void;
}

export default function AggregationBuilder({
  availableColumns = ['temperature', 'humidity', 'pressure', 'cpu_usage', 'memory_usage', 'request_count', 'response_time'],
  value,
  onChange,
  onGenerateSQL,
}: AggregationBuilderProps) {
  const timeBuckets: { label: string; value: TimeBucket }[] = [
    { label: '1 Minute', value: '1m' },
    { label: '5 Minutes', value: '5m' },
    { label: '15 Minutes', value: '15m' },
    { label: '30 Minutes', value: '30m' },
    { label: '1 Hour', value: '1h' },
    { label: '6 Hours', value: '6h' },
    { label: '12 Hours', value: '12h' },
    { label: '1 Day', value: '1d' },
    { label: '7 Days', value: '7d' },
  ];

  const aggregationFunctions: { label: string; value: AggregationFunction }[] = [
    { label: 'Average', value: 'AVG' },
    { label: 'Sum', value: 'SUM' },
    { label: 'Minimum', value: 'MIN' },
    { label: 'Maximum', value: 'MAX' },
    { label: 'Count', value: 'COUNT' },
    { label: '95th Percentile', value: 'PERCENTILE_95' },
    { label: '99th Percentile', value: 'PERCENTILE_99' },
  ];

  const handleTimeBucketChange = (bucket: TimeBucket) => {
    onChange({ ...value, timeBucket: bucket });
  };

  const handleAddMetric = () => {
    const newMetric: MetricAggregation = {
      column: availableColumns[0] || 'value',
      function: 'AVG',
    };
    onChange({
      ...value,
      metrics: [...value.metrics, newMetric],
    });
  };

  const handleRemoveMetric = (index: number) => {
    onChange({
      ...value,
      metrics: value.metrics.filter((_, i) => i !== index),
    });
  };

  const handleMetricChange = (index: number, field: keyof MetricAggregation, val: string) => {
    const updatedMetrics = [...value.metrics];
    updatedMetrics[index] = {
      ...updatedMetrics[index],
      [field]: val,
    };
    onChange({ ...value, metrics: updatedMetrics });
  };

  const handleAddGroupBy = () => {
    if (availableColumns.length > 0 && !value.groupBy.includes(availableColumns[0])) {
      onChange({
        ...value,
        groupBy: [...value.groupBy, availableColumns[0]],
      });
    }
  };

  const handleRemoveGroupBy = (index: number) => {
    onChange({
      ...value,
      groupBy: value.groupBy.filter((_, i) => i !== index),
    });
  };

  const handleGroupByChange = (index: number, val: string) => {
    const updatedGroupBy = [...value.groupBy];
    updatedGroupBy[index] = val;
    onChange({ ...value, groupBy: updatedGroupBy });
  };

  return (
    <div className="space-y-6 rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
          <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          Aggregation Builder
        </h3>
        {onGenerateSQL && (
          <button
            onClick={onGenerateSQL}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            Generate SQL
          </button>
        )}
      </div>

      {/* Time Bucket Selection */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Time Bucket
        </label>
        <div className="flex flex-wrap gap-2">
          {timeBuckets.map((bucket) => (
            <button
              key={bucket.value}
              onClick={() => handleTimeBucketChange(bucket.value)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                value.timeBucket === bucket.value
                  ? 'bg-blue-600 text-white shadow-md dark:bg-blue-500'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {bucket.label}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics Configuration */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Metrics
          </label>
          <button
            onClick={handleAddMetric}
            className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
          >
            <Plus className="h-4 w-4" />
            Add Metric
          </button>
        </div>

        <div className="space-y-3">
          {value.metrics.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-6 text-center dark:border-gray-600 dark:bg-gray-900/50">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No metrics configured. Click "Add Metric" to get started.
              </p>
            </div>
          ) : (
            value.metrics.map((metric, index) => (
              <div
                key={index}
                className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/50"
              >
                <div className="grid flex-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-400">
                      Column
                    </label>
                    <select
                      value={metric.column}
                      onChange={(e) => handleMetricChange(index, 'column', e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    >
                      {availableColumns.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-400">
                      Function
                    </label>
                    <select
                      value={metric.function}
                      onChange={(e) =>
                        handleMetricChange(index, 'function', e.target.value)
                      }
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    >
                      {aggregationFunctions.map((func) => (
                        <option key={func.value} value={func.value}>
                          {func.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-400">
                      Alias (Optional)
                    </label>
                    <input
                      type="text"
                      value={metric.alias || ''}
                      onChange={(e) => handleMetricChange(index, 'alias', e.target.value)}
                      placeholder="e.g., avg_temp"
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
                    />
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveMetric(index)}
                  className="mt-6 rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                  title="Remove metric"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Group By Configuration */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Group By (Optional)
          </label>
          <button
            onClick={handleAddGroupBy}
            className="flex items-center gap-1 rounded-lg bg-purple-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600"
          >
            <Plus className="h-4 w-4" />
            Add Group
          </button>
        </div>

        <div className="space-y-2">
          {value.groupBy.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-4 text-center dark:border-gray-600 dark:bg-gray-900/50">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No grouping configured. Click "Add Group" to group by a column.
              </p>
            </div>
          ) : (
            value.groupBy.map((group, index) => (
              <div
                key={index}
                className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/50"
              >
                <select
                  value={group}
                  onChange={(e) => handleGroupByChange(index, e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                >
                  {availableColumns.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => handleRemoveGroupBy(index)}
                  className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                  title="Remove group"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
