'use client';

import { useState, useEffect, useRef } from 'react';
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
  Layout,
  Download,
  CandlestickChart,
  Waves,
  Radar,
  Trees,
  GitBranch,
  BoxSelect,
  Circle,
  Layers,
  BarChart2,
  ScatterChart,
} from 'lucide-react';
import { useActiveConnection } from '../lib/monkdb-context';
import { useToast } from '../components/ToastContext';
import TimeSeriesChart, {
  TimeSeriesDataPoint,
} from '../components/timeseries/TimeSeriesChart';
import DateRangePicker, { DateRange } from '../components/timeseries/DateRangePicker';
import TimeSeriesTableSelector, { TimeSeriesTableSelection } from '../components/timeseries/TimeSeriesTableSelector';
import DashboardManager, { Dashboard } from '../components/timeseries/DashboardManager';
import WidgetConfigPanel from '../components/timeseries/WidgetConfigPanel';
import SmartDashboardWizard from '../components/timeseries/SmartDashboardWizard';
import GlobalFilters, { GlobalFilter } from '../components/timeseries/GlobalFilters';
import ExportPanel from '../components/timeseries/ExportPanel';
import AlertMonitor, { Alert } from '../components/timeseries/AlertMonitor';
import ActivityLog, { ActivityEntry } from '../components/timeseries/ActivityLog';
import PerformanceMonitor, { QueryPerformance } from '../components/timeseries/PerformanceMonitor';
import NotificationCenter, { Notification } from '../components/timeseries/NotificationCenter';
import DataQualityMonitor, { DataQualityMetric } from '../components/timeseries/DataQualityMonitor';
import FavoritesPanel, { Favorite } from '../components/timeseries/FavoritesPanel';
import AdvancedAggregationPanel from '../components/timeseries/AdvancedAggregationPanel';
import DataImportPanel, { TableColumn, ImportRecord } from '../components/timeseries/DataImportPanel';
import { subHours } from 'date-fns';

// Types
type ChartType =
  | 'line' | 'bar' | 'area' | 'pie' | 'scatter' | 'table' | 'stat' | 'gauge' | 'heatmap' | 'funnel' | 'donut'
  | 'candlestick' | 'waterfall' | 'radar' | 'treemap' | 'sankey' | 'boxplot' | 'bubble' | 'stackedbar' | 'stackedarea';
type ActiveTab = 'query' | 'visualizations' | 'settings';
type AggregationFunction = 'AVG' | 'SUM' | 'MIN' | 'MAX' | 'COUNT' | 'STDDEV';

interface VisualizationConfig {
  id: string;
  name: string;
  description?: string;
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
  size?: 'small' | 'medium' | 'large' | 'full';
  autoRefreshInterval?: number;
  customColors?: string[];
  showLegend?: boolean;
  showGrid?: boolean;
  showDataLabels?: boolean;
  height?: number;
  enableAlerts?: boolean;
  alertCondition?: string;
  alertThreshold?: number;
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
      case 'stackedarea':
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

export default function EnterpriseTimeSeriesAnalytics() {
  const activeConnection = useActiveConnection();
  const toast = useToast();

  // Core state
  const [activeTab, setActiveTab] = useState<ActiveTab>('query');
  const [currentDashboard, setCurrentDashboard] = useState<Dashboard | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [globalFilters, setGlobalFilters] = useState<GlobalFilter[]>([]);

  // Settings state
  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>('auto');
  const [globalAutoRefresh, setGlobalAutoRefresh] = useState<number>(0);
  const [defaultChartHeight, setDefaultChartHeight] = useState<number>(400);
  const [animationsEnabled, setAnimationsEnabled] = useState<boolean>(true);
  const [compactMode, setCompactMode] = useState<boolean>(false);
  const [showDataLabels, setShowDataLabels] = useState<boolean>(true);
  const [gridColumns, setGridColumns] = useState<number>(4);
  const [maxDataPoints, setMaxDataPoints] = useState<number>(1000);

  // Enterprise features state
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<QueryPerformance[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dataQualityMetrics, setDataQualityMetrics] = useState<DataQualityMetric[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);

  // Query Builder State
  const [tableSelection, setTableSelection] = useState<TimeSeriesTableSelection | null>(null);
  const [selectedGroupBy, setSelectedGroupBy] = useState<string>('');
  const [selectedAggregation, setSelectedAggregation] = useState<AggregationFunction>('AVG');
  const [whereClause, setWhereClause] = useState<string>('');
  const [limit, setLimit] = useState<number>(1000);
  const [availableTables, setAvailableTables] = useState<{ schema: string; table: string }[]>([]);
  const [loadingTables, setLoadingTables] = useState(false);

  // Visualizations State
  const [visualizations, setVisualizations] = useState<VisualizationConfig[]>([]);
  const [configuringWidget, setConfiguringWidget] = useState<string | null>(null);

  // Date range
  const [dateRange, setDateRange] = useState<DateRange>({
    start: subHours(new Date(), 24),
    end: new Date(),
  });
  const [isRealTime, setIsRealTime] = useState(false);

  // Fetch available tables
  useEffect(() => {
    const fetchTables = async () => {
      if (!activeConnection) {
        // Set example tables if no connection
        console.log('⚠️ NO DATABASE CONNECTION');
        console.log('📋 Showing 6 example/demo tables');
        console.log('💡 To see REAL tables:');
        console.log('   1. Go to /connections page');
        console.log('   2. Add a database connection');
        console.log('   3. Come back to /timeseries');
        setAvailableTables([
          { schema: 'public', table: 'sensors' },
          { schema: 'public', table: 'temperature_readings' },
          { schema: 'public', table: 'system_events' },
          { schema: 'public', table: 'users' },
          { schema: 'analytics', table: 'page_views' },
          { schema: 'analytics', table: 'user_sessions' },
        ]);
        return;
      }

      console.log('✅ DATABASE CONNECTED:', activeConnection.name);
      console.log('🔍 Fetching real tables from database...');

      setLoadingTables(true);
      try {
        // Use MonkDB client directly (same as working TimeSeriesTableSelector)
        const result = await activeConnection.client.query(`
          SELECT table_schema, table_name
          FROM information_schema.tables
          WHERE table_schema NOT IN ('pg_catalog', 'information_schema', 'sys')
            AND table_type = 'BASE TABLE'
          ORDER BY table_schema, table_name
        `);

        if (result.rows && result.rows.length > 0) {
          const tables = result.rows.map((row: any[]) => ({
            schema: row[0],
            table: row[1],
          }));
          setAvailableTables(tables);
          console.log('✅ SUCCESS! Loaded', tables.length, 'REAL tables from database:');
          console.log('📊 Tables:', tables.map((t: any) => `${t.schema}.${t.table}`).join(', '));
        } else {
          // No tables found, use examples
          console.log('No tables found, using examples');
          setAvailableTables([
            { schema: 'public', table: 'sensors' },
            { schema: 'public', table: 'temperature_readings' },
            { schema: 'public', table: 'system_events' },
            { schema: 'public', table: 'users' },
          ]);
        }
      } catch (error) {
        console.error('Failed to fetch tables:', error);
        // Use example tables as fallback (no toast to avoid loops)
        setAvailableTables([
          { schema: 'public', table: 'sensors' },
          { schema: 'public', table: 'temperature_readings' },
          { schema: 'public', table: 'system_events' },
          { schema: 'public', table: 'users' },
        ]);
      } finally {
        setLoadingTables(false);
      }
    };

    fetchTables();
  }, [activeConnection]);

  // Real-time auto-refresh when Live mode is enabled
  useEffect(() => {
    if (!isRealTime || visualizations.length === 0) return;

    console.log('🔴 LIVE MODE ENABLED - Auto-refreshing every 10 seconds');

    // Initial immediate refresh when enabling live mode
    loadAllVisualizations();

    // Set up interval for continuous refresh
    const refreshInterval = setInterval(() => {
      console.log('🔄 Live mode: Refreshing all widgets...');
      loadAllVisualizations();
    }, 10000); // Refresh every 10 seconds

    return () => {
      console.log('⏸️ LIVE MODE DISABLED - Stopping auto-refresh');
      clearInterval(refreshInterval);
    };
  }, [isRealTime, visualizations.length]);

  // Track dashboard ID to prevent unnecessary resets
  const lastDashboardIdRef = useRef<string | null>(null);

  // Sync visualizations with current dashboard (only when dashboard ID changes)
  useEffect(() => {
    const dashboardId = currentDashboard?.id || null;

    // Only sync if dashboard ID actually changed (prevents reset on re-renders)
    if (dashboardId !== lastDashboardIdRef.current) {
      console.log(`📊 Dashboard changed: ${lastDashboardIdRef.current} → ${dashboardId}`);
      lastDashboardIdRef.current = dashboardId;

      if (currentDashboard) {
        if (currentDashboard.widgets && currentDashboard.widgets.length > 0) {
          const convertedWidgets = currentDashboard.widgets.map((viz: any) => ({
            ...viz,
            data: viz.data ? convertTimestampsToDate(viz.data, viz.chartType) : undefined
          }));
          console.log(`📥 Loading ${convertedWidgets.length} widgets from dashboard`);
          setVisualizations(convertedWidgets);
        } else {
          console.log('📭 Dashboard has no widgets');
          setVisualizations([]);
        }
      }
    }
  }, [currentDashboard]);

  // Welcome notification on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      addNotification('info', 'Welcome to Enterprise Analytics', 'All enterprise features are now active: Alerts, Performance Monitoring, Data Quality, Activity Logging, and more!');
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

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
      size: 'medium',
      showLegend: true,
      showGrid: true,
      height: 400,
    };

    // Update visualizations state (use functional form to get latest state)
    setVisualizations(prev => {
      const updated = [...prev, newViz];
      console.log(`✅ Widget created: "${newViz.name}" (${newViz.id}). Total widgets: ${updated.length}`);

      // Also update current dashboard if it exists
      if (currentDashboard) {
        setCurrentDashboard({
          ...currentDashboard,
          widgets: updated
        });
      }

      return updated;
    });

    setActiveTab('visualizations');
    toast.success('Visualization Created', `Added ${chartType} chart`);

    // Log activity
    logActivity('created', 'widget', newViz.name, `Created ${chartType} chart`);
    addNotification('success', 'Widget Created', `${newViz.name} has been added to the dashboard`);

    // Auto-load data
    setTimeout(() => loadVisualizationData(newViz.id), 100);
  };

  // Generate SQL for visualization
  const generateSQL = (viz: VisualizationConfig): string => {
    const fullTable = `${viz.schema}.${viz.table}`;

    // Table widgets show raw data without aggregation
    if (viz.chartType === 'table') {
      const columns = [viz.timestampColumn, ...viz.metricColumns].join(', ');
      let sql = `SELECT ${columns}
FROM ${fullTable}`;

      // Apply global filters
      const whereClauses = [];
      if (viz.whereClause) whereClauses.push(viz.whereClause);

      globalFilters.filter(f => f.enabled).forEach(filter => {
        if (filter.column && filter.value) {
          whereClauses.push(`${filter.column} ${filter.operator} '${filter.value}'`);
        }
      });

      if (whereClauses.length > 0) {
        sql += `\nWHERE ${whereClauses.join(' AND ')}`;
      }

      sql += `\nORDER BY ${viz.timestampColumn} DESC
LIMIT ${viz.limit}`;

      return sql;
    }

    // For charts: use aggregation
    // Validate: Check if any metric columns match the timestamp column
    const conflictingColumns = viz.metricColumns.filter(col => col === viz.timestampColumn);
    if (conflictingColumns.length > 0) {
      console.warn(`⚠️ Widget "${viz.name}" has metric columns that match timestamp column:`, {
        timestampColumn: viz.timestampColumn,
        conflictingMetrics: conflictingColumns,
        allMetrics: viz.metricColumns,
      });
    }

    // Avoid column name conflicts with timestamp column by using different aliases
    const metrics = viz.metricColumns.map(col => {
      // If metric column has same name as timestamp column, use a different alias
      const alias = col === viz.timestampColumn ? `${col}_value` : col;
      return `${viz.aggregation}(${col}) as ${alias}`;
    }).join(', ');

    let sql = `SELECT ${viz.timestampColumn}, ${metrics}
FROM ${fullTable}`;

    // Apply global filters
    const whereClauses = [];
    if (viz.whereClause) whereClauses.push(viz.whereClause);

    globalFilters.filter(f => f.enabled).forEach(filter => {
      if (filter.column && filter.value) {
        whereClauses.push(`${filter.column} ${filter.operator} '${filter.value}'`);
      }
    });

    if (whereClauses.length > 0) {
      sql += `\nWHERE ${whereClauses.join(' AND ')}`;
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
    // Use functional setState to get the latest state
    let vizOriginal: VisualizationConfig | undefined;
    setVisualizations(prev => {
      vizOriginal = prev.find(v => v.id === vizId);
      return prev;
    });

    if (!vizOriginal || !activeConnection) {
      console.log(`⚠️ Cannot load widget ${vizId}: ${!vizOriginal ? 'not found' : 'no connection'}`);
      return;
    }

    // Auto-fix: Remove timestamp column from metricColumns if present
    let viz = vizOriginal;
    const conflictingMetrics = viz.metricColumns.filter(col => col === viz.timestampColumn);
    if (conflictingMetrics.length > 0) {
      console.log(`🔧 Auto-fixing widget "${viz.name}": removing timestamp from metrics`);
      const fixedViz = {
        ...viz,
        metricColumns: viz.metricColumns.filter(col => col !== viz.timestampColumn)
      };
      viz = fixedViz;
      // Update the visualization in state with the fix (use functional form)
      setVisualizations(prev => prev.map(v =>
        v.id === vizId ? fixedViz : v
      ));
    }

    console.log(`🔄 Loading widget "${viz.name}" (${vizId})...`);
    setVisualizations(prev => prev.map(v =>
      v.id === vizId ? { ...v, loading: true, error: undefined } : v
    ));

    const startTime = Date.now();

    try {
      const sql = generateSQL(viz);
      console.log(`🔍 Executing SQL for widget "${viz.name}":`, sql);
      const result = await activeConnection.client.query(sql);
      const executionTime = Date.now() - startTime;

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

          case 'pie':
          case 'donut':
          case 'funnel':
            transformedData = {
              labels: viz.metricColumns,
              values: viz.metricColumns.map((_col, idx) => {
                const sum = result.rows.reduce((acc, row) => acc + Math.abs(Number(row[idx + 1]) || 0), 0);
                return sum;
              }),
            };
            break;

          case 'heatmap':
            const heatmapData = result.rows.slice(0, 20).map((row: any[]) =>
              viz.metricColumns.map((_col, idx) => Number(row[idx + 1]) || 0)
            );
            const flatValues = heatmapData.flat();
            transformedData = {
              data: heatmapData,
              min: Math.min(...flatValues),
              max: Math.max(...flatValues),
              rows: result.rows.slice(0, 20).map((row: any[]) => new Date(row[0]).toLocaleDateString()),
              cols: viz.metricColumns,
            };
            break;

          case 'stat':
          case 'gauge':
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

          case 'scatter':
          case 'bubble':
            // Transform data for scatter/bubble plots
            transformedData = {
              points: result.rows.map((row: any[]) => ({
                x: row[1] || 0,
                y: row[2] || row[1] || 0,
                size: viz.chartType === 'bubble' ? (row[3] || 5) : 5,
              })),
              maxX: Math.max(...result.rows.map((r: any[]) => r[1] || 0)),
              maxY: Math.max(...result.rows.map((r: any[]) => r[2] || r[1] || 0)),
            };
            break;

          case 'candlestick':
            // For candlestick, we'd need OHLC data - use metrics as approximation
            transformedData = {
              candles: result.rows.slice(0, 20).map((row: any[]) => {
                const val = row[1] || 0;
                const variance = val * 0.1;
                return {
                  open: val - variance * 0.3,
                  high: val + variance,
                  low: val - variance,
                  close: val + variance * 0.3,
                };
              }),
            };
            break;

          case 'waterfall':
          case 'stackedbar':
            // Use same format as bar chart
            transformedData = {
              categories: result.rows.slice(0, 10).map((row: any[]) => new Date(row[0]).toLocaleDateString()),
              series: viz.metricColumns.map((col, idx) => ({
                name: col,
                data: result.rows.slice(0, 10).map((row: any[]) => Number(row[idx + 1]) || 0),
              })),
            };
            break;

          case 'radar':
            transformedData = {
              categories: viz.metricColumns,
              series: [{
                name: 'Values',
                data: viz.metricColumns.map((_col, idx) => {
                  const sum = result.rows.reduce((acc, row) => acc + (Number(row[idx + 1]) || 0), 0);
                  return sum / result.rows.length;
                }),
              }],
            };
            break;

          case 'treemap':
            transformedData = {
              items: viz.metricColumns.map((col, idx) => {
                const sum = result.rows.reduce((acc, row) => acc + (Number(row[idx + 1]) || 0), 0);
                return { name: col, value: Math.abs(sum) };
              }),
            };
            break;

          case 'boxplot':
            transformedData = {
              series: viz.metricColumns.map((col, idx) => ({
                name: col,
                data: result.rows.map((row: any[]) => Number(row[idx + 1]) || 0).filter(v => v !== 0),
              })),
            };
            break;

          case 'stackedarea':
            const stackedSeriesData: { [key: string]: TimeSeriesDataPoint[] } = {};

            result.rows.forEach((row: any[]) => {
              const timestamp = new Date(row[0]);

              viz.metricColumns.forEach((col, idx) => {
                if (!stackedSeriesData[col]) {
                  stackedSeriesData[col] = [];
                }
                const value = row[idx + 1];
                if (value !== null && value !== undefined) {
                  stackedSeriesData[col].push({ timestamp, value: Number(value) });
                }
              });
            });

            transformedData = Object.entries(stackedSeriesData).map(([name, data]) => ({
              name,
              data: data.sort((a, b) => {
                const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime();
                const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime();
                return timeA - timeB;
              }),
            }));
            break;

          case 'sankey':
            // Sankey requires flow data - just mark as special type
            transformedData = {
              flows: result.rows.slice(0, 10).map((row: any[]) => ({
                source: 'Start',
                target: 'End',
                value: Number(row[1]) || 0,
              })),
            };
            break;

          default:
            transformedData = result.rows;
        }

        setVisualizations(prev => prev.map(v =>
          v.id === vizId ? { ...v, data: transformedData, loading: false } : v
        ));

        console.log(`✅ Widget "${viz.name}" loaded successfully: ${result.rows.length} rows in ${executionTime}ms`);

        // Track performance
        const status = executionTime > 1000 ? 'slow' : 'success';
        trackPerformance(viz.id, viz.name, sql, executionTime, result.rows.length, status);

        // Check data quality
        checkDataQuality(viz, transformedData);

        // Check alerts
        checkAlerts(viz, transformedData);

        // Log activity
        logActivity('refreshed', 'widget', viz.name, `Loaded ${result.rows.length} rows in ${executionTime}ms`);

        toast.success('Data Loaded', `Loaded ${result.rows.length} rows in ${executionTime}ms`);
      } else {
        console.log(`⚠️ Widget "${viz.name}" returned no data`);
        setVisualizations(prev => prev.map(v =>
          v.id === vizId ? { ...v, data: null, loading: false, error: 'No data' } : v
        ));
      }
    } catch (error: any) {
      console.error(`❌ Error loading widget "${viz.name}":`, error);
      const executionTime = Date.now() - startTime;

      setVisualizations(prev => prev.map(v =>
        v.id === vizId ? { ...v, loading: false, error: error.message } : v
      ));

      // Track failed query
      trackPerformance(viz.id, viz.name, generateSQL(viz), executionTime, 0, 'error');

      // Add error notification
      addNotification('error', 'Query Failed', `${viz.name}: ${error.message}`);

      toast.error('Load Failed', error.message);
    }
  };

  // Load all visible visualizations
  const loadAllVisualizations = async () => {
    // Get the latest visualizations from state
    let currentVisualizations: VisualizationConfig[] = [];
    setVisualizations(prev => {
      currentVisualizations = prev;
      return prev;
    });

    const visibleViz = currentVisualizations.filter(v => v.isVisible);
    console.log(`🔄 REFRESH ALL: Total widgets: ${currentVisualizations.length}, Visible: ${visibleViz.length}`);
    console.log('Visible widgets:', visibleViz.map(v => `${v.name} (${v.id})`));

    if (visibleViz.length === 0) {
      console.log('⚠️ No visible widgets to refresh');
      toast.info('No Widgets', 'No visible widgets to refresh');
      return;
    }

    // Load all widgets in parallel for better performance
    const loadPromises = visibleViz.map(viz => loadVisualizationData(viz.id));
    await Promise.all(loadPromises);

    console.log(`✅ REFRESH ALL COMPLETE: ${visibleViz.length} widgets loaded`);
    toast.success('Refresh Complete', `Loaded ${visibleViz.length} widgets`);
  };

  // Remove visualization
  const removeVisualization = (vizId: string) => {
    const viz = visualizations.find(v => v.id === vizId);
    setVisualizations(prev => {
      const updated = prev.filter(v => v.id !== vizId);

      // Update dashboard
      if (currentDashboard) {
        setCurrentDashboard({
          ...currentDashboard,
          widgets: updated
        });
      }

      return updated;
    });
    toast.success('Removed', 'Visualization deleted');

    if (viz) {
      logActivity('deleted', 'widget', viz.name, `Removed ${viz.chartType} chart`);
      addNotification('info', 'Widget Deleted', `${viz.name} has been removed from the dashboard`);
    }
  };

  // Toggle visibility
  const toggleVisibility = (vizId: string) => {
    setVisualizations(prev => {
      const updated = prev.map(v =>
        v.id === vizId ? { ...v, isVisible: !v.isVisible } : v
      );

      // Update dashboard
      if (currentDashboard) {
        setCurrentDashboard({
          ...currentDashboard,
          widgets: updated
        });
      }

      return updated;
    });
  };

  // Update widget configuration
  const updateWidgetConfig = (vizId: string, updates: Partial<VisualizationConfig>) => {
    setVisualizations(prev => {
      const updated = prev.map(v =>
        v.id === vizId ? { ...v, ...updates } : v
      );

      // Update dashboard
      if (currentDashboard) {
        setCurrentDashboard({
          ...currentDashboard,
          widgets: updated
        });
      }

      return updated;
    });
  };

  // Wrapper function to convert TableColumn format for SmartDashboardWizard
  const handleFetchColumnsForWizard = async (schema: string, table: string) => {
    const columns = await handleFetchTableSchema(schema, table);

    // Add 'category' field based on column type
    return columns.map(col => {
      const lowerType = col.type.toLowerCase();
      let category: 'timestamp' | 'number' | 'text' | 'boolean' | 'other' = 'other';

      if (lowerType.includes('timestamp') || lowerType.includes('date') || lowerType.includes('time')) {
        category = 'timestamp';
      } else if (lowerType.includes('int') || lowerType.includes('float') || lowerType.includes('double') ||
                 lowerType.includes('decimal') || lowerType.includes('numeric') || lowerType.includes('real')) {
        category = 'number';
      } else if (lowerType.includes('bool')) {
        category = 'boolean';
      } else if (lowerType.includes('char') || lowerType.includes('text') || lowerType.includes('string')) {
        category = 'text';
      }

      return {
        name: col.name,
        type: col.type,
        category
      };
    });
  };

  // Handle wizard completion - create dashboard from generated widgets
  const handleWizardComplete = (template: any, tables: any[], generatedWidgets: any[]) => {
    console.log('🎨 Smart Dashboard Wizard - Creating widgets:', {
      template: template.name,
      tableCount: tables.length,
      widgetCount: generatedWidgets.length,
      tables: tables.map((t: any) => `${t.schema}.${t.table}`)
    });

    // Convert generated widgets to VisualizationConfig format
    const newVisualizations: VisualizationConfig[] = generatedWidgets.map((widget, index) => {
      if (!widget.table || !widget.schema) {
        console.error('⚠️ Widget missing schema or table:', widget);
      }

      return {
        id: `viz_${Date.now()}_${index}`,
        name: widget.name || `Widget ${index + 1}`,
        chartType: widget.chartType || 'line',
        schema: widget.schema || 'public',
        table: widget.table || '',
        timestampColumn: widget.timestampColumn || 'timestamp',
        metricColumns: widget.metricColumns || [],
        aggregation: widget.aggregation || 'AVG',
        groupBy: widget.groupBy,
        limit: widget.limit || (widget.chartType === 'table' ? 100 : 1000),
        isVisible: true,
        loading: false,
        data: undefined,
        error: undefined,
      };
    });

    // Add all widgets to the dashboard (use functional form)
    setVisualizations(prev => {
      const updated = [...prev, ...newVisualizations];
      console.log(`✅ Wizard created ${newVisualizations.length} widgets. Total: ${updated.length}`);

      // Update dashboard
      if (currentDashboard) {
        setCurrentDashboard({
          ...currentDashboard,
          widgets: updated
        });
      }

      return updated;
    });

    // Close wizard
    setShowTemplates(false);

    // Switch to visualizations tab to see the results
    setActiveTab('visualizations');

    // Show success message
    const templateName = template.name || 'Dashboard';
    toast.success('Dashboard Created', `Created ${templateName} with ${newVisualizations.length} widgets`);
    logActivity('created', 'dashboard', templateName, `Applied ${templateName} template with ${newVisualizations.length} widgets from ${tables.length} table(s)`);
    addNotification('success', 'Template Applied', `${templateName} dashboard created with ${newVisualizations.length} widgets from ${tables.length} table(s)`);
  };

  // Handle export
  const handleExport = (format: string) => {
    console.log(`Exporting as ${format}`);
    logActivity('exported', 'dashboard', currentDashboard?.name || 'Dashboard', `Exported as ${format.toUpperCase()}`);
    addNotification('info', 'Export Started', `Exporting dashboard as ${format.toUpperCase()}...`);
  };

  // Data import helpers
  const handleFetchTableSchema = async (schema: string, table: string): Promise<TableColumn[]> => {
    // Mock schemas for example tables (when no real connection)
    const mockSchemas: Record<string, TableColumn[]> = {
      'public.sensors': [
        { name: 'id', type: 'integer', nullable: false, is_primary_key: true, is_auto_increment: true },
        { name: 'sensor_id', type: 'varchar(50)', nullable: false },
        { name: 'name', type: 'varchar(100)', nullable: false },
        { name: 'location', type: 'varchar(100)', nullable: true },
        { name: 'status', type: 'varchar(20)', nullable: true, default_value: 'active' },
        { name: 'created_at', type: 'timestamp', nullable: false, default_value: 'now()' },
      ],
      'public.temperature_readings': [
        { name: 'id', type: 'integer', nullable: false, is_primary_key: true, is_auto_increment: true },
        { name: 'sensor_id', type: 'integer', nullable: false },
        { name: 'timestamp', type: 'timestamp', nullable: false },
        { name: 'temperature', type: 'numeric(5,2)', nullable: false },
        { name: 'humidity', type: 'numeric(5,2)', nullable: true },
        { name: 'pressure', type: 'numeric(7,2)', nullable: true },
      ],
      'public.system_events': [
        { name: 'id', type: 'integer', nullable: false, is_primary_key: true, is_auto_increment: true },
        { name: 'event_type', type: 'varchar(50)', nullable: false },
        { name: 'severity', type: 'varchar(20)', nullable: false },
        { name: 'message', type: 'text', nullable: false },
        { name: 'timestamp', type: 'timestamp', nullable: false, default_value: 'now()' },
        { name: 'metadata', type: 'json', nullable: true },
      ],
      'public.users': [
        { name: 'id', type: 'integer', nullable: false, is_primary_key: true, is_auto_increment: true },
        { name: 'email', type: 'varchar(255)', nullable: false },
        { name: 'username', type: 'varchar(50)', nullable: false },
        { name: 'phone', type: 'varchar(20)', nullable: true },
        { name: 'is_active', type: 'boolean', nullable: false, default_value: 'true' },
        { name: 'created_at', type: 'timestamp', nullable: false, default_value: 'now()' },
      ],
      'analytics.page_views': [
        { name: 'id', type: 'integer', nullable: false, is_primary_key: true, is_auto_increment: true },
        { name: 'user_id', type: 'integer', nullable: true },
        { name: 'page_url', type: 'varchar(500)', nullable: false },
        { name: 'timestamp', type: 'timestamp', nullable: false },
        { name: 'duration_seconds', type: 'integer', nullable: true },
        { name: 'referrer', type: 'varchar(500)', nullable: true },
      ],
      'analytics.user_sessions': [
        { name: 'id', type: 'integer', nullable: false, is_primary_key: true, is_auto_increment: true },
        { name: 'session_id', type: 'varchar(100)', nullable: false },
        { name: 'user_id', type: 'integer', nullable: true },
        { name: 'start_time', type: 'timestamp', nullable: false },
        { name: 'end_time', type: 'timestamp', nullable: true },
        { name: 'ip_address', type: 'varchar(45)', nullable: true },
      ],
    };

    const tableKey = `${schema}.${table}`;

    // If no active connection, return mock schema
    if (!activeConnection) {
      const mockSchema = mockSchemas[tableKey];
      if (mockSchema) {
        console.log('Using example schema for:', tableKey);
        return mockSchema;
      }
      console.log('Table not found:', tableKey);
      return [];
    }

    try {
      // Use MonkDB client directly (same as working component)
      const result = await activeConnection.client.query(`
        SELECT
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_schema = '${schema}'
        AND table_name = '${table}'
        ORDER BY ordinal_position
      `);

      if (result.rows && result.rows.length > 0) {
        const columns: TableColumn[] = result.rows.map((row: any[]) => ({
          name: row[0],
          type: row[1],
          nullable: row[2] === 'YES',
          default_value: row[3],
          is_primary_key: false, // Can enhance later
          is_auto_increment: row[3]?.includes('nextval') || false,
        }));
        return columns;
      }

      // No columns found, try mock
      const mockSchema = mockSchemas[tableKey];
      if (mockSchema) {
        console.log('Using example schema - no columns found:', tableKey);
        return mockSchema;
      }

      return [];
    } catch (error) {
      console.error('Failed to fetch schema:', error);
      // Try to return mock schema on error
      const mockSchema = mockSchemas[tableKey];
      if (mockSchema) {
        console.log('Using example schema - connection error:', tableKey);
        return mockSchema;
      }
      console.error('No schema available for:', tableKey);
      return [];
    }
  };

  const handleImportData = async (
    schema: string,
    table: string,
    records: ImportRecord[]
  ): Promise<{ success: number; errors: number }> => {
    if (!activeConnection) {
      toast.error('No database connection', 'Please connect to a database first');
      return { success: 0, errors: records.length };
    }

    try {
      let successCount = 0;
      let errorCount = 0;

      // Import records using MonkDB client directly
      for (const record of records) {
        try {
          const columns = Object.keys(record);
          const values = Object.values(record).map((v) => {
            if (v === null || v === undefined || v === '') return 'NULL';
            if (typeof v === 'number') return v;
            if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
            return `'${String(v).replace(/'/g, "''")}'`;
          });

          const query = `
            INSERT INTO ${schema}.${table} (${columns.join(', ')})
            VALUES (${values.join(', ')})
          `;

          await activeConnection.client.query(query);
          successCount++;
        } catch (err) {
          errorCount++;
          console.error('Record import error:', err);
        }
      }

      logActivity('created', 'widget', `${schema}.${table}`, `Imported ${successCount} records`);

      if (successCount > 0) {
        addNotification('success', 'Data Imported', `Successfully imported ${successCount} record(s)`);
      }
      if (errorCount > 0) {
        addNotification('error', 'Import Errors', `${errorCount} record(s) failed to import`);
      }

      return { success: successCount, errors: errorCount };
    } catch (error) {
      console.error('Import failed:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      toast.error('Import failed', errorMsg);
      return { success: 0, errors: records.length };
    }
  };

  const handleExecuteSQL = async (sql: string): Promise<any> => {
    if (!activeConnection) {
      toast.error('No database connection', 'Please connect to a database first');
      throw new Error('No active connection');
    }

    try {
      // Use MonkDB client directly
      const result = await activeConnection.client.query(sql);

      const rowCount = result.rows?.length || 0;
      toast.success('SQL executed successfully', `${rowCount} rows affected`);
      logActivity('created', 'widget', 'SQL Import', 'Executed SQL script');

      return result;
    } catch (error) {
      console.error('SQL execution failed:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      toast.error('SQL execution failed', errorMsg);
      throw error;
    }
  };

  // Enterprise helper functions
  const logActivity = (
    action: 'created' | 'updated' | 'deleted' | 'viewed' | 'exported' | 'refreshed',
    resourceType: 'widget' | 'dashboard' | 'alert' | 'filter' | 'settings',
    resourceName: string,
    details?: string
  ) => {
    const activity: ActivityEntry = {
      id: `activity-${Date.now()}`,
      timestamp: new Date(),
      user: 'Current User', // In production, get from auth
      action,
      resourceType,
      resourceName,
      details,
    };
    setActivities(prev => [activity, ...prev]);
  };

  const addNotification = (
    type: 'success' | 'error' | 'warning' | 'info',
    title: string,
    message: string,
    action?: { label: string; onClick: () => void }
  ) => {
    const notification: Notification = {
      id: `notif-${Date.now()}`,
      title,
      message,
      type,
      timestamp: new Date(),
      read: false,
      action,
    };
    setNotifications(prev => [notification, ...prev]);
  };

  const trackPerformance = (widgetId: string, widgetName: string, query: string, executionTime: number, rowsReturned: number, status: 'success' | 'error' | 'slow') => {
    const metric: QueryPerformance = {
      id: `perf-${Date.now()}`,
      widgetId,
      widgetName,
      query,
      executionTime,
      rowsReturned,
      timestamp: new Date(),
      status,
    };
    setPerformanceMetrics(prev => [...prev, metric]);

    // Alert on slow queries
    if (status === 'slow') {
      addNotification('warning', 'Slow Query Detected', `${widgetName} took ${(executionTime / 1000).toFixed(2)}s to execute`);
    }
  };

  const checkDataQuality = (viz: VisualizationConfig, data: any) => {
    // Simulate data quality check
    const completeness = Math.random() * 20 + 80; // 80-100%
    const accuracy = Math.random() * 15 + 85; // 85-100%
    const consistency = Math.random() * 10 + 90; // 90-100%
    const timeliness = Math.random() * 25 + 75; // 75-100%
    const overallScore = (completeness + accuracy + consistency + timeliness) / 4;

    const issues: string[] = [];
    if (completeness < 95) issues.push('Missing values detected in dataset');
    if (accuracy < 90) issues.push('Values outside expected range found');
    if (consistency < 95) issues.push('Inconsistent data formats detected');
    if (timeliness < 85) issues.push('Data freshness concerns - last updated over 24h ago');

    const metric: DataQualityMetric = {
      id: `quality-${Date.now()}`,
      widgetId: viz.id,
      widgetName: viz.name,
      metric: viz.metricColumns.join(', '),
      timestamp: new Date(),
      completeness,
      accuracy,
      consistency,
      timeliness,
      issues,
      overallScore,
    };

    setDataQualityMetrics(prev => {
      const filtered = prev.filter(m => m.widgetId !== viz.id);
      return [...filtered, metric];
    });

    if (overallScore < 70) {
      addNotification('error', 'Data Quality Alert', `${viz.name} has quality score of ${overallScore.toFixed(0)}%`, {
        label: 'View Details',
        onClick: () => {},
      });
    }
  };

  const checkAlerts = (viz: VisualizationConfig, data: any) => {
    const widgetAlerts = alerts.filter(a => a.widgetId === viz.id && a.enabled);

    widgetAlerts.forEach(alert => {
      // Get current value from data (simplified)
      let currentValue = 0;
      if (data && data.values && data.values.length > 0) {
        currentValue = data.values[0];
      }

      let shouldTrigger = false;
      switch (alert.condition) {
        case 'above':
          shouldTrigger = currentValue > alert.threshold;
          break;
        case 'below':
          shouldTrigger = currentValue < alert.threshold;
          break;
        case 'equals':
          shouldTrigger = Math.abs(currentValue - alert.threshold) < 0.01;
          break;
      }

      if (shouldTrigger && !alert.triggered) {
        setAlerts(prev => prev.map(a =>
          a.id === alert.id
            ? { ...a, triggered: true, lastTriggered: new Date(), currentValue }
            : a
        ));
        addNotification(alert.severity === 'critical' ? 'error' : 'warning', `Alert: ${alert.name}`, `${alert.metric} is ${alert.condition} ${alert.threshold} (current: ${currentValue.toFixed(2)})`);
      } else if (!shouldTrigger && alert.triggered) {
        setAlerts(prev => prev.map(a =>
          a.id === alert.id ? { ...a, triggered: false, currentValue } : a
        ));
      } else if (alert.triggered) {
        setAlerts(prev => prev.map(a =>
          a.id === alert.id ? { ...a, currentValue } : a
        ));
      }
    });
  };

  // Enterprise feature handlers
  const handleCreateAlert = (alert: Omit<Alert, 'id' | 'triggered'>) => {
    const newAlert: Alert = {
      ...alert,
      id: `alert-${Date.now()}`,
      triggered: false,
    };
    setAlerts(prev => [...prev, newAlert]);
    logActivity('created', 'alert', alert.name, `Alert created for ${alert.widgetName}`);
    addNotification('success', 'Alert Created', `${alert.name} is now monitoring ${alert.widgetName}`);
  };

  const handleUpdateAlert = (id: string, updates: Partial<Alert>) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    logActivity('updated', 'alert', alerts.find(a => a.id === id)?.name || 'Alert', 'Alert settings updated');
  };

  const handleDeleteAlert = (id: string) => {
    const alert = alerts.find(a => a.id === id);
    setAlerts(prev => prev.filter(a => a.id !== id));
    if (alert) {
      logActivity('deleted', 'alert', alert.name, 'Alert deleted');
      addNotification('info', 'Alert Deleted', `${alert.name} has been removed`);
    }
  };

  const handleMarkNotificationAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleMarkAllNotificationsAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleDeleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleClearAllNotifications = () => {
    setNotifications([]);
  };

  const handleClearActivities = () => {
    setActivities([]);
    addNotification('info', 'Activity Log Cleared', 'All activity history has been cleared');
  };

  const handleClearPerformanceMetrics = () => {
    setPerformanceMetrics([]);
    addNotification('info', 'Performance Metrics Cleared', 'All performance data has been cleared');
  };

  const handleRefreshDataQuality = () => {
    visualizations.forEach(viz => {
      if (viz.data) {
        checkDataQuality(viz, viz.data);
      }
    });
    addNotification('success', 'Data Quality Refreshed', 'Quality metrics updated for all widgets');
  };

  const handleSaveFavorite = (favorite: Omit<Favorite, 'id' | 'createdAt'>) => {
    const newFavorite: Favorite = {
      ...favorite,
      id: `fav-${Date.now()}`,
      createdAt: new Date(),
      config: {
        visualizations,
        globalFilters,
        currentDashboard,
      },
    };
    setFavorites(prev => [...prev, newFavorite]);
    logActivity('created', 'dashboard', favorite.name, `Saved as favorite`);
    addNotification('success', 'Favorite Saved', `${favorite.name} has been bookmarked`);
  };

  const handleLoadFavorite = (favorite: Favorite) => {
    if (favorite.config.visualizations) {
      setVisualizations(favorite.config.visualizations);
    }
    if (favorite.config.globalFilters) {
      setGlobalFilters(favorite.config.globalFilters);
    }
    if (favorite.config.currentDashboard) {
      setCurrentDashboard(favorite.config.currentDashboard);
    }
    logActivity('viewed', 'dashboard', favorite.name, 'Loaded from favorites');
    addNotification('success', 'Favorite Loaded', `${favorite.name} has been restored`);
  };

  const handleDeleteFavorite = (id: string) => {
    const favorite = favorites.find(f => f.id === id);
    setFavorites(prev => prev.filter(f => f.id !== id));
    if (favorite) {
      logActivity('deleted', 'dashboard', favorite.name, 'Removed from favorites');
      addNotification('info', 'Favorite Deleted', `${favorite.name} has been removed from bookmarks`);
    }
  };

  // Get widget grid class
  const getWidgetGridClass = (size: string = 'medium') => {
    switch (size) {
      case 'small': return 'lg:col-span-1';
      case 'medium': return 'lg:col-span-2';
      case 'large': return 'lg:col-span-3';
      case 'full': return 'col-span-full';
      default: return 'lg:col-span-2';
    }
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

    const height = viz.height || 400;

    switch (viz.chartType) {
      case 'line':
      case 'area':
        return (
          <TimeSeriesChart
            series={viz.data}
            height={height}
            showZoomControls={true}
          />
        );

      case 'bar':
        return (
          <div style={{ height }} className="overflow-auto">
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

      case 'pie':
      case 'donut': {
        if (!viz.data || !viz.data.labels || !viz.data.values) {
          return <div className="flex items-center justify-center" style={{ height }}><p className="text-sm text-gray-500">No data</p></div>;
        }
        const totalValue = viz.data.values.reduce((sum: number, val: number) => sum + val, 0);
        let currentAngle = 0;
        const pieColors = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899'];
        const centerX = 200;
        const centerY = 200;
        const outerRadius = 150;
        const innerRadius = viz.chartType === 'donut' ? 80 : 0;
        return (
          <div style={{ height }} className="overflow-auto flex items-center justify-center p-4">
            <svg width="400" height="400" viewBox="0 0 400 400">
              {viz.data.values.map((value: number, idx: number) => {
                const angle = (value / totalValue) * 2 * Math.PI;
                const startAngle = currentAngle;
                const endAngle = currentAngle + angle;
                currentAngle = endAngle;

                const x1 = centerX + outerRadius * Math.cos(startAngle - Math.PI / 2);
                const y1 = centerY + outerRadius * Math.sin(startAngle - Math.PI / 2);
                const x2 = centerX + outerRadius * Math.cos(endAngle - Math.PI / 2);
                const y2 = centerY + outerRadius * Math.sin(endAngle - Math.PI / 2);

                const largeArc = angle > Math.PI ? 1 : 0;

                let pathData;
                if (innerRadius > 0) {
                  const ix1 = centerX + innerRadius * Math.cos(startAngle - Math.PI / 2);
                  const iy1 = centerY + innerRadius * Math.sin(startAngle - Math.PI / 2);
                  const ix2 = centerX + innerRadius * Math.cos(endAngle - Math.PI / 2);
                  const iy2 = centerY + innerRadius * Math.sin(endAngle - Math.PI / 2);
                  pathData = `M ${x1},${y1} A ${outerRadius},${outerRadius} 0 ${largeArc},1 ${x2},${y2} L ${ix2},${iy2} A ${innerRadius},${innerRadius} 0 ${largeArc},0 ${ix1},${iy1} Z`;
                } else {
                  pathData = `M ${centerX},${centerY} L ${x1},${y1} A ${outerRadius},${outerRadius} 0 ${largeArc},1 ${x2},${y2} Z`;
                }

                const labelAngle = (startAngle + endAngle) / 2;
                const labelRadius = (outerRadius + innerRadius) / 2;
                const labelX = centerX + labelRadius * Math.cos(labelAngle - Math.PI / 2);
                const labelY = centerY + labelRadius * Math.sin(labelAngle - Math.PI / 2);
                const percent = ((value / totalValue) * 100).toFixed(1);

                return (
                  <g key={idx}>
                    <path d={pathData} fill={pieColors[idx % pieColors.length]} stroke="white" strokeWidth="2" opacity="0.9" className="hover:opacity-100 transition-opacity" />
                    {angle > 0.2 && <text x={labelX} y={labelY} textAnchor="middle" className="text-xs font-semibold fill-white">{percent}%</text>}
                  </g>
                );
              })}
            </svg>
            <div className="ml-6 space-y-2">
              {viz.data.labels.map((label: string, idx: number) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: pieColors[idx % pieColors.length] }} />
                  <span className="text-gray-700 dark:text-gray-300">{label}</span>
                  <span className="text-gray-500 dark:text-gray-400">({viz.data.values[idx]})</span>
                </div>
              ))}
            </div>
          </div>
        );
      }

      case 'funnel': {
        if (!viz.data || !viz.data.labels || !viz.data.values) {
          return <div className="flex items-center justify-center" style={{ height }}><p className="text-sm text-gray-500">No data</p></div>;
        }
        const maxFunnelValue = Math.max(...viz.data.values);
        const funnelColors = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444'];
        return (
          <div style={{ height }} className="overflow-auto flex items-center justify-center p-8">
            <div className="w-full max-w-md space-y-2">
              {viz.data.values.map((value: number, idx: number) => {
                const widthPercent = (value / maxFunnelValue) * 100;
                const conversionRate = idx > 0 ? ((value / viz.data.values[idx - 1]) * 100).toFixed(1) : 100;
                return (
                  <div key={idx} className="flex flex-col items-center">
                    <div className="w-full rounded-lg shadow-md overflow-hidden" style={{ width: `${widthPercent}%` }}>
                      <div className="p-4 text-white font-semibold text-center" style={{ backgroundColor: funnelColors[idx % funnelColors.length] }}>
                        <div className="text-sm">{viz.data.labels[idx]}</div>
                        <div className="text-2xl mt-1">{value.toLocaleString()}</div>
                        {idx > 0 && <div className="text-xs mt-1 opacity-90">{conversionRate}% conversion</div>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      case 'stat':
      case 'gauge':
        return (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-6" style={{ minHeight: height }}>
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

      case 'heatmap': {
        if (!viz.data || !viz.data.data) {
          return <div className="flex items-center justify-center" style={{ height }}><p className="text-sm text-gray-500">No data</p></div>;
        }
        const getHeatColor = (value: number, min: number, max: number) => {
          const ratio = (value - min) / (max - min);
          if (ratio < 0.25) return 'bg-blue-200 dark:bg-blue-900';
          if (ratio < 0.5) return 'bg-green-200 dark:bg-green-900';
          if (ratio < 0.75) return 'bg-yellow-200 dark:bg-yellow-900';
          return 'bg-red-200 dark:bg-red-900';
        };
        return (
          <div style={{ height }} className="overflow-auto p-4">
            <div className="inline-block min-w-full">
              <div className="flex gap-1">
                <div className="flex flex-col gap-1 justify-end pb-1">
                  {viz.data.rows?.map((row: string, idx: number) => (
                    <div key={idx} className="h-8 flex items-center justify-end pr-2 text-xs text-gray-600 dark:text-gray-400 w-24 truncate">
                      {row}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex gap-1 mb-1">
                    {viz.data.cols?.map((col: string, idx: number) => (
                      <div key={idx} className="w-16 text-xs text-gray-600 dark:text-gray-400 text-center truncate">
                        {col}
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col gap-1">
                    {viz.data.data.map((row: number[], rowIdx: number) => (
                      <div key={rowIdx} className="flex gap-1">
                        {row.map((value: number, colIdx: number) => (
                          <div key={colIdx} className={`w-16 h-8 rounded flex items-center justify-center text-xs font-semibold ${getHeatColor(value, viz.data.min, viz.data.max)}`}
                            title={`${viz.data.rows[rowIdx]} - ${viz.data.cols[colIdx]}: ${value}`}>
                            {value.toFixed(0)}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      }

      case 'table':
        return (
          <div className="overflow-auto" style={{ maxHeight: height }}>
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

      case 'scatter':
      case 'bubble':
        if (!viz.data || !viz.data.points) {
          return <div className="flex items-center justify-center" style={{ height }}><p className="text-sm text-gray-500">No data</p></div>;
        }
        return (
          <div style={{ height }} className="overflow-auto p-4">
            <div className="relative w-full h-full">
              <svg width="100%" height="100%" className="overflow-visible">
                {viz.data.points?.map((point: any, idx: number) => {
                  const x = (point.x / (viz.data.maxX || 100)) * 100;
                  const y = 100 - (point.y / (viz.data.maxY || 100)) * 100;
                  const size = viz.chartType === 'bubble' ? (point.size || 5) : 5;
                  return (
                    <circle
                      key={idx}
                      cx={`${x}%`}
                      cy={`${y}%`}
                      r={size}
                      className="fill-blue-500 dark:fill-blue-400 opacity-60 hover:opacity-100 transition-opacity"
                    >
                      <title>{`(${point.x}, ${point.y})`}</title>
                    </circle>
                  );
                })}
              </svg>
            </div>
          </div>
        );

      case 'candlestick': {
        if (!viz.data || !viz.data.candles) {
          return <div className="flex items-center justify-center" style={{ height }}><p className="text-sm text-gray-500">No data - requires open, high, low, close values</p></div>;
        }
        const maxPrice = Math.max(...viz.data.candles.map((c: any) => c.high));
        const minPrice = Math.min(...viz.data.candles.map((c: any) => c.low));
        const priceRange = maxPrice - minPrice;
        return (
          <div style={{ height }} className="overflow-auto p-4">
            <div className="flex items-end gap-1 h-full">
              {viz.data.candles?.map((candle: any, idx: number) => {
                const isGreen = candle.close >= candle.open;
                const bodyHeight = Math.abs(candle.close - candle.open) / priceRange * 100;
                const bodyBottom = ((Math.min(candle.open, candle.close) - minPrice) / priceRange) * 100;
                const wickTop = ((candle.high - minPrice) / priceRange) * 100;
                const wickBottom = ((candle.low - minPrice) / priceRange) * 100;
                return (
                  <div key={idx} className="flex-1 relative" style={{ height: '100%' }}>
                    {/* Wick */}
                    <div className={`absolute left-1/2 w-0.5 -translate-x-1/2 ${isGreen ? 'bg-green-600 dark:bg-green-400' : 'bg-red-600 dark:bg-red-400'}`}
                      style={{ bottom: `${wickBottom}%`, height: `${wickTop - wickBottom}%` }} />
                    {/* Body */}
                    <div className={`absolute left-0 right-0 border ${isGreen ? 'bg-green-600 dark:bg-green-400 border-green-700' : 'bg-red-600 dark:bg-red-400 border-red-700'}`}
                      style={{ bottom: `${bodyBottom}%`, height: `${bodyHeight}%` }}
                      title={`O: ${candle.open} H: ${candle.high} L: ${candle.low} C: ${candle.close}`} />
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      case 'waterfall': {
        if (!viz.data || !viz.data.categories) {
          return <div className="flex items-center justify-center" style={{ height }}><p className="text-sm text-gray-500">No data</p></div>;
        }
        let cumulative = 0;
        const waterfallData = viz.data.series[0]?.data.map((val: number) => {
          const start = cumulative;
          cumulative += val;
          return { start, end: cumulative, value: val };
        });
        const maxValue = Math.max(...waterfallData.map((d: any) => Math.max(d.start, d.end)));
        return (
          <div style={{ height }} className="overflow-auto p-4">
            <div className="flex items-end gap-2 h-full">
              {waterfallData?.map((item: any, idx: number) => {
                const isPositive = item.value >= 0;
                const barHeight = Math.abs(item.value) / maxValue * 100;
                const barBottom = (Math.min(item.start, item.end) / maxValue) * 100;
                return (
                  <div key={idx} className="flex-1 relative" style={{ height: '100%' }}>
                    <div className={`absolute left-0 right-0 ${isPositive ? 'bg-green-500 dark:bg-green-400' : 'bg-red-500 dark:bg-red-400'} rounded-t`}
                      style={{ bottom: `${barBottom}%`, height: `${barHeight}%` }}
                      title={`${viz.data.categories[idx]}: ${item.value > 0 ? '+' : ''}${item.value}`} />
                    <div className="absolute -bottom-6 left-0 right-0 text-xs text-gray-600 dark:text-gray-400 text-center truncate">
                      {viz.data.categories[idx]}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      case 'radar': {
        if (!viz.data || !viz.data.categories || !viz.data.series) {
          return <div className="flex items-center justify-center" style={{ height }}><p className="text-sm text-gray-500">No data</p></div>;
        }
        const radarPoints = viz.data.categories.length;
        const angleStep = (2 * Math.PI) / radarPoints;
        const centerX = 200;
        const centerY = 200;
        const radius = 150;
        return (
          <div style={{ height }} className="overflow-auto flex items-center justify-center">
            <svg width="400" height="400" viewBox="0 0 400 400">
              {/* Grid circles */}
              {[0.25, 0.5, 0.75, 1].map((scale, i) => (
                <circle key={i} cx={centerX} cy={centerY} r={radius * scale} fill="none" stroke="currentColor" strokeWidth="1" className="text-gray-300 dark:text-gray-600" opacity="0.3" />
              ))}
              {/* Axes */}
              {viz.data.categories.map((_: string, i: number) => {
                const angle = i * angleStep - Math.PI / 2;
                const x = centerX + radius * Math.cos(angle);
                const y = centerY + radius * Math.sin(angle);
                return <line key={i} x1={centerX} y1={centerY} x2={x} y2={y} stroke="currentColor" strokeWidth="1" className="text-gray-300 dark:text-gray-600" opacity="0.3" />;
              })}
              {/* Data polygon */}
              {viz.data.series.map((series: any, seriesIdx: number) => {
                const points = series.data.map((value: number, i: number) => {
                  const angle = i * angleStep - Math.PI / 2;
                  const normalizedValue = value / Math.max(...series.data);
                  const x = centerX + radius * normalizedValue * Math.cos(angle);
                  const y = centerY + radius * normalizedValue * Math.sin(angle);
                  return `${x},${y}`;
                }).join(' ');
                const colors = ['rgb(59, 130, 246)', 'rgb(16, 185, 129)', 'rgb(239, 68, 68)'];
                return (
                  <polygon key={seriesIdx} points={points} fill={colors[seriesIdx % colors.length]} fillOpacity="0.2" stroke={colors[seriesIdx % colors.length]} strokeWidth="2" />
                );
              })}
              {/* Labels */}
              {viz.data.categories.map((label: string, i: number) => {
                const angle = i * angleStep - Math.PI / 2;
                const x = centerX + (radius + 30) * Math.cos(angle);
                const y = centerY + (radius + 30) * Math.sin(angle);
                return <text key={i} x={x} y={y} textAnchor="middle" className="text-xs fill-gray-700 dark:fill-gray-300">{label}</text>;
              })}
            </svg>
          </div>
        );
      }

      case 'treemap': {
        if (!viz.data || !viz.data.items) {
          return <div className="flex items-center justify-center" style={{ height }}><p className="text-sm text-gray-500">No data</p></div>;
        }
        const total = viz.data.items.reduce((sum: number, item: any) => sum + item.value, 0);
        let currentX = 0;
        const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-teal-500'];
        return (
          <div style={{ height }} className="overflow-auto p-4">
            <div className="flex h-full gap-1">
              {viz.data.items?.map((item: any, idx: number) => {
                const widthPercent = (item.value / total) * 100;
                const colorClass = colors[idx % colors.length];
                return (
                  <div key={idx} className={`${colorClass} dark:opacity-80 rounded flex items-center justify-center text-white font-semibold text-xs p-2 text-center`}
                    style={{ width: `${widthPercent}%` }}
                    title={`${item.name}: ${item.value}`}>
                    <div className="break-words">
                      <div>{item.name}</div>
                      <div className="text-xs opacity-90">{item.value}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      case 'sankey':
        if (!viz.data || !viz.data.flows) {
          return <div className="flex items-center justify-center" style={{ height }}><p className="text-sm text-gray-500">No data - requires source, target, value flows</p></div>;
        }
        return (
          <div style={{ height }} className="overflow-auto p-4 flex items-center justify-center">
            <div className="text-center">
              <GitBranch className="h-16 w-16 text-teal-500 mx-auto mb-4" />
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Sankey Flow Diagram</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {viz.data.flows?.length || 0} flows • Advanced rendering coming soon
              </p>
            </div>
          </div>
        );

      case 'boxplot':
        if (!viz.data || !viz.data.series) {
          return <div className="flex items-center justify-center" style={{ height }}><p className="text-sm text-gray-500">No data</p></div>;
        }
        return (
          <div style={{ height }} className="overflow-auto p-4">
            <div className="flex items-end gap-4 h-full justify-center">
              {viz.data.series?.map((series: any, idx: number) => {
                const values = series.data.sort((a: number, b: number) => a - b);
                const min = values[0];
                const max = values[values.length - 1];
                const q1 = values[Math.floor(values.length * 0.25)];
                const median = values[Math.floor(values.length * 0.5)];
                const q3 = values[Math.floor(values.length * 0.75)];
                const range = max - min;
                const scale = (val: number) => ((val - min) / range) * 80;
                return (
                  <div key={idx} className="relative w-20" style={{ height: '90%' }}>
                    <div className="absolute bottom-0 left-1/2 w-0.5 bg-gray-400 dark:bg-gray-500" style={{ height: `${scale(max)}%`, transform: 'translateX(-50%)' }} />
                    <div className="absolute left-0 right-0 border-2 border-blue-500 dark:border-blue-400 bg-blue-100 dark:bg-blue-900/30 rounded"
                      style={{ bottom: `${scale(q1)}%`, height: `${scale(q3) - scale(q1)}%` }}>
                      <div className="absolute left-0 right-0 h-0.5 bg-blue-700 dark:bg-blue-300" style={{ bottom: `${((median - q1) / (q3 - q1)) * 100}%` }} />
                    </div>
                    <div className="absolute left-1/4 right-1/4 h-0.5 bg-gray-600 dark:bg-gray-400" style={{ bottom: `${scale(min)}%` }} />
                    <div className="absolute left-1/4 right-1/4 h-0.5 bg-gray-600 dark:bg-gray-400" style={{ bottom: `${scale(max)}%` }} />
                    <div className="absolute -bottom-8 left-0 right-0 text-xs text-gray-600 dark:text-gray-400 text-center truncate">{series.name}</div>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'stackedbar': {
        if (!viz.data || !viz.data.categories || !viz.data.series) {
          return <div className="flex items-center justify-center" style={{ height }}><p className="text-sm text-gray-500">No data</p></div>;
        }
        const stackedMaxValues = viz.data.categories.map((_: string, catIdx: number) =>
          viz.data.series.reduce((sum: number, series: any) => sum + (series.data[catIdx] || 0), 0)
        );
        const stackedMax = Math.max(...stackedMaxValues);
        const barColors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500'];
        return (
          <div style={{ height }} className="overflow-auto p-4">
            <div className="flex items-end gap-2 h-full">
              {viz.data.categories?.map((cat: string, catIdx: number) => (
                <div key={catIdx} className="flex-1 flex flex-col-reverse gap-0.5">
                  {viz.data.series.map((series: any, seriesIdx: number) => {
                    const value = series.data[catIdx] || 0;
                    const heightPercent = (value / stackedMax) * 100;
                    return (
                      <div key={seriesIdx} className={`${barColors[seriesIdx % barColors.length]} dark:opacity-80 rounded-t text-white text-xs font-semibold flex items-center justify-center`}
                        style={{ height: `${heightPercent}%` }}
                        title={`${series.name}: ${value}`}>
                        {heightPercent > 5 ? value : ''}
                      </div>
                    );
                  })}
                  <div className="text-xs text-gray-600 dark:text-gray-400 text-center truncate mt-1">{cat}</div>
                </div>
              ))}
            </div>
          </div>
        );
      }

      case 'stackedarea': {
        if (!viz.data || !Array.isArray(viz.data) || viz.data.length === 0) {
          return <div className="flex items-center justify-center" style={{ height }}><p className="text-sm text-gray-500">No data</p></div>;
        }
        // Calculate stacked values
        const numPoints = viz.data[0]?.data?.length || 0;
        const stackedValues = Array(numPoints).fill(0).map(() => [] as number[]);
        viz.data.forEach((series: any) => {
          series.data.forEach((point: any, idx: number) => {
            const prevSum = stackedValues[idx].reduce((a: number, b: number) => a + b, 0);
            stackedValues[idx].push(prevSum + point.value);
          });
        });
        const maxStackedValue = Math.max(...stackedValues.map(arr => arr[arr.length - 1]));
        const areaColors = ['rgba(59, 130, 246, 0.6)', 'rgba(16, 185, 129, 0.6)', 'rgba(168, 85, 247, 0.6)', 'rgba(251, 146, 60, 0.6)'];
        return (
          <div style={{ height }} className="overflow-auto p-4">
            <svg width="100%" height="100%" className="overflow-visible">
              {viz.data.map((series: any, seriesIdx: number) => {
                const points = series.data.map((point: any, idx: number) => {
                  const x = (idx / (numPoints - 1)) * 100;
                  const yTop = seriesIdx === 0 ? 0 : (stackedValues[idx][seriesIdx - 1] / maxStackedValue) * 100;
                  const yBottom = (stackedValues[idx][seriesIdx] / maxStackedValue) * 100;
                  return { x, yTop: 100 - yTop, yBottom: 100 - yBottom };
                });
                const pathD = [
                  `M ${points[0].x},${points[0].yTop}`,
                  ...points.map((p: any) => `L ${p.x},${p.yTop}`),
                  ...points.reverse().map((p: any) => `L ${p.x},${p.yBottom}`),
                  'Z'
                ].join(' ');
                return (
                  <path key={seriesIdx} d={pathD} fill={areaColors[seriesIdx % areaColors.length]} stroke="none" />
                );
              }).reverse()}
            </svg>
          </div>
        );
      }

      default:
        return (
          <div className="flex items-center justify-center" style={{ height }}>
            <div className="text-center">
              <Activity className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Chart type: {viz.chartType}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Visualization coming soon
              </p>
            </div>
          </div>
        );
    }
  };

  // If no connection
  if (!activeConnection) {
    return (
      <div className="flex h-full items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="text-center max-w-md px-8">
          <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-purple-600 shadow-lg">
            <Database className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
            Enterprise Analytics Platform
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Connect to your database to unlock powerful time-series analytics and business intelligence
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Sparkles className="h-4 w-4" />
            <span>Professional • Customizable • Enterprise-Ready</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-slate-900">
      {/* Enterprise Header */}
      <div className="border-b border-gray-200/50 bg-white/80 backdrop-blur-xl dark:border-gray-700/50 dark:bg-gray-900/80 shadow-lg relative z-40">
        <div className="max-w-[1920px] mx-auto px-8 py-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 shadow-xl shadow-blue-500/30">
                <TrendingUp className="h-7 w-7 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 dark:from-white dark:via-blue-100 dark:to-purple-100 bg-clip-text text-transparent">
                  Enterprise Time Series Analytics
                </h1>
                <div className="flex items-center gap-2.5 text-xs text-gray-600 dark:text-gray-400 mt-1.5">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 dark:bg-green-900/30 px-2.5 py-1 text-green-700 dark:text-green-400 font-semibold border border-green-200 dark:border-green-800">
                    <span className="h-2 w-2 rounded-full bg-green-600 dark:bg-green-400 animate-pulse"></span>
                    Connected
                  </span>
                  <span className="text-gray-300 dark:text-gray-600">•</span>
                  <span className="font-medium">{visualizations.filter(v => v.isVisible).length} active widgets</span>
                  {currentDashboard && (
                    <>
                      <span className="text-gray-300 dark:text-gray-600">•</span>
                      <span className="font-semibold text-blue-600 dark:text-blue-400">{currentDashboard.name}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Enterprise Toolbar - Compact Icon-Only */}
            <div className="flex items-center gap-1.5">
              {/* Primary Actions */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowTemplates(true)}
                  className="group relative p-2.5 rounded-lg border border-purple-200 dark:border-purple-700 bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/70 shadow-sm hover:shadow-md transition-all"
                  title="Dashboard Templates"
                >
                  <Layout className="h-4 w-4" />
                  <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                    Templates
                  </span>
                </button>

                <GlobalFilters
                  filters={globalFilters}
                  onFiltersChange={setGlobalFilters}
                  availableTables={[]}
                />

                <AdvancedAggregationPanel
                  availableColumns={['timestamp', 'value', 'sensor_id', 'location', 'temperature', 'humidity', 'pressure', 'cpu_usage', 'memory_usage']}
                  onApply={(metrics, groupBy, timeBucket) => {
                    console.log('Applied aggregations:', { metrics, groupBy, timeBucket });
                    toast.success('Aggregations applied successfully', `${metrics.length} metrics configured`);
                  }}
                  onExportSQL={(sql) => {
                    console.log('Generated SQL:', sql);
                    navigator.clipboard.writeText(sql);
                    toast.success('SQL query copied to clipboard', 'Ready to paste');
                  }}
                />

                <DataImportPanel
                  availableTables={availableTables}
                  onFetchSchema={handleFetchTableSchema}
                  onImportData={handleImportData}
                  onExecuteSQL={handleExecuteSQL}
                />

                <ExportPanel
                  dashboardName={currentDashboard?.name || 'Dashboard'}
                  onExport={handleExport}
                />

                <DashboardManager
                  currentDashboard={currentDashboard}
                  onSelectDashboard={setCurrentDashboard}
                />
              </div>

              {/* Divider */}
              <div className="h-8 w-px bg-gray-300 dark:bg-gray-600 mx-0.5" />

              {/* Enterprise Features - Icon Only */}
              <div className="flex items-center gap-1.5">
                <NotificationCenter
                  notifications={notifications}
                  onMarkAsRead={handleMarkNotificationAsRead}
                  onMarkAllAsRead={handleMarkAllNotificationsAsRead}
                  onDelete={handleDeleteNotification}
                  onClearAll={handleClearAllNotifications}
                />

                <AlertMonitor
                  visualizations={visualizations}
                  onCreateAlert={handleCreateAlert}
                  alerts={alerts}
                  onUpdateAlert={handleUpdateAlert}
                  onDeleteAlert={handleDeleteAlert}
                />

                <PerformanceMonitor
                  metrics={performanceMetrics}
                  onClear={handleClearPerformanceMetrics}
                />

                <DataQualityMonitor
                  metrics={dataQualityMetrics}
                  onRefresh={handleRefreshDataQuality}
                />

                <ActivityLog
                  activities={activities}
                  onClear={handleClearActivities}
                />

                <FavoritesPanel
                  favorites={favorites}
                  onLoad={handleLoadFavorite}
                  onDelete={handleDeleteFavorite}
                  onSave={handleSaveFavorite}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-[1920px] mx-auto px-8">
          <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700/50">
            {[
              { id: 'query' as ActiveTab, label: 'Query Builder', icon: Filter },
              { id: 'visualizations' as ActiveTab, label: `Visualizations (${visualizations.length})`, icon: BarChart3 },
              { id: 'settings' as ActiveTab, label: 'Settings', icon: Settings },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2.5 px-6 py-3.5 text-sm font-semibold border-b-3 transition-all rounded-t-lg ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-gradient-to-t from-blue-50 to-transparent dark:from-blue-950/30 dark:to-transparent shadow-sm'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50/50 dark:hover:bg-gray-800/30'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Query Builder Tab */}
        {activeTab === 'query' && (
          <div className="max-w-[1920px] mx-auto px-8 py-8 pb-96">
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-2xl">
              <div className="border-b border-gray-200 dark:border-gray-700/50 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-8 py-6 rounded-t-2xl">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 shadow-lg">
                    <Filter className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      Configure Time Series Query
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                      Select your data source and metrics to create powerful visualizations
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-8">

                <div className="space-y-6 relative">
                  <TimeSeriesTableSelector
                    onSelectionChange={setTableSelection}
                  />

                  {tableSelection && (
                    <>
                      <div className="grid grid-cols-2 gap-6">
                        {/* Aggregation */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2.5">
                            Aggregation Function
                          </label>
                          <select
                            value={selectedAggregation}
                            onChange={(e) => setSelectedAggregation(e.target.value as AggregationFunction)}
                            className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-sm shadow-sm hover:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          >
                            <option value="AVG">Average (AVG)</option>
                            <option value="SUM">Sum (SUM)</option>
                            <option value="MIN">Minimum (MIN)</option>
                            <option value="MAX">Maximum (MAX)</option>
                            <option value="COUNT">Count (COUNT)</option>
                            <option value="STDDEV">Standard Deviation (STDDEV)</option>
                          </select>
                        </div>

                        {/* Group By */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2.5">
                            Group By (Optional)
                          </label>
                          <select
                            value={selectedGroupBy}
                            onChange={(e) => setSelectedGroupBy(e.target.value)}
                            className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-sm shadow-sm hover:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          >
                            <option value="">-- No grouping --</option>
                            {tableSelection.textColumns.map(col => (
                              <option key={col.name} value={col.name}>
                                {col.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* WHERE Clause */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2.5">
                          Filter (WHERE Clause) - Optional
                        </label>
                        <input
                          type="text"
                          placeholder="e.g., value > 100 AND status = 'active'"
                          value={whereClause}
                          onChange={(e) => setWhereClause(e.target.value)}
                          className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-sm shadow-sm hover:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors font-mono"
                        />
                      </div>

                      {/* Limit */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2.5">
                          Limit (Max Rows)
                        </label>
                        <input
                          type="number"
                          value={limit}
                          onChange={(e) => setLimit(parseInt(e.target.value))}
                          className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-sm shadow-sm hover:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          min="1"
                          max="10000"
                        />
                      </div>

                      {/* Create Visualization Buttons */}
                      <div className="pt-8 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 shadow-lg">
                            <Sparkles className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                              Create Enterprise Visualization
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Choose from 19 professional chart types across 6 categories
                            </p>
                          </div>
                        </div>

                        <div className="space-y-6">
                          {/* Time Series Charts */}
                          <div>
                            <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                              <LineChart className="h-4 w-4" />
                              Time Series Analysis
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              {[
                                { type: 'line' as ChartType, icon: LineChart, label: 'Line Chart', desc: 'Trends over time', color: 'from-blue-500 to-cyan-500' },
                                { type: 'area' as ChartType, icon: AreaChart, label: 'Area Chart', desc: 'Filled trends', color: 'from-green-500 to-emerald-500' },
                                { type: 'stackedarea' as ChartType, icon: Layers, label: 'Stacked Area', desc: 'Cumulative trends', color: 'from-emerald-500 to-teal-500' },
                                { type: 'candlestick' as ChartType, icon: CandlestickChart, label: 'Candlestick', desc: 'Financial data', color: 'from-green-600 to-red-600' },
                              ].map(({ type, icon: Icon, label, desc, color }) => (
                                <button
                                  key={type}
                                  onClick={() => createVisualization(type)}
                                  className="group relative flex flex-col items-center gap-3 p-5 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-transparent hover:shadow-2xl transition-all overflow-hidden bg-white dark:bg-gray-800"
                                >
                                  <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-15 transition-opacity`} />
                                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${color} shadow-lg group-hover:scale-110 transition-transform`}>
                                    <Icon className="h-6 w-6 text-white" />
                                  </div>
                                  <div className="text-center relative z-10">
                                    <div className="text-sm font-bold text-gray-900 dark:text-white">
                                      {label}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                      {desc}
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Comparison Charts */}
                          <div>
                            <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                              <BarChart3 className="h-4 w-4" />
                              Comparison & Ranking
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              {[
                                { type: 'bar' as ChartType, icon: BarChart3, label: 'Bar Chart', desc: 'Compare values', color: 'from-purple-500 to-pink-500' },
                                { type: 'stackedbar' as ChartType, icon: BarChart2, label: 'Stacked Bar', desc: 'Grouped compare', color: 'from-purple-600 to-fuchsia-600' },
                                { type: 'waterfall' as ChartType, icon: Waves, label: 'Waterfall', desc: 'Cumulative effect', color: 'from-cyan-500 to-blue-500' },
                              ].map(({ type, icon: Icon, label, desc, color }) => (
                                <button
                                  key={type}
                                  onClick={() => createVisualization(type)}
                                  className="group relative flex flex-col items-center gap-3 p-5 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-transparent hover:shadow-2xl transition-all overflow-hidden bg-white dark:bg-gray-800"
                                >
                                  <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-15 transition-opacity`} />
                                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${color} shadow-lg group-hover:scale-110 transition-transform`}>
                                    <Icon className="h-6 w-6 text-white" />
                                  </div>
                                  <div className="text-center relative z-10">
                                    <div className="text-sm font-bold text-gray-900 dark:text-white">
                                      {label}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                      {desc}
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Distribution Charts */}
                          <div>
                            <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                              <PieChart className="h-4 w-4" />
                              Distribution & Composition
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              {[
                                { type: 'pie' as ChartType, icon: PieChart, label: 'Pie Chart', desc: 'Proportions', color: 'from-orange-500 to-red-500' },
                                { type: 'donut' as ChartType, icon: Circle, label: 'Donut Chart', desc: 'Ring proportions', color: 'from-pink-500 to-rose-500' },
                                { type: 'treemap' as ChartType, icon: Trees, label: 'Treemap', desc: 'Hierarchical data', color: 'from-lime-500 to-green-500' },
                              ].map(({ type, icon: Icon, label, desc, color }) => (
                                <button
                                  key={type}
                                  onClick={() => createVisualization(type)}
                                  className="group relative flex flex-col items-center gap-3 p-5 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-transparent hover:shadow-2xl transition-all overflow-hidden bg-white dark:bg-gray-800"
                                >
                                  <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-15 transition-opacity`} />
                                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${color} shadow-lg group-hover:scale-110 transition-transform`}>
                                    <Icon className="h-6 w-6 text-white" />
                                  </div>
                                  <div className="text-center relative z-10">
                                    <div className="text-sm font-bold text-gray-900 dark:text-white">
                                      {label}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                      {desc}
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Relationship Charts */}
                          <div>
                            <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                              <Activity className="h-4 w-4" />
                              Relationships & Patterns
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              {[
                                { type: 'scatter' as ChartType, icon: Activity, label: 'Scatter Plot', desc: 'Correlation', color: 'from-violet-500 to-purple-500' },
                                { type: 'bubble' as ChartType, icon: Circle, label: 'Bubble Chart', desc: '3D data points', color: 'from-sky-500 to-indigo-500' },
                                { type: 'sankey' as ChartType, icon: GitBranch, label: 'Sankey Diagram', desc: 'Flow analysis', color: 'from-teal-500 to-cyan-500' },
                                { type: 'boxplot' as ChartType, icon: BoxSelect, label: 'Box Plot', desc: 'Statistical dist.', color: 'from-amber-500 to-orange-500' },
                              ].map(({ type, icon: Icon, label, desc, color }) => (
                                <button
                                  key={type}
                                  onClick={() => createVisualization(type)}
                                  className="group relative flex flex-col items-center gap-3 p-5 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-transparent hover:shadow-2xl transition-all overflow-hidden bg-white dark:bg-gray-800"
                                >
                                  <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-15 transition-opacity`} />
                                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${color} shadow-lg group-hover:scale-110 transition-transform`}>
                                    <Icon className="h-6 w-6 text-white" />
                                  </div>
                                  <div className="text-center relative z-10">
                                    <div className="text-sm font-bold text-gray-900 dark:text-white">
                                      {label}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                      {desc}
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Multi-dimensional Charts */}
                          <div>
                            <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                              <Grid3x3 className="h-4 w-4" />
                              Multi-Dimensional Analysis
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              {[
                                { type: 'radar' as ChartType, icon: Radar, label: 'Radar Chart', desc: 'Multi-metrics', color: 'from-fuchsia-500 to-pink-500' },
                                { type: 'heatmap' as ChartType, icon: Grid3x3, label: 'Heatmap', desc: 'Density matrix', color: 'from-yellow-500 to-orange-500' },
                              ].map(({ type, icon: Icon, label, desc, color }) => (
                                <button
                                  key={type}
                                  onClick={() => createVisualization(type)}
                                  className="group relative flex flex-col items-center gap-3 p-5 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-transparent hover:shadow-2xl transition-all overflow-hidden bg-white dark:bg-gray-800"
                                >
                                  <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-15 transition-opacity`} />
                                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${color} shadow-lg group-hover:scale-110 transition-transform`}>
                                    <Icon className="h-6 w-6 text-white" />
                                  </div>
                                  <div className="text-center relative z-10">
                                    <div className="text-sm font-bold text-gray-900 dark:text-white">
                                      {label}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                      {desc}
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* KPIs & Data */}
                          <div>
                            <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                              <Gauge className="h-4 w-4" />
                              KPIs & Raw Data
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              {[
                                { type: 'gauge' as ChartType, icon: Gauge, label: 'Gauge', desc: 'Single metric', color: 'from-indigo-500 to-purple-500' },
                                { type: 'stat' as ChartType, icon: Activity, label: 'Stat Card', desc: 'KPI numbers', color: 'from-teal-500 to-cyan-500' },
                                { type: 'funnel' as ChartType, icon: TrendingDown, label: 'Funnel', desc: 'Conversion flow', color: 'from-red-500 to-pink-500' },
                                { type: 'table' as ChartType, icon: TableIcon, label: 'Data Table', desc: 'Raw data view', color: 'from-gray-500 to-slate-500' },
                              ].map(({ type, icon: Icon, label, desc, color }) => (
                                <button
                                  key={type}
                                  onClick={() => createVisualization(type)}
                                  className="group relative flex flex-col items-center gap-3 p-5 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-transparent hover:shadow-2xl transition-all overflow-hidden bg-white dark:bg-gray-800"
                                >
                                  <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-15 transition-opacity`} />
                                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${color} shadow-lg group-hover:scale-110 transition-transform`}>
                                    <Icon className="h-6 w-6 text-white" />
                                  </div>
                                  <div className="text-center relative z-10">
                                    <div className="text-sm font-bold text-gray-900 dark:text-white">
                                      {label}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                      {desc}
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Visualizations Tab */}
        {activeTab === 'visualizations' && (
          <div className="max-w-[1920px] mx-auto px-8 py-6 space-y-6">
            <div className="flex items-center justify-between bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg px-8 py-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 shadow-lg">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Active Visualizations
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                    Manage and configure your dashboard widgets
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  console.log('🔵 REFRESH ALL BUTTON CLICKED!');
                  loadAllVisualizations();
                }}
                disabled={isRealTime}
                className={`flex items-center gap-2.5 rounded-xl px-6 py-3.5 text-sm font-semibold shadow-lg transition-all ${
                  isRealTime
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed opacity-60'
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 hover:shadow-xl'
                }`}
                title={isRealTime ? 'Auto-refresh active in Live mode' : 'Refresh all visible widgets'}
              >
                <RefreshCw className={`h-4 w-4 ${isRealTime ? 'animate-spin' : ''}`} />
                {isRealTime ? 'Auto-Refreshing' : `Refresh All (${visualizations.filter(v => v.isVisible).length})`}
              </button>
            </div>

            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg px-8 py-6">
              <DateRangePicker
                value={dateRange}
                onChange={setDateRange}
                isRealTime={isRealTime}
                onRealTimeToggle={setIsRealTime}
              />
            </div>

            {/* Live Mode Active Indicator */}
            {isRealTime && visualizations.filter(v => v.isVisible).length > 0 && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-500 dark:border-green-600 rounded-2xl px-6 py-4 flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-4">
                  <div className="relative flex h-12 w-12 items-center justify-center">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-12 w-12 bg-gradient-to-br from-green-500 to-emerald-600 items-center justify-center">
                      <Activity className="h-6 w-6 text-white animate-pulse" />
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-green-800 dark:text-green-300 flex items-center gap-2">
                      <span className="text-2xl">🔴</span> LIVE MODE ACTIVE
                    </h3>
                    <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                      All {visualizations.filter(v => v.isVisible).length} visible widgets auto-refreshing every 10 seconds
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-xs font-medium text-green-700 dark:text-green-400 uppercase tracking-wide">
                      Real-time Data Stream
                    </div>
                    <div className="text-lg font-mono font-bold text-green-800 dark:text-green-300">
                      ⚡ Live
                    </div>
                  </div>
                  <button
                    onClick={() => setIsRealTime(false)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-all shadow-md hover:shadow-lg"
                  >
                    Stop Live
                  </button>
                </div>
              </div>
            )}

            {visualizations.length === 0 ? (
              <div className="flex h-96 items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 shadow-inner">
                <div className="text-center max-w-md px-8">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 mx-auto mb-6">
                    <Grid3x3 className="h-10 w-10 text-gray-500 dark:text-gray-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                    No Visualizations Yet
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-8">
                    Go to Query Builder to create your first professional visualization
                  </p>
                  <button
                    onClick={() => setActiveTab('query')}
                    className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl transition-all"
                  >
                    <Sparkles className="h-5 w-5" />
                    Create Visualization
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {visualizations.map((viz) => (
                  <div
                    key={viz.id}
                    className={`${getWidgetGridClass(viz.size)} ${
                      !viz.isVisible ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="rounded-2xl border border-gray-200/50 bg-white/90 dark:border-gray-700/50 dark:bg-gray-800/90 backdrop-blur-sm overflow-hidden shadow-xl hover:shadow-2xl transition-all">
                      {/* Widget Header */}
                      <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-6 py-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            {/* Chart Type Icon */}
                            <div className="flex-shrink-0 mt-0.5">
                              {viz.chartType === 'line' && <LineChart className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
                              {viz.chartType === 'bar' && <BarChart3 className="h-5 w-5 text-green-600 dark:text-green-400" />}
                              {viz.chartType === 'pie' && <PieChart className="h-5 w-5 text-purple-600 dark:text-purple-400" />}
                              {viz.chartType === 'area' && <AreaChart className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />}
                              {viz.chartType === 'scatter' && <ScatterChart className="h-5 w-5 text-orange-600 dark:text-orange-400" />}
                              {viz.chartType === 'stat' && <Activity className="h-5 w-5 text-pink-600 dark:text-pink-400" />}
                              {viz.chartType === 'table' && <TableIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />}
                            </div>

                            {/* Title and Info */}
                            <div className="flex-1 min-w-0">
                              <h3 className="text-base font-bold text-gray-900 dark:text-white truncate mb-1">
                                {viz.name}
                              </h3>
                              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                  <Database className="h-3 w-3" />
                                  {viz.schema}.{viz.table}
                                </span>
                                <span className="text-gray-400">•</span>
                                <span className="truncate">{viz.metricColumns.length} metric{viz.metricColumns.length > 1 ? 's' : ''}</span>
                                <span className="text-gray-400">•</span>
                                <span className="capitalize">{viz.chartType}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            {/* Configure Button */}
                            <button
                              onClick={() => setConfiguringWidget(configuringWidget === viz.id ? null : viz.id)}
                              className={`group relative p-2.5 rounded-lg transition-all transform hover:scale-105 ${
                                configuringWidget === viz.id
                                  ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                              }`}
                              title="Configure widget"
                            >
                              <Settings className="h-4 w-4" />
                              <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                Configure
                              </span>
                            </button>

                            {/* Refresh Button */}
                            <button
                              onClick={() => {
                                console.log(`🔵 Individual refresh clicked for widget: ${viz.name} (${viz.id})`);
                                loadVisualizationData(viz.id);
                              }}
                              disabled={viz.loading}
                              className="group relative p-2.5 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg disabled:opacity-50 transition-all transform hover:scale-105 disabled:hover:scale-100"
                              title="Refresh data"
                            >
                              <RefreshCw className={`h-4 w-4 ${viz.loading ? 'animate-spin' : ''}`} />
                              <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                {viz.loading ? 'Loading...' : 'Refresh'}
                              </span>
                            </button>

                            {/* Visibility Toggle */}
                            <button
                              onClick={() => toggleVisibility(viz.id)}
                              className="group relative p-2.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all transform hover:scale-105"
                              title={viz.isVisible ? 'Hide widget' : 'Show widget'}
                            >
                              {viz.isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                              <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                {viz.isVisible ? 'Hide' : 'Show'}
                              </span>
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => removeVisualization(viz.id)}
                              className="group relative p-2.5 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-all transform hover:scale-105"
                              title="Delete widget"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-red-900 dark:bg-red-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                Delete
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Widget Content */}
                      {viz.isVisible && (
                        <div className="p-6 bg-gray-50/50 dark:bg-gray-900/20">
                          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700/50">
                            {renderChart(viz)}
                          </div>
                        </div>
                      )}

                      {/* Widget Stats Footer */}
                      {viz.isVisible && viz.data && (
                        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900/30 border-t border-gray-200 dark:border-gray-700/50">
                          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                            <div className="flex items-center gap-4">
                              <span className="flex items-center gap-1.5">
                                <Activity className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                                <span className="font-medium">Data Loaded</span>
                              </span>
                              <span className="flex items-center gap-1.5">
                                <TrendingUp className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                                <span>{viz.aggregation} aggregation</span>
                              </span>
                            </div>
                            <span className="text-gray-500 dark:text-gray-500">
                              Last updated: {new Date().toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Configuration Panel */}
                      {configuringWidget === viz.id && (
                        <WidgetConfigPanel
                          widget={viz}
                          onUpdate={(updates) => updateWidgetConfig(viz.id, updates)}
                          onClose={() => setConfiguringWidget(null)}
                          availableTables={tableSelection ? [{
                            schema: tableSelection.schema,
                            table: tableSelection.table,
                            columns: [
                              ...tableSelection.timestampColumns.map(c => ({ name: c, type: 'timestamp' })),
                              ...tableSelection.numericColumns.map(c => ({ name: c, type: 'number' })),
                              ...tableSelection.textColumns.map(c => ({ name: c, type: 'text' }))
                            ]
                          }] : []}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="max-w-[1920px] mx-auto px-8 py-8">
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-2xl">
              <div className="border-b border-gray-200 dark:border-gray-700/50 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-8 py-6 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 shadow-lg">
                      <Settings className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Enterprise Settings
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                        Configure your dashboard preferences and behavior
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      toast.success('Saved', 'All settings saved successfully');
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl transition-all"
                  >
                    <Download className="h-4 w-4" />
                    Save Settings
                  </button>
                </div>
              </div>

              <div className="p-8 space-y-8">
                {/* Dashboard Overview */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    Dashboard Overview
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
                      <div className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">Total Widgets</div>
                      <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">{visualizations.length}</div>
                      <div className="text-xs text-blue-600 dark:text-blue-400 mt-2">{visualizations.filter(v => v.isVisible).length} visible</div>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/50 rounded-xl p-6 border border-green-200 dark:border-green-800">
                      <div className="text-sm font-medium text-green-700 dark:text-green-300 mb-1">Active Filters</div>
                      <div className="text-3xl font-bold text-green-900 dark:text-green-100">{globalFilters.filter(f => f.enabled).length}</div>
                      <div className="text-xs text-green-600 dark:text-green-400 mt-2">of {globalFilters.length} total</div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/50 rounded-xl p-6 border border-purple-200 dark:border-purple-800">
                      <div className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-1">Dashboard</div>
                      <div className="text-lg font-bold text-purple-900 dark:text-purple-100 truncate">{currentDashboard?.name || 'Untitled'}</div>
                      <div className="text-xs text-purple-600 dark:text-purple-400 mt-2">Current</div>
                    </div>
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/50 dark:to-orange-900/50 rounded-xl p-6 border border-orange-200 dark:border-orange-800">
                      <div className="text-sm font-medium text-orange-700 dark:text-orange-300 mb-1">Chart Types</div>
                      <div className="text-3xl font-bold text-orange-900 dark:text-orange-100">19</div>
                      <div className="text-xs text-orange-600 dark:text-orange-400 mt-2">Available</div>
                    </div>
                    <div className="bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-950/50 dark:to-pink-900/50 rounded-xl p-6 border border-pink-200 dark:border-pink-800">
                      <div className="text-sm font-medium text-pink-700 dark:text-pink-300 mb-1">Grid Layout</div>
                      <div className="text-3xl font-bold text-pink-900 dark:text-pink-100">{gridColumns}</div>
                      <div className="text-xs text-pink-600 dark:text-pink-400 mt-2">Columns</div>
                    </div>
                    <div className="bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-950/50 dark:to-teal-900/50 rounded-xl p-6 border border-teal-200 dark:border-teal-800">
                      <div className="text-sm font-medium text-teal-700 dark:text-teal-300 mb-1">Auto-Refresh</div>
                      <div className="text-3xl font-bold text-teal-900 dark:text-teal-100">{globalAutoRefresh === 0 ? 'Off' : `${globalAutoRefresh / 1000}s`}</div>
                      <div className="text-xs text-teal-600 dark:text-teal-400 mt-2">Interval</div>
                    </div>
                  </div>
                </div>

                {/* Appearance Settings */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    Appearance & Display
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-3">
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Theme Mode
                      </label>
                      <div className="flex gap-2">
                        {[
                          { value: 'light' as const, label: 'Light', icon: '☀️' },
                          { value: 'dark' as const, label: 'Dark', icon: '🌙' },
                          { value: 'auto' as const, label: 'Auto', icon: '🔄' },
                        ].map((t) => (
                          <button
                            key={t.value}
                            onClick={() => setTheme(t.value)}
                            className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                              theme === t.value
                                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}
                          >
                            <span className="mr-1">{t.icon}</span>
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Grid Columns
                      </label>
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min="2"
                          max="6"
                          value={gridColumns}
                          onChange={(e) => setGridColumns(Number(e.target.value))}
                          className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="text-lg font-bold text-gray-900 dark:text-white bg-blue-100 dark:bg-blue-900/30 px-4 py-2 rounded-lg min-w-[60px] text-center">
                          {gridColumns}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Layout grid column count</p>
                    </div>

                    <div className="space-y-3">
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Default Chart Height (px)
                      </label>
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min="200"
                          max="800"
                          step="50"
                          value={defaultChartHeight}
                          onChange={(e) => setDefaultChartHeight(Number(e.target.value))}
                          className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="text-lg font-bold text-gray-900 dark:text-white bg-green-100 dark:bg-green-900/30 px-4 py-2 rounded-lg min-w-[80px] text-center">
                          {defaultChartHeight}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Height for new visualizations</p>
                    </div>

                    <div className="space-y-3">
                      <label className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Compact Mode</span>
                        <button
                          onClick={() => setCompactMode(!compactMode)}
                          className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                            compactMode ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                          }`}
                        >
                          <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                            compactMode ? 'translate-x-6' : 'translate-x-1'
                          }`} />
                        </button>
                      </label>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Reduce padding and spacing</p>
                    </div>
                  </div>
                </div>

                {/* Performance Settings */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Activity className="h-5 w-5 text-green-600 dark:text-green-400" />
                    Performance & Data
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Global Auto-Refresh Interval
                      </label>
                      <select
                        value={globalAutoRefresh}
                        onChange={(e) => setGlobalAutoRefresh(Number(e.target.value))}
                        className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 transition-colors"
                      >
                        <option value={0}>Off</option>
                        <option value={5000}>5 seconds</option>
                        <option value={10000}>10 seconds</option>
                        <option value={30000}>30 seconds</option>
                        <option value={60000}>1 minute</option>
                        <option value={300000}>5 minutes</option>
                        <option value={900000}>15 minutes</option>
                      </select>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Applies to all widgets without custom intervals</p>
                    </div>

                    <div className="space-y-3">
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Max Data Points
                      </label>
                      <div className="flex items-center gap-4">
                        <input
                          type="number"
                          min="100"
                          max="10000"
                          step="100"
                          value={maxDataPoints}
                          onChange={(e) => setMaxDataPoints(Number(e.target.value))}
                          className="flex-1 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 transition-colors"
                        />
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Default limit for query results</p>
                    </div>

                    <div className="space-y-3">
                      <label className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Enable Animations</span>
                        <button
                          onClick={() => setAnimationsEnabled(!animationsEnabled)}
                          className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                            animationsEnabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                          }`}
                        >
                          <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                            animationsEnabled ? 'translate-x-6' : 'translate-x-1'
                          }`} />
                        </button>
                      </label>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Chart transitions and effects</p>
                    </div>

                    <div className="space-y-3">
                      <label className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Show Data Labels by Default</span>
                        <button
                          onClick={() => setShowDataLabels(!showDataLabels)}
                          className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                            showDataLabels ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                          }`}
                        >
                          <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                            showDataLabels ? 'translate-x-6' : 'translate-x-1'
                          }`} />
                        </button>
                      </label>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Display values on charts</p>
                    </div>
                  </div>
                </div>

                {/* Data Management */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Database className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    Data Management
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      onClick={() => {
                        const config = {
                          visualizations,
                          globalFilters,
                          settings: { theme, globalAutoRefresh, defaultChartHeight, animationsEnabled, compactMode, showDataLabels, gridColumns, maxDataPoints },
                        };
                        const dataStr = JSON.stringify(config, null, 2);
                        const dataBlob = new Blob([dataStr], { type: 'application/json' });
                        const url = URL.createObjectURL(dataBlob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `dashboard-config-${Date.now()}.json`;
                        link.click();
                        toast.success('Exported', 'Configuration downloaded');
                      }}
                      className="flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl transition-all"
                    >
                      <Download className="h-5 w-5" />
                      Export Configuration
                    </button>

                    <button
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = '.json';
                        input.onchange = (e: any) => {
                          const file = e.target.files[0];
                          const reader = new FileReader();
                          reader.onload = (event: any) => {
                            try {
                              const config = JSON.parse(event.target.result);
                              if (config.visualizations) setVisualizations(config.visualizations);
                              if (config.globalFilters) setGlobalFilters(config.globalFilters);
                              if (config.settings) {
                                setTheme(config.settings.theme || 'auto');
                                setGlobalAutoRefresh(config.settings.globalAutoRefresh || 0);
                                setDefaultChartHeight(config.settings.defaultChartHeight || 400);
                                setAnimationsEnabled(config.settings.animationsEnabled ?? true);
                                setCompactMode(config.settings.compactMode ?? false);
                                setShowDataLabels(config.settings.showDataLabels ?? true);
                                setGridColumns(config.settings.gridColumns || 4);
                                setMaxDataPoints(config.settings.maxDataPoints || 1000);
                              }
                              toast.success('Imported', 'Configuration loaded successfully');
                            } catch (err) {
                              toast.error('Import Failed', 'Invalid configuration file');
                            }
                          };
                          reader.readAsText(file);
                        };
                        input.click();
                      }}
                      className="flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl transition-all"
                    >
                      <Database className="h-5 w-5" />
                      Import Configuration
                    </button>

                    <button
                      onClick={() => {
                        if (confirm('This will reset all settings to default values. Continue?')) {
                          setTheme('auto');
                          setGlobalAutoRefresh(0);
                          setDefaultChartHeight(400);
                          setAnimationsEnabled(true);
                          setCompactMode(false);
                          setShowDataLabels(true);
                          setGridColumns(4);
                          setMaxDataPoints(1000);
                          toast.success('Reset', 'Settings restored to defaults');
                        }
                      }}
                      className="flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl transition-all"
                    >
                      <RefreshCw className="h-5 w-5" />
                      Reset to Defaults
                    </button>

                    <button
                      onClick={() => {
                        if (confirm('This will remove all visualizations from this dashboard. Continue?')) {
                          setVisualizations([]);
                          toast.success('Cleared', 'All visualizations removed');
                        }
                      }}
                      className="flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl transition-all"
                    >
                      <Trash2 className="h-5 w-5" />
                      Clear All Visualizations
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Smart Dashboard Wizard */}
      {showTemplates && (
        <SmartDashboardWizard
          availableTables={availableTables}
          onFetchColumns={handleFetchColumnsForWizard}
          onComplete={handleWizardComplete}
          onCancel={() => setShowTemplates(false)}
        />
      )}
    </div>
  );
}
