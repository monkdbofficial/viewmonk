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
    { id: 'w1', type: 'stat-card',  title: 'Total Revenue',     position: { x: 0, y: 0, w: 3, h: 1 }, style: { colorScheme: 'blue',  showLegend: false, showGrid: false } },
    { id: 'w2', type: 'stat-card',  title: 'Total Orders',      position: { x: 3, y: 0, w: 3, h: 1 }, style: { colorScheme: 'cyan',  showLegend: false, showGrid: false } },
    { id: 'w3', type: 'stat-card',  title: 'Avg Items / Order', position: { x: 6, y: 0, w: 3, h: 1 }, style: { colorScheme: 'green', showLegend: false, showGrid: false } },
    { id: 'w4', type: 'stat-card',  title: 'Avg Order Value',   position: { x: 9, y: 0, w: 3, h: 1 }, style: { colorScheme: 'amber', showLegend: false, showGrid: false } },
    { id: 'w5', type: 'area-chart', title: 'Revenue Over Time', position: { x: 0, y: 1, w: 8, h: 2 }, style: { colorScheme: 'blue',  showLegend: true,  showGrid: true,  smooth: true, fillOpacity: 25 } },
    { id: 'w6', type: 'pie-chart',  title: 'Sales by Category', position: { x: 8, y: 1, w: 4, h: 2 }, style: { colorScheme: 'cyan',  showLegend: true,  showGrid: false } },
    { id: 'w7', type: 'bar-chart',  title: 'Orders by Channel', position: { x: 0, y: 3, w: 6, h: 2 }, style: { colorScheme: 'blue',  showLegend: true,  showGrid: true  } },
    { id: 'w8', type: 'data-table', title: 'Recent Orders',     position: { x: 6, y: 3, w: 6, h: 2 }, style: { colorScheme: 'blue',  showLegend: false, showGrid: false } },
  ],

  demoTable: '_demo_ecommerce',
};
