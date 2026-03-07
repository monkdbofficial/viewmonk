'use client';
import { useState, useCallback, useRef, useEffect } from 'react';
import {
  X, DownloadCloud, FileJson, ImageDown,
  Settings2, Maximize2, Minimize2, ChevronDown,
  ArrowLeft, LayoutGrid, Filter, Pencil, Activity, History, Link2,
} from 'lucide-react';
import WidgetRenderer from './WidgetRenderer';
import GlobalTimeRangeBar from './GlobalTimeRangeBar';
import VariableBar from './VariableBar';
import ThresholdAlertToast, { type ThresholdAlert } from './ThresholdAlertToast';
import SnapshotPanel from './SnapshotPanel';
import ShareLinkPanel from './ShareLinkPanel';
import { getTheme } from '@/app/lib/timeseries/themes';
import type { ThemeTokens } from '@/app/lib/timeseries/themes';
import { getDefaultTimeRange } from '@/app/lib/timeseries/time-range';
import { useDashboardRefresh } from '@/app/hooks/timeseries/useDashboardRefresh';
import type { DashboardConfig, TimeRange, ActiveFilter } from '@/app/lib/timeseries/types';
import { evalAllCalcMetrics } from '@/app/lib/timeseries/calc-metrics';
import { ROW_HEIGHT, COL_COUNT, GAP } from '@/app/lib/timeseries/constants';

// ── Export helpers ────────────────────────────────────────────────────────────

function triggerDownload(url: string, filename: string) {
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportAsJSON(config: DashboardConfig) {
  const json = JSON.stringify(config, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  triggerDownload(url, `${config.name.toLowerCase().replace(/\s+/g, '-')}-dashboard.json`);
}

async function exportAsPNG(canvasEl: HTMLElement | null, name: string) {
  if (!canvasEl) return;
  try {
    const { default: html2canvas } = await import('html2canvas');
    const canvas = await html2canvas(canvasEl, {
      backgroundColor: null,
      scale: 2,
      useCORS: true,
      logging: false,
    });
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      triggerDownload(url, `${name.toLowerCase().replace(/\s+/g, '-')}.png`);
    }, 'image/png');
  } catch {
    alert('PNG export requires html2canvas. Please try JSON export instead.');
  }
}

// ── Export dropdown ───────────────────────────────────────────────────────────

interface ExportMenuProps {
  config: DashboardConfig;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  theme: ThemeTokens;
}

function ExportMenu({ config, canvasRef, theme }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const isLight = theme.id === 'light-clean';

  const btnCls = isLight
    ? 'border border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:text-blue-600'
    : `${theme.cardBorder} ${theme.cardBg} ${theme.textSecondary} hover:bg-white/[0.10] hover:text-white/90`;

  // Dropdown panel: always use theme tokens so it matches the dashboard theme
  const dropBg     = isLight ? '#ffffff' : (theme.cardBg.replace(/^bg-\[(.+)\]$/, '$1').replace(/^bg-/, '') || '#0f1929');
  const dropBorder  = isLight ? 'rgba(229,231,235,1)' : 'rgba(255,255,255,0.1)';
  const itemHoverBg = isLight ? 'rgba(249,250,251,1)'  : 'rgba(255,255,255,0.07)';

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${btnCls}`}
        title="Export dashboard"
      >
        <DownloadCloud className="h-3.5 w-3.5" />
        Export
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-full z-50 mt-1.5 w-44 overflow-hidden rounded-xl shadow-2xl"
            style={{ background: dropBg, border: `1px solid ${dropBorder}` }}
          >
            <button
              onClick={() => { exportAsPNG(canvasRef.current, config.name); setOpen(false); }}
              className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-xs transition-colors ${theme.textSecondary}`}
              style={{ ['--hover-bg' as string]: itemHoverBg }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = itemHoverBg; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <ImageDown className="h-3.5 w-3.5" style={{ color: theme.accentPrimary }} />
              Export as PNG
            </button>
            <div style={{ height: 1, background: dropBorder, opacity: 0.5 }} />
            <button
              onClick={() => { exportAsJSON(config); setOpen(false); }}
              className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-xs transition-colors ${theme.textSecondary}`}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = itemHoverBg; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <FileJson className="h-3.5 w-3.5" style={{ color: theme.accentPrimary }} />
              Export as JSON
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main DashboardViewer ──────────────────────────────────────────────────────

interface DashboardViewerProps {
  config: DashboardConfig;
  demoMode?: boolean;
  /** Per-widget demo data keyed by widget ID (only used in demoMode) */
  templateDemoData?: Record<string, Record<string, unknown>>;
  onEdit?: () => void;
  onBack?: () => void;
  /**
   * When true the viewer is embedded inside a tab bar layout that already
   * owns the -m-8 page breakout.  The viewer itself uses flex-1 min-h-0
   * instead of -m-8 so it fills the remaining height without double-escaping.
   */
  hasTabBar?: boolean;
}

export default function DashboardViewer({
  config, demoMode = false, templateDemoData, onEdit, onBack, hasTabBar = false,
}: DashboardViewerProps) {
  // Detect the app's current light/dark mode from the <html> class
  const [appIsDark, setAppIsDark] = useState(true);
  useEffect(() => {
    const check = () => setAppIsDark(document.documentElement.classList.contains('dark'));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // In preview/demo mode: override theme to match the app's light/dark mode.
  // In normal view mode: also respect app dark mode — auto-swap light-clean → dark-navy
  // so a dashboard saved with light theme doesn't render white in dark mode.
  const effectiveThemeId = demoMode
    ? (appIsDark
        ? (config.themeId === 'light-clean' ? 'dark-navy' : config.themeId)
        : 'light-clean')
    : (appIsDark && config.themeId === 'light-clean' ? 'dark-navy' : config.themeId);

  const theme = getTheme(effectiveThemeId);
  const canvasRef = useRef<HTMLDivElement | null>(null);

  const [timeRange,        setTimeRange]        = useState<TimeRange>(getDefaultTimeRange());
  const [refreshInterval,  setRefreshInterval]  = useState<number | 'manual'>(config.refreshInterval);
  const [activeFilter,     setActiveFilter]     = useState<ActiveFilter | null>(null);
  const [isRefreshing,     setIsRefreshing]     = useState(false);
  const [refreshTick,      setRefreshTick]      = useState(0);
  const [isFullscreen,     setIsFullscreen]     = useState(false);
  const [showSnapshots,    setShowSnapshots]    = useState(false);
  const [showShare,        setShowShare]        = useState(false);

  // Threshold alerts
  const [alerts,       setAlerts]       = useState<ThresholdAlert[]>([]);
  // Track which breaches have already been shown this session to avoid repeat noise
  const firedAlertsRef = useRef<Set<string>>(new Set());

  const handleThresholdAlert = useCallback((
    widgetTitle: string, widgetId: string, thresholdId: string,
    value: number, thresholdValue: number, thresholdLabel: string | undefined,
    direction: 'above' | 'below', color: string,
  ) => {
    const alertId = `${widgetId}_${thresholdId}`;
    if (firedAlertsRef.current.has(alertId)) return; // already shown
    firedAlertsRef.current.add(alertId);
    setAlerts((prev) => [...prev, { id: alertId, widgetTitle, thresholdLabel: thresholdLabel ?? '', value, thresholdValue, direction, color, firedAt: new Date() }]);
  }, []);

  // Dashboard variables: initialise from defaultValue
  const [variableValues, setVariableValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const v of config.variables ?? []) {
      init[v.name] = v.defaultValue;
    }
    return init;
  });

  // Merge calculated metric results into variableValues so widgets get {{calc_name}} substitution
  const effectiveVariables = (() => {
    const calcResults = evalAllCalcMetrics(config.calculatedMetrics ?? [], variableValues);
    return { ...variableValues, ...calcResults };
  })();

  // Track when data was last loaded across all widgets (dashboard-level freshness)
  const [lastRefreshAt, setLastRefreshAt] = useState<Date | null>(null);
  const [freshnessLabel, setFreshnessLabel] = useState('');

  const triggerRefresh = useCallback(() => {
    setIsRefreshing(true);
    setRefreshTick((t) => t + 1);
    setLastRefreshAt(new Date());
    setTimeout(() => setIsRefreshing(false), 1500);
  }, []);

  // Update freshness label every 30 s so "X ago" text stays current
  useEffect(() => {
    const update = () => {
      if (!lastRefreshAt) return;
      const ageMs = Date.now() - lastRefreshAt.getTime();
      if (ageMs < 60_000) setFreshnessLabel('just now');
      else if (ageMs < 3_600_000) setFreshnessLabel(`${Math.floor(ageMs / 60_000)}m ago`);
      else setFreshnessLabel(`${Math.floor(ageMs / 3_600_000)}h ago`);
    };
    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, [lastRefreshAt]);

  useDashboardRefresh(refreshInterval, triggerRefresh);

  const maxRow = config.widgets.reduce((m, w) => Math.max(m, w.position.y + w.position.h), 0);
  const canvasHeight = maxRow * (ROW_HEIGHT + GAP) + GAP;

  const isLight = theme.id === 'light-clean';
  const toolbarBg = isLight
    ? 'border-b border-gray-200 bg-white/90 backdrop-blur'
    : `border-b ${theme.divider} ${theme.cardBg} backdrop-blur`;

  // In normal mode: use -m-8 to escape AppLayout's p-8 padding → full-bleed dashboard.
  // When hasTabBar is true the page-level wrapper already owns the -m-8 breakout and
  // padding reset, so we just use flex flex-col (no extra margin).
  // In fullscreen: overlay the entire screen.
  const containerCls = isFullscreen
    ? 'fixed inset-0 z-50 flex flex-col'
    : hasTabBar
      ? 'flex flex-col'
      : 'flex flex-col -m-8';

  const isLive = !demoMode && refreshInterval !== 'manual';

  return (
    <div className={`${containerCls} ${theme.pageBg}`}>
      {/* ── Threshold alert toasts ────────────────────────────────────────── */}
      <ThresholdAlertToast
        alerts={alerts}
        onDismiss={(id) => setAlerts((a) => a.filter((x) => x.id !== id))}
        onDismissAll={() => setAlerts([])}
      />
      {/* ── Toolbar ──────────────────────────────────────────────────────────── */}
      <div className={`flex flex-shrink-0 items-center gap-3 px-4 py-3 ${toolbarBg}`}>

        {/* Left: back + title block */}
        <div className="flex flex-1 items-center gap-3 min-w-0">
          {onBack && (
            <button
              onClick={onBack}
              className={`flex-shrink-0 rounded-lg p-1.5 transition-colors ${
                isLight
                  ? 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                  : 'text-white/40 hover:bg-white/10 hover:text-white/80'
              }`}
              title="Back to dashboards"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}

          {/* Dashboard icon + name + meta */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-lg"
              style={{ background: `${theme.accentPrimary}20` }}
            >
              <LayoutGrid className="h-3.5 w-3.5" style={{ color: theme.accentPrimary }} />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className={`truncate text-sm font-bold ${theme.textPrimary}`}>
                  {config.name}
                </h1>

                {/* Widget count chip */}
                <span
                  className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${theme.textMuted}`}
                  style={{ border: `1px solid ${isLight ? 'rgba(107,114,128,0.2)' : 'rgba(255,255,255,0.12)'}` }}
                >
                  {config.widgets.length}w
                </span>

                {/* LIVE badge */}
                {isLive && (
                  <span className="flex-shrink-0 flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider"
                    style={{
                      background: 'rgba(16,185,129,0.12)',
                      border: '1px solid rgba(16,185,129,0.25)',
                      color: '#10B981',
                    }}>
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    </span>
                    LIVE
                  </span>
                )}

                {/* Data freshness chip */}
                {!demoMode && lastRefreshAt && (() => {
                  const ageMs = Date.now() - lastRefreshAt.getTime();
                  const refreshMs = typeof refreshInterval === 'number' ? refreshInterval : 300_000;
                  const color =
                    ageMs < refreshMs        ? '#10B981' :
                    ageMs < refreshMs * 2    ? '#F59E0B' :
                                               '#EF4444';
                  return (
                    <span
                      className="hidden md:flex flex-shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors"
                      style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}
                      title={`Data last fetched at ${lastRefreshAt.toLocaleTimeString()}`}
                    >
                      <Activity className="h-2.5 w-2.5" />
                      {freshnessLabel}
                    </span>
                  );
                })()}

                {/* Preview badge */}
                {demoMode && (
                  <span className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${theme.accentBadge}`}>
                    Preview
                  </span>
                )}
              </div>

              {config.description && (
                <p className={`truncate text-[11px] ${theme.textMuted} mt-0.5`} style={{ opacity: 0.7 }}>
                  {config.description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right: controls */}
        <div className="flex flex-shrink-0 items-center gap-2">
          {!demoMode && (
            <GlobalTimeRangeBar
              timeRange={timeRange}
              refreshInterval={refreshInterval}
              isRefreshing={isRefreshing}
              theme={theme}
              onTimeRangeChange={(r) => { setTimeRange(r); triggerRefresh(); }}
              onRefreshIntervalChange={setRefreshInterval}
              onRefreshNow={triggerRefresh}
            />
          )}

          {!demoMode && (
            <div className="relative">
              <button
                onClick={() => setShowSnapshots((s) => !s)}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  isLight
                    ? 'border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:text-blue-600'
                    : `${theme.cardBorder} ${theme.cardBg} ${theme.textSecondary} hover:bg-white/[0.10] hover:text-white/90`
                }`}
                title="Snapshots & history"
              >
                <History className="h-3.5 w-3.5" />
                Snapshots
              </button>
              {showSnapshots && (
                <SnapshotPanel
                  config={config}
                  theme={theme}
                  onRestore={(restored) => {
                    // Reload page with restored config — handled by parent via onEdit flow
                    // For now, notify user; full restore needs parent state update
                    alert(`Restored snapshot: "${restored.name}"\n\nThis snapshot has been loaded. Save it to persist the changes.`);
                  }}
                  onClose={() => setShowSnapshots(false)}
                />
              )}
            </div>
          )}

          {!demoMode && (
            <div className="relative">
              <button
                onClick={() => setShowShare((s) => !s)}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  isLight
                    ? 'border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:text-blue-600'
                    : `${theme.cardBorder} ${theme.cardBg} ${theme.textSecondary} hover:bg-white/[0.10] hover:text-white/90`
                }`}
                title="Share dashboard link"
              >
                <Link2 className="h-3.5 w-3.5" />
                Share
              </button>
              {showShare && (
                <ShareLinkPanel
                  config={config}
                  theme={theme}
                  onClose={() => setShowShare(false)}
                />
              )}
            </div>
          )}

          {!demoMode && (
            <ExportMenu
              config={config}
              canvasRef={canvasRef}
              theme={theme}
            />
          )}

          {onEdit && (
            <button
              onClick={onEdit}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                demoMode
                  ? isLight
                    ? 'border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-400 hover:bg-blue-100'
                    : 'border-blue-400/30 bg-blue-500/10 text-blue-300 hover:border-blue-400/60 hover:bg-blue-500/20'
                  : isLight
                    ? 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:text-blue-600'
                    : 'border-white/10 bg-white/[0.06] text-white/60 hover:border-white/20 hover:text-white/90'
              }`}
              title={demoMode ? 'Open this template in the builder to configure your data sources' : 'Edit dashboard'}
            >
              {demoMode ? <Pencil className="h-3.5 w-3.5" /> : <Settings2 className="h-3.5 w-3.5" />}
              {demoMode ? 'Edit in Builder' : 'Edit'}
            </button>
          )}

          <button
            onClick={() => setIsFullscreen((f) => !f)}
            className={`rounded-lg p-1.5 transition-colors ${
              isLight
                ? 'text-gray-500 hover:bg-gray-100'
                : 'text-white/40 hover:bg-white/10 hover:text-white/80'
            }`}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen
              ? <Minimize2 className="h-4 w-4" />
              : <Maximize2 className="h-4 w-4" />
            }
          </button>
        </div>
      </div>

      {/* ── Active filter pill ─────────────────────────────────────────────── */}
      {activeFilter && (
        <div
          className={`flex flex-shrink-0 items-center gap-2 px-4 py-2 border-b ${theme.divider}`}
          style={{ background: `${theme.accentPrimary}08` }}
        >
          <Filter className={`h-3 w-3 flex-shrink-0 ${theme.textMuted}`} style={{ opacity: 0.6 }} />
          <span className={`text-xs font-medium ${theme.textMuted}`} style={{ opacity: 0.8 }}>
            Filtered by
          </span>
          <span
            className="flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
            style={{
              background: `${theme.accentPrimary}20`,
              border:     `1px solid ${theme.accentPrimary}40`,
              color:      theme.accentPrimary,
            }}
          >
            <span className={theme.textMuted} style={{ opacity: 0.7 }}>{activeFilter.column}:</span>
            <strong>{String(activeFilter.value)}</strong>
            <button
              onClick={() => setActiveFilter(null)}
              className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
          <span className={`text-[11px] ${theme.textMuted}`} style={{ opacity: 0.5 }}>
            — all widgets filtered
          </span>
          <button
            onClick={() => setActiveFilter(null)}
            className={`ml-auto text-[11px] font-medium ${theme.textMuted} underline-offset-2 hover:underline transition-all`}
            style={{ opacity: 0.6 }}
          >
            Clear
          </button>
        </div>
      )}

      {/* ── Dashboard variables bar ────────────────────────────────────────── */}
      {(config.variables?.length ?? 0) > 0 && !demoMode && (
        <VariableBar
          variables={config.variables!}
          values={variableValues}
          theme={theme}
          onChange={(vals) => { setVariableValues(vals); setRefreshTick((t) => t + 1); }}
          calculatedMetrics={config.calculatedMetrics}
          calcValues={evalAllCalcMetrics(config.calculatedMetrics ?? [], variableValues)}
        />
      )}

      {/* ── Widget canvas ──────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        {/* Subtle dot-grid texture on the canvas — more prominent on light, barely visible on dark */}
        <div
          ref={canvasRef}
          className="relative w-full"
          style={{
            height:    Math.max(canvasHeight, 400),
            minHeight: 'calc(100vh - 80px)',
            backgroundImage: `radial-gradient(circle, ${isLight ? 'rgba(148,163,184,0.35)' : 'rgba(255,255,255,0.04)'} 1px, transparent 1px)`,
            backgroundSize:  `${GAP + (isLight ? 14 : 20)}px ${GAP + (isLight ? 14 : 20)}px`,
          }}
        >
          {config.widgets.map((widget) => {
            const PAD    = 20; // canvas edge padding (px)
            const usableW = `(100% - ${2 * PAD}px - ${(COL_COUNT - 1) * GAP}px)`;
            const colW   = `calc(${usableW} / ${COL_COUNT})`;
            const left   = `calc(${PAD}px + ${widget.position.x} * (${colW} + ${GAP}px))`;
            const top    = `${PAD + widget.position.y * (ROW_HEIGHT + GAP)}px`;
            const width  = `calc(${widget.position.w} * ${colW} + ${(widget.position.w - 1) * GAP}px)`;
            const height = `${widget.position.h * ROW_HEIGHT + (widget.position.h - 1) * GAP}px`;

            return (
              <div
                key={widget.id}
                className="absolute"
                style={{ left, top, width, height }}
              >
                <WidgetRenderer
                  widget={widget}
                  themeId={effectiveThemeId}
                  timeRange={timeRange}
                  activeFilter={activeFilter}
                  variables={effectiveVariables}
                  demoMode={demoMode}
                  demoData={demoMode && templateDemoData ? templateDemoData[widget.id] : undefined}
                  refreshTick={refreshTick}
                  refreshIntervalMs={typeof refreshInterval === 'number' ? refreshInterval : undefined}
                  activeFilterSourceId={activeFilter?.sourceWidgetId ?? null}
                  onDrillDown={setActiveFilter}
                  onThresholdAlert={handleThresholdAlert}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
