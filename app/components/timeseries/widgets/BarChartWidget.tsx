'use client';
import ReactECharts from 'echarts-for-react';
import type { ThemeTokens } from '@/app/lib/timeseries/themes';
import type { WidgetStyle } from '@/app/lib/timeseries/types';
import type { ChartSeries } from '@/app/lib/timeseries/widget-executor';
import { buildEChartsTheme } from '@/app/lib/timeseries/themes';

interface BarChartWidgetProps {
  series: ChartSeries[];
  style: WidgetStyle;
  theme: ThemeTokens;
  onDrillDown?: (column: string, value: string) => void;
}

export default function BarChartWidget({ series, style, theme, onDrillDown }: BarChartWidgetProps) {
  const t = buildEChartsTheme(theme);
  const categories = series[0]?.data.map((d) => d[0]) ?? [];

  const getColor = (i: number) =>
    style.customColors?.[i] || theme.chartColors[i % theme.chartColors.length];

  // Threshold markLines
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

  const option = {
    ...t,
    tooltip: {
      ...t.tooltip,
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
    },
    legend: style.showLegend && series.length > 1
      ? { ...t.legend, bottom: 0 }
      : { show: false },
    grid: {
      top: 8, right: 12,
      bottom: style.showLegend && series.length > 1 ? 36 : 24,
      left: 0, containLabel: true,
    },
    xAxis: {
      ...t.xAxis,
      type: 'category',
      data: categories,
      axisLabel: {
        ...t.xAxis.axisLabel,
        interval: 0,
        rotate: categories.length > 6 ? 30 : 0,
      },
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
        type: 'bar',
        barMaxWidth: 40,
        barMinHeight: 2,
        data: s.data.map((d) => d[1]),
        itemStyle: {
          color,
          borderRadius: [4, 4, 0, 0],
          ...(theme.glowEffect ? { shadowBlur: 6, shadowColor: color } : {}),
        },
        label: style.showDataLabels
          ? {
              show: true,
              position: 'top' as const,
              fontSize: 10,
              color: theme.id === 'light-clean' ? '#374151' : '#ffffff80',
              formatter: (p: { value: number }) => {
                const prefix = style.prefix ?? '';
                const unit   = style.unit   ?? '';
                const val    = style.decimals !== undefined ? p.value.toFixed(style.decimals) : p.value;
                return `${prefix}${val}${unit}`;
              },
            }
          : { show: false },
        markLine,
      };
    }),
  };

  return (
    <ReactECharts
      option={option}
      style={{ height: '100%', width: '100%' }}
      opts={{ renderer: 'canvas' }}
      onEvents={onDrillDown ? {
        click: (params: { name: string }) => onDrillDown('category', params.name),
      } : {}}
    />
  );
}
