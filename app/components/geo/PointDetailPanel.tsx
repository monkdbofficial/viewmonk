'use client';

import { X, MapPin, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import type { GeoPoint } from './LeafletMapViewer';

interface PointDetailPanelProps {
  point: GeoPoint;
  onClose: () => void;
}

const GEO_KEYS = new Set(['latitude', 'longitude', 'id']);

function formatValue(key: string, value: unknown): { display: string; type: 'number' | 'string' | 'bool' | 'null' } {
  if (value === null || value === undefined) return { display: '—', type: 'null' };
  if (typeof value === 'boolean') return { display: value ? 'true' : 'false', type: 'bool' };
  if (typeof value === 'number') {
    return {
      display: Number.isInteger(value) ? value.toLocaleString() : value.toLocaleString(undefined, { maximumFractionDigits: 6 }),
      type: 'number',
    };
  }
  // Try to detect ISO timestamp
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
    try {
      const d = new Date(s);
      return { display: d.toLocaleString(), type: 'string' };
    } catch { /* fall through */ }
  }
  return { display: s.length > 300 ? s.slice(0, 300) + '…' : s, type: 'string' };
}

export default function PointDetailPanel({ point, onClose }: PointDetailPanelProps) {
  const [copied, setCopied] = useState(false);

  const [lng, lat] = point.coordinates;
  const name = String(point.properties?.name ?? point.id);

  const dataRows = Object.entries(point.properties ?? {})
    .filter(([k]) => !GEO_KEYS.has(k));

  const handleCopyCoords = () => {
    navigator.clipboard.writeText(`${lat.toFixed(7)}, ${lng.toFixed(7)}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex h-full w-72 flex-shrink-0 flex-col border-l border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-gray-200 p-4 dark:border-gray-700">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40">
            <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-gray-900 dark:text-white" title={name}>{name}</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500">ID: {point.id}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="ml-2 flex-shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Coordinates */}
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/50">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Coordinates</span>
          <button
            onClick={handleCopyCoords}
            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          >
            {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-gray-400 dark:text-gray-500">Latitude</span>
            <p className="font-mono font-semibold text-gray-800 dark:text-gray-200">{lat.toFixed(7)}</p>
          </div>
          <div>
            <span className="text-gray-400 dark:text-gray-500">Longitude</span>
            <p className="font-mono font-semibold text-gray-800 dark:text-gray-200">{lng.toFixed(7)}</p>
          </div>
        </div>
      </div>

      {/* Properties */}
      <div className="flex-1 overflow-y-auto">
        {dataRows.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-gray-400">No additional properties</div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {dataRows.map(([key, value]) => {
              const { display, type } = formatValue(key, value);
              return (
                <div key={key} className="px-4 py-2.5">
                  <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">{key}</p>
                  <p
                    className={`break-words text-xs font-medium ${
                      type === 'number'
                        ? 'font-mono text-blue-700 dark:text-blue-300'
                        : type === 'bool'
                        ? 'text-purple-700 dark:text-purple-300'
                        : type === 'null'
                        ? 'italic text-gray-400'
                        : 'text-gray-800 dark:text-gray-200'
                    }`}
                  >
                    {display}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
