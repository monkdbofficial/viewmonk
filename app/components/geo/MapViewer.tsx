'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
}

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

interface MapViewerProps {
  geoPoints?: GeoPoint[];
  geoShapes?: GeoShape[];
  onMapClick?: (lat: number, lng: number) => void;
  onDrawComplete?: (geometry: any) => void;
  center?: [number, number];
  zoom?: number;
  height?: string;
}

export default function MapViewer({
  geoPoints = [],
  geoShapes = [],
  onMapClick,
  onDrawComplete,
  center = [0, 0],
  zoom = 2,
  height = '600px'
}: MapViewerProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [drawMode, setDrawMode] = useState<'none' | 'point' | 'circle' | 'polygon'>('none');
  const [selectedLayer, setSelectedLayer] = useState<string>('streets');
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null);
  const [currentCoords, setCurrentCoords] = useState<[number, number] | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center,
      zoom,
      zoomControl: true,
    });

    mapRef.current = map;
    drawnItemsRef.current = new L.FeatureGroup();
    map.addLayer(drawnItemsRef.current);

    // Add tile layer
    const tileLayers: Record<string, L.TileLayer> = {
      streets: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        className: 'map-tiles',
      }),
      satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri',
        className: 'map-tiles',
      }),
      dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        className: 'map-tiles',
      }),
    };

    tileLayers[selectedLayer].addTo(map);

    // Handle map clicks
    map.on('click', (e: L.LeafletMouseEvent) => {
      setCurrentCoords([e.latlng.lat, e.latlng.lng]);
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }

      // Handle draw modes
      if (drawMode === 'point' && drawnItemsRef.current) {
        const marker = L.marker(e.latlng);
        drawnItemsRef.current.addLayer(marker);
        if (onDrawComplete) {
          onDrawComplete({
            type: 'Point',
            coordinates: [e.latlng.lng, e.latlng.lat],
          });
        }
        setDrawMode('none');
      }
    });

    // Cleanup
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update tile layer when selectedLayer changes
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;
    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    const tileLayers: Record<string, L.TileLayer> = {
      streets: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }),
      satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri',
      }),
      dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      }),
    };

    tileLayers[selectedLayer].addTo(map);
  }, [selectedLayer]);

  // Update markers when geoPoints change
  useEffect(() => {
    if (!mapRef.current || !drawnItemsRef.current) return;

    // Clear existing markers
    drawnItemsRef.current.clearLayers();

    // Add new markers
    geoPoints.forEach((point) => {
      const marker = L.marker([point.coordinates[1], point.coordinates[0]]);
      if (point.properties) {
        marker.bindPopup(
          `<div class="p-2">
            <strong>${point.id}</strong><br/>
            ${Object.entries(point.properties)
              .map(([key, value]) => `${key}: ${value}`)
              .join('<br/>')}
          </div>`
        );
      }
      drawnItemsRef.current?.addLayer(marker);
    });

    // Add shapes
    geoShapes.forEach((shape) => {
      let layer: L.Layer | null = null;

      if (shape.type === 'Polygon') {
        const coords = shape.coordinates[0].map((c: number[]) => [c[1], c[0]] as [number, number]);
        layer = L.polygon(coords, { color: '#3b82f6', fillOpacity: 0.2 });
      } else if (shape.type === 'LineString') {
        const coords = shape.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number]);
        layer = L.polyline(coords, { color: '#3b82f6' });
      }

      if (layer && shape.properties) {
        layer.bindPopup(
          `<div class="p-2">
            <strong>${shape.id}</strong><br/>
            ${Object.entries(shape.properties)
              .map(([key, value]) => `${key}: ${value}`)
              .join('<br/>')}
          </div>`
        );
      }

      if (layer) {
        drawnItemsRef.current?.addLayer(layer);
      }
    });
  }, [geoPoints, geoShapes]);

  // Handle drawing
  const handleDrawCircle = () => {
    if (!mapRef.current || !drawnItemsRef.current) return;

    setDrawMode('circle');
    const map = mapRef.current;
    let startPoint: L.LatLng | null = null;
    let circle: L.Circle | null = null;

    const onMouseDown = (e: L.LeafletMouseEvent) => {
      startPoint = e.latlng;
      circle = L.circle(e.latlng, { radius: 0, color: '#3b82f6', fillOpacity: 0.2 });
      circle.addTo(map);
    };

    const onMouseMove = (e: L.LeafletMouseEvent) => {
      if (startPoint && circle) {
        const radius = startPoint.distanceTo(e.latlng);
        circle.setRadius(radius);
      }
    };

    const onMouseUp = (e: L.LeafletMouseEvent) => {
      if (startPoint && circle) {
        const radius = startPoint.distanceTo(e.latlng);
        drawnItemsRef.current?.addLayer(circle);

        if (onDrawComplete) {
          onDrawComplete({
            type: 'Circle',
            center: [startPoint.lng, startPoint.lat],
            radius,
          });
        }

        map.off('mousedown', onMouseDown);
        map.off('mousemove', onMouseMove);
        map.off('mouseup', onMouseUp);
        setDrawMode('none');
      }
    };

    map.on('mousedown', onMouseDown);
    map.on('mousemove', onMouseMove);
    map.on('mouseup', onMouseUp);
  };

  const handleDrawPolygon = () => {
    if (!mapRef.current || !drawnItemsRef.current) return;

    setDrawMode('polygon');
    const map = mapRef.current;
    const points: L.LatLng[] = [];
    let polygon: L.Polygon | null = null;

    const onClick = (e: L.LeafletMouseEvent) => {
      points.push(e.latlng);

      if (polygon) {
        polygon.setLatLngs(points);
      } else {
        polygon = L.polygon(points, { color: '#3b82f6', fillOpacity: 0.2 });
        polygon.addTo(map);
      }
    };

    const onDblClick = (e: L.LeafletMouseEvent) => {
      L.DomEvent.stopPropagation(e);

      if (polygon && points.length >= 3) {
        drawnItemsRef.current?.addLayer(polygon);

        if (onDrawComplete) {
          onDrawComplete({
            type: 'Polygon',
            coordinates: [points.map(p => [p.lng, p.lat])],
          });
        }
      }

      map.off('click', onClick);
      map.off('dblclick', onDblClick);
      setDrawMode('none');
    };

    map.on('click', onClick);
    map.on('dblclick', onDblClick);
  };

  const clearDrawings = () => {
    drawnItemsRef.current?.clearLayers();
  };

  return (
    <div className="flex h-full flex-col rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-gray-200 p-3 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDrawMode('point')}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              drawMode === 'point'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Add Point
          </button>
          <button
            onClick={handleDrawCircle}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              drawMode === 'circle'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Draw Circle
          </button>
          <button
            onClick={handleDrawPolygon}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              drawMode === 'polygon'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Draw Polygon
          </button>
          <button
            onClick={clearDrawings}
            className="rounded-lg bg-red-100 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
          >
            Clear
          </button>
        </div>

        {/* Layer Controls */}
        <div className="flex items-center gap-2">
          <select
            value={selectedLayer}
            onChange={(e) => setSelectedLayer(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="streets">Streets</option>
            <option value="satellite">Satellite</option>
            <option value="dark">Dark</option>
          </select>
        </div>
      </div>

      {/* Current Coordinates Display */}
      {currentCoords && (
        <div className="border-b border-gray-200 bg-gray-50 px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-900">
          <span className="font-medium text-gray-600 dark:text-gray-400">
            Lat: {currentCoords[0].toFixed(6)}, Lng: {currentCoords[1].toFixed(6)}
          </span>
        </div>
      )}

      {/* Map Container */}
      <div
        ref={mapContainerRef}
        style={{ height }}
        className="flex-1 rounded-b-lg"
      />

      {/* Status Bar */}
      <div className="border-t border-gray-200 bg-gray-50 px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-400">
            {geoPoints.length} points, {geoShapes.length} shapes
          </span>
          {drawMode !== 'none' && (
            <span className="text-blue-600 dark:text-blue-400">
              {drawMode === 'point' && 'Click on map to add point'}
              {drawMode === 'circle' && 'Click and drag to draw circle'}
              {drawMode === 'polygon' && 'Click to add points, double-click to finish'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
