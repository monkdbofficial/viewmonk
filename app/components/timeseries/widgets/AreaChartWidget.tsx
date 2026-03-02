'use client';
import ReactECharts from 'echarts-for-react';
import type { ThemeTokens } from '@/app/lib/timeseries/themes';
import type { WidgetStyle } from '@/app/lib/timeseries/types';
import type { ChartSeries } from '@/app/lib/timeseries/widget-executor';
import { buildEChartsTheme } from '@/app/lib/timeseries/themes';

interface AreaChartWidgetProps {
  series: ChartSeries[];
  style: WidgetStyle;
  theme: ThemeTokens;
}

export default function AreaChartWidget({ series, style, theme }: AreaChartWidgetProps) {
  const t = buildEChartsTheme(theme);

  const getColor = (i: number) =>
    style.customColors?.[i] || theme.chartColors[i % theme.chartColors.length];

  const fmtVal = (v: number) => {
    const prefix = style.prefix ?? '';
    const unit   = style.unit ?? '';
    const val    = style.decimals !== undefined
      ? v.toFixed(style.decimals)
      : v.toLocaleString(undefined, { maximumFractionDigits: 4 });
    return `${prefix}${val}${unit}`;
  };

  // Fill opacity: 0-100 → hex alpha (0-255)
  const opacityPct = style.fillOpacity ?? 35;
  const topAlpha   = Math.round((opacityPct / 100) * 255).toString(16).padStart(2, '0');
  const bottomAlpha = '00';

  // Threshold mark lines
  const markLine = (style.thresholds ?? []).length > 0
    ? {
        silent: true,
        symbol: ['none', 'none'],
        data: (style.thresholds ?? []).map((thr) => ({
          yAxis: thr.value,
          lineStyle: { color: thr.color, type: 'dashed' as const, width: 1.5, opacity: 0.8 },
          label: {
            show: !!thr.label,
            formatter: thr.label ?? '',
            color: thr.color,
            fontSize: 10,
            position: 'insideEndTop' as const,
          },
        })),
      }
    : undefined;

  const smooth = style.smooth ?? true;

  // Format ISO timestamp strings from MonkDB DATE_TRUNC into readable axis labels
  const fmtTime = (s: string): string => {
    try {
      const d = new Date(s);
      if (isNaN(d.getTime())) return s;
      if (d.getHours() !== 0 || d.getMinutes() !== 0 || d.getSeconds() !== 0) {
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
      }
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch { return s; }
  };

  const option = {
    ...t,
    tooltip: {
      ...t.tooltip,
      trigger: 'axis',
      axisPointer: { type: 'cross', lineStyle: { color: theme.accentPrimary + '60' } },
      formatter: (params: { name: string; seriesName: string; value: number | string; marker: string }[]) => {
        const header = params[0]?.name ?? '';
        const rows = params
          .map((p) => `${p.marker} ${p.seriesName}: <b>${fmtVal(Number(p.value))}</b>`)
          .join('<br/>');
        return `${header}<br/>${rows}`;
      },
    },
    legend: style.showLegend
      ? { ...t.legend, bottom: 0, type: 'scroll' }
      : { show: false },
    grid: {
      top: 12, right: 16,
      bottom: style.showLegend ? 36 : 12,
      left: 48, containLabel: false,
    },
    xAxis: {
      ...t.xAxis,
      type: 'category',
      boundaryGap: false,
      data: series[0]?.data.map((d) => d[0]) ?? [],
      axisLabel: {
        ...t.xAxis.axisLabel,
        formatter: (s: string) => fmtTime(s),
      },
    },
    yAxis: {
      ...t.yAxis,
      type: style.yAxisScale === 'log' ? 'log' : 'value',
      axisLabel: {
        ...t.yAxis.axisLabel,
        formatter: (v: number) => fmtVal(v),
      },
    },
    series: series.map((s, i) => {
      const color = getColor(i);
      return {
        name: s.name,
        type: 'line',
        smooth,
        symbol: 'none',
        data: s.data.map((d) => d[1]),
        lineStyle: {
          width: 2,
          color,
          ...(theme.glowEffect ? { shadowBlur: 10, shadowColor: color } : {}),
        },
        itemStyle: { color },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: color + topAlpha },
              { offset: 1, color: color + bottomAlpha },
            ],
          },
        },
        markLine,
      };
    }),
  };

  return (
    <ReactECharts
      option={option}
      style={{ height: '100%', width: '100%' }}
      opts={{ renderer: 'canvas' }}
    />
  );
}
