'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, Layout, BarChart3, LineChart, PieChart, ScatterChart, AreaChart, TrendingUp, Settings, Eye, Copy, Download } from 'lucide-react';
import { TimeSeriesSeries } from './TimeSeriesChart';

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

interface DashboardBuilderProps {
  availableColumns: string[];
  tableName: string;
  onClose: () => void;
  onSave: (template: DashboardTemplate) => void;
}

const CHART_TYPES = [
  { type: 'line' as ChartType, icon: LineChart, name: 'Line Chart', description: 'Time-series trends' },
  { type: 'bar' as ChartType, icon: BarChart3, name: 'Bar Chart', description: 'Compare values' },
  { type: 'area' as ChartType, icon: AreaChart, name: 'Area Chart', description: 'Filled time-series' },
  { type: 'pie' as ChartType, icon: PieChart, name: 'Pie Chart', description: 'Show proportions' },
  { type: 'scatter' as ChartType, icon: ScatterChart, name: 'Scatter Plot', description: 'Correlation analysis' },
  { type: 'gauge' as ChartType, icon: TrendingUp, name: 'Gauge', description: 'Current value' },
  { type: 'table' as ChartType, icon: Layout, name: 'Data Table', description: 'Raw data view' },
];

const AGGREGATIONS = ['AVG', 'SUM', 'COUNT', 'MIN', 'MAX'] as const;

const COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
];

export default function DashboardBuilder({ availableColumns, tableName, onClose, onSave }: DashboardBuilderProps) {
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [widgets, setWidgets] = useState<ChartWidget[]>([]);
  const [editingWidget, setEditingWidget] = useState<ChartWidget | null>(null);
  const [showAddWidget, setShowAddWidget] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  // New widget defaults
  const [newWidgetTitle, setNewWidgetTitle] = useState('');
  const [newWidgetType, setNewWidgetType] = useState<ChartType>('line');
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [selectedGroupBy, setSelectedGroupBy] = useState<string | null>(null);
  const [selectedAggregation, setSelectedAggregation] = useState<'AVG' | 'SUM' | 'COUNT' | 'MIN' | 'MAX'>('AVG');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);

  const addWidget = () => {
    if (!newWidgetTitle || selectedColumns.length === 0) {
      alert('Please provide a title and select at least one column');
      return;
    }

    const newWidget: ChartWidget = {
      id: `widget_${Date.now()}`,
      title: newWidgetTitle,
      chartType: newWidgetType,
      columns: selectedColumns,
      groupBy: selectedGroupBy,
      aggregation: selectedAggregation,
      color: selectedColor,
      position: {
        x: (widgets.length % 2) * 6,
        y: Math.floor(widgets.length / 2) * 4,
        w: 6,
        h: 4,
      },
    };

    setWidgets([...widgets, newWidget]);
    resetWidgetForm();
    setShowAddWidget(false);
  };

  const resetWidgetForm = () => {
    setNewWidgetTitle('');
    setNewWidgetType('line');
    setSelectedColumns([]);
    setSelectedGroupBy(null);
    setSelectedAggregation('AVG');
    setSelectedColor(COLORS[0]);
  };

  const removeWidget = (id: string) => {
    setWidgets(widgets.filter(w => w.id !== id));
  };

  const duplicateWidget = (widget: ChartWidget) => {
    const newWidget = {
      ...widget,
      id: `widget_${Date.now()}`,
      title: `${widget.title} (Copy)`,
      position: {
        ...widget.position,
        y: widget.position.y + 4,
      },
    };
    setWidgets([...widgets, newWidget]);
  };

  const saveDashboard = () => {
    if (!templateName.trim()) {
      alert('Please provide a template name');
      return;
    }

    if (widgets.length === 0) {
      alert('Please add at least one chart widget');
      return;
    }

    const template: DashboardTemplate = {
      id: `template_${Date.now()}`,
      name: templateName,
      description: templateDescription,
      widgets,
      createdAt: new Date().toISOString(),
    };

    onSave(template);
    onClose();
  };

  const exportTemplate = () => {
    const template: DashboardTemplate = {
      id: `template_${Date.now()}`,
      name: templateName || 'Untitled Dashboard',
      description: templateDescription,
      widgets,
      createdAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-${template.name.toLowerCase().replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleColumnSelection = (column: string) => {
    if (selectedColumns.includes(column)) {
      setSelectedColumns(selectedColumns.filter(c => c !== column));
    } else {
      setSelectedColumns([...selectedColumns, column]);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
          <div className="flex items-center gap-3">
            <Layout className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Dashboard Builder
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Create custom analytics dashboards with multiple charts
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPreviewMode(!previewMode)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              <Eye className="w-4 h-4" />
              {previewMode ? 'Edit' : 'Preview'}
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {!previewMode ? (
          <>
            {/* Template Info */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Dashboard Name *
                  </label>
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="e.g., IoT Sensor Monitoring"
                    className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <input
                    type="text"
                    value={templateDescription}
                    onChange={(e) => setTemplateDescription(e.target.value)}
                    placeholder="e.g., Real-time sensor monitoring dashboard"
                    className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Widgets Section */}
            <div className="flex-1 overflow-auto p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Chart Widgets ({widgets.length})
                </h3>
                <button
                  onClick={() => setShowAddWidget(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Chart
                </button>
              </div>

              {/* Widget List */}
              {widgets.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
                  <Layout className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-400">No charts added yet</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                    Click "Add Chart" to create your first widget
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {widgets.map((widget) => {
                    const ChartIcon = CHART_TYPES.find(t => t.type === widget.chartType)?.icon || LineChart;
                    return (
                      <div
                        key={widget.id}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-900 hover:border-purple-500 dark:hover:border-purple-400 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <ChartIcon className="w-5 h-5" style={{ color: widget.color }} />
                            <div>
                              <h4 className="font-medium text-gray-900 dark:text-white">
                                {widget.title}
                              </h4>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {CHART_TYPES.find(t => t.type === widget.chartType)?.name}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => duplicateWidget(widget)}
                              className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded"
                              title="Duplicate"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => removeWidget(widget.id)}
                              className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded"
                              title="Remove"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                          <div>
                            <strong>Columns:</strong> {widget.columns.join(', ')}
                          </div>
                          <div>
                            <strong>Aggregation:</strong> {widget.aggregation}
                          </div>
                          {widget.groupBy && (
                            <div>
                              <strong>Group By:</strong> {widget.groupBy}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Add Widget Dialog */}
            {showAddWidget && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4 z-10">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] overflow-auto">
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Add New Chart Widget
                    </h3>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* Widget Title */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Chart Title *
                      </label>
                      <input
                        type="text"
                        value={newWidgetTitle}
                        onChange={(e) => setNewWidgetTitle(e.target.value)}
                        placeholder="e.g., Temperature Trends"
                        className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg"
                      />
                    </div>

                    {/* Chart Type Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Chart Type *
                      </label>
                      <div className="grid grid-cols-4 gap-3">
                        {CHART_TYPES.map((type) => {
                          const Icon = type.icon;
                          return (
                            <button
                              key={type.type}
                              onClick={() => setNewWidgetType(type.type)}
                              className={`p-3 border-2 rounded-lg transition-colors ${
                                newWidgetType === type.type
                                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                              }`}
                            >
                              <Icon className={`w-6 h-6 mx-auto mb-2 ${
                                newWidgetType === type.type ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400'
                              }`} />
                              <p className="text-xs font-medium text-gray-900 dark:text-white">{type.name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{type.description}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Column Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Select Columns * (metrics to visualize)
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {availableColumns.map((column) => (
                          <label
                            key={column}
                            className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer transition-colors ${
                              selectedColumns.includes(column)
                                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedColumns.includes(column)}
                              onChange={() => toggleColumnSelection(column)}
                              className="rounded"
                            />
                            <span className="text-sm text-gray-900 dark:text-white">{column}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Aggregation & Group By */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Aggregation Function
                        </label>
                        <select
                          value={selectedAggregation}
                          onChange={(e) => setSelectedAggregation(e.target.value as any)}
                          className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg"
                        >
                          {AGGREGATIONS.map((agg) => (
                            <option key={agg} value={agg}>
                              {agg}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Group By (optional)
                        </label>
                        <select
                          value={selectedGroupBy || ''}
                          onChange={(e) => setSelectedGroupBy(e.target.value || null)}
                          className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg"
                        >
                          <option value="">None</option>
                          {availableColumns.map((column) => (
                            <option key={column} value={column}>
                              {column}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Color Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Chart Color
                      </label>
                      <div className="flex gap-2">
                        {COLORS.map((color) => (
                          <button
                            key={color}
                            onClick={() => setSelectedColor(color)}
                            className={`w-10 h-10 rounded-lg border-2 transition-transform ${
                              selectedColor === color
                                ? 'border-gray-900 dark:border-white scale-110'
                                : 'border-gray-200 dark:border-gray-700'
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => {
                        setShowAddWidget(false);
                        resetWidgetForm();
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={addWidget}
                      className="px-6 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                    >
                      Add Chart
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {widgets.length} chart{widgets.length !== 1 ? 's' : ''} added
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={exportTemplate}
                  disabled={widgets.length === 0}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export JSON
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveDashboard}
                  disabled={!templateName.trim() || widgets.length === 0}
                  className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  <Save className="w-4 h-4" />
                  Save Dashboard
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Preview Mode */
          <div className="flex-1 overflow-auto p-6 bg-gray-50 dark:bg-gray-900">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{templateName || 'Untitled Dashboard'}</h2>
              {templateDescription && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{templateDescription}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {widgets.map((widget) => {
                const ChartIcon = CHART_TYPES.find(t => t.type === widget.chartType)?.icon || LineChart;
                return (
                  <div
                    key={widget.id}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                    style={{ gridColumn: widget.position.w === 12 ? 'span 2' : 'span 1' }}
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <ChartIcon className="w-5 h-5" style={{ color: widget.color }} />
                      <h3 className="font-semibold text-gray-900 dark:text-white">{widget.title}</h3>
                    </div>
                    <div className="h-48 flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <div className="text-center text-gray-500 dark:text-gray-400">
                        <ChartIcon className="w-12 h-12 mx-auto mb-2" style={{ color: widget.color }} />
                        <p className="text-sm">{widget.chartType.toUpperCase()} Preview</p>
                        <p className="text-xs mt-1">{widget.columns.join(', ')}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
