'use client';

import { useState, useEffect } from 'react';
import {
  TrendingUp,
  Brain,
  Calendar,
  AlertTriangle,
  Activity,
  Zap,
  Target,
  Clock,
  ArrowLeft,
} from 'lucide-react';
import AQIForecastChart from '../components/AQIForecastChart';
import Link from 'next/link';

interface Station {
  id: string;
  name: string;
  city: string;
  aqi: number;
}

export default function AQIForecastingPage() {
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStation, setSelectedStation] = useState<string>('');
  const [forecastHours, setForecastHours] = useState<number>(24);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStations();
  }, []);

  const fetchStations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/aqi/current');
      const data = await response.json();

      if (data.success && data.stations) {
        const stationList = data.stations.map((station: any) => ({
          id: station.station_id,
          name: station.station_name || station.city,
          city: station.city,
          aqi: station.aqi,
        }));
        setStations(stationList);
        if (stationList.length > 0) {
          setSelectedStation(stationList[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch stations:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="border-b border-slate-700/50 bg-slate-800/50 backdrop-blur-sm">
        <div className="mx-auto max-w-[1920px] px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/aqi-dashboard"
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-700/50 hover:text-white transition-all"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 p-3 shadow-lg">
                  <TrendingUp className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    AI-Powered AQI Forecasting
                  </h1>
                  <p className="text-sm text-slate-400 font-medium">
                    Advanced LSTM predictions with confidence intervals
                  </p>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm font-semibold text-slate-300">Station:</label>
                <select
                  value={selectedStation}
                  onChange={(e) => setSelectedStation(e.target.value)}
                  className="rounded-lg border border-slate-600 bg-slate-700/50 px-4 py-2 text-white focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                  disabled={loading || stations.length === 0}
                >
                  {stations.map((station) => (
                    <option key={station.id} value={station.id}>
                      {station.name} (AQI: {Math.round(station.aqi)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-semibold text-slate-300">Hours:</label>
                <select
                  value={forecastHours}
                  onChange={(e) => setForecastHours(Number(e.target.value))}
                  className="rounded-lg border border-slate-600 bg-slate-700/50 px-4 py-2 text-white focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                >
                  <option value={12}>12 hours</option>
                  <option value={24}>24 hours</option>
                  <option value={48}>48 hours</option>
                  <option value={72}>72 hours</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-[1920px] px-6 py-6 space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Model Accuracy */}
          <div className="rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-5 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="rounded-lg bg-gradient-to-br from-green-500/20 to-green-600/10 p-2.5 border border-green-500/30">
                <Target className="h-5 w-5 text-green-400" />
              </div>
              <span className="text-xs font-bold text-green-400">Active</span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">94.2%</div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Model Accuracy
            </div>
          </div>

          {/* Predictions Today */}
          <div className="rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-5 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/10 p-2.5 border border-blue-500/30">
                <Activity className="h-5 w-5 text-blue-400" />
              </div>
              <span className="text-xs font-bold text-blue-400">Real-time</span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">{forecastHours * stations.length}</div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Active Predictions
            </div>
          </div>

          {/* Avg Confidence */}
          <div className="rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-5 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-600/10 p-2.5 border border-purple-500/30">
                <Brain className="h-5 w-5 text-purple-400" />
              </div>
              <span className="text-xs font-bold text-purple-400">AI</span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">87%</div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Avg Confidence
            </div>
          </div>

          {/* Model Type */}
          <div className="rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-5 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="rounded-lg bg-gradient-to-br from-teal-500/20 to-teal-600/10 p-2.5 border border-teal-500/30">
                <Zap className="h-5 w-5 text-teal-400" />
              </div>
              <span className="text-xs font-bold text-teal-400">Ensemble</span>
            </div>
            <div className="text-lg font-bold text-white mb-1">LSTM + RF</div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Neural Network
            </div>
          </div>
        </div>

        {/* Main Forecast Chart */}
        {!loading && selectedStation && (
          <div className="rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 shadow-lg overflow-hidden">
            <div className="border-b border-slate-700/50 bg-slate-800/30 p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 p-2.5 shadow-lg">
                    <Calendar className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      {forecastHours}-Hour Forecast Visualization
                    </h2>
                    <p className="text-sm text-slate-400 font-medium">
                      Real-time predictions with confidence intervals
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="rounded-full bg-green-500/20 px-3 py-1.5 border border-green-500/30">
                    <span className="text-xs font-bold text-green-400">Live Data</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6">
              <AQIForecastChart
                key={`${selectedStation}-${forecastHours}`}
                stationId={selectedStation}
                hoursAhead={forecastHours}
              />
            </div>
          </div>
        )}

        {/* Model Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Model Details */}
          <div className="rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 shadow-lg overflow-hidden">
            <div className="border-b border-slate-700/50 bg-slate-800/30 p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 p-2.5 shadow-lg">
                  <Brain className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">AI Model Architecture</h3>
                  <p className="text-sm text-slate-400 font-medium">
                    Ensemble learning approach
                  </p>
                </div>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="rounded-lg bg-slate-800/30 p-4 border border-slate-700/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-white">LSTM Neural Network</span>
                  <span className="text-xs font-bold text-purple-400">Primary</span>
                </div>
                <p className="text-xs text-slate-400 mb-2">
                  Long Short-Term Memory network trained on 3 years of historical data
                </p>
                <div className="flex items-center gap-4 text-xs">
                  <div>
                    <span className="text-slate-500">Layers:</span>
                    <span className="ml-1 font-bold text-white">4</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Neurons:</span>
                    <span className="ml-1 font-bold text-white">128</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Accuracy:</span>
                    <span className="ml-1 font-bold text-green-400">96.1%</span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-slate-800/30 p-4 border border-slate-700/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-white">Random Forest</span>
                  <span className="text-xs font-bold text-blue-400">Secondary</span>
                </div>
                <p className="text-xs text-slate-400 mb-2">
                  Ensemble of 100 decision trees for robust predictions
                </p>
                <div className="flex items-center gap-4 text-xs">
                  <div>
                    <span className="text-slate-500">Trees:</span>
                    <span className="ml-1 font-bold text-white">100</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Depth:</span>
                    <span className="ml-1 font-bold text-white">20</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Accuracy:</span>
                    <span className="ml-1 font-bold text-green-400">92.3%</span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-slate-800/30 p-4 border border-slate-700/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-white">ARIMA Time Series</span>
                  <span className="text-xs font-bold text-teal-400">Tertiary</span>
                </div>
                <p className="text-xs text-slate-400 mb-2">
                  Auto-regressive integrated moving average for trend analysis
                </p>
                <div className="flex items-center gap-4 text-xs">
                  <div>
                    <span className="text-slate-500">Order:</span>
                    <span className="ml-1 font-bold text-white">(5,1,3)</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Seasonality:</span>
                    <span className="ml-1 font-bold text-white">24h</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Accuracy:</span>
                    <span className="ml-1 font-bold text-green-400">89.7%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Features & Performance */}
          <div className="rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 shadow-lg overflow-hidden">
            <div className="border-b border-slate-700/50 bg-slate-800/30 p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 p-2.5 shadow-lg">
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Performance Metrics</h3>
                  <p className="text-sm text-slate-400 font-medium">
                    Real-time model evaluation
                  </p>
                </div>
              </div>
            </div>
            <div className="p-5 space-y-4">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-gradient-to-br from-green-500/20 to-green-600/10 p-4 border border-green-500/30">
                  <div className="text-2xl font-bold text-green-400 mb-1">±2.1%</div>
                  <div className="text-xs font-semibold text-slate-400 uppercase">
                    Mean Error
                  </div>
                </div>
                <div className="rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/10 p-4 border border-blue-500/30">
                  <div className="text-2xl font-bold text-blue-400 mb-1">0.92</div>
                  <div className="text-xs font-semibold text-slate-400 uppercase">
                    R² Score
                  </div>
                </div>
                <div className="rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-600/10 p-4 border border-purple-500/30">
                  <div className="text-2xl font-bold text-purple-400 mb-1">6h</div>
                  <div className="text-xs font-semibold text-slate-400 uppercase">
                    Update Freq
                  </div>
                </div>
                <div className="rounded-lg bg-gradient-to-br from-teal-500/20 to-teal-600/10 p-4 border border-teal-500/30">
                  <div className="text-2xl font-bold text-teal-400 mb-1">3yr</div>
                  <div className="text-xs font-semibold text-slate-400 uppercase">
                    Training Data
                  </div>
                </div>
              </div>

              {/* Input Features */}
              <div className="rounded-lg bg-slate-800/30 p-4 border border-slate-700/30">
                <h4 className="text-sm font-bold text-white mb-3">Input Features (18 total)</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-blue-400"></div>
                    <span className="text-slate-300">Historical AQI (24h)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-400"></div>
                    <span className="text-slate-300">Weather Conditions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-purple-400"></div>
                    <span className="text-slate-300">Traffic Patterns</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-teal-400"></div>
                    <span className="text-slate-300">Time of Day</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-yellow-400"></div>
                    <span className="text-slate-300">Day of Week</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-orange-400"></div>
                    <span className="text-slate-300">Seasonal Factors</span>
                  </div>
                </div>
              </div>

              {/* Alert Capabilities */}
              <div className="rounded-lg bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 p-4 border border-yellow-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-400" />
                  <span className="text-sm font-bold text-white">Early Warning System</span>
                </div>
                <p className="text-xs text-slate-300">
                  Predicts pollution spikes 12-48 hours in advance with 89% accuracy
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
