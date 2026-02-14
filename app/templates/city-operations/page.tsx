'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { KPICard, KPIGrid } from '@/app/components/aqi/KPICard';
import { PollutionPointerPanel } from '@/app/components/aqi/PollutionPointerPanel';
import {
  Activity,
  AlertTriangle,
  Clock,
  Zap,
  MapPin,
  ArrowLeft,
  Play,
  Pause,
  Shield,
} from 'lucide-react';

// ============================================================================
// CITY OPERATIONS CENTER TEMPLATE
// ============================================================================
// Purpose: Real-time command center for traffic and emergency response
// Target: City traffic managers, emergency response teams
// ============================================================================

export default function CityOperationsTemplate() {
  const [selectedStation, setSelectedStation] = useState<string>('DEMO001');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [liveEvents, setLiveEvents] = useState<any[]>([]);

  useEffect(() => {
    // Mock live events - would come from WebSocket
    const mockEvents = [
      {
        id: '1',
        time: '2 min ago',
        severity: 'high',
        message: 'AQI spike detected at Station A - Traffic congestion',
        action: 'Traffic restriction recommended',
      },
      {
        id: '2',
        time: '8 min ago',
        severity: 'medium',
        message: 'Industrial emission increase at Zone B',
        action: 'Monitoring activated',
      },
      {
        id: '3',
        time: '15 min ago',
        severity: 'low',
        message: 'Normal fluctuation at Station C',
        action: 'No action required',
      },
    ];
    setLiveEvents(mockEvents);
  }, []);

  const quickActions = [
    { label: 'Traffic Restriction', icon: '🚗', action: 'traffic_restriction' },
    { label: 'Public Advisory', icon: '📢', action: 'public_advisory' },
    { label: 'Industrial Alert', icon: '🏭', action: 'industrial_alert' },
    { label: 'Emergency Protocol', icon: '🚨', action: 'emergency' },
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
                  🏙️ City Operations Center
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Real-time command center for traffic & emergency response
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-2 ${
                  autoRefresh
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-800'
                }`}
              >
                {autoRefresh ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                Live Feed {autoRefresh ? 'ON' : 'OFF'}
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
            label="Active Alerts"
            value={7}
            icon={AlertTriangle}
            color="red"
            trend={{ direction: 'up', percentage: 12, isGood: false }}
            comparison="vs 1h ago"
          />
          <KPICard
            label="Response Time"
            value="8m"
            icon={Clock}
            color="blue"
            trend={{ direction: 'down', percentage: 25, isGood: true }}
            comparison="avg today"
          />
          <KPICard
            label="Actions Today"
            value={24}
            icon={Zap}
            color="purple"
            trend={{ direction: 'up', percentage: 18, isGood: true }}
            comparison="automated"
          />
          <KPICard
            label="Critical Zones"
            value={3}
            icon={MapPin}
            color="yellow"
            trend={{ direction: 'down', percentage: 2, isGood: true }}
            comparison="monitoring"
          />
        </KPIGrid>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Live Event Feed - 2 cols */}
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800/50">
              <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-600" />
                  Live Event Feed
                  {autoRefresh && (
                    <span className="ml-auto flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                      <span className="animate-pulse h-2 w-2 rounded-full bg-green-600" />
                      Live
                    </span>
                  )}
                </h2>
              </div>
              <div className="p-6 space-y-4">
                {liveEvents.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-lg border border-gray-200 p-4 hover:border-blue-400 transition-colors dark:border-gray-700"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-block w-2 h-2 rounded-full ${
                            event.severity === 'high'
                              ? 'bg-red-500'
                              : event.severity === 'medium'
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                          }`}
                        />
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {event.time}
                        </span>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          event.severity === 'high'
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30'
                            : event.severity === 'medium'
                            ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30'
                            : 'bg-green-100 text-green-700 dark:bg-green-900/30'
                        }`}
                      >
                        {event.severity.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                      {event.message}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                      {event.action}
                    </p>
                    <div className="flex gap-2">
                      <button className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700">
                        Take Action
                      </button>
                      <button className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 text-xs font-medium hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300">
                        Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Actions - 1 col */}
          <div>
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800/50">
              <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Zap className="h-5 w-5 text-purple-600" />
                  Quick Actions
                </h2>
              </div>
              <div className="p-6 space-y-3">
                {quickActions.map((action, idx) => (
                  <button
                    key={idx}
                    className="w-full flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors dark:border-gray-700 dark:hover:bg-blue-900/20"
                  >
                    <span className="text-2xl">{action.icon}</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {action.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Agent Status */}
            <div className="mt-6 rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800/50">
              <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-600" />
                  System Status
                </h2>
              </div>
              <div className="p-6 space-y-3">
                {['Ingestion', 'Classification', 'Alert', 'Mitigation'].map((agent) => (
                  <div key={agent} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{agent}</span>
                    <span className="flex items-center gap-2 text-sm font-medium text-green-600">
                      <span className="w-2 h-2 rounded-full bg-green-600" />
                      Active
                    </span>
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
