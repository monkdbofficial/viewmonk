'use client';

import { useState } from 'react';
import { Settings, Palette, Code, Bell, X, Check, ChevronDown, Plus, Trash2, Eye, Database, Table as TableIcon, BarChart3, LineChart, PieChart, Activity, TrendingUp, Layers } from 'lucide-react';

interface WidgetConfigPanelProps {
  widget: any;
  onUpdate: (updates: any) => void;
  onClose: () => void;
  availableTables?: Array<{schema: string; table: string; columns: any[]}>;
}

export default function WidgetConfigPanel({ widget, onUpdate, onClose, availableTables = [] }: WidgetConfigPanelProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'style' | 'data' | 'alerts'>('general');
  const [sqlMode, setSqlMode] = useState<'visual' | 'raw'>('visual');

  // Get current table's columns
  const currentTableData = availableTables.find(
    t => t.schema === widget.schema && t.table === widget.table
  );
  const availableColumns = currentTableData?.columns || widget.availableColumns || [];

  // Get numeric and text columns
  const numericColumns = availableColumns.filter((c: any) => c.type === 'number');
  const textColumns = availableColumns.filter((c: any) => c.type === 'text');
  const timestampColumns = availableColumns.filter((c: any) => c.type === 'timestamp');

  const chartTypes = [
    { value: 'line', label: 'Line Chart', icon: LineChart },
    { value: 'bar', label: 'Bar Chart', icon: BarChart3 },
    { value: 'area', label: 'Area Chart', icon: Activity },
    { value: 'pie', label: 'Pie Chart', icon: PieChart },
    { value: 'scatter', label: 'Scatter Plot', icon: TrendingUp },
    { value: 'stat', label: 'Stat Card', icon: Layers },
    { value: 'table', label: 'Data Table', icon: TableIcon },
  ];

  return (
    <div className="absolute inset-0 z-50 bg-white dark:bg-gray-800 border-t-4 border-blue-600 shadow-2xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Configure Widget
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {widget.name || 'Untitled Widget'}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
        {[
          { id: 'general', label: 'General', icon: Settings },
          { id: 'style', label: 'Style', icon: Palette },
          { id: 'data', label: 'Data', icon: Code },
          { id: 'alerts', label: 'Alerts', icon: Bell },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* GENERAL TAB */}
        {activeTab === 'general' && (
          <div className="space-y-6 max-w-3xl">
            {/* Basic Info */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Basic Information
              </h4>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Widget Title
                  </label>
                  <input
                    type="text"
                    value={widget.name || ''}
                    onChange={(e) => onUpdate({ name: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter widget title..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={widget.description || ''}
                    onChange={(e) => onUpdate({ description: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Add a description for this widget..."
                  />
                </div>
              </div>
            </div>

            {/* Data Source */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Database className="h-4 w-4" />
                Data Source
              </h4>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Table
                  </label>
                  <select
                    value={`${widget.schema}.${widget.table}`}
                    onChange={(e) => {
                      const [schema, table] = e.target.value.split('.');
                      const tableData = availableTables.find(t => t.schema === schema && t.table === table);
                      onUpdate({
                        schema,
                        table,
                        availableColumns: tableData?.columns || []
                      });
                    }}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    {availableTables.map((t) => (
                      <option key={`${t.schema}.${t.table}`} value={`${t.schema}.${t.table}`}>
                        {t.schema}.{t.table} ({t.columns.length} columns)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Schema
                    </label>
                    <div className="px-4 py-2.5 bg-gray-100 dark:bg-gray-900 rounded-lg text-sm text-gray-600 dark:text-gray-400">
                      {widget.schema}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Columns Available
                    </label>
                    <div className="px-4 py-2.5 bg-gray-100 dark:bg-gray-900 rounded-lg text-sm text-gray-600 dark:text-gray-400">
                      {availableColumns.length} columns
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Chart Type */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Visualization Type
              </h4>

              <div className="grid grid-cols-2 gap-3">
                {chartTypes.map((chart) => {
                  const Icon = chart.icon;
                  return (
                    <button
                      key={chart.value}
                      onClick={() => onUpdate({ chartType: chart.value })}
                      className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                        widget.chartType === chart.value
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${
                        widget.chartType === chart.value
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-gray-400'
                      }`} />
                      <span className={`text-sm font-medium ${
                        widget.chartType === chart.value
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}>
                        {chart.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Widget Size & Refresh */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Display Settings
              </h4>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Widget Size
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {['small', 'medium', 'large', 'full'].map((size) => (
                      <button
                        key={size}
                        onClick={() => onUpdate({ size })}
                        className={`px-4 py-2.5 rounded-lg text-xs font-medium transition-all ${
                          widget.size === size
                            ? 'bg-blue-600 text-white shadow-lg'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {size.charAt(0).toUpperCase() + size.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Auto-Refresh Interval
                  </label>
                  <select
                    value={widget.autoRefreshInterval || 0}
                    onChange={(e) => onUpdate({ autoRefreshInterval: Number(e.target.value) })}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm"
                  >
                    <option value={0}>Off (Manual refresh only)</option>
                    <option value={5000}>Every 5 seconds</option>
                    <option value={10000}>Every 10 seconds</option>
                    <option value={30000}>Every 30 seconds</option>
                    <option value={60000}>Every 1 minute</option>
                    <option value={300000}>Every 5 minutes</option>
                    <option value={900000}>Every 15 minutes</option>
                    <option value={3600000}>Every 1 hour</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STYLE TAB */}
        {activeTab === 'style' && (
          <div className="space-y-6 max-w-3xl">
            {/* Color Theme */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Color Theme
              </h4>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Primary Color Palette
                  </label>
                  <div className="grid grid-cols-8 gap-3">
                    {[
                      { color: '#3B82F6', name: 'Blue' },
                      { color: '#EF4444', name: 'Red' },
                      { color: '#10B981', name: 'Green' },
                      { color: '#F59E0B', name: 'Amber' },
                      { color: '#8B5CF6', name: 'Purple' },
                      { color: '#EC4899', name: 'Pink' },
                      { color: '#06B6D4', name: 'Cyan' },
                      { color: '#84CC16', name: 'Lime' },
                      { color: '#F97316', name: 'Orange' },
                      { color: '#6366F1', name: 'Indigo' },
                      { color: '#14B8A6', name: 'Teal' },
                      { color: '#F43F5E', name: 'Rose' },
                      { color: '#A855F7', name: 'Violet' },
                      { color: '#22D3EE', name: 'Sky' },
                      { color: '#FB923C', name: 'Orange' },
                      { color: '#818CF8', name: 'Indigo' },
                    ].map((item) => (
                      <button
                        key={item.color}
                        onClick={() => onUpdate({ primaryColor: item.color })}
                        className={`h-12 rounded-lg border-2 transition-all hover:scale-110 ${
                          widget.primaryColor === item.color
                            ? 'border-gray-900 dark:border-white ring-2 ring-offset-2 ring-blue-500'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                        style={{ backgroundColor: item.color }}
                        title={item.name}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Color Scheme Presets
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { name: 'Corporate', colors: ['#1E40AF', '#3B82F6', '#60A5FA'] },
                      { name: 'Nature', colors: ['#047857', '#10B981', '#34D399'] },
                      { name: 'Sunset', colors: ['#DC2626', '#F59E0B', '#FBBF24'] },
                      { name: 'Ocean', colors: ['#0891B2', '#06B6D4', '#22D3EE'] },
                      { name: 'Purple', colors: ['#7C3AED', '#8B5CF6', '#A78BFA'] },
                      { name: 'Monochrome', colors: ['#374151', '#6B7280', '#9CA3AF'] },
                    ].map((preset) => (
                      <button
                        key={preset.name}
                        onClick={() => onUpdate({ colorScheme: preset.colors })}
                        className="flex flex-col items-center gap-2 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 transition-all"
                      >
                        <div className="flex gap-1">
                          {preset.colors.map((c) => (
                            <div
                              key={c}
                              className="h-6 w-6 rounded"
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          {preset.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Chart Appearance */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                Chart Appearance
              </h4>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Show Legend
                  </label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={widget.showLegend !== false}
                      onChange={(e) => onUpdate({ showLegend: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Show Grid Lines
                  </label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={widget.showGrid !== false}
                      onChange={(e) => onUpdate({ showGrid: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Show Data Labels
                  </label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={widget.showDataLabels || false}
                      onChange={(e) => onUpdate({ showDataLabels: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Smooth Lines (Area/Line Charts)
                  </label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={widget.smoothLines || false}
                      onChange={(e) => onUpdate({ smoothLines: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Enable Animations
                  </label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={widget.enableAnimations !== false}
                      onChange={(e) => onUpdate({ enableAnimations: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Chart Height (px)
                  </label>
                  <input
                    type="range"
                    min="200"
                    max="800"
                    step="50"
                    value={widget.height || 400}
                    onChange={(e) => onUpdate({ height: Number(e.target.value) })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                  />
                  <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mt-1">
                    <span>200px</span>
                    <span className="font-semibold text-blue-600">{widget.height || 400}px</span>
                    <span>800px</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Chart Opacity
                  </label>
                  <input
                    type="range"
                    min="30"
                    max="100"
                    step="5"
                    value={widget.opacity || 100}
                    onChange={(e) => onUpdate({ opacity: Number(e.target.value) })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                  />
                  <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mt-1">
                    <span>30%</span>
                    <span className="font-semibold text-blue-600">{widget.opacity || 100}%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* DATA TAB */}
        {activeTab === 'data' && (
          <div className="space-y-6 max-w-3xl">
            {/* SQL Mode Toggle */}
            <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-900 rounded-lg w-fit">
              <button
                onClick={() => setSqlMode('visual')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  sqlMode === 'visual'
                    ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                Visual Builder
              </button>
              <button
                onClick={() => setSqlMode('raw')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  sqlMode === 'raw'
                    ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                Raw SQL
              </button>
            </div>

            {sqlMode === 'visual' ? (
              <>
                {/* Column Selection */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                    Column Selection
                  </h4>

                  <div className="space-y-4">
                    {/* For Line/Bar/Area charts */}
                    {['line', 'bar', 'area', 'scatter'].includes(widget.chartType) && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            X-Axis Column
                          </label>
                          <select
                            value={widget.xAxis || ''}
                            onChange={(e) => onUpdate({ xAxis: e.target.value })}
                            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm"
                          >
                            <option value="">Select column...</option>
                            {availableColumns.map((col: any) => (
                              <option key={col.name} value={col.name}>
                                {col.name} ({col.type})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Y-Axis Columns (Metrics)
                          </label>
                          <div className="space-y-2 max-h-48 overflow-y-auto p-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
                            {numericColumns.map((col: any) => (
                              <label key={col.name} className="flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={widget.metricColumns?.includes(col.name) || false}
                                  onChange={(e) => {
                                    const current = widget.metricColumns || [];
                                    const updated = e.target.checked
                                      ? [...current, col.name]
                                      : current.filter((c: string) => c !== col.name);
                                    onUpdate({ metricColumns: updated });
                                  }}
                                  className="rounded border-gray-300 text-blue-600"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">{col.name}</span>
                                <span className="text-xs text-gray-500">({col.type})</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    {/* For Pie charts */}
                    {widget.chartType === 'pie' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Label Column
                          </label>
                          <select
                            value={widget.labelColumn || ''}
                            onChange={(e) => onUpdate({ labelColumn: e.target.value })}
                            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm"
                          >
                            <option value="">Select column...</option>
                            {textColumns.map((col: any) => (
                              <option key={col.name} value={col.name}>
                                {col.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Value Column
                          </label>
                          <select
                            value={widget.valueColumn || ''}
                            onChange={(e) => onUpdate({ valueColumn: e.target.value })}
                            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm"
                          >
                            <option value="">Select column...</option>
                            {numericColumns.map((col: any) => (
                              <option key={col.name} value={col.name}>
                                {col.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}

                    {/* For Stat cards */}
                    {widget.chartType === 'stat' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Metric Column
                          </label>
                          <select
                            value={widget.metricColumn || ''}
                            onChange={(e) => onUpdate({ metricColumn: e.target.value })}
                            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm"
                          >
                            <option value="">Select column...</option>
                            {numericColumns.map((col: any) => (
                              <option key={col.name} value={col.name}>
                                {col.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Aggregation Function
                          </label>
                          <select
                            value={widget.aggregation || 'AVG'}
                            onChange={(e) => onUpdate({ aggregation: e.target.value })}
                            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm"
                          >
                            <option value="AVG">Average</option>
                            <option value="SUM">Sum</option>
                            <option value="MIN">Minimum</option>
                            <option value="MAX">Maximum</option>
                            <option value="COUNT">Count</option>
                          </select>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Filters */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                    Filters & Conditions
                  </h4>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        WHERE Clause
                      </label>
                      <input
                        type="text"
                        value={widget.whereClause || ''}
                        onChange={(e) => onUpdate({ whereClause: e.target.value })}
                        placeholder="e.g., temperature > 25 AND status = 'active'"
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm font-mono"
                      />
                      <p className="text-xs text-gray-500 mt-1">Enter SQL conditions without the WHERE keyword</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Row Limit
                      </label>
                      <input
                        type="number"
                        value={widget.limit || 1000}
                        onChange={(e) => onUpdate({ limit: Number(e.target.value) })}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm"
                        min="10"
                        max="10000"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        ORDER BY
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={widget.orderBy || ''}
                          onChange={(e) => onUpdate({ orderBy: e.target.value })}
                          className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm"
                        >
                          <option value="">None</option>
                          {availableColumns.map((col: any) => (
                            <option key={col.name} value={col.name}>
                              {col.name}
                            </option>
                          ))}
                        </select>
                        <select
                          value={widget.orderDirection || 'ASC'}
                          onChange={(e) => onUpdate({ orderDirection: e.target.value })}
                          className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm"
                        >
                          <option value="ASC">Ascending</option>
                          <option value="DESC">Descending</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* Raw SQL Editor */
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                  Custom SQL Query
                </h4>

                <textarea
                  value={widget.customSQL || ''}
                  onChange={(e) => onUpdate({ customSQL: e.target.value })}
                  placeholder="SELECT * FROM schema.table WHERE..."
                  className="w-full h-64 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Write custom SQL query. This will override visual builder settings.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ALERTS TAB */}
        {activeTab === 'alerts' && (
          <div className="space-y-6 max-w-3xl">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Threshold Alerts
                </h4>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={widget.enableAlerts || false}
                    onChange={(e) => onUpdate({ enableAlerts: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {widget.enableAlerts && (
                <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Alert Metric
                    </label>
                    <select
                      value={widget.alertMetric || ''}
                      onChange={(e) => onUpdate({ alertMetric: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm"
                    >
                      <option value="">Select metric...</option>
                      {numericColumns.map((col: any) => (
                        <option key={col.name} value={col.name}>
                          {col.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Condition
                      </label>
                      <select
                        value={widget.alertCondition || 'greater'}
                        onChange={(e) => onUpdate({ alertCondition: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm"
                      >
                        <option value="greater">Greater than</option>
                        <option value="less">Less than</option>
                        <option value="equal">Equal to</option>
                        <option value="between">Between</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Threshold Value
                      </label>
                      <input
                        type="number"
                        value={widget.alertThreshold || 0}
                        onChange={(e) => onUpdate({ alertThreshold: Number(e.target.value) })}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Alert Severity
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {['info', 'warning', 'critical'].map((severity) => (
                        <button
                          key={severity}
                          onClick={() => onUpdate({ alertSeverity: severity })}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            widget.alertSeverity === severity
                              ? severity === 'critical'
                                ? 'bg-red-600 text-white'
                                : severity === 'warning'
                                ? 'bg-yellow-600 text-white'
                                : 'bg-blue-600 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {severity.charAt(0).toUpperCase() + severity.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-800 dark:text-blue-300 flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      Alert will trigger when {widget.alertMetric || 'metric'} is {widget.alertCondition || 'greater'} than {widget.alertThreshold || 0}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900/50 flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl"
        >
          <Check className="h-4 w-4" />
          Save & Apply Changes
        </button>
        <button
          onClick={onClose}
          className="px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-all"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
