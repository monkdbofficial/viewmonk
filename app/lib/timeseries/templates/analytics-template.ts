import type { TemplateDefinition } from '../types';

export const analyticsTemplate: TemplateDefinition = {
  id: 'analytics-studio',
  name: 'Analytics Studio',
  description: 'Event analytics, user activity tracking, and funnel metrics with neon-glow visualizations.',
  category: 'analytics',
  themeId: 'midnight-glow',
  tags: ['Analytics', 'Events', 'Users', 'Funnel'],
  requiredSchema: { needsTimestamp: true, minNumericCols: 1, minTextCols: 1 },
  widgetCount: 7,
  demoTable: '_demo_analytics',

  defaultLayout: [
    { id: 'w1', type: 'stat-card',  title: 'Total Events',      position: { x: 0, y: 0, w: 4, h: 1 },  style: { colorScheme: 'cyan',  showLegend: false, showGrid: false } },
    { id: 'w2', type: 'stat-card',  title: 'Uptime',            position: { x: 4, y: 0, w: 4, h: 1 },  style: { colorScheme: 'green', showLegend: false, showGrid: false } },
    { id: 'w3', type: 'gauge',      title: 'Satisfaction Score',position: { x: 8, y: 0, w: 4, h: 1 },  style: { colorScheme: 'cyan',  showLegend: false, showGrid: false, gaugeMin: 0, gaugeMax: 10 } },
    { id: 'w4', type: 'area-chart', title: 'Events Over Time',  position: { x: 0, y: 1, w: 12, h: 3 }, style: { colorScheme: 'cyan',  showLegend: true,  showGrid: true  } },
    { id: 'w5', type: 'bar-chart',  title: 'Events by Type',    position: { x: 0, y: 4, w: 6, h: 2 },  style: { colorScheme: 'blue',  showLegend: false, showGrid: true  } },
    { id: 'w6', type: 'pie-chart',  title: 'Source Breakdown',  position: { x: 6, y: 4, w: 3, h: 2 },  style: { colorScheme: 'cyan',  showLegend: true,  showGrid: false } },
    { id: 'w7', type: 'data-table', title: 'Recent Events',     position: { x: 9, y: 4, w: 3, h: 2 },  style: { colorScheme: 'cyan',  showLegend: false, showGrid: false } },
  ],
};
