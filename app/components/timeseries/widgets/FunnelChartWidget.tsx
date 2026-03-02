'use client';
import ReactECharts from 'echarts-for-react';
import type { ThemeTokens } from '@/app/lib/timeseries/themes';
import type { WidgetStyle } from '@/app/lib/timeseries/types';
import { buildEChartsTheme } from '@/app/lib/timeseries/themes';

interface FunnelSlice { name: string; value: number; }

interface FunnelChartWidgetProps {
  slices: FunnelSlice[];
  style: WidgetStyle;
  theme: ThemeTokens;
}

export default function FunnelChartWidget({ slices, style, theme }: FunnelChartWidgetProps) {
  const t = buildEChartsTheme(theme);

  const getColor = (i: number) => style.customColors?.[i] || theme.chartColors[i % theme.chartColors.length];

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
      trigger: 'item',
      formatter: (p: { name: string; value: number; percent: number; marker: string }) =>
        `${p.marker} ${p.name}: <b>${fmtVal(p.value)}</b> (${p.percent.toFixed(1)}%)`,
      backgroundColor: t.tooltip.backgroundColor,
      borderColor:     t.tooltip.borderColor,
      textStyle:       t.tooltip.textStyle,
    },
    legend: style.showLegend
      ? { ...t.legend, bottom: 0, orient: 'horizontal' }
      : { show: false },
    series: [{
      type: 'funnel',
      top: 8,
      bottom: style.showLegend ? 36 : 8,
      left: '5%',
      width: '90%',
      minSize: '5%',
      maxSize: '100%',
      sort: 'descending',
      gap: 3,
      label: {
        show: true,
        position: 'inside',
        color: '#fff',
        fontSize: 12,
        fontWeight: 600,
        formatter: (p: { name: string; value: number }) => `${p.name}\n${fmtVal(p.value)}`,
      },
      itemStyle: { borderWidth: 0 },
      data: slices.map((s, i) => ({
        name: s.name,
        value: s.value,
        itemStyle: {
          color: getColor(i),
          ...(theme.glowEffect ? { shadowBlur: 6, shadowColor: getColor(i) } : {}),
        },
      })),
    }],
  };

  return <ReactECharts option={option} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'canvas' }} />;
}
