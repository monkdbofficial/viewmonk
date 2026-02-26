'use client';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  X, ChevronRight, ChevronLeft, Check, ArrowRight, Sparkles,
  AlertCircle, CheckCircle2, RefreshCw, Database, Activity,
  TrendingUp, AreaChart, BarChart2, PieChart, Gauge, Layers,
  Table2, ScatterChart, Filter, LayoutGrid, BarChart,
  Settings2, Globe, Link2, Unlink2,
} from 'lucide-react';
import { SearchableSelect } from '@/app/components/timeseries/ui/SearchableSelect';
import type { SelectOption } from '@/app/components/timeseries/ui/SearchableSelect';
import { useTimeseriesTables } from '@/app/hooks/timeseries/useTimeseriesTables';
import type {
  TemplateDefinition, DashboardConfig, WidgetConfig, DataSourceConfig,
  WidgetType, AggregationType, TimeseriesTable,
} from '@/app/lib/timeseries/types';
import { createNewDashboard } from '@/app/lib/timeseries/dashboard-store';

// ── Widget metadata ───────────────────────────────────────────────────────────

const WIDGET_META: Record<WidgetType, { icon: React.ReactNode; label: string; color: string; needsGroup?: boolean }> = {
  'stat-card':     { icon: <Activity className="h-3.5 w-3.5" />,     label: 'Stat Card',    color: '#3B82F6' },
  'line-chart':    { icon: <TrendingUp className="h-3.5 w-3.5" />,   label: 'Line Chart',   color: '#06B6D4' },
  'area-chart':    { icon: <AreaChart className="h-3.5 w-3.5" />,    label: 'Area Chart',   color: '#6366F1' },
  'bar-chart':     { icon: <BarChart2 className="h-3.5 w-3.5" />,    label: 'Bar Chart',    color: '#8B5CF6', needsGroup: true },
  'pie-chart':     { icon: <PieChart className="h-3.5 w-3.5" />,     label: 'Pie Chart',    color: '#EC4899', needsGroup: true },
  'gauge':         { icon: <Gauge className="h-3.5 w-3.5" />,        label: 'Gauge',        color: '#F59E0B' },
  'heatmap':       { icon: <Layers className="h-3.5 w-3.5" />,       label: 'Heatmap',      color: '#10B981' },
  'data-table':    { icon: <Table2 className="h-3.5 w-3.5" />,       label: 'Data Table',   color: '#6B7280' },
  'scatter-chart': { icon: <ScatterChart className="h-3.5 w-3.5" />, label: 'Scatter Plot', color: '#8B5CF6' },
  'funnel-chart':  { icon: <Filter className="h-3.5 w-3.5" />,       label: 'Funnel Chart', color: '#F97316', needsGroup: true },
  'treemap':       { icon: <LayoutGrid className="h-3.5 w-3.5" />,   label: 'Treemap',      color: '#14B8A6', needsGroup: true },
  'candlestick':   { icon: <BarChart className="h-3.5 w-3.5" />,     label: 'Candlestick',  color: '#10B981' },
  'progress-kpi':  { icon: <BarChart className="h-3.5 w-3.5" />,     label: 'Progress KPI', color: '#3B82F6', needsGroup: true },
};

const AGGREGATIONS: { value: AggregationType; label: string }[] = [
  { value: 'AVG',   label: 'AVG — Average'  },
  { value: 'SUM',   label: 'SUM — Total'    },
  { value: 'COUNT', label: 'COUNT — Rows'   },
  { value: 'MAX',   label: 'MAX — Highest'  },
  { value: 'MIN',   label: 'MIN — Lowest'   },
];

// ── Per-widget source state ───────────────────────────────────────────────────

interface WidgetSource {
  useGlobal:   boolean;
  schema:      string;
  tableKey:    string;
  tsCol:       string;
  metricCol:   string;
  aggregation: AggregationType;
  groupCol:    string;
}

function makeDefaultSource(): WidgetSource {
  return { useGlobal: true, schema: '', tableKey: '', tsCol: '', metricCol: '', aggregation: 'AVG', groupCol: '' };
}

// ── Small helpers ─────────────────────────────────────────────────────────────

const lbl = 'mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-white/30';

function ColSelect({
  label: lbl2, value, onChange, options, placeholder, disabled,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: SelectOption[]; placeholder?: string; disabled?: boolean;
}) {
  return (
    <div>
      <p className={lbl}>{lbl2}</p>
      <SearchableSelect
        options={options} value={value} onChange={onChange}
        placeholder={placeholder ?? 'Select…'} disabled={disabled}
        emptyText="No columns"
      />
    </div>
  );
}

// ── Main Modal ────────────────────────────────────────────────────────────────

interface TableMapperModalProps {
  template: TemplateDefinition;
  onClose:  () => void;
  onCreate: (config: DashboardConfig) => void;
}

export default function TableMapperModal({ template, onClose, onCreate }: TableMapperModalProps) {
  const { tables, loading, error, refresh } = useTimeseriesTables();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // ── Global data source ────────────────────────────────────────────────────
  const [dashName,   setDashName]   = useState(template.name);
  const [gSchema,    setGSchema]    = useState('');
  const [gTableKey,  setGTableKey]  = useState('');
  const [gTsCol,     setGTsCol]     = useState('');
  const [gMetric,    setGMetric]    = useState('');
  const [gAgg,       setGAgg]       = useState<AggregationType>('AVG');
  const [gGroup,     setGGroup]     = useState('');

  // ── Per-widget sources ────────────────────────────────────────────────────
  const [wSources, setWSources] = useState<Record<string, WidgetSource>>(() =>
    Object.fromEntries(template.defaultLayout.map((w) => [w.id, makeDefaultSource()])),
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ── Derived ───────────────────────────────────────────────────────────────
  const schemas        = useMemo(() => [...new Set(tables.map((t) => t.schema))].sort(), [tables]);
  const gSchemaTables  = useMemo(() => tables.filter((t) => t.schema === gSchema), [tables, gSchema]);
  const gTable         = useMemo(() => tables.find((t) => `${t.schema}.${t.table}` === gTableKey) ?? null, [tables, gTableKey]);

  const tableForWidget = useCallback((ws: WidgetSource): TimeseriesTable | null => {
    if (ws.useGlobal) return gTable;
    return tables.find((t) => `${t.schema}.${t.table}` === ws.tableKey) ?? null;
  }, [tables, gTable]);

  const schemaTablesFor = useCallback((schema: string) =>
    tables.filter((t) => t.schema === schema), [tables]);

  // ── Auto-fill globals ─────────────────────────────────────────────────────
  useEffect(() => {
    if (schemas.length > 0 && !gSchema) setGSchema(schemas[0]);
  }, [schemas, gSchema]);

  useEffect(() => {
    const tbls = tables.filter((t) => t.schema === gSchema);
    if (tbls.length > 0) setGTableKey(`${tbls[0].schema}.${tbls[0].table}`);
    else setGTableKey('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gSchema]);

  useEffect(() => {
    if (!gTable) return;
    setGTsCol(gTable.timestampCols[0] ?? '');
    setGMetric(gTable.numericCols[0]?.name ?? '');
    setGGroup(gTable.textCols[0]?.name ?? '');
  }, [gTable]);

  // ── Widget source updater ─────────────────────────────────────────────────
  const setWS = (id: string, patch: Partial<WidgetSource>) =>
    setWSources((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  // When a widget's schema changes, reset its table
  const handleWidgetSchemaChange = (id: string, schema: string) => {
    const tbls = schemaTablesFor(schema);
    const firstKey = tbls.length > 0 ? `${tbls[0].schema}.${tbls[0].table}` : '';
    const firstTable = tbls[0] ?? null;
    setWS(id, {
      schema,
      tableKey:    firstKey,
      tsCol:       firstTable?.timestampCols[0] ?? '',
      metricCol:   firstTable?.numericCols[0]?.name ?? '',
      groupCol:    firstTable?.textCols[0]?.name ?? '',
    });
  };

  // When a widget's table changes, reset its cols
  const handleWidgetTableChange = (id: string, key: string) => {
    const t = tables.find((t2) => `${t2.schema}.${t2.table}` === key);
    setWS(id, {
      tableKey:  key,
      tsCol:     t?.timestampCols[0] ?? '',
      metricCol: t?.numericCols[0]?.name ?? '',
      groupCol:  t?.textCols[0]?.name ?? '',
    });
  };

  const enableOverride = (id: string) => {
    setWS(id, {
      useGlobal:   false,
      schema:      gSchema,
      tableKey:    gTableKey,
      tsCol:       gTsCol,
      metricCol:   gMetric,
      aggregation: gAgg,
      groupCol:    gGroup,
    });
    setExpandedId(id);
  };

  const resetToGlobal = (id: string) => {
    setWS(id, makeDefaultSource());
    setExpandedId(null);
  };

  const applyGlobalToAll = () => {
    setWSources((prev) =>
      Object.fromEntries(Object.keys(prev).map((id) => [id, makeDefaultSource()])),
    );
    setExpandedId(null);
  };

  // ── Validation ────────────────────────────────────────────────────────────
  const step1Valid = !!(dashName.trim() && gTableKey && gTsCol && gMetric);

  const widgetValid = (id: string, type: WidgetType): boolean => {
    if (type === 'data-table') return true;
    const ws = wSources[id];
    if (ws.useGlobal) return !!(gTsCol && gMetric);
    return !!(ws.tsCol && ws.metricCol);
  };
  const step2Valid = template.defaultLayout.every((w) => widgetValid(w.id, w.type));

  // ── Build & create ────────────────────────────────────────────────────────
  const resolveSource = (id: string, type: WidgetType): DataSourceConfig | null => {
    const ws = wSources[id];
    const t  = tableForWidget(ws);
    if (!t && type !== 'data-table') return null;
    const schema      = ws.useGlobal ? (gTable?.schema ?? gSchema) : ws.schema;
    const tableName   = ws.useGlobal ? (gTable?.table ?? '')        : (tables.find((x) => `${x.schema}.${x.table}` === ws.tableKey)?.table ?? '');
    const tsCol       = ws.useGlobal ? gTsCol  : ws.tsCol;
    const metricCol   = ws.useGlobal ? gMetric : ws.metricCol;
    const aggregation = ws.useGlobal ? gAgg    : ws.aggregation;
    const groupCol    = ws.useGlobal ? gGroup  : ws.groupCol;
    return { schema, table: tableName, timestampCol: tsCol, metricCol, groupCol: groupCol || undefined, aggregation, limit: 50 };
  };

  const handleCreate = () => {
    if (!step1Valid || !step2Valid) return;
    const dash = createNewDashboard(dashName.trim(), template.themeId);
    dash.templateId = template.id;
    const widgets: WidgetConfig[] = template.defaultLayout.map((layout) => {
      const ds = resolveSource(layout.id, layout.type);
      return { ...layout, dataSource: ds ?? { schema: gSchema, table: gTable?.table ?? '', timestampCol: gTsCol, metricCol: gMetric, aggregation: gAgg, limit: 50 } } as WidgetConfig;
    });
    onCreate({ ...dash, widgets });
  };

  // ── Shared option builders ────────────────────────────────────────────────
  const schemaOpts = schemas.map((s) => ({ value: s, label: s, sub: `${schemaTablesFor(s).length} tables` }));

  const tableOptsFor = (schema: string) =>
    schemaTablesFor(schema).map((t) => ({
      value: `${t.schema}.${t.table}`,
      label: t.table,
      sub: `${t.numericCols.length}N · ${t.textCols.length}T`,
    }));

  const tsOptsFor    = (t: TimeseriesTable | null) => (t?.timestampCols ?? []).map((c) => ({ value: c, label: c }));
  const metricOptsFor = (t: TimeseriesTable | null) => (t?.numericCols ?? []).map((c) => ({ value: c.name, label: c.name, sub: c.type }));
  const groupOptsFor = (t: TimeseriesTable | null) => [
    { value: '', label: 'None — single series' },
    ...(t?.textCols ?? []).map((c) => ({ value: c.name, label: c.name, sub: c.type })),
  ];
  const aggOpts = AGGREGATIONS.map((a) => ({ value: a.value, label: a.label }));

  const overrideCount = Object.values(wSources).filter((ws) => !ws.useGlobal).length;

  const STEP_LABELS = ['Global Data Source', 'Widget Binding', 'Review & Create'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        className="flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-white/[0.10] dark:bg-[#0d1526]"
        style={{ maxHeight: '92vh' }}
      >

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex flex-shrink-0 items-center gap-4 border-b border-gray-100 px-7 py-4 dark:border-white/[0.08]">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 shadow-md">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">
              Connect &ldquo;{template.name}&rdquo; to MonkDB
            </h2>
            <p className="mt-0.5 text-xs text-gray-400 dark:text-white/35">
              {template.widgetCount} widgets · Map your schemas, tables & columns
            </p>
          </div>

          {/* Steps */}
          <div className="hidden items-center gap-2 lg:flex">
            {STEP_LABELS.map((lbl3, i) => {
              const s = (i + 1) as 1 | 2 | 3;
              const done = step > s; const cur = step === s;
              return (
                <div key={s} className="flex items-center gap-2">
                  <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold transition-all ${
                    cur  ? 'bg-blue-600 text-white shadow-sm'
                    : done ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    :        'bg-gray-100 text-gray-400 dark:bg-white/[0.06] dark:text-white/25'
                  }`}>
                    <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${
                      cur ? 'bg-white/25' : done ? 'bg-emerald-500 text-white' : 'bg-white/0'
                    }`}>
                      {done ? <Check className="h-2.5 w-2.5" /> : s}
                    </span>
                    {lbl3}
                  </div>
                  {s < 3 && <ChevronRight className="h-3.5 w-3.5 text-gray-300 dark:text-white/15" />}
                </div>
              );
            })}
          </div>

          <button
            onClick={onClose}
            className="ml-2 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/[0.07] dark:hover:text-white/70"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Scrollable body ─────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">

          {/* ════════ STEP 1: Global data source ════════ */}
          {step === 1 && (
            <div className="space-y-6 px-7 py-6">

              {/* Dashboard name */}
              <div>
                <p className={lbl}>Dashboard Name</p>
                <input
                  autoFocus type="text" value={dashName}
                  onChange={(e) => setDashName(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:border-white/[0.10] dark:bg-white/[0.04] dark:text-white"
                  placeholder="e.g. Business Admin Dashboard"
                />
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-gray-100 dark:bg-white/[0.05]" />)}
                </div>
              ) : error ? (
                <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span className="flex-1">{error}</span>
                  <button onClick={refresh} className="flex items-center gap-1 font-semibold hover:underline">
                    <RefreshCw className="h-3.5 w-3.5" /> Retry
                  </button>
                </div>
              ) : tables.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-gray-200 py-12 text-center dark:border-white/[0.08]">
                  <Database className="h-10 w-10 text-gray-300 dark:text-white/15" />
                  <p className="text-sm font-medium text-gray-500 dark:text-white/40">No timeseries tables found</p>
                  <p className="max-w-xs text-xs text-gray-400 dark:text-white/25">Create a table with a TIMESTAMP column in MonkDB first.</p>
                  <button onClick={refresh} className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400">
                    <RefreshCw className="h-3.5 w-3.5" /> Refresh tables
                  </button>
                </div>
              ) : (
                <>
                  {/* Two-column: Schema + Table */}
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <p className={lbl}>
                        <span className="flex items-center gap-1.5">
                          <Database className="h-3 w-3" /> Schema
                        </span>
                      </p>
                      <SearchableSelect
                        options={schemaOpts}
                        value={gSchema}
                        onChange={setGSchema}
                        placeholder="Select schema…"
                        emptyText="No schemas found"
                      />
                      {gSchema && (
                        <p className="mt-1.5 text-[11px] text-gray-400 dark:text-white/25">
                          {gSchemaTables.length} table{gSchemaTables.length !== 1 ? 's' : ''} available
                        </p>
                      )}
                    </div>

                    <div>
                      <p className={lbl}>
                        <span className="flex items-center gap-1.5">
                          <Table2 className="h-3 w-3" /> Table
                        </span>
                      </p>
                      <SearchableSelect
                        options={tableOptsFor(gSchema)}
                        value={gTableKey}
                        onChange={(key) => {
                          setGTableKey(key);
                        }}
                        placeholder="Select table…"
                        disabled={!gSchema}
                        emptyText="No tables in this schema"
                      />
                      {gTable && (
                        <div className="mt-1.5 flex items-center gap-2 text-[11px] text-gray-400 dark:text-white/25">
                          <span className="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-white/[0.06]">{gTable.timestampCols.length} timestamp</span>
                          <span className="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-white/[0.06]">{gTable.numericCols.length} numeric</span>
                          <span className="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-white/[0.06]">{gTable.textCols.length} text</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Column config — revealed once table picked */}
                  {gTable && (
                    <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-5 dark:border-blue-500/15 dark:bg-blue-500/[0.05]">
                      <div className="mb-4 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-blue-500" />
                        <span className="text-xs font-bold text-blue-700 dark:text-blue-400">
                          Global column mapping — applied to all widgets by default
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                        <ColSelect
                          label="Timestamp *"
                          value={gTsCol}
                          onChange={setGTsCol}
                          options={tsOptsFor(gTable)}
                          placeholder="Pick timestamp…"
                        />
                        <ColSelect
                          label="Metric Column *"
                          value={gMetric}
                          onChange={setGMetric}
                          options={metricOptsFor(gTable)}
                          placeholder="Pick metric…"
                        />
                        <div>
                          <p className={lbl}>Aggregation *</p>
                          <SearchableSelect
                            options={aggOpts} value={gAgg}
                            onChange={(v) => setGAgg(v as AggregationType)}
                          />
                        </div>
                        <ColSelect
                          label="Group By"
                          value={gGroup}
                          onChange={setGGroup}
                          options={groupOptsFor(gTable)}
                          placeholder="None"
                        />
                      </div>

                      <p className="mt-3 text-[11px] text-blue-600/70 dark:text-blue-400/50">
                        * Required. You can override these per widget in Step 2.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ════════ STEP 2: Per-widget binding ════════ */}
          {step === 2 && (
            <div className="px-7 py-6">

              {/* Toolbar */}
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Widget Data Binding</h3>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-white/40">
                    Each widget uses the global source by default. Click <strong>Override</strong> to assign a different table or columns.
                  </p>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  {overrideCount > 0 && (
                    <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-500/15 dark:text-violet-400">
                      {overrideCount} overridden
                    </span>
                  )}
                  <button
                    onClick={applyGlobalToAll}
                    className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-gray-300 dark:border-white/[0.10] dark:bg-white/[0.03] dark:text-white/50 dark:hover:border-white/[0.20]"
                  >
                    <Globe className="h-3 w-3" />
                    Reset all to global
                  </button>
                </div>
              </div>

              {/* Global summary pill */}
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 dark:border-white/[0.07] dark:bg-white/[0.03]">
                <Globe className="h-3.5 w-3.5 flex-shrink-0 text-blue-500" />
                <span className="text-xs font-semibold text-gray-700 dark:text-white/60">Global:</span>
                <span className="text-xs text-gray-500 dark:text-white/40">
                  {gSchema}.<strong className="text-gray-700 dark:text-white/70">{gTable?.table}</strong>
                  {' · '}{gTsCol}{' · '}{gAgg}(<span className="font-medium text-gray-700 dark:text-white/60">{gMetric}</span>)
                  {gGroup && <> · grouped by <span className="font-medium text-gray-700 dark:text-white/60">{gGroup}</span></>}
                </span>
              </div>

              {/* Widget list */}
              <div className="space-y-2.5">
                {template.defaultLayout.map((w) => {
                  const meta    = WIDGET_META[w.type];
                  const ws      = wSources[w.id];
                  const isTable = w.type === 'data-table';
                  const isExpanded = expandedId === w.id && !ws.useGlobal;
                  const wTable  = tableForWidget(ws);
                  const valid   = widgetValid(w.id, w.type);

                  return (
                    <div
                      key={w.id}
                      className={`overflow-hidden rounded-xl border transition-all ${
                        !ws.useGlobal
                          ? 'border-violet-200 bg-violet-50/40 dark:border-violet-500/20 dark:bg-violet-500/[0.04]'
                          : 'border-gray-200 bg-white dark:border-white/[0.08] dark:bg-white/[0.02]'
                      }`}
                    >
                      {/* Row header */}
                      <div className="flex items-center gap-3 px-4 py-3">
                        <span
                          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
                          style={{ backgroundColor: meta.color + '18', color: meta.color }}
                        >
                          {meta.icon}
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-800 dark:text-white/90">{w.title}</span>
                            <span
                              className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                              style={{ backgroundColor: meta.color + '15', color: meta.color }}
                            >
                              {meta.label}
                            </span>
                            {!valid && (
                              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600 dark:bg-red-500/15 dark:text-red-400">
                                Incomplete
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-[11px] text-gray-400 dark:text-white/25">
                            {ws.useGlobal
                              ? isTable
                                ? `All columns · sorted by ${gTsCol}`
                                : `${gSchema}.${gTable?.table} · ${gAgg}(${gMetric})${gGroup ? ` · grouped by ${gGroup}` : ''}`
                              : isTable
                              ? `${ws.schema}.${tables.find((t) => `${t.schema}.${t.table}` === ws.tableKey)?.table ?? ''} · all cols`
                              : `${ws.schema}.${tables.find((t) => `${t.schema}.${t.table}` === ws.tableKey)?.table ?? ''} · ${ws.aggregation}(${ws.metricCol})${ws.groupCol ? ` · grouped by ${ws.groupCol}` : ''}`
                            }
                          </p>
                        </div>

                        {/* Action buttons */}
                        {isTable ? (
                          <span className="text-xs text-gray-300 dark:text-white/20">Auto-configured</span>
                        ) : ws.useGlobal ? (
                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                              <Globe className="h-3 w-3" /> Global
                            </span>
                            <button
                              onClick={() => enableOverride(w.id)}
                              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 dark:border-white/[0.10] dark:bg-white/[0.03] dark:text-white/50 dark:hover:border-violet-500/30 dark:hover:bg-violet-500/10 dark:hover:text-violet-400"
                            >
                              <Settings2 className="h-3 w-3" /> Override
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-semibold text-violet-700 dark:bg-violet-500/15 dark:text-violet-400">
                              <Link2 className="h-3 w-3" /> Custom
                            </span>
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : w.id)}
                              className="flex items-center gap-1.5 rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs font-medium text-violet-700 transition-colors hover:bg-violet-50 dark:border-violet-500/20 dark:bg-white/[0.03] dark:text-violet-400"
                            >
                              <Settings2 className="h-3 w-3" />
                              {isExpanded ? 'Collapse' : 'Edit'}
                            </button>
                            <button
                              onClick={() => resetToGlobal(w.id)}
                              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/[0.05] dark:hover:text-white/50"
                              title="Reset to global"
                            >
                              <Unlink2 className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Expanded per-widget config */}
                      {isExpanded && !ws.useGlobal && (
                        <div className="border-t border-violet-100 bg-white px-4 py-4 dark:border-violet-500/10 dark:bg-[#0d1526]">
                          {/* Row 1: Schema + Table */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className={lbl}><span className="flex items-center gap-1"><Database className="h-3 w-3" /> Schema</span></p>
                              <SearchableSelect
                                options={schemaOpts}
                                value={ws.schema}
                                onChange={(s) => handleWidgetSchemaChange(w.id, s)}
                                placeholder="Select schema…"
                              />
                            </div>
                            <div>
                              <p className={lbl}><span className="flex items-center gap-1"><Table2 className="h-3 w-3" /> Table</span></p>
                              <SearchableSelect
                                options={tableOptsFor(ws.schema)}
                                value={ws.tableKey}
                                onChange={(key) => handleWidgetTableChange(w.id, key)}
                                placeholder="Select table…"
                                disabled={!ws.schema}
                              />
                            </div>
                          </div>

                          {/* Row 2: Columns */}
                          {wTable && (
                            <div className="mt-3 grid grid-cols-4 gap-3">
                              <ColSelect
                                label="Timestamp *"
                                value={ws.tsCol}
                                onChange={(v) => setWS(w.id, { tsCol: v })}
                                options={tsOptsFor(wTable)}
                              />
                              <ColSelect
                                label="Metric Column *"
                                value={ws.metricCol}
                                onChange={(v) => setWS(w.id, { metricCol: v })}
                                options={metricOptsFor(wTable)}
                              />
                              <div>
                                <p className={lbl}>Aggregation</p>
                                <SearchableSelect
                                  options={aggOpts}
                                  value={ws.aggregation}
                                  onChange={(v) => setWS(w.id, { aggregation: v as AggregationType })}
                                />
                              </div>
                              <ColSelect
                                label={`Group By${meta.needsGroup ? ' ★' : ''}`}
                                value={ws.groupCol}
                                onChange={(v) => setWS(w.id, { groupCol: v })}
                                options={groupOptsFor(wTable)}
                              />
                            </div>
                          )}

                          {/* Column stats */}
                          {wTable && (
                            <div className="mt-3 flex items-center gap-3 text-[11px] text-gray-400 dark:text-white/25">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                              {wTable.timestampCols.length} timestamp · {wTable.numericCols.length} numeric · {wTable.textCols.length} text columns
                              {meta.needsGroup && !ws.groupCol && (
                                <span className="ml-1 text-amber-500 dark:text-amber-400">
                                  ★ Group By recommended for {meta.label}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ════════ STEP 3: Review ════════ */}
          {step === 3 && (
            <div className="px-7 py-6">
              <h3 className="mb-1 text-sm font-bold text-gray-900 dark:text-white">Review & Create</h3>
              <p className="mb-5 text-xs text-gray-400 dark:text-white/35">Confirm all widget bindings before creating your dashboard.</p>

              {/* Summary banner */}
              <div className="mb-5 grid grid-cols-3 gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-white/[0.08] dark:bg-white/[0.03]">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-white/25">Dashboard</p>
                  <p className="mt-1 text-sm font-bold text-gray-900 dark:text-white">{dashName}</p>
                  <p className="text-xs text-gray-400 dark:text-white/35">from &ldquo;{template.name}&rdquo;</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-white/25">Global Source</p>
                  <p className="mt-1 text-sm font-bold text-gray-900 dark:text-white">{gSchema}.{gTable?.table}</p>
                  <p className="text-xs text-gray-400 dark:text-white/35">ts: {gTsCol}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-white/25">Widgets</p>
                  <p className="mt-1 text-sm font-bold text-gray-900 dark:text-white">{template.widgetCount} total</p>
                  <p className="text-xs text-gray-400 dark:text-white/35">
                    {overrideCount > 0 ? `${overrideCount} with custom source` : 'All using global source'}
                  </p>
                </div>
              </div>

              {/* Widget binding summary */}
              <div className="space-y-2">
                {template.defaultLayout.map((w) => {
                  const meta    = WIDGET_META[w.type];
                  const ws      = wSources[w.id];
                  const isTable = w.type === 'data-table';
                  const ds      = resolveSource(w.id, w.type);
                  const wTbl    = tableForWidget(ws);

                  return (
                    <div key={w.id} className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-white/[0.07] dark:bg-white/[0.02]">
                      <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: meta.color + '18', color: meta.color }}>
                        {meta.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-gray-800 dark:text-white/90">{w.title}</p>
                          <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ backgroundColor: meta.color + '15', color: meta.color }}>
                            {meta.label}
                          </span>
                          {!ws.useGlobal && (
                            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-600 dark:bg-violet-500/15 dark:text-violet-400">
                              Custom
                            </span>
                          )}
                        </div>
                        {isTable ? (
                          <p className="mt-0.5 text-[11px] text-gray-400 dark:text-white/30">
                            {ds?.schema}.{ds?.table} · all columns · sorted by {ds?.timestampCol}
                          </p>
                        ) : (
                          <p className="mt-0.5 font-mono text-[11px] text-gray-500 dark:text-white/40">
                            {ds?.schema}.{ds?.table} → {ds?.aggregation}(<span className="text-blue-600 dark:text-blue-400">{ds?.metricCol}</span>)
                            {' over '}<span className="text-gray-700 dark:text-white/60">{ds?.timestampCol}</span>
                            {ds?.groupCol && <> · GROUP BY <span className="text-emerald-600 dark:text-emerald-400">{ds.groupCol}</span></>}
                          </p>
                        )}
                      </div>
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────────── */}
        <div className="flex flex-shrink-0 items-center justify-between border-t border-gray-100 px-7 py-4 dark:border-white/[0.08]">
          <button
            onClick={step > 1 ? () => { setStep((s) => (s - 1) as 1 | 2 | 3); } : onClose}
            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 dark:text-white/35 dark:hover:bg-white/[0.06] dark:hover:text-white/60"
          >
            {step > 1 && <ChevronLeft className="h-4 w-4" />}
            {step > 1 ? 'Back' : 'Cancel'}
          </button>

          <div className="flex items-center gap-3">
            {!step2Valid && step === 2 && (
              <p className="text-xs text-red-500 dark:text-red-400">
                Some widgets need a metric column
              </p>
            )}
            {step < 3 ? (
              <button
                onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
                disabled={step === 1 ? !step1Valid : !step2Valid}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continue
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={handleCreate}
                disabled={!step1Valid || !step2Valid}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-6 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:from-blue-500 hover:to-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Sparkles className="h-4 w-4" />
                Create Dashboard
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
