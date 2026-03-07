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
  onDrillDown?: (name: string, value: number) => void;
}

export default function PieChartWidget({ slices, style, theme, onDrillDown }: PieChartWidgetProps) {
  const t       = buildEChartsTheme(theme);
  const isLight = theme.id === 'light-clean';

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

  const option = {
    ...t,
    tooltip: {
      ...t.tooltip,
      trigger: 'item',
      formatter: (p: { name: string; value: number; percent: number; marker: string }) =>
        `${p.marker} ${p.name}: <b>${fmtVal(p.value)}</b> (${p.percent.toFixed(1)}%)`,
    },
    legend: style.showLegend
      ? { ...t.legend, orient: 'vertical', right: 10, top: 'center', type: 'scroll' }
      : { show: false },
    series: [{
      type: 'pie',
      radius: style.showLegend ? ['40%', '68%'] : ['35%', '72%'],
      center: style.showLegend ? ['38%', '50%'] : ['50%', '50%'],
      avoidLabelOverlap: false,
      label: {
        show: !style.showLegend,
        color: isLight ? '#6B7280' : '#ffffff80',
        fontSize: 10,
        formatter: style.showDataLabels
          ? (p: { name: string; value: number; percent: number }) =>
              `${p.name}\n${fmtVal(p.value)}`
          : undefined,
      },
      labelLine: { lineStyle: { color: isLight ? '#D1D5DB' : '#ffffff20' } },
      data: slices.map((s, i) => ({
        name: s.name,
        value: s.value,
        itemStyle: {
          color: getColor(i),
          ...(theme.glowEffect ? { shadowBlur: 8, shadowColor: getColor(i) } : {}),
        },
      })),
    }],
  };

  return (
    <ReactECharts
      option={option}
      style={{ height: '100%', width: '100%' }}
      opts={{ renderer: 'canvas' }}
      onEvents={onDrillDown ? {
        click: (p: { name: string; value: number }) => onDrillDown(p.name, p.value),
      } : undefined}
    />
  );
}
