import type { TemplateDefinition } from '../types';

export const financeTemplate: TemplateDefinition = {
  id: 'finance-dashboard',
  name: 'Finance Dashboard',
  description: 'Portfolio tracking, price trends, asset distribution, and trade history with luxury purple styling.',
  category: 'finance',
  themeId: 'purple-storm',
  tags: ['Finance', 'Portfolio', 'Trading', 'Stocks'],
  requiredSchema: { needsTimestamp: true, minNumericCols: 1, minTextCols: 1 },
  widgetCount: 6,
  demoTable: '_demo_finance',

  defaultLayout: [
    { id: 'w1', type: 'stat-card',  title: 'Portfolio Value',    position: { x: 0, y: 0, w: 4, h: 1 },  style: { colorScheme: 'purple', showLegend: false, showGrid: false } },
    { id: 'w2', type: 'stat-card',  title: 'Avg Price',          position: { x: 4, y: 0, w: 4, h: 1 },  style: { colorScheme: 'pink',   showLegend: false, showGrid: false } },
    { id: 'w3', type: 'stat-card',  title: 'Total Trades',       position: { x: 8, y: 0, w: 4, h: 1 },  style: { colorScheme: 'purple', showLegend: false, showGrid: false } },
    { id: 'w4', type: 'area-chart', title: 'Price Over Time',    position: { x: 0, y: 1, w: 12, h: 3 }, style: { colorScheme: 'purple', showLegend: true,  showGrid: true  } },
    { id: 'w5', type: 'pie-chart',  title: 'Asset Distribution', position: { x: 0, y: 4, w: 4, h: 2 },  style: { colorScheme: 'purple', showLegend: true,  showGrid: false } },
    { id: 'w6', type: 'data-table', title: 'Trade History',      position: { x: 4, y: 4, w: 8, h: 2 },  style: { colorScheme: 'purple', showLegend: false, showGrid: false } },
  ],
};
