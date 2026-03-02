import type { TemplateDefinition } from '../types';

export const energyTemplate: TemplateDefinition = {
  id: 'energy-management',
  name: 'Energy Management',
  description: 'Power consumption, peak load, grid efficiency, and carbon intensity — smart energy monitoring for facilities and industry.',
  category: 'iot',
  themeId: 'neon-cyber',
  tags: ['Energy', 'Power', 'Consumption', 'Efficiency', 'Smart Grid'],
  requiredSchema: { needsTimestamp: true, minNumericCols: 2, minTextCols: 1 },
  widgetCount: 7,

  defaultLayout: [
    { id: 'w1', type: 'stat-card',  title: 'Total Consumption',   position: { x: 0, y: 0, w: 3, h: 1 }, style: { colorScheme: 'cyan',  showLegend: false, showGrid: false } },
    { id: 'w2', type: 'stat-card',  title: 'Peak Load',           position: { x: 3, y: 0, w: 3, h: 1 }, style: { colorScheme: 'amber', showLegend: false, showGrid: false } },
    { id: 'w3', type: 'stat-card',  title: 'Carbon Intensity',    position: { x: 6, y: 0, w: 3, h: 1 }, style: { colorScheme: 'green', showLegend: false, showGrid: false, invertTrend: true } },
    { id: 'w4', type: 'gauge',      title: 'Grid Efficiency',     position: { x: 9, y: 0, w: 3, h: 2 }, style: { colorScheme: 'green', showLegend: false, showGrid: false, gaugeMin: 0, gaugeMax: 100 } },
    { id: 'w5', type: 'area-chart', title: 'Power Consumption',   position: { x: 0, y: 1, w: 9, h: 2 }, style: { colorScheme: 'cyan',  showLegend: true,  showGrid: true,  smooth: true, fillOpacity: 20 } },
    { id: 'w6', type: 'pie-chart',  title: 'Energy by Source',    position: { x: 0, y: 3, w: 4, h: 2 }, style: { colorScheme: 'green', showLegend: true,  showGrid: false } },
    { id: 'w7', type: 'heatmap',    title: 'Hourly Load Profile', position: { x: 4, y: 3, w: 8, h: 2 }, style: { colorScheme: 'cyan',  showLegend: false, showGrid: false } },
  ],

  demoTable: '_demo_energy',
};
