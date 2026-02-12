'use client';

import { useEffect, useState } from 'react';
import { X, TrendingUp, MapPin } from 'lucide-react';
import TimeSeriesChart, { TimeSeriesSeries } from '../timeseries/TimeSeriesChart';

interface AQITrendModalProps {
  stationId: string;
  stationName: string;
  city: string;
  onClose: () => void;
}

interface TrendData {
  timestamp: number;
  aqi: { avg: number | null; min: number | null; max: number | null };
  pollutants: {
    pm25: number | null;
    pm10: number | null;
    no2: number | null;
    so2: number | null;
    co: number | null;
    o3: number | null;
  };
  weather: {
    temperature: number | null;
    humidity: number | null;
    pressure: number | null;
  };
}

export default function AQITrendModal({
  stationId,
  stationName,
  city,
  onClose,
}: AQITrendModalProps) {
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'aqi' | 'pollutants' | 'weather'>('aqi');

  useEffect(() => {
    fetchTrends();
  }, [stationId]);

  const fetchTrends = async () => {
    try {
      const response = await fetch(`/api/aqi/trends/${stationId}`);
      const data = await response.json();

      if (data.success) {
        setTrends(data.trends);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch trends');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  // Transform data for ECharts
  const getChartSeries = (): TimeSeriesSeries[] => {
    if (activeView === 'aqi') {
      return [
        {
          name: 'Average AQI',
          type: 'area',
          data: trends
            .filter((t) => t.aqi.avg !== null)
            .map((t) => ({
              timestamp: new Date(t.timestamp),
              value: t.aqi.avg!,
            })),
          color: '#3b82f6',
        },
      ];
    }

    if (activeView === 'pollutants') {
      const pollutantSeries: TimeSeriesSeries[] = [];

      if (trends.some((t) => t.pollutants.pm25 !== null)) {
        pollutantSeries.push({
          name: 'PM2.5',
          data: trends
            .filter((t) => t.pollutants.pm25 !== null)
            .map((t) => ({
              timestamp: new Date(t.timestamp),
              value: t.pollutants.pm25!,
            })),
          color: '#ef4444',
        });
      }

      if (trends.some((t) => t.pollutants.pm10 !== null)) {
        pollutantSeries.push({
          name: 'PM10',
          data: trends
            .filter((t) => t.pollutants.pm10 !== null)
            .map((t) => ({
              timestamp: new Date(t.timestamp),
              value: t.pollutants.pm10!,
            })),
          color: '#f97316',
        });
      }

      if (trends.some((t) => t.pollutants.no2 !== null)) {
        pollutantSeries.push({
          name: 'NO2',
          data: trends
            .filter((t) => t.pollutants.no2 !== null)
            .map((t) => ({
              timestamp: new Date(t.timestamp),
              value: t.pollutants.no2!,
            })),
          color: '#eab308',
        });
      }

      if (trends.some((t) => t.pollutants.o3 !== null)) {
        pollutantSeries.push({
          name: 'O3',
          data: trends
            .filter((t) => t.pollutants.o3 !== null)
            .map((t) => ({
              timestamp: new Date(t.timestamp),
              value: t.pollutants.o3!,
            })),
          color: '#10b981',
        });
      }

      return pollutantSeries.length > 0 ? pollutantSeries : [];
    }

    // Weather view
    const weatherSeries: TimeSeriesSeries[] = [];

    if (trends.some((t) => t.weather.temperature !== null)) {
      weatherSeries.push({
        name: 'Temperature (°C)',
        data: trends
          .filter((t) => t.weather.temperature !== null)
          .map((t) => ({
            timestamp: new Date(t.timestamp),
            value: t.weather.temperature!,
          })),
        color: '#f59e0b',
      });
    }

    if (trends.some((t) => t.weather.humidity !== null)) {
      weatherSeries.push({
        name: 'Humidity (%)',
        data: trends
          .filter((t) => t.weather.humidity !== null)
          .map((t) => ({
            timestamp: new Date(t.timestamp),
            value: t.weather.humidity!,
          })),
        color: '#06b6d4',
      });
    }

    return weatherSeries.length > 0 ? weatherSeries : [];
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                7-Day AQI Trends
              </h2>
              <div className="flex items-center gap-2 mt-1 text-sm text-gray-600 dark:text-gray-400">
                <MapPin className="w-4 h-4" />
                <span>
                  {city} - {stationName}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* View Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <button
            onClick={() => setActiveView('aqi')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeView === 'aqi'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-white dark:bg-gray-800'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            AQI Trends
          </button>
          <button
            onClick={() => setActiveView('pollutants')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeView === 'pollutants'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-white dark:bg-gray-800'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Pollutants
          </button>
          <button
            onClick={() => setActiveView('weather')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeView === 'weather'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-white dark:bg-gray-800'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Weather Context
          </button>
        </div>

        {/* Chart Area */}
        <div className="flex-1 overflow-auto p-6">
          {loading && (
            <div className="flex items-center justify-center h-96">
              <div className="text-gray-600 dark:text-gray-400">Loading trend data...</div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-96">
              <div className="text-red-600 dark:text-red-400">Error: {error}</div>
            </div>
          )}

          {!loading && !error && trends.length > 0 && (
            <div>
              {getChartSeries().length > 0 ? (
                <>
                  <TimeSeriesChart
                    series={getChartSeries()}
                    title={`${
                      activeView === 'aqi'
                        ? 'AQI'
                        : activeView === 'pollutants'
                        ? 'Pollutant Levels'
                        : 'Weather Conditions'
                    } - Last 7 Days`}
                    height={500}
                    showZoomControls={true}
                  />

                  {/* Statistics Summary */}
                  {activeView === 'aqi' && (
                    <div className="mt-6 grid grid-cols-4 gap-4">
                      <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Average AQI</div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {Math.round(
                            trends
                              .filter((t) => t.aqi.avg !== null)
                              .reduce((sum, t) => sum + (t.aqi.avg || 0), 0) / trends.length
                          )}
                        </div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Peak AQI</div>
                        <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                          {Math.max(...trends.filter((t) => t.aqi.max !== null).map((t) => t.aqi.max!))}
                        </div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Lowest AQI</div>
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {Math.min(...trends.filter((t) => t.aqi.min !== null).map((t) => t.aqi.min!))}
                        </div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Data Points</div>
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          {trends.length}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center h-96">
                  <div className="text-gray-600 dark:text-gray-400">
                    No {activeView} data available for this station
                  </div>
                </div>
              )}
            </div>
          )}

          {!loading && !error && trends.length === 0 && (
            <div className="flex items-center justify-center h-96">
              <div className="text-gray-600 dark:text-gray-400">
                No historical data available for this station
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
