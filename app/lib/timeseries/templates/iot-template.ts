import type { TemplateDefinition } from '../types';

export const iotTemplate: TemplateDefinition = {
  id: 'iot-sensor-monitor',
  name: 'IoT Sensor Monitor',
  description: 'Real-time monitoring for temperature, humidity, and environmental sensors across multiple locations.',
  category: 'iot',
  themeId: 'dark-navy',
  tags: ['IoT', 'Sensors', 'Real-time', 'Temperature'],
  requiredSchema: { needsTimestamp: true, minNumericCols: 2, minTextCols: 1 },
  widgetCount: 8,
  demoTable: '_demo_iot',

  defaultLayout: [
    { id: 'w1', type: 'stat-card',  title: 'Total Readings',       position: { x: 0, y: 0, w: 3, h: 1 }, style: { colorScheme: 'blue',  showLegend: false, showGrid: false } },
    { id: 'w2', type: 'stat-card',  title: 'Avg Temperature',      position: { x: 3, y: 0, w: 3, h: 1 }, style: { colorScheme: 'red',   showLegend: false, showGrid: false } },
    { id: 'w3', type: 'stat-card',  title: 'Avg Humidity',         position: { x: 6, y: 0, w: 3, h: 1 }, style: { colorScheme: 'cyan',  showLegend: false, showGrid: false } },
    { id: 'w4', type: 'stat-card',  title: 'Max Wind Speed',       position: { x: 9, y: 0, w: 3, h: 1 }, style: { colorScheme: 'amber', showLegend: false, showGrid: false } },
    { id: 'w5', type: 'area-chart', title: 'Temperature Trend',    position: { x: 0, y: 1, w: 8, h: 3 }, style: { colorScheme: 'blue',  showLegend: true,  showGrid: true  } },
    { id: 'w6', type: 'bar-chart',  title: 'Readings by Location', position: { x: 8, y: 1, w: 4, h: 3 }, style: { colorScheme: 'cyan',  showLegend: false, showGrid: true  } },
    { id: 'w7', type: 'gauge',      title: 'Current Avg Temp',     position: { x: 0, y: 4, w: 4, h: 2 }, style: { colorScheme: 'red',   showLegend: false, showGrid: false, gaugeMin: -20, gaugeMax: 60 } },
    { id: 'w8', type: 'data-table', title: 'Recent Readings',      position: { x: 4, y: 4, w: 8, h: 2 }, style: { colorScheme: 'blue',  showLegend: false, showGrid: false } },
  ],
};
