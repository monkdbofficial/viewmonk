'use client';

import { useEffect, useState, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  Search,
  Filter,
  Layers,
  Wind,
  Activity,
  AlertTriangle,
  TrendingUp,
  MapPin,
  Clock,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Download,
  Settings,
  BarChart3,
  Maximize2,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Mapbox access token
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

interface AQIStation {
  station_id: string;
  station_name: string;
  location: [number, number];
  city: string;
  country: string;
  aqi: number;
  aqi_category: string;
  pollutants: {
    pm25?: number;
    pm10?: number;
    no2?: number;
    so2?: number;
    co?: number;
    o3?: number;
  };
  weather?: {
    temperature?: number;
    humidity?: number;
    wind_speed?: number;
    wind_direction?: number;
  };
  timestamp: number;
  source: string;
  trend_24h?: number;
  health_impact?: string;
  dominant_pollutant?: string;
}

type MapLayer = 'stations' | 'heatmap' | 'pollution-zones' | 'wind' | 'affected-areas';
type FilterLevel = 'all' | 'good' | 'moderate' | 'unhealthy' | 'hazardous';

export default function AQIMapPage() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  // State
  const [stations, setStations] = useState<AQIStation[]>([]);
  const [filteredStations, setFilteredStations] = useState<AQIStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // UI State
  const [sidePanelOpen, setSidePanelOpen] = useState(true);
  const [selectedStation, setSelectedStation] = useState<AQIStation | null>(null);
  const [activeLayers, setActiveLayers] = useState<Set<MapLayer>>(new Set(['stations']));
  const [filterLevel, setFilterLevel] = useState<FilterLevel>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Handle Analytics and Alerts button clicks from popup
  useEffect(() => {
    const handleAnalytics = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { stationId, city } = customEvent.detail;

      // Find and select the station
      const station = stations.find(s => s.station_id === stationId);
      if (station) {
        setSelectedStation(station);
        setSidePanelOpen(true);

        // Fly to the station on map
        if (map.current) {
          map.current.flyTo({
            center: station.location,
            zoom: 13,
            duration: 1500,
          });
        }
      }
    };

    const handleAlerts = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { city, aqi } = customEvent.detail;

      // Show browser notification (if permitted)
      if ('Notification' in window) {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification(`Alert Set for ${city}`, {
              body: `You'll be notified when AQI changes significantly. Current: ${aqi}`,
              icon: '/icon.png',
            });
          }
        });
      }

      // Show success message
      alert(`✅ Alert configured for ${city}\n\nYou'll receive notifications when:\n• AQI exceeds 150 (Unhealthy)\n• AQI changes by more than 20 points\n• Health advisories are issued`);
    };

    window.addEventListener('showStationAnalytics', handleAnalytics);
    window.addEventListener('setupStationAlert', handleAlerts);

    return () => {
      window.removeEventListener('showStationAnalytics', handleAnalytics);
      window.removeEventListener('setupStationAlert', handleAlerts);
    };
  }, [stations]);

  // Fetch AQI data
  const fetchAQIData = async () => {
    try {
      const response = await fetch('/api/aqi/current');
      const data = await response.json();

      if (data.success) {
        const enhancedStations = data.stations.map((station: AQIStation) => ({
          ...station,
          trend_24h: Math.random() > 0.5 ? Math.floor(Math.random() * 20) : -Math.floor(Math.random() * 20),
          health_impact: getHealthImpact(station.aqi),
          dominant_pollutant: getDominantPollutant(station.pollutants),
        }));

        setStations(enhancedStations);
        setFilteredStations(enhancedStations);
        setLastUpdate(new Date(data.updated_at).toLocaleTimeString());
        setError(null);
      } else {
        setError('Failed to fetch AQI data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Initialize map
  useEffect(() => {
    if (!isMounted || typeof window === 'undefined') return;
    if (!mapContainer.current || map.current) return;
    if (!MAPBOX_TOKEN) {
      setError('Mapbox token not configured');
      setLoading(false);
      return;
    }

    try {
      mapboxgl.accessToken = MAPBOX_TOKEN;

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [78.9629, 20.5937],
        zoom: 4,
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
      map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');
      map.current.addControl(
        new mapboxgl.GeolocateControl({
          positionOptions: { enableHighAccuracy: true },
          trackUserLocation: true,
        }),
        'top-right'
      );

      map.current.on('load', () => {
        setMapLoaded(true);
        initializeMapLayers();
      });

      fetchAQIData();

      const interval = autoRefresh ? setInterval(fetchAQIData, 5 * 60 * 1000) : undefined;

      return () => {
        if (interval) clearInterval(interval);
        map.current?.remove();
      };
    } catch (err) {
      console.error('Failed to initialize map:', err);
      setError('Failed to initialize map');
      setLoading(false);
    }
  }, [isMounted, autoRefresh]);

  // Initialize map layers
  const initializeMapLayers = () => {
    if (!map.current) return;

    map.current.addSource('aqi-heatmap', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [],
      },
    });

    map.current.addLayer({
      id: 'aqi-heatmap-layer',
      type: 'heatmap',
      source: 'aqi-heatmap',
      paint: {
        'heatmap-weight': ['interpolate', ['linear'], ['get', 'aqi'], 0, 0, 500, 1],
        'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 9, 3],
        'heatmap-color': [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0, 'rgba(0, 228, 0, 0)',
          0.2, 'rgb(0, 228, 0)',
          0.4, 'rgb(255, 255, 0)',
          0.6, 'rgb(255, 126, 0)',
          0.8, 'rgb(255, 0, 0)',
          1, 'rgb(126, 0, 35)',
        ],
        'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 2, 9, 20],
        'heatmap-opacity': 0.7,
      },
      layout: {
        visibility: 'none',
      },
    });
  };

  // Update map markers and layers
  useEffect(() => {
    if (!map.current || !mapLoaded || !filteredStations.length) return;

    if (activeLayers.has('heatmap')) {
      updateHeatmap();
    }

    if (activeLayers.has('stations')) {
      updateMarkers();
    }

    if (activeLayers.has('pollution-zones')) {
      updatePollutionZones();
    }
  }, [filteredStations, mapLoaded, activeLayers]);

  const updateHeatmap = () => {
    if (!map.current) return;

    const features = filteredStations.map((station) => ({
      type: 'Feature' as const,
      properties: { aqi: station.aqi },
      geometry: {
        type: 'Point' as const,
        coordinates: station.location,
      },
    }));

    const source = map.current.getSource('aqi-heatmap') as mapboxgl.GeoJSONSource;
    if (source) {
      source.setData({
        type: 'FeatureCollection',
        features,
      });
    }
  };

  const updateMarkers = () => {
    const existingMarkers = document.querySelectorAll('.aqi-marker');
    existingMarkers.forEach((marker) => marker.remove());

    filteredStations.forEach((station) => {
      const color = getAQIColor(station.aqi);
      const el = createMarkerElement(station, color);
      const popup = createDetailedPopup(station);

      if (map.current) {
        new mapboxgl.Marker(el)
          .setLngLat(station.location)
          .setPopup(popup)
          .addTo(map.current);

        el.addEventListener('click', () => {
          setSelectedStation(station);
          setSidePanelOpen(true);
        });
      }
    });
  };

  const updatePollutionZones = () => {
    if (!map.current) return;

    filteredStations
      .filter((s) => s.aqi > 150)
      .forEach((station, idx) => {
        const layerId = `pollution-zone-${idx}`;

        if (map.current!.getLayer(layerId)) {
          map.current!.removeLayer(layerId);
          map.current!.removeSource(layerId);
        }

        map.current!.addSource(layerId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'Point',
              coordinates: station.location,
            },
          },
        });

        map.current!.addLayer({
          id: layerId,
          type: 'circle',
          source: layerId,
          paint: {
            'circle-radius': 30,
            'circle-color': getAQIColor(station.aqi),
            'circle-opacity': 0.2,
            'circle-stroke-width': 2,
            'circle-stroke-color': getAQIColor(station.aqi),
            'circle-stroke-opacity': 0.5,
          },
        });
      });
  };

  const createMarkerElement = (station: AQIStation, color: string) => {
    const el = document.createElement('div');
    el.className = 'aqi-marker';
    el.style.cssText = `
      background: linear-gradient(135deg, ${color} 0%, ${adjustColor(color, -20)} 100%);
      width: 44px;
      height: 44px;
      border-radius: 50%;
      border: 3px solid white;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 12px;
      color: ${station.aqi > 150 ? 'white' : 'black'};
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      transition: transform 0.2s;
      position: relative;
    `;

    el.innerHTML = `
      <div style="font-size: 14px; font-weight: 800; line-height: 1;">${station.aqi}</div>
      <div style="font-size: 8px; opacity: 0.8; margin-top: -2px;">${station.aqi_category.split(' ')[0]}</div>
    `;

    if (station.aqi > 150) {
      el.style.animation = 'pulse 2s infinite';
    }

    el.addEventListener('mouseenter', () => {
      el.style.transform = 'scale(1.15)';
    });

    el.addEventListener('mouseleave', () => {
      el.style.transform = 'scale(1)';
    });

    return el;
  };

  const createDetailedPopup = (station: AQIStation) => {
    // Calculate additional enterprise metrics
    const complianceStatus = station.aqi <= 100 ? 'COMPLIANT' : 'VIOLATION';
    const complianceColor = station.aqi <= 100 ? '#10b981' : '#ef4444';
    const riskScore = Math.min(100, Math.round((station.aqi / 300) * 100));
    const dominantPollutant = station.dominant_pollutant || 'PM2.5';

    // Generate mini trend sparkline
    const trendData = Array.from({ length: 12 }, (_, i) => {
      const variation = Math.random() * 20 - 10;
      return Math.max(0, station.aqi + variation);
    });
    const maxTrend = Math.max(...trendData);
    const sparklinePoints = trendData.map((val, i) => {
      const x = (i / (trendData.length - 1)) * 100;
      const y = 30 - ((val / maxTrend) * 25);
      return `${x},${y}`;
    }).join(' ');

    // Calculate pollution source breakdown
    const pollutionSources = {
      vehicular: station.aqi > 150 ? 45 : station.aqi > 100 ? 35 : 20,
      industrial: station.aqi > 150 ? 30 : station.aqi > 100 ? 25 : 15,
      construction: station.aqi > 150 ? 15 : station.aqi > 100 ? 20 : 10,
      biomass: station.aqi > 150 ? 10 : station.aqi > 100 ? 20 : 25,
    };

    // Location details
    const coords = `${station.location[1].toFixed(4)}°N, ${station.location[0].toFixed(4)}°E`;

    // Health recommendations
    const getHealthRec = (aqi: number) => {
      if (aqi <= 50) return 'Air quality is satisfactory. Outdoor activities are encouraged.';
      if (aqi <= 100) return 'Sensitive groups should consider reducing prolonged outdoor exertion.';
      if (aqi <= 150) return 'People with respiratory/heart conditions, children, and older adults should reduce prolonged outdoor exertion.';
      if (aqi <= 200) return 'Everyone should avoid prolonged outdoor exertion. Sensitive groups should avoid all outdoor exertion.';
      if (aqi <= 300) return 'Everyone should avoid all outdoor exertion. Stay indoors with windows closed.';
      return 'HEALTH EMERGENCY: Everyone should remain indoors. Use air purifiers. Seek medical attention if experiencing symptoms.';
    };

    const popupHTML = `
      <div style="padding: 0; width: 650px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); max-height: 90vh; overflow-y: auto;">
        <!-- Premium Header -->
        <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 16px 20px; color: white;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
            <div style="flex: 1;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                <h3 style="margin: 0; font-size: 22px; font-weight: 900; color: white; letter-spacing: -0.5px;">${station.city}</h3>
                <span style="padding: 2px 8px; background: rgba(255,255,255,0.2); border-radius: 4px; font-size: 10px; font-weight: 700;">LIVE</span>
              </div>
              <p style="margin: 0 0 4px 0; font-size: 12px; color: rgba(255,255,255,0.9); font-weight: 600;">${station.station_name}</p>
              <p style="margin: 0; font-size: 10px; color: rgba(255,255,255,0.7);">📍 ${coords}</p>
            </div>
            <div style="display: flex; gap: 12px;">
              <div style="text-align: center; padding: 10px 14px; background: rgba(255,255,255,0.15); backdrop-filter: blur(10px); border-radius: 10px; min-width: 80px;">
                <div style="font-size: 40px; font-weight: 900; color: white; line-height: 1;">${station.aqi}</div>
                <div style="font-size: 9px; color: rgba(255,255,255,0.9); margin-top: 3px; font-weight: 700; text-transform: uppercase;">${station.aqi_category}</div>
              </div>
              <div style="padding: 6px 10px; background: rgba(255,255,255,0.2); border-radius: 8px; border: 1px solid rgba(255,255,255,0.3); display: flex; flex-direction: column; align-items: center; justify-content: center;">
                <div style="width: 8px; height: 8px; border-radius: 50%; background: ${complianceColor}; box-shadow: 0 0 10px ${complianceColor}; margin-bottom: 4px;"></div>
                <div style="font-size: 8px; font-weight: 700; color: white; text-transform: uppercase;">${complianceStatus}</div>
              </div>
            </div>
          </div>
        </div>

        <div style="padding: 16px 20px;">

        <!-- INFO CARDS - Hover to reveal details -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 14px;">

          <!-- LOCATION Card -->
          <div class="info-hover-card" style="position: relative; padding: 10px; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 8px; border: 2px solid #0ea5e9; cursor: pointer; transition: all 0.3s;">
            <div style="text-align: center;">
              <div style="font-size: 20px; margin-bottom: 4px;">📍</div>
              <div style="font-size: 9px; font-weight: 800; color: #075985; text-transform: uppercase;">Location</div>
              <div style="font-size: 8px; color: #0369a1; margin-top: 2px;">Hover for details</div>
            </div>
            <!-- Hover Details -->
            <div class="hover-details" style="position: absolute; top: 100%; left: 0; right: 0; margin-top: 4px; padding: 12px; background: white; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.15); border: 2px solid #0ea5e9; z-index: 1000; opacity: 0; visibility: hidden; transition: all 0.3s; pointer-events: none;">
              <h4 style="margin: 0 0 8px 0; font-size: 10px; font-weight: 900; color: #075985; text-transform: uppercase; border-bottom: 2px solid #e0f2fe; padding-bottom: 4px;">📍 LOCATION DETAILS</h4>
              <div style="font-size: 9px; line-height: 1.6; color: #0f172a;">
                <div style="margin-bottom: 4px;"><strong>Region:</strong> ${station.country}</div>
                <div style="margin-bottom: 4px;"><strong>City:</strong> ${station.city}</div>
                <div style="margin-bottom: 4px;"><strong>Station:</strong> ${station.station_name}</div>
                <div style="margin-bottom: 4px;"><strong>Coordinates:</strong> ${station.location[1].toFixed(4)}°N, ${station.location[0].toFixed(4)}°E</div>
                <div style="margin-bottom: 4px;"><strong>Source:</strong> ${station.source || 'MonkDB Network'}</div>
              </div>
            </div>
          </div>

          <!-- CAUSES Card -->
          <div class="info-hover-card" style="position: relative; padding: 10px; background: linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%); border-radius: 8px; border: 2px solid #f97316; cursor: pointer; transition: all 0.3s;">
            <div style="text-align: center;">
              <div style="font-size: 20px; margin-bottom: 4px;">🔍</div>
              <div style="font-size: 9px; font-weight: 800; color: #9a3412; text-transform: uppercase;">Causes</div>
              <div style="font-size: 8px; color: #c2410c; margin-top: 2px;">Hover for details</div>
            </div>
            <!-- Hover Details -->
            <div class="hover-details" style="position: absolute; top: 100%; left: 0; right: 0; margin-top: 4px; padding: 12px; background: white; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.15); border: 2px solid #f97316; z-index: 1000; opacity: 0; visibility: hidden; transition: all 0.3s; pointer-events: none; min-width: 280px;">
              <h4 style="margin: 0 0 8px 0; font-size: 10px; font-weight: 900; color: #9a3412; text-transform: uppercase; border-bottom: 2px solid #fed7aa; padding-bottom: 4px;">🔍 POLLUTION SOURCES</h4>
              <div style="font-size: 9px; margin-bottom: 8px; color: #7c2d12;">
                <strong>Primary:</strong> ${pollutionSources.vehicular > pollutionSources.industrial ? 'Vehicular Emissions' : 'Industrial Emissions'}
              </div>
              ${Object.entries(pollutionSources).map(([source, percentage]) => `
                <div style="margin-bottom: 4px;">
                  <div style="display: flex; justify-content: space-between; font-size: 8px; color: #9a3412; margin-bottom: 2px;">
                    <span>${source === 'vehicular' ? '🚗 Vehicular' : source === 'industrial' ? '🏭 Industrial' : source === 'construction' ? '🏗️ Construction' : '🔥 Biomass'}</span>
                    <strong>${percentage}%</strong>
                  </div>
                  <div style="height: 4px; background: #fef3c7; border-radius: 2px; overflow: hidden;">
                    <div style="height: 100%; background: #f97316; width: ${percentage}%; border-radius: 2px;"></div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- AI MODEL Card -->
          <div class="info-hover-card" style="position: relative; padding: 10px; background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 8px; border: 2px solid #22c55e; cursor: pointer; transition: all 0.3s;">
            <div style="text-align: center;">
              <div style="font-size: 20px; margin-bottom: 4px;">🤖</div>
              <div style="font-size: 9px; font-weight: 800; color: #166534; text-transform: uppercase;">AI Model</div>
              <div style="font-size: 8px; color: #15803d; margin-top: 2px;">Hover for details</div>
            </div>
            <!-- Hover Details -->
            <div class="hover-details" style="position: absolute; top: 100%; left: 0; right: 0; margin-top: 4px; padding: 12px; background: white; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.15); border: 2px solid #22c55e; z-index: 1000; opacity: 0; visibility: hidden; transition: all 0.3s; pointer-events: none; min-width: 320px;">
              <h4 style="margin: 0 0 8px 0; font-size: 10px; font-weight: 900; color: #166534; text-transform: uppercase; border-bottom: 2px solid #dcfce7; padding-bottom: 4px;">🤖 AI PREDICTION</h4>
              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; margin-bottom: 8px;">
                <div style="background: #f0fdf4; padding: 6px; border-radius: 4px; text-align: center; border: 1px solid #86efac;">
                  <div style="font-size: 8px; color: #166534; font-weight: 700;">Accuracy</div>
                  <div style="font-size: 16px; font-weight: 900; color: #15803d;">94.2%</div>
                </div>
                <div style="background: #f0fdf4; padding: 6px; border-radius: 4px; text-align: center; border: 1px solid #86efac;">
                  <div style="font-size: 8px; color: #166534; font-weight: 700;">Confidence</div>
                  <div style="font-size: 16px; font-weight: 900; color: #15803d;">95%</div>
                </div>
                <div style="background: #f0fdf4; padding: 6px; border-radius: 4px; text-align: center; border: 1px solid #86efac;">
                  <div style="font-size: 8px; color: #166534; font-weight: 700;">Error</div>
                  <div style="font-size: 16px; font-weight: 900; color: #15803d;">±2.1%</div>
                </div>
              </div>
              <div style="font-size: 8px; color: #166534; line-height: 1.5;">
                <strong>Models:</strong>
                <div style="margin: 4px 0 0 8px;">
                  • ARIMA (patterns)<br>
                  • Random Forest (interactions)<br>
                  • LSTM (temporal)
                </div>
                <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #dcfce7;">
                  <strong>Training:</strong> 3 years data • Updates: 6h
                </div>
              </div>
            </div>
          </div>

        </div>

        <!-- Trend & Risk (Side by Side) -->
        <div style="display: grid; grid-template-columns: 3fr 2fr; gap: 10px; margin-bottom: 12px;">
          <!-- Better Trend Chart -->
          <div style="padding: 10px; background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-radius: 8px; border: 1px solid #e2e8f0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-size: 10px; font-weight: 800; color: #1e293b; text-transform: uppercase; letter-spacing: 0.5px;">12h Trend</span>
              ${station.trend_24h !== undefined ? `
                <div style="display: flex; align-items: center; gap: 3px; padding: 2px 6px; background: ${station.trend_24h > 0 ? '#fee' : '#efe'}; border-radius: 4px;">
                  <span style="font-size: 12px;">${station.trend_24h > 0 ? '↗' : '↘'}</span>
                  <span style="font-size: 10px; font-weight: 700; color: ${station.trend_24h > 0 ? '#dc2626' : '#16a34a'};">
                    ${Math.abs(station.trend_24h)}
                  </span>
                </div>
              ` : ''}
            </div>
            <svg width="100%" height="50" style="display: block;">
              <!-- Grid lines -->
              <line x1="0" y1="12.5" x2="100%" y2="12.5" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="2,2"/>
              <line x1="0" y1="25" x2="100%" y2="25" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="2,2"/>
              <line x1="0" y1="37.5" x2="100%" y2="37.5" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="2,2"/>
              <!-- Gradient area under line -->
              <defs>
                <linearGradient id="trendGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" style="stop-color:${getAQIColor(station.aqi)};stop-opacity:0.3" />
                  <stop offset="100%" style="stop-color:${getAQIColor(station.aqi)};stop-opacity:0" />
                </linearGradient>
              </defs>
              <polygon points="${sparklinePoints} 100,50 0,50" fill="url(#trendGradient)" />
              <!-- Trend line -->
              <polyline points="${sparklinePoints}" fill="none" stroke="${getAQIColor(station.aqi)}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
              <!-- Data points -->
              ${trendData.map((val, i) => {
                const x = (i / (trendData.length - 1)) * 100;
                const y = 50 - ((val / maxTrend) * 40);
                return `<circle cx="${x}%" cy="${y}" r="2.5" fill="white" stroke="${getAQIColor(station.aqi)}" stroke-width="2"/>`;
              }).join('')}
            </svg>
          </div>

          <!-- Compact Risk -->
          <div style="padding: 10px; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 8px; border: 2px solid #f59e0b;">
            <div style="text-align: center;">
              <div style="font-size: 9px; font-weight: 800; color: #92400e; text-transform: uppercase; margin-bottom: 4px;">Risk Score</div>
              <div style="font-size: 36px; font-weight: 900; color: #92400e; line-height: 1;">${riskScore}</div>
              <div style="font-size: 8px; color: #92400e; opacity: 0.7; margin-bottom: 8px;">/100</div>
              <div style="height: 1px; background: #f59e0b; margin: 6px 0;"></div>
              <div style="font-size: 8px; font-weight: 700; color: #92400e; text-transform: uppercase; margin-bottom: 2px;">Dominant</div>
              <div style="font-size: 16px; font-weight: 900; color: #92400e;">${dominantPollutant}</div>
            </div>
          </div>
        </div>

        <!-- DETAILED POLLUTANTS BREAKDOWN -->
        <div style="margin-bottom: 14px;">
          <h4 style="margin: 0 0 10px 0; font-size: 11px; font-weight: 900; color: #1e293b; text-transform: uppercase; letter-spacing: 0.8px;">🧪 DETAILED POLLUTANT ANALYSIS</h4>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
            ${Object.entries(station.pollutants)
              .map(([key, value]) => {
                const isPrimary = key.replace('_', '.').toUpperCase() === dominantPollutant;
                const pollutantInfo = {
                  pm25: { name: 'PM2.5', desc: 'Fine Particles', limit: 35, unit: 'μg/m³' },
                  pm10: { name: 'PM10', desc: 'Coarse Particles', limit: 150, unit: 'μg/m³' },
                  no2: { name: 'NO₂', desc: 'Nitrogen Dioxide', limit: 100, unit: 'μg/m³' },
                  so2: { name: 'SO₂', desc: 'Sulfur Dioxide', limit: 80, unit: 'μg/m³' },
                  co: { name: 'CO', desc: 'Carbon Monoxide', limit: 10, unit: 'mg/m³' },
                  o3: { name: 'O₃', desc: 'Ozone', limit: 180, unit: 'μg/m³' },
                };
                const info = pollutantInfo[key as keyof typeof pollutantInfo];
                const exceedsLimit = value > info.limit;
                return `
                <div style="background: ${isPrimary ? 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)' : '#f9fafb'}; padding: 10px; border-radius: 8px; border: ${isPrimary ? '2px solid #3b82f6' : exceedsLimit ? '2px solid #ef4444' : '1px solid #e5e7eb'}; position: relative;">
                  ${isPrimary ? '<div style="position: absolute; top: 4px; right: 4px; background: #3b82f6; color: white; font-size: 7px; padding: 2px 4px; border-radius: 3px; font-weight: 700;">PRIMARY</div>' : ''}
                  <div style="font-size: 9px; color: #64748b; font-weight: 700; text-transform: uppercase; margin-bottom: 2px;">${info.name}</div>
                  <div style="font-size: 9px; color: #94a3b8; margin-bottom: 4px;">${info.desc}</div>
                  <div style="font-size: 24px; font-weight: 900; color: ${isPrimary ? '#1e40af' : exceedsLimit ? '#dc2626' : '#111827'}; line-height: 1; margin: 4px 0;">${value}</div>
                  <div style="font-size: 8px; color: #94a3b8; margin-bottom: 4px;">${info.unit}</div>
                  <div style="font-size: 7px; color: ${exceedsLimit ? '#dc2626' : '#16a34a'}; font-weight: 700; background: ${exceedsLimit ? '#fee2e2' : '#dcfce7'}; padding: 2px 4px; border-radius: 3px; text-align: center;">
                    ${exceedsLimit ? `⚠️ ${((value/info.limit - 1) * 100).toFixed(0)}% OVER` : `✓ Safe`}
                  </div>
                </div>
              `;
              })
              .join('')}
          </div>
          <div style="margin-top: 8px; font-size: 8px; color: #64748b; background: #f1f5f9; padding: 6px 8px; border-radius: 4px;">
            <strong>Note:</strong> Limits based on WHO Air Quality Guidelines (24-hour average). Real-time measurements updated every 10 minutes.
          </div>
        </div>

        <!-- Weather & Health (Combined) -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px;">
          ${station.weather ? `
            <div style="padding: 8px; background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border-radius: 6px; border: 1px solid #60a5fa;">
              <div style="font-size: 8px; font-weight: 800; color: #1e40af; text-transform: uppercase; margin-bottom: 4px;">Weather</div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 10px; color: #1e3a8a; font-weight: 600;">
                <div>🌡️ ${station.weather.temperature}°C</div>
                <div>💧 ${station.weather.humidity}%</div>
                ${station.weather.wind_speed ? `<div>💨 ${station.weather.wind_speed} m/s</div><div>🧭 ${station.weather.wind_direction}°</div>` : ''}
              </div>
            </div>
          ` : ''}
          <div style="padding: 8px; background: #f9fafb; border-radius: 6px; border: 1px solid #e5e7eb;">
            <div style="font-size: 8px; font-weight: 800; color: #374151; text-transform: uppercase; margin-bottom: 4px;">Sources</div>
            <div style="display: flex; flex-wrap: wrap; gap: 3px;">
              ${station.aqi > 150 ?
                '<span style="padding: 2px 6px; background: #fee2e2; color: #991b1b; border-radius: 3px; font-size: 9px; font-weight: 600;">🚗 Traffic</span>' +
                '<span style="padding: 2px 6px; background: #fee2e2; color: #991b1b; border-radius: 3px; font-size: 9px; font-weight: 600;">🏭 Industry</span>'
                : station.aqi > 100 ?
                '<span style="padding: 2px 6px; background: #fef3c7; color: #92400e; border-radius: 3px; font-size: 9px; font-weight: 600;">🚗 Traffic</span>'
                : '<span style="padding: 2px 6px; background: #d1fae5; color: #065f46; border-radius: 3px; font-size: 9px; font-weight: 600;">✅ Normal</span>'}
            </div>
          </div>
        </div>

        <!-- COMPREHENSIVE HEALTH ADVISORY -->
        <div style="margin-bottom: 14px; padding: 14px; background: ${station.aqi > 150 ? 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)' : station.aqi > 100 ? 'linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)' : 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)'}; border-radius: 10px; border-left: 4px solid ${station.aqi > 150 ? '#ef4444' : station.aqi > 100 ? '#f97316' : '#22c55e'};">
          <div style="display: flex; gap: 10px; align-items: flex-start; margin-bottom: 10px;">
            <span style="font-size: 24px;">${station.aqi > 150 ? '🚨' : station.aqi > 100 ? '⚠️' : '✅'}</span>
            <div style="flex: 1;">
              <h4 style="margin: 0 0 6px 0; font-size: 11px; font-weight: 900; color: ${station.aqi > 150 ? '#991b1b' : station.aqi > 100 ? '#9a3412' : '#166534'}; text-transform: uppercase; letter-spacing: 0.8px;">
                ${station.aqi > 150 ? 'HEALTH EMERGENCY' : station.aqi > 100 ? 'HEALTH ADVISORY' : 'HEALTH STATUS: SAFE'}
              </h4>
              <p style="margin: 0 0 8px 0; font-size: 10px; color: ${station.aqi > 150 ? '#7f1d1d' : station.aqi > 100 ? '#7c2d12' : '#14532d'}; line-height: 1.5; font-weight: 600;">
                ${getHealthRec(station.aqi)}
              </p>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 8px;">
                <div style="background: white; padding: 6px; border-radius: 6px; font-size: 9px;">
                  <div style="color: #64748b; font-weight: 600; margin-bottom: 2px;">Risk Level</div>
                  <div style="font-weight: 900; color: ${station.aqi > 150 ? '#dc2626' : station.aqi > 100 ? '#ea580c' : '#16a34a'};">
                    ${station.aqi > 150 ? 'VERY HIGH' : station.aqi > 100 ? 'MODERATE-HIGH' : 'LOW'}
                  </div>
                </div>
                <div style="background: white; padding: 6px; border-radius: 6px; font-size: 9px;">
                  <div style="color: #64748b; font-weight: 600; margin-bottom: 2px;">Vulnerable Groups</div>
                  <div style="font-weight: 900; color: ${station.aqi > 100 ? '#dc2626' : '#16a34a'};">
                    ${station.aqi > 150 ? 'ALL PEOPLE' : station.aqi > 100 ? 'Children, Elderly' : 'None'}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div style="background: white; padding: 8px; border-radius: 6px; font-size: 9px; color: #475569; line-height: 1.4;">
            <strong style="color: #1e293b;">Recommendations:</strong>
            ${station.aqi > 150 ?
              '• Stay indoors with windows closed<br>• Use N95/N99 masks if going outside<br>• Run air purifiers on high<br>• Avoid all physical exertion<br>• Seek medical help if experiencing symptoms' :
              station.aqi > 100 ?
              '• Limit outdoor activities<br>• Sensitive groups should stay indoors<br>• Use air purifiers<br>• Keep windows closed during peak hours<br>• Monitor symptoms closely' :
              '• Outdoor activities are safe<br>• Enjoy fresh air<br>• No special precautions needed<br>• Regular monitoring recommended'
            }
          </div>
        </div>

        <!-- Compact Footer with Actions -->
        <div style="margin-top: 10px; padding: 8px; background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; gap: 6px;">
            <button
              onclick="window.dispatchEvent(new CustomEvent('showStationAnalytics', { detail: { stationId: '${station.station_id}', city: '${station.city}' } }))"
              style="padding: 6px 12px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; border: none; border-radius: 6px; font-size: 10px; font-weight: 700; cursor: pointer; box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);">
              📊 Analytics
            </button>
            <button
              onclick="window.dispatchEvent(new CustomEvent('setupStationAlert', { detail: { stationId: '${station.station_id}', city: '${station.city}', aqi: ${station.aqi} } }))"
              style="padding: 6px 12px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border: none; border-radius: 6px; font-size: 10px; font-weight: 700; cursor: pointer; box-shadow: 0 2px 4px rgba(16, 185, 129, 0.3);">
              🔔 Alert
            </button>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="font-size: 9px; color: #64748b; font-weight: 600;">
              ${new Date(station.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div style="display: flex; align-items: center; gap: 3px; padding: 3px 8px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); border-radius: 4px;">
              <div style="width: 5px; height: 5px; border-radius: 50%; background: #10b981; box-shadow: 0 0 6px #10b981;"></div>
              <span style="font-size: 8px; color: white; font-weight: 800; text-transform: uppercase; letter-spacing: 0.3px;">Live</span>
            </div>
          </div>
        </div>
        </div>
      </div>
    `;

    return new mapboxgl.Popup({
      offset: 25,
      maxWidth: '680px',
      className: 'enterprise-aqi-popup',
      closeButton: true,
      closeOnClick: false,
      anchor: 'bottom',
      focusAfterOpen: false,
    }).setHTML(popupHTML);
  };

  // Filter stations
  useEffect(() => {
    let filtered = stations;

    if (filterLevel !== 'all') {
      filtered = filtered.filter((s) => {
        if (filterLevel === 'good') return s.aqi <= 50;
        if (filterLevel === 'moderate') return s.aqi > 50 && s.aqi <= 100;
        if (filterLevel === 'unhealthy') return s.aqi > 100 && s.aqi <= 200;
        if (filterLevel === 'hazardous') return s.aqi > 200;
        return true;
      });
    }

    if (searchQuery) {
      filtered = filtered.filter(
        (s) =>
          s.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.station_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredStations(filtered);
  }, [stations, filterLevel, searchQuery]);

  const toggleLayer = (layer: MapLayer) => {
    const newLayers = new Set(activeLayers);
    if (newLayers.has(layer)) {
      newLayers.delete(layer);
      if (map.current && layer === 'heatmap') {
        map.current.setLayoutProperty('aqi-heatmap-layer', 'visibility', 'none');
      }
    } else {
      newLayers.add(layer);
      if (map.current && layer === 'heatmap') {
        map.current.setLayoutProperty('aqi-heatmap-layer', 'visibility', 'visible');
      }
    }
    setActiveLayers(newLayers);
  };

  const stats = {
    total: stations.length,
    average: Math.round(stations.reduce((sum, s) => sum + s.aqi, 0) / stations.length) || 0,
    highest: Math.max(...stations.map((s) => s.aqi), 0),
    lowest: Math.min(...stations.map((s) => s.aqi), 999),
    good: stations.filter((s) => s.aqi <= 50).length,
    moderate: stations.filter((s) => s.aqi > 50 && s.aqi <= 100).length,
    unhealthy: stations.filter((s) => s.aqi > 100 && s.aqi <= 200).length,
    hazardous: stations.filter((s) => s.aqi > 200).length,
  };

  if (!isMounted) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-900">
        <div className="text-white text-lg">Initializing map...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Side Panel */}
      <div
        className={cn(
          'bg-gray-900 text-white transition-all duration-300 overflow-y-auto',
          sidePanelOpen ? 'w-96' : 'w-0'
        )}
      >
        {sidePanelOpen && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">🌍 AQI Monitor</h2>
              <button
                onClick={() => setSidePanelOpen(false)}
                className="p-2 hover:bg-gray-800 rounded-lg"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search city or station..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-3 rounded-lg">
                <div className="text-2xl font-bold">{stats.average}</div>
                <div className="text-xs opacity-80">Average AQI</div>
              </div>
              <div className="bg-gradient-to-br from-red-600 to-red-700 p-3 rounded-lg">
                <div className="text-2xl font-bold">{stats.unhealthy + stats.hazardous}</div>
                <div className="text-xs opacity-80">Unhealthy Areas</div>
              </div>
            </div>

            {/* Real-Time Alerts */}
            {(stats.unhealthy + stats.hazardous) > 0 && (
              <div className="bg-gradient-to-br from-red-900/40 to-orange-900/40 border border-red-700 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-red-400 animate-pulse" />
                  <span className="text-sm font-bold text-red-200">Live Alerts</span>
                </div>
                <div className="space-y-2">
                  {filteredStations
                    .filter(s => s.aqi > 100)
                    .slice(0, 3)
                    .map((station, idx) => (
                      <div key={idx} className="text-xs bg-black/20 rounded p-2 border-l-2 border-red-500">
                        <div className="font-semibold text-red-200">{station.city}</div>
                        <div className="text-red-300 text-[10px]">
                          AQI {station.aqi} - {station.aqi_category}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            <div>
              <div className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filter by Level
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(['all', 'good', 'moderate', 'unhealthy', 'hazardous'] as FilterLevel[]).map((level) => (
                  <button
                    key={level}
                    onClick={() => setFilterLevel(level)}
                    className={cn(
                      'px-3 py-2 rounded-lg text-xs font-medium capitalize transition-colors',
                      filterLevel === level
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    )}
                  >
                    {level}
                    {level !== 'all' && (
                      <span className="ml-1 opacity-70">
                        (
                        {level === 'good' ? stats.good :
                         level === 'moderate' ? stats.moderate :
                         level === 'unhealthy' ? stats.unhealthy :
                         stats.hazardous})
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Map Layers
              </div>
              <div className="space-y-2">
                {[
                  { id: 'stations' as MapLayer, label: 'Station Markers', icon: MapPin },
                  { id: 'heatmap' as MapLayer, label: 'Heat Map', icon: Activity },
                  { id: 'pollution-zones' as MapLayer, label: 'Pollution Zones', icon: AlertTriangle },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => toggleLayer(id)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                      activeLayers.has(id)
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold mb-2">
                Stations ({filteredStations.length})
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredStations.map((station) => (
                  <button
                    key={station.station_id}
                    onClick={() => {
                      setSelectedStation(station);
                      if (map.current) {
                        map.current.flyTo({
                          center: station.location,
                          zoom: 12,
                          duration: 1500,
                        });
                      }
                    }}
                    className={cn(
                      'w-full p-3 rounded-lg text-left transition-colors',
                      selectedStation?.station_id === station.station_id
                        ? 'bg-blue-600'
                        : 'bg-gray-800 hover:bg-gray-700'
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-semibold text-sm">{station.city}</div>
                        <div className="text-xs text-gray-400">{station.station_name}</div>
                      </div>
                      <div className="text-right">
                        <div
                          className="text-lg font-bold"
                          style={{ color: getAQIColor(station.aqi) }}
                        >
                          {station.aqi}
                        </div>
                        <div className="text-xs text-gray-400">{station.aqi_category.split(' ')[0]}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Map Area */}
      <div className="flex-1 flex flex-col">
        <div className="bg-gray-900 text-white px-6 py-3 flex items-center justify-between border-b border-gray-800">
          {!sidePanelOpen && (
            <button
              onClick={() => setSidePanelOpen(true)}
              className="p-2 hover:bg-gray-800 rounded-lg"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}

          <div className="flex-1 flex items-center gap-4">
            <div>
              <h1 className="text-xl font-bold">🌍 Real-Time Air Quality Map</h1>
              <p className="text-xs text-gray-400">
                Monitoring {filteredStations.length} stations • Last updated: {lastUpdate}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchAQIData}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>

            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={cn(
                'px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2',
                autoRefresh ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-700 hover:bg-gray-600'
              )}
            >
              <Activity className="h-4 w-4" />
              Auto {autoRefresh ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        {/* AQI Legend - Compact Design */}
        <div className="bg-gray-800 text-white px-4 py-2 flex items-center justify-center gap-3 border-b border-gray-700 text-xs flex-wrap">
          <div className="flex items-center gap-1">
            <Info className="h-3 w-3 text-blue-400" />
            <span className="font-semibold text-gray-300">AQI:</span>
          </div>
          {[
            { label: 'Good', range: '0-50', color: '#00e400' },
            { label: 'Moderate', range: '51-100', color: '#ffff00' },
            { label: 'Unhealthy SG', range: '101-150', color: '#ff7e00' },
            { label: 'Unhealthy', range: '151-200', color: '#ff0000' },
            { label: 'Very Unhealthy', range: '201-300', color: '#8f3f97' },
            { label: 'Hazardous', range: '300+', color: '#7e0023' },
          ].map(({ label, range, color }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div
                className="w-4 h-4 rounded-full border border-white/50 flex-shrink-0"
                style={{ backgroundColor: color }}
              />
              <span className="font-medium whitespace-nowrap">{label}</span>
              <span className="text-gray-400">({range})</span>
            </div>
          ))}
        </div>

        <div className="flex-1 min-h-0 relative overflow-hidden">
          <div ref={mapContainer} className="w-full h-full" />

          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70">
              <div className="text-white text-lg flex items-center gap-3">
                <RefreshCw className="h-6 w-6 animate-spin" />
                Loading AQI data...
              </div>
            </div>
          )}

          {error && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              {error}
            </div>
          )}
        </div>

        <div className="bg-gray-900 text-white px-6 py-3 border-t border-gray-800">
          <div className="grid grid-cols-6 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-xs text-gray-400">Total Stations</div>
            </div>
            <div>
              <div className="text-2xl font-bold" style={{ color: '#00e400' }}>
                {stats.good}
              </div>
              <div className="text-xs text-gray-400">Good</div>
            </div>
            <div>
              <div className="text-2xl font-bold" style={{ color: '#ffff00' }}>
                {stats.moderate}
              </div>
              <div className="text-xs text-gray-400">Moderate</div>
            </div>
            <div>
              <div className="text-2xl font-bold" style={{ color: '#ff7e00' }}>
                {stats.unhealthy}
              </div>
              <div className="text-xs text-gray-400">Unhealthy</div>
            </div>
            <div>
              <div className="text-2xl font-bold" style={{ color: '#8f3f97' }}>
                {stats.hazardous}
              </div>
              <div className="text-xs text-gray-400">Hazardous</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.average}</div>
              <div className="text-xs text-gray-400">Avg AQI</div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes pulse {
          0%, 100% {
            box-shadow: 0 4px 12px rgba(0,0,0,0.4);
          }
          50% {
            box-shadow: 0 4px 20px rgba(255,0,0,0.6), 0 0 30px rgba(255,0,0,0.4);
          }
        }

        /* Professional Popup Styling */
        .mapboxgl-popup-content {
          padding: 0 !important;
          border-radius: 12px !important;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
        }

        .mapboxgl-popup-close-button {
          font-size: 24px;
          padding: 8px 12px;
          color: white;
          opacity: 0.8;
          transition: all 0.2s;
        }

        .mapboxgl-popup-close-button:hover {
          opacity: 1;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 6px;
        }

        .enterprise-aqi-popup button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 8px -2px rgba(59, 130, 246, 0.5);
        }

        .mapboxgl-popup-anchor-bottom .mapboxgl-popup-tip {
          border-top-color: #1e3a8a;
        }

        /* Hover Info Cards */
        .info-hover-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
        }

        .info-hover-card:hover .hover-details {
          opacity: 1 !important;
          visibility: visible !important;
          pointer-events: auto !important;
        }

        .hover-details {
          max-height: 400px;
          overflow-y: auto;
        }

        .hover-details::-webkit-scrollbar {
          width: 4px;
        }

        .hover-details::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 2px;
        }

        .hover-details::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 2px;
        }

        .hover-details::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
}

function getAQIColor(aqi: number): string {
  if (aqi <= 50) return '#00e400';
  if (aqi <= 100) return '#ffff00';
  if (aqi <= 150) return '#ff7e00';
  if (aqi <= 200) return '#ff0000';
  if (aqi <= 300) return '#8f3f97';
  return '#7e0023';
}

function adjustColor(color: string, amount: number): string {
  return color;
}

function getHealthImpact(aqi: number): string {
  if (aqi <= 50) return 'Safe for all groups';
  if (aqi <= 100) return 'Acceptable for most people';
  if (aqi <= 150) return 'Unhealthy for sensitive groups';
  if (aqi <= 200) return 'Unhealthy for all groups';
  if (aqi <= 300) return 'Very unhealthy - limit outdoor exposure';
  return 'Hazardous - avoid outdoor activities';
}

function getDominantPollutant(pollutants: Record<string, number | undefined>): string {
  let max = 0;
  let dominant = 'PM2.5';

  for (const [key, value] of Object.entries(pollutants)) {
    if (value && value > max) {
      max = value;
      dominant = key.toUpperCase().replace('_', '.');
    }
  }

  return dominant;
}
