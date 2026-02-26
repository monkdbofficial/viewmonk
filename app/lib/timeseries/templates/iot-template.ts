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

  defaultLayout: [
    { id: 'w1', type: 'stat-card', title: 'Total Readings',    position: { x: 0, y: 0, w: 3, h: 1 }, style: { colorScheme: 'blue',    showLegend: false, showGrid: false, unit: '' } },
    { id: 'w2', type: 'stat-card', title: 'Avg Temperature',   position: { x: 3, y: 0, w: 3, h: 1 }, style: { colorScheme: 'red',     showLegend: false, showGrid: false, unit: '°C' } },
    { id: 'w3', type: 'stat-card', title: 'Avg Humidity',      position: { x: 6, y: 0, w: 3, h: 1 }, style: { colorScheme: 'cyan',    showLegend: false, showGrid: false, unit: '%' } },
    { id: 'w4', type: 'stat-card', title: 'Max Wind Speed',    position: { x: 9, y: 0, w: 3, h: 1 }, style: { colorScheme: 'amber',   showLegend: false, showGrid: false, unit: ' km/h' } },
    { id: 'w5', type: 'area-chart', title: 'Temperature Trend', position: { x: 0, y: 1, w: 8, h: 3 }, style: { colorScheme: 'blue',   showLegend: true,  showGrid: true } },
    { id: 'w6', type: 'bar-chart',  title: 'Readings by Location', position: { x: 8, y: 1, w: 4, h: 3 }, style: { colorScheme: 'cyan', showLegend: false, showGrid: true } },
    { id: 'w7', type: 'gauge',      title: 'Current Avg Temp', position: { x: 0, y: 4, w: 4, h: 2 }, style: { colorScheme: 'red',    showLegend: false, showGrid: false, unit: '°C', gaugeMin: -20, gaugeMax: 60 } },
    { id: 'w8', type: 'data-table', title: 'Recent Readings',  position: { x: 4, y: 4, w: 8, h: 2 }, style: { colorScheme: 'blue',   showLegend: false, showGrid: false } },
  ],

  demoData: {
    'w1': { statValue: 12847, trend: '+142/hr', direction: 'up' },
    'w2': { statValue: 24.3,  trend: '+2.1°C',  direction: 'up' },
    'w3': { statValue: 67.2,  trend: '-3%',     direction: 'down' },
    'w4': { statValue: 87.7,  trend: 'steady',  direction: 'neutral' },
    'w5': {
      series: [
        { name: 'New York', data: [['00:00',18.2],['01:00',16.8],['02:00',15.4],['03:00',14.9],['04:00',14.1],['05:00',13.8],['06:00',15.2],['07:00',17.4],['08:00',19.8],['09:00',21.3],['10:00',23.1],['11:00',24.5],['12:00',26.2],['13:00',27.8],['14:00',28.3],['15:00',27.1],['16:00',25.6],['17:00',24.3],['18:00',22.8],['19:00',21.4],['20:00',20.1],['21:00',19.3],['22:00',18.7],['23:00',18.2]] },
        { name: 'London',   data: [['00:00',12.1],['01:00',11.8],['02:00',11.2],['03:00',10.9],['04:00',10.5],['05:00',10.3],['06:00',11.1],['07:00',12.8],['08:00',14.2],['09:00',15.6],['10:00',16.9],['11:00',17.8],['12:00',18.5],['13:00',19.1],['14:00',19.3],['15:00',18.7],['16:00',17.4],['17:00',16.8],['18:00',15.9],['19:00',15.1],['20:00',14.4],['21:00',13.7],['22:00',13.1],['23:00',12.7]] },
        { name: 'Tokyo',    data: [['00:00',22.4],['01:00',21.9],['02:00',21.3],['03:00',20.8],['04:00',20.4],['05:00',20.1],['06:00',21.2],['07:00',23.1],['08:00',25.4],['09:00',27.2],['10:00',28.9],['11:00',30.1],['12:00',31.4],['13:00',32.1],['14:00',32.5],['15:00',31.8],['16:00',30.3],['17:00',29.1],['18:00',27.8],['19:00',26.4],['20:00',25.1],['21:00',24.2],['22:00',23.5],['23:00',22.9]] },
      ],
    },
    'w6': {
      series: [{ name: 'Readings', data: [['New York',4200],['Tokyo',3100],['London',2800],['Berlin',2100],['Sydney',1700]] }],
    },
    'w7': { gaugeValue: { current: 24.3, min: -10, max: 50 } },
    'w8': {
      columns: ['timestamp','location','temperature','humidity','wind_speed'],
      tableRows: [
        { timestamp:'2025-03-13 14:30:22','location':'New York',temperature:24.3,humidity:67.2,wind_speed:11.7 },
        { timestamp:'2025-03-13 14:28:15','location':'Tokyo',temperature:31.4,humidity:72.5,wind_speed:5.3 },
        { timestamp:'2025-03-13 14:25:08','location':'London',temperature:17.8,humidity:81.3,wind_speed:14.2 },
        { timestamp:'2025-03-13 14:22:41','location':'Berlin',temperature:19.6,humidity:58.4,wind_speed:8.9 },
        { timestamp:'2025-03-13 14:20:33','location':'Sydney',temperature:28.1,humidity:55.1,wind_speed:16.4 },
      ],
    },
  },
};
