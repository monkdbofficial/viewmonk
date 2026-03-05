'use client';
import ReactECharts from 'echarts-for-react';
import type { ThemeTokens } from '@/app/lib/timeseries/themes';
import type { WidgetStyle } from '@/app/lib/timeseries/types';
import type { ChartSeries } from '@/app/lib/timeseries/widget-executor';
import { buildEChartsTheme } from '@/app/lib/timeseries/themes';

interface HeatmapWidgetProps {
  series: ChartSeries[];
  style: WidgetStyle;
  theme: ThemeTokens;
}

export default function HeatmapWidget({ series, style, theme }: HeatmapWidgetProps) {
  const t       = buildEChartsTheme(theme);
  const isLight = theme.id === 'light-clean';
  const raw     = series[0]?.data ?? [];

  const fmtVal = (v: number) => {
    const prefix = style.prefix ?? '';
    const unit   = style.unit   ?? '';
    const val    = style.decimals !== undefined
      ? v.toFixed(style.decimals)
      : v.toLocaleString(undefined, { maximumFractionDigits: 4 });
    return `${prefix}${val}${unit}`;
  };

  // Respect custom accent color if provided (index 0)
  const accent = style.customColors?.[0] || theme.accentPrimary;

  // Build x (time) and y (hour-of-day) axes
  const xLabels = [...new Set(raw.map((d) => {
    try { return new Date(d[0]).toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' }); }
    catch { return d[0]; }
  }))];
  const yLabels = Array.from({ length: 24 }, (_, h) => `${h}:00`);

  const values = raw.map((d) => {
    let xIdx = 0;
    try {
      const day = new Date(d[0]).toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
      xIdx = Math.max(0, xLabels.indexOf(day)); // guard: indexOf returns -1 for missing dates
    } catch { xIdx = 0; }
    let yIdx = 0;
    try { yIdx = new Date(d[0]).getHours(); } catch { yIdx = 0; }
    return [xIdx, yIdx, d[1]];
  });

  const maxVal = Math.max(...values.map((v) => Number(v[2])), 1);

  const option = {
    ...t,
    tooltip: {
      ...t.tooltip,
      position: 'top',
      formatter: (p: { data: [number, number, number] }) => {
        const dateLabel = xLabels[p.data[0]] ?? '';
        const hourLabel = yLabels[p.data[1]] ?? '';
        return `${dateLabel} ${hourLabel}<br/><b>${fmtVal(Number(p.data[2]))}</b>`;
      },
    },
    grid: { top: 8, right: style.showGrid ? 60 : 16, bottom: 24, left: 40 },
    xAxis: { ...t.xAxis, type: 'category', data: xLabels, splitArea: { show: true } },
    yAxis: { ...t.yAxis, type: 'category', data: yLabels, splitArea: { show: true } },
    visualMap: {
      min: 0, max: maxVal,
      // showGrid repurposed: show the color-scale legend when grid is on
      show: style.showGrid,
      right: 4,
      top: 'center',
      orient: 'vertical',
      itemWidth: 10,
      itemHeight: 60,
      textStyle: { color: isLight ? '#6B7280' : '#ffffff50', fontSize: 9 },
      inRange: { color: [isLight ? '#EFF6FF' : '#ffffff08', accent] },
    },
    series: [{
      type: 'heatmap',
      data: values,
      label: { show: false },
      itemStyle: { borderRadius: 2 },
      emphasis: { itemStyle: { shadowBlur: 8, shadowColor: accent } },
    }],
  };

  return (
    <ReactECharts
      option={option}
      style={{ height: '100%', width: '100%' }}
      opts={{ renderer: 'canvas' }}
    />
  );
}
