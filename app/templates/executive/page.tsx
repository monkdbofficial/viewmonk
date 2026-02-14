'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { KPICard, KPIGrid } from '@/app/components/aqi/KPICard';
import { PollutionPointerPanel } from '@/app/components/aqi/PollutionPointerPanel';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Target,
  ArrowLeft,
  Lightbulb,
  PieChart,
  Zap,
} from 'lucide-react';

// ============================================================================
// EXECUTIVE DASHBOARD TEMPLATE
// ============================================================================
// Purpose: High-level KPIs, trends, and strategic insights
// Target: City administrators, executives, policy makers
// ============================================================================

export default function ExecutiveTemplate() {
  const [selectedStation, setSelectedStation] = useState<string>('DEMO001');
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter'>('month');

  const strategicKPIs = [
    {
      metric: 'Overall Air Quality Index',
      current: 127,
      target: 100,
      progress: 68,
      trend: 'improving',
    },
    {
      metric: 'Public Health Impact',
      current: 342,
      target: 250,
      progress: 73,
      trend: 'improving',
    },
    {
      metric: 'Compliance Rate',
      current: 94,
      target: 98,
      progress: 96,
      trend: 'stable',
    },
  ];

  const budgetAllocation = [
    { category: 'Monitoring Infrastructure', amount: 450000, percentage: 30 },
    { category: 'Mitigation Programs', amount: 600000, percentage: 40 },
    { category: 'Public Awareness', amount: 150000, percentage: 10 },
    { category: 'Research & Development', amount: 300000, percentage: 20 },
  ];

  const policySimulations = [
    {
      policy: 'Traffic Restriction Zone Expansion',
      estimatedImpact: '-18% AQI',
      cost: '$2.4M',
      timeline: '6 months',
      roi: 'High',
    },
    {
      policy: 'Industrial Emission Standards Update',
      estimatedImpact: '-12% AQI',
      cost: '$1.8M',
      timeline: '12 months',
      roi: 'Medium',
    },
    {
      policy: 'Public Transport Incentive Program',
      estimatedImpact: '-8% AQI',
      cost: '$900K',
      timeline: '3 months',
      roi: 'High',
    },
  ];

  const recommendations = [
    {
      priority: 'high',
      title: 'Expand traffic restriction to 3 additional zones',
      impact: 'Estimated 15% reduction in PM2.5',
      action: 'Requires city council approval',
    },
    {
      priority: 'medium',
      title: 'Increase monitoring station coverage',
      impact: 'Improve data accuracy by 25%',
      action: 'Budget allocation needed',
    },
    {
      priority: 'low',
      title: 'Launch public awareness campaign',
      impact: 'Increase compliance participation',
      action: 'Coordinate with PR department',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-[#0a0e1a] dark:to-[#0D1B2A]">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white/95 backdrop-blur-sm dark:border-gray-800 dark:bg-[#001E2B]/95">
        <div className="mx-auto max-w-[1920px] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/templates"
                className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div className="h-8 w-px bg-gray-300 dark:bg-gray-700" />
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  📊 Executive Dashboard
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Strategic insights, policy simulation & ROI tracking
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as any)}
                className="rounded-lg px-4 py-2 text-sm font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600"
              >
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-[1920px] px-6 py-6 space-y-6">
        {/* KPI Bar */}
        <KPIGrid columns={4}>
          <KPICard
            label="City-Wide AQI"
            value={127}
            icon={BarChart3}
            color="blue"
            trend={{ direction: 'down', percentage: 12, isGood: true }}
            comparison="vs last month"
          />
          <KPICard
            label="Goal Progress"
            value="68%"
            icon={Target}
            color="green"
            trend={{ direction: 'up', percentage: 15, isGood: true }}
            comparison="on track"
          />
          <KPICard
            label="Program ROI"
            value="3.2x"
            icon={DollarSign}
            color="yellow"
            trend={{ direction: 'up', percentage: 8, isGood: true }}
            comparison="investment return"
          />
          <KPICard
            label="Policy Impact"
            value="-18%"
            icon={TrendingUp}
            color="purple"
            trend={{ direction: 'down', percentage: 18, isGood: true }}
            comparison="emission reduction"
          />
        </KPIGrid>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Strategic KPIs - 2 cols */}
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800/50">
              <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-600" />
                  Strategic Goals Progress
                </h2>
              </div>
              <div className="p-6 space-y-6">
                {strategicKPIs.map((kpi, idx) => (
                  <div key={idx} className="border-b border-gray-100 dark:border-gray-800 last:border-0 pb-4 last:pb-0">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                          {kpi.metric}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Current: {kpi.current} | Target: {kpi.target}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          kpi.trend === 'improving'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30'
                        }`}
                      >
                        {kpi.trend}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                            style={{ width: `${kpi.progress}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-lg font-bold text-gray-900 dark:text-white">
                        {kpi.progress}%
                      </span>
                    </div>
                  </div>
                ))}

                {/* Budget Allocation */}
                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <PieChart className="h-4 w-4 text-yellow-600" />
                    Budget Allocation Overview
                  </h3>
                  <div className="space-y-3">
                    {budgetAllocation.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                              {item.category}
                            </span>
                            <span className="text-xs font-bold text-gray-900 dark:text-white">
                              ${(item.amount / 1000).toFixed(0)}K
                            </span>
                          </div>
                          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-yellow-500"
                              style={{ width: `${item.percentage}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 w-8 text-right">
                          {item.percentage}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Policy Simulations & Recommendations - 1 col */}
          <div>
            {/* Policy Simulations */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800/50">
              <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Zap className="h-5 w-5 text-purple-600" />
                  Policy Scenarios
                </h2>
              </div>
              <div className="p-6 space-y-3">
                {policySimulations.map((policy, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-purple-400 transition-colors"
                  >
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                      {policy.policy}
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Impact:</span>
                        <span className="ml-1 font-medium text-green-600">
                          {policy.estimatedImpact}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Cost:</span>
                        <span className="ml-1 font-medium text-blue-600">{policy.cost}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Timeline:</span>
                        <span className="ml-1 font-medium text-gray-900 dark:text-white">
                          {policy.timeline}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">ROI:</span>
                        <span
                          className={`ml-1 font-medium ${
                            policy.roi === 'High' ? 'text-green-600' : 'text-yellow-600'
                          }`}
                        >
                          {policy.roi}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Strategic Recommendations */}
            <div className="mt-6 rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800/50">
              <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-yellow-600" />
                  Recommendations
                </h2>
              </div>
              <div className="p-6 space-y-3">
                {recommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border-2 ${
                      rec.priority === 'high'
                        ? 'border-red-300 bg-red-50 dark:bg-red-900/20'
                        : rec.priority === 'medium'
                        ? 'border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20'
                        : 'border-blue-300 bg-blue-50 dark:bg-blue-900/20'
                    }`}
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          rec.priority === 'high'
                            ? 'bg-red-600 text-white'
                            : rec.priority === 'medium'
                            ? 'bg-yellow-600 text-white'
                            : 'bg-blue-600 text-white'
                        }`}
                      >
                        {rec.priority.toUpperCase()}
                      </span>
                    </div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                      {rec.title}
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{rec.impact}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 italic">{rec.action}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Pollution Intelligence */}
        <PollutionPointerPanel stationId={selectedStation} timeRange="24h" />
      </div>
    </div>
  );
}
