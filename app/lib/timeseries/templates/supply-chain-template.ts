import type { TemplateDefinition } from '../types';

export const supplyChainTemplate: TemplateDefinition = {
  id: 'supply-chain',
  name: 'Supply Chain',
  description: 'Inventory levels, order fill rate, on-time delivery, and supplier performance — operational visibility for logistics teams.',
  category: 'business',
  themeId: 'light-clean',
  tags: ['Supply Chain', 'Inventory', 'Logistics', 'Fulfillment', 'Operations'],
  requiredSchema: { needsTimestamp: true, minNumericCols: 1, minTextCols: 1 },
  widgetCount: 8,

  defaultLayout: [
    { id: 'w1', type: 'stat-card',  title: 'Inventory Value',      position: { x: 0, y: 0, w: 3, h: 1 }, style: { colorScheme: 'blue',    showLegend: false, showGrid: false } },
    { id: 'w2', type: 'stat-card',  title: 'Order Fill Rate',      position: { x: 3, y: 0, w: 3, h: 1 }, style: { colorScheme: 'green',   showLegend: false, showGrid: false } },
    { id: 'w3', type: 'stat-card',  title: 'On-Time Delivery',     position: { x: 6, y: 0, w: 3, h: 1 }, style: { colorScheme: 'emerald', showLegend: false, showGrid: false } },
    { id: 'w4', type: 'stat-card',  title: 'Avg Lead Time',        position: { x: 9, y: 0, w: 3, h: 1 }, style: { colorScheme: 'amber',   showLegend: false, showGrid: false, invertTrend: true } },
    { id: 'w5', type: 'line-chart', title: 'Order Volume Trend',   position: { x: 0, y: 1, w: 8, h: 2 }, style: { colorScheme: 'blue',    showLegend: true,  showGrid: true,  smooth: true } },
    { id: 'w6', type: 'pie-chart',  title: 'Stock by Category',    position: { x: 8, y: 1, w: 4, h: 2 }, style: { colorScheme: 'blue',    showLegend: true,  showGrid: false } },
    { id: 'w7', type: 'bar-chart',  title: 'Supplier Performance', position: { x: 0, y: 3, w: 6, h: 2 }, style: { colorScheme: 'blue',    showLegend: false, showGrid: true  } },
    { id: 'w8', type: 'data-table', title: 'Purchase Orders',      position: { x: 6, y: 3, w: 6, h: 2 }, style: { colorScheme: 'blue',    showLegend: false, showGrid: false } },
  ],

  demoTable: '_demo_supply_chain',
};
