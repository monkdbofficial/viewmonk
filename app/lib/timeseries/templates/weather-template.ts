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
    { id: 'w1', type: 'gauge',      title: 'Current Temperature', position: { x: 0, y: 0, w: 4, h: 2 }, style: { colorScheme: 'amber',   showLegend: false, showGrid: false, unit: '°C', gaugeMin: -20, gaugeMax: 50 } },
    { id: 'w2', type: 'stat-card',  title: 'Humidity',            position: { x: 4, y: 0, w: 4, h: 1 }, style: { colorScheme: 'cyan',    showLegend: false, showGrid: false, unit: '%' } },
    { id: 'w3', type: 'stat-card',  title: 'Wind Speed',          position: { x: 4, y: 1, w: 4, h: 1 }, style: { colorScheme: 'amber',   showLegend: false, showGrid: false, unit: ' km/h' } },
    { id: 'w4', type: 'area-chart', title: '7-Day Temperature Trend', position: { x: 8, y: 0, w: 4, h: 2 }, style: { colorScheme: 'amber',  showLegend: false, showGrid: true } },
    { id: 'w5', type: 'heatmap',    title: 'Hourly Activity Heatmap', position: { x: 0, y: 2, w: 8, h: 3 }, style: { colorScheme: 'amber', showLegend: true,  showGrid: false } },
    { id: 'w6', type: 'pie-chart',  title: 'Conditions Breakdown',    position: { x: 8, y: 2, w: 4, h: 3 }, style: { colorScheme: 'amber', showLegend: true, showGrid: false } },
  ],

  demoData: {
    'w1': { gaugeValue: { current: 24.3, min: -20, max: 50 } },
    'w2': { statValue: 67.2, trend: 'comfortable', direction: 'neutral' },
    'w3': { statValue: 12.4, trend: 'light breeze', direction: 'neutral' },
    'w4': {
      series: [
        { name: 'Temperature', data: [['Mon',18.2],['Tue',21.4],['Wed',24.8],['Thu',22.1],['Fri',19.6],['Sat',23.4],['Sun',25.8]] },
      ],
    },
    'w5': {
      series: [
        { name: 'readings', data: [
          ['Mon 06:00',12],['Mon 07:00',28],['Mon 08:00',45],['Mon 09:00',62],['Mon 10:00',78],['Mon 11:00',91],['Mon 12:00',87],
          ['Tue 06:00',14],['Tue 07:00',31],['Tue 08:00',52],['Tue 09:00',68],['Tue 10:00',84],['Tue 11:00',95],['Tue 12:00',89],
          ['Wed 06:00',18],['Wed 07:00',36],['Wed 08:00',58],['Wed 09:00',72],['Wed 10:00',88],['Wed 11:00',98],['Wed 12:00',92],
        ]},
      ],
    },
    'w6': {
      pieSlices: [
        { name: 'Sunny',   value: 45 },
        { name: 'Cloudy',  value: 28 },
        { name: 'Rain',    value: 18 },
        { name: 'Fog',     value: 9 },
      ],
    },
  },
};
