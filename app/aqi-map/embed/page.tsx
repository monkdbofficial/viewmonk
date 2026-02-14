'use client';

import { useEffect, useState, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import AQITrendModal from '../../components/aqi/AQITrendModal';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

export default function AQIMapEmbedPage() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [stations, setStations] = useState<any[]>([]);
  const [modalStation, setModalStation] = useState<{
    stationId: string;
    stationName: string;
    city: string;
  } | null>(null);

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

  // Handle trend button clicks
  useEffect(() => {
    const handleOpenModal = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { stationId, stationName, city } = customEvent.detail;
      setModalStation({ stationId, stationName, city });
    };

    window.addEventListener('openTrendModal', handleOpenModal);
    return () => window.removeEventListener('openTrendModal', handleOpenModal);
  }, []);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [78.9629, 20.5937],
      zoom: 4,
    });

    fetchAQIData();
    const interval = setInterval(fetchAQIData, 5 * 60 * 1000);

    return () => {
      clearInterval(interval);
      map.current?.remove();
    };
  }, []);

  useEffect(() => {
    if (!map.current || stations.length === 0) return;

    const markers = document.querySelectorAll('.mapboxgl-marker');
    markers.forEach(marker => marker.remove());

    stations.forEach((station: any) => {
      const getAQIColor = (aqi: number) => {
        if (aqi <= 50) return '#10b981';
        if (aqi <= 100) return '#eab308';
        if (aqi <= 150) return '#f97316';
        if (aqi <= 200) return '#ef4444';
        if (aqi <= 300) return '#a855f7';
        return '#7e1946';
      };

      const el = document.createElement('div');
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
        <div style="padding: 12px; background: white; border-radius: 8px; min-width: 220px;">
          <h3 style="font-weight: bold; margin-bottom: 8px; color: #1f2937; font-size: 14px;">${station.station_name}</h3>
          <p style="font-size: 12px; margin-bottom: 8px; color: #6b7280;">${station.city}, ${station.country}</p>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
            <span style="font-size: 32px; font-weight: bold; color: ${getAQIColor(station.aqi)};">
              ${Math.round(station.aqi)}
            </span>
            <span style="font-size: 12px; color: #6b7280;">AQI</span>
          </div>
          <div style="margin-bottom: 12px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
            <span style="font-size: 11px; font-weight: 600; color: ${getAQIColor(station.aqi)};">
              ${station.aqi_category}
            </span>
          </div>
          <button
            onclick="window.dispatchEvent(new CustomEvent('openTrendModal', { detail: { stationId: '${station.station_id}', stationName: '${station.station_name}', city: '${station.city}' } }))"
            style="width: 100%; padding: 8px 12px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;">
            📊 View Trend
          </button>
        </div>
      `);

      new mapboxgl.Marker(el)
        .setLngLat(station.location)
        .setPopup(popup)
        .addTo(map.current!);
    });
  }, [stations]);

  return (
    <>
      <div ref={mapContainer} style={{ width: '100%', height: '100vh' }} />

      {/* Trend Modal */}
      {modalStation && (
        <AQITrendModal
          onClose={() => setModalStation(null)}
          stationId={modalStation.stationId}
          stationName={modalStation.stationName}
          city={modalStation.city}
        />
      )}
    </>
  );
}
