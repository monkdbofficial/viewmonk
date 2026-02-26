'use client';
import { useState, useCallback, useRef, useEffect } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import {
  Save, Eye, ArrowLeft, GripVertical, X,
  Check, ChevronDown, Layers, MousePointer,
  Undo2, Redo2, Copy, AlignLeft, AlertCircle,
} from 'lucide-react';
import WidgetPalette from './WidgetPalette';
import WidgetConfigDrawer from './WidgetConfigDrawer';
import { ALL_THEMES } from '@/app/lib/timeseries/themes';
import type {
  WidgetConfig, DashboardConfig, WidgetType,
  DashboardThemeId, GridPosition, DataSourceConfig, WidgetStyle,
} from '@/app/lib/timeseries/types';

// ── Constants ────────────────────────────────────────────────────────────────

const ROW_HEIGHT = 160;
const COL_COUNT  = 12;
const GAP        = 14;
const DRAG_TYPE  = 'CANVAS_WIDGET';

// ── Widget metadata ───────────────────────────────────────────────────────────

const WIDGET_LABELS: Record<WidgetType, { emoji: string; label: string; color: string }> = {
  'stat-card':    { emoji: '📊', label: 'Stat Card',    color: '#3B82F6' },
  'line-chart':   { emoji: '📈', label: 'Line Chart',   color: '#06B6D4' },
  'area-chart':   { emoji: '🏔', label: 'Area Chart',   color: '#6366F1' },
  'bar-chart':    { emoji: '📉', label: 'Bar Chart',    color: '#8B5CF6' },
  'pie-chart':    { emoji: '🥧', label: 'Pie Chart',    color: '#EC4899' },
  'gauge':        { emoji: '🎯', label: 'Gauge',        color: '#F59E0B' },
  'heatmap':      { emoji: '🗺', label: 'Heatmap',     color: '#10B981' },
  'data-table':   { emoji: '📋', label: 'Data Table',   color: '#6B7280' },
  'scatter-chart':{ emoji: '⬤',  label: 'Scatter Plot', color: '#8B5CF6' },
  'funnel-chart': { emoji: '▽',  label: 'Funnel Chart', color: '#F97316' },
  'treemap':      { emoji: '▦',  label: 'Treemap',      color: '#14B8A6' },
  'candlestick':  { emoji: '🕯', label: 'Candlestick',  color: '#10B981' },
  'progress-kpi': { emoji: '⬛', label: 'Progress KPI', color: '#3B82F6' },
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
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onResize: (id: string, w: number, h: number) => void;
}

function CanvasWidget({ widget, isSelected, canvasRef, onSelect, onDelete, onResize }: CanvasWidgetProps) {
  const [{ isDragging }, drag, dragPreview] = useDrag({
    type: DRAG_TYPE,
    item: () => ({ id: widget.id }),
    collect: (m) => ({ isDragging: m.isDragging() }),
  });

  const { x, y, w, h } = widget.position;
  const colW = `calc((100% - ${(COL_COUNT - 1) * GAP}px) / ${COL_COUNT})`;
  const meta = WIDGET_LABELS[widget.type];

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
        className={`relative h-full w-full rounded-xl border-2 transition-all duration-150 ${
          isSelected
            ? 'border-blue-500 bg-blue-500/[0.06] shadow-lg shadow-blue-500/20 ring-2 ring-blue-500/25 dark:bg-blue-500/[0.08]'
            : 'border-dashed border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50 dark:border-gray-600/40 dark:bg-white/[0.02] dark:hover:border-gray-500/60 dark:hover:bg-white/[0.04]'
        }`}
      >
        {/* Drag handle */}
        <div
          ref={drag as (el: HTMLDivElement | null) => void}
          className="absolute left-2 top-2 z-20 cursor-grab rounded p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-700 active:cursor-grabbing dark:text-gray-600 dark:hover:bg-white/10 dark:hover:text-gray-300"
          onClick={(e) => e.stopPropagation()}
          title="Drag to move"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </div>

        {/* Delete button */}
        <button
          className="absolute right-2 top-2 z-20 rounded p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:text-gray-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
          onClick={(e) => { e.stopPropagation(); onDelete(widget.id); }}
          title="Delete widget"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        {/* Body */}
        <div className="flex h-full flex-col items-center justify-center gap-2 px-10 py-4">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl"
            style={{ background: `${meta.color}20` }}
          >
            <span className="text-xl leading-none">{meta.emoji}</span>
          </div>
          <div className="text-center">
            <p className="max-w-full truncate text-sm font-semibold text-gray-700 dark:text-gray-200">
              {widget.title || meta.label}
            </p>
            <p className="mt-0.5 text-xs font-mono text-gray-400 dark:text-gray-600">{widget.type}</p>
          </div>
          {widget.dataSource.table ? (
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
              {widget.dataSource.schema}.{widget.dataSource.table}
            </span>
          ) : (
            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
              Click to configure
            </span>
          )}
        </div>

        {/* Position / size badge */}
        <div className="absolute bottom-1.5 left-2 text-xs font-mono text-gray-400 opacity-0 transition-opacity group-hover:opacity-100 dark:text-gray-700">
          {w}×{h} @ ({x},{y})
        </div>

        {/* Resize handle — bottom-right corner */}
        <div
          className="absolute bottom-0 right-0 z-20 h-5 w-5 cursor-se-resize rounded-br-xl"
          onMouseDown={handleResizeMouseDown}
          title="Drag to resize"
        >
          <svg className="absolute bottom-1.5 right-1.5 text-gray-300 dark:text-gray-500" width="8" height="8" viewBox="0 0 8 8">
            <path d="M7,1 L7,7 L1,7" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
          </svg>
        </div>
      </div>
    </div>
  );
}

// ── Builder Canvas ────────────────────────────────────────────────────────────

interface BuilderCanvasProps {
  widgets: WidgetConfig[];
  selectedId: string | null;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  onSelectWidget: (id: string | null) => void;
  onDeleteWidget: (id: string) => void;
  onMoveWidget: (id: string, newPos: GridPosition) => void;
  onResizeWidget: (id: string, w: number, h: number) => void;
}

function BuilderCanvas({
  widgets, selectedId, canvasRef,
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
      position: { ...original.position, y: original.position.y + original.position.h },
    };
    setWidgets((prev) => [...prev, copy]);
    setSelectedId(copy.id);
  }, [widgets, setWidgets]);

  const buildConfig = useCallback((): DashboardConfig => ({
    ...config, name, description: description.trim() || undefined, themeId, widgets, updatedAt: new Date().toISOString(),
  }), [config, name, description, themeId, widgets]);

  const handleSave = () => {
    onSave(buildConfig());
    setIsDirty(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="flex h-full flex-col bg-gray-50 dark:bg-gray-950">
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

        {/* Duplicate selected */}
        {selectedId && (
          <button
            onClick={() => handleDuplicateWidget(selectedId)}
            className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-blue-600 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-blue-400"
            title="Duplicate widget"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        )}

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

