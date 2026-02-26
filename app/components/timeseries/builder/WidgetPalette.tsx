'use client';
import { BarChart2, TrendingUp, AreaChart, PieChart, Gauge, Table2, Activity, Layers, ScatterChart, Filter, LayoutGrid, CandlestickChart, BarChart } from 'lucide-react';
import type { WidgetType } from '@/app/lib/timeseries/types';

interface PaletteItem {
  type: WidgetType;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  badge?: string;
}

const PALETTE: PaletteItem[] = [
  // Core
  { type: 'stat-card',     label: 'Stat Card',     description: 'Single KPI value with trend',     icon: <Activity className="h-5 w-5" />,          color: 'text-blue-500' },
  { type: 'line-chart',    label: 'Line Chart',     description: 'Time series trend lines',         icon: <TrendingUp className="h-5 w-5" />,         color: 'text-cyan-500' },
  { type: 'area-chart',    label: 'Area Chart',     description: 'Filled area trend',               icon: <AreaChart className="h-5 w-5" />,          color: 'text-indigo-500' },
  { type: 'bar-chart',     label: 'Bar Chart',      description: 'Category comparisons',            icon: <BarChart2 className="h-5 w-5" />,          color: 'text-violet-500' },
  { type: 'pie-chart',     label: 'Pie / Donut',    description: 'Distribution breakdown',          icon: <PieChart className="h-5 w-5" />,           color: 'text-pink-500' },
  { type: 'gauge',         label: 'Gauge',          description: 'Circular value indicator',        icon: <Gauge className="h-5 w-5" />,              color: 'text-amber-500' },
  { type: 'heatmap',       label: 'Heatmap',        description: 'Time-based intensity map',        icon: <Layers className="h-5 w-5" />,             color: 'text-emerald-500' },
  { type: 'data-table',    label: 'Data Table',     description: 'Raw rows, sortable',              icon: <Table2 className="h-5 w-5" />,             color: 'text-gray-500' },
  // Enterprise
  { type: 'scatter-chart', label: 'Scatter Plot',   description: 'Correlation & distribution',      icon: <ScatterChart className="h-5 w-5" />,       color: 'text-purple-500',  badge: 'New' },
  { type: 'funnel-chart',  label: 'Funnel Chart',   description: 'Sales funnel & conversion',       icon: <Filter className="h-5 w-5" />,             color: 'text-orange-500',  badge: 'New' },
  { type: 'treemap',       label: 'Treemap',        description: 'Hierarchical data breakdown',     icon: <LayoutGrid className="h-5 w-5" />,         color: 'text-teal-500',    badge: 'New' },
  { type: 'candlestick',   label: 'Candlestick',    description: 'OHLC for financial / stock data', icon: <CandlestickChart className="h-5 w-5" />,   color: 'text-emerald-500', badge: 'New' },
  { type: 'progress-kpi',  label: 'Progress KPI',   description: 'Multi-metric target progress',    icon: <BarChart className="h-5 w-5" />,           color: 'text-blue-500',    badge: 'New' },
];

interface WidgetPaletteProps {
  onAddWidget: (type: WidgetType) => void;
}

const CORE_TYPES: WidgetType[] = ['stat-card','line-chart','area-chart','bar-chart','pie-chart','gauge','heatmap','data-table'];

export default function WidgetPalette({ onAddWidget }: WidgetPaletteProps) {
  const core       = PALETTE.filter((p) => CORE_TYPES.includes(p.type));
  const enterprise = PALETTE.filter((p) => !CORE_TYPES.includes(p.type));

  const renderItem = (item: PaletteItem) => (
    <button
      key={item.type}
      onClick={() => onAddWidget(item.type)}
      className="group flex w-full items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/80 px-3 py-2.5 text-left transition-all hover:border-blue-200 hover:bg-blue-50/60 dark:border-gray-700 dark:bg-gray-800/60 dark:hover:border-blue-700 dark:hover:bg-blue-900/20"
    >
      <span className={`flex-shrink-0 ${item.color}`}>{item.icon}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-semibold text-gray-800 group-hover:text-blue-700 dark:text-gray-200 dark:group-hover:text-blue-400">
            {item.label}
          </p>
          {item.badge && (
            <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
              {item.badge}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{item.description}</p>
      </div>
    </button>
  );

  return (
    <div className="flex h-full flex-col overflow-hidden border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
      <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Widget Types
        </h3>
        <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">Click to add to canvas</p>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {/* Core widgets */}
        <div className="space-y-1.5">
          {core.map(renderItem)}
        </div>

        {/* Enterprise widgets */}
        <div className="mt-4">
          <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-600">
            Enterprise
          </p>
          <div className="space-y-1.5">
            {enterprise.map(renderItem)}
          </div>
        </div>
      </div>
    </div>
  );
}
