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
    { id: 'w1', type: 'stat-card',  title: 'Total Consumption',    position: { x: 0, y: 0, w: 3, h: 1 }, style: { colorScheme: 'cyan',   showLegend: false, showGrid: false, unit: ' kWh' } },
    { id: 'w2', type: 'stat-card',  title: 'Peak Load',            position: { x: 3, y: 0, w: 3, h: 1 }, style: { colorScheme: 'amber',  showLegend: false, showGrid: false, unit: ' kW' } },
    { id: 'w3', type: 'stat-card',  title: 'Carbon Intensity',     position: { x: 6, y: 0, w: 3, h: 1 }, style: { colorScheme: 'green',  showLegend: false, showGrid: false, unit: ' gCO2/kWh', invertTrend: true } },
    { id: 'w4', type: 'gauge',      title: 'Grid Efficiency',      position: { x: 9, y: 0, w: 3, h: 2 }, style: { colorScheme: 'green',  showLegend: false, showGrid: false, gaugeMin: 0, gaugeMax: 100, unit: '' } },
    { id: 'w5', type: 'area-chart', title: 'Power Consumption',    position: { x: 0, y: 1, w: 9, h: 2 }, style: { colorScheme: 'cyan',   showLegend: true,  showGrid: true,  smooth: true, fillOpacity: 20 } },
    { id: 'w6', type: 'pie-chart',  title: 'Energy by Source',     position: { x: 0, y: 3, w: 4, h: 2 }, style: { colorScheme: 'green',  showLegend: true,  showGrid: false } },
    { id: 'w7', type: 'heatmap',    title: 'Hourly Load Profile',  position: { x: 4, y: 3, w: 8, h: 2 }, style: { colorScheme: 'cyan',   showLegend: false, showGrid: false } },
  ],

  demoData: {
    'w1': { statValue: 48240, trend: '-3.2% vs last month', direction: 'up' },
    'w2': { statValue: 842, trend: '+18 kW vs yesterday', direction: 'down' },
    'w3': { statValue: 184, trend: '-22 gCO2/kWh vs last year', direction: 'up' },
    'w4': { statValue: 87 },
    'w5': {
      series: [
        { name: 'Total (kW)',    data: [['00:00', 320], ['02:00', 284], ['04:00', 261], ['06:00', 380], ['08:00', 620], ['10:00', 724], ['12:00', 812], ['14:00', 796], ['16:00', 841], ['18:00', 762], ['20:00', 640], ['22:00', 480]] },
        { name: 'Solar (kW)',    data: [['00:00', 0],   ['02:00', 0],   ['04:00', 0],   ['06:00', 42],  ['08:00', 186], ['10:00', 312], ['12:00', 384], ['14:00', 368], ['16:00', 280], ['18:00', 82],  ['20:00', 0],   ['22:00', 0]  ] },
      ],
    },
    'w6': {
      pieSlices: [
        { name: 'Grid',          value: 52 },
        { name: 'Solar',         value: 28 },
        { name: 'Wind',          value: 12 },
        { name: 'Battery',       value: 6  },
        { name: 'Generator',     value: 2  },
      ],
    },
    'w7': {
      heatmapData: [
        { day: 'Mon', hour: '08', value: 620 }, { day: 'Mon', hour: '12', value: 810 }, { day: 'Mon', hour: '16', value: 840 }, { day: 'Mon', hour: '20', value: 620 },
        { day: 'Tue', hour: '08', value: 590 }, { day: 'Tue', hour: '12', value: 798 }, { day: 'Tue', hour: '16', value: 820 }, { day: 'Tue', hour: '20', value: 640 },
        { day: 'Wed', hour: '08', value: 640 }, { day: 'Wed', hour: '12', value: 832 }, { day: 'Wed', hour: '16', value: 860 }, { day: 'Wed', hour: '20', value: 610 },
        { day: 'Thu', hour: '08', value: 610 }, { day: 'Thu', hour: '12', value: 806 }, { day: 'Thu', hour: '16', value: 842 }, { day: 'Thu', hour: '20', value: 590 },
        { day: 'Fri', hour: '08', value: 580 }, { day: 'Fri', hour: '12', value: 778 }, { day: 'Fri', hour: '16', value: 804 }, { day: 'Fri', hour: '20', value: 560 },
        { day: 'Sat', hour: '08', value: 420 }, { day: 'Sat', hour: '12', value: 510 }, { day: 'Sat', hour: '16', value: 480 }, { day: 'Sat', hour: '20', value: 390 },
        { day: 'Sun', hour: '08', value: 380 }, { day: 'Sun', hour: '12', value: 460 }, { day: 'Sun', hour: '16', value: 440 }, { day: 'Sun', hour: '20', value: 340 },
      ],
    },
  },
};
