'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { KPICard, KPIGrid } from '@/app/components/aqi/KPICard';
import { PollutionPointerPanel } from '@/app/components/aqi/PollutionPointerPanel';
import {
  Factory,
  TrendingDown,
  DollarSign,
  CheckCircle,
  ArrowLeft,
  Settings,
  BarChart3,
  Calendar,
} from 'lucide-react';

// ============================================================================
// INDUSTRIAL MONITORING TEMPLATE
// ============================================================================
// Purpose: Facility-centric emission tracking and optimization
// Target: Industrial facility managers, environmental coordinators
// ============================================================================

export default function IndustrialTemplate() {
  const [selectedFacility, setSelectedFacility] = useState<string>('FAC001');
  const [viewMode, setViewMode] = useState<'emissions' | 'operations'>('emissions');

  const facilities = [
    {
      id: 'FAC001',
      name: 'Steel Plant A',
      emissions: 342,
      compliance: 94,
      efficiency: 87,
      cost: 45000,
      status: 'compliant',
    },
    {
      id: 'FAC002',
      name: 'Chemical Factory B',
      emissions: 289,
      compliance: 97,
      efficiency: 92,
      cost: 38000,
      status: 'compliant',
    },
    {
      id: 'FAC003',
      name: 'Power Plant C',
      emissions: 456,
      compliance: 88,
      efficiency: 79,
      cost: 67000,
      status: 'warning',
    },
  ];

  const permits = [
    { id: 'P001', type: 'Air Quality', expiry: '45 days', status: 'active' },
    { id: 'P002', type: 'Emission Control', expiry: '120 days', status: 'active' },
    { id: 'P003', type: 'Water Discharge', expiry: '15 days', status: 'expiring' },
  ];

  const optimizationSuggestions = [
    {
      title: 'Switch to off-peak production',
      impact: '-15% emissions',
      savings: '$12K/month',
      effort: 'medium',
    },
    {
      title: 'Upgrade filtration system',
      impact: '-22% emissions',
      savings: '$8K/month',
      effort: 'high',
    },
    {
      title: 'Optimize combustion efficiency',
      impact: '-8% emissions',
      savings: '$5K/month',
      effort: 'low',
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
                  🏭 Industrial Monitoring
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Facility-centric emission tracking & optimization
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={selectedFacility}
                onChange={(e) => setSelectedFacility(e.target.value)}
                className="rounded-lg px-4 py-2 text-sm font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600"
              >
                {facilities.map((fac) => (
                  <option key={fac.id} value={fac.id}>
                    {fac.name}
                  </option>
                ))}
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
            label="Total Emissions"
            value="1.2K"
            icon={Factory}
            color="blue"
            trend={{ direction: 'down', percentage: 18, isGood: true }}
            comparison="tons this month"
          />
          <KPICard
            label="Compliance Score"
            value="93%"
            icon={CheckCircle}
            color="green"
            trend={{ direction: 'up', percentage: 5, isGood: true }}
            comparison="all facilities"
          />
          <KPICard
            label="Operational Cost"
            value="$150K"
            icon={DollarSign}
            color="yellow"
            trend={{ direction: 'down', percentage: 12, isGood: true }}
            comparison="this month"
          />
          <KPICard
            label="Efficiency Rating"
            value="86%"
            icon={TrendingDown}
            color="purple"
            trend={{ direction: 'up', percentage: 8, isGood: true }}
            comparison="avg across sites"
          />
        </KPIGrid>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Facility Performance - 2 cols */}
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800/50">
              <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Factory className="h-5 w-5 text-blue-600" />
                    Facility Performance Dashboard
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setViewMode('emissions')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                        viewMode === 'emissions'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-700'
                      }`}
                    >
                      Emissions
                    </button>
                    <button
                      onClick={() => setViewMode('operations')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                        viewMode === 'operations'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-700'
                      }`}
                    >
                      Operations
                    </button>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left pb-3 text-xs font-medium text-gray-500 dark:text-gray-400">
                          Facility
                        </th>
                        <th className="text-left pb-3 text-xs font-medium text-gray-500 dark:text-gray-400">
                          Emissions (tons)
                        </th>
                        <th className="text-left pb-3 text-xs font-medium text-gray-500 dark:text-gray-400">
                          Compliance
                        </th>
                        <th className="text-left pb-3 text-xs font-medium text-gray-500 dark:text-gray-400">
                          Efficiency
                        </th>
                        <th className="text-left pb-3 text-xs font-medium text-gray-500 dark:text-gray-400">
                          Monthly Cost
                        </th>
                        <th className="text-left pb-3 text-xs font-medium text-gray-500 dark:text-gray-400">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {facilities.map((facility) => (
                        <tr
                          key={facility.id}
                          className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer ${
                            facility.id === selectedFacility ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                          }`}
                          onClick={() => setSelectedFacility(facility.id)}
                        >
                          <td className="py-3 text-sm font-medium text-gray-900 dark:text-white">
                            {facility.name}
                          </td>
                          <td className="py-3 text-sm text-gray-600 dark:text-gray-400">
                            {facility.emissions}
                          </td>
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-green-600"
                                  style={{ width: `${facility.compliance}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium text-gray-900 dark:text-white">
                                {facility.compliance}%
                              </span>
                            </div>
                          </td>
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-600"
                                  style={{ width: `${facility.efficiency}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium text-gray-900 dark:text-white">
                                {facility.efficiency}%
                              </span>
                            </div>
                          </td>
                          <td className="py-3 text-sm text-gray-600 dark:text-gray-400">
                            ${(facility.cost / 1000).toFixed(0)}K
                          </td>
                          <td className="py-3">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                facility.status === 'compliant'
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30'
                                  : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30'
                              }`}
                            >
                              {facility.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Emissions Trend Chart Placeholder */}
                <div className="mt-6 h-64 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-900/50 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-700">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Emission trends & production correlation
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Optimization & Permits - 1 col */}
          <div>
            {/* Optimization Suggestions */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800/50">
              <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Settings className="h-5 w-5 text-purple-600" />
                  Optimization
                </h2>
              </div>
              <div className="p-6 space-y-3">
                {optimizationSuggestions.map((suggestion, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-purple-400 transition-colors"
                  >
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                      {suggestion.title}
                    </h3>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div className="text-xs">
                        <span className="text-gray-500 dark:text-gray-400">Impact:</span>
                        <span className="ml-1 font-medium text-green-600">{suggestion.impact}</span>
                      </div>
                      <div className="text-xs">
                        <span className="text-gray-500 dark:text-gray-400">Savings:</span>
                        <span className="ml-1 font-medium text-blue-600">{suggestion.savings}</span>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        suggestion.effort === 'low'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30'
                          : suggestion.effort === 'medium'
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30'
                      }`}
                    >
                      {suggestion.effort} effort
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Permit Management */}
            <div className="mt-6 rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800/50">
              <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  Permits
                </h2>
              </div>
              <div className="p-6 space-y-3">
                {permits.map((permit) => (
                  <div
                    key={permit.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                        {permit.type}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Expires in {permit.expiry}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        permit.status === 'active'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30'
                          : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30'
                      }`}
                    >
                      {permit.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Pollution Intelligence */}
        <PollutionPointerPanel stationId={selectedFacility} timeRange="24h" />
      </div>
    </div>
  );
}
