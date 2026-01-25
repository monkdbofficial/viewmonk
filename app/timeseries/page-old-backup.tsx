'use client';

import { useState, useEffect } from 'react';
import {
  Database,
  RefreshCw,
  Settings,
  TrendingUp,
  BarChart3,
  Activity,
  Trash2,
  Table as TableIcon,
  LineChart,
  AreaChart,
  Filter,
  Eye,
  EyeOff,
  Grid3x3,
  PieChart,
  Gauge,
  Sparkles,
  TrendingDown,
} from 'lucide-react';
import { useActiveConnection } from '../lib/monkdb-context';
import { useToast } from '../components/ToastContext';
import TimeSeriesChart, {
  TimeSeriesDataPoint,
} from '../components/timeseries/TimeSeriesChart';
import DateRangePicker, { DateRange } from '../components/timeseries/DateRangePicker';
import TimeSeriesTableSelector, { TimeSeriesTableSelection } from '../components/timeseries/TimeSeriesTableSelector';
import DashboardManager, { Dashboard } from '../components/timeseries/DashboardManager';
import { subHours } from 'date-fns';

// Types
type ChartType = 'line' | 'bar' | 'area' | 'pie' | 'scatter' | 'table' | 'stat' | 'gauge' | 'heatmap' | 'funnel' | 'donut';
type ActiveTab = 'query' | 'visualizations' | 'settings';
type AggregationFunction = 'AVG' | 'SUM' | 'MIN' | 'MAX' | 'COUNT' | 'STDDEV';

interface VisualizationConfig {
  id: string;
  name: string;
  chartType: ChartType;
  schema: string;
  table: string;
  timestampColumn: string;
  metricColumns: string[];
  groupBy?: string;
  aggregation: AggregationFunction;
  whereClause?: string;
  limit: number;
  isVisible: boolean;
  data?: any;
  loading?: boolean;
  error?: string;
}

// Helper function to convert timestamp strings to Date objects
const convertTimestampsToDate = (data: any, chartType: ChartType): any => {
  if (!data) return data;

  try {
    switch (chartType) {
      case 'line':
      case 'area':
        // Array of series, each with data points
        return data.map((series: any) => ({
          ...series,
          data: series.data.map((point: any) => ({
            ...point,
            timestamp: typeof point.timestamp === 'string' ? new Date(point.timestamp) : point.timestamp
          }))
        }));

      default:
        return data;
    }
  } catch (e) {
    console.error('Error converting timestamps:', e);
    return data;
  }
};

export default function TimeSeriesAnalytics() {
  const activeConnection = useActiveConnection();
  const toast = useToast();

  // Core state
  const [activeTab, setActiveTab] = useState<ActiveTab>('query');
  const [currentDashboard, setCurrentDashboard] = useState<Dashboard | null>(null);

  // Query Builder State using TimeSeriesTableSelector
  const [tableSelection, setTableSelection] = useState<TimeSeriesTableSelection | null>(null);
  const [selectedGroupBy, setSelectedGroupBy] = useState<string>('');
  const [selectedAggregation, setSelectedAggregation] = useState<AggregationFunction>('AVG');
  const [whereClause, setWhereClause] = useState<string>('');
  const [limit, setLimit] = useState<number>(1000);

  // Visualizations State
  const [visualizations, setVisualizations] = useState<VisualizationConfig[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('timeseries-visualizations');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Convert timestamp strings back to Date objects
          return parsed.map((viz: any) => ({
            ...viz,
            data: viz.data ? convertTimestampsToDate(viz.data, viz.chartType) : undefined
          }));
        } catch (e) {
          console.error('Failed to parse saved visualizations:', e);
        }
      }
    }
    return [];
  });

  // Date range
  const [dateRange, setDateRange] = useState<DateRange>({
    start: subHours(new Date(), 24),
    end: new Date(),
  });
  const [isRealTime, setIsRealTime] = useState(false);

  // Sync visualizations with current dashboard
  useEffect(() => {
    if (currentDashboard) {
      // Load visualizations from dashboard and convert timestamps
      if (currentDashboard.widgets && currentDashboard.widgets.length > 0) {
        const convertedWidgets = currentDashboard.widgets.map((viz: any) => ({
          ...viz,
          data: viz.data ? convertTimestampsToDate(viz.data, viz.chartType) : undefined
        }));
        setVisualizations(convertedWidgets);
      } else {
        setVisualizations([]);
      }
    }
  }, [currentDashboard]);

  // Save visualizations to current dashboard
  useEffect(() => {
    if (currentDashboard && visualizations.length > 0) {
      // Update dashboard widgets
      const updatedDashboard = {
        ...currentDashboard,
        widgets: visualizations,
        updatedAt: new Date(),
      };
      // This will be handled by DashboardManager
    }
  }, [visualizations, currentDashboard]);

  // Create visualization from query
  const createVisualization = (chartType: ChartType) => {
    if (!tableSelection || !tableSelection.selectedTimestamp || tableSelection.selectedMetrics.length === 0) {
      toast.error('Incomplete Configuration', 'Please select table, timestamp column, and at least one metric');
      return;
    }

    const newViz: VisualizationConfig = {
      id: `viz-${Date.now()}`,
      name: `${tableSelection.table} - ${chartType}`,
      chartType,
      schema: tableSelection.schema,
      table: tableSelection.table,
      timestampColumn: tableSelection.selectedTimestamp,
      metricColumns: tableSelection.selectedMetrics,
      groupBy: selectedGroupBy,
      aggregation: selectedAggregation,
      whereClause,
      limit,
      isVisible: true,
    };

    setVisualizations([...visualizations, newViz]);
    setActiveTab('visualizations');
    toast.success('Visualization Created', `Added ${chartType} chart`);

    // Auto-load data
    setTimeout(() => loadVisualizationData(newViz.id), 100);
  };

  // Generate SQL for visualization
  const generateSQL = (viz: VisualizationConfig): string => {
    const fullTable = `${viz.schema}.${viz.table}`;
    const metrics = viz.metricColumns.map(col => `${viz.aggregation}(${col}) as ${col}`).join(', ');

    let sql = `SELECT ${viz.timestampColumn}, ${metrics}
FROM ${fullTable}`;

    if (viz.whereClause) {
      sql += `\nWHERE ${viz.whereClause}`;
    }

    sql += `\nGROUP BY ${viz.timestampColumn}`;

    if (viz.groupBy) {
      sql += `, ${viz.groupBy}`;
    }

    sql += `\nORDER BY ${viz.timestampColumn} DESC
LIMIT ${viz.limit}`;

    return sql;
  };

  // Load data for a visualization
  const loadVisualizationData = async (vizId: string) => {
    const viz = visualizations.find(v => v.id === vizId);
    if (!viz || !activeConnection) return;

    setVisualizations(visualizations.map(v =>
      v.id === vizId ? { ...v, loading: true, error: undefined } : v
    ));

    try {
      const sql = generateSQL(viz);
      console.log('Executing SQL:', sql);

      const result = await activeConnection.client.query(sql);

      if (result.rows && result.rows.length > 0) {
        let transformedData;

        switch (viz.chartType) {
          case 'line':
          case 'area':
            const seriesData: { [key: string]: TimeSeriesDataPoint[] } = {};

            result.rows.forEach((row: any[]) => {
              const timestamp = new Date(row[0]);

              viz.metricColumns.forEach((col, idx) => {
                if (!seriesData[col]) {
                  seriesData[col] = [];
                }
                const value = row[idx + 1];
                if (value !== null && value !== undefined) {
                  seriesData[col].push({ timestamp, value: Number(value) });
                }
              });
            });

            transformedData = Object.entries(seriesData).map(([name, data]) => ({
              name,
              data: data.sort((a, b) => {
                const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime();
                const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime();
                return timeA - timeB;
              }),
            }));
            break;

          case 'bar':
            transformedData = {
              categories: result.rows.map((row: any[]) => new Date(row[0]).toLocaleDateString()),
              series: viz.metricColumns.map((col, idx) => ({
                name: col,
                data: result.rows.map((row: any[]) => Number(row[idx + 1]) || 0),
              })),
            };
            break;

          case 'stat':
            const avgValues = viz.metricColumns.map((_col, idx) => {
              const sum = result.rows.reduce((acc, row) => acc + (Number(row[idx + 1]) || 0), 0);
              return sum / result.rows.length;
            });
            transformedData = { metrics: viz.metricColumns, values: avgValues };
            break;

          case 'table':
            transformedData = {
              columns: [viz.timestampColumn, ...viz.metricColumns],
              rows: result.rows,
            };
            break;

          default:
            transformedData = result.rows;
        }

        setVisualizations(visualizations.map(v =>
          v.id === vizId ? { ...v, data: transformedData, loading: false } : v
        ));

        toast.success('Data Loaded', `Loaded ${result.rows.length} rows`);
      } else {
        setVisualizations(visualizations.map(v =>
          v.id === vizId ? { ...v, data: null, loading: false, error: 'No data' } : v
        ));
      }
    } catch (error: any) {
      console.error('Error loading data:', error);
      setVisualizations(visualizations.map(v =>
        v.id === vizId ? { ...v, loading: false, error: error.message } : v
      ));
      toast.error('Load Failed', error.message);
    }
  };

  // Load all visible visualizations
  const loadAllVisualizations = async () => {
    for (const viz of visualizations.filter(v => v.isVisible)) {
      await loadVisualizationData(viz.id);
    }
  };

  // Remove visualization
  const removeVisualization = (vizId: string) => {
    setVisualizations(visualizations.filter(v => v.id !== vizId));
    toast.success('Removed', 'Visualization deleted');
  };

  // Toggle visibility
  const toggleVisibility = (vizId: string) => {
    setVisualizations(visualizations.map(v =>
      v.id === vizId ? { ...v, isVisible: !v.isVisible } : v
    ));
  };

  // Render chart
  const renderChart = (viz: VisualizationConfig) => {
    if (viz.loading) {
      return (
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400 mx-auto mb-3" />
            <p className="text-sm text-gray-600 dark:text-gray-400">Loading data...</p>
          </div>
        </div>
      );
    }

    if (viz.error) {
      return (
        <div className="flex h-64 items-center justify-center">
          <div className="text-center text-red-600 dark:text-red-400">
            <p className="text-sm font-medium">Error loading data</p>
            <p className="text-xs mt-1">{viz.error}</p>
          </div>
        </div>
      );
    }

    if (!viz.data) {
      return (
        <div className="flex h-64 items-center justify-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Click refresh to load data
          </p>
        </div>
      );
    }

    switch (viz.chartType) {
      case 'line':
      case 'area':
        return (
          <TimeSeriesChart
            series={viz.data}
            height={400}
            showZoomControls={true}
          />
        );

      case 'bar':
        return (
          <div className="h-96 overflow-auto">
            <div className="space-y-2">
              {viz.data.categories?.map((cat: string, idx: number) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-32 text-xs text-gray-700 dark:text-gray-300 truncate">{cat}</div>
                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-6 relative">
                    <div
                      className="bg-blue-600 dark:bg-blue-500 h-6 rounded-full flex items-center justify-end px-2"
                      style={{ width: `${Math.min(100, (viz.data.series[0]?.data[idx] || 0) / Math.max(...(viz.data.series[0]?.data || [1])) * 100)}%` }}
                    >
                      <span className="text-xs text-white font-medium">
                        {viz.data.series[0]?.data[idx]?.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'stat':
        return (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-6">
            {viz.data.metrics?.map((metric: string, idx: number) => (
              <div key={idx} className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 rounded-lg p-6 text-center border border-gray-200 dark:border-gray-700">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {viz.data.values[idx]?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  {viz.aggregation} {metric}
                </div>
              </div>
            ))}
          </div>
        );

      case 'table':
        return (
          <div className="overflow-auto max-h-96">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0">
                <tr>
                  {viz.data.columns?.map((col: string, idx: number) => (
                    <th key={idx} className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {viz.data.rows?.map((row: any[], ridx: number) => (
                  <tr key={ridx} className="border-t border-gray-200 dark:border-gray-700">
                    {row.map((cell, cidx) => (
                      <td key={cidx} className="px-3 py-2 text-gray-900 dark:text-gray-100">
                        {String(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      default:
        return <div>Unsupported chart type</div>;
    }
  };

  // If no connection
  if (!activeConnection) {
    return (
      <div className="flex h-full items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center max-w-md px-8">
          <Database className="h-16 w-16 text-blue-600 dark:text-blue-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            Connect to Database
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Connect to your database to start analyzing time-series data
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white px-6 py-4 dark:border-gray-700 dark:from-gray-800 dark:to-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Time Series Analytics
              </h1>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-green-700 dark:text-green-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-600 dark:bg-green-400 animate-pulse"></span>
                  Connected
                </span>
                <span className="text-gray-400">•</span>
                <span>{visualizations.filter(v => v.isVisible).length} visualizations</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <DashboardManager
              currentDashboard={currentDashboard}
              onSelectDashboard={setCurrentDashboard}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('query')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'query'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Query Builder
          </button>
          <button
            onClick={() => setActiveTab('visualizations')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'visualizations'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Visualizations ({visualizations.length})
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'settings'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Settings
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Query Builder Tab */}
        {activeTab === 'query' && (
          <div className="max-w-4xl mx-auto space-y-6 pb-96">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Filter className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                Configure Time Series Query
              </h2>

              {/* Table and Column Selection using TimeSeriesTableSelector */}
              <div className="space-y-4 relative">
                <TimeSeriesTableSelector
                  onSelectionChange={setTableSelection}
                />

                {tableSelection && (
                  <>

                    {/* Aggregation */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Aggregation Function
                      </label>
                      <select
                        value={selectedAggregation}
                        onChange={(e) => setSelectedAggregation(e.target.value as AggregationFunction)}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm"
                      >
                        <option value="AVG">Average (AVG)</option>
                        <option value="SUM">Sum (SUM)</option>
                        <option value="MIN">Minimum (MIN)</option>
                        <option value="MAX">Maximum (MAX)</option>
                        <option value="COUNT">Count (COUNT)</option>
                        <option value="STDDEV">Standard Deviation (STDDEV)</option>
                      </select>
                    </div>

                    {/* Group By (Optional) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Group By (Optional)
                      </label>
                      <select
                        value={selectedGroupBy}
                        onChange={(e) => setSelectedGroupBy(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm"
                      >
                        <option value="">-- No grouping --</option>
                        {tableSelection.textColumns.map(col => (
                          <option key={col.name} value={col.name}>
                            {col.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* WHERE Clause */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Filter (WHERE Clause) - Optional
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., value > 100 AND status = 'active'"
                        value={whereClause}
                        onChange={(e) => setWhereClause(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm"
                      />
                    </div>

                    {/* Limit */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Limit (Max Rows)
                      </label>
                      <input
                        type="number"
                        value={limit}
                        onChange={(e) => setLimit(parseInt(e.target.value))}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm"
                        min="1"
                        max="10000"
                      />
                    </div>

                    {/* Create Visualization Buttons */}
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Create Visualization - All Enterprise Chart Types
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {[
                          { type: 'line' as ChartType, icon: LineChart, label: 'Line Chart', desc: 'Trends over time' },
                          { type: 'area' as ChartType, icon: AreaChart, label: 'Area Chart', desc: 'Filled trends' },
                          { type: 'bar' as ChartType, icon: BarChart3, label: 'Bar Chart', desc: 'Compare values' },
                          { type: 'pie' as ChartType, icon: PieChart, label: 'Pie Chart', desc: 'Proportions' },
                          { type: 'donut' as ChartType, icon: TrendingDown, label: 'Donut Chart', desc: 'Ring proportions' },
                          { type: 'gauge' as ChartType, icon: Gauge, label: 'Gauge', desc: 'Single metric' },
                          { type: 'stat' as ChartType, icon: Activity, label: 'Stat Card', desc: 'KPI numbers' },
                          { type: 'heatmap' as ChartType, icon: Grid3x3, label: 'Heatmap', desc: 'Density map' },
                          { type: 'funnel' as ChartType, icon: TrendingDown, label: 'Funnel', desc: 'Conversion flow' },
                          { type: 'table' as ChartType, icon: TableIcon, label: 'Data Table', desc: 'Raw data' },
                        ].map(({ type, icon: Icon, label, desc }) => (
                          <button
                            key={type}
                            onClick={() => createVisualization(type)}
                            className="flex flex-col items-center gap-2 p-3 rounded-lg border-2 border-gray-300 dark:border-gray-600 hover:border-blue-600 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group"
                          >
                            <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
                            <div className="text-center">
                              <div className="text-xs font-medium text-gray-900 dark:text-white">
                                {label}
                              </div>
                              <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                                {desc}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Visualizations Tab */}
        {activeTab === 'visualizations' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Active Visualizations
              </h2>
              <button
                onClick={loadAllVisualizations}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh All
              </button>
            </div>

            {/* Date Range Picker */}
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
              isRealTime={isRealTime}
              onRealTimeToggle={setIsRealTime}
            />

            {visualizations.length === 0 ? (
              <div className="flex h-96 items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
                <div className="text-center max-w-md px-8">
                  <Grid3x3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                    No Visualizations Yet
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Go to Query Builder tab to create your first visualization
                  </p>
                  <button
                    onClick={() => setActiveTab('query')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
                  >
                    Go to Query Builder
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {visualizations.map((viz) => (
                  <div
                    key={viz.id}
                    className={`rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 overflow-hidden ${
                      !viz.isVisible ? 'opacity-50' : ''
                    }`}
                  >
                    {/* Visualization Header */}
                    <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                            {viz.name}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {viz.schema}.{viz.table} • {viz.metricColumns.join(', ')}
                          </p>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => loadVisualizationData(viz.id)}
                            disabled={viz.loading}
                            className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded disabled:opacity-50"
                            title="Refresh"
                          >
                            <RefreshCw className={`h-4 w-4 ${viz.loading ? 'animate-spin' : ''}`} />
                          </button>
                          <button
                            onClick={() => toggleVisibility(viz.id)}
                            className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                            title={viz.isVisible ? 'Hide' : 'Show'}
                          >
                            {viz.isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => removeVisualization(viz.id)}
                            className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                            title="Remove"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Visualization Content */}
                    {viz.isVisible && (
                      <div className="p-4">
                        {renderChart(viz)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Settings className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                Dashboard Settings
              </h2>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Saved Visualizations
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    You have {visualizations.length} saved visualization(s)
                  </p>
                </div>

                <div>
                  <button
                    onClick={() => {
                      if (confirm('This will delete all saved visualizations. Continue?')) {
                        setVisualizations([]);
                        localStorage.removeItem('timeseries-visualizations');
                        toast.success('Cleared', 'All visualizations removed');
                      }
                    }}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium"
                  >
                    Clear All Visualizations
                  </button>
                </div>

                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    About
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Time Series Analytics Dashboard v1.0
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
