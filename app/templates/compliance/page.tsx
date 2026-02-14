'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { KPICard, KPIGrid } from '@/app/components/aqi/KPICard';
import { PollutionPointerPanel } from '@/app/components/aqi/PollutionPointerPanel';
import {
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowLeft,
  Download,
  Filter,
  TrendingUp,
} from 'lucide-react';

// ============================================================================
// REGULATORY COMPLIANCE TEMPLATE
// ============================================================================
// Purpose: Comprehensive compliance tracking and audit management
// Target: Environmental regulators, compliance officers, audit teams
// ============================================================================

export default function ComplianceTemplate() {
  const [selectedStation, setSelectedStation] = useState<string>('DEMO001');
  const [filterStatus, setFilterStatus] = useState<'all' | 'compliant' | 'violation'>('all');

  const violations = [
    {
      id: 'V001',
      station: 'Station A',
      standard: 'PM2.5 Annual Limit',
      threshold: 35,
      actual: 42,
      duration: '6 hours',
      severity: 'major',
      status: 'active',
    },
    {
      id: 'V002',
      station: 'Station B',
      standard: 'SO2 Hourly Limit',
      threshold: 75,
      actual: 89,
      duration: '2 hours',
      severity: 'critical',
      status: 'active',
    },
    {
      id: 'V003',
      station: 'Station C',
      standard: 'NO2 Daily Average',
      threshold: 53,
      actual: 58,
      duration: '12 hours',
      severity: 'minor',
      status: 'resolved',
    },
  ];

  const auditLogs = [
    { time: '2h ago', action: 'Compliance report generated', user: 'System', type: 'automated' },
    { time: '4h ago', action: 'Violation V002 flagged', user: 'Monitor Agent', type: 'alert' },
    { time: '6h ago', action: 'Standards updated - EPA 2024', user: 'Admin', type: 'manual' },
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
                  📋 Regulatory Compliance
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Comprehensive compliance tracking & audit management
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="rounded-lg px-4 py-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export Report
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
            label="Compliance Rate"
            value="94%"
            icon={CheckCircle}
            color="green"
            trend={{ direction: 'up', percentage: 3, isGood: true }}
            comparison="vs last month"
          />
          <KPICard
            label="Active Violations"
            value={12}
            icon={AlertTriangle}
            color="red"
            trend={{ direction: 'down', percentage: 15, isGood: true }}
            comparison="this week"
          />
          <KPICard
            label="Avg Resolution Time"
            value="18h"
            icon={Clock}
            color="blue"
            trend={{ direction: 'down', percentage: 22, isGood: true }}
            comparison="improved"
          />
          <KPICard
            label="Reports Generated"
            value={47}
            icon={FileText}
            color="purple"
            trend={{ direction: 'up', percentage: 8, isGood: true }}
            comparison="this month"
          />
        </KPIGrid>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Violation Tracker - 2 cols */}
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800/50">
              <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    Violation Tracker
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setFilterStatus('all')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                        filterStatus === 'all'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-700'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setFilterStatus('violation')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                        filterStatus === 'violation'
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-700'
                      }`}
                    >
                      Active
                    </button>
                    <button
                      onClick={() => setFilterStatus('compliant')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                        filterStatus === 'compliant'
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-700'
                      }`}
                    >
                      Resolved
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
                          ID
                        </th>
                        <th className="text-left pb-3 text-xs font-medium text-gray-500 dark:text-gray-400">
                          Station
                        </th>
                        <th className="text-left pb-3 text-xs font-medium text-gray-500 dark:text-gray-400">
                          Standard Violated
                        </th>
                        <th className="text-left pb-3 text-xs font-medium text-gray-500 dark:text-gray-400">
                          Threshold
                        </th>
                        <th className="text-left pb-3 text-xs font-medium text-gray-500 dark:text-gray-400">
                          Actual
                        </th>
                        <th className="text-left pb-3 text-xs font-medium text-gray-500 dark:text-gray-400">
                          Duration
                        </th>
                        <th className="text-left pb-3 text-xs font-medium text-gray-500 dark:text-gray-400">
                          Severity
                        </th>
                        <th className="text-left pb-3 text-xs font-medium text-gray-500 dark:text-gray-400">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {violations.map((violation) => (
                        <tr
                          key={violation.id}
                          className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        >
                          <td className="py-3 text-sm font-medium text-gray-900 dark:text-white">
                            {violation.id}
                          </td>
                          <td className="py-3 text-sm text-gray-600 dark:text-gray-400">
                            {violation.station}
                          </td>
                          <td className="py-3 text-sm text-gray-600 dark:text-gray-400">
                            {violation.standard}
                          </td>
                          <td className="py-3 text-sm text-gray-600 dark:text-gray-400">
                            {violation.threshold}
                          </td>
                          <td className="py-3 text-sm font-medium text-red-600">
                            {violation.actual}
                          </td>
                          <td className="py-3 text-sm text-gray-600 dark:text-gray-400">
                            {violation.duration}
                          </td>
                          <td className="py-3">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                violation.severity === 'critical'
                                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30'
                                  : violation.severity === 'major'
                                  ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30'
                                  : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30'
                              }`}
                            >
                              {violation.severity}
                            </span>
                          </td>
                          <td className="py-3">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                violation.status === 'active'
                                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30'
                                  : 'bg-green-100 text-green-700 dark:bg-green-900/30'
                              }`}
                            >
                              {violation.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Audit Log - 1 col */}
          <div>
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800/50">
              <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  Audit Trail
                </h2>
              </div>
              <div className="p-6 space-y-4">
                {auditLogs.map((log, idx) => (
                  <div
                    key={idx}
                    className="border-l-2 border-blue-400 pl-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-r"
                  >
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {log.action}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400">{log.time}</span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-600 dark:text-gray-400">{log.user}</span>
                      <span
                        className={`ml-auto px-2 py-0.5 rounded text-xs ${
                          log.type === 'automated'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30'
                            : log.type === 'alert'
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30'
                        }`}
                      >
                        {log.type}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Standards Compliance */}
            <div className="mt-6 rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800/50">
              <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Standards Status
                </h2>
              </div>
              <div className="p-6 space-y-3">
                {['PM2.5', 'PM10', 'NO2', 'SO2', 'CO', 'O3'].map((pollutant) => (
                  <div key={pollutant} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {pollutant}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-600"
                          style={{ width: `${Math.random() * 40 + 60}%` }}
                        />
                      </div>
                      <span className="text-xs text-green-600 font-medium">
                        {Math.floor(Math.random() * 40 + 60)}%
                      </span>
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
