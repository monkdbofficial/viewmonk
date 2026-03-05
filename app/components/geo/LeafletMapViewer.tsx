'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons - use data URI to avoid CDN dependency
const iconUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABkAAAApCAYAAADAk4LOAAAFgUlEQVR4Aa1XA5BjWRTN2oW17d3YaZtr2962HUzbDNpjszW24mRt28p47v7zq/bXZtrp/lWnXr337j3nPCe85NcypgSFdugCpW5YoDAMRaIMqRi6aKq5E3YqDQO3qAwjVWrD8Ncq/RBpykd8oZUb/kaJutow8r1aP9II0WmLKLIsJyv1w/kqw9Ch2MYdB++12Onxee/QMwvf4/Dk/Lfp/i4nxTXtOoQ4pW5Aj7wpici1A9erdAN2OH64x8OSP9j3Ft3b7aWkTg/Fm91siTra0f9on5sQr9INejH6CUUUpavjFNq1B+Oadhxmnfa8RfEmN8VNAsQhPqF55xHkMzz3jSmChWU6f7/XZKNH+9+hBLOHYozuKQPxyMPUKkrX/K0uWnfFaJGS1QPRtZsOPtr3NsW0uyh6NNCOkU3Yz+bXbT3I8G3xE5EXLXtCXbbqwCO9zPQYPRTZ5vIDXD7U+w7rFDEoUUf7ibHIR4y6bLVPXrz8JVZEql13trxwue/uDivd3fkWRbS6/IA2bID4uk0UpF1N8qLlbBlXs4Ee7HLTfV1j54APvODnSfOWBqtKVvjgLKzF5YdEk5ewRkGlK0i33Eofffc7HT56jD7/6U+qH3Cx7SBLNntH5YIPvODnyfIXZYRVDPqgHtLs5ABHD3YzLuespb7t79FY34DjMwrVrcTuwlT55YMPvOBnRrJ4VXTdNnYug5ucHLBjEpt30701A3Zh+1xXcgB1R0=';
const shadowUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACkAAAApCAYAAACoYAD2AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAISSURBVFhH7ZhNaxNRFIaXJgGDUaGi4FexqcUP0F24cOHGhQs3Lly58A9Uf4CrVqhdu3BRcSVu/ANuXFlXBRUUv0AxVoxJY5Mm4/OemTuZOzc3k6bNFBx4mJl7z3nOc+/cmXsTHDDvnz7r0P9v3Djfs3Xr9qPR/+Y9frK8PDy+sm7Xl9cXFhYGh8P3+p3e3+sX/v6XCfR7/Wv9Mv/B+2j/5cuXR4+urKysD4XP9Tv+z/wH76P9g/v7+zuP8L3/v7/w9u1bH+8xH8H7aP+g/cH5+fl9h8Pnd8xH8D7aP2h/cG5ubn0o+WVL+Yj5CN5H+wftD87MzKwNy3+U/MR8BO+j/YP2B6enp9eG5SfmI3gf7R+0Pzg1NbU2LD8xH8H7aP+g/cGpqam1YfmJ+QjeR/sH7Q9OTk6uDctPzEfwPto/aH9wcnJybVh+Yj6C99H+QfuDE5OT68PyE/MRvI/2D9ofnJiYWBuWn5iP4H20f9D+4Pj4+Nqw/MR8BO+j/YP2B8fGxtaG5SfmI3gf7R+0Pzg6Oro2LD8xH8H7aP+g/cHR0dG1YfmJ+QjeR/sH7Q+Ojo6uDctPzEfwPto/aH9wZGRkbVh+Yj6C99H+QfuDIyMja8PyE/MRvI/2D9ofHB4eXhuWn5iP4H20f9D+4PDw8Nqw/MR8BO+j/YP2B4eGhtaG5SfmI3gf7R+0Pzg4OLg2LD8xH8H7aP+g/cGBwcG1YfmJ+QjeR/sH7Q8ODAysDctPzEfwPto/aH+wv79/bVh+Yj6C99H+QfuD/f39a8PyE/MRvI/2D9of7O/vXxuWn5iP4H20f9D+YF9f39qw/MR8BO+j/YP2B/v6+taG5SfmI3gf7R+0P9jb27s2LD8xH8H7aP+g/cHe3t61YfmJ+QjeR/sH7Q/29PSsDctPzEfwPto/aH+wp6dnbVh+Yj6C99H+QfuDPT09a8PyE/MRvI/2D9of7Onp+fs7tD84MTGxNiw/MR/B+2j/oP3B8fHxtWH5ifkI3kf7B+0Pjo+Prw3LT8xH8D7aP2h/cGxsbG1YfmI+gvfR/kH7g+Pj42vD8hPzEbyP9g/aHxwdHV0blp+Yj+B9tH/Q/uDo6OjasPzEfATvo/2D9gdHR0fXhuUn5iN4H+0ftD84MjKyNiw/MR/B+2j/oP3BkZGRtWH5ifkI3kf7B+0PjoyMrA3LT8xH8D7aP2h/cHh4eG1YfmI+gvfR/kH7g8PDw2vD8hPzEbyP9g/aHxwaGlobVr7UT8xH8D7aP2h/cGhoaG1Y+VI/MR/B+2j/oP3BwcHBtWHlS/3EfATvo/2D9gcHBwfXhpUv9RPzEbyP9g/aHxwYGFgbVr7UT8xH8D7aP2h/cGBgYG1Y+VI/MR/B+2j/oP3B/v7+tWHlS/3EfATvo/2D9gf7+/vXhpUv9RPzEbyP9g/aH+zr61sbVr7UT8xH8D7aP2h/sK+vb21Y+VI/MR/B+2j/oP3B3t7etWHlS/3EfATvo/2D9gd7e3vXhpUv9RPzEbyP9g/aH+zp6VkbVr7UT8xH8D7aP2h/sKenZ21Y+VI/MR/B+2j/oP3Bnp6etWHlS/3EfATvo/2D9gc/A+EJwqW/J9UAAAAASUVORK5CYII=';

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconUrl,
  iconUrl: iconUrl,
  shadowUrl: shadowUrl,
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

export default function LeafletMapViewer({
  geoPoints = [],
  geoShapes = [],
  onMapClick,
  center = [0, 0],
  zoom = 2,
  height = '600px'
}: LeafletMapViewerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.CircleMarker[]>([]);
  const [mapStyle, setMapStyle] = useState<'streets' | 'satellite' | 'topo'>('streets');
  const [mapReady, setMapReady] = useState(false);
  const isMountedRef = useRef(false);

  // Tile layers
  const tileLayers = {
    streets: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    },
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    },
    topo: {
      url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    }
  };

  // Initialize map once when component mounts
  useEffect(() => {
    if (!mapContainerRef.current || isMountedRef.current) return;

    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      if (!mapContainerRef.current) return;

      try {
        // Create map
        const map = L.map(mapContainerRef.current, {
          center: [center[1], center[0]], // Leaflet uses [lat, lng]
          zoom: zoom,
          zoomControl: true,
          scrollWheelZoom: true,
          attributionControl: false, // Remove Leaflet attribution label
        });

        // Add initial tile layer
        L.tileLayer(tileLayers[mapStyle].url, {
          maxZoom: 19,
        }).addTo(map);

        // Add click handler
        if (onMapClick) {
          map.on('click', (e: L.LeafletMouseEvent) => {
            onMapClick(e.latlng.lat, e.latlng.lng);
          });
        }

        mapRef.current = map;
        isMountedRef.current = true;
        setMapReady(true);
      } catch {
        // map init failed — container may not be ready yet
      }
    }, 100);

    // Cleanup
    return () => {
      clearTimeout(timeoutId);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        isMountedRef.current = false;
      }
    };
  }, []); // Empty deps - only run once

  // Update tile layer when style changes
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove all existing tile layers
    mapRef.current.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        mapRef.current?.removeLayer(layer);
      }
    });

    // Add new tile layer
    L.tileLayer(tileLayers[mapStyle].url, {
      maxZoom: 19,
    }).addTo(mapRef.current);
  }, [mapStyle]);

  // Update markers when geoPoints change
  useEffect(() => {
    if (!mapRef.current || !mapReady) {
      return;
    }

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add new markers - using CircleMarker for better visibility
    geoPoints.forEach((point) => {
      const [lng, lat] = point.coordinates;

      try {
        // Create a visible circle marker
        const marker = L.circleMarker([lat, lng], {
          radius: 8,
          fillColor: '#3b82f6',
          color: '#fff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.8
        }).addTo(mapRef.current!);

        // Add popup
        const popupContent = `
          <div style="font-size: 14px; min-width: 200px;">
            <strong style="color: #3b82f6;">${point.properties?.name || 'Point'}</strong>
            ${point.properties ? Object.entries(point.properties)
              .filter(([key]) => key !== 'name')
              .map(([key, value]) => `<div style="font-size: 12px; margin-top: 4px;"><strong>${key}:</strong> ${value}</div>`)
              .join('') : ''}
            <div style="font-size: 11px; color: #666; margin-top: 8px;">
              📍 ${lat.toFixed(6)}, ${lng.toFixed(6)}
            </div>
          </div>
        `;
        marker.bindPopup(popupContent);

        markersRef.current.push(marker);
      } catch {
        // skip malformed point
      }
    });

    // Fit bounds if we have markers (shapes handled separately)
    if (markersRef.current.length > 0 && geoShapes.length === 0) {
      const group = L.featureGroup(markersRef.current);
      mapRef.current.fitBounds(group.getBounds(), { padding: [50, 50] });
    }
  }, [geoPoints, geoShapes, mapReady]);

  // Render GeoShapes (Polygon, LineString, MultiPolygon)
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;

    const layers: L.Layer[] = [];
    const style = { color: '#F59E0B', weight: 2, fillOpacity: 0.15 };

    geoShapes.forEach((shape) => {
      try {
        let layer: L.Layer | null = null;

        if (shape.type === 'Polygon') {
          // GeoJSON: [[[lng, lat], ...]] → Leaflet: [[lat, lng], ...]
          const latlngs = shape.coordinates[0].map(([lng, lat]: number[]) => [lat, lng] as L.LatLngTuple);
          layer = L.polygon(latlngs, style);
        } else if (shape.type === 'LineString') {
          const latlngs = shape.coordinates.map(([lng, lat]: number[]) => [lat, lng] as L.LatLngTuple);
          layer = L.polyline(latlngs, { color: '#F59E0B', weight: 3 });
        } else if (shape.type === 'MultiPolygon') {
          const group = L.layerGroup();
          (shape.coordinates as number[][][][]).forEach((poly) => {
            const latlngs = poly[0].map(([lng, lat]) => [lat, lng] as L.LatLngTuple);
            L.polygon(latlngs, style).addTo(group);
          });
          layer = group;
        }

        if (layer) {
          if (shape.properties && 'bindPopup' in layer) {
            (layer as L.Path).bindPopup(
              `<strong>${shape.properties.name ?? 'Shape'}</strong>`
            );
          }
          layer.addTo(mapRef.current!);
          layers.push(layer);
        }
      } catch {
        // skip malformed shape
      }
    });

    // Fit bounds to cover both points and shapes
    if (layers.length > 0) {
      const allLayers: L.Layer[] = [...markersRef.current, ...layers];
      if (allLayers.length > 0) {
        try {
          const group = L.featureGroup(allLayers.filter(l => l instanceof L.Path || l instanceof L.CircleMarker));
          if (group.getLayers().length > 0) {
            mapRef.current!.fitBounds(group.getBounds(), { padding: [50, 50] });
          }
        } catch {
          // bounds fit failed — map will stay at current view
        }
      }
    }

    return () => {
      layers.forEach(l => mapRef.current?.removeLayer(l));
    };
  }, [geoShapes, mapReady]);

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

      {/* Map Container */}
      <div
        ref={mapContainerRef}
        style={{ height: '100%', width: '100%', borderRadius: '0.5rem' }}
      />
    </div>
  );
}
