'use client';
import ReactECharts from 'echarts-for-react';
import type { ThemeTokens } from '@/app/lib/timeseries/themes';
import type { WidgetStyle } from '@/app/lib/timeseries/types';
import { buildEChartsTheme } from '@/app/lib/timeseries/themes';

interface ScatterChartWidgetProps {
  points: [number, number, string?][];   // [x, y, label?]
  xLabel?: string;
  yLabel?: string;
  style: WidgetStyle;
  theme: ThemeTokens;
}

export default function ScatterChartWidget({ points, xLabel, yLabel, style, theme }: ScatterChartWidgetProps) {
  const t   = buildEChartsTheme(theme);
  const col = style.customColors?.[0] || theme.chartColors[0];

  const option = {
    ...t,
    tooltip: {
      trigger: 'item',
      formatter: (p: { value: [number, number]; name?: string }) =>
        `${p.name ? `<b>${p.name}</b><br/>` : ''}${xLabel ?? 'X'}: ${p.value[0]}<br/>${yLabel ?? 'Y'}: ${p.value[1]}`,
      backgroundColor: t.tooltip.backgroundColor,
      borderColor:     t.tooltip.borderColor,
      textStyle:       t.tooltip.textStyle,
    },
    grid: { top: 12, right: 20, bottom: 32, left: 0, containLabel: true },
    xAxis: {
      ...t.xAxis,
      type: 'value',
      name: xLabel,
      nameLocation: 'middle',
      nameGap: 24,
      nameTextStyle: { color: t.xAxis.axisLabel.color, fontSize: 11 },
      splitLine: { show: style.showGrid, lineStyle: { color: t.xAxis.splitLine?.lineStyle?.color } },
    },
    yAxis: {
      ...t.yAxis,
      type: 'value',
      name: yLabel,
      nameLocation: 'middle',
      nameGap: 40,
      nameTextStyle: { color: t.yAxis.axisLabel.color, fontSize: 11 },
      splitLine: { show: style.showGrid, lineStyle: { color: t.yAxis.splitLine?.lineStyle?.color } },
    },
    series: [{
      type: 'scatter',
      data: points.map(([x, y, lbl]) => ({ value: [x, y], name: lbl })),
      symbolSize: 10,
      itemStyle: {
        color: col,
        opacity: 0.75,
        ...(theme.glowEffect ? { shadowBlur: 8, shadowColor: col } : {}),
      },
    }],
  };

  return <ReactECharts option={option} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'canvas' }} />;
}
