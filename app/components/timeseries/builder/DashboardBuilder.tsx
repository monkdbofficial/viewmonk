'use client';
import { useState, useCallback, useRef, useEffect } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import {
  Save, Eye, ArrowLeft, GripVertical, X,
  Check, ChevronDown, Layers, MousePointer,
  Undo2, Redo2, Copy, AlignLeft, AlertCircle,
  CheckCircle2, Database, Columns3, Lock, Unlock,
  Activity, TrendingUp, AreaChart, BarChart2, PieChart,
  Gauge, Table2, ScatterChart, Filter, LayoutGrid,
  CandlestickChart, BarChart, Type, Minus, Variable,
  Plus, Trash2,
} from 'lucide-react';
import WidgetPalette from './WidgetPalette';
import WidgetConfigDrawer from './WidgetConfigDrawer';
import WidgetRenderer from '../viewer/WidgetRenderer';
import { ALL_THEMES } from '@/app/lib/timeseries/themes';
import { getDefaultTimeRange } from '@/app/lib/timeseries/time-range';
import type {
  WidgetConfig, DashboardConfig, WidgetType,
  DashboardThemeId, GridPosition, DataSourceConfig, WidgetStyle, TimeRange,
  DashboardVariable, CalculatedMetric,
} from '@/app/lib/timeseries/types';
import { evalCalcMetric } from '@/app/lib/timeseries/calc-metrics';
import { ROW_HEIGHT, COL_COUNT, GAP } from '@/app/lib/timeseries/constants';

// ── Constants ────────────────────────────────────────────────────────────────

const DRAG_TYPE = 'CANVAS_WIDGET';

// ── Widget metadata ───────────────────────────────────────────────────────────

type WidgetIcon = React.ComponentType<{ className?: string }>;

const WIDGET_LABELS: Record<WidgetType, { Icon: WidgetIcon; label: string; color: string }> = {
  'stat-card':    { Icon: Activity,         label: 'Stat Card',       color: '#3B82F6' },
  'line-chart':   { Icon: TrendingUp,       label: 'Line Chart',      color: '#06B6D4' },
  'area-chart':   { Icon: AreaChart,        label: 'Area Chart',      color: '#6366F1' },
  'bar-chart':    { Icon: BarChart2,        label: 'Bar Chart',       color: '#8B5CF6' },
  'pie-chart':    { Icon: PieChart,         label: 'Pie Chart',       color: '#EC4899' },
  'gauge':        { Icon: Gauge,            label: 'Gauge',           color: '#F59E0B' },
  'heatmap':      { Icon: Layers,           label: 'Heatmap',         color: '#10B981' },
  'data-table':   { Icon: Table2,           label: 'Data Table',      color: '#6B7280' },
  'scatter-chart':{ Icon: ScatterChart,     label: 'Scatter Plot',    color: '#8B5CF6' },
  'funnel-chart': { Icon: Filter,           label: 'Funnel Chart',    color: '#F97316' },
  'treemap':      { Icon: LayoutGrid,       label: 'Treemap',         color: '#14B8A6' },
  'candlestick':  { Icon: CandlestickChart, label: 'Candlestick',     color: '#10B981' },
  'progress-kpi': { Icon: BarChart,         label: 'Progress KPI',    color: '#3B82F6' },
  'text-widget':  { Icon: Type,             label: 'Text / Note',     color: '#64748B' },
  'divider':      { Icon: Minus,            label: 'Section Divider', color: '#94A3B8' },
};

// ── Per-widget-type guidance shown in unconfigured placeholder ────────────────

const WIDGET_HINTS: Record<WidgetType, { desc: string; needs: string[] }> = {
  'stat-card':    { desc: 'Displays a single aggregated value',         needs: ['Numeric metric column'] },
  'line-chart':   { desc: 'Plots a metric as a trend over time',        needs: ['Timestamp column', 'Numeric metric'] },
  'area-chart':   { desc: 'Filled area trend over time',                needs: ['Timestamp column', 'Numeric metric'] },
  'bar-chart':    { desc: 'Compares values across time or groups',      needs: ['Timestamp / Group column', 'Numeric metric'] },
  'pie-chart':    { desc: 'Proportion of each category in the whole',   needs: ['Group column', 'Numeric metric'] },
  'gauge':        { desc: 'Single value shown against a target range',  needs: ['Numeric metric column'] },
  'heatmap':      { desc: 'Colour intensity across time buckets',       needs: ['Timestamp column', 'Numeric metric'] },
  'data-table':   { desc: 'Raw rows from your table',                   needs: ['Any columns'] },
  'scatter-chart':{ desc: 'Correlation between two numeric metrics',    needs: ['X numeric column', 'Y numeric column'] },
  'funnel-chart': { desc: 'Stage-by-stage conversion or drop-off',      needs: ['Category column', 'Numeric metric'] },
  'treemap':      { desc: 'Hierarchical part-of-whole breakdown',       needs: ['Label column', 'Numeric metric'] },
  'candlestick':  { desc: 'Open / High / Low / Close financial data',   needs: ['Timestamp column', 'Open, High, Low, Close cols'] },
  'progress-kpi': { desc: 'Progress bar toward a defined KPI target',   needs: ['Numeric metric column', 'KPI target value'] },
  'text-widget':  { desc: 'Markdown text — headers, bullets, bold',     needs: [] },
  'divider':      { desc: 'Visual separator between dashboard sections', needs: [] },
};

const DEFAULT_SIZES: Record<WidgetType, { w: number; h: number }> = {
  'stat-card':    { w: 3, h: 1 },
  'line-chart':   { w: 6, h: 2 },
  'area-chart':   { w: 6, h: 2 },
  'bar-chart':    { w: 4, h: 2 },
  'pie-chart':    { w: 4, h: 2 },
  'gauge':        { w: 3, h: 2 },
  'heatmap':      { w: 6, h: 2 },
  'data-table':   { w: 6, h: 3 },
  'scatter-chart':{ w: 6, h: 2 },
  'funnel-chart': { w: 4, h: 3 },
  'treemap':      { w: 6, h: 2 },
  'candlestick':  { w: 8, h: 2 },
  'progress-kpi': { w: 4, h: 2 },
  'text-widget':  { w: 6, h: 2 },
  'divider':      { w: 12, h: 1 },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeWidgetId(): string {
  return `wgt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function findAutoPosition(type: WidgetType, widgets: WidgetConfig[]): GridPosition {
  const { w, h } = DEFAULT_SIZES[type];
  if (widgets.length === 0) return { x: 0, y: 0, w, h };
  const maxY = widgets.reduce((m, wgt) => Math.max(m, wgt.position.y + wgt.position.h), 0);
  for (let row = 0; row < maxY; row++) {
    for (let col = 0; col <= COL_COUNT - w; col++) {
      const fits = !widgets.some((wgt) => {
        const { x: wx, y: wy, w: ww, h: wh } = wgt.position;
        return !(col + w <= wx || col >= wx + ww || row + h <= wy || row >= wy + wh);
      });
      if (fits) return { x: col, y: row, w, h };
    }
  }
  return { x: 0, y: maxY, w, h };
}

function makeDefaultWidget(type: WidgetType, position: GridPosition): WidgetConfig {
  const ds: DataSourceConfig = {
    schema: 'monkdb', table: '', timestampCol: '', metricCol: '',
    aggregation: 'AVG', limit: 50,
  };
  const style: WidgetStyle = {
    colorScheme: 'blue', showLegend: true, showGrid: true,
    customColors: [], thresholds: [],
  };
  return { id: makeWidgetId(), type, title: WIDGET_LABELS[type].label, position, dataSource: ds, style };
}

function clampPosition(pos: GridPosition): GridPosition {
  const w = Math.max(1, Math.min(pos.w, COL_COUNT));
  const h = Math.max(1, pos.h);
  return { x: Math.max(0, Math.min(pos.x, COL_COUNT - w)), y: Math.max(0, pos.y), w, h };
}

// ── Undo/redo history ─────────────────────────────────────────────────────────

function useHistory<T>(initial: T) {
  const [history, setHistory] = useState<T[]>([initial]);
  const [cursor,  setCursor]  = useState(0);

  const current = history[cursor];

  const push = useCallback((next: T) => {
    setHistory((h) => [...h.slice(0, cursor + 1), next]);
    setCursor((c) => c + 1);
  }, [cursor]);

  const undo = useCallback(() => setCursor((c) => Math.max(0, c - 1)), []);
  const redo = useCallback(() => setCursor((c) => Math.min(history.length - 1, c + 1)), [history.length]);

  return { current, push, undo, redo, canUndo: cursor > 0, canRedo: cursor < history.length - 1 };
}

// ── Draggable Canvas Widget ───────────────────────────────────────────────────

interface CanvasWidgetProps {
  widget: WidgetConfig;
  isSelected: boolean;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  themeId: DashboardThemeId;
  previewTimeRange: TimeRange;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onResize: (id: string, w: number, h: number) => void;
}

function CanvasWidget({ widget, isSelected, canvasRef, themeId, previewTimeRange, onSelect, onDelete, onResize }: CanvasWidgetProps) {
  const [{ isDragging }, drag, dragPreview] = useDrag({
    type: DRAG_TYPE,
    item: () => ({ id: widget.id }),
    canDrag: () => !widget.locked,
    collect: (m) => ({ isDragging: m.isDragging() }),
  });

  const { x, y, w, h } = widget.position;
  const colW = `calc((100% - ${(COL_COUNT - 1) * GAP}px) / ${COL_COUNT})`;
  const meta     = WIDGET_LABELS[widget.type];
  const hint     = WIDGET_HINTS[widget.type];
  const isLocked = !!widget.locked;
  // Content widgets (text, divider) never need a data source — always show live
  const isContent  = widget.type === 'text-widget' || widget.type === 'divider';
  const hasTable   = !!widget.dataSource?.table;
  const hasLiveData = isContent || !!(widget.dataSource?.table && widget.dataSource?.metricCol);

  // Resize via mouse events on bottom-right corner handle
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = w;
    const startH = h;

    const onMouseMove = (ev: MouseEvent) => {
      const canvasEl = canvasRef.current;
      if (!canvasEl) return;
      const canvasWidth = canvasEl.offsetWidth;
      const colPx = (canvasWidth - (COL_COUNT - 1) * GAP) / COL_COUNT;
      const dw = Math.round((ev.clientX - startX) / (colPx + GAP));
      const dh = Math.round((ev.clientY - startY) / (ROW_HEIGHT + GAP));
      const newW = Math.max(1, Math.min(COL_COUNT - x, startW + dw));
      const newH = Math.max(1, startH + dh);
      onResize(widget.id, newW, newH);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div
      ref={dragPreview as (el: HTMLDivElement | null) => void}
      className="absolute transition-opacity duration-150"
      style={{
        left:    `calc(${x} * (${colW} + ${GAP}px))`,
        top:     `${y * (ROW_HEIGHT + GAP)}px`,
        width:   `calc(${w} * ${colW} + ${(w - 1) * GAP}px)`,
        height:  `${h * ROW_HEIGHT + (h - 1) * GAP}px`,
        opacity: isDragging ? 0.2 : 1,
        zIndex:  isSelected ? 20 : 10,
      }}
      onClick={(e) => { e.stopPropagation(); onSelect(widget.id); }}
    >
      <div
        className={`group relative h-full w-full overflow-hidden rounded-xl border-2 transition-all duration-150 ${
          isSelected
            ? 'border-blue-500 shadow-lg shadow-blue-500/20 ring-2 ring-blue-500/25'
            : hasLiveData
              ? 'border-gray-200 hover:border-gray-300 dark:border-gray-700/60 dark:hover:border-gray-600/80'
              : 'border-dashed border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50 dark:border-gray-600/40 dark:bg-white/[0.02] dark:hover:border-gray-500/60 dark:hover:bg-white/[0.04]'
        }`}
      >
        {/* Drag handle — hidden when locked */}
        {!isLocked && (
          <div
            ref={drag as (el: HTMLDivElement | null) => void}
            className="absolute left-2 top-2 z-20 cursor-grab rounded p-1 text-gray-400 opacity-0 transition-all group-hover:opacity-100 hover:bg-gray-200 hover:text-gray-700 active:cursor-grabbing dark:text-gray-500 dark:hover:bg-white/10 dark:hover:text-gray-300"
            onClick={(e) => e.stopPropagation()}
            title="Drag to move"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </div>
        )}

        {/* Lock badge — shown when locked */}
        {isLocked && (
          <div className="absolute left-2 top-2 z-20 rounded p-1 text-amber-400 dark:text-amber-500" title="Widget is locked">
            <Lock className="h-3 w-3" />
          </div>
        )}

        {/* Delete button — hidden when locked */}
        {!isLocked && (
          <button
            className="absolute right-2 top-2 z-20 rounded p-1 text-gray-400 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 dark:text-gray-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
            onClick={(e) => { e.stopPropagation(); onDelete(widget.id); }}
            title="Delete widget"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}

        {hasLiveData ? (
          /* ── Live chart preview ── */
          <div className="h-full w-full" onClick={(e) => e.stopPropagation()}>
            <WidgetRenderer
              widget={widget}
              themeId={themeId}
              timeRange={previewTimeRange}
              activeFilter={null}
              builderMode
            />
          </div>
        ) : (
          /* ── Unconfigured placeholder ── */
          <div className="flex h-full flex-col items-center justify-center gap-2.5 px-6 py-4">
            {/* Icon + title + description */}
            <div className="flex flex-col items-center gap-1">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ background: `${meta.color}20` }}
              >
                <meta.Icon className="h-5 w-5" style={{ color: meta.color }} />
              </div>
              <p className="max-w-full truncate text-sm font-semibold text-gray-700 dark:text-gray-200">
                {widget.title || meta.label}
              </p>
              <p className="text-center text-[11px] leading-tight text-gray-400 dark:text-gray-500">
                {hint.desc}
              </p>
            </div>

            {/* Required data chips */}
            <div className="flex flex-wrap justify-center gap-1">
              {hint.needs.map((n) => (
                <span
                  key={n}
                  className="flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] text-gray-500 dark:border-gray-700/60 dark:bg-gray-800/40 dark:text-gray-400"
                >
                  <span className="h-1 w-1 rounded-full bg-current opacity-60" />
                  {n}
                </span>
              ))}
            </div>

            {/* Setup progress: step 1 → step 2 */}
            <div className="flex items-center gap-1.5 text-[11px]">
              {hasTable ? (
                <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" />
                  {widget.dataSource.schema}.{widget.dataSource.table}
                </span>
              ) : (
                <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 font-medium text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                  <Database className="h-3 w-3" />
                  Select a table
                </span>
              )}
              <span className="text-gray-300 dark:text-gray-700">›</span>
              <span className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 font-medium ${
                hasTable
                  ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'
                  : 'bg-gray-100 text-gray-400 dark:bg-gray-800/50 dark:text-gray-600'
              }`}>
                <Columns3 className="h-3 w-3" />
                Set columns
              </span>
            </div>
          </div>
        )}

        {/* Position / size badge */}
        <div className="absolute bottom-1.5 left-2 z-10 text-xs font-mono text-gray-400 opacity-0 transition-opacity group-hover:opacity-100 dark:text-gray-600">
          {w}×{h} @ ({x},{y})
        </div>

        {/* Resize handle — bottom-right corner, hidden when locked */}
        {!isLocked && (
          <div
            className="absolute bottom-0 right-0 z-20 h-5 w-5 cursor-se-resize rounded-br-xl"
            onMouseDown={handleResizeMouseDown}
            title="Drag to resize"
          >
            <svg className="absolute bottom-1.5 right-1.5 text-gray-300 dark:text-gray-500" width="8" height="8" viewBox="0 0 8 8">
              <path d="M7,1 L7,7 L1,7" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Builder Canvas ────────────────────────────────────────────────────────────

interface BuilderCanvasProps {
  widgets: WidgetConfig[];
  selectedId: string | null;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  themeId: DashboardThemeId;
  previewTimeRange: TimeRange;
  onSelectWidget: (id: string | null) => void;
  onDeleteWidget: (id: string) => void;
  onMoveWidget: (id: string, newPos: GridPosition) => void;
  onResizeWidget: (id: string, w: number, h: number) => void;
}

function BuilderCanvas({
  widgets, selectedId, canvasRef, themeId, previewTimeRange,
  onSelectWidget, onDeleteWidget, onMoveWidget, onResizeWidget,
}: BuilderCanvasProps) {
  const [, drop] = useDrop<{ id: string }, void, object>({
    accept: DRAG_TYPE,
    drop: (item, monitor) => {
      const offset = monitor.getClientOffset();
      const rect   = canvasRef.current?.getBoundingClientRect();
      if (!offset || !rect) return;
      const relX  = offset.x - rect.left;
      const relY  = offset.y - rect.top;
      const colPx = (rect.width - (COL_COUNT - 1) * GAP) / COL_COUNT;
      const gridX = Math.floor(relX / (colPx + GAP));
      const gridY = Math.floor(relY / (ROW_HEIGHT + GAP));
      const widget = widgets.find((w) => w.id === item.id);
      if (!widget) return;
      onMoveWidget(item.id, clampPosition({ x: gridX, y: gridY, w: widget.position.w, h: widget.position.h }));
    },
  });

  const maxRow = widgets.reduce((m, w) => Math.max(m, w.position.y + w.position.h), 0);
  const canvasHeight = Math.max(maxRow + 3, 6) * (ROW_HEIGHT + GAP) + GAP;

  const setCanvasRef = useCallback((el: HTMLDivElement | null) => {
    (canvasRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
    drop(el);
  }, [canvasRef, drop]);

  return (
    <div className="flex-1 overflow-auto bg-slate-50 p-4 dark:bg-[#07101E]">
      <div
        ref={setCanvasRef}
        className="relative mx-auto w-full group"
        style={{ height: canvasHeight, maxWidth: 1400, minHeight: 600 }}
        onClick={() => onSelectWidget(null)}
      >
        {/* Dot grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04] dark:opacity-[0.06]"
          style={{
            backgroundImage: 'radial-gradient(circle, #94a3b8 1px, transparent 1px)',
            backgroundSize: `calc((100% - ${(COL_COUNT - 1) * GAP}px) / ${COL_COUNT} + ${GAP}px) ${ROW_HEIGHT + GAP}px`,
          }}
        />

        {/* Empty state */}
        {widgets.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-100 dark:border-gray-700/60 dark:bg-gray-800/30">
                <Layers className="h-7 w-7 text-gray-400 dark:text-gray-600" />
              </div>
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-500">Canvas is empty</p>
              <p className="mt-1.5 flex items-center justify-center gap-1.5 text-xs text-gray-400 dark:text-gray-700">
                <MousePointer className="h-3.5 w-3.5" />
                Click a widget type in the left panel to add it
              </p>
            </div>
          </div>
        )}

        {/* Widgets */}
        {widgets.map((widget) => (
          <CanvasWidget
            key={widget.id}
            widget={widget}
            isSelected={selectedId === widget.id}
            canvasRef={canvasRef}
            themeId={themeId}
            previewTimeRange={previewTimeRange}
            onSelect={onSelectWidget}
            onDelete={onDeleteWidget}
            onResize={onResizeWidget}
          />
        ))}
      </div>
    </div>
  );
}

// ── Theme Picker ──────────────────────────────────────────────────────────────

interface ThemePickerProps {
  value: DashboardThemeId;
  onChange: (id: DashboardThemeId) => void;
}

function ThemePicker({ value, onChange }: ThemePickerProps) {
  const [open, setOpen] = useState(false);
  const current = ALL_THEMES.find((t) => t.id === value) ?? ALL_THEMES[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800/80 dark:text-gray-200 dark:hover:border-gray-600 dark:hover:bg-gray-800"
      >
        <span className="inline-block h-3 w-3 rounded-full" style={{ background: current.accentPrimary }} />
        {current.name}
        <ChevronDown className="h-3 w-3 text-gray-400 dark:text-gray-500" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-1.5 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
            <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Select Theme</div>
            {ALL_THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => { onChange(t.id); setOpen(false); }}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-xs transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <span className="h-3.5 w-3.5 flex-shrink-0 rounded-full" style={{ background: t.accentPrimary }} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-800 dark:text-gray-200">{t.name}</p>
                  <p className="truncate text-gray-400 dark:text-gray-600">{t.description}</p>
                </div>
                {t.id === value && <Check className="h-3.5 w-3.5 flex-shrink-0 text-blue-500 dark:text-blue-400" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Variable Manager Dialog ───────────────────────────────────────────────────

function makeVarId() { return `var_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`; }

interface ManageVariablesDialogProps {
  variables: DashboardVariable[];
  onSave: (vars: DashboardVariable[]) => void;
  onClose: () => void;
}

function ManageVariablesDialog({ variables: initial, onSave, onClose }: ManageVariablesDialogProps) {
  const [vars, setVars] = useState<DashboardVariable[]>(initial);

  const addVar = () => {
    const newVar: DashboardVariable = {
      id: makeVarId(), name: '', label: '', type: 'textbox', defaultValue: '',
    };
    setVars((v) => [...v, newVar]);
  };

  const updateVar = (id: string, patch: Partial<DashboardVariable>) => {
    setVars((v) => v.map((vr) => vr.id === id ? { ...vr, ...patch } : vr));
  };

  const removeVar = (id: string) => {
    setVars((v) => v.filter((vr) => vr.id !== id));
  };

  const handleSave = () => {
    // Filter out vars with no name
    onSave(vars.filter((v) => v.name.trim()));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <Variable className="h-4 w-4 text-blue-500" />
          <h2 className="flex-1 text-sm font-bold text-gray-900 dark:text-white">Dashboard Variables</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Info */}
        <div className="border-b border-gray-100 bg-blue-50/60 px-5 py-2.5 dark:border-gray-800 dark:bg-blue-900/10">
          <p className="text-xs text-blue-700 dark:text-blue-300/80">
            Variables are referenced in SQL as <code className="rounded bg-blue-100 px-1 text-blue-800 dark:bg-blue-800/40 dark:text-blue-200">{'{{var_name}}'}</code> and can be changed at view time without editing the dashboard.
          </p>
        </div>

        {/* Variable list */}
        <div className="max-h-[400px] overflow-y-auto px-5 py-4 space-y-3">
          {vars.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-6 dark:text-gray-600">No variables yet. Click below to add one.</p>
          )}
          {vars.map((v) => (
            <div key={v.id} className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700/60 dark:bg-gray-800/50">
              <div className="grid grid-cols-2 gap-2">
                {/* Name */}
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">Variable Name</label>
                  <input
                    type="text"
                    value={v.name}
                    onChange={(e) => updateVar(v.id, { name: e.target.value.replace(/\s/g, '_') })}
                    placeholder="e.g. region"
                    className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-800 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
                  />
                  <p className="mt-0.5 text-[10px] text-gray-400">Used as <code className="text-blue-500">{`{{${v.name || 'name'}}}`}</code> in SQL</p>
                </div>
                {/* Label */}
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">Display Label</label>
                  <input
                    type="text"
                    value={v.label}
                    onChange={(e) => updateVar(v.id, { label: e.target.value })}
                    placeholder="e.g. Region"
                    className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-800 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
                  />
                </div>
                {/* Type */}
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">Type</label>
                  <select
                    value={v.type}
                    onChange={(e) => updateVar(v.id, { type: e.target.value as DashboardVariable['type'] })}
                    className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-800 outline-none focus:border-blue-400 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
                  >
                    <option value="textbox">Text Input</option>
                    <option value="dropdown">Dropdown</option>
                    <option value="constant">Constant</option>
                  </select>
                </div>
                {/* Default value */}
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">Default Value</label>
                  <input
                    type="text"
                    value={v.defaultValue}
                    onChange={(e) => updateVar(v.id, { defaultValue: e.target.value })}
                    placeholder="Default value"
                    className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-800 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
                  />
                </div>
              </div>
              {/* Options (dropdown only) */}
              {v.type === 'dropdown' && (
                <div className="mt-2">
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">Options (comma-separated)</label>
                  <input
                    type="text"
                    value={v.options?.join(', ') ?? ''}
                    onChange={(e) => updateVar(v.id, { options: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                    placeholder="e.g. us-east, eu-west, ap-south"
                    className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-800 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
                  />
                </div>
              )}
              {/* Delete */}
              <div className="mt-2 flex justify-end">
                <button
                  onClick={() => removeVar(v.id)}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-red-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                >
                  <Trash2 className="h-3 w-3" />
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 border-t border-gray-100 px-5 py-3 dark:border-gray-800">
          <button
            onClick={addVar}
            className="flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-blue-400 hover:text-blue-600 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-blue-500 dark:hover:text-blue-400"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Variable
          </button>
          <div className="flex-1" />
          <button onClick={onClose} className="rounded-lg px-4 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800">
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-500"
          >
            <Check className="h-3.5 w-3.5" />
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Calculated Metrics Dialog ─────────────────────────────────────────────────

function makeCalcId() { return `calc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`; }

interface ManageCalcMetricsDialogProps {
  metrics: CalculatedMetric[];
  variables: DashboardVariable[];
  onSave: (metrics: CalculatedMetric[]) => void;
  onClose: () => void;
}

function ManageCalcMetricsDialog({ metrics: initial, variables, onSave, onClose }: ManageCalcMetricsDialogProps) {
  const [items, setItems] = useState<CalculatedMetric[]>(initial);

  const addMetric = () => {
    setItems((m) => [...m, { id: makeCalcId(), name: '', label: '', formula: '', unit: '', decimals: 2 }]);
  };

  const update = (id: string, patch: Partial<CalculatedMetric>) => {
    setItems((m) => m.map((x) => x.id === id ? { ...x, ...patch } : x));
  };

  const remove = (id: string) => setItems((m) => m.filter((x) => x.id !== id));

  const handleSave = () => {
    onSave(items.filter((m) => m.name.trim() && m.formula.trim()));
    onClose();
  };

  // Preview evaluation against variable defaults
  const varDefaults: Record<string, string> = {};
  for (const v of variables) varDefaults[v.name] = v.defaultValue;

  const inputCls = 'w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-800 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <Columns3 className="h-4 w-4 text-purple-500" />
          <h2 className="flex-1 text-sm font-bold text-gray-900 dark:text-white">Calculated Metrics</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Info */}
        <div className="border-b border-gray-100 bg-purple-50/60 px-5 py-2.5 dark:border-gray-800 dark:bg-purple-900/10">
          <p className="text-xs text-purple-700 dark:text-purple-300/80">
            Write arithmetic formulas using numeric literals and{' '}
            <code className="rounded bg-purple-100 px-1 text-purple-800 dark:bg-purple-800/40 dark:text-purple-200">{'{{var_name}}'}</code>{' '}
            references. Results are injected into widget SQL as{' '}
            <code className="rounded bg-purple-100 px-1 text-purple-800 dark:bg-purple-800/40 dark:text-purple-200">{'{{metric_name}}'}</code>.
          </p>
        </div>

        {/* List */}
        <div className="max-h-[420px] overflow-y-auto px-5 py-4 space-y-3">
          {items.length === 0 && (
            <p className="py-6 text-center text-sm text-gray-400 dark:text-gray-600">
              No calculated metrics yet. Click below to add one.
            </p>
          )}
          {items.map((m) => {
            const preview = evalCalcMetric(m.formula, varDefaults);
            return (
              <div key={m.id} className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700/60 dark:bg-gray-800/50">
                <div className="grid grid-cols-2 gap-2">
                  {/* Name */}
                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">Metric Name</label>
                    <input
                      type="text"
                      value={m.name}
                      onChange={(e) => update(m.id, { name: e.target.value.replace(/\s/g, '_') })}
                      placeholder="e.g. profit_margin"
                      className={inputCls}
                    />
                    <p className="mt-0.5 text-[10px] text-gray-400">
                      SQL key: <code className="text-purple-500">{`{{${m.name || 'name'}}}`}</code>
                    </p>
                  </div>
                  {/* Label */}
                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">Display Label</label>
                    <input
                      type="text"
                      value={m.label}
                      onChange={(e) => update(m.id, { label: e.target.value })}
                      placeholder="e.g. Profit Margin"
                      className={inputCls}
                    />
                  </div>
                  {/* Formula — full width */}
                  <div className="col-span-2">
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">Formula</label>
                    <input
                      type="text"
                      value={m.formula}
                      onChange={(e) => update(m.id, { formula: e.target.value })}
                      placeholder={`e.g. ({{revenue}} - {{cost}}) / {{revenue}} * 100`}
                      className={inputCls}
                      spellCheck={false}
                    />
                  </div>
                  {/* Unit */}
                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">Unit <span className="font-normal normal-case">(optional)</span></label>
                    <input
                      type="text"
                      value={m.unit ?? ''}
                      onChange={(e) => update(m.id, { unit: e.target.value || undefined })}
                      placeholder="e.g. % ms $ km"
                      className={inputCls}
                    />
                  </div>
                  {/* Decimals */}
                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">Decimals</label>
                    <select
                      value={m.decimals ?? 2}
                      onChange={(e) => update(m.id, { decimals: Number(e.target.value) })}
                      className={inputCls}
                    >
                      {[0, 1, 2, 3, 4].map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>

                {/* Preview + delete row */}
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[11px] text-gray-400">
                    Preview:{' '}
                    {preview !== null
                      ? <span className="font-semibold text-purple-600 dark:text-purple-400">
                          {preview.toFixed(m.decimals ?? 2)}{m.unit ? ` ${m.unit}` : ''}
                        </span>
                      : <span className="italic text-red-400">invalid formula</span>
                    }
                  </span>
                  <button
                    onClick={() => remove(m.id)}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-red-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                  >
                    <Trash2 className="h-3 w-3" />
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 border-t border-gray-100 px-5 py-3 dark:border-gray-800">
          <button
            onClick={addMetric}
            className="flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-purple-400 hover:text-purple-600 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-purple-500 dark:hover:text-purple-400"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Metric
          </button>
          <div className="flex-1" />
          <button onClick={onClose} className="rounded-lg px-4 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800">
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-purple-500"
          >
            <Check className="h-3.5 w-3.5" />
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main DashboardBuilder ─────────────────────────────────────────────────────

export interface DashboardBuilderProps {
  config: DashboardConfig;
  fromTemplate?: boolean;
  onSave: (config: DashboardConfig) => void;
  onPreview: (config: DashboardConfig) => void;
  onBack: () => void;
}

function BuilderInner({ config, fromTemplate, onSave, onPreview, onBack }: DashboardBuilderProps) {
  const [name,        setName]        = useState(config.name);
  const [description, setDescription] = useState(config.description ?? '');
  const [themeId,     setThemeId]     = useState<DashboardThemeId>(config.themeId);
  const [variables,        setVariables]        = useState<DashboardVariable[]>(config.variables ?? []);
  const [calcMetrics,      setCalcMetrics]      = useState<CalculatedMetric[]>(config.calculatedMetrics ?? []);
  const [showVarDialog,    setShowVarDialog]    = useState(false);
  const [showCalcDialog,   setShowCalcDialog]   = useState(false);
  const [previewTimeRange]            = useState<TimeRange>(() => getDefaultTimeRange());
  const [setupBannerDismissed, setSetupBannerDismissed] = useState(false);

  // Auto-select the first unconfigured widget when entering from a template
  const firstUnconfiguredId = config.widgets.find((w) => !w.dataSource.table)?.id ?? null;
  const [selectedId, setSelectedId] = useState<string | null>(fromTemplate ? firstUnconfiguredId : null);
  const [isDirty,    setIsDirty]    = useState(false);
  const [saved,      setSaved]      = useState(false);
  const canvasRef = useRef<HTMLDivElement | null>(null);

  const { current: widgets, push: pushHistory, undo, redo, canUndo, canRedo } = useHistory<WidgetConfig[]>(config.widgets);

  const markDirty = useCallback(() => { setIsDirty(true); setSaved(false); }, []);

  const setWidgets = useCallback((updater: WidgetConfig[] | ((prev: WidgetConfig[]) => WidgetConfig[])) => {
    const next = typeof updater === 'function' ? updater(widgets) : updater;
    pushHistory(next);
    markDirty();
  }, [widgets, pushHistory, markDirty]);

  const selectedWidget = widgets.find((w) => w.id === selectedId) ?? null;

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          setWidgets((prev) => prev.filter((w) => w.id !== selectedId));
          setSelectedId(null);
        }
      }
      if (e.key === 'Escape') setSelectedId(null);
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedId, setWidgets, undo, redo]);

  const handleAddWidget = useCallback((type: WidgetType) => {
    setWidgets((prev) => {
      const position = findAutoPosition(type, prev);
      const widget = makeDefaultWidget(type, position);
      setSelectedId(widget.id);
      return [...prev, widget];
    });
  }, [setWidgets]);

  const handleDeleteWidget = useCallback((id: string) => {
    setWidgets((prev) => prev.filter((w) => w.id !== id));
    setSelectedId((sel) => sel === id ? null : sel);
  }, [setWidgets]);

  const handleMoveWidget = useCallback((id: string, newPos: GridPosition) => {
    setWidgets((prev) => prev.map((w) => w.id === id ? { ...w, position: newPos } : w));
  }, [setWidgets]);

  const handleResizeWidget = useCallback((id: string, newW: number, newH: number) => {
    setWidgets((prev) => prev.map((w) => w.id === id ? { ...w, position: { ...w.position, w: newW, h: newH } } : w));
  }, [setWidgets]);

  const handleUpdateWidget = useCallback((updated: WidgetConfig) => {
    setWidgets((prev) => prev.map((w) => w.id === updated.id ? updated : w));
  }, [setWidgets]);

  const handleDuplicateWidget = useCallback((id: string) => {
    const original = widgets.find((w) => w.id === id);
    if (!original) return;
    const copy: WidgetConfig = {
      ...original,
      id: makeWidgetId(),
      locked: false,
      position: { ...original.position, y: original.position.y + original.position.h },
    };
    setWidgets((prev) => [...prev, copy]);
    setSelectedId(copy.id);
  }, [widgets, setWidgets]);

  const handleToggleLock = useCallback((id: string) => {
    setWidgets((prev) => prev.map((w) => w.id === id ? { ...w, locked: !w.locked } : w));
  }, [setWidgets]);

  const buildConfig = useCallback((): DashboardConfig => ({
    ...config, name, description: description.trim() || undefined, themeId, widgets,
    variables: variables.length ? variables : undefined,
    calculatedMetrics: calcMetrics.length ? calcMetrics : undefined,
    updatedAt: new Date().toISOString(),
  }), [config, name, description, themeId, widgets, variables, calcMetrics]);

  const handleSave = () => {
    onSave(buildConfig());
    setIsDirty(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="flex h-full flex-col bg-gray-50 dark:bg-gray-950">
      {/* Variables dialog */}
      {showVarDialog && (
        <ManageVariablesDialog
          variables={variables}
          onSave={(vars) => { setVariables(vars); markDirty(); }}
          onClose={() => setShowVarDialog(false)}
        />
      )}
      {/* Calculated metrics dialog */}
      {showCalcDialog && (
        <ManageCalcMetricsDialog
          metrics={calcMetrics}
          variables={variables}
          onSave={(m) => { setCalcMetrics(m); markDirty(); }}
          onClose={() => setShowCalcDialog(false)}
        />
      )}
      {/* ── Toolbar ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-shrink-0 items-center gap-2 border-b border-gray-200 bg-white px-3 py-2 dark:border-gray-800/80 dark:bg-gray-900">
        <button
          onClick={onBack}
          className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
          title="Back to dashboards"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div className="h-4 w-px bg-gray-200 dark:bg-gray-800" />

        <input
          type="text"
          value={name}
          onChange={(e) => { setName(e.target.value); markDirty(); }}
          className="max-w-[180px] flex-shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-900 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          placeholder="Dashboard name"
        />

        <ThemePicker value={themeId} onChange={(id) => { setThemeId(id); markDirty(); }} />

        {/* Variables button */}
        <button
          onClick={() => setShowVarDialog(true)}
          className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
            variables.length > 0
              ? 'border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-300 dark:border-blue-700/50 dark:bg-blue-600/10 dark:text-blue-400 dark:hover:border-blue-600/70'
              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-200'
          }`}
          title="Manage dashboard variables"
        >
          <Variable className="h-3.5 w-3.5" />
          Vars{variables.length > 0 && <span className="ml-0.5 rounded-full bg-blue-500 px-1.5 py-0.5 text-[9px] font-bold text-white leading-none">{variables.length}</span>}
        </button>

        {/* Calculated metrics button */}
        <button
          onClick={() => setShowCalcDialog(true)}
          className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
            calcMetrics.length > 0
              ? 'border-purple-200 bg-purple-50 text-purple-700 hover:border-purple-300 dark:border-purple-700/50 dark:bg-purple-600/10 dark:text-purple-400 dark:hover:border-purple-600/70'
              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-200'
          }`}
          title="Manage calculated metrics"
        >
          <Columns3 className="h-3.5 w-3.5" />
          Calc{calcMetrics.length > 0 && <span className="ml-0.5 rounded-full bg-purple-500 px-1.5 py-0.5 text-[9px] font-bold text-white leading-none">{calcMetrics.length}</span>}
        </button>

        {/* Undo/Redo */}
        <div className="flex items-center gap-1">
          <button
            onClick={undo}
            disabled={!canUndo}
            className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-30 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
            title="Undo (⌘Z)"
          >
            <Undo2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-30 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
            title="Redo (⌘Y)"
          >
            <Redo2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Duplicate + Lock for selected widget */}
        {selectedId && (() => {
          const sel = widgets.find((w) => w.id === selectedId);
          return (
            <>
              <button
                onClick={() => handleDuplicateWidget(selectedId)}
                className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-blue-600 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-blue-400"
                title="Duplicate widget"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => handleToggleLock(selectedId)}
                className={`rounded-lg p-1.5 transition-colors ${
                  sel?.locked
                    ? 'text-amber-500 hover:bg-amber-50 hover:text-amber-600 dark:text-amber-400 dark:hover:bg-amber-500/10'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800'
                }`}
                title={sel?.locked ? 'Unlock widget (allow move & resize)' : 'Lock widget (prevent move & resize)'}
              >
                {sel?.locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
              </button>
            </>
          );
        })()}

        <div className="flex-1" />

        {/* Keyboard hints */}
        <span className="hidden items-center gap-3 text-xs text-gray-400 dark:text-gray-600 lg:flex">
          <span><kbd className="rounded bg-gray-100 px-1 text-gray-500 dark:bg-gray-800 dark:text-gray-500">Del</kbd> remove</span>
          <span><kbd className="rounded bg-gray-100 px-1 text-gray-500 dark:bg-gray-800 dark:text-gray-500">Esc</kbd> deselect</span>
        </span>

        {/* Widget count */}
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-500">
          {widgets.length} widget{widgets.length !== 1 ? 's' : ''}
        </span>

        <span className={`text-xs transition-all duration-300 ${isDirty ? 'text-amber-600 opacity-100 dark:text-amber-400' : 'opacity-0'}`}>
          Unsaved
        </span>

        <button
          onClick={() => onPreview(buildConfig())}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:border-gray-300 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-gray-600 dark:hover:text-white"
        >
          <Eye className="h-3.5 w-3.5" />
          Preview
        </button>

        <button
          onClick={handleSave}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition-all duration-300 ${
            saved ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-blue-600 hover:bg-blue-500'
          }`}
        >
          {saved ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
          {saved ? 'Saved!' : 'Save'}
        </button>
      </div>

      {/* ── Description bar ─────────────────────────────────────────────────── */}
      <div className="flex flex-shrink-0 items-center border-b border-gray-100 bg-white/80 px-4 py-1.5 dark:border-gray-800/60 dark:bg-gray-900/80">
        <AlignLeft className="mr-2 h-3.5 w-3.5 flex-shrink-0 text-gray-300 dark:text-gray-600" />
        <input
          type="text"
          value={description}
          onChange={(e) => { setDescription(e.target.value); markDirty(); }}
          placeholder="Add a description for this dashboard…"
          className="w-full bg-transparent text-xs text-gray-500 outline-none placeholder-gray-300 dark:text-gray-400 dark:placeholder-gray-600"
        />
      </div>

      {/* ── Template setup banner ────────────────────────────────────────────── */}
      {fromTemplate && !setupBannerDismissed && (() => {
        const unconfigured = widgets.filter((w) => !w.dataSource.table).length;
        if (unconfigured === 0) return null;
        return (
          <div className="flex flex-shrink-0 items-center gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2.5 dark:border-amber-700/40 dark:bg-amber-900/20">
            <AlertCircle className="h-4 w-4 flex-shrink-0 text-amber-500 dark:text-amber-400" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                Connect your data — {unconfigured} widget{unconfigured !== 1 ? 's' : ''} need{unconfigured === 1 ? 's' : ''} a table
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400/80">
                Click each widget on the canvas, then choose a table and columns in the right panel.
              </p>
            </div>
            <button
              onClick={() => setSetupBannerDismissed(true)}
              className="flex-shrink-0 rounded p-1 text-amber-400 transition-colors hover:bg-amber-100 hover:text-amber-600 dark:hover:bg-amber-800/40"
              title="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })()}

      {/* ── Body ─────────────────────────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1">
        <div className="w-48 flex-shrink-0 border-r border-gray-200 dark:border-gray-800">
          <WidgetPalette onAddWidget={handleAddWidget} />
        </div>

        <BuilderCanvas
          widgets={widgets}
          selectedId={selectedId}
          canvasRef={canvasRef}
          themeId={themeId}
          previewTimeRange={previewTimeRange}
          onSelectWidget={setSelectedId}
          onDeleteWidget={handleDeleteWidget}
          onMoveWidget={handleMoveWidget}
          onResizeWidget={handleResizeWidget}
        />

        <WidgetConfigDrawer
          widget={selectedWidget}
          onSave={handleUpdateWidget}
          onDelete={() => selectedWidget && handleDeleteWidget(selectedWidget.id)}
          onClose={() => setSelectedId(null)}
        />
      </div>
    </div>
  );
}

export default function DashboardBuilder(props: DashboardBuilderProps) {
  return (
    <DndProvider backend={HTML5Backend}>
      <BuilderInner {...props} />
    </DndProvider>
  );
}

