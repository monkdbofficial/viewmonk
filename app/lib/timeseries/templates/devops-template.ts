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
    { id: 'w1', type: 'stat-card',  title: 'Build Success Rate',    position: { x: 0, y: 0, w: 3, h: 1 }, style: { colorScheme: 'green',  showLegend: false, showGrid: false } },
    { id: 'w2', type: 'stat-card',  title: 'Total Deploys',         position: { x: 3, y: 0, w: 3, h: 1 }, style: { colorScheme: 'purple', showLegend: false, showGrid: false } },
    { id: 'w3', type: 'stat-card',  title: 'Mean Time to Recovery', position: { x: 6, y: 0, w: 3, h: 1 }, style: { colorScheme: 'amber',  showLegend: false, showGrid: false, invertTrend: true } },
    { id: 'w4', type: 'gauge',      title: 'Pipeline Health Score', position: { x: 9, y: 0, w: 3, h: 2 }, style: { colorScheme: 'green',  showLegend: false, showGrid: false, gaugeMin: 0, gaugeMax: 100 } },
    { id: 'w5', type: 'line-chart', title: 'Build Duration Trend',  position: { x: 0, y: 1, w: 9, h: 2 }, style: { colorScheme: 'purple', showLegend: true,  showGrid: true,  smooth: true } },
    { id: 'w6', type: 'bar-chart',  title: 'Deploys by Service',    position: { x: 0, y: 3, w: 5, h: 2 }, style: { colorScheme: 'purple', showLegend: false, showGrid: true  } },
    { id: 'w7', type: 'data-table', title: 'Recent Deployments',    position: { x: 5, y: 3, w: 7, h: 2 }, style: { colorScheme: 'purple', showLegend: false, showGrid: false } },
  ],

  demoTable: '_demo_devops',
};
