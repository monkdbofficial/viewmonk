'use client';
import ReactECharts from 'echarts-for-react';
import type { ThemeTokens } from '@/app/lib/timeseries/themes';
import type { WidgetStyle } from '@/app/lib/timeseries/types';
import type { GaugeData } from '@/app/lib/timeseries/widget-executor';
import { buildEChartsTheme } from '@/app/lib/timeseries/themes';

interface GaugeWidgetProps {
  data: GaugeData;
  style: WidgetStyle;
  theme: ThemeTokens;
}

export default function GaugeWidget({ data, style, theme }: GaugeWidgetProps) {
  const t   = buildEChartsTheme(theme);
  const min = style.gaugeMin ?? data.min;
  const max = style.gaugeMax ?? data.max;
  const pct = max > min ? ((data.current - min) / (max - min)) : 0;

  // Build axis line color stops from thresholds if defined,
  // otherwise fall back to the default green→amber→red ramp.
  let axisLineColors: [number, string][];

  const thresholds = (style.thresholds ?? []).slice().sort((a, b) => a.value - b.value);

  if (thresholds.length > 0) {
    // Convert threshold values to 0–1 fractions of the gauge range
    const segments: [number, string][] = thresholds.map((thr) => [
      Math.max(0, Math.min(1, (thr.value - min) / (max - min))),
      thr.color,
    ]);
    // Build ECharts color stops: each segment covers from previous stop to this stop
    axisLineColors = [];
    let prev = 0;
    for (const [frac, color] of segments) {
      if (frac > prev) {
        axisLineColors.push([frac, color]);
        prev = frac;
      }
    }
    // Fill remainder with last color or fallback
    if (prev < 1) {
      axisLineColors.push([1, segments[segments.length - 1][1] ?? (theme.id === 'light-clean' ? '#E5E7EB' : '#ffffff15')]);
    }
  } else {
    // Default: green → amber → red
    const pctNum = pct * 100;
    const gaugeColor =
      pctNum < 40 ? theme.chartColors[2] ?? '#10B981' :
      pctNum < 70 ? theme.chartColors[4] ?? '#F59E0B' :
      theme.chartColors[3] ?? '#EF4444';
    axisLineColors = [
      [pct, gaugeColor],
      [1, theme.id === 'light-clean' ? '#E5E7EB' : '#ffffff15'],
    ];
  }

  const displayPct = pct * 100;
  const pointerColor =
    thresholds.length > 0
      ? axisLineColors.find(([f]) => f >= pct)?.[1] ?? axisLineColors[axisLineColors.length - 1][1]
      : displayPct < 40 ? theme.chartColors[2] ?? '#10B981'
      : displayPct < 70 ? theme.chartColors[4] ?? '#F59E0B'
      : theme.chartColors[3] ?? '#EF4444';

  const decimalFmt = style.decimals !== undefined ? style.decimals : 1;

  const option = {
    ...t,
    tooltip: {
      ...t.tooltip,
      formatter: `{b}: {c}${style.unit ?? ''}`,
    },
    series: [{
      type: 'gauge',
      startAngle: 210,
      endAngle: -30,
      min,
      max,
      radius: '88%',
      center: ['50%', '58%'],
      splitNumber: 5,
      axisLine: {
        lineStyle: {
          width: 12,
          color: axisLineColors,
        },
      },
      pointer: {
        length: '60%',
        width: 4,
        itemStyle: { color: pointerColor },
      },
      splitLine: {
        distance: -14,
        length: 10,
        lineStyle: { color: theme.id === 'light-clean' ? '#D1D5DB' : '#ffffff20', width: 2 },
      },
      axisTick: {
        distance: -8,
        length: 6,
        lineStyle: { color: theme.id === 'light-clean' ? '#D1D5DB' : '#ffffff15' },
      },
      axisLabel: {
        distance: -28,
        color: theme.id === 'light-clean' ? '#9CA3AF' : '#ffffff50',
        fontSize: 9,
        formatter: (v: number) => {
          if (style.prefix) return `${style.prefix}${Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`;
          return Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v);
        },
      },
      title: { show: false },
      detail: {
        valueAnimation: true,
        formatter: (v: number) => {
          const prefix = style.prefix ?? '';
          const unit   = style.unit   ?? '';
          return `${prefix}${v.toFixed(decimalFmt)}${unit}`;
        },
        color: theme.id === 'light-clean' ? '#111827' : '#ffffff',
        fontSize: 20,
        fontWeight: 'bold',
        offsetCenter: [0, '30%'],
        ...(theme.glowEffect ? { textShadowBlur: 8, textShadowColor: pointerColor } : {}),
      },
      data: [{ value: Number(data.current.toFixed(decimalFmt)) }],
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
