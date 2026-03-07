'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.heat';

// ── Fix default marker icons ───────────────────────────────────────────────────
const _iconUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABkAAAApCAYAAADAk4LOAAAFgUlEQVR4Aa1XA5BjWRTN2oW17d3YaZtr2962HUzbDNpjszW24mRt28p47v7zq/bXZtrp/lWnXr337j3nPCe85NcypgSFdugCpW5YoDAMRaIMqRi6aKq5E3YqDQO3qAwjVWrD8Ncq/RBpykd8oZUb/kaJutow8r1aP9II0WmLKLIsJyv1w/kqw9Ch2MYdB++12Onxee/QMwvf4/Dk/Lfp/i4nxTXtOoQ4pW5Aj7wpici1A9erdAN2OH64x8OSP9j3Ft3b7aWkTg/Fm91siTra0f9on5sQr9INejH6CUUUpavjFNq1B+Oadhxmnfa8RfEmN8VNAsQhPqF55xHkMzz3jSmChWU6f7/XZKNH+9+hBLOHYozuKQPxyMPUKkrX/K0uWnfFaJGS1QPRtZsOPtr3NsW0uyh6NNCOkU3Yz+bXbT3I8G3xE5EXLXtCXbbqwCO9zPQYPRTZ5vIDXD7U+w7rFDEoUUf7ibHIR4y6bLVPXrz8JVZEql13trxwue/uDivd3fkWRbS6/IA2bID4uk0UpF1N8qLlbBlXs4Ee7HLTfV1j54APvODnSfOWBqtKVvjgLKzF5YdEk5ewRkGlK0i33Eofffc7HT56jD7/6U+qH3Cx7SBLNntH5YIPvODnyfIXZYRVDPqgHtLs5ABHD3YzLuespb7t79FY34DjMwrVrcTuwlT55YMPvOBnRrJ4VXTdNnYug5ucHLBjEpt30701A3Zh+1xXcgB1R0=';
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: _iconUrl, iconUrl: _iconUrl, shadowUrl: _iconUrl });

// ── Types ──────────────────────────────────────────────────────────────────────
export interface GeoPoint {
  id: string;
  coordinates: [number, number]; // [lng, lat]
  properties?: Record<string, unknown>;
}

export interface GeoShape {
  id: string;
  type: 'Polygon' | 'LineString' | 'MultiPolygon';
  coordinates: unknown;
  properties?: Record<string, unknown>;
}

export interface LeafletMapViewerProps {
  geoPoints?: GeoPoint[];
  geoShapes?: GeoShape[];
  onMapClick?: (lat: number, lng: number) => void;
  onPointSelect?: (point: GeoPoint | null) => void;
  selectedPointId?: string | null;
  colorByColumn?: string;
  center?: [number, number];
  zoom?: number;
  height?: string;
}

// ── Color helpers ──────────────────────────────────────────────────────────────
const PALETTE = [
  '#3b82f6','#ef4444','#10b981','#f59e0b','#8b5cf6',
  '#ec4899','#06b6d4','#84cc16','#f97316','#6366f1',
];

function isNumericColumn(points: GeoPoint[], col: string): boolean {
  for (const p of points) {
    const v = p.properties?.[col];
    if (v !== null && v !== undefined) return typeof v === 'number';
  }
  return false;
}

function numericColor(value: number, min: number, max: number): string {
  const ratio = max === min ? 0.5 : (value - min) / (max - min);
  const hue = Math.round(120 - ratio * 120); // green→yellow→red
  return `hsl(${hue}, 90%, 48%)`;
}

function buildColorMap(
  points: GeoPoint[],
  col: string,
): { getColor: (p: GeoPoint) => string; legend: { label: string; color: string }[]; isNumeric: boolean } {
  const isNum = isNumericColumn(points, col);

  if (isNum) {
    const nums = points.map(p => p.properties?.[col] as number).filter(v => v !== null && v !== undefined && !isNaN(v));
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    return {
      isNumeric: true,
      getColor: (p) => {
        const v = p.properties?.[col] as number;
        if (v === null || v === undefined || isNaN(v)) return '#94a3b8';
        return numericColor(v, min, max);
      },
      legend: [
        { label: min.toLocaleString(undefined, { maximumFractionDigits: 2 }), color: 'hsl(120,90%,48%)' },
        { label: ((min + max) / 2).toLocaleString(undefined, { maximumFractionDigits: 2 }), color: 'hsl(60,90%,48%)' },
        { label: max.toLocaleString(undefined, { maximumFractionDigits: 2 }), color: 'hsl(0,90%,48%)' },
      ],
    };
  }

  const uniqueVals = [...new Set(points.map(p => String(p.properties?.[col] ?? '')))];
  const colorByVal: Record<string, string> = {};
  uniqueVals.forEach((v, i) => { colorByVal[v] = PALETTE[i % PALETTE.length]; });

  return {
    isNumeric: false,
    getColor: (p) => colorByVal[String(p.properties?.[col] ?? '')] ?? '#94a3b8',
    legend: uniqueVals.slice(0, 12).map(v => ({ label: v || '(empty)', color: colorByVal[v] })),
  };
}

// ── Tile layers ────────────────────────────────────────────────────────────────
const TILE_LAYERS = {
  streets:   'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  topo:      'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
};
type MapStyle = keyof typeof TILE_LAYERS;

// ── Component ─────────────────────────────────────────────────────────────────
export default function LeafletMapViewer({
  geoPoints = [],
  geoShapes = [],
  onMapClick,
  onPointSelect,
  selectedPointId,
  colorByColumn,
  center = [0, 0],
  zoom = 2,
  height = '100%',
}: LeafletMapViewerProps) {
  const containerRef   = useRef<HTMLDivElement>(null);
  const mapRef         = useRef<L.Map | null>(null);
  const tileRef        = useRef<L.TileLayer | null>(null);
  const clusterRef     = useRef<L.MarkerClusterGroup | null>(null);
  const markersMapRef  = useRef<Map<string, L.CircleMarker>>(new Map()); // id → marker
  const markersRef     = useRef<L.CircleMarker[]>([]); // for non-clustered cleanup
  const shapesRef      = useRef<L.Layer[]>([]);
  const heatRef        = useRef<L.Layer | null>(null);
  const mountedRef     = useRef(false);
  const prevSelectedId = useRef<string | null>(null); // track previously selected point

  const [mapReady,     setMapReady]     = useState(false);
  const [mapStyle,     setMapStyle]     = useState<MapStyle>('streets');
  const [clustering,   setClustering]   = useState(true);
  const [showHeatmap,  setShowHeatmap]  = useState(false);

  // Compute color mapping (memoized — only recomputes when points/column change)
  const colorMap = useMemo(() => {
    if (!colorByColumn || geoPoints.length === 0) return null;
    return buildColorMap(geoPoints, colorByColumn);
  }, [geoPoints, colorByColumn]);

  // ── Init map once ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mountedRef.current) return;

    const tid = setTimeout(() => {
      if (!containerRef.current) return;
      try {
        const map = L.map(containerRef.current, {
          center: [center[1], center[0]],
          zoom,
          zoomControl: true,
          scrollWheelZoom: true,
          attributionControl: false,
        });

        const tile = L.tileLayer(TILE_LAYERS.streets, { maxZoom: 19 }).addTo(map);
        tileRef.current = tile;

        if (onMapClick) {
          map.on('click', (e: L.LeafletMouseEvent) => {
            onMapClick(e.latlng.lat, e.latlng.lng);
          });
        }

        mapRef.current = map;
        mountedRef.current = true;
        setMapReady(true);

        // Force size recalculation after layout settles
        requestAnimationFrame(() => map.invalidateSize());

        // Watch for container resize (flex layout changes, panel open/close)
        const ro = new ResizeObserver(() => map.invalidateSize());
        if (containerRef.current) ro.observe(containerRef.current);
        (map as L.Map & { _resizeObserver?: ResizeObserver })._resizeObserver = ro;
      } catch {/* container not ready */}
    }, 100);

    return () => {
      clearTimeout(tid);
      if (mapRef.current) {
        (mapRef.current as L.Map & { _resizeObserver?: ResizeObserver })._resizeObserver?.disconnect();
        mapRef.current.remove();
        mapRef.current = null;
        mountedRef.current = false;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Swap tile layer when style changes ───────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    tileRef.current?.remove();
    tileRef.current = L.tileLayer(TILE_LAYERS[mapStyle], { maxZoom: 19 }).addTo(mapRef.current);
    requestAnimationFrame(() => mapRef.current?.invalidateSize());
  }, [mapStyle, mapReady]);

  // ── Render markers (clustering + color-by-column) ────────────────────────────
  // NOTE: selectedPointId is intentionally NOT in deps — selection changes are
  // handled by the dedicated style-update effect below, keeping clusters stable.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    // Remove old cluster group
    if (clusterRef.current) { map.removeLayer(clusterRef.current); clusterRef.current = null; }
    // Remove old individual markers
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];
    markersMapRef.current.clear();
    prevSelectedId.current = null;

    if (geoPoints.length === 0) return;

    const defaultColor = '#3b82f6';

    const makeMarker = (point: GeoPoint): L.CircleMarker => {
      const [lng, lat] = point.coordinates;
      const color = colorMap ? colorMap.getColor(point) : defaultColor;

      // Always render in default (unselected) style — selection effect handles highlight
      const marker = L.circleMarker([lat, lng], {
        radius: 8, fillColor: color, color: '#fff', weight: 2, opacity: 1, fillOpacity: 0.82,
      });

      marker.on('click', () => onPointSelect?.(point));
      markersMapRef.current.set(point.id, marker);
      return marker;
    };

    if (clustering) {
      const group = (L as unknown as { markerClusterGroup: (opts: unknown) => L.MarkerClusterGroup }).markerClusterGroup({
        maxClusterRadius: 60,
        iconCreateFunction: (cluster: L.MarkerCluster) => {
          const count = cluster.getChildCount();
          const size  = count < 10 ? 36 : count < 100 ? 44 : 52;
          const bg    = count < 10 ? '#3b82f6' : count < 100 ? '#f59e0b' : '#ef4444';
          return L.divIcon({
            html: `<div style="
              width:${size}px;height:${size}px;
              background:${bg};border:3px solid #fff;
              border-radius:50%;display:flex;align-items:center;
              justify-content:center;color:#fff;font-weight:700;
              font-size:${count < 100 ? 13 : 11}px;
              box-shadow:0 2px 8px rgba(0,0,0,.3)
            ">${count}</div>`,
            className: '',
            iconSize: [size, size],
          });
        },
      });
      geoPoints.forEach(p => group.addLayer(makeMarker(p)));
      group.addTo(map);
      clusterRef.current = group;
    } else {
      geoPoints.forEach(p => {
        const m = makeMarker(p);
        m.addTo(map);
        markersRef.current.push(m);
      });
    }

    // Fit bounds
    const allCoords: L.LatLngExpression[] = geoPoints.map(p => [p.coordinates[1], p.coordinates[0]]);
    if (allCoords.length > 0) {
      try { map.fitBounds(L.latLngBounds(allCoords), { padding: [48, 48], maxZoom: 14 }); } catch {/* skip */}
    }
  }, [geoPoints, mapReady, clustering, colorMap]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Update marker styles when selection changes — NO cluster rebuild ──────────
  useEffect(() => {
    const markers = markersMapRef.current;
    const defaultColor = '#3b82f6';

    // Deselect previous marker
    if (prevSelectedId.current) {
      const prev = markers.get(prevSelectedId.current);
      if (prev) {
        const color = colorMap ? colorMap.getColor(
          geoPoints.find(p => p.id === prevSelectedId.current) ?? { id: '', coordinates: [0, 0] }
        ) : defaultColor;
        prev.setStyle({ radius: 8, fillColor: color, weight: 2, fillOpacity: 0.82 });
      }
    }

    // Highlight new marker
    if (selectedPointId) {
      const next = markers.get(selectedPointId);
      if (next) {
        next.setStyle({ radius: 12, weight: 3, fillOpacity: 1 });
        next.bringToFront();
      }
    }

    prevSelectedId.current = selectedPointId ?? null;
  }, [selectedPointId, geoPoints, colorMap]);

  // ── Render shapes ────────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    shapesRef.current.forEach(l => map.removeLayer(l));
    shapesRef.current = [];

    const style = { color: '#f59e0b', weight: 2, fillOpacity: 0.15 };

    geoShapes.forEach((shape) => {
      try {
        let layer: L.Layer | null = null;
        if (shape.type === 'Polygon') {
          const coords = shape.coordinates as number[][][];
          const latlngs = coords[0].map(([lng, lat]) => [lat, lng] as L.LatLngTuple);
          layer = L.polygon(latlngs, style);
        } else if (shape.type === 'LineString') {
          const coords = shape.coordinates as number[][];
          const latlngs = coords.map(([lng, lat]) => [lat, lng] as L.LatLngTuple);
          layer = L.polyline(latlngs, { color: '#f59e0b', weight: 3 });
        } else if (shape.type === 'MultiPolygon') {
          const grp = L.layerGroup();
          (shape.coordinates as number[][][][]).forEach((poly) => {
            const latlngs = poly[0].map(([lng, lat]) => [lat, lng] as L.LatLngTuple);
            L.polygon(latlngs, style).addTo(grp);
          });
          layer = grp;
        }
        if (layer) {
          if (shape.properties && 'bindPopup' in layer) {
            (layer as L.Path).bindPopup(`<strong>${shape.properties.name ?? 'Shape'}</strong>`);
          }
          layer.addTo(map);
          shapesRef.current.push(layer);
        }
      } catch {/* skip malformed */}
    });
  }, [geoShapes, mapReady]);

  // ── Heatmap layer ────────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    if (heatRef.current) { map.removeLayer(heatRef.current); heatRef.current = null; }

    if (showHeatmap && geoPoints.length > 0) {
      const latLngs = geoPoints.map(p => [p.coordinates[1], p.coordinates[0], 1] as [number, number, number]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const heat = (L as any).heatLayer(latLngs, { radius: 28, blur: 18, maxZoom: 17, gradient: { 0.3: '#60a5fa', 0.6: '#fbbf24', 1.0: '#ef4444' } });
      heat.addTo(map);
      heatRef.current = heat;
    }
  }, [showHeatmap, geoPoints, mapReady]);

  // ── Controls ─────────────────────────────────────────────────────────────────
  const btnBase  = 'px-3 py-1.5 rounded-lg text-xs font-semibold shadow-md transition-all';
  const btnOff   = 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600';
  const btnOn    = 'bg-blue-600 text-white border border-blue-600';
  const btnGreen = 'bg-emerald-600 text-white border border-emerald-600';
  const btnAmber = 'bg-amber-500 text-white border border-amber-500';

  return (
    <div className="relative" style={{ height, minHeight: 200 }}>
      {/* Map container */}
      <div ref={containerRef} style={{ height: '100%', width: '100%', borderRadius: '0.5rem' }} />

      {/* ── Tile style selector (top-right) ── */}
      <div className="absolute right-3 top-3 z-[1000] flex gap-1.5">
        {(['streets', 'satellite', 'topo'] as MapStyle[]).map(s => (
          <button key={s} onClick={() => setMapStyle(s)}
            className={`${btnBase} ${mapStyle === s ? btnOn : btnOff} capitalize`}>
            {s === 'streets' ? 'Streets' : s === 'satellite' ? 'Satellite' : 'Topo'}
          </button>
        ))}
      </div>

      {/* ── Layer toggles (top-left) ── */}
      <div className="absolute left-3 top-3 z-[1000] flex flex-col gap-1.5">
        <button onClick={() => setClustering(v => !v)}
          className={`${btnBase} ${clustering ? btnGreen : btnOff}`}>
          {clustering ? '● Clustered' : '○ Clustered'}
        </button>
        <button onClick={() => setShowHeatmap(v => !v)}
          className={`${btnBase} ${showHeatmap ? btnAmber : btnOff}`}>
          {showHeatmap ? '🔥 Heatmap on' : '🔥 Heatmap'}
        </button>
      </div>

      {/* ── Legend (bottom-left) ── */}
      {colorMap && colorByColumn && (
        <div className="absolute bottom-5 left-3 z-[1000] rounded-lg border border-gray-200 bg-white/95 px-3 py-2.5 shadow-lg backdrop-blur-sm dark:border-gray-700 dark:bg-gray-900/95"
          style={{ maxWidth: 180 }}>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {colorByColumn}
          </p>
          {colorMap.isNumeric ? (
            <div>
              <div className="h-2.5 w-full rounded-full" style={{
                background: 'linear-gradient(to right, hsl(120,90%,48%), hsl(60,90%,48%), hsl(0,90%,48%))',
              }} />
              <div className="mt-1 flex justify-between text-[10px] text-gray-600 dark:text-gray-400">
                <span>{colorMap.legend[0].label}</span>
                <span>{colorMap.legend[2].label}</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {colorMap.legend.map(item => (
                <div key={item.label} className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: item.color }} />
                  <span className="truncate text-[11px] text-gray-700 dark:text-gray-300">{item.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Point count badge (bottom-right) ── */}
      {geoPoints.length > 0 && (
        <div className="absolute bottom-5 right-3 z-[1000] rounded-lg border border-gray-200 bg-white/95 px-2.5 py-1.5 text-xs font-medium text-gray-600 shadow-md backdrop-blur-sm dark:border-gray-700 dark:bg-gray-900/95 dark:text-gray-400">
          {geoPoints.length.toLocaleString()} points
        </div>
      )}
    </div>
  );
}
