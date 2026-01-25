'use client';

import { BarChart3, TrendingUp, Activity, Database, Users, DollarSign, Package, Zap } from 'lucide-react';

export interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  icon: any;
  category: string;
  widgets: any[];
}

export const DASHBOARD_TEMPLATES: DashboardTemplate[] = [
  {
    id: 'sales-analytics',
    name: 'Sales Analytics',
    description: 'Track revenue, orders, and sales performance',
    icon: DollarSign,
    category: 'Business',
    widgets: [
      {
        chartType: 'stat',
        name: 'Total Revenue',
        size: 'small',
        position: 0,
      },
      {
        chartType: 'stat',
        name: 'Total Orders',
        size: 'small',
        position: 1,
      },
      {
        chartType: 'stat',
        name: 'Avg Order Value',
        size: 'small',
        position: 2,
      },
      {
        chartType: 'line',
        name: 'Revenue Trend',
        size: 'large',
        position: 3,
      },
      {
        chartType: 'pie',
        name: 'Sales by Category',
        size: 'medium',
        position: 4,
      },
      {
        chartType: 'bar',
        name: 'Top Products',
        size: 'medium',
        position: 5,
      },
    ],
  },
  {
    id: 'operations-monitoring',
    name: 'Operations Monitoring',
    description: 'Monitor system performance and operations',
    icon: Activity,
    category: 'DevOps',
    widgets: [
      {
        chartType: 'gauge',
        name: 'CPU Usage',
        size: 'small',
        position: 0,
      },
      {
        chartType: 'gauge',
        name: 'Memory Usage',
        size: 'small',
        position: 1,
      },
      {
        chartType: 'stat',
        name: 'Active Connections',
        size: 'small',
        position: 2,
      },
      {
        chartType: 'line',
        name: 'Response Time',
        size: 'large',
        position: 3,
      },
      {
        chartType: 'area',
        name: 'Request Volume',
        size: 'large',
        position: 4,
      },
      {
        chartType: 'heatmap',
        name: 'Error Distribution',
        size: 'medium',
        position: 5,
      },
    ],
  },
  {
    id: 'user-analytics',
    name: 'User Analytics',
    description: 'Understand user behavior and engagement',
    icon: Users,
    category: 'Product',
    widgets: [
      {
        chartType: 'stat',
        name: 'Active Users',
        size: 'small',
        position: 0,
      },
      {
        chartType: 'stat',
        name: 'New Signups',
        size: 'small',
        position: 1,
      },
      {
        chartType: 'stat',
        name: 'Retention Rate',
        size: 'small',
        position: 2,
      },
      {
        chartType: 'line',
        name: 'User Growth',
        size: 'large',
        position: 3,
      },
      {
        chartType: 'funnel',
        name: 'User Journey',
        size: 'medium',
        position: 4,
      },
      {
        chartType: 'pie',
        name: 'User Segments',
        size: 'medium',
        position: 5,
      },
    ],
  },
  {
    id: 'inventory-management',
    name: 'Inventory Management',
    description: 'Track stock levels and warehouse operations',
    icon: Package,
    category: 'Operations',
    widgets: [
      {
        chartType: 'stat',
        name: 'Total Stock Value',
        size: 'small',
        position: 0,
      },
      {
        chartType: 'stat',
        name: 'Low Stock Items',
        size: 'small',
        position: 1,
      },
      {
        chartType: 'gauge',
        name: 'Warehouse Capacity',
        size: 'small',
        position: 2,
      },
      {
        chartType: 'bar',
        name: 'Stock by Category',
        size: 'large',
        position: 3,
      },
      {
        chartType: 'line',
        name: 'Inventory Turnover',
        size: 'large',
        position: 4,
      },
      {
        chartType: 'table',
        name: 'Recent Transactions',
        size: 'full',
        position: 5,
      },
    ],
  },
  {
    id: 'performance-kpis',
    name: 'Performance KPIs',
    description: 'Key performance indicators at a glance',
    icon: Zap,
    category: 'Executive',
    widgets: [
      {
        chartType: 'stat',
        name: 'Revenue MTD',
        size: 'small',
        position: 0,
      },
      {
        chartType: 'stat',
        name: 'Growth Rate',
        size: 'small',
        position: 1,
      },
      {
        chartType: 'stat',
        name: 'Customer Satisfaction',
        size: 'small',
        position: 2,
      },
      {
        chartType: 'stat',
        name: 'Net Profit Margin',
        size: 'small',
        position: 3,
      },
      {
        chartType: 'line',
        name: 'Revenue vs Target',
        size: 'large',
        position: 4,
      },
      {
        chartType: 'donut',
        name: 'Budget Allocation',
        size: 'medium',
        position: 5,
      },
    ],
  },
];

interface DashboardTemplatesProps {
  onSelectTemplate: (template: DashboardTemplate) => void;
  onClose: () => void;
}

export default function DashboardTemplates({ onSelectTemplate, onClose }: DashboardTemplatesProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 10000 }}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dashboard Templates
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Start with a professional template and customize it to your needs
          </p>
        </div>

        {/* Templates Grid */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DASHBOARD_TEMPLATES.map((template) => {
              const Icon = template.icon;
              return (
                <button
                  key={template.id}
                  onClick={() => {
                    onSelectTemplate(template);
                    onClose();
                  }}
                  className="text-left p-6 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-blue-600 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30 group-hover:scale-110 transition-transform">
                      <Icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                        {template.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {template.description}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-300">
                          {template.category}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {template.widgets.length} widgets
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Blank Template */}
          <button
            onClick={onClose}
            className="w-full mt-4 p-6 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-600 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
          >
            <div className="text-center">
              <Database className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                Start from Scratch
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Create a blank dashboard and build your own layout
              </p>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
