'use client';
import ReactECharts from 'echarts-for-react';
import type { ThemeTokens } from '@/app/lib/timeseries/themes';
import type { ChartSeries } from '@/app/lib/timeseries/widget-executor';
import { buildEChartsTheme } from '@/app/lib/timeseries/themes';

interface HeatmapWidgetProps {
  series: ChartSeries[];
  theme: ThemeTokens;
}

export default function HeatmapWidget({ series, theme }: HeatmapWidgetProps) {
  const t = buildEChartsTheme(theme);
  const raw = series[0]?.data ?? [];

  // Build x (time) and y (category) axes
  const xLabels = [...new Set(raw.map((d) => {
    const ts = d[0];
    try { return new Date(ts).toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' }); }
    catch { return ts; }
  }))];
  const yLabels = ['0h','1h','2h','3h','4h','5h','6h','7h','8h','9h','10h','11h','12h','13h','14h','15h','16h','17h','18h','19h','20h','21h','22h','23h'];

  const values = raw.map((d) => {
    let xIdx = 0;
    try {
      const day = new Date(d[0]).toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
      xIdx = xLabels.indexOf(day);
    } catch { xIdx = 0; }
    let yIdx = 0;
    try { yIdx = new Date(d[0]).getHours(); } catch { yIdx = 0; }
    return [xIdx, yIdx, d[1]];
  });

  const maxVal = Math.max(...values.map((v) => Number(v[2])), 1);
  const accent = theme.accentPrimary;

  const option = {
    ...t,
    tooltip: { ...t.tooltip, position: 'top', formatter: (p: { data: [number,number,number] }) => `${p.data[2]}` },
    grid: { top: 8, right: 16, bottom: 24, left: 40 },
    xAxis: { ...t.xAxis, type: 'category', data: xLabels, splitArea: { show: true } },
    yAxis: { ...t.yAxis, type: 'category', data: yLabels, splitArea: { show: true } },
    visualMap: {
      min: 0, max: maxVal,
      show: false,
      inRange: { color: [theme.id === 'light-clean' ? '#EFF6FF' : '#ffffff08', accent] },
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
