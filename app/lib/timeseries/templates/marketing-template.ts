import type { TemplateDefinition } from '../types';

export const marketingTemplate: TemplateDefinition = {
  id: 'marketing-analytics',
  name: 'Marketing Analytics',
  description: 'Impressions, CTR, ROAS, and spend by channel — full-funnel visibility for performance marketing teams.',
  category: 'analytics',
  themeId: 'warm-vibrant',
  tags: ['Marketing', 'Campaigns', 'CTR', 'ROAS', 'Conversions'],
  requiredSchema: { needsTimestamp: true, minNumericCols: 1, minTextCols: 1 },
  widgetCount: 8,

  defaultLayout: [
    { id: 'w1', type: 'stat-card',  title: 'Total Impressions',    position: { x: 0, y: 0, w: 3, h: 1 }, style: { colorScheme: 'amber',  showLegend: false, showGrid: false } },
    { id: 'w2', type: 'stat-card',  title: 'Click-Through Rate',   position: { x: 3, y: 0, w: 3, h: 1 }, style: { colorScheme: 'cyan',   showLegend: false, showGrid: false, unit: '%' } },
    { id: 'w3', type: 'stat-card',  title: 'Cost Per Click',       position: { x: 6, y: 0, w: 3, h: 1 }, style: { colorScheme: 'red',    showLegend: false, showGrid: false, unit: '$', invertTrend: true } },
    { id: 'w4', type: 'stat-card',  title: 'Return on Ad Spend',   position: { x: 9, y: 0, w: 3, h: 1 }, style: { colorScheme: 'green',  showLegend: false, showGrid: false, unit: 'x' } },
    { id: 'w5', type: 'area-chart', title: 'Conversions Over Time', position: { x: 0, y: 1, w: 8, h: 2 }, style: { colorScheme: 'amber',  showLegend: true,  showGrid: true,  smooth: true, fillOpacity: 30 } },
    { id: 'w6', type: 'pie-chart',  title: 'Traffic Source Mix',   position: { x: 8, y: 1, w: 4, h: 2 }, style: { colorScheme: 'amber',  showLegend: true,  showGrid: false } },
    { id: 'w7', type: 'bar-chart',  title: 'Spend by Channel',     position: { x: 0, y: 3, w: 6, h: 2 }, style: { colorScheme: 'amber',  showLegend: false, showGrid: true  } },
    { id: 'w8', type: 'data-table', title: 'Campaign Performance', position: { x: 6, y: 3, w: 6, h: 2 }, style: { colorScheme: 'amber',  showLegend: false, showGrid: false } },
  ],

  demoData: {
    'w1': { statValue: 14820000, trend: '+18% vs last month', direction: 'up' },
    'w2': { statValue: 4.72, trend: '+0.8pp vs last week', direction: 'up' },
    'w3': { statValue: 1.84, trend: '-$0.12 vs last week', direction: 'up' },
    'w4': { statValue: 5.2, trend: '+0.7x vs last month', direction: 'up' },
    'w5': {
      series: [
        { name: 'Conversions', data: [['Jan', 1840], ['Feb', 2120], ['Mar', 1980], ['Apr', 2380], ['May', 2640], ['Jun', 2890], ['Jul', 3010], ['Aug', 3240], ['Sep', 3480], ['Oct', 3920], ['Nov', 4280], ['Dec', 4840]] },
        { name: 'Goal',        data: [['Jan', 2000], ['Feb', 2000], ['Mar', 2200], ['Apr', 2400], ['May', 2600], ['Jun', 2800], ['Jul', 3000], ['Aug', 3200], ['Sep', 3400], ['Oct', 3800], ['Nov', 4200], ['Dec', 4800]] },
      ],
    },
    'w6': {
      pieSlices: [
        { name: 'Paid Search',  value: 34 },
        { name: 'Social Ads',   value: 28 },
        { name: 'Organic',      value: 18 },
        { name: 'Email',        value: 12 },
        { name: 'Referral',     value: 5  },
        { name: 'Direct',       value: 3  },
      ],
    },
    'w7': {
      series: [
        { name: 'Spend ($)', data: [['Google Ads', 48200], ['Meta Ads', 32100], ['LinkedIn', 18400], ['TikTok', 12800], ['YouTube', 9600], ['Twitter/X', 4200]] },
      ],
    },
    'w8': {
      columns: ['campaign', 'spend', 'clicks', 'ctr', 'conv', 'roas'],
      tableRows: [
        { campaign: 'Brand Awareness Q1',  spend: '$18,400', clicks: '84,200', ctr: '5.8%', conv: '2,104', roas: '6.2x' },
        { campaign: 'Retargeting — Cart',  spend: '$9,200',  clicks: '41,800', ctr: '7.2%', conv: '1,840', roas: '8.4x' },
        { campaign: 'Competitor Keyword',  spend: '$12,600', clicks: '52,400', ctr: '4.1%', conv: '1,248', roas: '4.8x' },
        { campaign: 'Lookalike Audience',  spend: '$8,100',  clicks: '38,600', ctr: '6.4%', conv: '980',   roas: '5.6x' },
        { campaign: 'Product Launch EU',   spend: '$14,200', clicks: '61,200', ctr: '3.8%', conv: '842',   roas: '3.9x' },
        { campaign: 'Holiday Sale 2025',   spend: '$22,800', clicks: '98,400', ctr: '8.1%', conv: '3,420', roas: '9.1x' },
      ],
    },
  },
};
