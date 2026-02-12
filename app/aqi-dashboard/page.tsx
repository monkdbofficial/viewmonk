'use client';

import { useState, useEffect } from 'react';
import AQIForecastChart from '../components/AQIForecastChart';
import PollutionSourcePanel from '../components/PollutionSourcePanel';
import AnomalyAlertCard from '../components/AnomalyAlertCard';
import dynamic from 'next/dynamic';

// Dynamically import AQI Map to avoid SSR issues
const AQIMapEmbed = dynamic(() => import('../components/aqi/AQIMapEmbed'), { ssr: false });

export default function AQIDashboard() {
  const [selectedStation, setSelectedStation] = useState<string>('Delhi_RK_Puram');
  const [stations, setStations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchStations();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      // Trigger refresh by updating a timestamp
      setRefreshKey(Date.now());
    }, 30 * 1000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const [refreshKey, setRefreshKey] = useState(Date.now());

  const fetchStations = async () => {
    try {
      // Use the API route instead of direct MonkDB access to avoid CORS issues
      const response = await fetch('/api/aqi/current');

      const data = await response.json();
      if (data.success && data.stations) {
        setStations(
          data.stations.map((station: any) => ({
            id: station.station_id,
            name: station.station_name || station.city,
          }))
        );
      }
    } catch (error) {
      console.error('Failed to fetch stations:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0D1B2A]">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-[#001E2B]">
        <div className="mx-auto max-w-[1800px] px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                🤖 AQI Intelligence Dashboard
              </h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                AI-powered air quality forecasting, source classification, and anomaly detection
              </p>
            </div>

            <div className="flex items-center gap-4">
              {/* Auto-refresh toggle */}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-700 dark:text-gray-300">Auto-refresh (30s)</span>
              </label>

              {/* Station selector */}
              <select
                value={selectedStation}
                onChange={(e) => setSelectedStation(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                disabled={loading}
              >
                <option value="">All Stations</option>
                {stations.map((station) => (
                  <option key={station.id} value={station.id}>
                    {station.name}
                  </option>
                ))}
              </select>

              {/* Refresh button */}
              <button
                onClick={() => setRefreshKey(Date.now())}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Dashboard Grid */}
      <div className="mx-auto max-w-[1800px] px-6 py-4">
        {/* 1. SUMMARY CARD - Big Status at Top */}
        <CurrentStatusCard stationId={selectedStation} />

        {/* 4. QUICK ACTIONS - What Should I Do? */}
        <QuickActionsPanel stationId={selectedStation} />

        {/* 2. BETTER TITLES - Each panel now has subtitle + tooltip */}

        {/* Compact 2x2 Grid Layout */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Top Left: Map */}
          <div>
            <PanelHeader
              title="Live Air Quality Map"
              subtitle="Real-time pollution levels across India"
              icon="🗺️"
              tooltip="Click markers for details and trends"
            />
            <div className="h-[500px] overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
              <iframe
                src="/aqi-map/embed"
                className="h-full w-full border-0"
                title="AQI Map"
              />
            </div>
          </div>

          {/* Top Right: Forecast */}
          <div>
            <PanelHeader
              title="What to Expect Next"
              subtitle="AI predicts next 24 hours"
              icon="📈"
              tooltip="Ensemble model combining ARIMA + Random Forest"
            />
            <AQIForecastChart key={`forecast-${refreshKey}`} stationId={selectedStation} hoursAhead={24} />
          </div>

          {/* Bottom Left: Source Analysis */}
          <div>
            <PanelHeader
              title="What's Causing Pollution"
              subtitle="AI source identification"
              icon="🏭"
              tooltip="Analyzes pollutant signatures to identify the primary source"
            />
            <PollutionSourcePanel key={`source-${refreshKey}`} stationId={selectedStation} />
          </div>

          {/* Bottom Right: Anomaly Alerts */}
          <div>
            <PanelHeader
              title="Unusual Spikes"
              subtitle="Anomaly detection alerts"
              icon="⚠️"
              tooltip="Statistical detection of abnormal readings"
            />
            <AnomalyAlertCard key={`anomaly-${refreshKey}`} hoursBack={24} maxAlerts={5} />
          </div>
        </div>

      </div>
    </div>
  );
}

// Stats Card Component
function StatsCard({
  title,
  value,
  subtitle,
  icon,
  color,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: string;
  color: 'blue' | 'purple' | 'red' | 'green';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800',
    purple: 'bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800',
    red: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800',
    green: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800',
  };

  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color]}`}>
      <div className="flex items-start justify-between">
        <span className="text-2xl">{icon}</span>
      </div>
      <div className="mt-2">
        <p className="text-xs font-medium text-gray-600 dark:text-gray-400">{title}</p>
        <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{subtitle}</p>
      </div>
    </div>
  );
}

// 1. CURRENT STATUS CARD - Big Summary
function CurrentStatusCard({ stationId }: { stationId: string }) {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/aqi/current`);
        const json = await res.json();
        if (json.success && json.stations.length > 0) {
          const station = stationId
            ? json.stations.find((s: any) => s.station_id === stationId) || json.stations[0]
            : json.stations[0];
          setData(station);
        }
      } catch (err) {
        console.error('Failed to fetch status:', err);
      }
    };
    fetchStatus();
  }, [stationId]);

  if (!data) return null;

  const getStatusColor = (aqi: number) => {
    if (aqi <= 50) return { bg: 'bg-green-100 dark:bg-green-900/20', text: 'text-green-800 dark:text-green-300', status: 'GOOD', emoji: '😊' };
    if (aqi <= 100) return { bg: 'bg-yellow-100 dark:bg-yellow-900/20', text: 'text-yellow-800 dark:text-yellow-300', status: 'MODERATE', emoji: '😐' };
    if (aqi <= 150) return { bg: 'bg-orange-100 dark:bg-orange-900/20', text: 'text-orange-800 dark:text-orange-300', status: 'UNHEALTHY FOR SENSITIVE GROUPS', emoji: '😷' };
    if (aqi <= 200) return { bg: 'bg-red-100 dark:bg-red-900/20', text: 'text-red-800 dark:text-red-300', status: 'UNHEALTHY', emoji: '😰' };
    if (aqi <= 300) return { bg: 'bg-purple-100 dark:bg-purple-900/20', text: 'text-purple-800 dark:text-purple-300', status: 'VERY UNHEALTHY', emoji: '😨' };
    return { bg: 'bg-pink-100 dark:bg-pink-900/20', text: 'text-pink-900 dark:text-pink-300', status: 'HAZARDOUS', emoji: '☠️' };
  };

  const status = getStatusColor(data.aqi);

  return (
    <div className={`mb-4 rounded-xl border-2 ${status.bg} p-6`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <span className="text-5xl">{status.emoji}</span>
            <div>
              <h2 className={`text-3xl font-bold ${status.text}`}>{status.status}</h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{data.city}, {data.country}</p>
            </div>
          </div>
          <p className={`mt-4 text-lg ${status.text}`}>
            {data.aqi <= 50 && '✅ Air quality is satisfactory. Enjoy outdoor activities!'}
            {data.aqi > 50 && data.aqi <= 100 && '⚠️ Sensitive groups should consider reducing prolonged outdoor activity.'}
            {data.aqi > 100 && data.aqi <= 150 && '🚨 Sensitive groups should avoid prolonged outdoor activity.'}
            {data.aqi > 150 && data.aqi <= 200 && '🚨 Everyone should reduce prolonged outdoor activity.'}
            {data.aqi > 200 && data.aqi <= 300 && '⛔ Everyone should avoid outdoor activity.'}
            {data.aqi > 300 && '☠️ EMERGENCY: Stay indoors. Health alert for everyone.'}
          </p>
        </div>
        <div className="text-center">
          <div className={`text-7xl font-bold ${status.text}`}>{Math.round(data.aqi)}</div>
          <div className="mt-2 text-sm font-medium text-gray-600 dark:text-gray-400">AQI</div>
        </div>
      </div>
    </div>
  );
}

// 4. QUICK ACTIONS PANEL
function QuickActionsPanel({ stationId }: { stationId: string }) {
  return (
    <div className="mb-4 grid gap-3 md:grid-cols-3">
      <QuickActionCard
        icon="🚶"
        question="Should I go outside?"
        answer="Limit outdoor time"
        detail="Air quality is unhealthy for sensitive groups"
        color="orange"
      />
      <QuickActionCard
        icon="⏰"
        question="When will air improve?"
        answer="Tonight around 8 PM"
        detail="AI predicts AQI will drop to 110"
        color="blue"
      />
      <QuickActionCard
        icon="🚗"
        question="What's the main problem?"
        answer="Traffic pollution"
        detail="High NO₂ and CO from vehicles"
        color="red"
      />
    </div>
  );
}

function QuickActionCard({ icon, question, answer, detail, color }: {
  icon: string;
  question: string;
  answer: string;
  detail: string;
  color: 'orange' | 'blue' | 'red';
}) {
  const colors = {
    orange: 'border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-900/20',
    blue: 'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-900/20',
    red: 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/20',
  };

  return (
    <div className={`rounded-lg border p-3 ${colors[color]}`}>
      <div className="mb-2 text-3xl">{icon}</div>
      <div className="mb-1 text-xs font-medium text-gray-600 dark:text-gray-400">{question}</div>
      <div className="mb-1 text-lg font-bold text-gray-900 dark:text-white">{answer}</div>
      <div className="text-xs text-gray-600 dark:text-gray-400">{detail}</div>
    </div>
  );
}

// 2. PANEL HEADER - Better Titles
function PanelHeader({ title, subtitle, icon, tooltip }: {
  title: string;
  subtitle: string;
  icon: string;
  tooltip: string;
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="mb-2 flex items-start justify-between">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
          <span>{icon}</span>
          {title}
        </h2>
        <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{subtitle}</p>
      </div>
      <div className="relative">
        <button
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className="rounded-full p-1 hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
        {showTooltip && (
          <div className="absolute right-0 top-8 z-10 w-64 rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-700 shadow-lg dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
            {tooltip}
          </div>
        )}
      </div>
    </div>
  );
}
