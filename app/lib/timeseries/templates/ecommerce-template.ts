import type { TemplateDefinition } from '../types';

export const ecommerceTemplate: TemplateDefinition = {
  id: 'ecommerce-performance',
  name: 'E-commerce Performance',
  description: 'Revenue, orders, conversion rate, and channel breakdown — everything to track your online store at a glance.',
  category: 'analytics',
  themeId: 'dark-navy',
  tags: ['E-commerce', 'Sales', 'Conversion', 'Revenue', 'Orders'],
  requiredSchema: { needsTimestamp: true, minNumericCols: 1, minTextCols: 1 },
  widgetCount: 8,

  defaultLayout: [
    { id: 'w1', type: 'stat-card',  title: 'Total Revenue',      position: { x: 0, y: 0, w: 3, h: 1 }, style: { colorScheme: 'blue',    showLegend: false, showGrid: false, unit: '$' } },
    { id: 'w2', type: 'stat-card',  title: 'Orders Today',       position: { x: 3, y: 0, w: 3, h: 1 }, style: { colorScheme: 'cyan',    showLegend: false, showGrid: false } },
    { id: 'w3', type: 'stat-card',  title: 'Conversion Rate',    position: { x: 6, y: 0, w: 3, h: 1 }, style: { colorScheme: 'green',   showLegend: false, showGrid: false, unit: '%' } },
    { id: 'w4', type: 'stat-card',  title: 'Avg Order Value',    position: { x: 9, y: 0, w: 3, h: 1 }, style: { colorScheme: 'amber',   showLegend: false, showGrid: false, unit: '$' } },
    { id: 'w5', type: 'area-chart', title: 'Revenue Over Time',  position: { x: 0, y: 1, w: 8, h: 2 }, style: { colorScheme: 'blue',    showLegend: true,  showGrid: true,  smooth: true, fillOpacity: 25 } },
    { id: 'w6', type: 'pie-chart',  title: 'Sales by Category',  position: { x: 8, y: 1, w: 4, h: 2 }, style: { colorScheme: 'cyan',    showLegend: true,  showGrid: false } },
    { id: 'w7', type: 'bar-chart',  title: 'Orders by Channel',  position: { x: 0, y: 3, w: 6, h: 2 }, style: { colorScheme: 'blue',    showLegend: true,  showGrid: true  } },
    { id: 'w8', type: 'data-table', title: 'Recent Orders',      position: { x: 6, y: 3, w: 6, h: 2 }, style: { colorScheme: 'blue',    showLegend: false, showGrid: false } },
  ],

  demoData: {
    'w1': { statValue: 1482300, trend: '+24.6% vs last month', direction: 'up' },
    'w2': { statValue: 847, trend: '+12% vs yesterday', direction: 'up' },
    'w3': { statValue: 3.84, trend: '+0.6pp this week', direction: 'up' },
    'w4': { statValue: 127.50, trend: '-$4.20 vs last week', direction: 'down' },
    'w5': {
      series: [
        { name: 'Revenue', data: [['Jan', 98200], ['Feb', 112000], ['Mar', 125400], ['Apr', 108900], ['May', 134200], ['Jun', 142600], ['Jul', 138900], ['Aug', 158300], ['Sep', 162400], ['Oct', 171800], ['Nov', 198600], ['Dec', 223400]] },
        { name: 'Target',  data: [['Jan', 100000], ['Feb', 110000], ['Mar', 120000], ['Apr', 120000], ['May', 130000], ['Jun', 140000], ['Jul', 140000], ['Aug', 155000], ['Sep', 160000], ['Oct', 170000], ['Nov', 190000], ['Dec', 210000]] },
      ],
    },
    'w6': {
      pieSlices: [
        { name: 'Electronics', value: 38 },
        { name: 'Apparel',     value: 24 },
        { name: 'Home & Garden', value: 18 },
        { name: 'Beauty',      value: 12 },
        { name: 'Other',       value: 8  },
      ],
    },
    'w7': {
      series: [
        { name: 'Orders', data: [['Direct', 3240], ['Organic Search', 2890], ['Paid Search', 1920], ['Social Media', 1480], ['Email', 1240], ['Referral', 680], ['Marketplace', 560]] },
      ],
    },
    'w8': {
      columns: ['order_id', 'customer', 'items', 'total', 'status', 'date'],
      tableRows: [
        { order_id: '#ORD-9841', customer: 'Sarah M.',     items: 3, total: '$284.50', status: '✅ Delivered', date: 'Today 14:22' },
        { order_id: '#ORD-9840', customer: 'James T.',     items: 1, total: '$89.00',  status: '📦 Shipped',  date: 'Today 13:48' },
        { order_id: '#ORD-9839', customer: 'Priya K.',     items: 5, total: '$412.75', status: '🔄 Processing', date: 'Today 12:15' },
        { order_id: '#ORD-9838', customer: 'Michael R.',   items: 2, total: '$156.20', status: '📦 Shipped',  date: 'Today 11:02' },
        { order_id: '#ORD-9837', customer: 'Emma L.',      items: 4, total: '$338.90', status: '✅ Delivered', date: 'Today 09:34' },
        { order_id: '#ORD-9836', customer: 'David C.',     items: 1, total: '$54.00',  status: '❌ Cancelled', date: 'Today 08:11' },
      ],
    },
  },
};
