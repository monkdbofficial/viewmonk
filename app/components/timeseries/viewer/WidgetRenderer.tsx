'use client';
import { useEffect, useRef, useState } from 'react';
import WidgetShell from '../widgets/WidgetShell';
import StatCardWidget from '../widgets/StatCardWidget';
import LineChartWidget from '../widgets/LineChartWidget';
import AreaChartWidget from '../widgets/AreaChartWidget';
import BarChartWidget from '../widgets/BarChartWidget';
import PieChartWidget from '../widgets/PieChartWidget';
import GaugeWidget from '../widgets/GaugeWidget';
import HeatmapWidget from '../widgets/HeatmapWidget';
import DataTableWidget from '../widgets/DataTableWidget';
import ScatterChartWidget from '../widgets/ScatterChartWidget';
import FunnelChartWidget from '../widgets/FunnelChartWidget';
import TreemapWidget from '../widgets/TreemapWidget';
import CandlestickWidget from '../widgets/CandlestickWidget';
import ProgressKPIWidget from '../widgets/ProgressKPIWidget';
import TextWidget from '../widgets/TextWidget';
import DividerWidget from '../widgets/DividerWidget';
import { getTheme } from '@/app/lib/timeseries/themes';
import { useWidgetData } from '@/app/hooks/timeseries/useWidgetData';
import type { WidgetConfig, TimeRange, ActiveFilter, DashboardThemeId } from '@/app/lib/timeseries/types';
import type { TreemapNode } from '../widgets/TreemapWidget';
import type { CandlePoint } from '../widgets/CandlestickWidget';
import type { ProgressItem } from '../widgets/ProgressKPIWidget';

interface WidgetRendererProps {
  widget: WidgetConfig;
  themeId: DashboardThemeId;
  timeRange: TimeRange;
  activeFilter: ActiveFilter | null;
  variables?: Record<string, string>;
  builderMode?: boolean;
  demoMode?: boolean;
  demoData?: Record<string, unknown>;
  refreshTick?: number;
  /** Dashboard refresh interval (ms) used to derive per-widget staleness threshold */
  refreshIntervalMs?: number;
  activeFilterSourceId?: string | null;
  onDrillDown?: (filter: ActiveFilter) => void;
  onThresholdAlert?: (widgetTitle: string, widgetId: string, thresholdId: string, value: number, thresholdValue: number, thresholdLabel: string | undefined, direction: 'above' | 'below', color: string) => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

// ── Top-level dispatcher — content widgets bypass data fetching ───────────────

export default function WidgetRenderer(props: WidgetRendererProps) {
  if (props.widget.type === 'text-widget') return <TextWidgetRenderer {...props} />;
  if (props.widget.type === 'divider')     return <DividerWidget widget={props.widget} />;
  return <DataWidgetRenderer {...props} />;
}

// ── Text widget — wrapped in a minimal shell ──────────────────────────────────

function TextWidgetRenderer({ widget, themeId, onEdit, onDelete }: WidgetRendererProps) {
  const theme = getTheme(themeId);
  return (
    <WidgetShell
      title={widget.title}
      status="loaded"
      error={null}
      lastUpdated={null}
      executionTime={0}
      theme={theme}
      builderMode={false}
      onRetry={() => {}}
      onEdit={onEdit}
      onDelete={onDelete}
    >
      <TextWidget widget={widget} />
    </WidgetShell>
  );
}

// ── Data widgets — fetch SQL and render chart ─────────────────────────────────

function DataWidgetRenderer({
  widget, themeId, timeRange, activeFilter, variables,
  builderMode = false, demoMode = false, demoData,
  refreshTick = 0, refreshIntervalMs, activeFilterSourceId,
  onDrillDown, onThresholdAlert, onEdit, onDelete,
}: WidgetRendererProps) {
  const theme = getTheme(themeId);
  const { state, result, run, fromCache, clearCache } = useWidgetData(widget);

  // Staleness threshold: cache TTL if caching is on, otherwise dashboard refresh interval, else 5 min
  const staleThresholdMs =
    widget.dataSource.cacheEnabled ? (widget.dataSource.cacheTtl ?? 60_000) :
    refreshIntervalMs              ? refreshIntervalMs * 2 :
    300_000;

  // ── Lazy loading via IntersectionObserver ────────────────────────────────
  // builderMode widgets are always eager (small canvas, all visible at once)
  const containerRef    = useRef<HTMLDivElement>(null);
  const hasBeenVisible  = useRef(builderMode); // builder: skip lazy gate
  const [isVisible, setIsVisible] = useState(builderMode);

  useEffect(() => {
    if (builderMode) return; // no observer needed — eager load
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      // Fallback: treat as immediately visible if API unavailable
      hasBeenVisible.current = true;
      setIsVisible(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          hasBeenVisible.current = true;
          setIsVisible(true);
          obs.disconnect(); // once loaded, observer not needed again
        }
      },
      { threshold: 0.05 }, // trigger when ≥5% of the widget is in view
    );
    obs.observe(el);
    return () => obs.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [builderMode]);

  // Stable key for variables so effect tracks changes without JSON.stringify overhead
  const variablesKey = variables ? Object.entries(variables).sort().join('|') : '';

  useEffect(() => {
    // Lazy gate: skip until the widget has entered the viewport at least once.
    // After first load (hasBeenVisible=true), respond to refreshTick/timeRange/filter
    // changes even if temporarily scrolled out — data will be correct when seen again.
    if (demoMode) return;
    if (!isVisible && !hasBeenVisible.current) return;
    run(timeRange, activeFilter, refreshTick > 0, variables);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange.from.getTime(), timeRange.to.getTime(), activeFilter?.column, activeFilter?.value, refreshTick, demoMode, variablesKey, isVisible]);

  // Fire threshold alerts when stat-card or gauge data loads/refreshes
  useEffect(() => {
    if (!onThresholdAlert || !result || builderMode || demoMode) return;
    const alertThresholds = (widget.style.thresholds ?? []).filter((t) => t.alertEnabled);
    if (!alertThresholds.length) return;

    let currentValue: number | null = null;
    if (widget.type === 'stat-card' && result.statValue != null) currentValue = result.statValue;
    if (widget.type === 'gauge' && result.gaugeValue != null) currentValue = result.gaugeValue.current;
    if (currentValue === null) return;

    for (const thr of alertThresholds) {
      const dir = thr.alertDirection ?? 'above';
      const breached = dir === 'above' ? currentValue >= thr.value : currentValue <= thr.value;
      if (breached) {
        onThresholdAlert(widget.title, widget.id, thr.id, currentValue, thr.value, thr.label, dir, thr.color);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  const displayStatus = demoMode ? 'loaded' : state.status;

  const renderChart = () => {
    if (demoMode && demoData) {
      return renderDemoWidget(widget, demoData as Record<string, unknown>, theme);
    }
    if (!result) return null;

    switch (widget.type) {
      case 'stat-card':
        return <StatCardWidget value={result.statValue ?? null} style={widget.style} theme={theme} />;
      case 'line-chart':
        return <LineChartWidget series={result.series ?? []} style={widget.style} theme={theme} annotations={widget.annotations} />;
      case 'area-chart':
        return <AreaChartWidget series={result.series ?? []} style={widget.style} theme={theme} annotations={widget.annotations} />;
      case 'bar-chart':
        return (
          <BarChartWidget
            series={result.series ?? []}
            style={widget.style}
            theme={theme}
            onDrillDown={onDrillDown
              // Map the SQL alias ('category') back to the actual table column name.
              // widget.dataSource.groupCol is the real column; fall back to the alias only when unset.
              ? (_alias, val) => onDrillDown({ column: widget.dataSource.groupCol ?? _alias, value: val, sourceWidgetId: widget.id })
              : undefined}
          />
        );
      case 'pie-chart':
        return (
          <PieChartWidget
            slices={result.pieSlices ?? []}
            style={widget.style}
            theme={theme}
            onDrillDown={onDrillDown
              ? (name, _val) => onDrillDown({ column: widget.dataSource.groupCol ?? widget.dataSource.metricCol, value: name, sourceWidgetId: widget.id })
              : undefined}
          />
        );
      case 'gauge':
        return result.gaugeValue
          ? <GaugeWidget data={result.gaugeValue} style={widget.style} theme={theme} />
          : null;
      case 'heatmap':
        return <HeatmapWidget series={result.series ?? []} style={widget.style} theme={theme} />;
      case 'data-table':
        return <DataTableWidget columns={result.columns} rows={result.tableRows ?? []} theme={theme} columnFormatting={widget.style.columnFormatting} />;
      case 'scatter-chart':
        return (
          <ScatterChartWidget
            points={result.scatterPoints ?? []}
            xLabel={widget.dataSource.xCol}
            yLabel={widget.dataSource.yCol}
            style={widget.style}
            theme={theme}
          />
        );
      case 'funnel-chart':
        return <FunnelChartWidget slices={result.pieSlices ?? []} style={widget.style} theme={theme} />;
      case 'treemap':
        return <TreemapWidget
          nodes={result.treemapNodes ?? (result.pieSlices ?? []).map((s) => ({ name: s.name, value: s.value }))}
          style={widget.style} theme={theme} />;
      case 'candlestick':
        return <CandlestickWidget candles={(result.candleData ?? []) as CandlePoint[]} style={widget.style} theme={theme} />;
      case 'progress-kpi':
        return <ProgressKPIWidget items={(result.progressItems ?? []) as ProgressItem[]} style={widget.style} theme={theme} />;
      default:
        return null;
    }
  };

  return (
    <div ref={containerRef} className="h-full">
      <WidgetShell
        title={widget.title}
        status={displayStatus}
        error={state.error}
        lastUpdated={state.lastUpdated}
        executionTime={state.executionTime}
        theme={theme}
        builderMode={builderMode}
        fromCache={!demoMode && fromCache}
        staleThresholdMs={staleThresholdMs}
        isFilterSource={!demoMode && activeFilterSourceId === widget.id}
        isFiltered={!demoMode && !!activeFilterSourceId && activeFilterSourceId !== widget.id}
        onRetry={() => run(timeRange, activeFilter, true, variables)}
        onClearCache={() => { clearCache(); run(timeRange, activeFilter, true, variables); }}
        onEdit={onEdit}
        onDelete={onDelete}
      >
        {renderChart()}
      </WidgetShell>
    </div>
  );
}

// ── Demo mode rendering ───────────────────────────────────────────────────────

function renderDemoWidget(
  widget: WidgetConfig,
  demoData: Record<string, unknown>,
  theme: ReturnType<typeof getTheme>,
) {
  const d = demoData as {
    statValue?: number; trend?: string; direction?: 'up' | 'down' | 'neutral';
    series?: { name: string; data: [string, number][] }[];
    pieSlices?: { name: string; value: number }[];
    gaugeValue?: { current: number; min: number; max: number };
    columns?: string[];
    tableRows?: Record<string, unknown>[];
    scatterPoints?: [number, number, string?][];
    treemapNodes?: TreemapNode[];
    candleData?: CandlePoint[];
    progressItems?: ProgressItem[];
  };

  switch (widget.type) {
    case 'stat-card':
      return (
        <StatCardWidget
          value={d.statValue ?? null}
          style={widget.style}
          theme={theme}
          demoData={{ statValue: d.statValue ?? 0, trend: d.trend, direction: d.direction }}
        />
      );
    case 'line-chart':
      return <LineChartWidget series={d.series ?? []} style={widget.style} theme={theme} annotations={widget.annotations} />;
    case 'area-chart':
      return <AreaChartWidget series={d.series ?? []} style={widget.style} theme={theme} annotations={widget.annotations} />;
    case 'bar-chart':
      return <BarChartWidget series={d.series ?? []} style={widget.style} theme={theme} />;
    case 'pie-chart':
      return <PieChartWidget slices={d.pieSlices ?? []} style={widget.style} theme={theme} />;
    case 'gauge':
      return d.gaugeValue
        ? <GaugeWidget data={d.gaugeValue} style={widget.style} theme={theme} />
        : null;
    case 'heatmap':
      return <HeatmapWidget series={d.series ?? []} style={widget.style} theme={theme} />;
    case 'data-table':
      return (
        <DataTableWidget
          columns={d.columns ?? []}
          rows={(d.tableRows ?? []) as Record<string, unknown>[]}
          theme={theme}
        />
      );
    case 'scatter-chart':
      return (
        <ScatterChartWidget
          points={d.scatterPoints ?? []}
          style={widget.style}
          theme={theme}
        />
      );
    case 'funnel-chart':
      return <FunnelChartWidget slices={d.pieSlices ?? []} style={widget.style} theme={theme} />;
    case 'treemap':
      return <TreemapWidget nodes={d.treemapNodes ?? d.pieSlices?.map((s) => ({ name: s.name, value: s.value })) ?? []} style={widget.style} theme={theme} />;
    case 'candlestick':
      return <CandlestickWidget candles={d.candleData ?? []} style={widget.style} theme={theme} />;
    case 'progress-kpi':
      return <ProgressKPIWidget items={d.progressItems ?? []} style={widget.style} theme={theme} />;
    default:
      return null;
  }
}
