/**
 * template-mock-data.ts
 *
 * Static mock data for template previews.
 * Widgets use this data instead of querying MonkDB so previews are
 * instant and work without a live database connection.
 *
 * buildTemplateDemoData(widgets) → Record<widgetId, demoPayload>
 * The shape of each payload matches what renderDemoWidget() in WidgetRenderer expects.
 */

import type { WidgetConfig } from './types';

// ── Time helpers ──────────────────────────────────────────────────────────────

/** ISO timestamp string N hours ago from a fixed reference time */
function hoursAgo(h: number): string {
  const base = new Date('2024-06-15T12:00:00Z');
  return new Date(base.getTime() - h * 3_600_000).toISOString();
}

/** Generate N evenly-spaced ISO timestamps over the last 24 h */
function timePoints(n: number): string[] {
  return Array.from({ length: n }, (_, i) => hoursAgo(24 - (24 / n) * i));
}

// ── Deterministic "seeded" noise ──────────────────────────────────────────────
// Makes each widget look distinct without using Math.random() (non-deterministic).

function seededValue(seed: number, index: number, base: number, amplitude: number): number {
  const x = Math.sin(seed * 9.301 + index * 0.9) * 43758.5453;
  const noise = (x - Math.floor(x)) * amplitude;
  return Math.round((base + noise) * 10) / 10;
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

// ── Per-widget-type mock data generators ─────────────────────────────────────

function mockStatCard(widget: WidgetConfig): Record<string, unknown> {
  const seed = hashStr(widget.id + widget.title);
  const base = 1000 + (seed % 9000);
  const pct   = ((seed % 400) / 10 - 20).toFixed(1);       // –20 … +20
  const up    = parseFloat(pct) >= 0;
  return {
    statValue: base,
    trend: `${up ? '+' : ''}${pct}%`,
    direction: up ? 'up' : 'down',
  };
}

function mockSeries(
  widget: WidgetConfig,
  seriesNames: string[],
  base = 50,
  amplitude = 40,
): Record<string, unknown> {
  const seed = hashStr(widget.id);
  const pts  = timePoints(24);
  const series = seriesNames.map((name, si) => ({
    name,
    data: pts.map((t, i) => [t, seededValue(seed + si, i, base, amplitude)] as [string, number]),
  }));
  return { series };
}

function mockPieSlices(widget: WidgetConfig, labels: string[]): Record<string, unknown> {
  const seed = hashStr(widget.id);
  const raw  = labels.map((name, i) => ({ name, value: 10 + (hashStr(name + seed + i) % 90) }));
  return { pieSlices: raw };
}

function mockGauge(widget: WidgetConfig): Record<string, unknown> {
  const seed    = hashStr(widget.id);
  const style   = widget.style as unknown as Record<string, unknown> | undefined;
  const min     = (style?.gaugeMin as number | undefined) ?? 0;
  const max     = (style?.gaugeMax as number | undefined) ?? 100;
  const current = Math.round(min + ((seed % 70) + 15) / 100 * (max - min));
  return { gaugeValue: { current, min, max } };
}

function mockDataTable(widget: WidgetConfig): Record<string, unknown> {
  const columns = ['timestamp', 'value', 'label', 'status'];
  const seed    = hashStr(widget.id);
  const tableRows = timePoints(8).map((t, i) => ({
    timestamp: t.replace('T', ' ').slice(0, 16),
    value:     seededValue(seed, i, 50, 40),
    label:     ['alpha', 'beta', 'gamma', 'delta', 'epsilon'][i % 5],
    status:    i % 5 === 3 ? 'warn' : 'ok',
  }));
  return { columns, tableRows };
}

function mockScatter(widget: WidgetConfig): Record<string, unknown> {
  const seed = hashStr(widget.id);
  const scatterPoints: [number, number, string][] = Array.from({ length: 30 }, (_, i) => [
    Math.round(seededValue(seed,      i, 50, 45) * 10) / 10,
    Math.round(seededValue(seed + 99, i, 50, 45) * 10) / 10,
    `pt-${i + 1}`,
  ]);
  return { scatterPoints };
}

function mockCandlestick(widget: WidgetConfig): Record<string, unknown> {
  const seed = hashStr(widget.id);
  let price  = 100 + (seed % 100);
  const pts  = timePoints(20);
  const candleData = pts.map((time, i) => {
    const change = seededValue(seed, i, 0, 6) - 3;
    const open   = Math.round(price * 100) / 100;
    price        = Math.max(10, price + change);
    const close  = Math.round(price * 100) / 100;
    const high   = Math.round(Math.max(open, close) * 1.01 * 100) / 100;
    const low    = Math.round(Math.min(open, close) * 0.99 * 100) / 100;
    return { time, open, high, low, close };
  });
  return { candleData };
}

function mockProgressKPI(widget: WidgetConfig): Record<string, unknown> {
  const seed  = hashStr(widget.id);
  const items = ['Revenue', 'Users', 'Retention', 'NPS'].map((label, i) => ({
    label,
    current: 40 + (hashStr(label + seed + i) % 55),
    target:  100,
  }));
  return { progressItems: items };
}

function mockTreemap(widget: WidgetConfig): Record<string, unknown> {
  const labels = ['Category A', 'Category B', 'Category C', 'Category D', 'Category E', 'Category F'];
  return mockPieSlices(widget, labels);
}

function mockHeatmap(widget: WidgetConfig): Record<string, unknown> {
  const seed  = hashStr(widget.id);
  const hours = Array.from({ length: 7 }, (_, day) => ({
    name: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][day],
    data: Array.from({ length: 24 }, (__, h) => [
      `2024-06-0${(day % 7) + 1}T${String(h).padStart(2, '0')}:00:00Z`,
      seededValue(seed + day, h, 30, 60),
    ] as [string, number]),
  }));
  return { series: hours };
}

// ── Default series labels per semantic widget title keyword ──────────────────

const SERIES_LABEL_MAP: [RegExp, string[]][] = [
  [/temperature|temp/i,         ['Zone A', 'Zone B', 'Zone C']],
  [/humidity/i,                 ['Indoor', 'Outdoor']],
  [/revenue|sales|income/i,     ['Product A', 'Product B', 'Services']],
  [/traffic|visits|session/i,   ['Organic', 'Direct', 'Referral']],
  [/cpu|memory|disk|load/i,     ['Node 1', 'Node 2', 'Node 3']],
  [/error|fail|alert/i,         ['Critical', 'Warning', 'Info']],
  [/request|api|latency/i,      ['p50', 'p95', 'p99']],
  [/price|stock|close/i,        ['Price']],
  [/power|energy|watt/i,        ['Solar', 'Grid', 'Battery']],
  [/event|click|view/i,         ['Desktop', 'Mobile', 'Tablet']],
];

function seriesLabels(widget: WidgetConfig): string[] {
  for (const [re, labels] of SERIES_LABEL_MAP) {
    if (re.test(widget.title)) return labels;
  }
  return ['Series A', 'Series B', 'Series C'];
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns mock data for a single widget based on its type.
 * The returned object shape matches what renderDemoWidget() in WidgetRenderer accepts.
 */
export function getMockDataForWidget(widget: WidgetConfig): Record<string, unknown> {
  switch (widget.type) {
    case 'stat-card':     return mockStatCard(widget);
    case 'line-chart':    return mockSeries(widget, seriesLabels(widget));
    case 'area-chart':    return mockSeries(widget, seriesLabels(widget));
    case 'bar-chart':     return mockSeries(widget, seriesLabels(widget).slice(0, 1));
    case 'heatmap':       return mockHeatmap(widget);
    case 'pie-chart':     return mockPieSlices(widget, ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon']);
    case 'funnel-chart':  return mockPieSlices(widget, ['Awareness', 'Interest', 'Decision', 'Action']);
    case 'treemap':       return mockTreemap(widget);
    case 'gauge':         return mockGauge(widget);
    case 'data-table':    return mockDataTable(widget);
    case 'scatter-chart': return mockScatter(widget);
    case 'candlestick':   return mockCandlestick(widget);
    case 'progress-kpi':  return mockProgressKPI(widget);
    default:              return {};
  }
}

/**
 * Builds the full templateDemoData map for all widgets in a dashboard.
 * Pass the result as `templateDemoData` prop to DashboardViewer.
 *
 * @example
 * const demoData = buildTemplateDemoData(template.defaultLayout);
 * <DashboardViewer config={...} demoMode templateDemoData={demoData} />
 */
export function buildTemplateDemoData(
  widgets: WidgetConfig[],
): Record<string, Record<string, unknown>> {
  return Object.fromEntries(widgets.map((w) => [w.id, getMockDataForWidget(w)]));
}
