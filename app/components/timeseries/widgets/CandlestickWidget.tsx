'use client';
import ReactECharts from 'echarts-for-react';
import type { ThemeTokens } from '@/app/lib/timeseries/themes';
import type { WidgetStyle } from '@/app/lib/timeseries/types';
import { buildEChartsTheme } from '@/app/lib/timeseries/themes';

export interface CandlePoint {
  date: string;
  open: number;
  close: number;
  low: number;
  high: number;
}

interface CandlestickWidgetProps {
  candles: CandlePoint[];
  style: WidgetStyle;
  theme: ThemeTokens;
}

export default function CandlestickWidget({ candles, style, theme }: CandlestickWidgetProps) {
  const t       = buildEChartsTheme(theme);
  const isLight = theme.id === 'light-clean';

  // Allow custom colors: index 0 = up (bullish), index 1 = down (bearish)
  const upColor   = style.customColors?.[0] || '#10B981';
  const downColor = style.customColors?.[1] || '#EF4444';

  const fmtVal = (v: number) => {
    const prefix = style.prefix ?? '';
    const unit   = style.unit   ?? '';
    const val    = style.decimals !== undefined
      ? v.toFixed(style.decimals)
      : v.toLocaleString(undefined, { maximumFractionDigits: 4 });
    return `${prefix}${val}${unit}`;
  };

  const fmtDate = (s: string): string => {
    try {
      const d = new Date(s);
      if (isNaN(d.getTime())) return s;
      if (d.getHours() !== 0 || d.getMinutes() !== 0 || d.getSeconds() !== 0) {
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
      }
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch { return s; }
  };

  const dates = candles.map((c) => fmtDate(c.date));
  const ohlc  = candles.map((c) => [c.open, c.close, c.low, c.high]);

  const option = {
    ...t,
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      backgroundColor: t.tooltip.backgroundColor,
      borderColor:     t.tooltip.borderColor,
      textStyle:       t.tooltip.textStyle,
      formatter: (params: { name: string; data: number[] }[]) => {
        const p = params[0];
        if (!p) return '';
        const [o, c, l, h] = p.data;
        const dir = c >= o ? '▲' : '▼';
        const col = c >= o ? upColor : downColor;
        return `<b>${p.name}</b><br/><span style="color:${col}">${dir}</span> O: ${fmtVal(o)} H: ${fmtVal(h)} L: ${fmtVal(l)} C: ${fmtVal(c)}`;
      },
    },
    grid: { top: 12, right: 12, bottom: style.showGrid ? 40 : 28, left: 0, containLabel: true },
    xAxis: {
      ...t.xAxis,
      type: 'category',
      data: dates,
      boundaryGap: true,
      axisLabel: { ...t.xAxis.axisLabel, interval: Math.max(0, Math.floor(dates.length / 6) - 1) },
    },
    yAxis: {
      ...t.yAxis,
      type: 'value',
      scale: true,
      splitLine: { show: style.showGrid, lineStyle: { color: t.yAxis.splitLine?.lineStyle?.color } },
      axisLabel: {
        ...t.yAxis.axisLabel,
        formatter: (v: number) => fmtVal(v),
      },
    },
    series: [{
      type: 'candlestick',
      data: ohlc,
      itemStyle: {
        color: upColor,
        color0: downColor,
        borderColor: upColor,
        borderColor0: downColor,
        ...(theme.glowEffect
          ? { shadowBlur: 4, shadowColor: isLight ? `${upColor}40` : `${upColor}60` }
          : {}),
      },
    }],
  };

  return <ReactECharts option={option} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'canvas' }} />;
}
