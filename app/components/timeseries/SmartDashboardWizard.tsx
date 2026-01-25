'use client';

import { useState, useEffect, useMemo } from 'react';
import { BarChart3, TrendingUp, Activity, Database, Users, DollarSign, Package, Zap, X, ArrowRight, ArrowLeft, Sparkles, CheckCircle2, Table as TableIcon, LineChart, PieChart, Gauge } from 'lucide-react';

export interface TableColumn {
  name: string;
  type: string;
  category: 'timestamp' | 'number' | 'text' | 'boolean' | 'other';
}

export interface SelectedTableInfo {
  schema: string;
  table: string;
  columns: TableColumn[];
}

export interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  icon: any;
  category: string;
  recommendedTables: string[];
  widgetTypes: string[];
}

interface SmartDashboardWizardProps {
  availableTables: { schema: string; table: string }[];
  onComplete: (template: DashboardTemplate, tables: SelectedTableInfo[], widgets: any[]) => void;
  onCancel: () => void;
  onFetchColumns?: (schema: string, table: string) => Promise<TableColumn[]>;
}

const TEMPLATES: DashboardTemplate[] = [
  {
    id: 'analytics',
    name: 'Analytics Dashboard',
    description: 'Comprehensive analytics with trends, KPIs, and insights',
    icon: BarChart3,
    category: 'Business Intelligence',
    recommendedTables: ['events', 'analytics', 'metrics', 'logs'],
    widgetTypes: ['stat', 'line', 'bar', 'pie', 'area'],
  },
  {
    id: 'monitoring',
    name: 'System Monitoring',
    description: 'Real-time system metrics and performance tracking',
    icon: Activity,
    category: 'DevOps',
    recommendedTables: ['metrics', 'performance', 'system', 'monitoring'],
    widgetTypes: ['gauge', 'line', 'stat', 'heatmap'],
  },
  {
    id: 'iot',
    name: 'IoT Sensor Dashboard',
    description: 'Track sensor readings and device telemetry',
    icon: Zap,
    category: 'IoT',
    recommendedTables: ['sensors', 'readings', 'devices', 'telemetry'],
    widgetTypes: ['gauge', 'line', 'stat', 'scatter'],
  },
  {
    id: 'financial',
    name: 'Financial KPIs',
    description: 'Revenue, expenses, and financial metrics',
    icon: DollarSign,
    category: 'Finance',
    recommendedTables: ['transactions', 'revenue', 'orders', 'payments'],
    widgetTypes: ['stat', 'line', 'area', 'pie', 'candlestick'],
  },
  {
    id: 'user-engagement',
    name: 'User Engagement',
    description: 'Track user activity, sessions, and retention',
    icon: Users,
    category: 'Product',
    recommendedTables: ['users', 'sessions', 'events', 'activity'],
    widgetTypes: ['stat', 'line', 'funnel', 'bar'],
  },
  {
    id: 'inventory',
    name: 'Inventory Management',
    description: 'Stock levels, orders, and supply chain',
    icon: Package,
    category: 'Operations',
    recommendedTables: ['inventory', 'products', 'orders', 'stock'],
    widgetTypes: ['stat', 'bar', 'pie', 'table'],
  },
];

export default function SmartDashboardWizard({
  availableTables,
  onComplete,
  onCancel,
  onFetchColumns,
}: SmartDashboardWizardProps) {
  const [step, setStep] = useState<'template' | 'tables' | 'preview'>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<DashboardTemplate | null>(null);
  const [selectedSchema, setSelectedSchema] = useState<string>('');
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [tableColumns, setTableColumns] = useState<Map<string, TableColumn[]>>(new Map());
  const [generatedWidgets, setGeneratedWidgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Get unique schemas from available tables
  const availableSchemas = useMemo(() => {
    const schemas = new Set(availableTables.map(t => t.schema));
    return Array.from(schemas).sort();
  }, [availableTables]);

  // Get tables filtered by selected schema
  const filteredTables = useMemo(() => {
    if (!selectedSchema) return availableTables;
    return availableTables.filter(t => t.schema === selectedSchema);
  }, [availableTables, selectedSchema]);

  const categorizeColumn = (type: string): 'timestamp' | 'number' | 'text' | 'boolean' | 'other' => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('timestamp') || lowerType.includes('date') || lowerType.includes('time')) {
      return 'timestamp';
    } else if (lowerType.includes('int') || lowerType.includes('float') || lowerType.includes('double') ||
               lowerType.includes('numeric') || lowerType.includes('decimal') || lowerType.includes('real')) {
      return 'number';
    } else if (lowerType.includes('bool')) {
      return 'boolean';
    } else if (lowerType.includes('char') || lowerType.includes('text') || lowerType.includes('string')) {
      return 'text';
    }
    return 'other';
  };

  const handleTableToggle = (tableKey: string) => {
    if (selectedTables.includes(tableKey)) {
      setSelectedTables(selectedTables.filter(t => t !== tableKey));
    } else {
      setSelectedTables([...selectedTables, tableKey]);
    }
  };

  const handleNextFromTables = async () => {
    if (selectedTables.length === 0) {
      alert('Please select at least one table');
      return;
    }

    setLoading(true);
    setStep('preview');

    // Fetch columns for all selected tables
    const columnsMap = new Map<string, TableColumn[]>();

    for (const tableKey of selectedTables) {
      const [schema, table] = tableKey.split('.');
      if (onFetchColumns) {
        try {
          const cols = await onFetchColumns(schema, table);
          columnsMap.set(tableKey, cols);
        } catch (error) {
          console.error('Failed to fetch columns for', tableKey, error);
        }
      }
    }

    setTableColumns(columnsMap);

    // Auto-generate widgets based on template and table columns
    const widgets = generateWidgets(selectedTemplate!, columnsMap);
    setGeneratedWidgets(widgets);

    setLoading(false);
  };

  const generateWidgets = (template: DashboardTemplate, columnsMap: Map<string, TableColumn[]>): any[] => {
    const widgets: any[] = [];
    let widgetId = 0;

    selectedTables.forEach((tableKey, tableIndex) => {
      const [schema, table] = tableKey.split('.');
      const columns = columnsMap.get(tableKey) || [];

      const timestampCols = columns.filter(c => c.category === 'timestamp');
      const timestampColNames = new Set(timestampCols.map(c => c.name));

      // Filter out timestamp columns from numeric columns to avoid ambiguity
      const numericCols = columns.filter(c => c.category === 'number' && !timestampColNames.has(c.name));
      const textCols = columns.filter(c => c.category === 'text');

      console.log(`📊 Generating widgets for ${tableKey}:`, {
        total: columns.length,
        timestamp: timestampCols.map(c => c.name),
        numeric: numericCols.map(c => c.name),
        text: textCols.map(c => c.name),
      });

      // Stat cards for key metrics (first 3 numeric columns)
      numericCols.slice(0, 3).forEach((col, idx) => {
        widgets.push({
          id: `widget-${widgetId++}`,
          name: `${table} - ${col.name}`,
          chartType: 'stat',
          schema,
          table,
          timestampColumn: timestampCols[0]?.name || 'timestamp',
          metricColumns: [col.name],
          aggregation: 'SUM',
          size: 'small',
          isVisible: true,
        });
      });

      // Trend line chart (first numeric column over time)
      if (numericCols.length > 0 && timestampCols.length > 0) {
        widgets.push({
          id: `widget-${widgetId++}`,
          name: `${table} - ${numericCols[0].name} Trend`,
          chartType: 'line',
          schema,
          table,
          timestampColumn: timestampCols[0].name,
          metricColumns: [numericCols[0].name],
          aggregation: 'AVG',
          size: 'large',
          isVisible: true,
        });
      }

      // Bar chart for categorical breakdown
      if (numericCols.length > 0 && textCols.length > 0) {
        widgets.push({
          id: `widget-${widgetId++}`,
          name: `${table} by ${textCols[0].name}`,
          chartType: 'bar',
          schema,
          table,
          timestampColumn: timestampCols[0]?.name || 'timestamp',
          metricColumns: [numericCols[0].name],
          groupBy: textCols[0].name,
          aggregation: 'SUM',
          size: 'medium',
          isVisible: true,
        });
      }

      // Pie chart for distribution
      if (numericCols.length > 1 && textCols.length > 0) {
        widgets.push({
          id: `widget-${widgetId++}`,
          name: `${table} Distribution`,
          chartType: 'pie',
          schema,
          table,
          timestampColumn: timestampCols[0]?.name || 'timestamp',
          metricColumns: [numericCols[1].name],
          groupBy: textCols[0].name,
          aggregation: 'SUM',
          size: 'medium',
          isVisible: true,
        });
      }

      // Area chart for cumulative view
      if (numericCols.length > 1 && timestampCols.length > 0) {
        widgets.push({
          id: `widget-${widgetId++}`,
          name: `${table} - ${numericCols[1].name} Over Time`,
          chartType: 'area',
          schema,
          table,
          timestampColumn: timestampCols[0].name,
          metricColumns: [numericCols[1].name],
          aggregation: 'AVG',
          size: 'large',
          isVisible: true,
        });
      }

      // Gauge for percentage/ratio metrics
      if (template.id === 'monitoring' && numericCols.length > 0) {
        widgets.push({
          id: `widget-${widgetId++}`,
          name: `${table} - ${numericCols[0].name} Gauge`,
          chartType: 'gauge',
          schema,
          table,
          timestampColumn: timestampCols[0]?.name || 'timestamp',
          metricColumns: [numericCols[0].name],
          aggregation: 'AVG',
          size: 'small',
          isVisible: true,
        });
      }

      // Table view for detailed data
      if (tableIndex === 0) {
        // Exclude timestamp columns from metricColumns to avoid SQL ambiguity
        const tableMetricColumns = columns
          .filter(c => !timestampColNames.has(c.name))  // Exclude timestamp columns
          .slice(0, 5)
          .map(c => c.name);

        widgets.push({
          id: `widget-${widgetId++}`,
          name: `${table} - Recent Data`,
          chartType: 'table',
          schema,
          table,
          timestampColumn: timestampCols[0]?.name || 'timestamp',
          metricColumns: tableMetricColumns,
          aggregation: 'COUNT',
          size: 'full',
          limit: 100,
          isVisible: true,
        });
      }
    });

    return widgets;
  };

  const handleComplete = () => {
    if (!selectedTemplate) return;

    const tablesInfo: SelectedTableInfo[] = selectedTables.map(tableKey => {
      const [schema, table] = tableKey.split('.');
      return {
        schema,
        table,
        columns: tableColumns.get(tableKey) || [],
      };
    });

    onComplete(selectedTemplate, tablesInfo, generatedWidgets);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" style={{ zIndex: 10000 }}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-850 dark:to-gray-900 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 shadow-lg">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Smart Dashboard Wizard
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {step === 'template' && 'Step 1: Choose a template'}
                  {step === 'tables' && 'Step 2: Select your data tables'}
                  {step === 'preview' && 'Step 3: Review & customize'}
                </p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-4 mt-6">
            <div className={`flex items-center gap-2 ${step === 'template' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>
              <div className={`flex h-8 w-8 items-center justify-center rounded-full ${step === 'template' ? 'bg-blue-600 text-white' : selectedTemplate ? 'bg-green-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
                {selectedTemplate ? <CheckCircle2 className="h-5 w-5" /> : '1'}
              </div>
              <span className="text-sm font-semibold">Template</span>
            </div>
            <div className="flex-1 h-0.5 bg-gray-300 dark:bg-gray-600" />
            <div className={`flex items-center gap-2 ${step === 'tables' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>
              <div className={`flex h-8 w-8 items-center justify-center rounded-full ${step === 'tables' ? 'bg-blue-600 text-white' : selectedTables.length > 0 ? 'bg-green-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
                {selectedTables.length > 0 && step === 'preview' ? <CheckCircle2 className="h-5 w-5" /> : '2'}
              </div>
              <span className="text-sm font-semibold">Tables</span>
            </div>
            <div className="flex-1 h-0.5 bg-gray-300 dark:bg-gray-600" />
            <div className={`flex items-center gap-2 ${step === 'preview' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>
              <div className={`flex h-8 w-8 items-center justify-center rounded-full ${step === 'preview' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
                3
              </div>
              <span className="text-sm font-semibold">Preview</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Template Selection */}
          {step === 'template' && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                Choose a Dashboard Template
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {TEMPLATES.map((template) => {
                  const Icon = template.icon;
                  const isSelected = selectedTemplate?.id === template.id;
                  return (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplate(template)}
                      className={`text-left p-6 rounded-xl border-2 transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-lg'
                          : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-start gap-4 mb-3">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${
                          isSelected ? 'bg-blue-600' : 'bg-gradient-to-br from-purple-600 to-indigo-600'
                        } shadow-md`}>
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-base font-bold text-gray-900 dark:text-white mb-1">
                            {template.name}
                          </h4>
                          <span className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full">
                            {template.category}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {template.description}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {template.widgetTypes.slice(0, 4).map((type, idx) => (
                          <span
                            key={idx}
                            className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                          >
                            {type}
                          </span>
                        ))}
                        {template.widgetTypes.length > 4 && (
                          <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                            +{template.widgetTypes.length - 4} more
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Table Selection */}
          {step === 'tables' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Select Data Tables
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Choose one or more tables to include in your dashboard
                  </p>
                </div>
                <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                  {selectedTables.length} selected
                </div>
              </div>

              {/* Schema Selection */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  1. Select Schema
                </label>
                <select
                  value={selectedSchema}
                  onChange={(e) => {
                    setSelectedSchema(e.target.value);
                    setSelectedTables([]); // Clear selection when schema changes
                  }}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-all"
                >
                  <option value="">All Schemas ({availableTables.length} tables)</option>
                  {availableSchemas.map(schema => {
                    const tableCount = availableTables.filter(t => t.schema === schema).length;
                    return (
                      <option key={schema} value={schema}>
                        {schema} ({tableCount} {tableCount === 1 ? 'table' : 'tables'})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Table Selection */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  2. Select Tables {selectedSchema && `from "${selectedSchema}" schema`}
                </label>
                {filteredTables.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <TableIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No tables available in this schema</p>
                  </div>
                ) : null}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredTables.map((t) => {
                  const tableKey = `${t.schema}.${t.table}`;
                  const isSelected = selectedTables.includes(tableKey);
                  const isRecommended = selectedTemplate?.recommendedTables.some(
                    rec => t.table.toLowerCase().includes(rec.toLowerCase())
                  );

                  return (
                    <button
                      key={tableKey}
                      onClick={() => handleTableToggle(tableKey)}
                      className={`text-left p-4 rounded-xl border-2 transition-all ${
                        isSelected
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                          isSelected ? 'bg-green-600' : 'bg-gray-600'
                        }`}>
                          {isSelected ? (
                            <CheckCircle2 className="h-5 w-5 text-white" />
                          ) : (
                            <TableIcon className="h-5 w-5 text-white" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-900 dark:text-white">
                              {tableKey}
                            </span>
                            {isRecommended && (
                              <span className="text-xs px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-full">
                                Recommended
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {availableTables.length === 0 && (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  No tables available. Please connect to a database.
                </div>
              )}
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 'preview' && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                Dashboard Preview
              </h3>

              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Analyzing table schemas and generating widgets...
                  </p>
                </div>
              ) : (
                <>
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-xl p-6 mb-6 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600">
                        {selectedTemplate && <selectedTemplate.icon className="h-6 w-6 text-white" />}
                      </div>
                      <div className="flex-1">
                        <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                          {selectedTemplate?.name}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          {generatedWidgets.length} widgets will be created from {selectedTables.length} table(s)
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {selectedTables.map((tableKey) => (
                            <span key={tableKey} className="text-xs px-3 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-full">
                              📊 {tableKey}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">
                    Generated Widgets ({generatedWidgets.length})
                  </h4>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {generatedWidgets.map((widget, idx) => {
                      const getChartIcon = () => {
                        switch (widget.chartType) {
                          case 'line': return <LineChart className="h-4 w-4" />;
                          case 'bar': return <BarChart3 className="h-4 w-4" />;
                          case 'pie': return <PieChart className="h-4 w-4" />;
                          case 'gauge': return <Gauge className="h-4 w-4" />;
                          case 'area': return <Activity className="h-4 w-4" />;
                          case 'stat': return <TrendingUp className="h-4 w-4" />;
                          default: return <BarChart3 className="h-4 w-4" />;
                        }
                      };

                      return (
                        <div
                          key={widget.id}
                          className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50"
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded bg-gradient-to-br from-blue-600 to-purple-600 text-white flex-shrink-0">
                            {getChartIcon()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-gray-900 dark:text-white truncate">
                              {widget.name}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              {widget.chartType.toUpperCase()} • {widget.schema}.{widget.table} • {widget.aggregation}
                            </div>
                          </div>
                          <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded flex-shrink-0">
                            {widget.size}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-900/50 flex justify-between">
          <button
            onClick={() => {
              if (step === 'tables') setStep('template');
              else if (step === 'preview') setStep('tables');
              else onCancel();
            }}
            className="flex items-center gap-2 px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-semibold transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            {step === 'template' ? 'Cancel' : 'Back'}
          </button>

          <button
            onClick={() => {
              if (step === 'template') {
                if (!selectedTemplate) {
                  alert('Please select a template');
                  return;
                }
                setStep('tables');
              } else if (step === 'tables') {
                handleNextFromTables();
              } else if (step === 'preview') {
                handleComplete();
              }
            }}
            disabled={
              (step === 'template' && !selectedTemplate) ||
              (step === 'tables' && selectedTables.length === 0) ||
              loading
            }
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
          >
            {step === 'preview' ? (
              <>
                <Sparkles className="h-4 w-4" />
                Create Dashboard
              </>
            ) : (
              <>
                Next
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
