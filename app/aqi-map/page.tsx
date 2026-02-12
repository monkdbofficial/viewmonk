'use client';

import { useEffect, useState, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { generateEnhancedPopupHTML } from '../components/aqi/EnhancedAQIPopup';
import AQITrendModal from '../components/aqi/AQITrendModal';

// Mapbox access token from environment
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

interface AQIStation {
  station_id: string;
  station_name: string;
  location: [number, number]; // [lon, lat]
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
  };
  timestamp: number;
  source: string;
}

interface AQIResponse {
  success: boolean;
  count: number;
  stations: AQIStation[];
  updated_at: string;
}

export default function AQIMapPage() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [stations, setStations] = useState<AQIStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [modalStation, setModalStation] = useState<{
    stationId: string;
    stationName: string;
    city: string;
  } | null>(null);

  // Fetch AQI data
  const fetchAQIData = async () => {
    try {
      const response = await fetch('/api/aqi/current');
      const data: AQIResponse = await response.json();

      if (data.success) {
        setStations(data.stations);
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

  // Event listener for trend button clicks from popup
  useEffect(() => {
    const handleOpenModal = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { stationId, stationName, city } = customEvent.detail;
      setModalStation({ stationId, stationName, city });
    };

    window.addEventListener('openTrendModal', handleOpenModal);

    return () => {
      window.removeEventListener('openTrendModal', handleOpenModal);
    };
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [78.9629, 20.5937], // Center of India
      zoom: 4,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Fetch initial data
    fetchAQIData();

    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchAQIData, 5 * 60 * 1000);

    return () => {
      clearInterval(interval);
      map.current?.remove();
    };
  }, []);

  // Update markers when stations change
  useEffect(() => {
    if (!map.current || !stations.length) return;

    // Remove existing markers
    const existingMarkers = document.querySelectorAll('.aqi-marker');
    existingMarkers.forEach((marker) => marker.remove());

    // Add new markers
    stations.forEach((station) => {
      const color = getAQIColor(station.aqi);

      // Create marker element
      const el = document.createElement('div');
      el.className = 'aqi-marker';
      el.style.cssText = `
        background-color: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 2px solid white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 11px;
        color: ${station.aqi > 150 ? 'white' : 'black'};
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      `;
      el.textContent = String(station.aqi);

      // Create enhanced popup
      const popupHTML = generateEnhancedPopupHTML({
        city: station.city,
        stationName: station.station_name,
        stationId: station.station_id,
        aqi: station.aqi,
        aqiCategory: station.aqi_category,
        pollutants: station.pollutants,
        weather: station.weather,
        timestamp: station.timestamp,
        source: station.source,
      });

      const popup = new mapboxgl.Popup({
        offset: 25,
        maxWidth: '340px',
      }).setHTML(popupHTML);

      // Add marker to map
      new mapboxgl.Marker(el)
        .setLngLat(station.location)
        .setPopup(popup)
        .addTo(map.current!);
    });
  }, [stations]);

  return (
    <div className="flex flex-col h-screen w-full">
      {/* Header */}
      <div className="bg-gray-900 text-white p-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">🌍 Live Air Quality Index (AQI)</h1>
          <p className="text-sm text-gray-400">Real-time air quality data across India</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-400">Monitoring {stations.length} stations</div>
          {lastUpdate && <div className="text-xs text-gray-500">Updated: {lastUpdate}</div>}
        </div>
      </div>

      {/* Legend */}
      <div className="bg-gray-800 text-white p-2 flex items-center justify-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#00e400' }}></div>
          <span>Good (0-50)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#ffff00' }}></div>
          <span>Moderate (51-100)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#ff7e00' }}></div>
          <span>Unhealthy SG (101-150)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#ff0000' }}></div>
          <span>Unhealthy (151-200)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#8f3f97' }}></div>
          <span>Very Unhealthy (201-300)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#7e0023' }}></div>
          <span>Hazardous (300+)</span>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative w-full" style={{ minHeight: '400px' }}>
        <div ref={mapContainer} className="absolute inset-0 w-full h-full" />

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <div className="text-white text-lg">Loading AQI data...</div>
          </div>
        )}

        {error && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded">
            Error: {error}
          </div>
        )}
      </div>

      {/* Stats Bar */}
      <div className="bg-gray-900 text-white p-4 flex justify-around text-center">
        {stations.length > 0 && (
          <>
            <div>
              <div className="text-2xl font-bold">{Math.round(stations.reduce((sum, s) => sum + s.aqi, 0) / stations.length)}</div>
              <div className="text-xs text-gray-400">Average AQI</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{Math.max(...stations.map(s => s.aqi))}</div>
              <div className="text-xs text-gray-400">Highest AQI</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{Math.min(...stations.map(s => s.aqi))}</div>
              <div className="text-xs text-gray-400">Lowest AQI</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{stations.filter(s => s.aqi > 150).length}</div>
              <div className="text-xs text-gray-400">Unhealthy Stations</div>
            </div>
          </>
        )}
      </div>

      {/* Trend Modal */}
      {modalStation && (
        <AQITrendModal
          stationId={modalStation.stationId}
          stationName={modalStation.stationName}
          city={modalStation.city}
          onClose={() => setModalStation(null)}
        />
      )}
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
