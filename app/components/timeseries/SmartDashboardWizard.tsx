'use client';

import { useState, useEffect, useMemo } from 'react';
import { BarChart3, TrendingUp, Activity, Database, Users, DollarSign, Package, Zap, X, ArrowRight, ArrowLeft, Sparkles, CheckCircle2, Table as TableIcon, LineChart, PieChart, Gauge, Grid3x3 } from 'lucide-react';

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
  // === MANUFACTURING & INDUSTRIAL ===
  {
    id: 'predictive-maintenance',
    name: 'Predictive Maintenance',
    description: 'Equipment health monitoring, vibration analysis, and failure prediction for industrial machinery',
    icon: Activity,
    category: 'Manufacturing & Industrial',
    recommendedTables: ['equipment', 'sensors', 'vibration', 'temperature', 'pressure', 'maintenance_logs', 'alerts'],
    widgetTypes: ['gauge', 'line', 'stat', 'heatmap', 'table'],
  },
  {
    id: 'production-monitoring',
    name: 'Production Line Monitoring',
    description: 'Real-time production metrics, OEE tracking, quality control, and throughput analysis',
    icon: BarChart3,
    category: 'Manufacturing & Industrial',
    recommendedTables: ['production', 'machines', 'quality', 'downtime', 'output', 'efficiency'],
    widgetTypes: ['stat', 'line', 'bar', 'gauge', 'table'],
  },
  {
    id: 'assembly-line-iot',
    name: 'Assembly Line IoT',
    description: 'Multi-sensor monitoring for assembly operations including torque, position, and cycle time tracking',
    icon: Activity,
    category: 'Manufacturing & Industrial',
    recommendedTables: ['assembly', 'sensors', 'stations', 'cycle_time', 'defects', 'operators'],
    widgetTypes: ['gauge', 'line', 'stat', 'bar', 'heatmap'],
  },

  // === ENERGY & UTILITIES ===
  {
    id: 'energy-optimization',
    name: 'Energy Optimization',
    description: 'Real-time power consumption, demand forecasting, and cost optimization for industrial facilities',
    icon: Zap,
    category: 'Energy & Utilities',
    recommendedTables: ['power', 'energy', 'consumption', 'demand', 'cost', 'meters', 'circuits'],
    widgetTypes: ['line', 'area', 'stat', 'gauge', 'pie'],
  },
  {
    id: 'grid-monitoring',
    name: 'Smart Grid Monitoring',
    description: 'Electrical grid health, voltage stability, load balancing, and outage detection',
    icon: Zap,
    category: 'Energy & Utilities',
    recommendedTables: ['grid', 'voltage', 'current', 'frequency', 'substations', 'transformers', 'loads'],
    widgetTypes: ['gauge', 'line', 'heatmap', 'stat', 'table'],
  },
  {
    id: 'renewable-energy',
    name: 'Renewable Energy Monitoring',
    description: 'Solar panel output, wind turbine performance, battery storage, and renewable energy forecasting',
    icon: Zap,
    category: 'Energy & Utilities',
    recommendedTables: ['solar', 'wind', 'batteries', 'inverters', 'weather', 'generation', 'forecast'],
    widgetTypes: ['line', 'area', 'stat', 'gauge', 'bar'],
  },

  // === SMART BUILDINGS ===
  {
    id: 'building-automation',
    name: 'Building Automation System',
    description: 'HVAC control, occupancy sensing, lighting automation, and energy management for commercial buildings',
    icon: Activity,
    category: 'Smart Buildings',
    recommendedTables: ['hvac', 'occupancy', 'lighting', 'temperature', 'humidity', 'zones', 'schedules'],
    widgetTypes: ['gauge', 'line', 'stat', 'heatmap', 'bar'],
  },
  {
    id: 'indoor-air-quality',
    name: 'Indoor Air Quality',
    description: 'CO2 levels, VOCs, particulate matter, temperature, and humidity monitoring for healthy buildings',
    icon: Activity,
    category: 'Smart Buildings',
    recommendedTables: ['air_quality', 'co2', 'voc', 'pm25', 'temperature', 'humidity', 'sensors'],
    widgetTypes: ['gauge', 'line', 'stat', 'area', 'table'],
  },

  // === HEALTHCARE & MEDICAL ===
  {
    id: 'patient-monitoring',
    name: 'Patient Vitals Monitoring',
    description: 'Real-time patient vital signs, wearable device data, and alert management for healthcare facilities',
    icon: Activity,
    category: 'Healthcare & Medical',
    recommendedTables: ['patients', 'vitals', 'heart_rate', 'blood_pressure', 'temperature', 'spo2', 'alerts'],
    widgetTypes: ['gauge', 'line', 'stat', 'table', 'area'],
  },
  {
    id: 'medical-equipment',
    name: 'Medical Equipment Tracking',
    description: 'Hospital equipment location, utilization, maintenance schedules, and availability tracking',
    icon: Package,
    category: 'Healthcare & Medical',
    recommendedTables: ['equipment', 'locations', 'usage', 'maintenance', 'availability', 'departments'],
    widgetTypes: ['stat', 'bar', 'pie', 'table', 'heatmap'],
  },

  // === TRANSPORTATION & LOGISTICS ===
  {
    id: 'fleet-telemetry',
    name: 'Fleet Telemetry & Tracking',
    description: 'Vehicle location, fuel efficiency, driver behavior, maintenance alerts, and route optimization',
    icon: Activity,
    category: 'Transportation & Logistics',
    recommendedTables: ['vehicles', 'gps', 'fuel', 'speed', 'routes', 'drivers', 'maintenance', 'alerts'],
    widgetTypes: ['stat', 'line', 'scatter', 'table', 'heatmap'],
  },
  {
    id: 'cold-chain',
    name: 'Cold Chain Monitoring',
    description: 'Temperature-controlled logistics for pharmaceuticals and food with compliance tracking',
    icon: Activity,
    category: 'Transportation & Logistics',
    recommendedTables: ['shipments', 'temperature', 'humidity', 'location', 'alerts', 'compliance', 'routes'],
    widgetTypes: ['gauge', 'line', 'stat', 'table', 'area'],
  },

  // === AGRICULTURE & FARMING ===
  {
    id: 'precision-agriculture',
    name: 'Precision Agriculture',
    description: 'Soil moisture, weather stations, crop health monitoring, and irrigation automation',
    icon: Activity,
    category: 'Agriculture & Farming',
    recommendedTables: ['soil', 'moisture', 'weather', 'crops', 'irrigation', 'sensors', 'fields'],
    widgetTypes: ['gauge', 'line', 'stat', 'heatmap', 'area'],
  },
  {
    id: 'livestock-monitoring',
    name: 'Livestock Monitoring',
    description: 'Animal health tracking, location monitoring, feeding schedules, and environmental conditions',
    icon: Activity,
    category: 'Agriculture & Farming',
    recommendedTables: ['livestock', 'health', 'location', 'feeding', 'temperature', 'activity', 'alerts'],
    widgetTypes: ['stat', 'line', 'gauge', 'table', 'bar'],
  },

  // === OIL & GAS ===
  {
    id: 'pipeline-monitoring',
    name: 'Pipeline Monitoring',
    description: 'Pressure monitoring, flow rates, leak detection, and safety compliance for oil & gas pipelines',
    icon: Activity,
    category: 'Oil & Gas',
    recommendedTables: ['pipelines', 'pressure', 'flow', 'temperature', 'leaks', 'valves', 'safety'],
    widgetTypes: ['gauge', 'line', 'stat', 'heatmap', 'table'],
  },
  {
    id: 'drilling-operations',
    name: 'Drilling Operations',
    description: 'Well monitoring, drilling parameters, equipment status, and production optimization',
    icon: Activity,
    category: 'Oil & Gas',
    recommendedTables: ['wells', 'drilling', 'pressure', 'temperature', 'production', 'equipment', 'logs'],
    widgetTypes: ['gauge', 'line', 'stat', 'bar', 'table'],
  },

  // === SMART CITIES ===
  {
    id: 'traffic-management',
    name: 'Smart Traffic Management',
    description: 'Traffic flow monitoring, congestion detection, signal optimization, and parking availability',
    icon: Activity,
    category: 'Smart Cities',
    recommendedTables: ['traffic', 'vehicles', 'intersections', 'signals', 'parking', 'sensors', 'incidents'],
    widgetTypes: ['heatmap', 'line', 'stat', 'bar', 'table'],
  },
  {
    id: 'environmental-sensors',
    name: 'Environmental Monitoring',
    description: 'Air quality, noise levels, weather data, and pollution tracking for urban environments',
    icon: Activity,
    category: 'Smart Cities',
    recommendedTables: ['air_quality', 'noise', 'weather', 'pollution', 'sensors', 'locations', 'alerts'],
    widgetTypes: ['gauge', 'line', 'heatmap', 'stat', 'area'],
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

  // Helper: Check if a table name is sensor-related
  const isSensorRelatedTable = (tableName: string): boolean => {
    const sensorKeywords = [
      'sensor', 'reading', 'telemetry', 'device', 'iot',
      'measurement', 'temperature', 'humidity', 'pressure',
      'monitoring', 'metric', 'timeseries', 'time_series',
      'environment', 'climate', 'weather', 'air_quality',
      'energy', 'power', 'voltage', 'current',
      'machine', 'equipment', 'vehicle', 'fleet', 'gps',
      'home', 'automation', 'smart'
    ];
    const lowerTable = tableName.toLowerCase();
    return sensorKeywords.some(keyword => lowerTable.includes(keyword));
  };

  // Auto-detect sensor tables and select appropriate template
  useEffect(() => {
    // Detect sensor-related tables
    const sensorTables = availableTables.filter(t => isSensorRelatedTable(t.table));

    if (sensorTables.length > 0) {
      // Auto-select sensor tables (up to 3 for better performance)
      const autoSelectedTables = sensorTables.slice(0, 3).map(t => `${t.schema}.${t.table}`);
      setSelectedTables(autoSelectedTables);

      // Auto-select the first IoT template
      const iotTemplate = TEMPLATES.find(t => t.category === 'IoT & Sensors');
      if (iotTemplate && !selectedTemplate) {
        setSelectedTemplate(iotTemplate);
      }

      // If all sensor tables are from same schema, pre-select that schema
      const schemas = new Set(sensorTables.map(t => t.schema));
      if (schemas.size === 1 && !selectedSchema) {
        setSelectedSchema(Array.from(schemas)[0]);
      }
    }
  }, [availableTables]); // Only run on mount or when tables change

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
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Choose Your Dashboard Template
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Select a pre-built template tailored to your use case. Each template includes optimized visualizations and layouts.
                </p>
              </div>

              {/* IoT & Sensors Section (Featured) */}
              {TEMPLATES.filter(t => t.category === 'IoT & Sensors').length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-purple-600">
                      <Zap className="h-4 w-4 text-white" />
                    </div>
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                      IoT & Sensor Dashboards
                    </h4>
                    <div className="flex-1 h-px bg-gradient-to-r from-gray-300 to-transparent dark:from-gray-700"></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {TEMPLATES.filter(t => t.category === 'IoT & Sensors').map((template) => {
                      const Icon = template.icon;
                      const isSelected = selectedTemplate?.id === template.id;

                      return (
                        <button
                          key={template.id}
                          onClick={() => setSelectedTemplate(template)}
                          className={`group relative text-left rounded-2xl border-2 transition-all duration-300 overflow-hidden ${
                            isSelected
                              ? 'border-blue-500 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-blue-950/30 dark:via-gray-800 dark:to-purple-950/30 shadow-2xl scale-[1.02]'
                              : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-xl hover:scale-[1.01]'
                          }`}
                        >
                          {/* Template Preview/Mockup Area */}
                          <div className={`relative h-48 p-6 overflow-hidden ${
                            isSelected
                              ? 'bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700'
                              : 'bg-gradient-to-br from-slate-800 via-slate-900 to-gray-900 dark:from-slate-900 dark:via-gray-900 dark:to-black'
                          } group-hover:scale-105 transition-all duration-500`}>
                            {/* Enhanced Decorative Dashboard Mockup with Depth */}
                            <div className="absolute inset-0">
                              {/* Grid Background Pattern */}
                              <div className="absolute inset-0 opacity-10">
                                <div className="w-full h-full" style={{
                                  backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                                  backgroundSize: '20px 20px'
                                }}></div>
                              </div>

                              {/* Realistic Dashboard Layout Preview */}
                              <div className="absolute inset-0 p-4 opacity-25 group-hover:opacity-35 transition-opacity">
                                {/* Top Stats Bar */}
                                <div className="flex gap-2 mb-2 h-12">
                                  <div className="flex-1 bg-white/40 rounded-lg backdrop-blur-sm shadow-lg"></div>
                                  <div className="flex-1 bg-white/40 rounded-lg backdrop-blur-sm shadow-lg"></div>
                                  <div className="flex-1 bg-white/40 rounded-lg backdrop-blur-sm shadow-lg"></div>
                                </div>
                                {/* Main Chart Area */}
                                <div className="grid grid-cols-3 gap-2 h-16">
                                  <div className="col-span-2 bg-white/30 rounded-lg backdrop-blur-sm shadow-lg relative overflow-hidden">
                                    {/* Simulated Chart Lines */}
                                    <div className="absolute bottom-0 left-0 right-0 h-12 flex items-end gap-1 p-2">
                                      <div className="flex-1 bg-white/50 rounded-t" style={{height: '60%'}}></div>
                                      <div className="flex-1 bg-white/50 rounded-t" style={{height: '80%'}}></div>
                                      <div className="flex-1 bg-white/50 rounded-t" style={{height: '40%'}}></div>
                                      <div className="flex-1 bg-white/50 rounded-t" style={{height: '90%'}}></div>
                                      <div className="flex-1 bg-white/50 rounded-t" style={{height: '70%'}}></div>
                                    </div>
                                  </div>
                                  <div className="bg-white/30 rounded-lg backdrop-blur-sm shadow-lg"></div>
                                </div>
                              </div>

                              {/* Neon Glow Effect */}
                              {isSelected && (
                                <div className="absolute inset-0 bg-gradient-to-tr from-blue-400/20 via-purple-400/20 to-pink-400/20 animate-pulse"></div>
                              )}
                            </div>

                            {/* Icon with Glassmorphism */}
                            <div className="relative z-10 flex items-center justify-between">
                              <div className={`flex h-16 w-16 items-center justify-center rounded-2xl backdrop-blur-md ${
                                isSelected
                                  ? 'bg-white/25 ring-4 ring-white/40 shadow-2xl shadow-blue-500/50'
                                  : 'bg-white/15 group-hover:bg-white/25 shadow-xl'
                              } transition-all duration-300 group-hover:scale-110`}>
                                <Icon className="h-8 w-8 text-white drop-shadow-2xl" />
                              </div>

                              {isSelected && (
                                <div className="flex items-center gap-2 bg-white/25 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/40 shadow-lg">
                                  <CheckCircle2 className="h-4 w-4 text-white" />
                                  <span className="text-xs font-bold text-white tracking-wide">ACTIVE</span>
                                </div>
                              )}
                            </div>

                            {/* Category Badge with Modern Styling */}
                            <div className="relative z-10 mt-4 flex items-center gap-2">
                              <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-white/20 backdrop-blur-md text-white rounded-full border border-white/30 shadow-lg">
                                <Sparkles className="h-3.5 w-3.5" />
                                {template.category}
                              </span>
                              <span className="text-xs text-white/80 font-medium">
                                {template.widgetTypes.length} widgets
                              </span>
                            </div>
                          </div>

                          {/* Content Area with Enhanced Typography */}
                          <div className="p-6 space-y-4">
                            <div>
                              <h4 className="text-xl font-extrabold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors tracking-tight">
                                {template.name}
                              </h4>

                              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-2">
                                {template.description}
                              </p>
                            </div>

                            {/* Widget Types with Modern Pills */}
                            <div>
                              <div className="flex items-center gap-2 mb-3">
                                <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                                  Included Widgets
                                </div>
                                <div className="flex-1 h-px bg-gradient-to-r from-gray-300 to-transparent dark:from-gray-700"></div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {template.widgetTypes.slice(0, 5).map((type, idx) => {
                                  const widgetIcons: Record<string, any> = {
                                    'stat': TrendingUp,
                                    'line': LineChart,
                                    'bar': BarChart3,
                                    'pie': PieChart,
                                    'gauge': Gauge,
                                    'area': Activity,
                                    'heatmap': Grid3x3,
                                    'funnel': Activity,
                                  };
                                  const WidgetIcon = widgetIcons[type] || BarChart3;

                                  return (
                                    <span
                                      key={idx}
                                      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                                        isSelected
                                          ? 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700 shadow-sm'
                                          : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                      }`}
                                    >
                                      <WidgetIcon className="h-3 w-3" />
                                      {type}
                                    </span>
                                  );
                                })}
                                {template.widgetTypes.length > 5 && (
                                  <span className="inline-flex items-center text-xs font-semibold px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full border border-gray-200 dark:border-gray-700">
                                    +{template.widgetTypes.length - 5} more
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Recommended Tables with Icon */}
                            <div className={`flex items-center gap-2 text-xs p-3 rounded-lg border ${
                              isSelected
                                ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                                : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                            } transition-colors`}>
                              <TableIcon className="h-4 w-4 flex-shrink-0" />
                              <div className="flex-1 flex items-center gap-1.5 flex-wrap">
                                <span className="font-medium">Best for:</span>
                                {template.recommendedTables.slice(0, 3).map((table, idx) => (
                                  <span key={idx} className="font-semibold">
                                    {table}{idx < Math.min(template.recommendedTables.length, 3) - 1 ? ',' : ''}
                                  </span>
                                ))}
                                {template.recommendedTables.length > 3 && (
                                  <span className="font-bold">
                                    +{template.recommendedTables.length - 3}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Selection Indicator with Glow */}
                          {isSelected && (
                            <>
                              <div className="absolute top-0 right-0 w-24 h-24 overflow-hidden">
                                <div className="absolute top-0 right-0 w-0 h-0 border-t-[56px] border-r-[56px] border-t-blue-600 border-r-transparent animate-pulse"></div>
                                <div className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-lg">
                                  <CheckCircle2 className="h-5 w-5 text-blue-600" />
                                </div>
                              </div>
                              {/* Subtle Border Glow */}
                              <div className="absolute inset-0 rounded-2xl ring-2 ring-blue-400/50 dark:ring-blue-500/50 pointer-events-none"></div>
                            </>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Other Templates Section */}
              {TEMPLATES.filter(t => t.category !== 'IoT & Sensors').length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                      Other Templates
                    </h4>
                    <div className="flex-1 h-px bg-gradient-to-r from-gray-300 to-transparent dark:from-gray-700"></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {TEMPLATES.filter(t => t.category !== 'IoT & Sensors').map((template) => {
                  const Icon = template.icon;
                  const isSelected = selectedTemplate?.id === template.id;

                  return (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplate(template)}
                      className={`group relative text-left rounded-2xl border-2 transition-all duration-300 overflow-hidden ${
                        isSelected
                          ? 'border-blue-500 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-blue-950/30 dark:via-gray-800 dark:to-purple-950/30 shadow-2xl scale-[1.02]'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-xl hover:scale-[1.01]'
                      }`}
                    >
                      {/* Template Preview/Mockup Area */}
                      <div className={`relative h-48 p-6 overflow-hidden ${
                        isSelected
                          ? 'bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700'
                          : 'bg-gradient-to-br from-slate-800 via-slate-900 to-gray-900 dark:from-slate-900 dark:via-gray-900 dark:to-black'
                      } group-hover:scale-105 transition-all duration-500`}>
                        {/* Enhanced Decorative Dashboard Mockup with Depth */}
                        <div className="absolute inset-0">
                          {/* Grid Background Pattern */}
                          <div className="absolute inset-0 opacity-10">
                            <div className="w-full h-full" style={{
                              backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                              backgroundSize: '20px 20px'
                            }}></div>
                          </div>

                          {/* Realistic Dashboard Layout Preview */}
                          <div className="absolute inset-0 p-4 opacity-25 group-hover:opacity-35 transition-opacity">
                            {/* Top Stats Bar */}
                            <div className="flex gap-2 mb-2 h-12">
                              <div className="flex-1 bg-white/40 rounded-lg backdrop-blur-sm shadow-lg"></div>
                              <div className="flex-1 bg-white/40 rounded-lg backdrop-blur-sm shadow-lg"></div>
                              <div className="flex-1 bg-white/40 rounded-lg backdrop-blur-sm shadow-lg"></div>
                            </div>
                            {/* Main Chart Area */}
                            <div className="grid grid-cols-3 gap-2 h-16">
                              <div className="col-span-2 bg-white/30 rounded-lg backdrop-blur-sm shadow-lg relative overflow-hidden">
                                {/* Simulated Chart Lines */}
                                <div className="absolute bottom-0 left-0 right-0 h-12 flex items-end gap-1 p-2">
                                  <div className="flex-1 bg-white/50 rounded-t" style={{height: '60%'}}></div>
                                  <div className="flex-1 bg-white/50 rounded-t" style={{height: '80%'}}></div>
                                  <div className="flex-1 bg-white/50 rounded-t" style={{height: '40%'}}></div>
                                  <div className="flex-1 bg-white/50 rounded-t" style={{height: '90%'}}></div>
                                  <div className="flex-1 bg-white/50 rounded-t" style={{height: '70%'}}></div>
                                </div>
                              </div>
                              <div className="bg-white/30 rounded-lg backdrop-blur-sm shadow-lg"></div>
                            </div>
                          </div>

                          {/* Neon Glow Effect */}
                          {isSelected && (
                            <div className="absolute inset-0 bg-gradient-to-tr from-blue-400/20 via-purple-400/20 to-pink-400/20 animate-pulse"></div>
                          )}
                        </div>

                        {/* Icon with Glassmorphism */}
                        <div className="relative z-10 flex items-center justify-between">
                          <div className={`flex h-16 w-16 items-center justify-center rounded-2xl backdrop-blur-md ${
                            isSelected
                              ? 'bg-white/25 ring-4 ring-white/40 shadow-2xl shadow-blue-500/50'
                              : 'bg-white/15 group-hover:bg-white/25 shadow-xl'
                          } transition-all duration-300 group-hover:scale-110`}>
                            <Icon className="h-8 w-8 text-white drop-shadow-2xl" />
                          </div>

                          {isSelected && (
                            <div className="flex items-center gap-2 bg-white/25 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/40 shadow-lg">
                              <CheckCircle2 className="h-4 w-4 text-white" />
                              <span className="text-xs font-bold text-white tracking-wide">ACTIVE</span>
                            </div>
                          )}
                        </div>

                        {/* Category Badge with Modern Styling */}
                        <div className="relative z-10 mt-4 flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-white/20 backdrop-blur-md text-white rounded-full border border-white/30 shadow-lg">
                            <Sparkles className="h-3.5 w-3.5" />
                            {template.category}
                          </span>
                          <span className="text-xs text-white/80 font-medium">
                            {template.widgetTypes.length} widgets
                          </span>
                        </div>
                      </div>

                      {/* Content Area with Enhanced Typography */}
                      <div className="p-6 space-y-4">
                        <div>
                          <h4 className="text-xl font-extrabold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors tracking-tight">
                            {template.name}
                          </h4>

                          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-2">
                            {template.description}
                          </p>
                        </div>

                        {/* Widget Types with Modern Pills */}
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                              Included Widgets
                            </div>
                            <div className="flex-1 h-px bg-gradient-to-r from-gray-300 to-transparent dark:from-gray-700"></div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {template.widgetTypes.slice(0, 5).map((type, idx) => {
                              const widgetIcons: Record<string, any> = {
                                'stat': TrendingUp,
                                'line': LineChart,
                                'bar': BarChart3,
                                'pie': PieChart,
                                'gauge': Gauge,
                                'area': Activity,
                                'heatmap': Grid3x3,
                                'funnel': Activity,
                              };
                              const WidgetIcon = widgetIcons[type] || BarChart3;

                              return (
                                <span
                                  key={idx}
                                  className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                                    isSelected
                                      ? 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700 shadow-sm'
                                      : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                  }`}
                                >
                                  <WidgetIcon className="h-3 w-3" />
                                  {type}
                                </span>
                              );
                            })}
                            {template.widgetTypes.length > 5 && (
                              <span className="inline-flex items-center text-xs font-semibold px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full border border-gray-200 dark:border-gray-700">
                                +{template.widgetTypes.length - 5} more
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Recommended Tables with Icon */}
                        <div className={`flex items-center gap-2 text-xs p-3 rounded-lg border ${
                          isSelected
                            ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                            : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                        } transition-colors`}>
                          <TableIcon className="h-4 w-4 flex-shrink-0" />
                          <div className="flex-1 flex items-center gap-1.5 flex-wrap">
                            <span className="font-medium">Best for:</span>
                            {template.recommendedTables.slice(0, 3).map((table, idx) => (
                              <span key={idx} className="font-semibold">
                                {table}{idx < Math.min(template.recommendedTables.length, 3) - 1 ? ',' : ''}
                              </span>
                            ))}
                            {template.recommendedTables.length > 3 && (
                              <span className="font-bold">
                                +{template.recommendedTables.length - 3}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Selection Indicator with Glow */}
                      {isSelected && (
                        <>
                          <div className="absolute top-0 right-0 w-24 h-24 overflow-hidden">
                            <div className="absolute top-0 right-0 w-0 h-0 border-t-[56px] border-r-[56px] border-t-blue-600 border-r-transparent animate-pulse"></div>
                            <div className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-lg">
                              <CheckCircle2 className="h-5 w-5 text-blue-600" />
                            </div>
                          </div>
                          {/* Subtle Border Glow */}
                          <div className="absolute inset-0 rounded-2xl ring-2 ring-blue-400/50 dark:ring-blue-500/50 pointer-events-none"></div>
                        </>
                      )}
                    </button>
                  );
                })}
                  </div>
                </div>
              )}

              {/* Enhanced Help Section */}
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-2xl border border-blue-200 dark:border-blue-800 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg flex-shrink-0">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-blue-900 dark:text-blue-300 mb-1">
                        AI-Powered Layouts
                      </div>
                      <div className="text-xs text-blue-700 dark:text-blue-400">
                        Each template uses optimal chart combinations and layouts based on your data structure.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-5 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-2xl border border-purple-200 dark:border-purple-800 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600 text-white shadow-lg flex-shrink-0">
                      <Activity className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-purple-900 dark:text-purple-300 mb-1">
                        Fully Customizable
                      </div>
                      <div className="text-xs text-purple-700 dark:text-purple-400">
                        Customize colors, chart types, filters, and layouts after creation to match your needs.
                      </div>
                    </div>
                  </div>
                </div>
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

              {/* Auto-detection Info Banner */}
              {selectedTables.length > 0 && (
                <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-xl border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 flex-shrink-0">
                      <Sparkles className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-blue-900 dark:text-blue-300 mb-1">
                        Smart Detection Active
                      </h4>
                      <p className="text-xs text-blue-700 dark:text-blue-400">
                        We've automatically detected and selected {selectedTables.length} sensor-related table{selectedTables.length > 1 ? 's' : ''} for your dashboard.
                        You can add or remove tables as needed.
                      </p>
                    </div>
                  </div>
                </div>
              )}

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
                  const isSensorTable = isSensorRelatedTable(t.table);

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
                          isSelected ? 'bg-green-600' : isSensorTable ? 'bg-blue-600' : 'bg-gray-600'
                        }`}>
                          {isSelected ? (
                            <CheckCircle2 className="h-5 w-5 text-white" />
                          ) : isSensorTable ? (
                            <Zap className="h-5 w-5 text-white" />
                          ) : (
                            <TableIcon className="h-5 w-5 text-white" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-gray-900 dark:text-white">
                              {tableKey}
                            </span>
                            {isSensorTable && (
                              <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full flex items-center gap-1">
                                <Zap className="h-3 w-3" />
                                Sensor
                              </span>
                            )}
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

          {/* Step 3: Preview - Dashboard Style */}
          {step === 'preview' && (
            <div className="bg-gray-900 -m-6 p-6 rounded-xl">
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
                  <p className="text-sm text-gray-400">
                    Analyzing table schemas and generating widgets...
                  </p>
                </div>
              ) : (
                <>
                  {/* Dashboard Header - Enterprise Style */}
                  <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-5 mb-6 border border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-purple-600">
                          <Grid3x3 className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-white">
                            Active Visualizations
                          </h3>
                          <p className="text-xs text-gray-400">
                            Manage and configure your dashboard widgets
                          </p>
                        </div>
                      </div>
                      <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors">
                        <Sparkles className="h-4 w-4" />
                        Refresh All (8)
                      </button>
                    </div>

                    {/* Time Range Selector */}
                    <div className="flex items-center gap-2 mb-4">
                      <button className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-xs font-medium transition-colors">
                        Last 1 Hour
                      </button>
                      <button className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium">
                        Last 24 Hours
                      </button>
                      <button className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-xs font-medium transition-colors">
                        Last 7 Days
                      </button>
                      <button className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-xs font-medium transition-colors">
                        Last 30 Days
                      </button>
                      <button className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-xs font-medium transition-colors">
                        Custom Range
                      </button>
                    </div>

                    {/* Date Range Display */}
                    <div className="flex items-center justify-between text-xs text-gray-400 bg-gray-800 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Activity className="h-3 w-3" />
                        <span>Feb 08, 2026 00:49 - Feb 09, 2026 00:49</span>
                      </div>
                      <button className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs font-medium transition-colors">
                        START LIVE
                      </button>
                    </div>
                  </div>

                  {/* Active Visualizations Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-purple-600">
                        <Grid3x3 className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                          Active Visualizations
                        </h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          Manage and configure your dashboard widgets
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setGeneratedWidgets(generatedWidgets.map(w => ({ ...w, isVisible: true })));
                        }}
                        className="text-xs px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors font-semibold"
                      >
                        Enable All
                      </button>
                      <button
                        onClick={() => {
                          setGeneratedWidgets(generatedWidgets.map(w => ({ ...w, isVisible: false })));
                        }}
                        className="text-xs px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-semibold"
                      >
                        Disable All
                      </button>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                      <div className="text-2xl font-bold text-blue-900 dark:text-blue-300">
                        {generatedWidgets.filter(w => w.isVisible).length}
                      </div>
                      <div className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                        Active Widgets
                      </div>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                      <div className="text-2xl font-bold text-purple-900 dark:text-purple-300">
                        {generatedWidgets.length}
                      </div>
                      <div className="text-xs text-purple-700 dark:text-purple-400 mt-1">
                        Total Widgets
                      </div>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                      <div className="text-2xl font-bold text-green-900 dark:text-green-300">
                        {selectedTables.length}
                      </div>
                      <div className="text-xs text-green-700 dark:text-green-400 mt-1">
                        Data Sources
                      </div>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800">
                      <div className="text-2xl font-bold text-orange-900 dark:text-orange-300">
                        {new Set(generatedWidgets.map(w => w.chartType)).size}
                      </div>
                      <div className="text-xs text-orange-700 dark:text-orange-400 mt-1">
                        Chart Types
                      </div>
                    </div>
                  </div>
                  {/* Widget Grid - Enterprise Dashboard Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[520px] overflow-y-auto pr-2">
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
                          className={`group bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 hover:border-gray-600 transition-all overflow-hidden ${
                            !widget.isVisible ? 'opacity-50' : ''
                          }`}
                        >
                          {/* Card Header */}
                          <div className="p-4 border-b border-gray-700">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className="flex h-6 w-6 items-center justify-center rounded bg-gray-700 text-gray-300">
                                  {getChartIcon()}
                                </div>
                                <h4 className="text-sm font-semibold text-white truncate">
                                  {widget.name}
                                </h4>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors">
                                  <Activity className="h-3 w-3" />
                                </button>
                                <button className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors">
                                  <TrendingUp className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={() => {
                                    const updated = [...generatedWidgets];
                                    updated[idx] = { ...updated[idx], isVisible: !updated[idx].isVisible };
                                    setGeneratedWidgets(updated);
                                  }}
                                  className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
                                >
                                  {widget.isVisible ? <CheckCircle2 className="h-3 w-3" /> : <X className="h-3 w-3" />}
                                </button>
                                <button
                                  onClick={() => setGeneratedWidgets(generatedWidgets.filter((_, i) => i !== idx))}
                                  className="p-1 hover:bg-red-700 rounded text-gray-400 hover:text-red-400 transition-colors"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                              <span className="flex items-center gap-1">
                                <Database className="h-3 w-3" />
                                {widget.schema}.{widget.table}
                              </span>
                              <span>•</span>
                              <span>{widget.aggregation}</span>
                              <span>•</span>
                              <span className="capitalize">{widget.chartType}</span>
                            </div>
                          </div>

                          {/* Card Body - Chart Preview */}
                          <div className="p-6 h-48 flex items-center justify-center bg-gradient-to-br from-gray-800/50 to-gray-900/50">
                            <div className="text-center">
                              <div className="text-3xl font-bold text-blue-400 mb-2">
                                {widget.chartType === 'stat' ? '43.6' :
                                 widget.chartType === 'gauge' ? '57.5%' : ''}
                              </div>
                              {widget.chartType === 'stat' && (
                                <div className="text-xs text-gray-400">
                                  {widget.aggregation} {widget.metricColumns?.[0] || 'value'}
                                </div>
                              )}
                              {(widget.chartType === 'line' || widget.chartType === 'area') && (
                                <div className="w-48 h-20 flex items-end justify-center gap-1">
                                  {[30, 45, 35, 60, 50, 70, 65, 80, 75].map((h, i) => (
                                    <div key={i} className="flex-1 bg-blue-500/30 rounded-t" style={{height: `${h}%`}}></div>
                                  ))}
                                </div>
                              )}
                              {widget.chartType === 'bar' && (
                                <div className="w-48 space-y-1">
                                  {[80, 65, 90, 45].map((w, i) => (
                                    <div key={i} className="h-3 bg-blue-500/40 rounded" style={{width: `${w}%`}}></div>
                                  ))}
                                </div>
                              )}
                              {widget.chartType === 'pie' && (
                                <div className="w-20 h-20 rounded-full border-8 border-blue-500/40 border-t-blue-500 border-r-purple-500"></div>
                              )}
                              {widget.chartType === 'gauge' && (
                                <div className="w-24 h-12 border-4 border-gray-700 border-t-blue-500 rounded-t-full"></div>
                              )}
                            </div>
                          </div>

                          {/* Card Footer */}
                          <div className="px-4 py-2 bg-gray-800/30 border-t border-gray-700 flex items-center justify-between text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                              <Activity className="h-3 w-3" />
                              Data Loaded
                            </span>
                            <span>Last updated: 10:10:00 AM</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Empty State */}
                  {generatedWidgets.length === 0 && (
                    <div className="text-center py-12 bg-gray-800/30 rounded-xl border border-gray-700">
                      <Grid3x3 className="h-12 w-12 mx-auto mb-3 text-gray-500" />
                      <p className="text-sm text-gray-400">
                        No widgets configured. Go back to select tables.
                      </p>
                    </div>
                  )}
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
