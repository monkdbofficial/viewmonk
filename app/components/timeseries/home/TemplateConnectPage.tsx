'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ArrowLeft, Sparkles, CheckCircle2, AlertCircle, RefreshCw,
  Database, Table2, Globe, Settings2, Unlink2, ChevronDown,
  ChevronUp, Activity, TrendingUp, AreaChart, BarChart2, PieChart,
  Gauge, Layers, ScatterChart, Filter, LayoutGrid, BarChart,
} from 'lucide-react';
import { SearchableSelect } from '@/app/components/timeseries/ui/SearchableSelect';
import type { SelectOption } from '@/app/components/timeseries/ui/SearchableSelect';
import { useTimeseriesTables } from '@/app/hooks/timeseries/useTimeseriesTables';
import type {
  TemplateDefinition, DashboardConfig, WidgetConfig,
  DataSourceConfig, WidgetType, AggregationType, TimeseriesTable,
} from '@/app/lib/timeseries/types';
import { createNewDashboard } from '@/app/lib/timeseries/dashboard-store';

// ── Widget metadata ───────────────────────────────────────────────────────────

const WIDGET_META: Record<WidgetType, { icon: React.ReactNode; label: string; color: string; needsGroup?: boolean }> = {
  'stat-card':     { icon: <Activity className="h-4 w-4" />,     label: 'Stat Card',    color: '#3B82F6' },
  'line-chart':    { icon: <TrendingUp className="h-4 w-4" />,   label: 'Line Chart',   color: '#06B6D4' },
  'area-chart':    { icon: <AreaChart className="h-4 w-4" />,    label: 'Area Chart',   color: '#6366F1' },
  'bar-chart':     { icon: <BarChart2 className="h-4 w-4" />,    label: 'Bar Chart',    color: '#8B5CF6', needsGroup: true },
  'pie-chart':     { icon: <PieChart className="h-4 w-4" />,     label: 'Pie Chart',    color: '#EC4899', needsGroup: true },
  'gauge':         { icon: <Gauge className="h-4 w-4" />,        label: 'Gauge',        color: '#F59E0B' },
  'heatmap':       { icon: <Layers className="h-4 w-4" />,       label: 'Heatmap',      color: '#10B981' },
  'data-table':    { icon: <Table2 className="h-4 w-4" />,       label: 'Data Table',   color: '#6B7280' },
  'scatter-chart': { icon: <ScatterChart className="h-4 w-4" />, label: 'Scatter Plot', color: '#8B5CF6' },
  'funnel-chart':  { icon: <Filter className="h-4 w-4" />,       label: 'Funnel Chart', color: '#F97316', needsGroup: true },
  'treemap':       { icon: <LayoutGrid className="h-4 w-4" />,   label: 'Treemap',      color: '#14B8A6', needsGroup: true },
  'candlestick':   { icon: <BarChart className="h-4 w-4" />,     label: 'Candlestick',  color: '#10B981' },
  'progress-kpi':  { icon: <BarChart className="h-4 w-4" />,     label: 'Progress KPI', color: '#3B82F6', needsGroup: true },
};

const AGGREGATIONS: SelectOption[] = [
  { value: 'AVG',   label: 'AVG',   sub: 'Average'  },
  { value: 'SUM',   label: 'SUM',   sub: 'Total sum' },
  { value: 'COUNT', label: 'COUNT', sub: 'Row count' },
  { value: 'MAX',   label: 'MAX',   sub: 'Maximum'  },
  { value: 'MIN',   label: 'MIN',   sub: 'Minimum'  },
];

// ── Widget source state ───────────────────────────────────────────────────────

interface WidgetSource {
  useGlobal:   boolean;
  schema:      string;
  tableKey:    string;
  tsCol:       string;
  metricCol:   string;
  aggregation: AggregationType;
  groupCol:    string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function labelCls() {
  return 'mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-white/30';
}

function buildTableOptions(schema: string, tables: TimeseriesTable[]): SelectOption[] {
  return tables
    .filter((t) => t.schema === schema)
    .map((t) => ({
      value: `${t.schema}.${t.table}`,
      label: t.table,
      sub:   `${t.numericCols.length}N ${t.textCols.length}T`,
    }));
}

function buildTsOptions(t: TimeseriesTable | null): SelectOption[] {
  return (t?.timestampCols ?? []).map((c) => ({ value: c, label: c, sub: 'timestamp' }));
}

function buildMetricOptions(t: TimeseriesTable | null): SelectOption[] {
  return (t?.numericCols ?? []).map((c) => ({ value: c.name, label: c.name, sub: c.type }));
}

function buildGroupOptions(t: TimeseriesTable | null): SelectOption[] {
  return [
    { value: '', label: 'None', sub: 'single series' },
    ...(t?.textCols ?? []).map((c) => ({ value: c.name, label: c.name, sub: c.type })),
  ];
}

// ── Inline data source configurator ──────────────────────────────────────────

interface DataSourceFormProps {
  schema:      string; onSchemaChange:  (v: string) => void;
  tableKey:    string; onTableChange:   (v: string) => void;
  tsCol:       string; onTsColChange:   (v: string) => void;
  metricCol:   string; onMetricChange:  (v: string) => void;
  aggregation: AggregationType; onAggChange: (v: AggregationType) => void;
  groupCol:    string; onGroupChange:   (v: string) => void;
  schemas:     SelectOption[];
  tables:      TimeseriesTable[];
  activeTable: TimeseriesTable | null;
  needsGroup?: boolean;
  isDataTable?: boolean;
}

function DataSourceForm({
  schema, onSchemaChange,
  tableKey, onTableChange,
  tsCol, onTsColChange,
  metricCol, onMetricChange,
  aggregation, onAggChange,
  groupCol, onGroupChange,
  schemas, tables, activeTable,
  needsGroup, isDataTable,
}: DataSourceFormProps) {
  const tableOpts  = buildTableOptions(schema, tables);
  const tsOpts     = buildTsOptions(activeTable);
  const metricOpts = buildMetricOptions(activeTable);
  const groupOpts  = buildGroupOptions(activeTable);

  return (
    <div className="space-y-3">
      {/* Row 1: Schema + Table */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className={labelCls()}>
            <span className="flex items-center gap-1"><Database className="h-3 w-3" /> Schema</span>
          </p>
          <SearchableSelect
            options={schemas} value={schema} onChange={onSchemaChange}
            placeholder="Select schema…" emptyText="No schemas"
          />
        </div>
        <div>
          <p className={labelCls()}>
            <span className="flex items-center gap-1"><Table2 className="h-3 w-3" /> Table</span>
          </p>
          <SearchableSelect
            options={tableOpts} value={tableKey} onChange={onTableChange}
            placeholder="Select table…" disabled={!schema} emptyText="No tables"
          />
        </div>
      </div>

      {/* Column chips info */}
      {activeTable && (
        <div className="flex items-center gap-2 text-[11px] text-gray-400 dark:text-white/25">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          <span className="rounded bg-gray-100 px-2 py-0.5 dark:bg-white/[0.06]">{activeTable.timestampCols.length} timestamp</span>
          <span className="rounded bg-gray-100 px-2 py-0.5 dark:bg-white/[0.06]">{activeTable.numericCols.length} numeric</span>
          <span className="rounded bg-gray-100 px-2 py-0.5 dark:bg-white/[0.06]">{activeTable.textCols.length} text</span>
        </div>
      )}

      {/* Row 2: Columns */}
      {activeTable && (
        <div className={`grid gap-3 ${isDataTable ? 'grid-cols-1' : 'grid-cols-4'}`}>
          {/* Timestamp — always */}
          <div>
            <p className={labelCls()}>Timestamp <span className="text-red-400">*</span></p>
            <SearchableSelect
              options={tsOpts} value={tsCol} onChange={onTsColChange}
              placeholder="Select…" emptyText="No timestamp cols"
            />
          </div>

          {!isDataTable && (
            <>
              {/* Metric */}
              <div>
                <p className={labelCls()}>Metric <span className="text-red-400">*</span></p>
                <SearchableSelect
                  options={metricOpts} value={metricCol} onChange={onMetricChange}
                  placeholder="Select…" emptyText="No numeric cols"
                />
              </div>

              {/* Aggregation */}
              <div>
                <p className={labelCls()}>Aggregation</p>
                <SearchableSelect
                  options={AGGREGATIONS} value={aggregation}
                  onChange={(v) => onAggChange(v as AggregationType)}
                />
              </div>

              {/* Group By */}
              <div>
                <p className={labelCls()}>
                  Group By
                  {needsGroup && <span className="ml-1 text-amber-400 dark:text-amber-500">★</span>}
                </p>
                <SearchableSelect
                  options={groupOpts} value={groupCol} onChange={onGroupChange}
                  placeholder="None" emptyText="No text cols"
                />
              </div>
            </>
          )}
        </div>
      )}

      {!activeTable && schema && (
        <p className="text-[11px] text-gray-400 dark:text-white/25">Select a table to configure columns.</p>
      )}
    </div>
  );
}

// ── Main TemplateConnectPage ──────────────────────────────────────────────────

interface TemplateConnectPageProps {
  template: TemplateDefinition;
  onBack:   () => void;
  onCreate: (config: DashboardConfig) => void;
}

export default function TemplateConnectPage({ template, onBack, onCreate }: TemplateConnectPageProps) {
  const { tables, loading, error, refresh } = useTimeseriesTables();

  // Dashboard name
  const [dashName, setDashName] = useState(template.name);

  // Global source
  const [gSchema,  setGSchema]  = useState('');
  const [gTableKey,setGTKey]    = useState('');
  const [gTsCol,   setGTsCol]   = useState('');
  const [gMetric,  setGMetric]  = useState('');
  const [gAgg,     setGAgg]     = useState<AggregationType>('AVG');
  const [gGroup,   setGGroup]   = useState('');
  const [globalOpen, setGlobalOpen] = useState(true);

  // Per-widget sources
  const [wSources, setWSources] = useState<Record<string, WidgetSource>>(() =>
    Object.fromEntries(template.defaultLayout.map((w) => [
      w.id,
      { useGlobal: true, schema: '', tableKey: '', tsCol: '', metricCol: '', aggregation: 'AVG' as AggregationType, groupCol: '' },
    ])),
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ── Derived ───────────────────────────────────────────────────────────────
  const schemas     = useMemo(() => [...new Set(tables.map((t) => t.schema))].sort(), [tables]);
  const schemaOpts  = useMemo<SelectOption[]>(() =>
    schemas.map((s) => ({ value: s, label: s, sub: `${tables.filter((t) => t.schema === s).length} tables` })),
    [schemas, tables],
  );
  const gTable = useMemo(() => tables.find((t) => `${t.schema}.${t.table}` === gTableKey) ?? null, [tables, gTableKey]);

  const tableOf = useCallback((ws: WidgetSource) => {
    if (ws.useGlobal) return gTable;
    return tables.find((t) => `${t.schema}.${t.table}` === ws.tableKey) ?? null;
  }, [tables, gTable]);

  // Auto-fill globals on load
  useEffect(() => {
    if (schemas.length > 0 && !gSchema) setGSchema(schemas[0]);
  }, [schemas, gSchema]);

  useEffect(() => {
    const tbls = tables.filter((t) => t.schema === gSchema);
    if (tbls.length > 0) setGTKey(`${tbls[0].schema}.${tbls[0].table}`);
    else setGTKey('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gSchema]);

  useEffect(() => {
    if (!gTable) return;
    setGTsCol(gTable.timestampCols[0]  ?? '');
    setGMetric(gTable.numericCols[0]?.name ?? '');
    setGGroup(gTable.textCols[0]?.name ?? '');
  }, [gTable]);

  // ── Widget source updater ─────────────────────────────────────────────────
  const setWS = (id: string, patch: Partial<WidgetSource>) =>
    setWSources((p) => ({ ...p, [id]: { ...p[id], ...patch } }));

  const handleWSchema = (id: string, s: string) => {
    const tbls = tables.filter((t) => t.schema === s);
    const first = tbls[0] ?? null;
    setWS(id, {
      schema:    s,
      tableKey:  first ? `${first.schema}.${first.table}` : '',
      tsCol:     first?.timestampCols[0] ?? '',
      metricCol: first?.numericCols[0]?.name ?? '',
      groupCol:  first?.textCols[0]?.name ?? '',
    });
  };

  const handleWTable = (id: string, key: string) => {
    const t = tables.find((x) => `${x.schema}.${x.table}` === key);
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
    setWS(id, { useGlobal: true, schema: '', tableKey: '', tsCol: '', metricCol: '', aggregation: 'AVG', groupCol: '' });
    if (expandedId === id) setExpandedId(null);
  };

  // ── Validation ────────────────────────────────────────────────────────────
  const globalValid = !!(dashName.trim() && gTableKey && gTsCol && gMetric);

  const isWidgetValid = useCallback((id: string, type: WidgetType) => {
    if (type === 'data-table') return true;
    const ws = wSources[id];
    if (ws.useGlobal) return globalValid;
    return !!(ws.tsCol && ws.metricCol);
  }, [wSources, globalValid]);

  const validCount = template.defaultLayout.filter((w) => isWidgetValid(w.id, w.type)).length;
  const totalCount = template.defaultLayout.length;
  const allValid   = validCount === totalCount;

  // ── Create dashboard ──────────────────────────────────────────────────────
  const handleCreate = () => {
    if (!allValid) return;
    const dash = createNewDashboard(dashName.trim(), template.themeId);
    dash.templateId = template.id;
    const widgets: WidgetConfig[] = template.defaultLayout.map((layout) => {
      const ws = wSources[layout.id];
      const t  = tableOf(ws);
      const ds: DataSourceConfig = {
        schema:       ws.useGlobal ? (gTable?.schema ?? gSchema)        : ws.schema,
        table:        ws.useGlobal ? (gTable?.table  ?? '')              : (t?.table ?? ''),
        timestampCol: ws.useGlobal ? gTsCol                              : ws.tsCol,
        metricCol:    ws.useGlobal ? gMetric                             : ws.metricCol,
        groupCol:     (ws.useGlobal ? gGroup : ws.groupCol) || undefined,
        aggregation:  ws.useGlobal ? gAgg                               : ws.aggregation,
        limit:        50,
      };
      return { ...layout, dataSource: ds } as WidgetConfig;
    });
    onCreate({ ...dash, widgets });
  };

  const overrideCount = Object.values(wSources).filter((ws) => !ws.useGlobal).length;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full flex-col overflow-hidden bg-gray-50 dark:bg-gray-950">

      {/* ── Sticky top toolbar ───────────────────────────────────────────── */}
      <div className="flex flex-shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-6 py-3 dark:border-gray-800 dark:bg-gray-900">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 dark:text-white/40 dark:hover:bg-white/[0.06] dark:hover:text-white/70"
        >
          <ArrowLeft className="h-4 w-4" />
          Templates
        </button>

        <div className="h-4 w-px bg-gray-200 dark:bg-gray-800" />

        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Sparkles className="h-4 w-4 flex-shrink-0 text-blue-500" />
          <span className="truncate text-sm font-semibold text-gray-700 dark:text-white/70">
            {template.name}
          </span>
          <span className="hidden rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-500 dark:bg-white/[0.06] dark:text-white/35 sm:block">
            {totalCount} widgets
          </span>
        </div>

        {/* Dashboard name input */}
        <input
          type="text"
          value={dashName}
          onChange={(e) => setDashName(e.target.value)}
          placeholder="Dashboard name…"
          className="hidden w-48 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white md:block"
        />

        {/* Progress */}
        <div className="flex items-center gap-2 text-xs">
          <div className="hidden items-center gap-1.5 sm:flex">
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${(validCount / totalCount) * 100}%` }}
              />
            </div>
            <span className={`font-semibold ${allValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-white/35'}`}>
              {validCount}/{totalCount}
            </span>
          </div>
        </div>

        <button
          onClick={handleCreate}
          disabled={!allValid}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Create Dashboard
        </button>
      </div>

      {/* ── Scrollable body ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-6 py-6 space-y-4">

          {/* Dashboard name (mobile) */}
          <div className="md:hidden">
            <p className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-white/30">Dashboard Name</p>
            <input
              type="text"
              value={dashName}
              onChange={(e) => setDashName(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-900 outline-none transition focus:border-blue-500 dark:border-white/[0.10] dark:bg-white/[0.04] dark:text-white"
            />
          </div>

          {/* ── Loading / error state ───────────────────────────────────── */}
          {loading && (
            <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-6 dark:border-white/[0.08] dark:bg-white/[0.02]">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-8 animate-pulse rounded-lg bg-gray-100 dark:bg-white/[0.06]" />
              ))}
              <p className="text-center text-xs text-gray-400 dark:text-white/25">Loading tables from MonkDB…</p>
            </div>
          )}

          {!loading && error && (
            <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4 dark:border-red-500/20 dark:bg-red-500/10">
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500" />
              <span className="flex-1 text-sm text-red-600 dark:text-red-400">{error}</span>
              <button onClick={refresh} className="flex items-center gap-1.5 text-sm font-semibold text-red-600 hover:underline dark:text-red-400">
                <RefreshCw className="h-4 w-4" /> Retry
              </button>
            </div>
          )}

          {!loading && !error && tables.length === 0 && (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center dark:border-white/[0.10] dark:bg-white/[0.02]">
              <Database className="h-12 w-12 text-gray-200 dark:text-white/10" />
              <p className="text-sm font-semibold text-gray-500 dark:text-white/40">No timeseries tables found</p>
              <p className="max-w-xs text-xs text-gray-400 dark:text-white/25">
                Create a table with a TIMESTAMP column in MonkDB to get started.
              </p>
              <button onClick={refresh} className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400">
                <RefreshCw className="h-4 w-4" /> Refresh
              </button>
            </div>
          )}

          {/* ── Global data source ──────────────────────────────────────── */}
          {!loading && tables.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-blue-200/60 bg-white shadow-sm dark:border-blue-500/15 dark:bg-white/[0.03]">
              {/* Header */}
              <button
                onClick={() => setGlobalOpen((o) => !o)}
                className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-blue-50/50 dark:hover:bg-blue-500/[0.04]"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-500/15">
                  <Globe className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">Global Data Source</p>
                  <p className="text-xs text-gray-400 dark:text-white/35">
                    Applied to all widgets — override individually below
                  </p>
                </div>

                {gTable && (
                  <div className="hidden items-center gap-2 text-xs sm:flex">
                    <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 font-medium text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400">
                      {gSchema}.{gTable.table}
                    </span>
                    <span className="text-gray-400 dark:text-white/25">{gAgg}({gMetric})</span>
                  </div>
                )}

                {globalValid
                  ? <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-500" />
                  : <AlertCircle className="h-5 w-5 flex-shrink-0 text-amber-400" />
                }
                {globalOpen
                  ? <ChevronUp className="h-4 w-4 flex-shrink-0 text-gray-400" />
                  : <ChevronDown className="h-4 w-4 flex-shrink-0 text-gray-400" />
                }
              </button>

              {/* Body */}
              {globalOpen && (
                <div className="border-t border-blue-100 px-5 pb-5 pt-4 dark:border-blue-500/10">
                  <DataSourceForm
                    schema={gSchema}    onSchemaChange={setGSchema}
                    tableKey={gTableKey} onTableChange={(key) => {
                      setGTKey(key);
                      const t = tables.find((x) => `${x.schema}.${x.table}` === key);
                      if (t) { setGTsCol(t.timestampCols[0] ?? ''); setGMetric(t.numericCols[0]?.name ?? ''); setGGroup(t.textCols[0]?.name ?? ''); }
                    }}
                    tsCol={gTsCol}      onTsColChange={setGTsCol}
                    metricCol={gMetric} onMetricChange={setGMetric}
                    aggregation={gAgg}  onAggChange={setGAgg}
                    groupCol={gGroup}   onGroupChange={setGGroup}
                    schemas={schemaOpts}
                    tables={tables}
                    activeTable={gTable}
                  />
                </div>
              )}
            </div>
          )}

          {/* ── Widget list ──────────────────────────────────────────────── */}
          {!loading && tables.length > 0 && (
            <div className="space-y-3">
              {/* Header row */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-gray-900 dark:text-white">Widget Configuration</h2>
                  <p className="mt-0.5 text-xs text-gray-400 dark:text-white/35">
                    Each widget uses the global source by default. Click <strong className="text-gray-600 dark:text-white/55">Override</strong> to assign a different table or columns.
                  </p>
                </div>
                {overrideCount > 0 && (
                  <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700 dark:bg-violet-500/15 dark:text-violet-400">
                    {overrideCount} custom
                  </span>
                )}
              </div>

              {template.defaultLayout.map((w, idx) => {
                const meta     = WIDGET_META[w.type];
                const ws       = wSources[w.id];
                const isTable  = w.type === 'data-table';
                const isExpand = expandedId === w.id && !ws.useGlobal;
                const wTbl     = tableOf(ws);
                const valid    = isWidgetValid(w.id, w.type);
                const wSchemaOpts = schemaOpts;
                const wTableOpts  = buildTableOptions(ws.schema, tables);

                // Build summary line
                const summaryLine = (() => {
                  if (ws.useGlobal) {
                    if (!gTable) return 'Global config not set yet';
                    if (isTable) return `${gSchema}.${gTable.table} · all columns · ORDER BY ${gTsCol}`;
                    return `${gSchema}.${gTable.table} · ${gAgg}(${gMetric})${gGroup ? ` · GROUP BY ${gGroup}` : ''}`;
                  }
                  if (!wTbl) return 'Table not selected';
                  if (isTable) return `${ws.schema}.${wTbl.table} · all columns · ORDER BY ${ws.tsCol || '—'}`;
                  return `${ws.schema}.${wTbl.table} · ${ws.aggregation}(${ws.metricCol || '—'})${ws.groupCol ? ` · GROUP BY ${ws.groupCol}` : ''}`;
                })();

                return (
                  <div
                    key={w.id}
                    className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition-all dark:bg-white/[0.03] ${
                      !ws.useGlobal
                        ? 'border-violet-200 dark:border-violet-500/20'
                        : valid
                        ? 'border-gray-200 dark:border-white/[0.08]'
                        : 'border-amber-200 dark:border-amber-500/20'
                    }`}
                  >
                    {/* Widget header */}
                    <div className="flex items-center gap-3 px-5 py-3.5">
                      {/* Number */}
                      <span className="flex-shrink-0 text-xs font-bold text-gray-300 dark:text-white/15">
                        {String(idx + 1).padStart(2, '0')}
                      </span>

                      {/* Icon */}
                      <span
                        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
                        style={{ backgroundColor: meta.color + '18', color: meta.color }}
                      >
                        {meta.icon}
                      </span>

                      {/* Title + type + summary */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-bold text-gray-800 dark:text-white/90">
                            {w.title}
                          </span>
                          <span
                            className="flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold"
                            style={{ backgroundColor: meta.color + '15', color: meta.color }}
                          >
                            {meta.label}
                          </span>
                          {!valid && (
                            <span className="flex-shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
                              Needs config
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate font-mono text-[11px] text-gray-400 dark:text-white/25">
                          {summaryLine}
                        </p>
                      </div>

                      {/* Status + action buttons */}
                      <div className="flex flex-shrink-0 items-center gap-2">
                        {valid && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}

                        {isTable ? (
                          <span className="text-xs text-gray-300 dark:text-white/20">Auto</span>
                        ) : ws.useGlobal ? (
                          <>
                            <span className="hidden items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 sm:flex">
                              <Globe className="h-3 w-3" /> Global
                            </span>
                            <button
                              onClick={() => enableOverride(w.id)}
                              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 dark:border-white/[0.10] dark:bg-transparent dark:text-white/45 dark:hover:border-violet-500/30 dark:hover:bg-violet-500/10 dark:hover:text-violet-400"
                            >
                              <Settings2 className="h-3 w-3" /> Override
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="hidden items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-semibold text-violet-700 dark:bg-violet-500/15 dark:text-violet-400 sm:flex">
                              Custom
                            </span>
                            <button
                              onClick={() => setExpandedId(isExpand ? null : w.id)}
                              className="flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 transition-colors hover:bg-violet-100 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-400"
                            >
                              <Settings2 className="h-3 w-3" />
                              {isExpand ? 'Collapse' : 'Edit'}
                            </button>
                            <button
                              onClick={() => resetToGlobal(w.id)}
                              title="Reset to global"
                              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/[0.05] dark:hover:text-white/50"
                            >
                              <Unlink2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Expanded custom config */}
                    {isExpand && !ws.useGlobal && (
                      <div className="border-t border-violet-100 bg-gray-50/50 px-5 py-4 dark:border-violet-500/10 dark:bg-white/[0.01]">
                        {meta.needsGroup && !ws.groupCol && (
                          <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400">
                            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                            <strong>Group By</strong> is recommended for {meta.label} to show meaningful categories.
                          </div>
                        )}
                        <DataSourceForm
                          schema={ws.schema}    onSchemaChange={(s) => handleWSchema(w.id, s)}
                          tableKey={ws.tableKey} onTableChange={(key) => handleWTable(w.id, key)}
                          tsCol={ws.tsCol}       onTsColChange={(v) => setWS(w.id, { tsCol: v })}
                          metricCol={ws.metricCol} onMetricChange={(v) => setWS(w.id, { metricCol: v })}
                          aggregation={ws.aggregation} onAggChange={(v) => setWS(w.id, { aggregation: v })}
                          groupCol={ws.groupCol} onGroupChange={(v) => setWS(w.id, { groupCol: v })}
                          schemas={wSchemaOpts}
                          tables={tables}
                          activeTable={wTbl}
                          needsGroup={meta.needsGroup}
                          isDataTable={isTable}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Bottom create button ─────────────────────────────────────── */}
          {!loading && tables.length > 0 && (
            <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-6 py-4 dark:border-white/[0.08] dark:bg-white/[0.03]">
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-white/80">
                  {allValid ? 'All widgets configured — ready to create!' : `${totalCount - validCount} widget${totalCount - validCount !== 1 ? 's' : ''} still need a data source`}
                </p>
                <p className="text-xs text-gray-400 dark:text-white/30">
                  {validCount} of {totalCount} configured
                </p>
              </div>
              <button
                onClick={handleCreate}
                disabled={!allValid}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-6 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:from-blue-500 hover:to-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Sparkles className="h-4 w-4" />
                Create Dashboard
              </button>
            </div>
          )}

          {/* Bottom spacer */}
          <div className="h-4" />
        </div>
      </div>
    </div>
  );
}
