// ─────────────────────────────────────────────────────────────────────────────
// MonkDB Workbench — Widget SQL Executor
// Template engine: fills SQL templates → executes → transforms to chart data
// ─────────────────────────────────────────────────────────────────────────────

import type { WidgetConfig, WidgetType, DataSourceConfig, ActiveFilter, TimeRange } from './types';
import { getAutoInterval, toSQLTimestamp } from './time-range';

// ── SQL Templates per widget type ─────────────────────────────────────────────

const SQL_TEMPLATES: Record<WidgetType, string> = {
  'stat-card': `
    SELECT {{aggregation}}("{{metricCol}}") AS value
    FROM "{{schema}}"."{{table}}"
    WHERE "{{tsCol}}" >= '{{from}}'
      AND "{{tsCol}}" <= '{{to}}'
    {{filterClause}}
  `,

  'line-chart': `
    SELECT
      DATE_TRUNC('{{interval}}', "{{tsCol}}") AS time,
      {{groupSelect}}
      {{aggregation}}("{{metricCol}}") AS value
    FROM "{{schema}}"."{{table}}"
    WHERE "{{tsCol}}" >= '{{from}}'
      AND "{{tsCol}}" <= '{{to}}'
    {{filterClause}}
    GROUP BY time{{groupBy}}
    ORDER BY time ASC
    LIMIT {{limit}}
  `,

  'area-chart': `
    SELECT
      DATE_TRUNC('{{interval}}', "{{tsCol}}") AS time,
      {{groupSelect}}
      {{aggregation}}("{{metricCol}}") AS value
    FROM "{{schema}}"."{{table}}"
    WHERE "{{tsCol}}" >= '{{from}}'
      AND "{{tsCol}}" <= '{{to}}'
    {{filterClause}}
    GROUP BY time{{groupBy}}
    ORDER BY time ASC
    LIMIT {{limit}}
  `,

  'bar-chart': `
    SELECT
      "{{groupCol}}" AS category,
      {{aggregation}}("{{metricCol}}") AS value
    FROM "{{schema}}"."{{table}}"
    WHERE "{{tsCol}}" >= '{{from}}'
      AND "{{tsCol}}" <= '{{to}}'
    {{filterClause}}
    GROUP BY "{{groupCol}}"
    ORDER BY value DESC
    LIMIT {{limit}}
  `,

  'pie-chart': `
    SELECT
      "{{groupCol}}" AS category,
      {{aggregation}}("{{metricCol}}") AS value
    FROM "{{schema}}"."{{table}}"
    WHERE "{{tsCol}}" >= '{{from}}'
      AND "{{tsCol}}" <= '{{to}}'
    {{filterClause}}
    GROUP BY "{{groupCol}}"
    ORDER BY value DESC
    LIMIT {{limit}}
  `,

  'gauge': `
    SELECT
      {{aggregation}}("{{metricCol}}") AS current_value,
      MIN("{{metricCol}}") AS range_min,
      MAX("{{metricCol}}") AS range_max
    FROM "{{schema}}"."{{table}}"
    WHERE "{{tsCol}}" >= '{{from}}'
      AND "{{tsCol}}" <= '{{to}}'
    {{filterClause}}
  `,

  'heatmap': `
    SELECT
      DATE_TRUNC('{{interval}}', "{{tsCol}}") AS bucket,
      {{groupSelect}}
      {{aggregation}}("{{metricCol}}") AS value
    FROM "{{schema}}"."{{table}}"
    WHERE "{{tsCol}}" >= '{{from}}'
      AND "{{tsCol}}" <= '{{to}}'
    {{filterClause}}
    GROUP BY bucket{{groupBy}}
    ORDER BY bucket ASC
    LIMIT {{limit}}
  `,

  'data-table': `
    SELECT *
    FROM "{{schema}}"."{{table}}"
    WHERE "{{tsCol}}" >= '{{from}}'
      AND "{{tsCol}}" <= '{{to}}'
    {{filterClause}}
    ORDER BY "{{tsCol}}" DESC
    LIMIT {{limit}}
  `,

  'scatter-chart': `
    SELECT
      "{{xCol}}" AS x_val,
      "{{yCol}}" AS y_val{{scatterGroupCol}}
    FROM "{{schema}}"."{{table}}"
    WHERE "{{tsCol}}" >= '{{from}}'
      AND "{{tsCol}}" <= '{{to}}'
    {{filterClause}}
    ORDER BY "{{xCol}}" ASC
    LIMIT {{limit}}
  `,

  'funnel-chart': `
    SELECT
      "{{groupCol}}" AS category,
      {{aggregation}}("{{metricCol}}") AS value
    FROM "{{schema}}"."{{table}}"
    WHERE "{{tsCol}}" >= '{{from}}'
      AND "{{tsCol}}" <= '{{to}}'
    {{filterClause}}
    GROUP BY "{{groupCol}}"
    ORDER BY value DESC
    LIMIT {{limit}}
  `,

  'treemap': `
    SELECT
      "{{groupCol}}" AS category,
      {{aggregation}}("{{metricCol}}") AS value
    FROM "{{schema}}"."{{table}}"
    WHERE "{{tsCol}}" >= '{{from}}'
      AND "{{tsCol}}" <= '{{to}}'
    {{filterClause}}
    GROUP BY "{{groupCol}}"
    ORDER BY value DESC
    LIMIT {{limit}}
  `,

  'candlestick': `
    SELECT
      DATE_TRUNC('{{interval}}', "{{tsCol}}") AS date,
      MIN("{{openCol}}")  AS open,
      MAX("{{highCol}}")  AS high,
      MIN("{{lowCol}}")   AS low,
      MAX("{{closeCol}}") AS close
    FROM "{{schema}}"."{{table}}"
    WHERE "{{tsCol}}" >= '{{from}}'
      AND "{{tsCol}}" <= '{{to}}'
    {{filterClause}}
    GROUP BY date
    ORDER BY date ASC
    LIMIT {{limit}}
  `,

  'progress-kpi': `
    SELECT
      "{{groupCol}}" AS label,
      {{aggregation}}("{{metricCol}}") AS value,
      {{kpiTargetExpr}}                AS target
    FROM "{{schema}}"."{{table}}"
    WHERE "{{tsCol}}" >= '{{from}}'
      AND "{{tsCol}}" <= '{{to}}'
    {{filterClause}}
    GROUP BY "{{groupCol}}"
    ORDER BY value DESC
    LIMIT {{limit}}
  `,
};

// ── Hierarchical treemap SQL (used when parentCol is set) ─────────────────────

const TREEMAP_HIERARCHICAL_SQL = `
  SELECT
    "{{parentCol}}" AS parent_cat,
    "{{groupCol}}"  AS child_cat,
    {{aggregation}}("{{metricCol}}") AS value
  FROM "{{schema}}"."{{table}}"
  WHERE "{{tsCol}}" >= '{{from}}'
    AND "{{tsCol}}" <= '{{to}}'
  {{filterClause}}
  GROUP BY "{{parentCol}}", "{{groupCol}}"
  ORDER BY parent_cat, value DESC
  LIMIT {{limit}}
`;

// ── Effective limit computation ────────────────────────────────────────────────

// Widget types that use DATE_TRUNC bucketing — limit must cover all buckets in the range
const TIME_BUCKET_TYPES = new Set<WidgetType>(['line-chart', 'area-chart', 'heatmap', 'candlestick']);

/**
 * Returns the SQL LIMIT to use for a given widget execution.
 *
 * For time-bucketed widgets (line/area/heatmap/candlestick) where the user has
 * NOT explicitly set ds.limit, we auto-compute the expected bucket count from
 * the interval × time range and add a small safety buffer of +5.
 * This prevents silent data truncation when, e.g., a 1h range at minute
 * granularity needs 60 rows but the hardcoded default of 50 would drop 10.
 *
 * For aggregation widgets (pie, bar, stat-card, etc.) the default stays at 50.
 */
function computeEffectiveLimit(
  widgetType: WidgetType,
  ds:         DataSourceConfig,
  interval:   string,
  timeRange:  TimeRange,
): number {
  if (ds.limit != null) return ds.limit;
  if (!TIME_BUCKET_TYPES.has(widgetType)) return 50;
  const diffMinutes = (timeRange.to.getTime() - timeRange.from.getTime()) / 60_000;
  const buckets =
    interval === 'minute' ? Math.ceil(diffMinutes) :
    interval === 'hour'   ? Math.ceil(diffMinutes / 60) :
    interval === 'day'    ? Math.ceil(diffMinutes / (60 * 24)) :
    interval === 'week'   ? Math.ceil(diffMinutes / (60 * 24 * 7)) :
                            Math.ceil(diffMinutes / (60 * 24 * 30));
  return Math.max(buckets + 5, 50);  // never go below 50 even for tiny ranges
}

// ── Template variable substitution ────────────────────────────────────────────

function buildSQL(
  widgetType: WidgetType,
  ds: DataSourceConfig,
  timeRange: TimeRange,
  activeFilter: ActiveFilter | null,
): string {
  const from = toSQLTimestamp(timeRange.from);
  const to   = toSQLTimestamp(timeRange.to);

  // Power user raw SQL mode — inject ALL supported template variables
  if (ds.customSql) {
    const interval       = getAutoInterval(timeRange.from, timeRange.to);
    const effectiveLimit = computeEffectiveLimit(widgetType, ds, interval, timeRange);

    // Build filter clause for customSql as well
    let customFilterClause = '';
    if (activeFilter) {
      const safeCol = activeFilter.column.replace(/"/g, '""');
      const val =
        typeof activeFilter.value === 'string'
          ? `'${activeFilter.value.replace(/'/g, "''")}'`
          : String(activeFilter.value);
      customFilterClause = `AND "${safeCol}" = ${val}`;
    }
    if (ds.whereClause?.trim()) {
      customFilterClause += ` AND (${ds.whereClause.trim()})`;
    }

    const kpiTargetExpr = ds.kpiTarget != null
      ? String(ds.kpiTarget)
      : `MAX("${ds.metricCol}")`;

    return ds.customSql
      .replace(/\{\{from\}\}/g,           from)
      .replace(/\{\{to\}\}/g,             to)
      .replace(/\{\{interval\}\}/g,       interval)
      .replace(/\{\{aggregation\}\}/g,    ds.aggregation)
      .replace(/\{\{schema\}\}/g,         ds.schema)
      .replace(/\{\{table\}\}/g,          ds.table)
      .replace(/\{\{tsCol\}\}/g,          ds.timestampCol)
      .replace(/\{\{metricCol\}\}/g,      ds.metricCol)
      .replace(/\{\{groupCol\}\}/g,       ds.groupCol ?? '')
      .replace(/\{\{limit\}\}/g,          String(effectiveLimit))
      .replace(/\{\{xCol\}\}/g,           ds.xCol     || ds.metricCol)
      .replace(/\{\{yCol\}\}/g,           ds.yCol     || ds.metricCol)
      .replace(/\{\{openCol\}\}/g,        ds.openCol  || ds.metricCol)
      .replace(/\{\{highCol\}\}/g,        ds.highCol  || ds.metricCol)
      .replace(/\{\{lowCol\}\}/g,         ds.lowCol   || ds.metricCol)
      .replace(/\{\{closeCol\}\}/g,       ds.closeCol || ds.metricCol)
      .replace(/\{\{kpiTargetExpr\}\}/g,  kpiTargetExpr)
      .replace(/\{\{parentCol\}\}/g,      ds.parentCol ?? '')
      .replace(/\{\{whereClause\}\}/g,    ds.whereClause ?? '')
      .replace(/\{\{filterClause\}\}/g,   customFilterClause);
  }

  const interval       = getAutoInterval(timeRange.from, timeRange.to);
  const effectiveLimit = computeEffectiveLimit(widgetType, ds, interval, timeRange);

  // Build optional GROUP BY parts
  const hasGroup = !!ds.groupCol;
  const groupSelect = hasGroup ? `"${ds.groupCol}",\n      ` : '';
  const groupBy = hasGroup ? `, "${ds.groupCol}"` : '';

  // Build cross-widget filter clause
  let filterClause = '';
  if (activeFilter) {
    const safeCol = activeFilter.column.replace(/"/g, '""');
    const val =
      typeof activeFilter.value === 'string'
        ? `'${activeFilter.value.replace(/'/g, "''")}'`
        : String(activeFilter.value);
    filterClause = `AND "${safeCol}" = ${val}`;
  }

  // Append user-defined WHERE clause if set
  if (ds.whereClause?.trim()) {
    filterClause += ` AND (${ds.whereClause.trim()})`;
  }

  // For treemap with parentCol, use hierarchical SQL
  let template = SQL_TEMPLATES[widgetType];
  if (widgetType === 'treemap' && ds.parentCol) {
    template = TREEMAP_HIERARCHICAL_SQL;
  }

  // KPI target expression: use fixed value if provided, else MAX from DB
  const kpiTargetExpr = ds.kpiTarget != null
    ? String(ds.kpiTarget)
    : `MAX("${ds.metricCol}")`;

  // Scatter chart column fallbacks
  const xCol = ds.xCol || ds.metricCol;
  const yCol = ds.yCol || ds.metricCol;
  // Scatter group col: appended to SELECT with leading comma (avoids trailing-comma SQL bug)
  const scatterGroupCol = hasGroup && widgetType === 'scatter-chart' ? `,\n      "${ds.groupCol}"` : '';

  // Candlestick OHLC column fallbacks
  const openCol  = ds.openCol  || ds.metricCol;
  const highCol  = ds.highCol  || ds.metricCol;
  const lowCol   = ds.lowCol   || ds.metricCol;
  const closeCol = ds.closeCol || ds.metricCol;

  // Special-case COUNT_DISTINCT aggregation
  const aggSql = ds.aggregation === 'COUNT_DISTINCT'
    ? `COUNT(DISTINCT`
    : ds.aggregation;

  // For COUNT_DISTINCT we need to close the extra paren: COUNT(DISTINCT("col"))
  // We handle this by substituting aggregation first, then fixing the closing paren
  let sql = template
    .replace(/\{\{aggregation\}\}/g, aggSql)
    .replace(/\{\{metricCol\}\}/g, ds.metricCol)
    .replace(/\{\{groupCol\}\}/g, ds.groupCol ?? '')
    .replace(/\{\{tsCol\}\}/g, ds.timestampCol)
    .replace(/\{\{schema\}\}/g, ds.schema)
    .replace(/\{\{table\}\}/g, ds.table)
    .replace(/\{\{from\}\}/g, from)
    .replace(/\{\{to\}\}/g, to)
    .replace(/\{\{interval\}\}/g, interval)
    .replace(/\{\{groupSelect\}\}/g, groupSelect)
    .replace(/\{\{groupBy\}\}/g, groupBy)
    .replace(/\{\{filterClause\}\}/g, filterClause)
    .replace(/\{\{limit\}\}/g, String(effectiveLimit))
    .replace(/\{\{kpiTargetExpr\}\}/g, kpiTargetExpr)
    .replace(/\{\{xCol\}\}/g, xCol)
    .replace(/\{\{yCol\}\}/g, yCol)
    .replace(/\{\{openCol\}\}/g, openCol)
    .replace(/\{\{highCol\}\}/g, highCol)
    .replace(/\{\{lowCol\}\}/g, lowCol)
    .replace(/\{\{closeCol\}\}/g, closeCol)
    .replace(/\{\{parentCol\}\}/g, ds.parentCol ?? '')
    .replace(/\{\{scatterGroupCol\}\}/g, scatterGroupCol);

  // Fix COUNT(DISTINCT("col")) → add closing paren after col substitution
  if (ds.aggregation === 'COUNT_DISTINCT') {
    // COUNT(DISTINCT("metricCol") AS ... → COUNT(DISTINCT("metricCol")) AS ...
    sql = sql.replace(/COUNT\(DISTINCT\("([^"]+)"\)\s+AS/g, 'COUNT(DISTINCT("$1")) AS');
  }

  return sql.replace(/\n\s+\n/g, '\n').trim();
}

// ── Response → chart-ready data ───────────────────────────────────────────────

export interface CandleDataPoint {
  date: string;
  open: number;
  close: number;
  low: number;
  high: number;
}

export interface ProgressKPIItem {
  label: string;
  value: number;
  target: number;
  unit?: string;
}

export interface ExecutorResult {
  raw: Record<string, unknown>[];
  columns: string[];
  // Transformed for specific chart types
  series?: ChartSeries[];       // line/area/bar/scatter (legacy time-based)
  pieSlices?: PieSlice[];       // pie/funnel/treemap (flat)
  statValue?: number | null;
  gaugeValue?: GaugeData;
  tableRows?: Record<string, unknown>[];
  candleData?: CandleDataPoint[];
  progressItems?: ProgressKPIItem[];
  scatterPoints?: [number, number, string?][];  // scatter: [x, y, label?]
  treemapNodes?: TreemapNode[];                 // treemap: hierarchical when parentCol set
}

export interface TreemapNode {
  name: string;
  value: number;
  children?: TreemapNode[];
}

export interface ChartSeries {
  name: string;
  data: [string, number][]; // [timestamp/category, value]
}

export interface PieSlice {
  name: string;
  value: number;
}

export interface GaugeData {
  current: number;
  min: number;
  max: number;
}

function rowsToObjects(cols: string[], rows: unknown[][]): Record<string, unknown>[] {
  return rows.map((row) => {
    const obj: Record<string, unknown> = {};
    cols.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  });
}

function transformResult(
  widgetType: WidgetType,
  cols: string[],
  rows: unknown[][],
  ds: DataSourceConfig,
): ExecutorResult {
  const raw = rowsToObjects(cols, rows);

  switch (widgetType) {
    case 'stat-card': {
      return {
        raw,
        columns: cols,
        statValue: raw[0]?.value != null ? Number(raw[0].value) : null,
      };
    }

    case 'line-chart':
    case 'area-chart': {
      if (!ds.groupCol) {
        // Single series
        const data: [string, number][] = raw.map((r) => [
          String(r.time ?? r[cols[0]]),
          Number(r.value ?? r[cols[cols.length - 1]]),
        ]);
        return { raw, columns: cols, series: [{ name: ds.metricCol, data }] };
      }
      // Multi-series: group by ds.groupCol
      const grouped: Record<string, [string, number][]> = {};
      raw.forEach((r) => {
        const key = String(r[ds.groupCol!] ?? 'Unknown');
        const t = String(r.time ?? r[cols[0]]);
        const v = Number(r.value ?? r[cols[cols.length - 1]]);
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push([t, v]);
      });
      const series: ChartSeries[] = Object.entries(grouped).map(([name, data]) => ({ name, data }));
      return { raw, columns: cols, series };
    }

    case 'bar-chart': {
      const series: ChartSeries[] = [{
        name: ds.metricCol,
        data: raw.map((r) => [String(r.category ?? r[cols[0]]), Number(r.value ?? r[cols[1]])]),
      }];
      return { raw, columns: cols, series };
    }

    case 'pie-chart': {
      const pieSlices: PieSlice[] = raw.map((r) => ({
        name: String(r.category ?? r[cols[0]]),
        value: Number(r.value ?? r[cols[1]]),
      }));
      return { raw, columns: cols, pieSlices };
    }

    case 'gauge': {
      const gaugeValue: GaugeData = {
        current: Number(raw[0]?.current_value ?? 0),
        min: Number(raw[0]?.range_min ?? 0),
        max: Number(raw[0]?.range_max ?? 100),
      };
      return { raw, columns: cols, gaugeValue };
    }

    case 'heatmap': {
      const series: ChartSeries[] = [{
        name: ds.metricCol,
        data: raw.map((r) => [String(r.bucket ?? r[cols[0]]), Number(r.value ?? r[cols[cols.length - 1]])]),
      }];
      return { raw, columns: cols, series };
    }

    case 'data-table': {
      return { raw, columns: cols, tableRows: raw };
    }

    case 'scatter-chart': {
      const scatterPoints: [number, number, string?][] = raw.map((r) => [
        Number(r.x_val ?? r[cols[0]]),
        Number(r.y_val ?? r[cols[1]]),
        ds.groupCol ? String(r[ds.groupCol] ?? '') : undefined,
      ]);
      return { raw, columns: cols, scatterPoints };
    }

    case 'funnel-chart': {
      const sorted = raw
        .map((r) => ({
          name: String(r.category ?? r[cols[0]]),
          value: Number(r.value ?? r[cols[1]]),
        }))
        .sort((a, b) => b.value - a.value);
      const topValue = sorted[0]?.value || 1;
      const pieSlices: PieSlice[] = sorted.map((s) => ({
        name: s.name,
        value: Math.round((s.value / topValue) * 100),
      }));
      return { raw, columns: cols, pieSlices };
    }

    case 'treemap': {
      // When parentCol is set, build 2-level hierarchy
      if (ds.parentCol) {
        const parentMap: Record<string, { name: string; value: number; children: TreemapNode[] }> = {};
        raw.forEach((r) => {
          const parent = String(r.parent_cat ?? r[cols[0]]);
          const child  = String(r.child_cat  ?? r[cols[1]]);
          const value  = Number(r.value       ?? r[cols[2]]);
          if (!parentMap[parent]) parentMap[parent] = { name: parent, value: 0, children: [] };
          parentMap[parent].children.push({ name: child, value });
          parentMap[parent].value += value;
        });
        const treemapNodes: TreemapNode[] = Object.values(parentMap);
        return { raw, columns: cols, treemapNodes };
      }
      // Flat treemap (default)
      const pieSlices: PieSlice[] = raw.map((r) => ({
        name: String(r.category ?? r[cols[0]]),
        value: Number(r.value ?? r[cols[1]]),
      }));
      return { raw, columns: cols, pieSlices };
    }

    case 'candlestick': {
      const candleData: CandleDataPoint[] = raw.map((r) => ({
        date:  String(r.date  ?? r[cols[0]]),
        open:  Number(r.open  ?? r[cols[1]]),
        high:  Number(r.high  ?? r[cols[2]]),
        low:   Number(r.low   ?? r[cols[3]]),
        close: Number(r.close ?? r[cols[4]]),
      }));
      return { raw, columns: cols, candleData };
    }

    case 'progress-kpi': {
      const progressItems: ProgressKPIItem[] = raw.map((r) => {
        const value  = Number(r.value  ?? r[cols[1]]);
        const target = Number(r.target ?? r[cols[2]]);
        return {
          label:  String(r.label ?? r[cols[0]]),
          value,
          // Use DB-computed target when available; fall back to the value itself
          // so the bar always renders at 100% rather than an arbitrary multiplier.
          target: Number.isFinite(target) && target > 0 ? target : value,
        };
      });
      return { raw, columns: cols, progressItems };
    }

    default:
      return { raw, columns: cols };
  }
}

// ── Main executor ─────────────────────────────────────────────────────────────

export async function executeWidget(
  widget: WidgetConfig,
  timeRange: TimeRange,
  activeFilter: ActiveFilter | null,
  queryFn: (sql: string) => Promise<{ cols: string[]; rows: unknown[][] }>,
): Promise<ExecutorResult> {
  const sql = buildSQL(widget.type, widget.dataSource, timeRange, activeFilter);
  const result = await queryFn(sql);
  return transformResult(widget.type, result.cols, result.rows, widget.dataSource);
}

// Export SQL builder for the SQL preview panel
export { buildSQL };
