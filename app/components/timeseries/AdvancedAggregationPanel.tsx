'use client';

import { useState, useRef, useEffect } from 'react';
import { Calculator, Plus, X, Code, Save, Star, TrendingUp, BarChart3, Sigma, Binary, Sparkles, Copy, Download, Play } from 'lucide-react';

// Extended aggregation function types
export type BasicAggFunction = 'AVG' | 'SUM' | 'MIN' | 'MAX' | 'COUNT' | 'COUNT_DISTINCT';
export type StatisticalFunction = 'STDDEV' | 'VARIANCE' | 'MEDIAN' | 'MODE' | 'PERCENTILE_25' | 'PERCENTILE_50' | 'PERCENTILE_75' | 'PERCENTILE_95' | 'PERCENTILE_99';
export type WindowFunction = 'LAG' | 'LEAD' | 'RANK' | 'DENSE_RANK' | 'ROW_NUMBER' | 'NTILE' | 'FIRST_VALUE' | 'LAST_VALUE';
export type TimeSeriesFunction = 'MOVING_AVG' | 'CUMULATIVE_SUM' | 'RATE_OF_CHANGE' | 'DELTA' | 'YEAR_OVER_YEAR' | 'MONTH_OVER_MONTH';
export type CustomFunction = 'CUSTOM_FORMULA';

export type AggregationFunction = BasicAggFunction | StatisticalFunction | WindowFunction | TimeSeriesFunction | CustomFunction;

export interface AdvancedMetric {
  id: string;
  column: string;
  function: AggregationFunction;
  alias?: string;
  customFormula?: string;
  windowSize?: number; // for moving averages, lag/lead
  partitionBy?: string[]; // for window functions
  orderBy?: { column: string; direction: 'ASC' | 'DESC' }[];
  filter?: string; // conditional aggregation
}

export interface AggregationPreset {
  id: string;
  name: string;
  description: string;
  category: 'analytics' | 'financial' | 'monitoring' | 'statistical';
  metrics: AdvancedMetric[];
  groupBy?: string[];
  timeBucket?: string;
}

interface AdvancedAggregationPanelProps {
  availableColumns?: string[];
  onApply?: (metrics: AdvancedMetric[], groupBy: string[], timeBucket: string) => void;
  onExportSQL?: (sql: string) => void;
}

export default function AdvancedAggregationPanel({
  availableColumns = ['timestamp', 'value', 'sensor_id', 'location', 'temperature', 'humidity', 'pressure', 'status'],
  onApply,
  onExportSQL,
}: AdvancedAggregationPanelProps) {
  const [showPanel, setShowPanel] = useState(false);
  const [metrics, setMetrics] = useState<AdvancedMetric[]>([]);
  const [groupBy, setGroupBy] = useState<string[]>([]);
  const [timeBucket, setTimeBucket] = useState('1h');
  const [showPresets, setShowPresets] = useState(false);
  const [showFormulaBuilder, setShowFormulaBuilder] = useState(false);
  const [selectedMetricId, setSelectedMetricId] = useState<string | null>(null);
  const [generatedSQL, setGeneratedSQL] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);

  // Close panel when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setShowPanel(false);
      }
    }

    if (showPanel) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showPanel]);

  // Aggregation function categories
  const functionCategories = {
    basic: [
      { value: 'AVG', label: 'Average', icon: '📊' },
      { value: 'SUM', label: 'Sum', icon: '➕' },
      { value: 'MIN', label: 'Minimum', icon: '⬇️' },
      { value: 'MAX', label: 'Maximum', icon: '⬆️' },
      { value: 'COUNT', label: 'Count', icon: '🔢' },
      { value: 'COUNT_DISTINCT', label: 'Count Distinct', icon: '🎯' },
    ],
    statistical: [
      { value: 'STDDEV', label: 'Std Deviation', icon: '📈' },
      { value: 'VARIANCE', label: 'Variance', icon: '📉' },
      { value: 'MEDIAN', label: 'Median', icon: '〰️' },
      { value: 'MODE', label: 'Mode', icon: '🎲' },
      { value: 'PERCENTILE_25', label: '25th Percentile', icon: '25%' },
      { value: 'PERCENTILE_50', label: '50th Percentile', icon: '50%' },
      { value: 'PERCENTILE_75', label: '75th Percentile', icon: '75%' },
      { value: 'PERCENTILE_95', label: '95th Percentile', icon: '95%' },
      { value: 'PERCENTILE_99', label: '99th Percentile', icon: '99%' },
    ],
    window: [
      { value: 'LAG', label: 'Lag (Previous)', icon: '⏪' },
      { value: 'LEAD', label: 'Lead (Next)', icon: '⏩' },
      { value: 'RANK', label: 'Rank', icon: '🏆' },
      { value: 'DENSE_RANK', label: 'Dense Rank', icon: '🥇' },
      { value: 'ROW_NUMBER', label: 'Row Number', icon: '#️⃣' },
      { value: 'NTILE', label: 'N-Tile', icon: '📊' },
      { value: 'FIRST_VALUE', label: 'First Value', icon: '1️⃣' },
      { value: 'LAST_VALUE', label: 'Last Value', icon: '🔚' },
    ],
    timeSeries: [
      { value: 'MOVING_AVG', label: 'Moving Average', icon: '📉' },
      { value: 'CUMULATIVE_SUM', label: 'Cumulative Sum', icon: '📈' },
      { value: 'RATE_OF_CHANGE', label: 'Rate of Change', icon: '⚡' },
      { value: 'DELTA', label: 'Delta (Difference)', icon: '∆' },
      { value: 'YEAR_OVER_YEAR', label: 'Year-over-Year', icon: '📅' },
      { value: 'MONTH_OVER_MONTH', label: 'Month-over-Month', icon: '📆' },
    ],
  };

  // Preset templates
  const presets: AggregationPreset[] = [
    {
      id: 'web-analytics',
      name: 'Web Analytics Dashboard',
      description: 'Page views, unique visitors, bounce rate, avg session duration',
      category: 'analytics',
      metrics: [
        { id: '1', column: 'page_views', function: 'SUM', alias: 'total_pageviews' },
        { id: '2', column: 'user_id', function: 'COUNT_DISTINCT', alias: 'unique_visitors' },
        { id: '3', column: 'session_duration', function: 'AVG', alias: 'avg_session_time' },
        { id: '4', column: 'bounce', function: 'AVG', alias: 'bounce_rate' },
      ],
      groupBy: ['date'],
      timeBucket: '1d',
    },
    {
      id: 'financial-metrics',
      name: 'Financial KPIs',
      description: 'Revenue, growth rate, moving averages, cumulative totals',
      category: 'financial',
      metrics: [
        { id: '1', column: 'revenue', function: 'SUM', alias: 'total_revenue' },
        { id: '2', column: 'revenue', function: 'MOVING_AVG', windowSize: 7, alias: 'ma_7day' },
        { id: '3', column: 'revenue', function: 'CUMULATIVE_SUM', alias: 'cumulative_revenue' },
        { id: '4', column: 'revenue', function: 'YEAR_OVER_YEAR', alias: 'yoy_growth' },
      ],
      groupBy: [],
      timeBucket: '1d',
    },
    {
      id: 'system-monitoring',
      name: 'System Performance',
      description: 'CPU, memory, latency metrics with percentiles',
      category: 'monitoring',
      metrics: [
        { id: '1', column: 'cpu_usage', function: 'AVG', alias: 'avg_cpu' },
        { id: '2', column: 'cpu_usage', function: 'PERCENTILE_95', alias: 'p95_cpu' },
        { id: '3', column: 'memory_usage', function: 'MAX', alias: 'peak_memory' },
        { id: '4', column: 'response_time', function: 'PERCENTILE_99', alias: 'p99_latency' },
      ],
      groupBy: ['server_id'],
      timeBucket: '5m',
    },
    {
      id: 'statistical-analysis',
      name: 'Statistical Analysis',
      description: 'Mean, median, std dev, variance for data quality',
      category: 'statistical',
      metrics: [
        { id: '1', column: 'value', function: 'AVG', alias: 'mean' },
        { id: '2', column: 'value', function: 'MEDIAN', alias: 'median' },
        { id: '3', column: 'value', function: 'STDDEV', alias: 'std_deviation' },
        { id: '4', column: 'value', function: 'VARIANCE', alias: 'variance' },
        { id: '5', column: 'value', function: 'MIN', alias: 'minimum' },
        { id: '6', column: 'value', function: 'MAX', alias: 'maximum' },
      ],
      groupBy: [],
      timeBucket: '1h',
    },
  ];

  const addMetric = () => {
    const newMetric: AdvancedMetric = {
      id: `metric-${Date.now()}`,
      column: availableColumns[1] || 'value',
      function: 'AVG',
    };
    setMetrics([...metrics, newMetric]);
  };

  const removeMetric = (id: string) => {
    setMetrics(metrics.filter(m => m.id !== id));
  };

  const updateMetric = (id: string, updates: Partial<AdvancedMetric>) => {
    setMetrics(metrics.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  const applyPreset = (preset: AggregationPreset) => {
    setMetrics(preset.metrics);
    setGroupBy(preset.groupBy || []);
    setTimeBucket(preset.timeBucket || '1h');
    setShowPresets(false);
  };

  const generateSQL = () => {
    let sql = 'SELECT\n';

    // Add time bucket
    sql += `  TIME_BUCKET('${timeBucket}', timestamp) AS time_bucket,\n`;

    // Add metrics
    metrics.forEach((metric, idx) => {
      const isLast = idx === metrics.length - 1 && groupBy.length === 0;
      const alias = metric.alias || `${metric.function.toLowerCase()}_${metric.column}`;

      if (metric.function === 'CUSTOM_FORMULA' && metric.customFormula) {
        sql += `  ${metric.customFormula} AS ${alias}${isLast ? '\n' : ',\n'}`;
      } else if (['LAG', 'LEAD', 'RANK', 'DENSE_RANK', 'ROW_NUMBER', 'NTILE', 'FIRST_VALUE', 'LAST_VALUE'].includes(metric.function)) {
        const windowSize = metric.windowSize || 1;
        sql += `  ${metric.function}(${metric.column}${metric.function === 'NTILE' ? `, ${windowSize}` : ''}) OVER (`;
        if (metric.partitionBy && metric.partitionBy.length > 0) {
          sql += `PARTITION BY ${metric.partitionBy.join(', ')} `;
        }
        if (metric.orderBy && metric.orderBy.length > 0) {
          sql += `ORDER BY ${metric.orderBy.map(o => `${o.column} ${o.direction}`).join(', ')}`;
        }
        sql += `) AS ${alias}${isLast ? '\n' : ',\n'}`;
      } else if (metric.function === 'MOVING_AVG') {
        const windowSize = metric.windowSize || 7;
        sql += `  AVG(${metric.column}) OVER (ORDER BY timestamp ROWS BETWEEN ${windowSize - 1} PRECEDING AND CURRENT ROW) AS ${alias}${isLast ? '\n' : ',\n'}`;
      } else if (metric.function === 'CUMULATIVE_SUM') {
        sql += `  SUM(${metric.column}) OVER (ORDER BY timestamp ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS ${alias}${isLast ? '\n' : ',\n'}`;
      } else if (metric.function === 'RATE_OF_CHANGE') {
        sql += `  (${metric.column} - LAG(${metric.column}) OVER (ORDER BY timestamp)) / LAG(${metric.column}) OVER (ORDER BY timestamp) * 100 AS ${alias}${isLast ? '\n' : ',\n'}`;
      } else if (metric.function === 'DELTA') {
        sql += `  ${metric.column} - LAG(${metric.column}) OVER (ORDER BY timestamp) AS ${alias}${isLast ? '\n' : ',\n'}`;
      } else {
        const funcMap: Record<string, string> = {
          'PERCENTILE_25': 'PERCENTILE_CONT(0.25)',
          'PERCENTILE_50': 'PERCENTILE_CONT(0.50)',
          'PERCENTILE_75': 'PERCENTILE_CONT(0.75)',
          'PERCENTILE_95': 'PERCENTILE_CONT(0.95)',
          'PERCENTILE_99': 'PERCENTILE_CONT(0.99)',
          'STDDEV': 'STDDEV_SAMP',
          'VARIANCE': 'VAR_SAMP',
        };
        const funcName = funcMap[metric.function] || metric.function;
        sql += `  ${funcName}(${metric.column})`;
        if (metric.filter) {
          sql += ` FILTER (WHERE ${metric.filter})`;
        }
        sql += ` AS ${alias}${isLast ? '\n' : ',\n'}`;
      }
    });

    // Add group by columns
    if (groupBy.length > 0) {
      groupBy.forEach((col, idx) => {
        sql += `  ${col}${idx === groupBy.length - 1 ? '\n' : ',\n'}`;
      });
    }

    sql += 'FROM timeseries_data\n';
    sql += 'GROUP BY time_bucket';

    if (groupBy.length > 0) {
      sql += ', ' + groupBy.join(', ');
    }

    sql += '\nORDER BY time_bucket DESC;';

    setGeneratedSQL(sql);
    return sql;
  };

  const getFunctionColor = (func: AggregationFunction) => {
    if (['AVG', 'SUM', 'MIN', 'MAX', 'COUNT', 'COUNT_DISTINCT'].includes(func)) {
      return 'from-blue-600 to-blue-700';
    } else if (['STDDEV', 'VARIANCE', 'MEDIAN', 'MODE'].includes(func) || func.includes('PERCENTILE')) {
      return 'from-purple-600 to-purple-700';
    } else if (['LAG', 'LEAD', 'RANK', 'DENSE_RANK', 'ROW_NUMBER', 'NTILE', 'FIRST_VALUE', 'LAST_VALUE'].includes(func)) {
      return 'from-green-600 to-green-700';
    } else if (['MOVING_AVG', 'CUMULATIVE_SUM', 'RATE_OF_CHANGE', 'DELTA', 'YEAR_OVER_YEAR', 'MONTH_OVER_MONTH'].includes(func)) {
      return 'from-orange-600 to-orange-700';
    }
    return 'from-gray-600 to-gray-700';
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Aggregation Button - Icon Only */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className={`group relative p-2.5 rounded-lg border transition-all shadow-sm hover:shadow-md ${
          metrics.length > 0
            ? 'border-purple-200 dark:border-purple-700 bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300'
            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
        }`}
        title="Advanced Aggregations"
      >
        <Calculator className="h-4 w-4" />
        {metrics.length > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-purple-700 text-xs font-bold text-white shadow-lg">
            {metrics.length}
          </span>
        )}
        <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
          Aggregations {metrics.length > 0 && `(${metrics.length})`}
        </span>
      </button>

      {/* Advanced Aggregation Panel */}
      {showPanel && (
        <div className="absolute right-0 top-full mt-3 w-[900px] rounded-2xl border border-gray-200/50 bg-white/95 backdrop-blur-xl shadow-2xl dark:border-gray-700/50 dark:bg-gray-800/95 max-h-[700px] overflow-hidden flex flex-col" style={{ zIndex: 9999 }}>
          {/* Header */}
          <div className="border-b border-gray-200 dark:border-gray-700/50 bg-gradient-to-r from-purple-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-850 dark:to-gray-900 px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 shadow-lg">
                  <Calculator className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Advanced Aggregations & Analytics
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                    Statistical functions, window operations, time-series analysis
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPresets(!showPresets)}
                  className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-xs rounded-lg font-semibold transition-all flex items-center gap-1.5"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Templates
                </button>
                <button
                  onClick={() => setShowPanel(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Presets Modal */}
          {showPresets && (
            <div className="absolute inset-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm z-10 overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-bold text-gray-900 dark:text-white">Aggregation Templates</h4>
                <button
                  onClick={() => setShowPresets(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {presets.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => applyPreset(preset)}
                    className="text-left p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all group"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h5 className="text-sm font-bold text-gray-900 dark:text-white">{preset.name}</h5>
                      <span className="px-2 py-0.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white text-xs rounded-full">
                        {preset.category}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                      {preset.description}
                    </p>
                    <div className="text-xs text-gray-500 dark:text-gray-500">
                      {preset.metrics.length} metrics • {preset.groupBy?.length || 0} groups
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Time Bucket */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Time Bucket Interval
              </label>
              <div className="flex flex-wrap gap-2">
                {['1m', '5m', '15m', '30m', '1h', '6h', '12h', '1d', '7d'].map((bucket) => (
                  <button
                    key={bucket}
                    onClick={() => setTimeBucket(bucket)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      timeBucket === bucket
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {bucket}
                  </button>
                ))}
              </div>
            </div>

            {/* Metrics */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Aggregation Metrics
                </label>
                <button
                  onClick={addMetric}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-xs rounded-lg font-semibold transition-all"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Metric
                </button>
              </div>

              {metrics.length === 0 ? (
                <div className="py-12 text-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl">
                  <Calculator className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">No metrics configured</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    Add metrics to start building aggregations
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {metrics.map((metric) => (
                    <div
                      key={metric.id}
                      className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/50 dark:to-gray-800/50 p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r ${getFunctionColor(metric.function)} flex-shrink-0 shadow-md`}>
                          <Sigma className="h-4 w-4 text-white" />
                        </div>

                        <div className="flex-1 space-y-3">
                          {/* Main Config */}
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-400 mb-1">
                                Column
                              </label>
                              <select
                                value={metric.column}
                                onChange={(e) => updateMetric(metric.id, { column: e.target.value })}
                                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500"
                              >
                                {availableColumns.map((col) => (
                                  <option key={col} value={col}>{col}</option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-400 mb-1">
                                Function
                              </label>
                              <select
                                value={metric.function}
                                onChange={(e) => updateMetric(metric.id, { function: e.target.value as AggregationFunction })}
                                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500"
                              >
                                <optgroup label="📊 Basic">
                                  {functionCategories.basic.map(f => (
                                    <option key={f.value} value={f.value}>{f.label}</option>
                                  ))}
                                </optgroup>
                                <optgroup label="📈 Statistical">
                                  {functionCategories.statistical.map(f => (
                                    <option key={f.value} value={f.value}>{f.label}</option>
                                  ))}
                                </optgroup>
                                <optgroup label="🪟 Window">
                                  {functionCategories.window.map(f => (
                                    <option key={f.value} value={f.value}>{f.label}</option>
                                  ))}
                                </optgroup>
                                <optgroup label="⏱️ Time Series">
                                  {functionCategories.timeSeries.map(f => (
                                    <option key={f.value} value={f.value}>{f.label}</option>
                                  ))}
                                </optgroup>
                              </select>
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-400 mb-1">
                                Alias
                              </label>
                              <input
                                type="text"
                                value={metric.alias || ''}
                                onChange={(e) => updateMetric(metric.id, { alias: e.target.value })}
                                placeholder="Result name"
                                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500"
                              />
                            </div>
                          </div>

                          {/* Window Size for certain functions */}
                          {['MOVING_AVG', 'LAG', 'LEAD', 'NTILE'].includes(metric.function) && (
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-400 mb-1">
                                  Window Size / Offset
                                </label>
                                <input
                                  type="number"
                                  value={metric.windowSize || 1}
                                  onChange={(e) => updateMetric(metric.id, { windowSize: parseInt(e.target.value) })}
                                  min="1"
                                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500"
                                />
                              </div>
                            </div>
                          )}

                          {/* Filter condition */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-400 mb-1">
                              Filter (WHERE clause) - Optional
                            </label>
                            <input
                              type="text"
                              value={metric.filter || ''}
                              onChange={(e) => updateMetric(metric.id, { filter: e.target.value })}
                              placeholder="e.g., status = 'active' AND value > 100"
                              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500"
                            />
                          </div>
                        </div>

                        <button
                          onClick={() => removeMetric(metric.id)}
                          className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-all"
                          title="Remove metric"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Group By */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Group By Columns (Optional)
              </label>
              <div className="flex flex-wrap gap-2">
                {availableColumns.filter(col => col !== 'timestamp').map((col) => (
                  <button
                    key={col}
                    onClick={() => {
                      if (groupBy.includes(col)) {
                        setGroupBy(groupBy.filter(g => g !== col));
                      } else {
                        setGroupBy([...groupBy, col]);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      groupBy.includes(col)
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {col}
                  </button>
                ))}
              </div>
            </div>

            {/* Generated SQL Preview */}
            {generatedSQL && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Generated SQL Query
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(generatedSQL);
                        alert('SQL copied to clipboard!');
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded-lg font-semibold transition-all"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </button>
                    {onExportSQL && (
                      <button
                        onClick={() => onExportSQL(generatedSQL)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg font-semibold transition-all"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Export
                      </button>
                    )}
                  </div>
                </div>
                <pre className="p-4 rounded-xl bg-gray-900 dark:bg-black text-green-400 text-xs font-mono overflow-x-auto border border-gray-700">
                  {generatedSQL}
                </pre>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="border-t border-gray-200 dark:border-gray-700/50 p-6 bg-gray-50 dark:bg-gray-900/50 flex gap-3">
            <button
              onClick={() => {
                const sql = generateSQL();
                if (onExportSQL) onExportSQL(sql);
              }}
              className="flex-1 flex items-center justify-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              <Code className="h-4 w-4" />
              Generate SQL
            </button>
            <button
              onClick={() => {
                if (onApply) onApply(metrics, groupBy, timeBucket);
                setShowPanel(false);
              }}
              className="flex-1 flex items-center justify-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              <Play className="h-4 w-4" />
              Apply Aggregations
            </button>
            <button
              onClick={() => setShowPanel(false)}
              className="px-6 py-3.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
