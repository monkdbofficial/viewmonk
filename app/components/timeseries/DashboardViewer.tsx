'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Trash2,
  RefreshCw,
  Layout,
  BarChart3,
  LineChart,
  PieChart,
  ScatterChart,
  AreaChart,
  TrendingUp,
  Download,
  Calendar,
} from 'lucide-react';
import { useActiveConnection } from '../../lib/monkdb-context';
import TimeSeriesChart, { TimeSeriesSeries, TimeSeriesDataPoint } from './TimeSeriesChart';

interface ChartWidget {
  id: string;
  title: string;
  chartType: ChartType;
  columns: string[];
  groupBy: string | null;
  aggregation: 'AVG' | 'SUM' | 'COUNT' | 'MIN' | 'MAX';
  color: string;
  position: { x: number; y: number; w: number; h: number };
}

type ChartType = 'line' | 'bar' | 'area' | 'pie' | 'scatter' | 'gauge' | 'table';

interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  widgets: ChartWidget[];
  createdAt: string;
}

interface DashboardViewerProps {
  templates: DashboardTemplate[];
  tableName: string;
  timestampColumn: string;
  onClose: () => void;
  onDelete: (templateId: string) => void;
}

const CHART_TYPES = [
  { type: 'line' as ChartType, icon: LineChart, name: 'Line Chart' },
  { type: 'bar' as ChartType, icon: BarChart3, name: 'Bar Chart' },
  { type: 'area' as ChartType, icon: AreaChart, name: 'Area Chart' },
  { type: 'pie' as ChartType, icon: PieChart, name: 'Pie Chart' },
  { type: 'scatter' as ChartType, icon: ScatterChart, name: 'Scatter Plot' },
  { type: 'gauge' as ChartType, icon: TrendingUp, name: 'Gauge' },
  { type: 'table' as ChartType, icon: Layout, name: 'Data Table' },
];

export default function DashboardViewer({
  templates,
  tableName,
  timestampColumn,
  onClose,
  onDelete,
}: DashboardViewerProps) {
  const activeConnection = useActiveConnection();
  const [selectedTemplate, setSelectedTemplate] = useState<DashboardTemplate | null>(
    templates.length > 0 ? templates[0] : null
  );
  const [widgetData, setWidgetData] = useState<Map<string, TimeSeriesSeries[]>>(new Map());
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState('24h');

  useEffect(() => {
    if (selectedTemplate && activeConnection) {
      loadDashboardData();
    }
  }, [selectedTemplate, timeRange]);

  const getTimeRangeSQL = () => {
    const ranges: { [key: string]: string } = {
      '1h': "INTERVAL '1 hours'",
      '6h': "INTERVAL '6 hours'",
      '24h': "INTERVAL '24 hours'",
      '7d': "INTERVAL '7 days'",
      '30d': "INTERVAL '30 days'",
    };
    return ranges[timeRange] || ranges['24h'];
  };

  const loadDashboardData = async () => {
    if (!selectedTemplate || !activeConnection) return;

    setLoading(true);
    const newWidgetData = new Map<string, TimeSeriesSeries[]>();

    try {
      // Load data for each widget
      for (const widget of selectedTemplate.widgets) {
        try {
          const sql = generateWidgetSQL(widget);
          console.log(`Loading data for widget "${widget.title}":`, sql);

          const result = await activeConnection.client.query(sql);

          if (result.rows && result.rows.length > 0) {
            // Transform data based on chart type
            const series = transformDataForChart(widget, result.rows);
            newWidgetData.set(widget.id, series);
          }
        } catch (error) {
          console.error(`Failed to load data for widget "${widget.title}":`, error);
          // Set empty series for this widget
          newWidgetData.set(widget.id, []);
        }
      }

      setWidgetData(newWidgetData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      alert('Failed to load dashboard data: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const generateWidgetSQL = (widget: ChartWidget): string => {
    const timeInterval = getTimeRangeSQL();
    const metricColumns = widget.columns
      .map((col) => `${widget.aggregation}(${col}) AS ${widget.aggregation.toLowerCase()}_${col}`)
      .join(', ');

    let groupByClause = `DATE_TRUNC('hour', ${timestampColumn})`;
    let selectClause = `${groupByClause} AS time_bucket, ${metricColumns}`;

    if (widget.groupBy) {
      groupByClause += `, ${widget.groupBy}`;
      selectClause = `${groupByClause} AS time_bucket, ${widget.groupBy}, ${metricColumns}`;
    }

    return `
SELECT
  ${selectClause}
FROM ${tableName}
WHERE ${timestampColumn} >= CURRENT_TIMESTAMP - ${timeInterval}
GROUP BY ${groupByClause}
ORDER BY time_bucket DESC
LIMIT 500;
    `.trim();
  };

  const transformDataForChart = (widget: ChartWidget, rows: any[]): TimeSeriesSeries[] => {
    const series: TimeSeriesSeries[] = [];

    if (widget.groupBy) {
      // Group by series (e.g., by sensor_id, location, etc.)
      const seriesMap = new Map<string, TimeSeriesDataPoint[]>();

      rows.forEach((row: any[]) => {
        const timestamp = new Date(row[0]);
        const groupValue = String(row[1]);

        if (!seriesMap.has(groupValue)) {
          seriesMap.set(groupValue, []);
        }

        // Process each metric column
        widget.columns.forEach((col, index) => {
          const value = row[index + 2]; // +2 to skip time_bucket and group_by column
          if (value !== null && value !== undefined && !isNaN(Number(value))) {
            seriesMap.get(groupValue)!.push({
              timestamp,
              value: Number(value),
            });
          }
        });
      });

      // Convert map to series array
      seriesMap.forEach((data, name) => {
        series.push({
          name: `${name} - ${widget.columns.join(', ')}`,
          data: data.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()),
        });
      });
    } else {
      // Single series per metric
      widget.columns.forEach((col, colIndex) => {
        const data: TimeSeriesDataPoint[] = [];

        rows.forEach((row: any[]) => {
          const timestamp = new Date(row[0]);
          const value = row[colIndex + 1]; // +1 to skip time_bucket column

          if (value !== null && value !== undefined && !isNaN(Number(value))) {
            data.push({
              timestamp,
              value: Number(value),
            });
          }
        });

        series.push({
          name: `${widget.aggregation}(${col})`,
          data: data.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()),
        });
      });
    }

    return series;
  };

  const handleDeleteTemplate = (templateId: string) => {
    if (confirm('Are you sure you want to delete this dashboard? This action cannot be undone.')) {
      onDelete(templateId);
      if (selectedTemplate?.id === templateId) {
        setSelectedTemplate(templates.length > 1 ? templates[0] : null);
      }
    }
  };

  const renderWidgetChart = (widget: ChartWidget) => {
    const series = widgetData.get(widget.id) || [];
    const ChartIcon = CHART_TYPES.find((t) => t.type === widget.chartType)?.icon || LineChart;

    if (loading) {
      return (
        <div className="flex h-64 items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-purple-600 dark:text-purple-400" />
        </div>
      );
    }

    if (series.length === 0) {
      return (
        <div className="flex h-64 items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-lg">
          <div className="text-center text-gray-500 dark:text-gray-400">
            <ChartIcon className="w-12 h-12 mx-auto mb-2" style={{ color: widget.color }} />
            <p className="text-sm">No data available</p>
            <p className="text-xs mt-1">Try adjusting the time range</p>
          </div>
        </div>
      );
    }

    // Render based on chart type
    switch (widget.chartType) {
      case 'line':
      case 'area':
      case 'bar':
        return <TimeSeriesChart series={series} height={280} showZoomControls={true} />;

      case 'table':
        return (
          <div className="overflow-auto max-h-64">
            <table className="w-full text-xs">
              <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0">
                <tr>
                  <th className="px-2 py-1 text-left">Time</th>
                  {widget.columns.map((col) => (
                    <th key={col} className="px-2 py-1 text-left">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {series[0]?.data.slice(0, 50).map((point, idx) => (
                  <tr key={idx} className="border-b border-gray-200 dark:border-gray-700">
                    <td className="px-2 py-1">{point.timestamp.toLocaleString()}</td>
                    {widget.columns.map((col, colIdx) => (
                      <td key={col} className="px-2 py-1">
                        {series[colIdx]?.data[idx]?.value.toFixed(2) || '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'gauge':
        const latestValue = series[0]?.data[series[0].data.length - 1]?.value || 0;
        return (
          <div className="flex h-64 items-center justify-center">
            <div className="text-center">
              <div
                className="text-6xl font-bold mb-2"
                style={{ color: widget.color }}
              >
                {latestValue.toFixed(1)}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {widget.columns[0]} ({widget.aggregation})
              </p>
            </div>
          </div>
        );

      case 'pie':
      case 'scatter':
        return (
          <div className="flex h-64 items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <ChartIcon className="w-12 h-12 mx-auto mb-2" style={{ color: widget.color }} />
              <p className="text-sm">{widget.chartType.toUpperCase()} Chart</p>
              <p className="text-xs mt-1">(Visualization in development)</p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!selectedTemplate) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md p-8 text-center">
          <Layout className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No Dashboards Found
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Create your first dashboard to get started.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-[95vw] max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {selectedTemplate.name}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {selectedTemplate.description || 'Custom analytics dashboard'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 mr-4">
              <Calendar className="w-4 h-4 text-gray-500" />
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-3 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg"
              >
                <option value="1h">Last Hour</option>
                <option value="6h">Last 6 Hours</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
            </div>
            <button
              onClick={loadDashboardData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sidebar + Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar - Dashboard List */}
          {templates.length > 1 && (
            <div className="w-64 border-r border-gray-200 dark:border-gray-700 overflow-auto bg-gray-50 dark:bg-gray-900">
              <div className="p-4">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">
                  Dashboards ({templates.length})
                </h3>
                <div className="space-y-2">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className={`group p-3 rounded-lg border transition-colors cursor-pointer ${
                        selectedTemplate.id === template.id
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedTemplate(template)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {template.name}
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {template.widgets.length} widgets
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTemplate(template.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-red-600 hover:text-red-700 dark:text-red-400 rounded transition-opacity"
                          title="Delete dashboard"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Main Content - Widgets */}
          <div className="flex-1 overflow-auto p-6 bg-gray-50 dark:bg-gray-900">
            <div className="grid grid-cols-2 gap-4">
              {selectedTemplate.widgets.map((widget) => {
                const ChartIcon = CHART_TYPES.find((t) => t.type === widget.chartType)?.icon || LineChart;
                return (
                  <div
                    key={widget.id}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                    style={{ gridColumn: widget.position.w === 12 ? 'span 2' : 'span 1' }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <ChartIcon className="w-5 h-5" style={{ color: widget.color }} />
                        <h3 className="font-semibold text-gray-900 dark:text-white">{widget.title}</h3>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {CHART_TYPES.find((t) => t.type === widget.chartType)?.name}
                      </span>
                    </div>
                    {renderWidgetChart(widget)}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
