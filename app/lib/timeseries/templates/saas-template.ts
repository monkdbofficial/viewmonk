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
    { id: 'w1', type: 'stat-card',  title: 'Monthly Recurring Revenue', position: { x: 0, y: 0, w: 3, h: 1 }, style: { colorScheme: 'blue',   showLegend: false, showGrid: false, unit: '$', prefix: '' } },
    { id: 'w2', type: 'stat-card',  title: 'Annual Run Rate',           position: { x: 3, y: 0, w: 3, h: 1 }, style: { colorScheme: 'cyan',   showLegend: false, showGrid: false, unit: '$' } },
    { id: 'w3', type: 'stat-card',  title: 'Churn Rate',                position: { x: 6, y: 0, w: 3, h: 1 }, style: { colorScheme: 'red',    showLegend: false, showGrid: false, unit: '%', invertTrend: true } },
    { id: 'w4', type: 'stat-card',  title: 'Customer LTV',              position: { x: 9, y: 0, w: 3, h: 1 }, style: { colorScheme: 'green',  showLegend: false, showGrid: false, unit: '$' } },
    { id: 'w5', type: 'line-chart', title: 'MRR Growth',                position: { x: 0, y: 1, w: 8, h: 2 }, style: { colorScheme: 'blue',   showLegend: true,  showGrid: true,  smooth: true } },
    { id: 'w6', type: 'pie-chart',  title: 'Revenue by Plan',           position: { x: 8, y: 1, w: 4, h: 2 }, style: { colorScheme: 'cyan',   showLegend: true,  showGrid: false } },
    { id: 'w7', type: 'area-chart', title: 'Daily Active Users',        position: { x: 0, y: 3, w: 6, h: 2 }, style: { colorScheme: 'cyan',   showLegend: true,  showGrid: true,  smooth: true, fillOpacity: 30 } },
    { id: 'w8', type: 'data-table', title: 'Top Accounts',              position: { x: 6, y: 3, w: 6, h: 2 }, style: { colorScheme: 'blue',   showLegend: false, showGrid: false } },
  ],

  demoData: {
    'w1': { statValue: 284600, trend: '+$12.4k vs last month', direction: 'up' },
    'w2': { statValue: 3415200, trend: '+18.3% YoY', direction: 'up' },
    'w3': { statValue: 2.1, trend: '-0.4% vs last month', direction: 'up' },
    'w4': { statValue: 4820, trend: '+$320 vs Q3', direction: 'up' },
    'w5': {
      series: [
        { name: 'MRR', data: [['Jan', 198000], ['Feb', 211000], ['Mar', 224000], ['Apr', 235000], ['May', 248000], ['Jun', 256000], ['Jul', 261000], ['Aug', 268000], ['Sep', 272000], ['Oct', 276000], ['Nov', 281000], ['Dec', 284600]] },
        { name: 'New MRR', data: [['Jan', 18200], ['Feb', 22400], ['Mar', 19800], ['Apr', 24600], ['May', 21300], ['Jun', 18700], ['Jul', 14200], ['Aug', 17900], ['Sep', 12400], ['Oct', 11800], ['Nov', 14200], ['Dec', 12400]] },
      ],
    },
    'w6': {
      pieSlices: [
        { name: 'Enterprise', value: 52 },
        { name: 'Growth',     value: 31 },
        { name: 'Starter',    value: 12 },
        { name: 'Free',       value: 5  },
      ],
    },
    'w7': {
      series: [
        { name: 'DAU', data: [['Jan', 8420], ['Feb', 9100], ['Mar', 9840], ['Apr', 10200], ['May', 11400], ['Jun', 11800], ['Jul', 12100], ['Aug', 12600], ['Sep', 13200], ['Oct', 13800], ['Nov', 14200], ['Dec', 14900]] },
      ],
    },
    'w8': {
      columns: ['account', 'plan', 'mrr', 'since', 'health'],
      tableRows: [
        { account: 'Acme Corp',      plan: 'Enterprise', mrr: '$12,400', since: '2022-03', health: '🟢 Healthy' },
        { account: 'TechFlow Inc',   plan: 'Enterprise', mrr: '$9,800',  since: '2022-08', health: '🟢 Healthy' },
        { account: 'DataSphere',     plan: 'Growth',     mrr: '$4,200',  since: '2023-01', health: '🟡 At Risk'  },
        { account: 'NovaSystems',    plan: 'Enterprise', mrr: '$8,600',  since: '2021-11', health: '🟢 Healthy' },
        { account: 'PulseAnalytics', plan: 'Growth',     mrr: '$3,100',  since: '2023-06', health: '🟢 Healthy' },
        { account: 'CloudBridge',    plan: 'Starter',    mrr: '$890',    since: '2024-01', health: '🔴 Churning' },
      ],
    },
  },
};
