'use client';
import { useState, useEffect } from 'react';
import { X, Code2, Database, Palette, TrendingUp, Plus, Trash2, Eye } from 'lucide-react';
import { useTimeseriesTables } from '@/app/hooks/timeseries/useTimeseriesTables';
import { buildSQL } from '@/app/lib/timeseries/widget-executor';
import { getDefaultTimeRange } from '@/app/lib/timeseries/time-range';
import type {
  WidgetConfig, DataSourceConfig, WidgetStyle,
  AggregationType, ColorScheme, WidgetThreshold,
} from '@/app/lib/timeseries/types';

// ── Constants ────────────────────────────────────────────────────────────────

const AGGREGATIONS: AggregationType[] = ['AVG', 'MAX', 'MIN', 'SUM', 'COUNT'];

// Named palette for base color scheme
const COLOR_SCHEMES: { id: ColorScheme; hex: string }[] = [
  { id: 'blue',    hex: '#3B82F6' },
  { id: 'cyan',    hex: '#06B6D4' },
  { id: 'green',   hex: '#10B981' },
  { id: 'emerald', hex: '#34D399' },
  { id: 'amber',   hex: '#F59E0B' },
  { id: 'red',     hex: '#EF4444' },
  { id: 'purple',  hex: '#8B5CF6' },
  { id: 'pink',    hex: '#EC4899' },
];

// Quick color presets for series / threshold pickers
const HEX_PRESETS = [
  '#3B82F6', '#06B6D4', '#10B981', '#F59E0B',
  '#EF4444', '#8B5CF6', '#EC4899', '#F97316',
  '#14B8A6', '#84CC16', '#E879F9', '#FBBF24',
  '#60A5FA', '#34D399', '#FB7185', '#A78BFA',
];

type Tab = 'data' | 'visual' | 'thresholds' | 'sql';

// ── Sub-components ────────────────────────────────────────────────────────────

interface ColorPickerProps {
  value: string;
  onChange: (hex: string) => void;
  label?: string;
}
function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  const [hex, setHex] = useState(value);

  useEffect(() => setHex(value), [value]);

  const handleHexInput = (raw: string) => {
    setHex(raw);
    if (/^#[0-9A-Fa-f]{6}$/.test(raw)) onChange(raw);
  };

  return (
    <div className="flex items-center gap-2">
      {label && <span className="w-10 flex-shrink-0 text-xs text-gray-500 dark:text-gray-400">{label}</span>}
      {/* Native color input hidden behind the swatch */}
      <label className="relative flex-shrink-0">
        <span
          className="block h-6 w-7 cursor-pointer rounded-md border border-gray-200 shadow-sm dark:border-gray-600"
          style={{ background: hex }}
        />
        <input
          type="color"
          value={hex}
          onChange={(e) => { setHex(e.target.value); onChange(e.target.value); }}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </label>
      <input
        type="text"
        value={hex.toUpperCase()}
        onChange={(e) => handleHexInput(e.target.value)}
        maxLength={7}
        className="w-20 rounded-md border border-gray-200 bg-white px-2 py-1 font-mono text-xs text-gray-900 outline-none focus:border-blue-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        placeholder="#3B82F6"
      />
    </div>
  );
}

interface HexPresetGridProps {
  value: string;
  onChange: (hex: string) => void;
}
function HexPresetGrid({ value, onChange }: HexPresetGridProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {HEX_PRESETS.map((c) => (
        <button
          key={c}
          onClick={() => onChange(c)}
          className={`h-5 w-5 rounded-full border-2 transition-transform hover:scale-110 ${
            value === c ? 'border-white shadow-md scale-110' : 'border-transparent'
          }`}
          style={{ background: c }}
          title={c}
        />
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface WidgetConfigDrawerProps {
  widget: WidgetConfig | null;
  onSave: (updated: WidgetConfig) => void;
  onDelete: () => void;
  onClose: () => void;
}

export default function WidgetConfigDrawer({ widget, onSave, onDelete, onClose }: WidgetConfigDrawerProps) {
  const { tables } = useTimeseriesTables();
  const [tab,   setTab]   = useState<Tab>('data');
  const [title, setTitle] = useState('');
  const [ds,    setDs]    = useState<DataSourceConfig>({
    schema: 'monkdb', table: '', timestampCol: '', metricCol: '',
    groupCol: '', aggregation: 'AVG', limit: 50,
  });
  const [style, setStyle] = useState<WidgetStyle>({
    colorScheme: 'blue', showLegend: true, showGrid: true, unit: '',
    customColors: [],
    thresholds: [],
  });

  useEffect(() => {
    if (!widget) return;
    setTitle(widget.title);
    setDs(widget.dataSource);
    setStyle({
      customColors: [],
      thresholds: [],
      ...widget.style,
    });
    setTab('data');
  }, [widget?.id]);

  if (!widget) return null;

  const table = tables.find((t) => t.schema === ds.schema && t.table === ds.table);

  const handleTableChange = (key: string) => {
    const [schema, tableName] = key.split('.');
    const t = tables.find((x) => x.schema === schema && x.table === tableName);
    setDs((prev) => ({
      ...prev, schema, table: tableName,
      timestampCol: t?.timestampCols[0] ?? '',
      metricCol:    t?.numericCols[0]?.name ?? '',
      groupCol:     t?.textCols[0]?.name ?? '',
    }));
  };

  const handleSave = () => onSave({ ...widget, title, dataSource: ds, style });

  const previewSql = ds.table
    ? buildSQL(widget.type, ds, getDefaultTimeRange(), null)
    : '-- Select a table first';

  // Series colors helper
  const getSeriesColor = (i: number) =>
    style.customColors?.[i] || '';
  const setSeriesColor = (i: number, hex: string) => {
    const next = [...(style.customColors ?? ['', '', '', '', '', ''])];
    while (next.length < 6) next.push('');
    next[i] = hex;
    setStyle((p) => ({ ...p, customColors: next }));
  };

  // Thresholds helpers
  const addThreshold = () => {
    const t: WidgetThreshold = {
      id: `thr_${Date.now()}`,
      value: 80,
      color: '#EF4444',
      label: 'Alert',
    };
    setStyle((p) => ({ ...p, thresholds: [...(p.thresholds ?? []), t] }));
  };
  const updateThreshold = (id: string, patch: Partial<WidgetThreshold>) => {
    setStyle((p) => ({
      ...p,
      thresholds: p.thresholds?.map((t) => t.id === id ? { ...t, ...patch } : t),
    }));
  };
  const removeThreshold = (id: string) => {
    setStyle((p) => ({ ...p, thresholds: p.thresholds?.filter((t) => t.id !== id) }));
  };

  // Shared classes
  const labelCls  = 'block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5';
  const inputCls  = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white';
  const selectCls = `${inputCls} cursor-pointer`;
  const sectionCls = 'space-y-3 pb-4 border-b border-gray-100 dark:border-gray-800 last:border-0 last:pb-0';
  const sectionTitle = 'text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2.5';

  const ToggleSwitch = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
    <button
      onClick={() => onChange(!value)}
      className={`relative h-5 w-9 rounded-full transition-colors ${value ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-700'}`}
    >
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  );

  const TABS: { id: Tab; icon: React.ReactNode; label: string }[] = [
    { id: 'data',       icon: <Database className="h-3.5 w-3.5" />,   label: 'Data'       },
    { id: 'visual',     icon: <Palette className="h-3.5 w-3.5" />,    label: 'Visual'     },
    { id: 'thresholds', icon: <TrendingUp className="h-3.5 w-3.5" />, label: 'Thresholds' },
    { id: 'sql',        icon: <Code2 className="h-3.5 w-3.5" />,      label: 'SQL'        },
  ];

  const isChartWidget = ['line-chart', 'area-chart', 'bar-chart'].includes(widget.type);

  return (
    <div className="flex h-full w-80 flex-shrink-0 flex-col border-l border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">

      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">Configure Widget</h3>
          <span className="flex-shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400 capitalize">
            {widget.type.replace('-', ' ')}
          </span>
        </div>
        <button onClick={onClose} className="ml-2 flex-shrink-0 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Title */}
      <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
        <input
          type="text" value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Widget title"
          className={inputCls}
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex flex-1 items-center justify-center gap-1 py-2 text-xs font-medium transition-colors ${
              tab === t.id
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4">

        {/* ── DATA TAB ──────────────────────────────────────────────────────── */}
        {tab === 'data' && (
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Table</label>
              <select className={selectCls} value={`${ds.schema}.${ds.table}`} onChange={(e) => handleTableChange(e.target.value)}>
                <option value=".">Select a table…</option>
                {tables.map((t) => (
                  <option key={`${t.schema}.${t.table}`} value={`${t.schema}.${t.table}`}>
                    {t.schema}.{t.table}
                  </option>
                ))}
              </select>
            </div>

            {table && (
              <>
                <div>
                  <label className={labelCls}>Timestamp Column</label>
                  <select className={selectCls} value={ds.timestampCol} onChange={(e) => setDs((p) => ({ ...p, timestampCol: e.target.value }))}>
                    {table.timestampCols.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Metric Column</label>
                  <select className={selectCls} value={ds.metricCol} onChange={(e) => setDs((p) => ({ ...p, metricCol: e.target.value }))}>
                    {table.numericCols.map((c) => <option key={c.name} value={c.name}>{c.name} ({c.type})</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Aggregation</label>
                  <select className={selectCls} value={ds.aggregation} onChange={(e) => setDs((p) => ({ ...p, aggregation: e.target.value as AggregationType }))}>
                    {AGGREGATIONS.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Group By <span className="font-normal text-gray-400">(optional)</span></label>
                  <select className={selectCls} value={ds.groupCol ?? ''} onChange={(e) => setDs((p) => ({ ...p, groupCol: e.target.value || undefined }))}>
                    <option value="">None</option>
                    {table.textCols.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Row Limit</label>
                  <input
                    type="number" min={10} max={10000} step={10}
                    value={ds.limit ?? 50}
                    onChange={(e) => setDs((p) => ({ ...p, limit: Number(e.target.value) }))}
                    className={inputCls}
                  />
                </div>
              </>
            )}
          </div>
        )}

        {/* ── VISUAL TAB ────────────────────────────────────────────────────── */}
        {tab === 'visual' && (
          <div className="space-y-5">

            {/* Color palette */}
            <div className={sectionCls}>
              <p className={sectionTitle}>Base Color Scheme</p>
              <div className="grid grid-cols-8 gap-1.5">
                {COLOR_SCHEMES.map(({ id: c, hex }) => (
                  <button
                    key={c}
                    onClick={() => setStyle((p) => ({ ...p, colorScheme: c }))}
                    title={c}
                    className={`h-6 w-6 rounded-full border-2 transition-all hover:scale-110 ${
                      style.colorScheme === c ? 'border-white shadow-md scale-110' : 'border-transparent'
                    }`}
                    style={{ background: hex }}
                  />
                ))}
              </div>
            </div>

            {/* Custom series colors */}
            <div className={sectionCls}>
              <p className={sectionTitle}>Custom Series Colors</p>
              <p className="mb-2.5 text-xs text-gray-400 dark:text-gray-500">Override per-series colors. Leave blank to use theme defaults.</p>
              <div className="space-y-2">
                {[0, 1, 2, 3, 4, 5].map((i) => {
                  const cur = getSeriesColor(i);
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-12 flex-shrink-0 text-xs text-gray-500 dark:text-gray-400">Series {i + 1}</span>
                      <div className="flex flex-1 items-center gap-1.5">
                        {/* preset presets */}
                        <div className="flex flex-wrap gap-1 flex-1">
                          {HEX_PRESETS.slice(0, 8).map((c) => (
                            <button
                              key={c}
                              onClick={() => setSeriesColor(i, c)}
                              className={`h-4 w-4 rounded-full border transition-transform hover:scale-110 ${cur === c ? 'border-white scale-110' : 'border-transparent'}`}
                              style={{ background: c }}
                            />
                          ))}
                        </div>
                        {/* color swatch + clear */}
                        <label className="relative flex-shrink-0 cursor-pointer">
                          <span
                            className="block h-5 w-5 rounded-md border dark:border-gray-600"
                            style={{ background: cur || '#6B7280' }}
                          />
                          <input
                            type="color"
                            value={cur || '#6B7280'}
                            onChange={(e) => setSeriesColor(i, e.target.value)}
                            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                          />
                        </label>
                        {cur && (
                          <button onClick={() => setSeriesColor(i, '')} className="text-gray-400 hover:text-red-400">
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Format */}
            <div className={sectionCls}>
              <p className={sectionTitle}>Value Format</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Prefix</label>
                  <input
                    type="text" value={style.prefix ?? ''}
                    onChange={(e) => setStyle((p) => ({ ...p, prefix: e.target.value || undefined }))}
                    placeholder="$, ~, ≈…"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Unit Suffix</label>
                  <input
                    type="text" value={style.unit ?? ''}
                    onChange={(e) => setStyle((p) => ({ ...p, unit: e.target.value }))}
                    placeholder="°C, %, ms…"
                    className={inputCls}
                  />
                </div>
              </div>
              <div className="mt-3">
                <label className={labelCls}>Decimal Places</label>
                <div className="flex gap-1.5">
                  {[0, 1, 2, 3, 4].map((d) => (
                    <button
                      key={d}
                      onClick={() => setStyle((p) => ({ ...p, decimals: d }))}
                      className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors ${
                        (style.decimals ?? -1) === d
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
                      }`}
                    >
                      {d === 0 ? '0' : `.${Array(d).fill('0').join('')}`}
                    </button>
                  ))}
                  <button
                    onClick={() => setStyle((p) => ({ ...p, decimals: undefined }))}
                    className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors ${
                      style.decimals === undefined
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
                    }`}
                  >
                    Auto
                  </button>
                </div>
              </div>
            </div>

            {/* Display */}
            <div className={sectionCls}>
              <p className={sectionTitle}>Display Options</p>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Show Legend</label>
                  <ToggleSwitch value={style.showLegend} onChange={(v) => setStyle((p) => ({ ...p, showLegend: v }))} />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Show Grid Lines</label>
                  <ToggleSwitch value={style.showGrid} onChange={(v) => setStyle((p) => ({ ...p, showGrid: v }))} />
                </div>
                {(widget.type === 'line-chart' || widget.type === 'area-chart') && (
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Smooth Curves</label>
                    <ToggleSwitch value={style.smooth ?? true} onChange={(v) => setStyle((p) => ({ ...p, smooth: v }))} />
                  </div>
                )}
                {widget.type === 'area-chart' && (
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Fill Opacity</label>
                      <span className="text-xs text-gray-400">{style.fillOpacity ?? 35}%</span>
                    </div>
                    <input
                      type="range" min={0} max={80} step={5}
                      value={style.fillOpacity ?? 35}
                      onChange={(e) => setStyle((p) => ({ ...p, fillOpacity: Number(e.target.value) }))}
                      className="w-full accent-blue-500"
                    />
                  </div>
                )}
                {(widget.type === 'bar-chart' || widget.type === 'pie-chart') && (
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Show Data Labels</label>
                    <ToggleSwitch value={style.showDataLabels ?? false} onChange={(v) => setStyle((p) => ({ ...p, showDataLabels: v }))} />
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Invert Trend Indicator</label>
                  <ToggleSwitch value={style.invertTrend ?? false} onChange={(v) => setStyle((p) => ({ ...p, invertTrend: v }))} />
                </div>
              </div>
            </div>

            {/* Card style */}
            <div className={sectionCls}>
              <p className={sectionTitle}>Card Style</p>
              <div className="grid grid-cols-2 gap-2">
                {(['default', 'glass', 'filled', 'borderless'] as const).map((cs) => (
                  <button
                    key={cs}
                    onClick={() => setStyle((p) => ({ ...p, cardStyle: cs }))}
                    className={`rounded-lg border py-2 text-xs font-medium capitalize transition-all ${
                      (style.cardStyle ?? 'default') === cs
                        ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-900/20 dark:text-blue-300'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400'
                    }`}
                  >
                    {cs}
                  </button>
                ))}
              </div>
            </div>

            {/* Gauge options */}
            {widget.type === 'gauge' && (
              <div className={sectionCls}>
                <p className={sectionTitle}>Gauge Range</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Min</label>
                    <input type="number" value={style.gaugeMin ?? 0} onChange={(e) => setStyle((p) => ({ ...p, gaugeMin: Number(e.target.value) }))} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Max</label>
                    <input type="number" value={style.gaugeMax ?? 100} onChange={(e) => setStyle((p) => ({ ...p, gaugeMax: Number(e.target.value) }))} className={inputCls} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── THRESHOLDS TAB ─────────────────────────────────────────────────── */}
        {tab === 'thresholds' && (
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Thresholds appear as horizontal reference lines on charts, and as color zones on gauges.
                Values triggering a threshold will be highlighted accordingly.
              </p>
            </div>

            {/* Threshold list */}
            <div className="space-y-3">
              {(style.thresholds ?? []).length === 0 && (
                <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center dark:border-gray-700">
                  <TrendingUp className="mx-auto mb-2 h-6 w-6 text-gray-300 dark:text-gray-600" />
                  <p className="text-xs text-gray-400 dark:text-gray-500">No thresholds. Add one below.</p>
                </div>
              )}

              {(style.thresholds ?? []).map((thr) => (
                <div key={thr.id} className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ background: thr.color }} />
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        {thr.label || `At ${thr.value}`}
                      </span>
                    </div>
                    <button onClick={() => removeThreshold(thr.id)} className="text-gray-400 hover:text-red-400">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Value</label>
                      <input
                        type="number"
                        value={thr.value}
                        onChange={(e) => updateThreshold(thr.id, { value: Number(e.target.value) })}
                        className="w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-900 outline-none focus:border-blue-400 dark:border-gray-700 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Label</label>
                      <input
                        type="text"
                        value={thr.label ?? ''}
                        onChange={(e) => updateThreshold(thr.id, { label: e.target.value })}
                        placeholder="e.g. Alert"
                        className="w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-900 outline-none focus:border-blue-400 dark:border-gray-700 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  </div>
                  <div className="mt-2">
                    <label className="mb-1.5 block text-xs text-gray-500 dark:text-gray-400">Color</label>
                    <HexPresetGrid value={thr.color} onChange={(c) => updateThreshold(thr.id, { color: c })} />
                    <div className="mt-1.5">
                      <ColorPicker value={thr.color} onChange={(c) => updateThreshold(thr.id, { color: c })} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={addThreshold}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-blue-300 py-2.5 text-xs font-medium text-blue-500 transition-colors hover:border-blue-400 hover:bg-blue-50 dark:border-blue-800 dark:hover:bg-blue-900/20"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Threshold
            </button>

            {/* Reference: show active thresholds at bottom */}
            {(style.thresholds ?? []).length > 0 && isChartWidget && (
              <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800/50">
                <p className="mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400">Active Threshold Lines</p>
                <div className="space-y-1">
                  {[...(style.thresholds ?? [])].sort((a, b) => b.value - a.value).map((thr) => (
                    <div key={thr.id} className="flex items-center gap-2 text-xs">
                      <div className="h-px flex-1 border-t border-dashed" style={{ borderColor: thr.color }} />
                      <span className="font-mono text-gray-600 dark:text-gray-400">{thr.value}</span>
                      {thr.label && <span style={{ color: thr.color }}>{thr.label}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── SQL TAB ───────────────────────────────────────────────────────── */}
        {tab === 'sql' && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Auto-generated SQL. Edit to customize. Variables: <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">{'{{from}}'}</code>, <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">{'{{to}}'}</code>, <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">{'{{interval}}'}</code>
            </p>
            <textarea
              value={ds.customSql ?? previewSql}
              onChange={(e) => setDs((p) => ({ ...p, customSql: e.target.value }))}
              rows={14}
              spellCheck={false}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 font-mono text-xs text-gray-800 outline-none focus:border-blue-400 dark:border-gray-700 dark:bg-gray-800/80 dark:text-gray-200"
            />
            {ds.customSql && (
              <button
                onClick={() => setDs((p) => ({ ...p, customSql: undefined }))}
                className="text-xs text-blue-500 underline hover:text-blue-700"
              >
                Reset to auto-generated SQL
              </button>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 border-t border-gray-200 px-4 py-3 dark:border-gray-700">
        <button
          onClick={onDelete}
          className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-50 dark:border-red-800/50 dark:hover:bg-red-900/20"
        >
          Delete
        </button>
        <button
          onClick={handleSave}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700"
        >
          <Eye className="h-3.5 w-3.5" />
          Apply Changes
        </button>
      </div>
    </div>
  );
}
