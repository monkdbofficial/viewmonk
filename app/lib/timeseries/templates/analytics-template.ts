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

  defaultLayout: [
    { id: 'w1', type: 'stat-card',  title: 'Total Events',     position: { x: 0, y: 0, w: 4, h: 1 }, style: { colorScheme: 'cyan',   showLegend: false, showGrid: false } },
    { id: 'w2', type: 'stat-card',  title: 'Uptime',           position: { x: 4, y: 0, w: 4, h: 1 }, style: { colorScheme: 'green',  showLegend: false, showGrid: false, unit: '%' } },
    { id: 'w3', type: 'gauge',      title: 'Satisfaction Score',position: { x: 8, y: 0, w: 4, h: 1 }, style: { colorScheme: 'cyan',   showLegend: false, showGrid: false, gaugeMin: 0, gaugeMax: 10 } },
    { id: 'w4', type: 'area-chart', title: 'Events Over Time',  position: { x: 0, y: 1, w: 12, h: 3 }, style: { colorScheme: 'cyan',  showLegend: true,  showGrid: true } },
    { id: 'w5', type: 'bar-chart',  title: 'Events by Type',    position: { x: 0, y: 4, w: 6, h: 2 }, style: { colorScheme: 'blue',  showLegend: false, showGrid: true } },
    { id: 'w6', type: 'pie-chart',  title: 'Source Breakdown',  position: { x: 6, y: 4, w: 3, h: 2 }, style: { colorScheme: 'cyan',  showLegend: true,  showGrid: false } },
    { id: 'w7', type: 'data-table', title: 'Recent Events',     position: { x: 9, y: 4, w: 3, h: 2 }, style: { colorScheme: 'cyan',  showLegend: false, showGrid: false } },
  ],

  demoData: {
    'w1': { statValue: 9340021, trend: '+18.4%', direction: 'up' },
    'w2': { statValue: 99.97,   trend: '30d avg', direction: 'up' },
    'w3': { gaugeValue: { current: 9.3, min: 0, max: 10 } },
    'w4': {
      series: [
        { name: 'Page Views', data: [['00:00',12400],['02:00',9800],['04:00',7200],['06:00',8900],['08:00',15600],['10:00',24800],['12:00',31200],['14:00',28900],['16:00',32100],['18:00',29400],['20:00',22100],['22:00',16800],['24:00',13200]] },
        { name: 'Sessions',   data: [['00:00',3200],['02:00',2400],['04:00',1800],['06:00',2200],['08:00',5600],['10:00',8900],['12:00',11200],['14:00',10400],['16:00',12100],['18:00',10800],['20:00',8100],['22:00',5900],['24:00',4200]] },
      ],
    },
    'w5': {
      series: [{ name: 'Count', data: [['click',45200],['view',38100],['purchase',12400],['signup',8900],['search',34200]] }],
    },
    'w6': {
      pieSlices: [
        { name: 'Organic', value: 4200 },
        { name: 'Direct',  value: 3100 },
        { name: 'Social',  value: 2400 },
        { name: 'Email',   value: 1800 },
        { name: 'Paid',    value: 1200 },
      ],
    },
    'w7': {
      columns: ['time', 'event', 'user', 'value'],
      tableRows: [
        { time: '14:32:11', event: 'purchase', user: 'u_8821', value: 149.99 },
        { time: '14:31:54', event: 'signup',   user: 'u_9934', value: 0 },
        { time: '14:31:22', event: 'click',    user: 'u_7712', value: 1 },
        { time: '14:30:48', event: 'view',     user: 'u_6645', value: 1 },
        { time: '14:30:15', event: 'search',   user: 'u_5531', value: 1 },
      ],
    },
  },
};
