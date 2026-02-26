'use client';
import ReactECharts from 'echarts-for-react';
import type { ThemeTokens } from '@/app/lib/timeseries/themes';
import type { WidgetStyle } from '@/app/lib/timeseries/types';
import type { PieSlice } from '@/app/lib/timeseries/widget-executor';
import { buildEChartsTheme } from '@/app/lib/timeseries/themes';

interface PieChartWidgetProps {
  slices: PieSlice[];
  style: WidgetStyle;
  theme: ThemeTokens;
}

export default function PieChartWidget({ slices, style, theme }: PieChartWidgetProps) {
  const t = buildEChartsTheme(theme);

  const option = {
    ...t,
    tooltip: {
      ...t.tooltip,
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
    },
    legend: style.showLegend
      ? { ...t.legend, orient: 'vertical', right: 10, top: 'center', type: 'scroll' }
      : { show: false },
    series: [{
      type: 'pie',
      radius: style.showLegend ? ['40%', '68%'] : ['35%', '72%'],
      center: style.showLegend ? ['38%', '50%'] : ['50%', '50%'],
      avoidLabelOverlap: false,
      label: { show: !style.showLegend, color: theme.id === 'light-clean' ? '#6B7280' : '#ffffff80', fontSize: 10 },
      labelLine: { lineStyle: { color: theme.id === 'light-clean' ? '#D1D5DB' : '#ffffff20' } },
      data: slices.map((s, i) => ({
        name: s.name,
        value: s.value,
        itemStyle: {
          color: theme.chartColors[i % theme.chartColors.length],
          ...(theme.glowEffect ? { shadowBlur: 8, shadowColor: theme.chartColors[i % theme.chartColors.length] } : {}),
        },
      })),
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
