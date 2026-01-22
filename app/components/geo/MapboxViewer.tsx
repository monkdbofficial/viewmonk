'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { geospatialConfig } from '@/app/config/geospatial.config';

// Set your Mapbox access token here
// Get one from: https://account.mapbox.com/
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw'; // Demo token

interface GeoPoint {
  id: string;
  coordinates: [number, number]; // [longitude, latitude]
  properties?: Record<string, any>;
}

interface GeoShape {
  id: string;
  type: 'Polygon' | 'LineString' | 'MultiPolygon';
  coordinates: any;
  properties?: Record<string, any>;
}

interface MapboxViewerProps {
  geoPoints?: GeoPoint[];
  geoShapes?: GeoShape[];
  onMapClick?: (lat: number, lng: number) => void;
  onDrawComplete?: (geometry: any) => void;
  center?: [number, number];
  zoom?: number;
  height?: string;
}

export default function MapboxViewer({
  geoPoints = [],
  geoShapes = [],
  onMapClick,
  onDrawComplete,
  center = [0, 0], // [lng, lat] - Will be set by parent component
  zoom = 2,
  height = '600px'
}: MapboxViewerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Create map
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: `mapbox://styles/mapbox/${geospatialConfig.map.mapbox.defaultStyle}`,
      center: [center[0], center[1]], // Mapbox uses [lng, lat]
      zoom: zoom,
      maxZoom: geospatialConfig.map.maxZoom,
      minZoom: geospatialConfig.map.minZoom,
      attributionControl: true
    });

    // Add navigation controls (if enabled in config)
    if (geospatialConfig.map.mapbox.showNavigationControl) {
      map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    }

    // Add fullscreen control (if enabled in config)
    if (geospatialConfig.map.mapbox.showFullscreenControl) {
      map.addControl(new mapboxgl.FullscreenControl(), 'top-right');
    }

    // Add scale control (if enabled in config)
    if (geospatialConfig.map.mapbox.showScaleControl) {
      map.addControl(new mapboxgl.ScaleControl({
        maxWidth: 100,
        unit: 'metric'
      }), 'bottom-left');
    }

    // Handle map click
    if (onMapClick) {
      map.on('click', (e) => {
        onMapClick(e.lngLat.lat, e.lngLat.lng);
      });
    }

    // Wait for map to load
    map.on('load', () => {
      setMapLoaded(true);
    });

    mapRef.current = map;

    return () => {
      map.remove();
    };
  }, []);

  // Update center and zoom
  useEffect(() => {
    if (mapRef.current && mapLoaded) {
      mapRef.current.flyTo({
        center: [center[0], center[1]],
        zoom: zoom,
        essential: true
      });
    }
  }, [center, zoom, mapLoaded]);

  // Add markers for geoPoints
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add new markers
    geoPoints.forEach((point) => {
      const [lng, lat] = point.coordinates;

      // Create popup content
      const popupContent = document.createElement('div');
      popupContent.className = 'mapbox-popup-content';

      if (point.properties) {
        const content = Object.entries(point.properties)
          .map(([key, value]) => `<div class="flex justify-between gap-4 py-1">
            <span class="font-semibold text-gray-700 dark:text-gray-300">${key}:</span>
            <span class="text-gray-900 dark:text-white">${value}</span>
          </div>`)
          .join('');
        popupContent.innerHTML = `<div class="space-y-1">${content}</div>`;
      } else {
        popupContent.innerHTML = `<div class="text-sm text-gray-700 dark:text-gray-300">Point: ${point.id}</div>`;
      }

      // Create popup
      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: true,
        closeOnClick: false
      }).setDOMContent(popupContent);

      // Create marker
      const marker = new mapboxgl.Marker({
        color: geospatialConfig.map.mapbox.markerColor
      })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(mapRef.current!);

      markersRef.current.push(marker);
    });

    // Fit bounds if there are points
    if (geoPoints.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      geoPoints.forEach(point => {
        bounds.extend([point.coordinates[0], point.coordinates[1]]);
      });
      mapRef.current.fitBounds(bounds, {
        padding: 50,
        maxZoom: 15
      });
    }
  }, [geoPoints, mapLoaded]);

  // Add shapes (polygons, lines)
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    // Remove existing shape layers
    if (mapRef.current.getLayer('shapes-fill')) {
      mapRef.current.removeLayer('shapes-fill');
    }
    if (mapRef.current.getLayer('shapes-outline')) {
      mapRef.current.removeLayer('shapes-outline');
    }
    if (mapRef.current.getSource('shapes')) {
      mapRef.current.removeSource('shapes');
    }

    if (geoShapes.length === 0) return;

    // Create GeoJSON features
    const features = geoShapes.map(shape => ({
      type: 'Feature' as const,
      geometry: {
        type: shape.type,
        coordinates: shape.coordinates
      },
      properties: shape.properties || {}
    }));

    // Add source
    mapRef.current.addSource('shapes', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: features
      }
    });

    // Add fill layer
    mapRef.current.addLayer({
      id: 'shapes-fill',
      type: 'fill',
      source: 'shapes',
      paint: {
        'fill-color': geospatialConfig.map.mapbox.shapeColor,
        'fill-opacity': geospatialConfig.map.mapbox.shapeOpacity
      },
      filter: ['==', '$type', 'Polygon']
    });

    // Add outline layer
    mapRef.current.addLayer({
      id: 'shapes-outline',
      type: 'line',
      source: 'shapes',
      paint: {
        'line-color': geospatialConfig.map.mapbox.shapeColor,
        'line-width': 2
      }
    });
  }, [geoShapes, mapLoaded]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg">
      <div
        ref={mapContainerRef}
        style={{ height: height }}
        className="w-full"
      />

      {/* Map Style Selector */}
      {geospatialConfig.map.mapbox.showStyleSwitcher && (
        <div className="absolute left-3 top-3 z-10">
          <select
            defaultValue={geospatialConfig.map.mapbox.defaultStyle}
            onChange={(e) => {
              if (mapRef.current) {
                mapRef.current.setStyle(`mapbox://styles/mapbox/${e.target.value}`);
              }
            }}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-lg dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          >
            <option value="streets-v12">Streets</option>
            <option value="satellite-v9">Satellite</option>
            <option value="satellite-streets-v12">Satellite Streets</option>
            <option value="light-v11">Light</option>
            <option value="dark-v11">Dark</option>
            <option value="outdoors-v12">Outdoors</option>
          </select>
        </div>
      )}

      {/* Legend */}
      {(geoPoints.length > 0 || geoShapes.length > 0) && (
        <div className="absolute bottom-10 right-3 z-10 rounded-lg border border-gray-300 bg-white p-3 shadow-lg dark:border-gray-600 dark:bg-gray-800">
          <h3 className="mb-2 text-xs font-semibold text-gray-900 dark:text-white">
            Legend
          </h3>
          <div className="space-y-2 text-xs">
            {geoPoints.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                <span className="text-gray-700 dark:text-gray-300">
                  Points ({geoPoints.length})
                </span>
              </div>
            )}
            {geoShapes.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 border-2 border-blue-500 bg-blue-500/30"></div>
                <span className="text-gray-700 dark:text-gray-300">
                  Shapes ({geoShapes.length})
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Loading indicator */}
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-900">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 dark:border-gray-600 dark:border-t-blue-400"></div>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Loading Mapbox...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
