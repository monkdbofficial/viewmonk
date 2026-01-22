'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import * as turf from '@turf/turf';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import { geospatialConfig } from '@/app/config/geospatial.config';
import { Layers, Ruler, Search, Navigation, Mountain, Building, Download, Sun, Moon, Maximize2, Home, Info } from 'lucide-react';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

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

interface MapboxViewerProProps {
  geoPoints?: GeoPoint[];
  geoShapes?: GeoShape[];
  onMapClick?: (lat: number, lng: number) => void;
  onDrawComplete?: (geometry: any) => void;
  center?: [number, number];
  zoom?: number;
  height?: string;
}

export default function MapboxViewerPro({
  geoPoints = [],
  geoShapes = [],
  onMapClick,
  onDrawComplete,
  center = [0, 0],
  zoom = 2,
  height = '600px'
}: MapboxViewerProProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const drawRef = useRef<MapboxDraw | null>(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [show3D, setShow3D] = useState(false);
  const [showTerrain, setShowTerrain] = useState(false);
  const [showClustering, setShowClustering] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [measureMode, setMeasureMode] = useState(false);
  const [currentStyle, setCurrentStyle] = useState(geospatialConfig.map.mapbox.defaultStyle);
  const [showLayerControl, setShowLayerControl] = useState(false);
  const [mapStats, setMapStats] = useState({ points: 0, shapes: 0, area: 0, distance: 0 });

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: `mapbox://styles/mapbox/${geospatialConfig.map.mapbox.defaultStyle}`,
      center: [center[0], center[1]],
      zoom: zoom,
      maxZoom: geospatialConfig.map.maxZoom,
      minZoom: geospatialConfig.map.minZoom,
      pitch: 0,
      bearing: 0,
      attributionControl: true,
      cooperativeGestures: false
    });

    // Add geocoder (search)
    const geocoder = new MapboxGeocoder({
      accessToken: mapboxgl.accessToken,
      mapboxgl: mapboxgl as any,
      marker: false,
      placeholder: 'Search for places...',
      bbox: [-180, -90, 180, 90],
      countries: '',
      types: 'country,region,place,postcode,locality,neighborhood,address,poi'
    });
    map.addControl(geocoder, 'top-left');

    // Add navigation controls
    if (geospatialConfig.map.mapbox.showNavigationControl) {
      map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    }

    // Add fullscreen control
    if (geospatialConfig.map.mapbox.showFullscreenControl) {
      map.addControl(new mapboxgl.FullscreenControl(), 'top-right');
    }

    // Add geolocate control (find me)
    map.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showUserHeading: true
      }),
      'top-right'
    );

    // Add scale control
    if (geospatialConfig.map.mapbox.showScaleControl) {
      map.addControl(
        new mapboxgl.ScaleControl({ maxWidth: 100, unit: 'metric' }),
        'bottom-left'
      );
    }

    // Add drawing tools
    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        line_string: true,
        point: true,
        trash: true
      },
      styles: [
        {
          'id': 'gl-draw-polygon-fill',
          'type': 'fill',
          'paint': {
            'fill-color': '#3B82F6',
            'fill-opacity': 0.3
          }
        },
        {
          'id': 'gl-draw-polygon-stroke-active',
          'type': 'line',
          'paint': {
            'line-color': '#3B82F6',
            'line-width': 2
          }
        },
        {
          'id': 'gl-draw-line',
          'type': 'line',
          'paint': {
            'line-color': '#3B82F6',
            'line-width': 2
          }
        },
        {
          'id': 'gl-draw-point',
          'type': 'circle',
          'paint': {
            'circle-radius': 5,
            'circle-color': '#3B82F6'
          }
        }
      ]
    });
    map.addControl(draw as any, 'top-right');
    drawRef.current = draw;

    // Handle draw events
    map.on('draw.create', (e) => {
      if (onDrawComplete) {
        onDrawComplete(e.features[0].geometry);
      }
    });

    // Handle map click
    if (onMapClick) {
      map.on('click', (e) => {
        onMapClick(e.lngLat.lat, e.lngLat.lng);
      });
    }

    // Wait for map to load
    map.on('load', () => {
      setMapLoaded(true);

      // Add 3D buildings layer (hidden by default)
      map.addLayer({
        'id': '3d-buildings',
        'source': 'composite',
        'source-layer': 'building',
        'filter': ['==', 'extrude', 'true'],
        'type': 'fill-extrusion',
        'minzoom': 15,
        'paint': {
          'fill-extrusion-color': '#aaa',
          'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ['zoom'],
            15,
            0,
            15.05,
            ['get', 'height']
          ],
          'fill-extrusion-base': [
            'interpolate',
            ['linear'],
            ['zoom'],
            15,
            0,
            15.05,
            ['get', 'min_height']
          ],
          'fill-extrusion-opacity': 0.6
        }
      });
      map.setLayoutProperty('3d-buildings', 'visibility', 'none');
    });

    mapRef.current = map;

    return () => {
      map.remove();
    };
  }, []);

  // Toggle 3D buildings
  const toggle3DBuildings = () => {
    if (!mapRef.current || !mapLoaded) return;
    const newState = !show3D;
    setShow3D(newState);
    mapRef.current.setLayoutProperty(
      '3d-buildings',
      'visibility',
      newState ? 'visible' : 'none'
    );
    if (newState) {
      mapRef.current.easeTo({ pitch: 60, bearing: 0 });
    } else {
      mapRef.current.easeTo({ pitch: 0, bearing: 0 });
    }
  };

  // Toggle terrain
  const toggleTerrain = () => {
    if (!mapRef.current || !mapLoaded) return;
    const newState = !showTerrain;
    setShowTerrain(newState);

    if (newState) {
      mapRef.current.addSource('mapbox-dem', {
        'type': 'raster-dem',
        'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
        'tileSize': 512,
        'maxzoom': 14
      });
      mapRef.current.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 1.5 });
      mapRef.current.addLayer({
        'id': 'sky',
        'type': 'sky',
        'paint': {
          'sky-type': 'atmosphere',
          'sky-atmosphere-sun': [0.0, 0.0],
          'sky-atmosphere-sun-intensity': 15
        }
      });
    } else {
      mapRef.current.setTerrain(null);
      if (mapRef.current.getLayer('sky')) {
        mapRef.current.removeLayer('sky');
      }
      if (mapRef.current.getSource('mapbox-dem')) {
        mapRef.current.removeSource('mapbox-dem');
      }
    }
  };

  // Export map as image
  const exportMap = () => {
    if (!mapRef.current) return;
    const canvas = mapRef.current.getCanvas();
    const link = document.createElement('a');
    link.download = `map-export-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  // Reset view to original center
  const resetView = () => {
    if (!mapRef.current) return;
    mapRef.current.flyTo({
      center: [center[0], center[1]],
      zoom: zoom,
      pitch: 0,
      bearing: 0
    });
  };

  // Change map style
  const changeStyle = (style: string) => {
    if (!mapRef.current) return;
    setCurrentStyle(style);
    mapRef.current.setStyle(`mapbox://styles/mapbox/${style}`);
  };

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

  // Add markers or clusters for geoPoints
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Remove existing sources/layers
    if (mapRef.current.getLayer('clusters')) mapRef.current.removeLayer('clusters');
    if (mapRef.current.getLayer('cluster-count')) mapRef.current.removeLayer('cluster-count');
    if (mapRef.current.getLayer('unclustered-point')) mapRef.current.removeLayer('unclustered-point');
    if (mapRef.current.getLayer('heatmap-layer')) mapRef.current.removeLayer('heatmap-layer');
    if (mapRef.current.getSource('points')) mapRef.current.removeSource('points');

    if (geoPoints.length === 0) return;

    // Use clustering for many points
    if (showClustering && geoPoints.length > geospatialConfig.map.clusteringThreshold) {
      const geojson = {
        type: 'FeatureCollection' as const,
        features: geoPoints.map(point => ({
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: [point.coordinates[0], point.coordinates[1]]
          },
          properties: point.properties || {}
        }))
      };

      mapRef.current.addSource('points', {
        type: 'geojson',
        data: geojson,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50
      });

      // Cluster circles
      mapRef.current.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'points',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step',
            ['get', 'point_count'],
            '#51bbd6',
            10,
            '#f1f075',
            30,
            '#f28cb1'
          ],
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            20,
            10,
            30,
            30,
            40
          ]
        }
      });

      // Cluster count
      mapRef.current.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'points',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
          'text-size': 12
        }
      });

      // Unclustered points
      mapRef.current.addLayer({
        id: 'unclustered-point',
        type: 'circle',
        source: 'points',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': geospatialConfig.map.mapbox.markerColor,
          'circle-radius': 8,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff'
        }
      });

      // Click on cluster to zoom
      mapRef.current.on('click', 'clusters', (e) => {
        const features = mapRef.current!.queryRenderedFeatures(e.point, {
          layers: ['clusters']
        });
        const clusterId = features[0].properties.cluster_id;
        (mapRef.current!.getSource('points') as mapboxgl.GeoJSONSource).getClusterExpansionZoom(
          clusterId,
          (err, zoom) => {
            if (err) return;
            mapRef.current!.easeTo({
              center: (features[0].geometry as any).coordinates,
              zoom: zoom
            });
          }
        );
      });

      // Heatmap layer
      if (showHeatmap) {
        mapRef.current.addLayer({
          id: 'heatmap-layer',
          type: 'heatmap',
          source: 'points',
          maxzoom: 15,
          paint: {
            'heatmap-weight': 1,
            'heatmap-intensity': 1,
            'heatmap-color': [
              'interpolate',
              ['linear'],
              ['heatmap-density'],
              0, 'rgba(33,102,172,0)',
              0.2, 'rgb(103,169,207)',
              0.4, 'rgb(209,229,240)',
              0.6, 'rgb(253,219,199)',
              0.8, 'rgb(239,138,98)',
              1, 'rgb(178,24,43)'
            ],
            'heatmap-radius': 30,
            'heatmap-opacity': 0.8
          }
        }, 'clusters');
      }

    } else {
      // Use individual markers for few points
      geoPoints.forEach((point) => {
        const [lng, lat] = point.coordinates;

        // Create popup
        const popup = new mapboxgl.Popup({
          offset: 25,
          closeButton: true,
          closeOnClick: false,
          className: 'custom-popup'
        }).setHTML(`
          <div class="p-3">
            <h3 class="font-bold text-sm mb-2 text-gray-900 dark:text-white">${point.id}</h3>
            ${point.properties ? Object.entries(point.properties)
              .map(([key, value]) => `
                <div class="flex justify-between gap-4 py-1 text-xs border-b border-gray-100 dark:border-gray-700">
                  <span class="font-semibold text-gray-600 dark:text-gray-400">${key}:</span>
                  <span class="text-gray-900 dark:text-white">${value}</span>
                </div>
              `).join('') : ''}
            <div class="mt-2 text-xs text-gray-500 dark:text-gray-400">
              📍 ${lat.toFixed(6)}, ${lng.toFixed(6)}
            </div>
          </div>
        `);

        // Create custom marker element
        const el = document.createElement('div');
        el.className = 'custom-marker';
        el.style.width = '30px';
        el.style.height = '30px';
        el.style.borderRadius = '50%';
        el.style.backgroundColor = geospatialConfig.map.mapbox.markerColor;
        el.style.border = '3px solid white';
        el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
        el.style.cursor = 'pointer';

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([lng, lat])
          .setPopup(popup)
          .addTo(mapRef.current!);

        markersRef.current.push(marker);
      });
    }

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

    setMapStats(prev => ({ ...prev, points: geoPoints.length }));
  }, [geoPoints, mapLoaded, showClustering, showHeatmap]);

  // Add shapes
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    if (mapRef.current.getLayer('shapes-fill')) mapRef.current.removeLayer('shapes-fill');
    if (mapRef.current.getLayer('shapes-outline')) mapRef.current.removeLayer('shapes-outline');
    if (mapRef.current.getSource('shapes')) mapRef.current.removeSource('shapes');

    if (geoShapes.length === 0) return;

    const features = geoShapes.map(shape => ({
      type: 'Feature' as const,
      geometry: {
        type: shape.type,
        coordinates: shape.coordinates
      },
      properties: shape.properties || {}
    }));

    mapRef.current.addSource('shapes', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features }
    });

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

    mapRef.current.addLayer({
      id: 'shapes-outline',
      type: 'line',
      source: 'shapes',
      paint: {
        'line-color': geospatialConfig.map.mapbox.shapeColor,
        'line-width': 2
      }
    });

    setMapStats(prev => ({ ...prev, shapes: geoShapes.length }));
  }, [geoShapes, mapLoaded]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg">
      <div ref={mapContainerRef} style={{ height }} className="w-full" />

      {/* Control Panel */}
      <div className="absolute right-3 top-3 z-10 space-y-2">
        {/* Layer Control */}
        <button
          onClick={() => setShowLayerControl(!showLayerControl)}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 bg-white shadow-lg hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700"
          title="Layer Controls"
        >
          <Layers className="h-5 w-5 text-gray-700 dark:text-gray-300" />
        </button>

        {showLayerControl && (
          <div className="w-64 rounded-lg border border-gray-300 bg-white p-3 shadow-lg dark:border-gray-600 dark:bg-gray-800">
            <h3 className="mb-3 text-sm font-bold text-gray-900 dark:text-white">
              Map Layers
            </h3>
            <div className="space-y-2">
              <button
                onClick={toggle3DBuildings}
                className={`flex w-full items-center gap-2 rounded px-3 py-2 text-sm ${
                  show3D
                    ? 'bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Building className="h-4 w-4" />
                3D Buildings
              </button>
              <button
                onClick={toggleTerrain}
                className={`flex w-full items-center gap-2 rounded px-3 py-2 text-sm ${
                  showTerrain
                    ? 'bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Mountain className="h-4 w-4" />
                Terrain
              </button>
              <button
                onClick={() => setShowClustering(!showClustering)}
                className={`flex w-full items-center gap-2 rounded px-3 py-2 text-sm ${
                  showClustering
                    ? 'bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <span>📌</span>
                Clustering
              </button>
              <button
                onClick={() => setShowHeatmap(!showHeatmap)}
                className={`flex w-full items-center gap-2 rounded px-3 py-2 text-sm ${
                  showHeatmap
                    ? 'bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <span>🔥</span>
                Heatmap
              </button>
            </div>

            <div className="mt-3 border-t border-gray-200 pt-3 dark:border-gray-700">
              <h4 className="mb-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
                Map Style
              </h4>
              <select
                value={currentStyle}
                onChange={(e) => changeStyle(e.target.value)}
                className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="streets-v12">Streets</option>
                <option value="satellite-v9">Satellite</option>
                <option value="satellite-streets-v12">Satellite Streets</option>
                <option value="light-v11">Light</option>
                <option value="dark-v11">Dark</option>
                <option value="outdoors-v12">Outdoors</option>
              </select>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <button
          onClick={resetView}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 bg-white shadow-lg hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700"
          title="Reset View"
        >
          <Home className="h-5 w-5 text-gray-700 dark:text-gray-300" />
        </button>

        <button
          onClick={exportMap}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 bg-white shadow-lg hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700"
          title="Export Map"
        >
          <Download className="h-5 w-5 text-gray-700 dark:text-gray-300" />
        </button>
      </div>

      {/* Stats Panel */}
      {(geoPoints.length > 0 || geoShapes.length > 0) && (
        <div className="absolute bottom-3 right-3 z-10 rounded-lg border border-gray-300 bg-white p-3 shadow-lg dark:border-gray-600 dark:bg-gray-800">
          <div className="flex items-center gap-2 text-xs">
            <Info className="h-3 w-3 text-gray-500" />
            <span className="font-semibold text-gray-900 dark:text-white">Map Stats</span>
          </div>
          <div className="mt-2 space-y-1 text-xs">
            {geoPoints.length > 0 && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-gray-600 dark:text-gray-400">Points:</span>
                <span className="font-medium text-gray-900 dark:text-white">{geoPoints.length}</span>
              </div>
            )}
            {geoShapes.length > 0 && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-gray-600 dark:text-gray-400">Shapes:</span>
                <span className="font-medium text-gray-900 dark:text-white">{geoShapes.length}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Loading */}
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-900">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 dark:border-gray-600 dark:border-t-blue-400"></div>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Loading Mapbox Pro...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
