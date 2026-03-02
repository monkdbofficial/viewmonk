import type { TemplateDefinition } from '../types';

export const weatherTemplate: TemplateDefinition = {
  id: 'weather-station',
  name: 'Weather Station',
  description: 'Environmental monitoring with temperature gauge, 7-day trend, conditions breakdown, and hourly heatmap.',
  category: 'weather',
  themeId: 'warm-vibrant',
  tags: ['Weather', 'Environment', 'Temperature', 'Climate'],
  requiredSchema: { needsTimestamp: true, minNumericCols: 2, minTextCols: 0 },
  widgetCount: 6,

  defaultLayout: [
    { id: 'w1', type: 'gauge',      title: 'Current Temperature',     position: { x: 0, y: 0, w: 4, h: 2 }, style: { colorScheme: 'amber', showLegend: false, showGrid: false, gaugeMin: -20, gaugeMax: 50 } },
    { id: 'w2', type: 'stat-card',  title: 'Humidity',                position: { x: 4, y: 0, w: 4, h: 1 }, style: { colorScheme: 'cyan',  showLegend: false, showGrid: false } },
    { id: 'w3', type: 'stat-card',  title: 'Wind Speed',              position: { x: 4, y: 1, w: 4, h: 1 }, style: { colorScheme: 'amber', showLegend: false, showGrid: false } },
    { id: 'w4', type: 'area-chart', title: '7-Day Temperature Trend', position: { x: 8, y: 0, w: 4, h: 2 }, style: { colorScheme: 'amber', showLegend: false, showGrid: true  } },
    { id: 'w5', type: 'heatmap',    title: 'Hourly Activity Heatmap', position: { x: 0, y: 2, w: 8, h: 3 }, style: { colorScheme: 'amber', showLegend: true,  showGrid: false } },
    { id: 'w6', type: 'pie-chart',  title: 'Conditions Breakdown',    position: { x: 8, y: 2, w: 4, h: 3 }, style: { colorScheme: 'amber', showLegend: true,  showGrid: false } },
  ],

  demoTable: '_demo_weather',
};
