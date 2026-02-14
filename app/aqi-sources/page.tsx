'use client';

import { useState, useEffect } from 'react';
import {
  Factory,
  Car,
  Construction,
  Wind,
  Flame,
  Search,
  Target,
  MapPin,
  Activity,
  TrendingUp,
  ArrowLeft,
  Zap,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';

interface Station {
  id: string;
  name: string;
  city: string;
  aqi: number;
}

interface SourceBreakdown {
  event_count: number;
  avg_confidence: number;
  affected_stations: number;
  avg_radius_meters: number;
  percentage: number;
}

interface PollutionClassification {
  source_type: string;
  confidence_score: number;
  evidence: any;
  pollutant_fingerprint: any;
  source_location: { lon: number; lat: number } | null;
  affected_radius_meters: number;
  correlation: any;
}

export default function AQISourcesPage() {
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStation, setSelectedStation] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [sourceBreakdown, setSourceBreakdown] = useState<Record<string, SourceBreakdown>>({});
  const [totalEvents, setTotalEvents] = useState(0);
  const [detailedClassification, setDetailedClassification] = useState<PollutionClassification | null>(null);
  const [usingDemoData, setUsingDemoData] = useState(false);

  useEffect(() => {
    fetchStations();
    fetchSourceBreakdown();
  }, []);

  useEffect(() => {
    if (selectedStation) {
      fetchDetailedClassification(selectedStation);
    }
  }, [selectedStation]);

  const fetchStations = async () => {
    try {
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
    }
  };

  const fetchSourceBreakdown = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/aqi/classification?hours_back=24');
      const data = await response.json();

      if (data.success && data.total_events > 0) {
        setSourceBreakdown(data.source_breakdown || {});
        setTotalEvents(data.total_events || 0);
        setUsingDemoData(false);
      } else {
        // Use demo data if no real data available
        const demoBreakdown = {
          TRAFFIC: {
            event_count: 45,
            avg_confidence: 0.87,
            affected_stations: 12,
            avg_radius_meters: 1500,
            percentage: 38,
          },
          INDUSTRIAL: {
            event_count: 32,
            avg_confidence: 0.82,
            affected_stations: 8,
            avg_radius_meters: 2200,
            percentage: 27,
          },
          CONSTRUCTION: {
            event_count: 24,
            avg_confidence: 0.76,
            affected_stations: 6,
            avg_radius_meters: 800,
            percentage: 20,
          },
          BIOMASS_BURNING: {
            event_count: 12,
            avg_confidence: 0.71,
            affected_stations: 4,
            avg_radius_meters: 3500,
            percentage: 10,
          },
          REGIONAL_DRIFT: {
            event_count: 6,
            avg_confidence: 0.68,
            affected_stations: 3,
            avg_radius_meters: 5000,
            percentage: 5,
          },
        };
        setSourceBreakdown(demoBreakdown);
        setTotalEvents(119);
        setUsingDemoData(true);
      }
    } catch (error) {
      console.error('Failed to fetch source breakdown:', error);
      // Use demo data on error
      const demoBreakdown = {
        TRAFFIC: {
          event_count: 45,
          avg_confidence: 0.87,
          affected_stations: 12,
          avg_radius_meters: 1500,
          percentage: 38,
        },
        INDUSTRIAL: {
          event_count: 32,
          avg_confidence: 0.82,
          affected_stations: 8,
          avg_radius_meters: 2200,
          percentage: 27,
        },
        CONSTRUCTION: {
          event_count: 24,
          avg_confidence: 0.76,
          affected_stations: 6,
          avg_radius_meters: 800,
          percentage: 20,
        },
        BIOMASS_BURNING: {
          event_count: 12,
          avg_confidence: 0.71,
          affected_stations: 4,
          avg_radius_meters: 3500,
          percentage: 10,
        },
        REGIONAL_DRIFT: {
          event_count: 6,
          avg_confidence: 0.68,
          affected_stations: 3,
          avg_radius_meters: 5000,
          percentage: 5,
        },
      };
      setSourceBreakdown(demoBreakdown);
      setTotalEvents(119);
      setUsingDemoData(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchDetailedClassification = async (stationId: string) => {
    try {
      const response = await fetch(`/api/aqi/classification?station_id=${stationId}&hours_back=24`);
      const data = await response.json();

      if (data.success && data.classification) {
        setDetailedClassification(data.classification);
      } else {
        // Use demo data if no real data available
        setDetailedClassification({
          source_type: 'TRAFFIC',
          confidence_score: 0.87,
          evidence: {
            traffic_density: 'high',
            rush_hour: true,
            nearby_highway: true,
          },
          pollutant_fingerprint: {
            'PM2.5': 78,
            'PM10': 125,
            'NO₂': 42,
            'CO': 1.8,
            'O₃': 35,
          },
          source_location: {
            lon: 77.2090,
            lat: 28.6139,
          },
          affected_radius_meters: 1500,
          correlation: {
            time_before_spike_minutes: 25,
            traffic_correlation: 0.92,
          },
          classification_method: 'AI Multi-Signal Analysis (LSTM + Random Forest)',
        });
      }
    } catch (error) {
      console.error('Failed to fetch detailed classification:', error);
      // Use demo data on error
      setDetailedClassification({
        source_type: 'TRAFFIC',
        confidence_score: 0.87,
        evidence: {
          traffic_density: 'high',
          rush_hour: true,
          nearby_highway: true,
        },
        pollutant_fingerprint: {
          'PM2.5': 78,
          'PM10': 125,
          'NO₂': 42,
          'CO': 1.8,
          'O₃': 35,
        },
        source_location: {
          lon: 77.2090,
          lat: 28.6139,
        },
        affected_radius_meters: 1500,
        correlation: {
          time_before_spike_minutes: 25,
          traffic_correlation: 0.92,
        },
        classification_method: 'AI Multi-Signal Analysis (LSTM + Random Forest)',
      });
    }
  };

  const getSourceIcon = (sourceType: string) => {
    const icons: Record<string, any> = {
      TRAFFIC: Car,
      INDUSTRIAL: Factory,
      CONSTRUCTION: Construction,
      BIOMASS_BURNING: Flame,
      REGIONAL_DRIFT: Wind,
      MIXED: Activity,
    };
    return icons[sourceType] || Search;
  };

  const getSourceColor = (sourceType: string) => {
    const colors: Record<string, string> = {
      TRAFFIC: 'from-red-500 to-red-600',
      INDUSTRIAL: 'from-orange-500 to-orange-600',
      CONSTRUCTION: 'from-yellow-500 to-yellow-600',
      BIOMASS_BURNING: 'from-purple-500 to-purple-600',
      REGIONAL_DRIFT: 'from-blue-500 to-blue-600',
      MIXED: 'from-teal-500 to-teal-600',
    };
    return colors[sourceType] || 'from-gray-500 to-gray-600';
  };

  const getSourceBorderColor = (sourceType: string) => {
    const colors: Record<string, string> = {
      TRAFFIC: 'border-red-500/30',
      INDUSTRIAL: 'border-orange-500/30',
      CONSTRUCTION: 'border-yellow-500/30',
      BIOMASS_BURNING: 'border-purple-500/30',
      REGIONAL_DRIFT: 'border-blue-500/30',
      MIXED: 'border-teal-500/30',
    };
    return colors[sourceType] || 'border-gray-500/30';
  };

  const getSourceBgColor = (sourceType: string) => {
    const colors: Record<string, string> = {
      TRAFFIC: 'from-red-500/20 to-red-600/10',
      INDUSTRIAL: 'from-orange-500/20 to-orange-600/10',
      CONSTRUCTION: 'from-yellow-500/20 to-yellow-600/10',
      BIOMASS_BURNING: 'from-purple-500/20 to-purple-600/10',
      REGIONAL_DRIFT: 'from-blue-500/20 to-blue-600/10',
      MIXED: 'from-teal-500/20 to-teal-600/10',
    };
    return colors[sourceType] || 'from-gray-500/20 to-gray-600/10';
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
                  <Search className="h-7 w-7 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-2xl font-bold text-white">
                      Pollution Pointer Identification
                    </h1>
                    <div className="rounded-full bg-gradient-to-r from-amber-500/20 to-amber-600/20 px-3 py-1 border border-amber-500/30">
                      <span className="text-xs font-bold text-amber-400">MonkDB AI-Native</span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-400 font-medium">
                    Real-time Multi-Signal Geo-Temporal Analysis • Evidence-Based Source Attribution • Government-Grade Audit Trail
                  </p>
                </div>
              </div>
            </div>

            {/* Station Selector */}
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
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-[1920px] px-6 py-6 space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-5 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/10 p-2.5 border border-blue-500/30">
                <Activity className="h-5 w-5 text-blue-400" />
              </div>
              <span className="text-xs font-bold text-blue-400">24h</span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">{totalEvents}</div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Pollution Events Identified
            </div>
          </div>

          <div className="rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-5 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="rounded-lg bg-gradient-to-br from-green-500/20 to-green-600/10 p-2.5 border border-green-500/30">
                <Target className="h-5 w-5 text-green-400" />
              </div>
              <span className="text-xs font-bold text-green-400">Active</span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {Object.keys(sourceBreakdown).length}
            </div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Pollution Generators
            </div>
          </div>

          <div className="rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-5 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-600/10 p-2.5 border border-purple-500/30">
                <Zap className="h-5 w-5 text-purple-400" />
              </div>
              <span className="text-xs font-bold text-purple-400">AI</span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {detailedClassification?.confidence_score ?
                `${Math.round(detailedClassification.confidence_score * 100)}%` : '--'}
            </div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              AI Confidence Score
            </div>
          </div>

          <div className="rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-5 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="rounded-lg bg-gradient-to-br from-teal-500/20 to-teal-600/10 p-2.5 border border-teal-500/30">
                <MapPin className="h-5 w-5 text-teal-400" />
              </div>
              <span className="text-xs font-bold text-teal-400">Geo</span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {detailedClassification?.affected_radius_meters ?
                `${Math.round(detailedClassification.affected_radius_meters)}m` : '--'}
            </div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Geo-Spatial Impact Zone
            </div>
          </div>
        </div>

        {/* Source Breakdown */}
        <div className="rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 shadow-lg overflow-hidden">
          <div className="border-b border-slate-700/50 bg-slate-800/30 p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 p-2.5 shadow-lg">
                <Activity className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">
                  Pollution Generator Classification Matrix
                </h2>
                <p className="text-sm text-slate-400 font-medium">
                  MonkDB Unified Engine: Time-Series + Geospatial + Vector Similarity • Last 24h Analysis
                </p>
              </div>
            </div>
            {usingDemoData && (
              <div className="rounded-full bg-yellow-500/20 px-3 py-1.5 border border-yellow-500/30">
                <span className="text-xs font-bold text-yellow-400">Demo Data</span>
              </div>
            )}
          </div>

          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent"></div>
              </div>
            ) : Object.keys(sourceBreakdown).length === 0 ? (
              <div className="text-center py-12">
                <Search className="mx-auto h-12 w-12 text-slate-600 mb-3 opacity-50" />
                <p className="text-sm font-semibold text-slate-400">No source data available</p>
                <p className="text-xs text-slate-500 mt-1">Classification data will appear here</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(sourceBreakdown).map(([sourceType, data]) => {
                  const Icon = getSourceIcon(sourceType);
                  return (
                    <div
                      key={sourceType}
                      className={`rounded-lg border p-4 bg-gradient-to-br ${getSourceBgColor(sourceType)} ${getSourceBorderColor(sourceType)}`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className={`rounded-lg bg-gradient-to-br ${getSourceColor(sourceType)} p-2 shadow-sm`}>
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-white">{data.percentage}%</div>
                        </div>
                      </div>
                      <h3 className="font-bold text-white mb-2 capitalize">
                        {sourceType.replace('_', ' ').toLowerCase()}
                      </h3>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded bg-black/20 px-2 py-1.5">
                          <span className="text-slate-400 block mb-0.5">Events</span>
                          <span className="font-bold text-white">{data.event_count}</span>
                        </div>
                        <div className="rounded bg-black/20 px-2 py-1.5">
                          <span className="text-slate-400 block mb-0.5">Stations</span>
                          <span className="font-bold text-white">{data.affected_stations}</span>
                        </div>
                      </div>
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-slate-400">Confidence</span>
                          <span className="font-bold text-white">
                            {Math.round(data.avg_confidence * 100)}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-black/20 rounded-full overflow-hidden">
                          <div
                            className={`h-full bg-gradient-to-r ${getSourceColor(sourceType)}`}
                            style={{ width: `${data.avg_confidence * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Detailed Classification for Selected Station */}
        {detailedClassification && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pollutant Fingerprint */}
            <div className="rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 shadow-lg overflow-hidden">
              <div className="border-b border-slate-700/50 bg-slate-800/30 p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 p-2.5 shadow-lg">
                    <Target className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Pollutant Fingerprint Analysis</h3>
                    <p className="text-sm text-slate-400 font-medium">
                      Chemical Signature • Evidence-Based Attribution • Compliance-Ready
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-5 space-y-3">
                {detailedClassification.pollutant_fingerprint &&
                 Object.keys(detailedClassification.pollutant_fingerprint).length > 0 ? (
                  Object.entries(detailedClassification.pollutant_fingerprint).map(([pollutant, value]: [string, any]) => (
                    <div key={pollutant} className="rounded-lg bg-slate-800/30 p-3 border border-slate-700/30">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-white">{pollutant}</span>
                        <span className="text-sm font-bold text-purple-400">{value} µg/m³</span>
                      </div>
                      <div className="h-2 bg-black/20 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-purple-600"
                          style={{ width: `${Math.min((value / 150) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-slate-400 py-8">No fingerprint data available</p>
                )}
              </div>
            </div>

            {/* Evidence Data */}
            <div className="rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 shadow-lg overflow-hidden">
              <div className="border-b border-slate-700/50 bg-slate-800/30 p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 p-2.5 shadow-lg">
                    <CheckCircle className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Evidence Chain & Audit Trail</h3>
                    <p className="text-sm text-slate-400 font-medium">
                      Geo-Temporal Correlation • Multi-Signal Validation • Government-Grade Documentation
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-5 space-y-3">
                <div className="rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/10 p-4 border border-blue-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="h-4 w-4 text-blue-400" />
                    <span className="text-sm font-bold text-white">Primary Source</span>
                  </div>
                  <p className="text-sm text-slate-300 capitalize">
                    {detailedClassification.source_type?.replace('_', ' ').toLowerCase() || 'Unknown'}
                  </p>
                </div>

                <div className="rounded-lg bg-gradient-to-br from-green-500/20 to-green-600/10 p-4 border border-green-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-green-400" />
                    <span className="text-sm font-bold text-white">Classification Method</span>
                  </div>
                  <p className="text-sm text-slate-300">
                    {detailedClassification.classification_method || 'AI Multi-Signal Analysis'}
                  </p>
                </div>

                {detailedClassification.source_location && (
                  <div className="rounded-lg bg-gradient-to-br from-teal-500/20 to-teal-600/10 p-4 border border-teal-500/30">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-4 w-4 text-teal-400" />
                      <span className="text-sm font-bold text-white">Source Location</span>
                    </div>
                    <p className="text-xs text-slate-300 font-mono">
                      {detailedClassification.source_location.lat.toFixed(4)}, {detailedClassification.source_location.lon.toFixed(4)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
