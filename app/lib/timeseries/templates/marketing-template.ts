import type { TemplateDefinition } from '../types';

export const marketingTemplate: TemplateDefinition = {
  id: 'marketing-analytics',
  name: 'Marketing Analytics',
  description: 'Impressions, CTR, ROAS, and spend by channel — full-funnel visibility for performance marketing teams.',
  category: 'analytics',
  themeId: 'warm-vibrant',
  tags: ['Marketing', 'Campaigns', 'CTR', 'ROAS', 'Conversions'],
  requiredSchema: { needsTimestamp: true, minNumericCols: 1, minTextCols: 1 },
  widgetCount: 8,

  defaultLayout: [
    { id: 'w1', type: 'stat-card',  title: 'Total Impressions',     position: { x: 0, y: 0, w: 3, h: 1 }, style: { colorScheme: 'amber', showLegend: false, showGrid: false } },
    { id: 'w2', type: 'stat-card',  title: 'Click-Through Rate',    position: { x: 3, y: 0, w: 3, h: 1 }, style: { colorScheme: 'cyan',  showLegend: false, showGrid: false } },
    { id: 'w3', type: 'stat-card',  title: 'Avg Spend / Channel',   position: { x: 6, y: 0, w: 3, h: 1 }, style: { colorScheme: 'red',   showLegend: false, showGrid: false, invertTrend: true } },
    { id: 'w4', type: 'stat-card',  title: 'Return on Ad Spend',    position: { x: 9, y: 0, w: 3, h: 1 }, style: { colorScheme: 'green', showLegend: false, showGrid: false } },
    { id: 'w5', type: 'area-chart', title: 'Conversions Over Time', position: { x: 0, y: 1, w: 8, h: 2 }, style: { colorScheme: 'amber', showLegend: true,  showGrid: true,  smooth: true, fillOpacity: 30 } },
    { id: 'w6', type: 'pie-chart',  title: 'Impressions by Channel',position: { x: 8, y: 1, w: 4, h: 2 }, style: { colorScheme: 'amber', showLegend: true,  showGrid: false } },
    { id: 'w7', type: 'bar-chart',  title: 'Spend by Channel',      position: { x: 0, y: 3, w: 6, h: 2 }, style: { colorScheme: 'amber', showLegend: false, showGrid: true  } },
    { id: 'w8', type: 'data-table', title: 'Campaign Performance',  position: { x: 6, y: 3, w: 6, h: 2 }, style: { colorScheme: 'amber', showLegend: false, showGrid: false } },
  ],

  demoTable: '_demo_marketing',
};
