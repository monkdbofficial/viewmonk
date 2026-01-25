'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Database, Code, Download, RefreshCw, AlertTriangle, Settings, Upload, Info, Layout, BarChart3, ChevronDown, FileText, Folder, Plus, X, TrendingUp, Activity, Gauge } from 'lucide-react';
import { useActiveConnection } from '../lib/monkdb-context';
import { useToast } from '../components/ToastContext';
import TimeSeriesChart, {
  TimeSeriesSeries,
  TimeSeriesDataPoint,
} from '../components/timeseries/TimeSeriesChart';
import DateRangePicker, { DateRange } from '../components/timeseries/DateRangePicker';
import AggregationBuilder, {
  AggregationConfig,
  TimeBucket,
} from '../components/timeseries/AggregationBuilder';
import AnomalyDetector, { Anomaly } from '../components/timeseries/AnomalyDetector';
import TableConfigDialog, { TableConfig } from '../components/timeseries/TableConfigDialog';
import ImportDataDialog from '../components/timeseries/ImportDataDialog';
import ExportDataDialog from '../components/timeseries/ExportDataDialog';
import CRUDInfoDialog from '../components/timeseries/CRUDInfoDialog';
import DashboardBuilder from '../components/timeseries/DashboardBuilder';
import DashboardViewer from '../components/timeseries/DashboardViewer';
import OnboardingGuide from '../components/timeseries/OnboardingGuide';
import { subHours } from 'date-fns';

// Widget types
type WidgetType = 'timeseries' | 'aggregation' | 'anomaly';

interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
}

// SQL template generator
function generateSQLQuery(
  tableName: string,
  timestampColumn: string,
  config: AggregationConfig,
  dateRange: DateRange
): string {
  // Map time buckets to DATE_TRUNC interval names
  const dateTruncIntervalMap: Record<TimeBucket, string> = {
    '1m': 'minute',
    '5m': 'minute',
    '15m': 'minute',
    '30m': 'minute',
    '1h': 'hour',
    '6h': 'hour',
    '12h': 'hour',
    '1d': 'day',
    '7d': 'day',
  };

  const dateTruncInterval = dateTruncIntervalMap[config.timeBucket];

  // Build SELECT clause
  const selectClauses = [
    `DATE_TRUNC('${dateTruncInterval}', ${timestampColumn}) AS time_bucket`,
  ];

  config.metrics.forEach((metric) => {
    const alias = metric.alias || `${metric.function.toLowerCase()}_${metric.column}`;
    if (metric.function === 'PERCENTILE_95') {
      selectClauses.push(`PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY ${metric.column}) AS ${alias}`);
    } else if (metric.function === 'PERCENTILE_99') {
      selectClauses.push(`PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY ${metric.column}) AS ${alias}`);
    } else {
      selectClauses.push(`${metric.function}(${metric.column}) AS ${alias}`);
    }
  });

  // Build GROUP BY clause
  let groupByClause = 'time_bucket';
  if (config.groupBy.length > 0) {
    selectClauses.push(...config.groupBy);
    groupByClause += ', ' + config.groupBy.join(', ');
  }

  const sql = `SELECT
  ${selectClauses.join(',\n  ')}
FROM ${tableName}
WHERE ${timestampColumn} >= TIMESTAMP '${dateRange.start.toISOString()}'
  AND ${timestampColumn} <= TIMESTAMP '${dateRange.end.toISOString()}'
GROUP BY ${groupByClause}
ORDER BY time_bucket DESC
LIMIT 1000;`;

  return sql;
}

// NOTE: Sample data generation removed for production
// This feature now requires REAL time-series data from your database
// Follow the instructions in the UI to configure your table and columns

export default function TimeSeriesPage() {
  const activeConnection = useActiveConnection();
  const toast = useToast();

  // Table Configuration State - NO HARDCODED DEFAULTS
  const [tableConfig, setTableConfig] = useState<TableConfig | null>(() => {
    // Load from localStorage if available
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('timeseries-table-config');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);

          // Check if parsed is valid
          if (!parsed || typeof parsed !== 'object') {
            console.log('Invalid configuration in localStorage, clearing...');
            localStorage.removeItem('timeseries-table-config');
            return null;
          }

          // Validate: If it's the old hardcoded default, clear it
          if (parsed.tableName === 'sensor_readings' && parsed.schemaName === 'demo') {
            console.log('Clearing old hardcoded configuration from localStorage');
            localStorage.removeItem('timeseries-table-config');
            return null;
          }

          return parsed;
        } catch (e) {
          console.error('Failed to parse saved table config:', e);
          localStorage.removeItem('timeseries-table-config');
        }
      }
    }
    // NO default configuration - user must configure
    return null;
  });

  // Dialog State
  const [showTableConfig, setShowTableConfig] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showCRUDInfo, setShowCRUDInfo] = useState(false);
  const [showDashboardBuilder, setShowDashboardBuilder] = useState(false);
  const [showDashboardViewer, setShowDashboardViewer] = useState(false);

  // Dashboard Templates State
  const [savedTemplates, setSavedTemplates] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dashboard-templates');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Failed to parse saved templates:', e);
        }
      }
    }
    return [];
  });

  // State
  const [dateRange, setDateRange] = useState<DateRange>({
    start: subHours(new Date(), 24),
    end: new Date(),
  });
  const [isRealTime, setIsRealTime] = useState(false);
  const [aggregationConfig, setAggregationConfig] = useState<AggregationConfig>(() => {
    // Start with minimal default - user will configure based on their actual columns
    const firstColumn = tableConfig?.availableColumns[0] || 'value';
    return {
      timeBucket: '1h',
      metrics: [
        { column: firstColumn, function: 'AVG', alias: `avg_${firstColumn}` },
      ],
      groupBy: [],
    };
  });
  const [generatedSQL, setGeneratedSQL] = useState('');
  const [showSQL, setShowSQL] = useState(false);
  const [series, setSeries] = useState<TimeSeriesSeries[]>([]);
  const [anomalyTimestamps, setAnomalyTimestamps] = useState<Date[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoadedData, setHasLoadedData] = useState(false);
  const [showDashboardMenu, setShowDashboardMenu] = useState(false);
  const [showDataMenu, setShowDataMenu] = useState(false);
  const [showAddWidgetMenu, setShowAddWidgetMenu] = useState(false);

  // Dashboard Widgets State
  const [dashboardWidgets, setDashboardWidgets] = useState<DashboardWidget[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dashboard-widgets');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Failed to parse saved widgets:', e);
        }
      }
    }
    // Default: start with one time-series widget
    return [
      { id: 'widget-1', type: 'timeseries', title: 'Time-Series Visualization' }
    ];
  });

  // Save table config to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('timeseries-table-config', JSON.stringify(tableConfig));
    }
  }, [tableConfig]);

  // Save dashboard widgets to localStorage when they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('dashboard-widgets', JSON.stringify(dashboardWidgets));
    }
  }, [dashboardWidgets]);

  // Add widget function
  const addWidget = (type: WidgetType) => {
    const newWidget: DashboardWidget = {
      id: `widget-${Date.now()}`,
      type,
      title: type === 'timeseries' ? 'Time-Series Chart' :
             type === 'aggregation' ? 'Aggregation Builder' :
             'Anomaly Detector'
    };
    setDashboardWidgets([...dashboardWidgets, newWidget]);
    setShowAddWidgetMenu(false);
    toast.success('Widget Added', `${newWidget.title} has been added to your dashboard`);
  };

  // Remove widget function
  const removeWidget = (widgetId: string) => {
    setDashboardWidgets(dashboardWidgets.filter(w => w.id !== widgetId));
    toast.success('Widget Removed', 'Widget has been removed from your dashboard');
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.relative')) {
        setShowDashboardMenu(false);
        setShowDataMenu(false);
        setShowAddWidgetMenu(false);
      }
    };

    if (showDashboardMenu || showDataMenu || showAddWidgetMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDashboardMenu, showDataMenu, showAddWidgetMenu]);

  // Note: Removed automatic data loading on mount
  // Data now only loads when user explicitly clicks "Refresh" button
  // This prevents errors when default table doesn't exist

  const loadData = async () => {
    // CRITICAL: Don't try to load if no table is configured
    if (!tableConfig) {
      console.log('⚠️ No table configured yet - skipping data load');
      return;
    }

    if (!activeConnection) {
      toast.error('No Database Connection', 'Please connect to a MonkDB database first.');
      return;
    }

    setLoading(true);

    try {
      // Generate the SQL query using dynamic table config
      const fullTableName = `${tableConfig.schemaName}.${tableConfig.tableName}`;
      const sql = generateSQLQuery(
        fullTableName,
        tableConfig.timestampColumn,
        aggregationConfig,
        dateRange
      );

      console.log('Executing time-series query:', sql);
      const result = await activeConnection.client.query(sql);

      if (result.rows && result.rows.length > 0) {
        console.log('Time-series data loaded:', result.rows.length, 'rows');

        // Transform data into time-series format
        const dataByMetric: { [key: string]: TimeSeriesDataPoint[] } = {};

        result.rows.forEach((row: any[]) => {
          const timestamp = new Date(row[0]); // time_bucket

          // Process each metric column (skip first column which is time_bucket)
          aggregationConfig.metrics.forEach((metric, index) => {
            const metricKey = metric.alias || `${metric.function.toLowerCase()}_${metric.column}`;
            const value = row[index + 1]; // +1 to skip time_bucket column

            if (!dataByMetric[metricKey]) {
              dataByMetric[metricKey] = [];
            }

            if (value !== null && value !== undefined && !isNaN(Number(value))) {
              dataByMetric[metricKey].push({
                timestamp,
                value: Number(value),
              });
            }
          });
        });

        // Convert to TimeSeriesSeries format
        const seriesData: TimeSeriesSeries[] = Object.entries(dataByMetric).map(([name, data]) => ({
          name,
          data: data.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()),
        }));

        setSeries(seriesData);
        setHasLoadedData(true);
        console.log('Time-series visualization ready with', seriesData.length, 'series');
      } else {
        console.log('No time-series data found');
        setSeries([]);
        setHasLoadedData(true);
      }
    } catch (error) {
      console.error('Failed to load time-series data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Check if it's a "table doesn't exist" error
      if (errorMessage.includes('unknown') || errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
        toast.error(
          'Table Not Found',
          `The table "${tableConfig.schemaName}.${tableConfig.tableName}" does not exist. Click "Configure" to select a different table or "Import" to create and populate a new one.`
        );
      } else {
        toast.error('Failed to Load Data', errorMessage);
      }
      setSeries([]);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSQL = () => {
    if (!tableConfig) return;
    const fullTableName = `${tableConfig.schemaName}.${tableConfig.tableName}`;
    const sql = generateSQLQuery(
      fullTableName,
      tableConfig.timestampColumn,
      aggregationConfig,
      dateRange
    );
    setGeneratedSQL(sql);
    setShowSQL(true);
  };

  const handleTableConfigSave = async (config: TableConfig) => {
    setTableConfig(config);
    // Reload data with new configuration
    // Small delay to ensure state is updated
    setTimeout(() => {
      loadData();
    }, 100);
  };

  const handleImportSuccess = () => {
    // Reload data after successful import
    loadData();
  };

  const handleCopySQL = () => {
    navigator.clipboard.writeText(generatedSQL);
    toast.success('SQL Copied!', 'You can now run this in Query Editor, modify it for custom analysis, or use it in other tools.');
  };

  const handleAnomaliesDetected = useCallback((anomalies: Anomaly[]) => {
    setAnomalyTimestamps(anomalies.map((a) => a.timestamp));
  }, []);

  const handleExportData = () => {
    // Open the professional export dialog
    setShowExportDialog(true);
  };

  const handleSaveDashboard = (template: any) => {
    const updatedTemplates = [...savedTemplates, template];
    setSavedTemplates(updatedTemplates);
    if (typeof window !== 'undefined') {
      localStorage.setItem('dashboard-templates', JSON.stringify(updatedTemplates));
    }
    toast.success('Dashboard Saved!', `"${template.name}" has been saved successfully. Click "View Dashboards" to see your saved dashboards.`);
  };

  const handleDeleteDashboard = (templateId: string) => {
    const updatedTemplates = savedTemplates.filter((t) => t.id !== templateId);
    setSavedTemplates(updatedTemplates);
    if (typeof window !== 'undefined') {
      localStorage.setItem('dashboard-templates', JSON.stringify(updatedTemplates));
    }
    // Close viewer if no templates left
    if (updatedTemplates.length === 0) {
      setShowDashboardViewer(false);
    }
  };

  // Memoize anomaly detector data to avoid creating new array references
  const anomalyDetectorData = useMemo(() => {
    return series[0]?.data || [];
  }, [series]);

  // Show no connection state
  if (!activeConnection) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="max-w-md rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/50 p-12 text-center dark:border-gray-700 dark:bg-gray-800/50">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
            <Database className="h-10 w-10 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="mt-6 text-xl font-bold text-gray-900 dark:text-white">
            No Active Connection
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Please connect to a MonkDB database to use time-series analytics.
          </p>
          <a
            href="/connections"
            className="mt-6 inline-block rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            Manage Connections
          </a>
        </div>
      </div>
    );
  }

  // Show onboarding guide when no table is configured
  if (!tableConfig) {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-6 py-4 dark:border-gray-700 dark:from-gray-800 dark:to-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Database className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  Time-Series Analytics
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Enterprise-grade time-series data visualization and analysis
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCRUDInfo(true)}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                title="View SQL examples and best practices"
              >
                <Info className="h-4 w-4" />
                SQL Guide
              </button>
            </div>
          </div>
        </div>

        {/* Onboarding Guide */}
        <OnboardingGuide
          onConfigure={() => setShowTableConfig(true)}
          onImport={() => setShowImportDialog(true)}
        />

        {/* Dialogs */}
        {showTableConfig && (
          <TableConfigDialog
            currentConfig={null}
            onSave={handleTableConfigSave}
            onClose={() => setShowTableConfig(false)}
          />
        )}

        {showImportDialog && (
          <ImportDataDialog
            tableName="your_table_name"
            onClose={() => setShowImportDialog(false)}
            onSuccess={handleImportSuccess}
          />
        )}

        {showCRUDInfo && (
          <CRUDInfoDialog onClose={() => setShowCRUDInfo(false)} />
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header - Fixed */}
      <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-6 py-4 dark:border-gray-700 dark:from-gray-800 dark:to-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Database className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Time-Series Analytics
              </h1>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-green-700 dark:text-green-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-600 dark:bg-green-400 animate-pulse"></span>
                  Connected: {tableConfig.schemaName}.{tableConfig.tableName}
                </span>
                <span className="text-gray-400">•</span>
                <span>{tableConfig.availableColumns.length} metrics available</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {/* Add Widget Button */}
            <div className="relative">
              <button
                onClick={() => setShowAddWidgetMenu(!showAddWidgetMenu)}
                className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
                title="Add widget to dashboard"
              >
                <Plus className="h-4 w-4" />
                Add Widget
              </button>

              {showAddWidgetMenu && (
                <div className="absolute left-0 top-full mt-2 w-64 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800 z-50">
                  <div className="p-2">
                    <button
                      onClick={() => addWidget('timeseries')}
                      className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">Time-Series Chart</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Line chart with temporal data</div>
                      </div>
                    </button>
                    <button
                      onClick={() => addWidget('aggregation')}
                      className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <BarChart3 className="h-5 w-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">Aggregation Builder</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Configure metrics and time buckets</div>
                      </div>
                    </button>
                    <button
                      onClick={() => addWidget('anomaly')}
                      className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <Activity className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">Anomaly Detector</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Detect outliers and anomalies</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Primary Action: Refresh */}
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
              title="Reload data from database"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            {/* Dashboards Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowDashboardMenu(!showDashboardMenu)}
                className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600"
                title="Dashboard options"
              >
                <Layout className="h-4 w-4" />
                Dashboards
                <ChevronDown className={`h-4 w-4 transition-transform ${showDashboardMenu ? 'rotate-180' : ''}`} />
              </button>

              {showDashboardMenu && (
                <div className="absolute right-0 top-full mt-2 w-64 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800 z-50">
                  <div className="p-2">
                    <button
                      onClick={() => {
                        setShowCRUDInfo(true);
                        setShowDashboardMenu(false);
                      }}
                      className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">SQL Guide</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">30+ copy-paste SQL examples</div>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        setShowDashboardBuilder(true);
                        setShowDashboardMenu(false);
                      }}
                      className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <Layout className="h-5 w-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">Create Dashboard</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Build custom dashboards with 7 chart types</div>
                      </div>
                    </button>
                    {savedTemplates.length > 0 && (
                      <button
                        onClick={() => {
                          setShowDashboardViewer(true);
                          setShowDashboardMenu(false);
                        }}
                        className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <BarChart3 className="h-5 w-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            View Dashboards ({savedTemplates.length})
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Execute saved dashboards with real-time data</div>
                        </div>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Data Management Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowDataMenu(!showDataMenu)}
                className="flex items-center gap-2 rounded-lg bg-gray-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 dark:bg-gray-500 dark:hover:bg-gray-600"
                title="Data management options"
              >
                <Folder className="h-4 w-4" />
                Data
                <ChevronDown className={`h-4 w-4 transition-transform ${showDataMenu ? 'rotate-180' : ''}`} />
              </button>

              {showDataMenu && (
                <div className="absolute right-0 top-full mt-2 w-64 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800 z-50">
                  <div className="p-2">
                    <button
                      onClick={() => {
                        setShowTableConfig(true);
                        setShowDataMenu(false);
                      }}
                      className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <Settings className="h-5 w-5 text-gray-600 dark:text-gray-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">Configure</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Change data source or select table</div>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        setShowImportDialog(true);
                        setShowDataMenu(false);
                      }}
                      className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <Upload className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">Import</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Upload CSV/JSON files</div>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        handleExportData();
                        setShowDataMenu(false);
                      }}
                      disabled={series.length === 0}
                      className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Download className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">Export</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Export in CSV, JSON, Excel, or SQL</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-auto">
        <div className="space-y-4 p-4">

        {/* Date Range Picker */}
        <DateRangePicker
          value={dateRange}
          onChange={setDateRange}
          isRealTime={isRealTime}
          onRealTimeToggle={setIsRealTime}
        />

        {/* Dashboard Widgets */}
        {!hasLoadedData ? (
          <div className="flex h-96 items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900/20 rounded-lg border-2 border-dashed border-blue-200 dark:border-blue-800">
            <div className="text-center px-8 max-w-2xl">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-5">
                <BarChart3 className="h-10 w-10 text-blue-600 dark:text-blue-400" />
              </div>

              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                Ready to Visualize Your Data
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-8">
                Your data source is configured. Add widgets to your dashboard and load data to visualize.
              </p>

              {/* Steps */}
              <div className="grid grid-cols-3 gap-4 mb-8 text-left">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">1</div>
                  <div>
                    <div className="text-xs font-semibold text-gray-900 dark:text-white mb-1">Add Widgets</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Click "Add Widget" to add charts</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">2</div>
                  <div>
                    <div className="text-xs font-semibold text-gray-900 dark:text-white mb-1">Configure & Date Range</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Set metrics and time period</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">3</div>
                  <div>
                    <div className="text-xs font-semibold text-gray-900 dark:text-white mb-1">Load Data</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Click Refresh to visualize</div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={loadData}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all shadow-md hover:shadow-lg"
                >
                  <RefreshCw className="h-5 w-5" />
                  Load Data Now
                </button>
                <button
                  onClick={handleGenerateSQL}
                  className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-all"
                >
                  <Code className="h-5 w-5" />
                  Preview SQL
                </button>
              </div>
            </div>
          </div>
        ) : series.length === 0 && hasLoadedData ? (
            <div className="flex h-96 items-center justify-center bg-gradient-to-br from-yellow-50 via-white to-orange-50 dark:from-gray-900 dark:via-gray-800 dark:to-yellow-900/20 rounded-lg border-2 border-dashed border-yellow-200 dark:border-yellow-800">
              <div className="text-center px-8 max-w-2xl">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-yellow-100 dark:bg-yellow-900/30 mb-5">
                  <AlertTriangle className="h-10 w-10 text-yellow-600 dark:text-yellow-500" />
                </div>

                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                  No Data Found in Selected Range
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  The query executed successfully but returned no results for the selected time period.
                </p>

                {/* Suggestions */}
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6 text-left">
                  <div className="text-sm font-semibold text-yellow-900 dark:text-yellow-300 mb-3 flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Quick Solutions
                  </div>
                  <ul className="space-y-2 text-sm text-yellow-800 dark:text-yellow-200">
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-600 dark:text-yellow-400">•</span>
                      <span><strong>Expand time range:</strong> Try selecting a wider date range above</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-600 dark:text-yellow-400">•</span>
                      <span><strong>Check data availability:</strong> Verify your table contains data</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-600 dark:text-yellow-400">•</span>
                      <span><strong>Import new data:</strong> Upload CSV/JSON files to populate the table</span>
                    </li>
                  </ul>
                </div>

                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => setShowImportDialog(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-all shadow-md hover:shadow-lg"
                  >
                    <Upload className="h-5 w-5" />
                    Import Data
                  </button>
                  <button
                    onClick={handleGenerateSQL}
                    className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-all"
                  >
                    <Code className="h-5 w-5" />
                    View SQL Query
                  </button>
                </div>
              </div>
            </div>
        ) : (
          /* Render Dashboard Widgets */
          <div className="grid gap-4 lg:grid-cols-2">
            {dashboardWidgets.map((widget) => (
              <div
                key={widget.id}
                className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 relative"
              >
                {/* Widget Header with Remove Button */}
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {widget.title}
                  </h2>
                  <button
                    onClick={() => removeWidget(widget.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-red-100 text-red-600 transition-colors hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                    title="Remove widget"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Widget Content */}
                {widget.type === 'timeseries' && (
                  loading ? (
                    <div className="flex h-80 items-center justify-center">
                      <div className="text-center">
                        <RefreshCw className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400 mx-auto mb-3" />
                        <p className="text-sm text-gray-600 dark:text-gray-400">Loading your data...</p>
                      </div>
                    </div>
                  ) : series.length > 0 ? (
                    <TimeSeriesChart
                      series={series}
                      height={320}
                      showZoomControls={true}
                      anomalies={anomalyTimestamps}
                    />
                  ) : (
                    <div className="flex h-80 items-center justify-center">
                      <p className="text-sm text-gray-500 dark:text-gray-400">No data to display. Click Refresh to load data.</p>
                    </div>
                  )
                )}

                {widget.type === 'aggregation' && (
                  <AggregationBuilder
                    availableColumns={tableConfig.availableColumns}
                    value={aggregationConfig}
                    onChange={setAggregationConfig}
                    onGenerateSQL={handleGenerateSQL}
                  />
                )}

                {widget.type === 'anomaly' && (
                  <AnomalyDetector
                    data={anomalyDetectorData}
                    threshold={2}
                    onAnomaliesDetected={handleAnomaliesDetected}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* SQL Query Display */}
        {showSQL && (
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                <Code className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                Generated SQL Query
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={handleCopySQL}
                  className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  Copy
                </button>
                <button
                  onClick={() => setShowSQL(false)}
                  className="rounded-lg bg-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  Close
                </button>
              </div>
            </div>
            <pre className="overflow-x-auto rounded-lg bg-gray-900 p-3 text-xs text-green-400">
              <code>{generatedSQL}</code>
            </pre>
          </div>
        )}
        </div>
      </div>

      {/* Dialogs */}
      {showTableConfig && (
        <TableConfigDialog
          currentConfig={tableConfig}
          onSave={handleTableConfigSave}
          onClose={() => setShowTableConfig(false)}
        />
      )}

      {showImportDialog && (
        <ImportDataDialog
          tableName={`${tableConfig.schemaName}.${tableConfig.tableName}`}
          onClose={() => setShowImportDialog(false)}
          onSuccess={handleImportSuccess}
        />
      )}

      {showExportDialog && series.length > 0 && (
        <ExportDataDialog
          series={series}
          tableName={`${tableConfig.schemaName}.${tableConfig.tableName}`}
          onClose={() => setShowExportDialog(false)}
        />
      )}

      {showCRUDInfo && (
        <CRUDInfoDialog onClose={() => setShowCRUDInfo(false)} />
      )}

      {showDashboardBuilder && (
        <DashboardBuilder
          availableColumns={tableConfig.availableColumns}
          tableName={`${tableConfig.schemaName}.${tableConfig.tableName}`}
          onClose={() => setShowDashboardBuilder(false)}
          onSave={handleSaveDashboard}
        />
      )}

      {showDashboardViewer && savedTemplates.length > 0 && (
        <DashboardViewer
          templates={savedTemplates}
          tableName={`${tableConfig.schemaName}.${tableConfig.tableName}`}
          timestampColumn={tableConfig.timestampColumn}
          onClose={() => setShowDashboardViewer(false)}
          onDelete={handleDeleteDashboard}
        />
      )}
    </div>
  );
}
