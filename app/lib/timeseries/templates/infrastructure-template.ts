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

  defaultLayout: [
    { id: 'w1', type: 'gauge',      title: 'CPU Usage',        position: { x: 0, y: 0, w: 3, h: 2 }, style: { colorScheme: 'green',  showLegend: false, showGrid: false, unit: '%', gaugeMin: 0, gaugeMax: 100 } },
    { id: 'w2', type: 'gauge',      title: 'Memory Usage',     position: { x: 3, y: 0, w: 3, h: 2 }, style: { colorScheme: 'cyan',   showLegend: false, showGrid: false, unit: '%', gaugeMin: 0, gaugeMax: 100 } },
    { id: 'w3', type: 'gauge',      title: 'Disk Usage',       position: { x: 6, y: 0, w: 3, h: 2 }, style: { colorScheme: 'amber',  showLegend: false, showGrid: false, unit: '%', gaugeMin: 0, gaugeMax: 100 } },
    { id: 'w4', type: 'stat-card',  title: 'Network I/O',      position: { x: 9, y: 0, w: 3, h: 1 }, style: { colorScheme: 'cyan',   showLegend: false, showGrid: false, unit: ' GB/s' } },
    { id: 'w5', type: 'stat-card',  title: 'Active Processes', position: { x: 9, y: 1, w: 3, h: 1 }, style: { colorScheme: 'green',  showLegend: false, showGrid: false } },
    { id: 'w6', type: 'line-chart', title: 'CPU & Memory Over Time', position: { x: 0, y: 2, w: 8, h: 3 }, style: { colorScheme: 'green', showLegend: true, showGrid: true } },
    { id: 'w7', type: 'bar-chart',  title: 'Memory by Service', position: { x: 8, y: 2, w: 4, h: 3 }, style: { colorScheme: 'cyan',  showLegend: false, showGrid: true } },
    { id: 'w8', type: 'data-table', title: 'Process Table',    position: { x: 0, y: 5, w: 12, h: 2 }, style: { colorScheme: 'green', showLegend: false, showGrid: false } },
  ],

  demoData: {
    'w1': { gaugeValue: { current: 42, min: 0, max: 100 } },
    'w2': { gaugeValue: { current: 67, min: 0, max: 100 } },
    'w3': { gaugeValue: { current: 34, min: 0, max: 100 } },
    'w4': { statValue: 1.4,  trend: '↑ 0.2', direction: 'up' },
    'w5': { statValue: 214,  trend: '+12',   direction: 'up' },
    'w6': {
      series: [
        { name: 'CPU %',    data: [['00:00',32],['02:00',28],['04:00',24],['06:00',35],['08:00',58],['10:00',72],['12:00',65],['14:00',78],['16:00',82],['18:00',69],['20:00',54],['22:00',42],['24:00',38]] },
        { name: 'Memory %', data: [['00:00',55],['02:00',53],['04:00',52],['06:00',56],['08:00',62],['10:00',70],['12:00',68],['14:00',74],['16:00',78],['18:00',72],['20:00',67],['22:00',64],['24:00',61]] },
      ],
    },
    'w7': {
      series: [{ name: 'MB', data: [['nginx',128],['postgres',512],['redis',256],['app-server',384],['worker',192]] }],
    },
    'w8': {
      columns: ['pid', 'name', 'cpu%', 'mem_mb', 'status'],
      tableRows: [
        { pid: 1842, name: 'postgres', 'cpu%': 12.4, mem_mb: 512, status: 'running' },
        { pid: 2214, name: 'node',     'cpu%': 8.2,  mem_mb: 384, status: 'running' },
        { pid: 3301, name: 'redis',    'cpu%': 2.1,  mem_mb: 256, status: 'running' },
        { pid: 4452, name: 'nginx',    'cpu%': 1.4,  mem_mb: 128, status: 'running' },
        { pid: 5568, name: 'worker',   'cpu%': 18.7, mem_mb: 192, status: 'running' },
      ],
    },
  },
};
