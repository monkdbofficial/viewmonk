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

  defaultLayout: [
    { id: 'w1', type: 'stat-card',  title: 'Total Revenue',    position: { x: 0, y: 0, w: 3, h: 1 }, style: { colorScheme: 'blue',    showLegend: false, showGrid: false, unit: '$' } },
    { id: 'w2', type: 'stat-card',  title: 'New Customers',    position: { x: 3, y: 0, w: 3, h: 1 }, style: { colorScheme: 'green',   showLegend: false, showGrid: false } },
    { id: 'w3', type: 'stat-card',  title: 'Growth Rate',      position: { x: 6, y: 0, w: 3, h: 1 }, style: { colorScheme: 'emerald', showLegend: false, showGrid: false, unit: '%' } },
    { id: 'w4', type: 'stat-card',  title: 'Avg Order Value',  position: { x: 9, y: 0, w: 3, h: 1 }, style: { colorScheme: 'amber',   showLegend: false, showGrid: false, unit: '$' } },
    { id: 'w5', type: 'line-chart', title: 'Revenue Trend',    position: { x: 0, y: 1, w: 8, h: 3 }, style: { colorScheme: 'blue',   showLegend: true,  showGrid: true } },
    { id: 'w6', type: 'pie-chart',  title: 'Sales by Category',position: { x: 8, y: 1, w: 4, h: 3 }, style: { colorScheme: 'blue',   showLegend: true,  showGrid: false } },
    { id: 'w7', type: 'data-table', title: 'Recent Transactions', position: { x: 0, y: 4, w: 12, h: 2 }, style: { colorScheme: 'blue', showLegend: false, showGrid: false } },
  ],

  demoData: {
    'w1': { statValue: 45789,  trend: '+12.3%', direction: 'up' },
    'w2': { statValue: 1893,   trend: '+234 new', direction: 'up' },
    'w3': { statValue: 7.09,   trend: 'vs 6.1% last mo', direction: 'up' },
    'w4': { statValue: 124.50, trend: '+$8.20', direction: 'up' },
    'w5': {
      series: [
        { name: 'Revenue',  data: [['Jan',32100],['Feb',35400],['Mar',31800],['Apr',38900],['May',42100],['Jun',39400],['Jul',44800],['Aug',48200],['Sep',45100],['Oct',51300],['Nov',56700],['Dec',45789]] },
        { name: 'Target',   data: [['Jan',35000],['Feb',35000],['Mar',35000],['Apr',40000],['May',40000],['Jun',40000],['Jul',45000],['Aug',45000],['Sep',45000],['Oct',50000],['Nov',50000],['Dec',50000]] },
      ],
    },
    'w6': {
      pieSlices: [
        { name: 'Electronics', value: 38 },
        { name: 'Clothing',    value: 24 },
        { name: 'Home',        value: 18 },
        { name: 'Sports',      value: 12 },
        { name: 'Other',       value: 8 },
      ],
    },
    'w7': {
      columns: ['date', 'customer', 'product', 'amount', 'status'],
      tableRows: [
        { date: '2025-03-13', customer: 'Alice Johnson', product: 'Pro Plan', amount: '$299', status: 'Completed' },
        { date: '2025-03-13', customer: 'Bob Smith',     product: 'Starter',  amount: '$49',  status: 'Completed' },
        { date: '2025-03-12', customer: 'Carol White',   product: 'Enterprise', amount: '$999', status: 'Pending' },
        { date: '2025-03-12', customer: 'David Lee',     product: 'Pro Plan', amount: '$299', status: 'Completed' },
        { date: '2025-03-12', customer: 'Eva Chen',      product: 'Starter',  amount: '$49',  status: 'Refunded' },
      ],
    },
  },
};
