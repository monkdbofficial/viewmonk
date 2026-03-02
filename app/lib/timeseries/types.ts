// ─────────────────────────────────────────────────────────────────────────────
// MonkDB Workbench — Timeseries Dashboard Studio
// Core TypeScript interfaces — all layers depend on this file
// ─────────────────────────────────────────────────────────────────────────────

// ── Widget Types ──────────────────────────────────────────────────────────────

export type WidgetType =
  | 'stat-card'
  | 'line-chart'
  | 'area-chart'
  | 'bar-chart'
  | 'pie-chart'
  | 'gauge'
  | 'heatmap'
  | 'data-table'
  | 'scatter-chart'
  | 'funnel-chart'
  | 'treemap'
  | 'candlestick'
  | 'progress-kpi';

export type AggregationType = 'AVG' | 'MAX' | 'MIN' | 'SUM' | 'COUNT' | 'COUNT_DISTINCT' | 'STDDEV' | 'VARIANCE';

export type ColorScheme =
  | 'blue'
  | 'green'
  | 'red'
  | 'amber'
  | 'purple'
  | 'cyan'
  | 'pink'
  | 'emerald';

// ── Grid Position (12-column layout) ─────────────────────────────────────────

export interface GridPosition {
  x: number; // 0–11
  y: number; // row index
  w: number; // width in columns
  h: number; // height in rows (each row = 120px)
}

// ── Data Source Config (what SQL to run) ─────────────────────────────────────

export interface DataSourceConfig {
  schema: string;        // e.g. 'monkdb'
  table: string;         // e.g. 'sensor_data'
  timestampCol: string;  // e.g. 'timestamp'
  metricCol: string;     // e.g. 'temperature'
  groupCol?: string;     // e.g. 'location'  (optional — for multi-series)
  aggregation: AggregationType;
  customSql?: string;    // power-user raw SQL mode (overrides template)
  limit?: number;        // row limit (default 50)
  // scatter-chart: explicit X/Y numeric columns
  xCol?: string;
  yCol?: string;
  // candlestick: explicit OHLC columns (fall back to metricCol)
  openCol?: string;
  highCol?: string;
  lowCol?: string;
  closeCol?: string;
  // progress-kpi: fixed target value (overrides MAX from DB)
  kpiTarget?: number;
  // treemap: parent category for 2-level hierarchy
  parentCol?: string;
  // additional WHERE conditions (appended to SQL filter)
  whereClause?: string;
}

// ── Widget Threshold ─────────────────────────────────────────────────────────

export interface WidgetThreshold {
  id: string;
  value: number;
  color: string;   // hex e.g. '#EF4444'
  label?: string;  // optional display label
}

// ── Widget Style ──────────────────────────────────────────────────────────────

export interface WidgetStyle {
  colorScheme: ColorScheme;
  unit?: string;          // suffix: '°C', '%', 'km/h', 'ms', etc.
  prefix?: string;        // prefix before value: '$', '~', etc.
  decimals?: number;      // decimal places (0-4), default auto
  showLegend: boolean;
  showGrid: boolean;
  gaugeMin?: number;      // gauge widget range minimum
  gaugeMax?: number;      // gauge widget range maximum
  invertTrend?: boolean;  // for stat-card: ↑ is bad (e.g. error count)
  customColors?: string[];        // hex palette for chart series (up to 6)
  thresholds?: WidgetThreshold[]; // threshold lines on charts / zones on gauge
  fillOpacity?: number;           // area chart fill opacity 0-100 (default 35)
  smooth?: boolean;               // smooth curves on line/area charts
  showDataLabels?: boolean;       // show values on bars / pie slices
  cardStyle?: 'default' | 'glass' | 'filled' | 'borderless'; // card background style
  yAxisScale?: 'linear' | 'log';  // Y-axis scale type for line/area/bar charts
}

// ── Widget Config (stored in dashboard) ──────────────────────────────────────

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  position: GridPosition;
  dataSource: DataSourceConfig;
  style: WidgetStyle;
}

// ── Dashboard Theme ───────────────────────────────────────────────────────────

export type DashboardThemeId =
  | 'dark-navy'
  | 'midnight-glow'
  | 'light-clean'
  | 'purple-storm'
  | 'neon-cyber'
  | 'warm-vibrant';

// ── Dashboard Config (persisted to localStorage / MonkDB) ────────────────────

export interface DashboardConfig {
  id: string;
  name: string;
  description?: string;
  themeId: DashboardThemeId;
  refreshInterval: number | 'manual'; // ms: 10000 | 30000 | 60000 | 300000
  createdAt: string;    // ISO string
  updatedAt: string;    // ISO string
  templateId?: string;  // which template it was created from (if any)
  widgets: WidgetConfig[];
}

// ── Time Range ────────────────────────────────────────────────────────────────

export type TimePreset = '15m' | '1h' | '6h' | '24h' | '7d' | '30d' | 'custom';

export interface TimeRange {
  preset: TimePreset;
  from: Date;
  to: Date;
}

// ── Cross-Widget Filter (drill-down) ─────────────────────────────────────────

export interface ActiveFilter {
  column: string;
  value: string | number;
  sourceWidgetId: string; // which widget triggered the filter
}

// ── Widget Runtime State (in memory only) ────────────────────────────────────

export type WidgetStatus =
  | 'idle'
  | 'loading'
  | 'loaded'
  | 'refreshing'
  | 'error'
  | 'no-data';

export interface WidgetRuntimeState {
  widgetId: string;
  status: WidgetStatus;
  data: Record<string, unknown>[];  // query results as objects
  columns: string[];
  error: string | null;
  lastUpdated: Date | null;
  executionTime: number; // ms
}

// ── Dashboard Runtime State (in memory only) ─────────────────────────────────

export interface DashboardRuntimeState {
  config: DashboardConfig;
  timeRange: TimeRange;
  activeFilter: ActiveFilter | null;
  widgetStates: Record<string, WidgetRuntimeState>;
  isRefreshing: boolean;
}

// ── Template Definition ───────────────────────────────────────────────────────

export type TemplateCategory =
  | 'iot'
  | 'analytics'
  | 'business'
  | 'finance'
  | 'infrastructure'
  | 'weather';

export interface TemplateRequiredSchema {
  needsTimestamp: boolean;
  minNumericCols: number; // minimum numeric columns needed
  minTextCols: number;    // minimum text columns needed
}

export interface TemplateColumnMapping {
  timestampCol: string;
  metricCols: string[];  // ordered: first = primary metric, second = secondary, etc.
  groupCol?: string;
}

export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  themeId: DashboardThemeId;
  tags: string[];
  requiredSchema: TemplateRequiredSchema;
  widgetCount: number;
  defaultLayout: Omit<WidgetConfig, 'dataSource'>[];  // layout without data bindings
  /**
   * Name of the _demo_* table in MonkDB that backs this template's preview.
   * All data binding (column roles, aggregations, limits) is stored in
   * DEMO_TABLE_SCHEMAS[demoTable].widgetRoles inside demo-setup.ts.
   * Template files contain zero data configuration.
   */
  demoTable: string;
}

// ── Builder State ─────────────────────────────────────────────────────────────

export type BuilderMode = 'home' | 'view' | 'builder' | 'template-preview';

export interface BuilderState {
  mode: BuilderMode;
  activeDashboardId: string | null;
  previewTemplateId: string | null;
  isDirty: boolean; // unsaved changes in builder
}

// ── Timeseries Table (from information_schema) ────────────────────────────────

export interface TimeseriesTable {
  schema: string;
  table: string;
  timestampCols: string[];
  numericCols: ColumnInfo[];
  textCols: ColumnInfo[];
  rowCount?: number;
}

export interface ColumnInfo {
  name: string;
  type: string;
}

// ── Stat Card Trend ───────────────────────────────────────────────────────────

export interface StatCardTrend {
  value: number | string;
  direction: 'up' | 'down' | 'neutral';
  label: string; // e.g. 'vs last 24h'
}
