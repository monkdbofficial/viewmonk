import type { TemplateDefinition } from '../types';

export const businessTemplate: TemplateDefinition = {
  id: 'business-admin',
  name: 'Business Admin',
  description: 'Clean corporate dashboard for revenue, customers, growth KPIs, and sales analytics.',
  category: 'business',
  themeId: 'light-clean',
  tags: ['Business', 'Revenue', 'KPI', 'Sales', 'Light'],
  requiredSchema: { needsTimestamp: true, minNumericCols: 1, minTextCols: 1 },
  widgetCount: 7,
  demoTable: '_demo_business',

  defaultLayout: [
    { id: 'w1', type: 'stat-card',  title: 'Total Revenue',       position: { x: 0, y: 0, w: 3, h: 1 }, style: { colorScheme: 'blue',    showLegend: false, showGrid: false } },
    { id: 'w2', type: 'stat-card',  title: 'New Customers',       position: { x: 3, y: 0, w: 3, h: 1 }, style: { colorScheme: 'green',   showLegend: false, showGrid: false } },
    { id: 'w3', type: 'stat-card',  title: 'Growth Rate',         position: { x: 6, y: 0, w: 3, h: 1 }, style: { colorScheme: 'emerald', showLegend: false, showGrid: false } },
    { id: 'w4', type: 'stat-card',  title: 'Avg Order Value',     position: { x: 9, y: 0, w: 3, h: 1 }, style: { colorScheme: 'amber',   showLegend: false, showGrid: false } },
    { id: 'w5', type: 'line-chart', title: 'Revenue Trend',       position: { x: 0, y: 1, w: 8, h: 3 }, style: { colorScheme: 'blue',    showLegend: true,  showGrid: true  } },
    { id: 'w6', type: 'pie-chart',  title: 'Sales by Category',   position: { x: 8, y: 1, w: 4, h: 3 }, style: { colorScheme: 'blue',    showLegend: true,  showGrid: false } },
    { id: 'w7', type: 'data-table', title: 'Recent Transactions', position: { x: 0, y: 4, w: 12, h: 2 }, style: { colorScheme: 'blue',   showLegend: false, showGrid: false } },
  ],
};
