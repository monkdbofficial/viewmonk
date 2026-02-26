import type { TemplateDefinition } from '../types';

export const devopsTemplate: TemplateDefinition = {
  id: 'devops-pipeline',
  name: 'DevOps Pipeline',
  description: 'Build success rates, deployment frequency, MTTR, and service health — DORA metrics for engineering excellence.',
  category: 'infrastructure',
  themeId: 'purple-storm',
  tags: ['DevOps', 'CI/CD', 'Deployments', 'MTTR', 'DORA'],
  requiredSchema: { needsTimestamp: true, minNumericCols: 1, minTextCols: 1 },
  widgetCount: 7,

  defaultLayout: [
    { id: 'w1', type: 'stat-card',  title: 'Build Success Rate',    position: { x: 0, y: 0, w: 3, h: 1 }, style: { colorScheme: 'green',  showLegend: false, showGrid: false, unit: '%' } },
    { id: 'w2', type: 'stat-card',  title: 'Deploys Today',         position: { x: 3, y: 0, w: 3, h: 1 }, style: { colorScheme: 'purple', showLegend: false, showGrid: false } },
    { id: 'w3', type: 'stat-card',  title: 'Mean Time to Recovery', position: { x: 6, y: 0, w: 3, h: 1 }, style: { colorScheme: 'amber',  showLegend: false, showGrid: false, unit: ' min', invertTrend: true } },
    { id: 'w4', type: 'gauge',      title: 'Pipeline Health Score', position: { x: 9, y: 0, w: 3, h: 2 }, style: { colorScheme: 'green',  showLegend: false, showGrid: false, gaugeMin: 0, gaugeMax: 100, unit: '' } },
    { id: 'w5', type: 'line-chart', title: 'Build Duration Trend',  position: { x: 0, y: 1, w: 9, h: 2 }, style: { colorScheme: 'purple', showLegend: true,  showGrid: true,  smooth: true } },
    { id: 'w6', type: 'bar-chart',  title: 'Deploys by Service',    position: { x: 0, y: 3, w: 5, h: 2 }, style: { colorScheme: 'purple', showLegend: false, showGrid: true  } },
    { id: 'w7', type: 'data-table', title: 'Recent Deployments',    position: { x: 5, y: 3, w: 7, h: 2 }, style: { colorScheme: 'purple', showLegend: false, showGrid: false } },
  ],

  demoData: {
    'w1': { statValue: 97.4, trend: '+1.2% vs last week', direction: 'up' },
    'w2': { statValue: 18, trend: '+6 vs yesterday', direction: 'up' },
    'w3': { statValue: 14.2, trend: '-3.8 min vs last week', direction: 'up' },
    'w4': { statValue: 91 },
    'w5': {
      series: [
        { name: 'API',      data: [['Mon', 4.2], ['Tue', 3.8], ['Wed', 5.1], ['Thu', 4.4], ['Fri', 3.9], ['Sat', 4.7], ['Sun', 4.1], ['Mon', 3.6], ['Tue', 4.9], ['Wed', 3.7], ['Thu', 4.2], ['Fri', 3.5]] },
        { name: 'Frontend', data: [['Mon', 2.1], ['Tue', 2.4], ['Wed', 2.8], ['Thu', 2.2], ['Fri', 1.9], ['Sat', 3.1], ['Sun', 2.6], ['Mon', 2.0], ['Tue', 2.3], ['Wed', 1.8], ['Thu', 2.5], ['Fri', 2.1]] },
        { name: 'Worker',   data: [['Mon', 1.4], ['Tue', 1.6], ['Wed', 1.9], ['Thu', 1.5], ['Fri', 1.3], ['Sat', 1.8], ['Sun', 1.7], ['Mon', 1.4], ['Tue', 1.6], ['Wed', 1.3], ['Thu', 1.5], ['Fri', 1.2]] },
      ],
    },
    'w6': {
      series: [
        { name: 'Deploys', data: [['api-gateway', 42], ['frontend', 38], ['auth-service', 31], ['data-worker', 28], ['notifications', 19], ['billing', 14], ['analytics', 11]] },
      ],
    },
    'w7': {
      columns: ['service', 'version', 'env', 'duration', 'status', 'by'],
      tableRows: [
        { service: 'api-gateway',    version: 'v2.14.1', env: 'prod',    duration: '3m 42s', status: '✅ Success', by: 'ci-bot' },
        { service: 'frontend',       version: 'v4.8.0',  env: 'prod',    duration: '2m 18s', status: '✅ Success', by: 'jane.d' },
        { service: 'auth-service',   version: 'v1.9.3',  env: 'staging', duration: '4m 01s', status: '✅ Success', by: 'ci-bot' },
        { service: 'data-worker',    version: 'v3.2.1',  env: 'prod',    duration: '5m 12s', status: '❌ Failed',  by: 'ci-bot' },
        { service: 'notifications',  version: 'v2.0.4',  env: 'prod',    duration: '1m 58s', status: '✅ Success', by: 'alex.k' },
        { service: 'billing',        version: 'v1.5.2',  env: 'staging', duration: '3m 29s', status: '⏳ Running', by: 'ci-bot' },
      ],
    },
  },
};
