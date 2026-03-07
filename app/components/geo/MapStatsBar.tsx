'use client';

import { useState, useMemo } from 'react';
import type { GeoPoint } from './LeafletMapViewer';

interface MapStatsBarProps {
  geoPoints: GeoPoint[];
  nonGeoColumns: string[];
}

function fmt(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

export default function MapStatsBar({ geoPoints, nonGeoColumns }: MapStatsBarProps) {
  const [statsCol, setStatsCol] = useState<string>('');

  const stats = useMemo(() => {
    if (geoPoints.length === 0) return null;

    const lats = geoPoints.map(p => p.coordinates[1]);
    const lngs = geoPoints.map(p => p.coordinates[0]);

    const bbox = {
      minLat: Math.min(...lats), maxLat: Math.max(...lats),
      minLng: Math.min(...lngs), maxLng: Math.max(...lngs),
    };
    const centroid = {
      lat: lats.reduce((a, b) => a + b, 0) / lats.length,
      lng: lngs.reduce((a, b) => a + b, 0) / lngs.length,
    };

    let colStats: { min: number; max: number; avg: number; col: string } | null = null;
    if (statsCol) {
      const nums = geoPoints
        .map(p => p.properties?.[statsCol])
        .filter((v): v is number => typeof v === 'number' && !isNaN(v));
      if (nums.length > 0) {
        colStats = {
          col: statsCol,
          min: Math.min(...nums),
          max: Math.max(...nums),
          avg: nums.reduce((a, b) => a + b, 0) / nums.length,
        };
      }
    }

    return { bbox, centroid, colStats };
  }, [geoPoints, statsCol]);

  if (!stats) return null;

  const { bbox, centroid, colStats } = stats;

  const numericCols = nonGeoColumns.filter(col => {
    const v = geoPoints[0]?.properties?.[col];
    return typeof v === 'number';
  });

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 rounded-b-lg border-t border-gray-200 bg-gray-50 px-4 py-2 text-[11px] dark:border-gray-700 dark:bg-gray-800/60">
      {/* Count */}
      <span className="font-semibold text-gray-700 dark:text-gray-300">
        <span className="text-blue-600 dark:text-blue-400">{geoPoints.length.toLocaleString()}</span> points
      </span>

      {/* Bounding box */}
      <span className="text-gray-500 dark:text-gray-400">
        BBox: <span className="font-mono text-gray-700 dark:text-gray-300">
          {fmt(bbox.minLat)}°, {fmt(bbox.minLng)}°
        </span>
        {' → '}
        <span className="font-mono text-gray-700 dark:text-gray-300">
          {fmt(bbox.maxLat)}°, {fmt(bbox.maxLng)}°
        </span>
      </span>

      {/* Centroid */}
      <span className="text-gray-500 dark:text-gray-400">
        Centroid: <span className="font-mono text-gray-700 dark:text-gray-300">
          {fmt(centroid.lat)}°, {fmt(centroid.lng)}°
        </span>
      </span>

      {/* Column stats picker */}
      {numericCols.length > 0 && (
        <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
          Stats:
          <select
            value={statsCol}
            onChange={e => setStatsCol(e.target.value)}
            className="rounded border border-gray-300 bg-white px-1.5 py-0.5 text-[11px] text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
          >
            <option value="">— pick column</option>
            {numericCols.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {colStats && (
            <span className="font-mono text-gray-700 dark:text-gray-300">
              min <strong>{fmt(colStats.min)}</strong> · avg <strong>{fmt(colStats.avg)}</strong> · max <strong>{fmt(colStats.max)}</strong>
            </span>
          )}
        </span>
      )}
    </div>
  );
}
