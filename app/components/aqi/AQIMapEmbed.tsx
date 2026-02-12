'use client';

import { useEffect, useState, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

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
  timestamp: number;
}

function getAQIColor(aqi: number): string {
  if (aqi <= 50) return '#10b981'; // Good
  if (aqi <= 100) return '#eab308'; // Moderate
  if (aqi <= 150) return '#f97316'; // Unhealthy for Sensitive
  if (aqi <= 200) return '#ef4444'; // Unhealthy
  if (aqi <= 300) return '#a855f7'; // Very Unhealthy
  return '#7e1946'; // Hazardous
}

export default function AQIMapEmbed() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [stations, setStations] = useState<AQIStation[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Fetch AQI data
  const fetchAQIData = async () => {
    try {
      const response = await fetch('/api/aqi/current');
      const data = await response.json();
      if (data.success) {
        setStations(data.stations);
      }
    } catch (err) {
      console.error('Failed to fetch AQI data:', err);
    }
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    if (!MAPBOX_TOKEN) {
      setError('Mapbox token not configured');
      return;
    }

    try {
      mapboxgl.accessToken = MAPBOX_TOKEN;

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [78.9629, 20.5937], // India center
        zoom: 4,
      });

      map.current.on('error', (e) => {
        console.error('Map error:', e);
        setError('Failed to load map');
      });

      fetchAQIData();
      const interval = setInterval(fetchAQIData, 5 * 60 * 1000);

      return () => {
        clearInterval(interval);
        map.current?.remove();
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize map');
    }
  }, []);

  // Add markers when stations update
  useEffect(() => {
    if (!map.current || stations.length === 0) return;

    // Clear existing markers
    const markers = document.querySelectorAll('.mapboxgl-marker');
    markers.forEach(marker => marker.remove());

    // Add new markers
    stations.forEach(station => {
      const el = document.createElement('div');
      el.className = 'aqi-marker';
      el.style.backgroundColor = getAQIColor(station.aqi);
      el.style.width = '40px';
      el.style.height = '40px';
      el.style.borderRadius = '50%';
      el.style.border = '3px solid white';
      el.style.cursor = 'pointer';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.fontWeight = 'bold';
      el.style.fontSize = '12px';
      el.style.color = 'white';
      el.textContent = String(Math.round(station.aqi));

      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div style="padding: 12px; min-width: 200px;">
          <h3 style="font-weight: bold; margin-bottom: 8px;">${station.station_name}</h3>
          <p style="font-size: 12px; color: #666; margin-bottom: 8px;">${station.city}, ${station.country}</p>
          <div style="margin-bottom: 8px;">
            <span style="font-size: 24px; font-weight: bold; color: ${getAQIColor(station.aqi)};">${Math.round(station.aqi)}</span>
            <span style="font-size: 12px; color: #666; margin-left: 8px;">${station.aqi_category}</span>
          </div>
          ${Object.entries(station.pollutants || {})
            .filter(([_, value]) => value != null)
            .map(([key, value]) => `
              <div style="font-size: 11px; margin-top: 4px;">
                <span style="color: #666;">${key.toUpperCase()}:</span>
                <span style="font-weight: 600; margin-left: 4px;">${value?.toFixed(1)}</span>
              </div>
            `).join('')}
        </div>
      `);

      new mapboxgl.Marker(el)
        .setLngLat(station.location)
        .setPopup(popup)
        .addTo(map.current!);
    });
  }, [stations]);

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return <div ref={mapContainer} className="h-full w-full" />;
}
