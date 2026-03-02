'use client';
import ReactECharts from 'echarts-for-react';
import type { ThemeTokens } from '@/app/lib/timeseries/themes';
import type { WidgetStyle } from '@/app/lib/timeseries/types';
import { buildEChartsTheme } from '@/app/lib/timeseries/themes';

export interface TreemapNode {
  name: string;
  value: number;
  children?: TreemapNode[];
}

interface TreemapWidgetProps {
  nodes: TreemapNode[];
  style: WidgetStyle;
  theme: ThemeTokens;
}

export default function TreemapWidget({ nodes, style, theme }: TreemapWidgetProps) {
  const t       = buildEChartsTheme(theme);
  const isLight = theme.id === 'light-clean';

  // Respect customColors when provided; fall back to theme palette
  const levelColors = (style.customColors?.filter(Boolean).length ?? 0) > 0
    ? style.customColors!.filter(Boolean)
    : theme.chartColors;

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
      formatter: (p: { name: string; value: number; treePathInfo: { name: string }[] }) => {
        const path = p.treePathInfo.map((n) => n.name).join(' › ');
        return `${path}<br/><b>${fmtVal(p.value)}</b>`;
      },
      backgroundColor: t.tooltip.backgroundColor,
      borderColor:     t.tooltip.borderColor,
      textStyle:       t.tooltip.textStyle,
    },
    series: [{
      type: 'treemap',
      top: 4, bottom: 4, left: 4, right: 4,
      roam: false,
      nodeClick: false,
      breadcrumb: { show: false },
      label: {
        show: true,
        fontSize: 12,
        fontWeight: 600,
        color: isLight ? '#1f2937' : '#ffffff',
        formatter: (p: { name: string; value: number }) => `${p.name}\n${fmtVal(p.value)}`,
      },
      upperLabel: {
        show: true,
        height: 22,
        color: isLight ? '#1f2937' : '#fff',
        fontSize: 11,
        fontWeight: 700,
      },
      itemStyle: { borderWidth: 2, borderColor: isLight ? '#f1f5f9' : '#00000030', gapWidth: 2 },
      levels: levelColors.map((color, i) => ({
        itemStyle: {
          color,
          borderWidth: i === 0 ? 3 : 1,
          borderColor: isLight ? '#e2e8f0' : '#00000040',
          gapWidth: i === 0 ? 3 : 1,
        },
        upperLabel: { show: i === 0 },
      })),
      data: nodes,
    }],
  };

  return <ReactECharts option={option} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'canvas' }} />;
}
