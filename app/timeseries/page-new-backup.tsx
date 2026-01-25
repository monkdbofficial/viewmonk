'use client';

import { useState, useEffect } from 'react';
import { Database, Plus, Trash2, BarChart3, TrendingUp, Activity, PieChart, LineChart, Settings, Save, Eye, Grid3x3, LayoutGrid } from 'lucide-react';
import { useActiveConnection } from '../lib/monkdb-context';
import { useToast } from '../components/ToastContext';
import { TableConfig } from '../components/timeseries/TableConfigDialog';
import TableConfigDialog from '../components/timeseries/TableConfigDialog';

// Widget Types
type WidgetType = 'timeseries' | 'aggregation' | 'anomaly' | 'statistics' | 'heatmap';

interface Widget {
  id: string;
  type: WidgetType;
  title: string;
  config: any;
  position: { row: number; col: number };
  size: { width: number; height: number };
}

interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  icon: any;
  widgets: Omit<Widget, 'id'>[];
}

// Predefined Templates
const DASHBOARD_TEMPLATES: DashboardTemplate[] = [
  {
    id: 'iot-monitoring',
    name: 'IoT Sensor Monitoring',
    description: 'Real-time monitoring of IoT sensors with time-series charts, anomaly detection, and aggregations',
    icon: Activity,
    widgets: [
      {
        type: 'timeseries',
        title: 'Temperature Over Time',
        config: { metrics: ['temperature'], timeBucket: '1h' },
        position: { row: 0, col: 0 },
        size: { width: 2, height: 1 }
      },
      {
        type: 'anomaly',
        title: 'Anomaly Detection',
        config: { threshold: 2 },
        position: { row: 0, col: 2 },
        size: { width: 1, height: 1 }
      },
      {
        type: 'aggregation',
        title: 'Daily Averages',
        config: { timeBucket: '1d', function: 'AVG' },
        position: { row: 1, col: 0 },
        size: { width: 1, height: 1 }
      }
    ]
  },
  {
    id: 'performance',
    name: 'Performance Metrics',
    description: 'Application performance monitoring with response times, throughput, and error rates',
    icon: TrendingUp,
    widgets: [
      {
        type: 'timeseries',
        title: 'Response Time',
        config: { metrics: ['response_time'], timeBucket: '5m' },
        position: { row: 0, col: 0 },
        size: { width: 2, height: 1 }
      },
      {
        type: 'statistics',
        title: 'Key Metrics',
        config: { metrics: ['request_count', 'error_rate'] },
        position: { row: 0, col: 2 },
        size: { width: 1, height: 1 }
      }
    ]
  },
  {
    id: 'business',
    name: 'Business Analytics',
    description: 'Revenue tracking, customer metrics, and business KPIs over time',
    icon: BarChart3,
    widgets: [
      {
        type: 'timeseries',
        title: 'Revenue Trends',
        config: { metrics: ['revenue'], timeBucket: '1d' },
        position: { row: 0, col: 0 },
        size: { width: 2, height: 1 }
      },
      {
        type: 'aggregation',
        title: 'Total Sales',
        config: { timeBucket: '1d', function: 'SUM' },
        position: { row: 1, col: 0 },
        size: { width: 1, height: 1 }
      }
    ]
  },
  {
    id: 'custom',
    name: 'Start from Scratch',
    description: 'Build your own custom dashboard by adding widgets one by one',
    icon: Grid3x3,
    widgets: []
  }
];

// Available Widget Types
const WIDGET_TYPES = [
  { type: 'timeseries' as const, name: 'Time-Series Chart', icon: LineChart, description: 'Line chart showing data over time' },
  { type: 'aggregation' as const, name: 'Aggregation Panel', icon: TrendingUp, description: 'Statistical aggregations (AVG, SUM, MIN, MAX)' },
  { type: 'anomaly' as const, name: 'Anomaly Detection', icon: Activity, description: 'Detect outliers and anomalies in your data' },
  { type: 'statistics' as const, name: 'Statistics Cards', icon: BarChart3, description: 'Key metrics and KPIs at a glance' },
  { type: 'heatmap' as const, name: 'Heatmap', icon: PieChart, description: 'Density visualization of time-series data' }
];

export default function TimeSeriesPageNew() {
  const activeConnection = useActiveConnection();
  const toast = useToast();

  // State
  const [tableConfig, setTableConfig] = useState<TableConfig | null>(null);
  const [showTableConfig, setShowTableConfig] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [showWidgetPicker, setShowWidgetPicker] = useState(false);
  const [dashboardName, setDashboardName] = useState('My Dashboard');
  const [isEditingName, setIsEditingName] = useState(false);

  // Load saved config
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('timeseries-table-config');
      if (saved) {
        try {
          setTableConfig(JSON.parse(saved));
        } catch (e) {
          console.error('Failed to parse saved config:', e);
        }
      }
    }
  }, []);

  const handleTableConfigSave = (config: TableConfig) => {
    setTableConfig(config);
    localStorage.setItem('timeseries-table-config', JSON.stringify(config));
    setShowTableConfig(false);
    toast.success('Configuration Saved', 'Your data source has been configured successfully.');
  };

  const handleSelectTemplate = (templateId: string) => {
    const template = DASHBOARD_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      setDashboardName(template.name);
      // Convert template widgets to actual widgets with IDs
      const newWidgets: Widget[] = template.widgets.map((w, i) => ({
        ...w,
        id: `widget-${Date.now()}-${i}`
      }));
      setWidgets(newWidgets);
      toast.success('Template Loaded', `"${template.name}" template has been loaded. Customize it to fit your needs.`);
    }
  };

  const handleAddWidget = (type: WidgetType) => {
    const newWidget: Widget = {
      id: `widget-${Date.now()}`,
      type,
      title: `New ${type} Widget`,
      config: {},
      position: { row: widgets.length, col: 0 },
      size: { width: 1, height: 1 }
    };
    setWidgets([...widgets, newWidget]);
    setShowWidgetPicker(false);
    toast.success('Widget Added', 'Configure your new widget below.');
  };

  const handleRemoveWidget = (widgetId: string) => {
    setWidgets(widgets.filter(w => w.id !== widgetId));
    toast.success('Widget Removed', 'The widget has been removed from your dashboard.');
  };

  const handleSaveDashboard = () => {
    const dashboard = {
      name: dashboardName,
      widgets,
      tableConfig,
      savedAt: new Date().toISOString()
    };
    localStorage.setItem('timeseries-custom-dashboard', JSON.stringify(dashboard));
    toast.success('Dashboard Saved', `"${dashboardName}" has been saved successfully.`);
  };

  // Show connection requirement
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

  // Show template selection if no table configured
  if (!tableConfig) {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-6 py-4 dark:border-gray-700 dark:from-gray-800 dark:to-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Time-Series Analytics
              </h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Configure your data source to get started
              </p>
            </div>
          </div>
        </div>

        {/* Setup Flow */}
        <div className="flex-1 overflow-auto bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-900/20 p-8">
          <div className="mx-auto max-w-5xl">
            {/* Step 1: Configure Data Source */}
            <div className="mb-8 rounded-xl border-2 border-blue-200 bg-white p-8 shadow-lg dark:border-blue-800 dark:bg-gray-800">
              <div className="flex items-start gap-6">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <span className="text-xl font-bold text-blue-600 dark:text-blue-400">1</span>
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    Configure Data Source
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                    Select the database table containing your time-series data. We'll auto-detect timestamp columns and available metrics.
                  </p>
                  <button
                    onClick={() => setShowTableConfig(true)}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                  >
                    <Settings className="h-5 w-5" />
                    Configure Data Source
                  </button>
                </div>
              </div>
            </div>

            {/* Step 2: Choose Template (Disabled until step 1 complete) */}
            <div className="rounded-xl border-2 border-gray-200 bg-white p-8 opacity-50 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-start gap-6">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                  <span className="text-xl font-bold text-gray-600 dark:text-gray-400">2</span>
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    Choose Dashboard Template
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Select a template that matches your use case, or start from scratch
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dialogs */}
        {showTableConfig && (
          <TableConfigDialog
            currentConfig={null}
            onSave={handleTableConfigSave}
            onClose={() => setShowTableConfig(false)}
          />
        )}
      </div>
    );
  }

  // Show template picker if no template selected
  if (!selectedTemplate) {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-6 py-4 dark:border-gray-700 dark:from-gray-800 dark:to-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Choose Your Dashboard Template
              </h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Connected to: <span className="font-semibold">{tableConfig.schemaName}.{tableConfig.tableName}</span>
              </p>
            </div>
            <button
              onClick={() => setShowTableConfig(true)}
              className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <Settings className="h-4 w-4" />
              Change Source
            </button>
          </div>
        </div>

        {/* Template Grid */}
        <div className="flex-1 overflow-auto bg-gradient-to-br from-gray-50 to-purple-50 dark:from-gray-900 dark:to-purple-900/20 p-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                Select a Template to Get Started
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Choose a pre-built template or create your own custom dashboard
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
              {DASHBOARD_TEMPLATES.map((template) => {
                const Icon = template.icon;
                return (
                  <button
                    key={template.id}
                    onClick={() => handleSelectTemplate(template.id)}
                    className="group relative rounded-xl border-2 border-gray-200 bg-white p-8 text-left transition-all hover:border-blue-500 hover:shadow-xl dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-500"
                  >
                    <div className="mb-4 flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                        <Icon className="h-7 w-7" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                          {template.name}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {template.widgets.length} {template.widgets.length === 1 ? 'widget' : 'widgets'}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      {template.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 group-hover:text-blue-700">
                        Select Template →
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
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
      </div>
    );
  }

  // Main Dashboard Builder
  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-6 py-4 dark:border-gray-700 dark:from-gray-800 dark:to-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {isEditingName ? (
              <input
                type="text"
                value={dashboardName}
                onChange={(e) => setDashboardName(e.target.value)}
                onBlur={() => setIsEditingName(false)}
                onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
                className="rounded-lg border border-blue-500 bg-white px-3 py-1 text-xl font-bold text-gray-900 focus:outline-none dark:border-blue-400 dark:bg-gray-800 dark:text-white"
                autoFocus
              />
            ) : (
              <h1
                onClick={() => setIsEditingName(true)}
                className="cursor-pointer text-xl font-bold text-gray-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
                title="Click to edit name"
              >
                {dashboardName}
              </h1>
            )}
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
              {widgets.length} {widgets.length === 1 ? 'Widget' : 'Widgets'}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowWidgetPicker(true)}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              <Plus className="h-4 w-4" />
              Add Widget
            </button>
            <button
              onClick={handleSaveDashboard}
              className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
            >
              <Save className="h-4 w-4" />
              Save
            </button>
            <button
              onClick={() => setShowTableConfig(true)}
              className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <Settings className="h-4 w-4" />
              Configure
            </button>
          </div>
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900 p-6">
        {widgets.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-800">
                <LayoutGrid className="h-10 w-10 text-gray-400 dark:text-gray-600" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
                No Widgets Yet
              </h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Click "Add Widget" to start building your dashboard
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {widgets.map((widget) => {
              const widgetType = WIDGET_TYPES.find(t => t.type === widget.type);
              const Icon = widgetType?.icon || BarChart3;

              return (
                <div
                  key={widget.id}
                  className="group relative rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-lg dark:border-gray-700 dark:bg-gray-800"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                        <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {widget.title}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {widgetType?.name}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveWidget(widget.id)}
                      className="opacity-0 transition-opacity group-hover:opacity-100"
                      title="Remove widget"
                    >
                      <Trash2 className="h-4 w-4 text-red-600 hover:text-red-700 dark:text-red-400" />
                    </button>
                  </div>

                  {/* Widget Content Placeholder */}
                  <div className="flex h-48 items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
                    <div className="text-center">
                      <Eye className="mx-auto h-8 w-8 text-gray-400 dark:text-gray-600" />
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        Widget Preview
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Widget Picker Modal */}
      {showWidgetPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-w-4xl w-full rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800">
            <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Add Widget to Dashboard
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Choose a widget type to add to your dashboard
              </p>
            </div>
            <div className="grid gap-4 p-6 md:grid-cols-2">
              {WIDGET_TYPES.map((widgetType) => {
                const Icon = widgetType.icon;
                return (
                  <button
                    key={widgetType.type}
                    onClick={() => handleAddWidget(widgetType.type)}
                    className="group rounded-lg border-2 border-gray-200 bg-white p-6 text-left transition-all hover:border-blue-500 hover:shadow-lg dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-500"
                  >
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                        <Icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {widgetType.name}
                      </h3>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {widgetType.description}
                    </p>
                  </button>
                );
              })}
            </div>
            <div className="border-t border-gray-200 px-6 py-4 dark:border-gray-700">
              <button
                onClick={() => setShowWidgetPicker(false)}
                className="rounded-lg bg-gray-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 dark:bg-gray-500 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialogs */}
      {showTableConfig && (
        <TableConfigDialog
          currentConfig={tableConfig}
          onSave={handleTableConfigSave}
          onClose={() => setShowTableConfig(false)}
        />
      )}
    </div>
  );
}
