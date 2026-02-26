import type { TemplateDefinition } from '../types';

export const financeTemplate: TemplateDefinition = {
  id: 'finance-dashboard',
  name: 'Finance Dashboard',
  description: 'Portfolio tracking, price trends, asset distribution, and trade history with luxury purple styling.',
  category: 'finance',
  themeId: 'purple-storm',
  tags: ['Finance', 'Portfolio', 'Trading', 'Stocks'],
  requiredSchema: { needsTimestamp: true, minNumericCols: 1, minTextCols: 1 },
  widgetCount: 6,

  defaultLayout: [
    { id: 'w1', type: 'stat-card',  title: 'Portfolio Value',  position: { x: 0, y: 0, w: 4, h: 1 }, style: { colorScheme: 'purple', showLegend: false, showGrid: false, unit: '$' } },
    { id: 'w2', type: 'stat-card',  title: 'Total ROI',        position: { x: 4, y: 0, w: 4, h: 1 }, style: { colorScheme: 'pink',   showLegend: false, showGrid: false, unit: '%' } },
    { id: 'w3', type: 'stat-card',  title: 'Total Trades',     position: { x: 8, y: 0, w: 4, h: 1 }, style: { colorScheme: 'purple', showLegend: false, showGrid: false } },
    { id: 'w4', type: 'area-chart', title: 'Price Over Time',  position: { x: 0, y: 1, w: 12, h: 3 }, style: { colorScheme: 'purple', showLegend: true,  showGrid: true } },
    { id: 'w5', type: 'pie-chart',  title: 'Asset Distribution', position: { x: 0, y: 4, w: 4, h: 2 }, style: { colorScheme: 'purple', showLegend: true, showGrid: false } },
    { id: 'w6', type: 'data-table', title: 'Trade History',    position: { x: 4, y: 4, w: 8, h: 2 }, style: { colorScheme: 'purple', showLegend: false, showGrid: false } },
  ],

  demoData: {
    'w1': { statValue: 1248000, trend: '+$48k this week', direction: 'up' },
    'w2': { statValue: 18.4,    trend: '+2.3% today',     direction: 'up' },
    'w3': { statValue: 847,     trend: '32 today',         direction: 'up' },
    'w4': {
      series: [
        { name: 'BTC',  data: [['Jan',38200],['Feb',41800],['Mar',39100],['Apr',45600],['May',52300],['Jun',48900],['Jul',56700],['Aug',61200],['Sep',58400],['Oct',67800],['Nov',72100],['Dec',68900]] },
        { name: 'ETH',  data: [['Jan',2200],['Feb',2580],['Mar',2340],['Apr',2890],['May',3240],['Jun',2980],['Jul',3560],['Aug',3920],['Sep',3680],['Oct',4210],['Nov',4580],['Dec',4320]] },
      ],
    },
    'w5': {
      pieSlices: [
        { name: 'BTC',   value: 45 },
        { name: 'ETH',   value: 28 },
        { name: 'SOL',   value: 12 },
        { name: 'USDC',  value: 10 },
        { name: 'Other', value: 5 },
      ],
    },
    'w6': {
      columns: ['date', 'asset', 'type', 'amount', 'price', 'total'],
      tableRows: [
        { date: '2025-03-13', asset: 'BTC', type: 'BUY',  amount: '0.05', price: '$68,900', total: '$3,445' },
        { date: '2025-03-13', asset: 'ETH', type: 'SELL', amount: '2.0',  price: '$4,320',  total: '$8,640' },
        { date: '2025-03-12', asset: 'SOL', type: 'BUY',  amount: '10.0', price: '$142',    total: '$1,420' },
        { date: '2025-03-12', asset: 'BTC', type: 'BUY',  amount: '0.02', price: '$69,100', total: '$1,382' },
        { date: '2025-03-11', asset: 'ETH', type: 'BUY',  amount: '1.5',  price: '$4,280',  total: '$6,420' },
      ],
    },
  },
};
