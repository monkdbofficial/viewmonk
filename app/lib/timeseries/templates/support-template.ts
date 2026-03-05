import type { TemplateDefinition } from '../types';

export const supportTemplate: TemplateDefinition = {
  id: 'customer-support',
  name: 'Customer Support Analytics',
  description: 'Ticket volume, resolution time, CSAT scores, SLA compliance, and agent performance — full visibility for support operations teams.',
  category: 'support',
  themeId: 'light-clean',
  tags: ['Support', 'CSAT', 'SLA', 'Helpdesk', 'Customer Success'],
  requiredSchema: { needsTimestamp: true, minNumericCols: 1, minTextCols: 1 },
  widgetCount: 8,

  defaultLayout: [
    { id: 'w1', type: 'stat-card',  title: 'Total Tickets',            position: { x: 0, y: 0, w: 3, h: 1 }, style: { colorScheme: 'blue',  showLegend: false, showGrid: false } },
    { id: 'w2', type: 'stat-card',  title: 'Avg Resolution (min)',     position: { x: 3, y: 0, w: 3, h: 1 }, style: { colorScheme: 'amber', showLegend: false, showGrid: false, invertTrend: true } },
    { id: 'w3', type: 'stat-card',  title: 'Satisfaction Score',       position: { x: 6, y: 0, w: 3, h: 1 }, style: { colorScheme: 'green', showLegend: false, showGrid: false } },
    { id: 'w4', type: 'gauge',      title: 'SLA Compliance %',         position: { x: 9, y: 0, w: 3, h: 2 }, style: { colorScheme: 'green', showLegend: false, showGrid: false, gaugeMin: 0, gaugeMax: 100 } },
    { id: 'w5', type: 'area-chart', title: 'Ticket Volume Trend',      position: { x: 0, y: 1, w: 9, h: 2 }, style: { colorScheme: 'blue',  showLegend: true,  showGrid: true,  smooth: true, fillOpacity: 25 } },
    { id: 'w6', type: 'bar-chart',  title: 'Tickets by Priority',      position: { x: 0, y: 3, w: 5, h: 2 }, style: { colorScheme: 'amber', showLegend: false, showGrid: true } },
    { id: 'w7', type: 'pie-chart',  title: 'Volume by Category',       position: { x: 5, y: 3, w: 4, h: 2 }, style: { colorScheme: 'cyan',  showLegend: true,  showGrid: false } },
    { id: 'w8', type: 'data-table', title: 'Agent Performance',        position: { x: 9, y: 2, w: 3, h: 3 }, style: { colorScheme: 'blue',  showLegend: false, showGrid: false } },
  ],

  demoTable: '_demo_support',
};
