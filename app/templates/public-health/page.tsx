'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { KPICard, KPIGrid } from '@/app/components/aqi/KPICard';
import { PollutionPointerPanel } from '@/app/components/aqi/PollutionPointerPanel';
import {
  Heart,
  Users,
  TrendingUp,
  AlertTriangle,
  ArrowLeft,
  Activity,
  MapPin,
  Info,
} from 'lucide-react';

// ============================================================================
// PUBLIC HEALTH MONITORING TEMPLATE
// ============================================================================
// Purpose: Health impact correlation and risk assessment
// Target: Health departments, epidemiologists, public health officials
// ============================================================================

export default function PublicHealthTemplate() {
  const [selectedStation, setSelectedStation] = useState<string>('DEMO001');
  const [selectedRiskGroup, setSelectedRiskGroup] = useState<'all' | 'children' | 'elderly' | 'respiratory'>('all');

  const healthCorrelations = [
    {
      metric: 'Respiratory Cases',
      value: 342,
      change: '+28%',
      correlation: 0.87,
      trend: 'up',
    },
    {
      metric: 'Hospital Admissions',
      value: 89,
      change: '+15%',
      correlation: 0.92,
      trend: 'up',
    },
    {
      metric: 'Asthma Events',
      value: 156,
      change: '+22%',
      correlation: 0.78,
      trend: 'up',
    },
  ];

  const vulnerableZones = [
    {
      zone: 'North District',
      population: 45000,
      vulnerable: 12000,
      riskLevel: 'high',
      aqi: 187,
    },
    {
      zone: 'Central District',
      population: 67000,
      vulnerable: 18000,
      riskLevel: 'moderate',
      aqi: 142,
    },
    {
      zone: 'South District',
      population: 52000,
      vulnerable: 9000,
      riskLevel: 'low',
      aqi: 95,
    },
  ];

  const healthAdvisories = [
    {
      level: 'urgent',
      message: 'Reduce outdoor activities for vulnerable groups',
      zones: ['North', 'East'],
      issued: '2h ago',
    },
    {
      level: 'moderate',
      message: 'Limit prolonged outdoor exertion',
      zones: ['Central'],
      issued: '5h ago',
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
                  🏥 Public Health Monitoring
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Health impact correlation & risk assessment
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="rounded-lg px-4 py-2 text-sm font-medium bg-red-600 text-white hover:bg-red-700 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Issue Advisory
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-[1920px] px-6 py-6 space-y-6">
        {/* KPI Bar */}
        <KPIGrid columns={4}>
          <KPICard
            label="Health Events Today"
            value={587}
            icon={Heart}
            color="red"
            trend={{ direction: 'up', percentage: 23, isGood: false }}
            comparison="vs yesterday"
          />
          <KPICard
            label="Vulnerable Population"
            value="39K"
            icon={Users}
            color="yellow"
            trend={{ direction: 'up', percentage: 5, isGood: false }}
            comparison="at risk"
          />
          <KPICard
            label="AQI-Health Correlation"
            value="0.89"
            icon={TrendingUp}
            color="blue"
            trend={{ direction: 'up', percentage: 12, isGood: false }}
            comparison="strong"
          />
          <KPICard
            label="Active Advisories"
            value={8}
            icon={AlertTriangle}
            color="purple"
            trend={{ direction: 'down', percentage: 2, isGood: true }}
            comparison="current"
          />
        </KPIGrid>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Health Correlation Chart - 2 cols */}
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800/50">
              <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Activity className="h-5 w-5 text-red-600" />
                  AQI-Health Impact Correlation
                </h2>
              </div>
              <div className="p-6 space-y-6">
                {healthCorrelations.map((item, idx) => (
                  <div key={idx} className="border-b border-gray-100 dark:border-gray-800 last:border-0 pb-4 last:pb-0">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                          {item.metric}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Last 7 days
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {item.value}
                        </div>
                        <div className="text-sm text-red-600 font-medium">{item.change}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-red-500 to-red-600"
                            style={{ width: `${item.correlation * 100}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          r = {item.correlation}
                        </span>
                        <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30">
                          Strong
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Visual Chart Placeholder */}
                <div className="mt-6 h-64 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-900/50 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-700">
                  <div className="text-center">
                    <Activity className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Correlation chart visualization
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Health Advisories - 1 col */}
          <div>
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800/50">
              <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  Active Advisories
                </h2>
              </div>
              <div className="p-6 space-y-4">
                {healthAdvisories.map((advisory, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg border-2 ${
                      advisory.level === 'urgent'
                        ? 'border-red-300 bg-red-50 dark:bg-red-900/20'
                        : 'border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20'
                    }`}
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <AlertTriangle
                        className={`h-5 w-5 flex-shrink-0 ${
                          advisory.level === 'urgent' ? 'text-red-600' : 'text-yellow-600'
                        }`}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {advisory.message}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {advisory.issued}
                          </span>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {advisory.zones.join(', ')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Vulnerable Zones */}
            <div className="mt-6 rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800/50">
              <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-yellow-600" />
                  Vulnerable Zones
                </h2>
              </div>
              <div className="p-6 space-y-4">
                {vulnerableZones.map((zone, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-400 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900 dark:text-white">{zone.zone}</h3>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          zone.riskLevel === 'high'
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30'
                            : zone.riskLevel === 'moderate'
                            ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30'
                            : 'bg-green-100 text-green-700 dark:bg-green-900/30'
                        }`}
                      >
                        {zone.riskLevel}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Population:</span>
                        <span className="ml-1 font-medium text-gray-900 dark:text-white">
                          {(zone.population / 1000).toFixed(0)}K
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">At Risk:</span>
                        <span className="ml-1 font-medium text-red-600">
                          {(zone.vulnerable / 1000).toFixed(0)}K
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-500 dark:text-gray-400">Current AQI:</span>
                        <span className="ml-1 font-bold text-gray-900 dark:text-white">
                          {zone.aqi}
                        </span>
                      </div>
                    </div>
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
