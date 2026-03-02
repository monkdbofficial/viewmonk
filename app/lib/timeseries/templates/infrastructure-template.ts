import type { TemplateDefinition } from '../types';

export const infrastructureTemplate: TemplateDefinition = {
  id: 'infrastructure-monitor',
  name: 'Infrastructure Monitor',
  description: 'CPU, memory, disk, and network monitoring for servers and containers with cyberpunk neon styling.',
  category: 'infrastructure',
  themeId: 'neon-cyber',
  tags: ['DevOps', 'Server', 'CPU', 'Memory', 'Network'],
  requiredSchema: { needsTimestamp: true, minNumericCols: 2, minTextCols: 1 },
  widgetCount: 8,
  demoTable: '_demo_infrastructure',

  defaultLayout: [
    { id: 'w1', type: 'gauge',      title: 'CPU Usage',              position: { x: 0, y: 0, w: 3, h: 2 },  style: { colorScheme: 'green', showLegend: false, showGrid: false, gaugeMin: 0, gaugeMax: 100 } },
    { id: 'w2', type: 'gauge',      title: 'Memory Usage',           position: { x: 3, y: 0, w: 3, h: 2 },  style: { colorScheme: 'cyan',  showLegend: false, showGrid: false, gaugeMin: 0, gaugeMax: 100 } },
    { id: 'w3', type: 'gauge',      title: 'Disk Usage',             position: { x: 6, y: 0, w: 3, h: 2 },  style: { colorScheme: 'amber', showLegend: false, showGrid: false, gaugeMin: 0, gaugeMax: 100 } },
    { id: 'w4', type: 'stat-card',  title: 'Network I/O',            position: { x: 9, y: 0, w: 3, h: 1 },  style: { colorScheme: 'cyan',  showLegend: false, showGrid: false } },
    { id: 'w5', type: 'stat-card',  title: 'Active Processes',       position: { x: 9, y: 1, w: 3, h: 1 },  style: { colorScheme: 'green', showLegend: false, showGrid: false } },
    { id: 'w6', type: 'line-chart', title: 'CPU & Memory Over Time', position: { x: 0, y: 2, w: 8, h: 3 },  style: { colorScheme: 'green', showLegend: true,  showGrid: true  } },
    { id: 'w7', type: 'bar-chart',  title: 'Memory by Service',      position: { x: 8, y: 2, w: 4, h: 3 },  style: { colorScheme: 'cyan',  showLegend: false, showGrid: true  } },
    { id: 'w8', type: 'data-table', title: 'Process Table',          position: { x: 0, y: 5, w: 12, h: 2 }, style: { colorScheme: 'green', showLegend: false, showGrid: false } },
  ],
};
