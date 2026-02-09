'use client';

import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Layers } from 'lucide-react';

// Fix for default marker icons in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface GeoPoint {
  id: string;
  coordinates: [number, number];
  properties?: Record<string, any>;
}

interface GeoShape {
  id: string;
  type: 'Polygon' | 'LineString' | 'MultiPolygon';
  coordinates: any;
  properties?: Record<string, any>;
}

interface LeafletMapViewerProps {
  geoPoints?: GeoPoint[];
  geoShapes?: GeoShape[];
  onMapClick?: (lat: number, lng: number) => void;
  onDrawComplete?: (geometry: unknown) => void;
  center?: [number, number];
  zoom?: number;
  height?: string;
}

// Map controller component
function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);

  return null;
}

// Map click handler component
function MapClickHandler({ onClick }: { onClick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (onClick) {
        onClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

export default function LeafletMapViewer({
  geoPoints = [],
  geoShapes = [],
  onMapClick,
  center = [0, 0],
  zoom = 2,
  height = '600px'
}: LeafletMapViewerProps) {
  const mapRef = useRef<L.Map | null>(null);
  const [mapStyle, setMapStyle] = useState<'streets' | 'satellite' | 'topo'>('streets');

  // Tile layer URLs (free, no API key needed!)
  const tileLayers = {
    streets: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    },
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Tiles &copy; Esri'
    },
    topo: {
      url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>'
    }
  };

  return (
    <div className="relative" style={{ height }}>
      {/* Map Style Selector */}
      <div className="absolute top-4 right-4 z-[1000] flex gap-2">
          <button
            onClick={() => setMapStyle('streets')}
            className={`px-3 py-2 rounded-lg text-sm font-medium shadow-lg transition-all ${
              mapStyle === 'streets'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            Streets
          </button>
          <button
            onClick={() => setMapStyle('satellite')}
            className={`px-3 py-2 rounded-lg text-sm font-medium shadow-lg transition-all ${
              mapStyle === 'satellite'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            Satellite
          </button>
          <button
            onClick={() => setMapStyle('topo')}
            className={`px-3 py-2 rounded-lg text-sm font-medium shadow-lg transition-all ${
              mapStyle === 'topo'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            Topographic
          </button>
        </div>

      {/* Info Banner */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-lg">
        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
          <Layers className="w-4 h-4" />
          <span>
            {geoPoints.length} points • Powered by OpenStreetMap (No API key needed!)
          </span>
        </div>
      </div>

      {/* Map Container */}
      <MapContainer
        center={[center[1], center[0]]} // Leaflet uses [lat, lng]
        zoom={zoom}
        style={{ height: '100%', width: '100%', borderRadius: '0.5rem' }}
        ref={mapRef as L.Map}
        zoomControl={true}
        scrollWheelZoom={true}
      >
        {/* Tile Layer */}
        <TileLayer
          url={tileLayers[mapStyle].url}
          attribution={tileLayers[mapStyle].attribution}
        />

        {/* Map Controller */}
        <MapController center={[center[1], center[0]]} zoom={zoom} />

        {/* Map Click Handler */}
        <MapClickHandler onClick={onMapClick} />

        {/* Render Points */}
        {geoPoints.map((point) => {
          const [lng, lat] = point.coordinates;
          return (
            <Marker key={point.id} position={[lat, lng]}>
              <Popup>
                <div className="text-sm">
                  <strong>{point.properties?.name || 'Point'}</strong>
                  {point.properties && (
                    <div className="mt-2 space-y-1">
                      {Object.entries(point.properties).map(([key, value]) => (
                        key !== 'name' && (
                          <div key={key} className="text-xs">
                            <span className="font-semibold">{key}:</span> {String(value)}
                          </div>
                        )
                      ))}
                    </div>
                  )}
                  <div className="mt-2 text-xs text-gray-500">
                    {lat.toFixed(6)}, {lng.toFixed(6)}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Render Shapes (Circles for now) */}
        {geoShapes.map((shape) => {
          if (shape.type === 'Polygon' && shape.coordinates?.[0]?.[0]) {
            const [lng, lat] = shape.coordinates[0][0];
            return (
              <Circle
                key={shape.id}
                center={[lat, lng]}
                radius={1000}
                pathOptions={{ color: 'blue', fillColor: 'blue', fillOpacity: 0.3 }}
              >
                <Popup>
                  <div className="text-sm">
                    <strong>{shape.properties?.name || 'Shape'}</strong>
                  </div>
                </Popup>
              </Circle>
            );
          }
          return null;
        })}
      </MapContainer>
    </div>
  );
}
