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
    { id: 'w1', type: 'stat-card',  title: 'Inventory Value',      position: { x: 0, y: 0, w: 3, h: 1 }, style: { colorScheme: 'blue',    showLegend: false, showGrid: false, unit: '$' } },
    { id: 'w2', type: 'stat-card',  title: 'Order Fill Rate',      position: { x: 3, y: 0, w: 3, h: 1 }, style: { colorScheme: 'green',   showLegend: false, showGrid: false, unit: '%' } },
    { id: 'w3', type: 'stat-card',  title: 'On-Time Delivery',     position: { x: 6, y: 0, w: 3, h: 1 }, style: { colorScheme: 'emerald', showLegend: false, showGrid: false, unit: '%' } },
    { id: 'w4', type: 'stat-card',  title: 'Avg Lead Time',        position: { x: 9, y: 0, w: 3, h: 1 }, style: { colorScheme: 'amber',   showLegend: false, showGrid: false, unit: ' days', invertTrend: true } },
    { id: 'w5', type: 'line-chart', title: 'Order Volume Trend',   position: { x: 0, y: 1, w: 8, h: 2 }, style: { colorScheme: 'blue',    showLegend: true,  showGrid: true,  smooth: true } },
    { id: 'w6', type: 'pie-chart',  title: 'Stock by Category',    position: { x: 8, y: 1, w: 4, h: 2 }, style: { colorScheme: 'blue',    showLegend: true,  showGrid: false } },
    { id: 'w7', type: 'bar-chart',  title: 'Supplier Performance', position: { x: 0, y: 3, w: 6, h: 2 }, style: { colorScheme: 'blue',    showLegend: false, showGrid: true  } },
    { id: 'w8', type: 'data-table', title: 'Open Purchase Orders', position: { x: 6, y: 3, w: 6, h: 2 }, style: { colorScheme: 'blue',    showLegend: false, showGrid: false } },
  ],

  demoData: {
    'w1': { statValue: 8420000, trend: '+$480k vs last month', direction: 'up' },
    'w2': { statValue: 98.2, trend: '+0.8pp vs last week', direction: 'up' },
    'w3': { statValue: 94.6, trend: '-1.2pp vs last week', direction: 'down' },
    'w4': { statValue: 4.8, trend: '-0.6 days vs Q3', direction: 'up' },
    'w5': {
      series: [
        { name: 'Orders',    data: [['Jan', 4820], ['Feb', 5100], ['Mar', 6240], ['Apr', 5890], ['May', 6410], ['Jun', 7020], ['Jul', 6840], ['Aug', 7380], ['Sep', 8120], ['Oct', 8640], ['Nov', 9280], ['Dec', 10400]] },
        { name: 'Fulfilled', data: [['Jan', 4740], ['Feb', 5020], ['Mar', 6140], ['Apr', 5810], ['May', 6320], ['Jun', 6930], ['Jul', 6760], ['Aug', 7280], ['Sep', 7980], ['Oct', 8480], ['Nov', 9120], ['Dec', 10220]] },
      ],
    },
    'w6': {
      pieSlices: [
        { name: 'Raw Materials', value: 38 },
        { name: 'Finished Goods', value: 31 },
        { name: 'Components',    value: 18 },
        { name: 'Packaging',     value: 9  },
        { name: 'MRO',           value: 4  },
      ],
    },
    'w7': {
      series: [
        { name: 'On-Time Rate (%)', data: [['Supplier A', 98], ['Supplier B', 94], ['Supplier C', 91], ['Supplier D', 88], ['Supplier E', 96], ['Supplier F', 82]] },
      ],
    },
    'w8': {
      columns: ['po_number', 'supplier', 'items', 'value', 'eta', 'status'],
      tableRows: [
        { po_number: 'PO-20481', supplier: 'Acme Materials', items: 240,  value: '$184,200', eta: '2025-03-18', status: '🚢 In Transit' },
        { po_number: 'PO-20480', supplier: 'TechComp Ltd',   items: 85,   value: '$92,400',  eta: '2025-03-20', status: '🏭 Manufacturing' },
        { po_number: 'PO-20479', supplier: 'GlobaLogix',     items: 1200, value: '$48,000',  eta: '2025-03-15', status: '✅ Delivered' },
        { po_number: 'PO-20478', supplier: 'FastParts Co',   items: 420,  value: '$67,800',  eta: '2025-03-22', status: '📋 Confirmed' },
        { po_number: 'PO-20477', supplier: 'EuroSupply',     items: 68,   value: '$241,600', eta: '2025-03-28', status: '⏳ Pending' },
        { po_number: 'PO-20476', supplier: 'Acme Materials', items: 560,  value: '$112,000', eta: '2025-03-12', status: '⚠️ Delayed' },
      ],
    },
  },
};
