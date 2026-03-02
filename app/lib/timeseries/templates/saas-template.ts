import type { TemplateDefinition } from '../types';

export const saasTemplate: TemplateDefinition = {
  id: 'saas-metrics',
  name: 'SaaS Metrics',
  description: 'MRR, ARR, churn, LTV, and active-user trends — the essential growth dashboard for subscription businesses.',
  category: 'business',
  themeId: 'midnight-glow',
  tags: ['SaaS', 'MRR', 'Churn', 'Growth', 'Subscriptions'],
  requiredSchema: { needsTimestamp: true, minNumericCols: 1, minTextCols: 1 },
  widgetCount: 8,

  defaultLayout: [
    { id: 'w1', type: 'stat-card',  title: 'Monthly Recurring Revenue', position: { x: 0, y: 0, w: 3, h: 1 }, style: { colorScheme: 'blue',  showLegend: false, showGrid: false } },
    { id: 'w2', type: 'stat-card',  title: 'Annual Run Rate',           position: { x: 3, y: 0, w: 3, h: 1 }, style: { colorScheme: 'cyan',  showLegend: false, showGrid: false } },
    { id: 'w3', type: 'stat-card',  title: 'Churn Rate',                position: { x: 6, y: 0, w: 3, h: 1 }, style: { colorScheme: 'red',   showLegend: false, showGrid: false, invertTrend: true } },
    { id: 'w4', type: 'stat-card',  title: 'Avg MRR per Account',       position: { x: 9, y: 0, w: 3, h: 1 }, style: { colorScheme: 'green', showLegend: false, showGrid: false } },
    { id: 'w5', type: 'line-chart', title: 'MRR Growth',                position: { x: 0, y: 1, w: 8, h: 2 }, style: { colorScheme: 'blue',  showLegend: true,  showGrid: true,  smooth: true } },
    { id: 'w6', type: 'pie-chart',  title: 'Revenue by Plan',           position: { x: 8, y: 1, w: 4, h: 2 }, style: { colorScheme: 'cyan',  showLegend: true,  showGrid: false } },
    { id: 'w7', type: 'area-chart', title: 'Daily Active Users',        position: { x: 0, y: 3, w: 6, h: 2 }, style: { colorScheme: 'cyan',  showLegend: true,  showGrid: true,  smooth: true, fillOpacity: 30 } },
    { id: 'w8', type: 'data-table', title: 'Top Accounts',              position: { x: 6, y: 3, w: 6, h: 2 }, style: { colorScheme: 'blue',  showLegend: false, showGrid: false } },
  ],

  demoTable: '_demo_saas',
};
