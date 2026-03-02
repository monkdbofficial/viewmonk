'use client';
import { useEffect } from 'react';
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
  builderMode?: boolean;
  demoMode?: boolean;
  demoData?: Record<string, unknown>;
  refreshTick?: number;
  onDrillDown?: (filter: ActiveFilter) => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function WidgetRenderer({
  widget, themeId, timeRange, activeFilter,
  builderMode = false, demoMode = false, demoData,
  refreshTick = 0, onDrillDown, onEdit, onDelete,
}: WidgetRendererProps) {
  const theme = getTheme(themeId);
  const { state, result, run } = useWidgetData(widget);

  useEffect(() => {
    if (!demoMode) run(timeRange, activeFilter, refreshTick > 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange.from.getTime(), timeRange.to.getTime(), activeFilter?.column, activeFilter?.value, refreshTick, demoMode]);

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
        return <LineChartWidget series={result.series ?? []} style={widget.style} theme={theme} />;
      case 'area-chart':
        return <AreaChartWidget series={result.series ?? []} style={widget.style} theme={theme} />;
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
        return <PieChartWidget slices={result.pieSlices ?? []} style={widget.style} theme={theme} />;
      case 'gauge':
        return result.gaugeValue
          ? <GaugeWidget data={result.gaugeValue} style={widget.style} theme={theme} />
          : null;
      case 'heatmap':
        return <HeatmapWidget series={result.series ?? []} style={widget.style} theme={theme} />;
      case 'data-table':
        return <DataTableWidget columns={result.columns} rows={result.tableRows ?? []} theme={theme} />;
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
    <WidgetShell
      title={widget.title}
      status={displayStatus}
      error={state.error}
      lastUpdated={state.lastUpdated}
      executionTime={state.executionTime}
      theme={theme}
      builderMode={builderMode}
      onRetry={() => run(timeRange, activeFilter, true)}
      onEdit={onEdit}
      onDelete={onDelete}
    >
      {renderChart()}
    </WidgetShell>
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
      return <LineChartWidget series={d.series ?? []} style={widget.style} theme={theme} />;
    case 'area-chart':
      return <AreaChartWidget series={d.series ?? []} style={widget.style} theme={theme} />;
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
