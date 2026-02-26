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
    LIMIT 2000
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
    LIMIT 2000
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
    LIMIT 20
  `,

  'pie-chart': `
    SELECT
      "{{groupCol}}" AS category,
      COUNT(*) AS value
    FROM "{{schema}}"."{{table}}"
    WHERE "{{tsCol}}" >= '{{from}}'
      AND "{{tsCol}}" <= '{{to}}'
    {{filterClause}}
    GROUP BY "{{groupCol}}"
    ORDER BY value DESC
    LIMIT 10
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
      DATE_TRUNC('hour', "{{tsCol}}") AS bucket,
      {{groupSelect}}
      COUNT(*) AS count
    FROM "{{schema}}"."{{table}}"
    WHERE "{{tsCol}}" >= '{{from}}'
      AND "{{tsCol}}" <= '{{to}}'
    {{filterClause}}
    GROUP BY bucket{{groupBy}}
    ORDER BY bucket ASC
    LIMIT 5000
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
      DATE_TRUNC('{{interval}}', "{{tsCol}}") AS time,
      {{groupSelect}}
      {{aggregation}}("{{metricCol}}") AS value
    FROM "{{schema}}"."{{table}}"
    WHERE "{{tsCol}}" >= '{{from}}'
      AND "{{tsCol}}" <= '{{to}}'
    {{filterClause}}
    GROUP BY time{{groupBy}}
    ORDER BY time ASC
    LIMIT 2000
  `,

  'funnel-chart': `
    SELECT
      "{{groupCol}}" AS category,
      COUNT(*) AS value
    FROM "{{schema}}"."{{table}}"
    WHERE "{{tsCol}}" >= '{{from}}'
      AND "{{tsCol}}" <= '{{to}}'
    {{filterClause}}
    GROUP BY "{{groupCol}}"
    ORDER BY value DESC
    LIMIT 10
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
    LIMIT 30
  `,

  'candlestick': `
    SELECT
      DATE_TRUNC('{{interval}}', "{{tsCol}}") AS date,
      MIN("{{metricCol}}")         AS low,
      MAX("{{metricCol}}")         AS high,
      AVG("{{metricCol}}") * 0.99  AS open,
      AVG("{{metricCol}}")         AS close
    FROM "{{schema}}"."{{table}}"
    WHERE "{{tsCol}}" >= '{{from}}'
      AND "{{tsCol}}" <= '{{to}}'
    {{filterClause}}
    GROUP BY date
    ORDER BY date ASC
    LIMIT 500
  `,

  'progress-kpi': `
    SELECT
      "{{groupCol}}" AS label,
      {{aggregation}}("{{metricCol}}") AS value,
      MAX("{{metricCol}}")             AS target
    FROM "{{schema}}"."{{table}}"
    WHERE "{{tsCol}}" >= '{{from}}'
      AND "{{tsCol}}" <= '{{to}}'
    {{filterClause}}
    GROUP BY "{{groupCol}}"
    ORDER BY value DESC
    LIMIT 8
  `,
};

// ── Template variable substitution ────────────────────────────────────────────

function buildSQL(
  widgetType: WidgetType,
  ds: DataSourceConfig,
  timeRange: TimeRange,
  activeFilter: ActiveFilter | null,
): string {
  // Power user raw SQL mode — skip template entirely
  if (ds.customSql) {
    const from = toSQLTimestamp(timeRange.from);
    const to = toSQLTimestamp(timeRange.to);
    return ds.customSql
      .replace(/\{\{from\}\}/g, from)
      .replace(/\{\{to\}\}/g, to);
  }

  const from = toSQLTimestamp(timeRange.from);
  const to = toSQLTimestamp(timeRange.to);
  const interval = getAutoInterval(timeRange.from, timeRange.to);

  // Build optional GROUP BY parts
  const hasGroup = !!ds.groupCol;
  const groupSelect = hasGroup ? `"${ds.groupCol}",\n      ` : '';
  const groupBy = hasGroup ? `, "${ds.groupCol}"` : '';

  // Build cross-widget filter clause
  let filterClause = '';
  if (activeFilter) {
    const val =
      typeof activeFilter.value === 'string'
        ? `'${activeFilter.value.replace(/'/g, "''")}'`
        : String(activeFilter.value);
    filterClause = `AND "${activeFilter.column}" = ${val}`;
  }

  let sql = SQL_TEMPLATES[widgetType];

  sql = sql
    .replace(/\{\{aggregation\}\}/g, ds.aggregation)
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
    .replace(/\{\{limit\}\}/g, String(ds.limit ?? 50));

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
  series?: ChartSeries[];       // line/area/bar/scatter
  pieSlices?: PieSlice[];       // pie/funnel/treemap
  statValue?: number | null;
  gaugeValue?: GaugeData;
  tableRows?: Record<string, unknown>[];
  candleData?: CandleDataPoint[];
  progressItems?: ProgressKPIItem[];
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
      if (!ds.groupCol) {
        const series: ChartSeries[] = [{
          name: ds.metricCol,
          data: raw.map((r) => [String(r.category ?? r[cols[0]]), Number(r.value ?? r[cols[1]])]),
        }];
        return { raw, columns: cols, series };
      }
      const series: ChartSeries[] = [{
        name: ds.aggregation,
        data: raw.map((r) => [String(r.category), Number(r.value)]),
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
        name: 'count',
        data: raw.map((r) => [String(r.bucket ?? r[cols[0]]), Number(r.count ?? r[cols[cols.length - 1]])]),
      }];
      return { raw, columns: cols, series };
    }

    case 'data-table': {
      return { raw, columns: cols, tableRows: raw };
    }

    case 'scatter-chart': {
      if (!ds.groupCol) {
        const data: [string, number][] = raw.map((r) => [
          String(r.time ?? r[cols[0]]),
          Number(r.value ?? r[cols[cols.length - 1]]),
        ]);
        return { raw, columns: cols, series: [{ name: ds.metricCol, data }] };
      }
      const grouped: Record<string, [string, number][]> = {};
      raw.forEach((r) => {
        const key = String(r[ds.groupCol!] ?? 'Unknown');
        const t = String(r.time ?? r[cols[0]]);
        const v = Number(r.value ?? r[cols[cols.length - 1]]);
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push([t, v]);
      });
      return { raw, columns: cols, series: Object.entries(grouped).map(([name, data]) => ({ name, data })) };
    }

    case 'funnel-chart':
    case 'treemap': {
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
      const progressItems: ProgressKPIItem[] = raw.map((r) => ({
        label:  String(r.label  ?? r[cols[0]]),
        value:  Number(r.value  ?? r[cols[1]]),
        target: Number(r.target ?? r[cols[2]]) || Number(r.value ?? r[cols[1]]) * 1.2,
      }));
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
