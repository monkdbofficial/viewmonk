'use client';
import { useState, useEffect } from 'react';
import { X, Code2, Database, Palette, TrendingUp, Plus, Trash2, Eye, Type, AlignLeft, AlignCenter, AlignRight, Minus, Bookmark } from 'lucide-react';
import { useTimeseriesTables } from '@/app/hooks/timeseries/useTimeseriesTables';
import { buildSQL } from '@/app/lib/timeseries/widget-executor';
import { getDefaultTimeRange } from '@/app/lib/timeseries/time-range';
import type {
  WidgetConfig, DataSourceConfig, WidgetStyle,
  AggregationType, ColorScheme, WidgetThreshold, ChartAnnotation,
  ColumnFormattingRule, ColumnFormattingStyle, ColumnFormattingOperator, ColumnFormattingIcon,
} from '@/app/lib/timeseries/types';

// ── Constants ────────────────────────────────────────────────────────────────

const AGGREGATIONS: AggregationType[] = ['AVG', 'MAX', 'MIN', 'SUM', 'COUNT', 'COUNT_DISTINCT', 'STDDEV', 'VARIANCE'];

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

type Tab = 'data' | 'visual' | 'thresholds' | 'sql' | 'content' | 'annotations';

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
  const [tab,              setTab]              = useState<Tab>('data');
  const [title,            setTitle]            = useState('');
  const [content,          setContent]          = useState('');
  const [annotations,      setAnnotations]      = useState<ChartAnnotation[]>([]);
  const [colFormatting,    setColFormatting]    = useState<ColumnFormattingRule[]>([]);
  const [ds,      setDs]      = useState<DataSourceConfig>({
    schema: 'monkdb', table: '', timestampCol: '', metricCol: '',
    groupCol: '', aggregation: 'AVG', limit: 50,
  });
  const [style, setStyle] = useState<WidgetStyle>({
    colorScheme: 'blue', showLegend: true, showGrid: true, unit: '',
    customColors: [], thresholds: [],
  });

  const isContentWidget = widget?.type === 'text-widget' || widget?.type === 'divider';

  useEffect(() => {
    if (!widget) return;
    setTitle(widget.title);
    setContent(widget.content ?? '');
    setAnnotations(widget.annotations ?? []);
    setColFormatting(widget.style.columnFormatting ?? []);
    setDs(widget.dataSource);
    setStyle({ customColors: [], thresholds: [], ...widget.style });
    setTab(widget.type === 'text-widget' ? 'content' : widget.type === 'divider' ? 'data' : 'data');
  }, [widget?.id]);

  if (!widget) return null;

  const table = tables.find((t) => t.schema === ds.schema && t.table === ds.table);

  // Widget types that produce a single aggregate value — group-by doesn't apply
  const SINGLE_VALUE_WIDGETS = new Set(['stat-card', 'gauge'] as const);

  const handleTableChange = (key: string) => {
    const dotIdx   = key.indexOf('.');
    const schema   = key.slice(0, dotIdx);
    const tableName = key.slice(dotIdx + 1);
    const t = tables.find((x) => x.schema === schema && x.table === tableName);
    const needsGroup = !SINGLE_VALUE_WIDGETS.has(widget.type as 'stat-card' | 'gauge');
    setDs((prev) => ({
      ...prev, schema, table: tableName,
      timestampCol: t?.timestampCols[0] ?? '',
      metricCol:    t?.numericCols[0]?.name ?? '',
      groupCol:     needsGroup ? (t?.textCols[0]?.name ?? '') : undefined,
      // Clear column-specific fields that are tied to the old table's schema
      xCol: undefined, yCol: undefined,
      openCol: undefined, highCol: undefined, lowCol: undefined, closeCol: undefined,
      parentCol: undefined, compareWith: undefined,
    }));
  };

  const handleSave = () => onSave({
    ...widget, title, dataSource: ds,
    style: { ...style, columnFormatting: colFormatting.length ? colFormatting : undefined },
    content: content || undefined,
    annotations: annotations.length ? annotations : undefined,
  });

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

  const isAnnotatableChart = widget.type === 'line-chart' || widget.type === 'area-chart';

  const TABS: { id: Tab; icon: React.ReactNode; label: string }[] = isContentWidget
    ? widget.type === 'text-widget'
      ? [
          { id: 'content', icon: <Type className="h-3.5 w-3.5" />,    label: 'Content' },
          { id: 'visual',  icon: <Palette className="h-3.5 w-3.5" />, label: 'Style'   },
        ]
      : [] // divider: no tabs, just title field is enough
    : [
        { id: 'data',       icon: <Database className="h-3.5 w-3.5" />,   label: 'Data'       },
        { id: 'visual',     icon: <Palette className="h-3.5 w-3.5" />,    label: 'Visual'     },
        { id: 'thresholds', icon: <TrendingUp className="h-3.5 w-3.5" />, label: 'Thresholds' },
        ...(isAnnotatableChart ? [{ id: 'annotations' as Tab, icon: <Bookmark className="h-3.5 w-3.5" />, label: 'Events' }] : []),
        { id: 'sql',        icon: <Code2 className="h-3.5 w-3.5" />,      label: 'SQL'        },
      ];

  const isAxisChart = ['line-chart', 'area-chart', 'bar-chart'].includes(widget.type);

  return (
    <div className="flex h-full w-80 flex-shrink-0 flex-col border-l border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">

      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">Configure Widget</h3>
          <span className="flex-shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400 capitalize">
            {widget.type.replace(/-/g, ' ')}
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

        {/* ── DIVIDER hint — no tabs needed ─────────────────────────────────── */}
        {widget.type === 'divider' && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-700/60 dark:bg-gray-800/40">
              <Minus className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
              <div>
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">Section Divider</p>
                <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                  The title field above becomes the centred label on the divider line.
                  Leave it blank for a plain horizontal rule.
                </p>
              </div>
            </div>
            <div>
              <label className={labelCls}>Alignment</label>
              <div className="flex gap-2">
                {([
                  { v: 'left',   icon: <AlignLeft   className="h-4 w-4" /> },
                  { v: 'center', icon: <AlignCenter  className="h-4 w-4" /> },
                  { v: 'right',  icon: <AlignRight   className="h-4 w-4" /> },
                ] as const).map(({ v, icon }) => (
                  <button
                    key={v}
                    onClick={() => setStyle((p) => ({ ...p, textAlign: v }))}
                    className={`flex flex-1 items-center justify-center rounded-lg border py-2 transition-all ${
                      (style.textAlign ?? 'center') === v
                        ? 'border-blue-500 bg-blue-50 text-blue-600 dark:border-blue-500 dark:bg-blue-900/20 dark:text-blue-300'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400'
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── CONTENT TAB (text-widget) ──────────────────────────────────────── */}
        {tab === 'content' && widget.type === 'text-widget' && (
          <div className="space-y-4">
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className={labelCls}>Markdown Content</label>
                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className="text-[10px] text-blue-500 hover:underline dark:text-blue-400"
                  title="Supported: # H1  ## H2  **bold**  *italic*  `code`  > quote  - list  ---"
                >
                  Markdown supported
                </a>
              </div>
              <textarea
                autoFocus
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={14}
                placeholder={
                  '# Section Title\n\nWrite **markdown** content here.\n\n- Bullet point\n- Another item\n\n> Blockquote note\n\n`inline code`'
                }
                spellCheck
                className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              />
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-gray-700/60 dark:bg-gray-800/40">
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Syntax Reference</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                {[
                  ['# H1  ## H2  ### H3', 'Headers'],
                  ['**bold**  *italic*', 'Emphasis'],
                  ['`code`', 'Inline code'],
                  ['> text', 'Blockquote'],
                  ['- item', 'Bullet list'],
                  ['1. item', 'Numbered list'],
                  ['---', 'Horizontal rule'],
                ].map(([syn, desc]) => (
                  <div key={syn} className="flex items-center gap-2">
                    <code className="text-[10px] text-blue-600 dark:text-blue-400">{syn}</code>
                    <span className="text-[10px] text-gray-400">{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── TEXT-WIDGET STYLE TAB ─────────────────────────────────────────── */}
        {tab === 'visual' && widget.type === 'text-widget' && (
          <div className="space-y-5">
            <div className={sectionCls}>
              <p className={sectionTitle}>Text Alignment</p>
              <div className="flex gap-2">
                {([
                  { v: 'left',   icon: <AlignLeft   className="h-4 w-4" />, label: 'Left'   },
                  { v: 'center', icon: <AlignCenter  className="h-4 w-4" />, label: 'Center' },
                  { v: 'right',  icon: <AlignRight   className="h-4 w-4" />, label: 'Right'  },
                ] as const).map(({ v, icon, label }) => (
                  <button
                    key={v}
                    onClick={() => setStyle((p) => ({ ...p, textAlign: v }))}
                    className={`flex flex-1 flex-col items-center gap-1 rounded-lg border py-2.5 text-xs font-medium transition-all ${
                      (style.textAlign ?? 'left') === v
                        ? 'border-blue-500 bg-blue-50 text-blue-600 dark:border-blue-500 dark:bg-blue-900/20 dark:text-blue-300'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400'
                    }`}
                  >
                    {icon}{label}
                  </button>
                ))}
              </div>
            </div>
            <div className={sectionCls}>
              <p className={sectionTitle}>Base Font Size</p>
              <div className="grid grid-cols-4 gap-2">
                {([
                  { v: 'sm',   label: 'Small' },
                  { v: 'base', label: 'Normal' },
                  { v: 'lg',   label: 'Large' },
                  { v: 'xl',   label: 'XL' },
                ] as const).map(({ v, label }) => (
                  <button
                    key={v}
                    onClick={() => setStyle((p) => ({ ...p, fontSize: v }))}
                    className={`rounded-lg border py-2 text-xs font-medium transition-all ${
                      (style.fontSize ?? 'sm') === v
                        ? 'border-blue-500 bg-blue-50 text-blue-600 dark:border-blue-500 dark:bg-blue-900/20 dark:text-blue-300'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── DATA TAB ──────────────────────────────────────────────────────── */}
        {tab === 'data' && !isContentWidget && (
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
                  <label className={labelCls}>
                    Row Limit
                    <span className="ml-1 font-normal text-gray-400">
                      (blank = auto for time-series)
                    </span>
                  </label>
                  <input
                    type="number" min={1} max={10000} step={10}
                    value={ds.limit ?? ''}
                    placeholder="auto"
                    onChange={(e) => {
                      const n = e.target.value === '' ? undefined : Math.max(1, Number(e.target.value) || 1);
                      setDs((p) => ({ ...p, limit: n }));
                    }}
                    className={inputCls}
                  />
                </div>

                {/* Scatter chart: X/Y column selectors */}
                {widget.type === 'scatter-chart' && (
                  <>
                    <div>
                      <label className={labelCls}>X-Axis Column</label>
                      <select className={selectCls} value={ds.xCol ?? ''} onChange={(e) => setDs((p) => ({ ...p, xCol: e.target.value || undefined }))}>
                        <option value="">Use Metric Column</option>
                        {table.numericCols.map((c) => <option key={c.name} value={c.name}>{c.name} ({c.type})</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Y-Axis Column</label>
                      <select className={selectCls} value={ds.yCol ?? ''} onChange={(e) => setDs((p) => ({ ...p, yCol: e.target.value || undefined }))}>
                        <option value="">Use Metric Column</option>
                        {table.numericCols.map((c) => <option key={c.name} value={c.name}>{c.name} ({c.type})</option>)}
                      </select>
                    </div>
                  </>
                )}

                {/* Candlestick: OHLC column selectors */}
                {widget.type === 'candlestick' && (
                  <>
                    <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">OHLC Columns <span className="font-normal normal-case">(fall back to Metric Column)</span></p>
                    {(['openCol', 'highCol', 'lowCol', 'closeCol'] as const).map((field) => (
                      <div key={field}>
                        <label className={labelCls}>{field.replace('Col', '').toUpperCase()}</label>
                        <select className={selectCls} value={ds[field] ?? ''} onChange={(e) => setDs((p) => ({ ...p, [field]: e.target.value || undefined }))}>
                          <option value="">Use Metric Column</option>
                          {table.numericCols.map((c) => <option key={c.name} value={c.name}>{c.name} ({c.type})</option>)}
                        </select>
                      </div>
                    ))}
                  </>
                )}

                {/* Progress KPI: target value */}
                {widget.type === 'progress-kpi' && (
                  <div>
                    <label className={labelCls}>KPI Target <span className="font-normal text-gray-400">(leave blank to use MAX from DB)</span></label>
                    <input
                      type="number"
                      value={ds.kpiTarget ?? ''}
                      onChange={(e) => setDs((p) => ({ ...p, kpiTarget: e.target.value ? Number(e.target.value) : undefined }))}
                      placeholder="e.g. 10000"
                      className={inputCls}
                    />
                  </div>
                )}

                {/* Treemap: parent category for 2-level hierarchy */}
                {widget.type === 'treemap' && (
                  <div>
                    <label className={labelCls}>Parent Category <span className="font-normal text-gray-400">(optional — enables 2-level hierarchy)</span></label>
                    <select className={selectCls} value={ds.parentCol ?? ''} onChange={(e) => setDs((p) => ({ ...p, parentCol: e.target.value || undefined }))}>
                      <option value="">None (flat treemap)</option>
                      {table.textCols.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                )}

                {/* WHERE clause */}
                <div>
                  <label className={labelCls}>WHERE Clause <span className="font-normal text-gray-400">(optional extra filter)</span></label>
                  <input
                    type="text"
                    value={ds.whereClause ?? ''}
                    onChange={(e) => setDs((p) => ({ ...p, whereClause: e.target.value || undefined }))}
                    placeholder="status = 'active' AND region = 'US'"
                    className={inputCls}
                  />
                </div>

                {/* Time-range comparison — line/area only */}
                {(widget.type === 'line-chart' || widget.type === 'area-chart') && (
                  <div>
                    <label className={labelCls}>Compare With <span className="font-normal text-gray-400">(overlay previous period)</span></label>
                    <select
                      className={selectCls}
                      value={ds.compareWith ?? ''}
                      onChange={(e) => setDs((p) => ({ ...p, compareWith: (e.target.value || undefined) as typeof p.compareWith }))}
                    >
                      <option value="">None</option>
                      <option value="previous-period">Previous period (same length)</option>
                      <option value="previous-week">Previous week</option>
                      <option value="previous-month">Previous month</option>
                    </select>
                    {ds.compareWith && (
                      <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
                        Comparison series appear as dashed lines aligned to the current x-axis.
                      </p>
                    )}
                  </div>
                )}

                {/* Result caching */}
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-gray-700/60 dark:bg-gray-800/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">Result Caching</p>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500">Serve cached data to reduce DB load</p>
                    </div>
                    <ToggleSwitch
                      value={ds.cacheEnabled ?? false}
                      onChange={(v) => setDs((p) => ({ ...p, cacheEnabled: v }))}
                    />
                  </div>
                  {ds.cacheEnabled && (
                    <div>
                      <label className={labelCls}>Cache TTL</label>
                      <select
                        className={selectCls}
                        value={ds.cacheTtl ?? 60000}
                        onChange={(e) => setDs((p) => ({ ...p, cacheTtl: Number(e.target.value) }))}
                      >
                        <option value={30000}>30 seconds</option>
                        <option value={60000}>1 minute</option>
                        <option value={300000}>5 minutes</option>
                        <option value={900000}>15 minutes</option>
                      </select>
                      <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
                        Stale results are served instantly while a background refresh runs.
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── VISUAL TAB (data widgets only) ────────────────────────────────── */}
        {tab === 'visual' && !isContentWidget && (
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

            {/* Y-axis scale */}
            {isAxisChart && (
              <div className={sectionCls}>
                <p className={sectionTitle}>Y-Axis Scale</p>
                <div className="grid grid-cols-2 gap-2">
                  {(['linear', 'log'] as const).map((scale) => (
                    <button
                      key={scale}
                      onClick={() => setStyle((p) => ({ ...p, yAxisScale: scale }))}
                      className={`rounded-lg border py-2 text-xs font-medium capitalize transition-all ${
                        (style.yAxisScale ?? 'linear') === scale
                          ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-900/20 dark:text-blue-300'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400'
                      }`}
                    >
                      {scale === 'linear' ? 'Linear' : 'Logarithmic'}
                    </button>
                  ))}
                </div>
              </div>
            )}

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

            {/* ── Anomaly Detection — line / area charts only ───────────── */}
            {(widget.type === 'line-chart' || widget.type === 'area-chart') && (
              <div className={sectionCls}>
                <div className="flex items-center justify-between mb-2.5">
                  <div>
                    <p className={sectionTitle} style={{ marginBottom: 0 }}>Anomaly Detection</p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                      Flag statistical outliers (mean ± N·σ)
                    </p>
                  </div>
                  <ToggleSwitch
                    value={style.anomalyDetection?.enabled ?? false}
                    onChange={(v) => setStyle((p) => ({
                      ...p,
                      anomalyDetection: { enabled: v, sensitivity: p.anomalyDetection?.sensitivity ?? 2, showBands: p.anomalyDetection?.showBands ?? true },
                    }))}
                  />
                </div>

                {(style.anomalyDetection?.enabled) && (
                  <div className="space-y-3">
                    {/* Sensitivity slider */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className={labelCls} style={{ marginBottom: 0 }}>Sensitivity</label>
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                          {(() => {
                            const s = style.anomalyDetection?.sensitivity ?? 2;
                            return s <= 1 ? 'High (1σ)' : s <= 1.5 ? 'Medium-High (1.5σ)' : s <= 2 ? 'Standard (2σ)' : 'Conservative (3σ)';
                          })()}
                        </span>
                      </div>
                      <input
                        type="range" min={1} max={3} step={0.5}
                        value={style.anomalyDetection?.sensitivity ?? 2}
                        onChange={(e) => setStyle((p) => ({
                          ...p,
                          anomalyDetection: { ...p.anomalyDetection!, sensitivity: Number(e.target.value) },
                        }))}
                        className="w-full accent-blue-500"
                      />
                      <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                        <span>More alerts</span>
                        <span>Fewer alerts</span>
                      </div>
                    </div>

                    {/* Show bands toggle */}
                    <div className="flex items-center justify-between">
                      <label className={labelCls} style={{ marginBottom: 0 }}>Show normal band</label>
                      <ToggleSwitch
                        value={style.anomalyDetection?.showBands ?? true}
                        onChange={(v) => setStyle((p) => ({
                          ...p,
                          anomalyDetection: { ...p.anomalyDetection!, showBands: v },
                        }))}
                      />
                    </div>

                    <p className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-[11px] text-gray-500 dark:border-gray-700/60 dark:bg-gray-800/40 dark:text-gray-400">
                      Red dots mark anomalous points. The shaded band shows the normal range. Mean line shown as a dotted reference.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ── Conditional Formatting — data-table only ──────────────── */}
            {widget.type === 'data-table' && (
              <div className={sectionCls}>
                <div className="flex items-center justify-between mb-2.5">
                  <p className={sectionTitle} style={{ marginBottom: 0 }}>Conditional Formatting</p>
                  <button
                    onClick={() => setColFormatting((prev) => [
                      ...prev,
                      { id: `cf_${Date.now()}`, column: ds.table ? (table?.numericCols[0]?.name ?? '') : '', operator: 'gt', value: 0, style: 'bg-color', color: '#EF4444' },
                    ])}
                    className="flex items-center gap-1 rounded-lg border border-dashed border-gray-300 px-2 py-1 text-[11px] font-medium text-gray-500 transition-colors hover:border-blue-400 hover:text-blue-600 dark:border-gray-600 dark:text-gray-400"
                  >
                    <Plus className="h-3 w-3" /> Add Rule
                  </button>
                </div>

                {colFormatting.length === 0 && (
                  <p className="py-3 text-center text-xs text-gray-400 dark:text-gray-600">
                    No rules. Color-code cells by value ranges.
                  </p>
                )}

                <div className="space-y-2">
                  {colFormatting.map((rule) => (
                    <div key={rule.id} className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-2 dark:border-gray-700/60 dark:bg-gray-800/50">
                      {/* Row 1: column + operator */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">Column</label>
                          <select
                            value={rule.column}
                            onChange={(e) => setColFormatting((p) => p.map((r) => r.id === rule.id ? { ...r, column: e.target.value } : r))}
                            className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-800 outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                          >
                            <option value="">Select…</option>
                            {(table?.numericCols ?? []).map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                            {(table?.textCols ?? []).filter((c) => !(table?.numericCols ?? []).map((x) => x.name).includes(c.name)).map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">Condition</label>
                          <select
                            value={rule.operator}
                            onChange={(e) => setColFormatting((p) => p.map((r) => r.id === rule.id ? { ...r, operator: e.target.value as ColumnFormattingOperator } : r))}
                            className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-800 outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                          >
                            <option value="gt">&gt; Greater than</option>
                            <option value="gte">≥ Greater or equal</option>
                            <option value="lt">&lt; Less than</option>
                            <option value="lte">≤ Less or equal</option>
                            <option value="eq">= Equals</option>
                            <option value="between">↔ Between</option>
                          </select>
                        </div>
                      </div>

                      {/* Row 2: value(s) */}
                      <div className={`grid gap-2 ${rule.operator === 'between' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        <div>
                          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">
                            {rule.operator === 'between' ? 'Min Value' : 'Value'}
                          </label>
                          <input
                            type="number"
                            value={rule.value}
                            onChange={(e) => setColFormatting((p) => p.map((r) => r.id === rule.id ? { ...r, value: Number(e.target.value) } : r))}
                            className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                          />
                        </div>
                        {rule.operator === 'between' && (
                          <div>
                            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">Max Value</label>
                            <input
                              type="number"
                              value={rule.value2 ?? ''}
                              onChange={(e) => setColFormatting((p) => p.map((r) => r.id === rule.id ? { ...r, value2: Number(e.target.value) } : r))}
                              className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                            />
                          </div>
                        )}
                      </div>

                      {/* Row 3: style + color + delete */}
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">Style</label>
                          <select
                            value={rule.style}
                            onChange={(e) => setColFormatting((p) => p.map((r) => r.id === rule.id ? { ...r, style: e.target.value as ColumnFormattingStyle } : r))}
                            className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-800 outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                          >
                            <option value="bg-color">Background color</option>
                            <option value="text-color">Text color</option>
                            <option value="badge">Badge pill</option>
                            <option value="bar">Progress bar</option>
                            <option value="icon">Icon + color</option>
                          </select>
                        </div>
                        {/* Icon picker — only for icon style */}
                        {rule.style === 'icon' && (
                          <div className="flex-1">
                            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">Icon</label>
                            <select
                              value={rule.icon ?? 'arrow-up'}
                              onChange={(e) => setColFormatting((p) => p.map((r) => r.id === rule.id ? { ...r, icon: e.target.value as ColumnFormattingIcon } : r))}
                              className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-800 outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                            >
                              <option value="arrow-up">↑ Up</option>
                              <option value="arrow-down">↓ Down</option>
                              <option value="check">✓ Check</option>
                              <option value="x">✕ Cross</option>
                              <option value="warning">⚠ Warning</option>
                            </select>
                          </div>
                        )}
                        {/* Color swatch */}
                        <div className="flex-shrink-0">
                          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">Color</label>
                          <label className="relative block cursor-pointer">
                            <span className="block h-7 w-10 rounded-lg border border-gray-200 dark:border-gray-600" style={{ background: rule.color }} />
                            <input
                              type="color"
                              value={rule.color}
                              onChange={(e) => setColFormatting((p) => p.map((r) => r.id === rule.id ? { ...r, color: e.target.value } : r))}
                              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                            />
                          </label>
                        </div>
                        {/* Delete */}
                        <button
                          onClick={() => setColFormatting((p) => p.filter((r) => r.id !== rule.id))}
                          className="flex-shrink-0 rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── THRESHOLDS TAB (data widgets only) ───────────────────────────── */}
        {tab === 'thresholds' && !isContentWidget && (
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
                  {/* Alert toggle — stat-card and gauge only */}
                  {(widget.type === 'stat-card' || widget.type === 'gauge') && (
                    <div className="mt-3 flex items-center justify-between rounded-lg border border-gray-200 bg-white p-2.5 dark:border-gray-700 dark:bg-gray-900/40">
                      <div>
                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">In-app Alert</p>
                        <p className="text-[10px] text-gray-400">Show a toast when this threshold is breached</p>
                      </div>
                      <ToggleSwitch
                        value={!!thr.alertEnabled}
                        onChange={(v) => updateThreshold(thr.id, { alertEnabled: v })}
                      />
                    </div>
                  )}
                  {thr.alertEnabled && (widget.type === 'stat-card' || widget.type === 'gauge') && (
                    <div className="mt-2">
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">Alert when value is</label>
                      <div className="flex gap-2">
                        {(['above', 'below'] as const).map((dir) => (
                          <button
                            key={dir}
                            onClick={() => updateThreshold(thr.id, { alertDirection: dir })}
                            className={`flex-1 rounded-lg border py-1.5 text-xs font-medium capitalize transition-all ${
                              (thr.alertDirection ?? 'above') === dir
                                ? 'border-blue-500 bg-blue-50 text-blue-600 dark:border-blue-500 dark:bg-blue-900/20 dark:text-blue-300'
                                : 'border-gray-200 text-gray-500 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400'
                            }`}
                          >
                            {dir} threshold
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
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
            {(style.thresholds ?? []).length > 0 && isAxisChart && (
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

        {/* ── ANNOTATIONS TAB (line/area charts only) ──────────────────────── */}
        {tab === 'annotations' && isAnnotatableChart && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/60 p-3 dark:border-blue-800/40 dark:bg-blue-900/10">
              <Bookmark className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500" />
              <p className="text-xs text-blue-700 dark:text-blue-300/80">
                Event markers appear as vertical lines on the chart. The timestamp must match a value on the x-axis (e.g. <code className="rounded bg-blue-100 px-0.5 dark:bg-blue-800/40">2024-01-15 14:00</code>).
              </p>
            </div>

            {annotations.length === 0 && (
              <p className="py-4 text-center text-xs text-gray-400 dark:text-gray-600">
                No events yet. Add one below.
              </p>
            )}

            <div className="space-y-2">
              {annotations.map((ann) => (
                <div key={ann.id} className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-2 dark:border-gray-700/60 dark:bg-gray-800/50">
                  <div className="flex items-center gap-2">
                    {/* Color swatch */}
                    <label className="flex-shrink-0 relative">
                      <span className="block h-6 w-6 cursor-pointer rounded-md border border-gray-200 dark:border-gray-600" style={{ background: ann.color }} />
                      <input
                        type="color"
                        value={ann.color}
                        onChange={(e) => setAnnotations((prev) => prev.map((a) => a.id === ann.id ? { ...a, color: e.target.value } : a))}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </label>
                    {/* Label */}
                    <input
                      type="text"
                      value={ann.label}
                      onChange={(e) => setAnnotations((prev) => prev.map((a) => a.id === ann.id ? { ...a, label: e.target.value } : a))}
                      placeholder="Event label (e.g. Deploy v2.1)"
                      className={`${inputCls} flex-1 py-1.5 text-xs`}
                    />
                    {/* Delete */}
                    <button
                      onClick={() => setAnnotations((prev) => prev.filter((a) => a.id !== ann.id))}
                      className="flex-shrink-0 rounded p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {/* Timestamp */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={ann.timestamp}
                      onChange={(e) => setAnnotations((prev) => prev.map((a) => a.id === ann.id ? { ...a, timestamp: e.target.value } : a))}
                      placeholder="Timestamp (e.g. 2024-01-15T14:00:00)"
                      className={`${inputCls} flex-1 py-1.5 font-mono text-xs`}
                    />
                    {/* Type toggle */}
                    <select
                      value={ann.type}
                      onChange={(e) => setAnnotations((prev) => prev.map((a) => a.id === ann.id ? { ...a, type: e.target.value as 'line' | 'point' } : a))}
                      className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-800 outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                    >
                      <option value="line">Line</option>
                      <option value="point">Point</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setAnnotations((prev) => [
                ...prev,
                { id: `ann_${Date.now()}`, label: '', timestamp: '', color: '#F59E0B', type: 'line' },
              ])}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-gray-300 py-2.5 text-xs font-medium text-gray-500 transition-colors hover:border-blue-400 hover:text-blue-600 dark:border-gray-600 dark:text-gray-400 dark:hover:border-blue-500 dark:hover:text-blue-400"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Event Marker
            </button>
          </div>
        )}

        {/* ── SQL TAB (data widgets only) ───────────────────────────────────── */}
        {tab === 'sql' && !isContentWidget && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Auto-generated SQL. Edit to customize. Supported template variables:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {[
                '{{from}}', '{{to}}', '{{interval}}', '{{aggregation}}',
                '{{schema}}', '{{table}}', '{{tsCol}}', '{{metricCol}}', '{{groupCol}}', '{{limit}}',
                '{{xCol}}', '{{yCol}}',
                '{{openCol}}', '{{highCol}}', '{{lowCol}}', '{{closeCol}}',
                '{{kpiTargetExpr}}', '{{parentCol}}', '{{whereClause}}', '{{filterClause}}',
              ].map((v) => (
                <code key={v} className="rounded bg-gray-100 px-1 py-0.5 text-[11px] text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                  {v}
                </code>
              ))}
            </div>
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
