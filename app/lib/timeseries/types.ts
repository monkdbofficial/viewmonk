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
  | 'progress-kpi'
  // ── Content widgets (no data source) ──
  | 'text-widget'
  | 'divider';

/** Widget types that render content directly and never fetch SQL data. */
export const CONTENT_WIDGET_TYPES: WidgetType[] = ['text-widget', 'divider'];

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
  // time-range comparison — overlay previous period as a dashed series
  compareWith?: 'previous-period' | 'previous-week' | 'previous-month';
  // result caching
  cacheEnabled?: boolean;
  cacheTtl?: number; // ms — 30000 | 60000 | 300000 | 900000
}

// ── Widget Threshold ─────────────────────────────────────────────────────────

export interface WidgetThreshold {
  id: string;
  value: number;
  color: string;   // hex e.g. '#EF4444'
  label?: string;  // optional display label
  /** When true, a breach fires an in-app alert toast */
  alertEnabled?: boolean;
  /** 'above' = alert when value ≥ threshold (default); 'below' = alert when value ≤ threshold */
  alertDirection?: 'above' | 'below';
}

// ── Column Formatting Rule (DataTable conditional formatting) ─────────────────

export type ColumnFormattingStyle = 'bg-color' | 'text-color' | 'badge' | 'bar' | 'icon';
export type ColumnFormattingOperator = 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'between';
export type ColumnFormattingIcon = 'arrow-up' | 'arrow-down' | 'check' | 'x' | 'warning';

export interface ColumnFormattingRule {
  id: string;
  column: string;
  operator: ColumnFormattingOperator;
  value: number;
  value2?: number;       // used only for 'between'
  style: ColumnFormattingStyle;
  color: string;         // hex — background, text, badge, or bar fill
  icon?: ColumnFormattingIcon; // used only for 'icon' style
}

// ── Chart Annotation (vertical event marker on time-series charts) ───────────

export interface ChartAnnotation {
  id: string;
  /** ISO timestamp or category string — matched to x-axis position */
  timestamp: string;
  /** Short label shown above the marker line */
  label: string;
  color: string;    // hex
  /** 'line' = full-height vertical marker; 'point' = single dot on first series */
  type: 'line' | 'point';
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
  // anomaly detection overlay (line / area charts)
  anomalyDetection?: {
    enabled: boolean;
    /** σ multiplier — lower = more sensitive. 1 = tight, 2 = standard, 3 = conservative */
    sensitivity: number;
    /** Shade the normal band (mean ± Nσ) on the chart */
    showBands: boolean;
  };
  // text-widget style
  textAlign?: 'left' | 'center' | 'right';
  fontSize?: 'sm' | 'base' | 'lg' | 'xl';
  // data-table conditional formatting
  columnFormatting?: ColumnFormattingRule[];
}

// ── Widget Config (stored in dashboard) ──────────────────────────────────────

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  position: GridPosition;
  dataSource: DataSourceConfig;
  style: WidgetStyle;
  /** Markdown content for text-widget type */
  content?: string;
  /** When true, widget cannot be moved or resized in the builder */
  locked?: boolean;
  /** Event/annotation markers rendered as vertical lines on time-series charts */
  annotations?: ChartAnnotation[];
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

export interface DashboardVariable {
  id: string;
  name: string;          // used in SQL as {{name}}
  label: string;         // display label in the variable bar
  type: 'textbox' | 'dropdown' | 'constant';
  defaultValue: string;
  options?: string[];    // for dropdown: static list
  query?: string;        // for dropdown: SQL to populate options dynamically
}

// ── Calculated Metric ─────────────────────────────────────────────────────────

/**
 * A dashboard-level computed field. The formula is a safe arithmetic expression
 * that may reference dashboard variable values as {{var_name}}.
 * The result is injected into widget SQL as {{name}} — same as a variable.
 */
export interface CalculatedMetric {
  id: string;
  name: string;       // SQL injection key: {{name}}
  label: string;      // display label in the variable bar
  formula: string;    // e.g. "{{revenue}} - {{cost}}" or "{{price}} * 1.15"
  unit?: string;      // optional suffix shown next to the computed value
  decimals?: number;  // decimal places for display (default 2)
}

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
  /** User-starred (pinned to top of home screen) */
  starred?: boolean;
  /** Freeform tags for filtering and organisation */
  tags?: string[];
  /** Dashboard-level variables injected into widget SQL as {{name}} */
  variables?: DashboardVariable[];
  /** Dashboard-level computed fields derived from variable values */
  calculatedMetrics?: CalculatedMetric[];
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
  | 'weather'
  | 'support';

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
