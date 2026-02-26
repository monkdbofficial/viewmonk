'use client';
import ReactECharts from 'echarts-for-react';
import type { ThemeTokens } from '@/app/lib/timeseries/themes';
import type { WidgetStyle } from '@/app/lib/timeseries/types';
import type { ChartSeries } from '@/app/lib/timeseries/widget-executor';
import { buildEChartsTheme } from '@/app/lib/timeseries/themes';

interface LineChartWidgetProps {
  series: ChartSeries[];
  style: WidgetStyle;
  theme: ThemeTokens;
}

export default function LineChartWidget({ series, style, theme }: LineChartWidgetProps) {
  const t = buildEChartsTheme(theme);

  const getColor = (i: number) =>
    style.customColors?.[i] || theme.chartColors[i % theme.chartColors.length];

  // Build threshold mark lines
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

  const option = {
    ...t,
    tooltip: {
      ...t.tooltip,
      trigger: 'axis',
      axisPointer: { type: 'cross', lineStyle: { color: theme.accentPrimary + '60' } },
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
    },
    yAxis: {
      ...t.yAxis,
      type: 'value',
      axisLabel: {
        ...t.yAxis.axisLabel,
        formatter: (v: number) => {
          const prefix = style.prefix ?? '';
          const unit   = style.unit ?? '';
          const val    = style.decimals !== undefined ? v.toFixed(style.decimals) : v;
          return `${prefix}${val}${unit}`;
        },
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
          ...(theme.glowEffect ? { shadowBlur: 8, shadowColor: color } : {}),
        },
        itemStyle: { color },
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
