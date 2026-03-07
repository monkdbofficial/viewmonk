'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { ChevronUp, ChevronDown, X } from 'lucide-react';
import type { GeoPoint } from './LeafletMapViewer';

interface GeoDataGridProps {
  rows: Record<string, unknown>[];
  geoPoints: GeoPoint[];
  selectedPointId: string | null;
  onRowSelect: (pointId: string | null) => void;
  onClose: () => void;
}

type SortDir = 'asc' | 'desc' | null;

const MAX_CELL = 120; // chars before truncation

function fmtCell(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'number') return v.toLocaleString(undefined, { maximumFractionDigits: 4 });
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  const s = String(v);
  return s.length > MAX_CELL ? s.slice(0, MAX_CELL) + '…' : s;
}

export default function GeoDataGrid({ rows, geoPoints, selectedPointId, onRowSelect, onClose }: GeoDataGridProps) {
  const [sortCol, setSortCol]  = useState<string | null>(null);
  const [sortDir, setSortDir]  = useState<SortDir>(null);
  const [width, setWidth]      = useState(380);
  const [search, setSearch]    = useState('');
  const dragging               = useRef(false);
  const startX                 = useRef(0);
  const startW                 = useRef(0);
  const rowRefs                = useRef<Record<string, HTMLTableRowElement | null>>({});
  const tableRef               = useRef<HTMLDivElement>(null);

  // Derive columns from rows
  const columns = rows.length > 0 ? Object.keys(rows[0]).filter(c => c !== 'latitude' && c !== 'longitude') : [];

  // Build a lookup: row id → geoPoint id
  const rowIdToPointId = useCallback((row: Record<string, unknown>): string | null => {
    const idVal = row.id;
    if (idVal !== undefined && idVal !== null) {
      const candidate = String(idVal);
      if (geoPoints.some(p => p.id === candidate)) return candidate;
    }
    return null;
  }, [geoPoints]);

  // Sort + filter
  const visibleRows = (() => {
    let list = [...rows];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r => Object.values(r).some(v => String(v ?? '').toLowerCase().includes(q)));
    }
    if (sortCol && sortDir) {
      list.sort((a, b) => {
        const av = a[sortCol]; const bv = b[sortCol];
        if (av === null || av === undefined) return 1;
        if (bv === null || bv === undefined) return -1;
        const cmp = typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv), undefined, { numeric: true });
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return list;
  })();

  const handleSort = (col: string) => {
    if (sortCol !== col) { setSortCol(col); setSortDir('asc'); return; }
    if (sortDir === 'asc') { setSortDir('desc'); return; }
    setSortCol(null); setSortDir(null);
  };

  // Scroll selected row into view when selectedPointId changes (driven by map click)
  useEffect(() => {
    if (!selectedPointId) return;
    const el = rowRefs.current[selectedPointId];
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedPointId]);

  // Drag-to-resize handle
  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    startX.current   = e.clientX;
    startW.current   = width;
    e.preventDefault();
  };
  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!dragging.current) return;
      const delta = startX.current - e.clientX; // drag left = wider
      setWidth(Math.max(260, Math.min(700, startW.current + delta)));
    };
    const up = () => { dragging.current = false; };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
  }, []);

  return (
    <div
      className="relative flex h-full flex-col border-l border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
      style={{ width, minWidth: 260, maxWidth: 700, flexShrink: 0 }}
    >
      {/* Drag handle */}
      <div
        onMouseDown={onMouseDown}
        className="absolute left-0 top-0 z-10 h-full w-1 cursor-col-resize bg-transparent hover:bg-blue-400/40 active:bg-blue-500/60 transition-colors"
      />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-700 dark:text-gray-200">Results</span>
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
            {visibleRows.length.toLocaleString()} / {rows.length.toLocaleString()}
          </span>
        </div>
        <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Search */}
      <div className="border-b border-gray-200 px-3 py-1.5 dark:border-gray-700">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search rows…"
          className="w-full rounded border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-700 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
        />
      </div>

      {/* Table */}
      <div ref={tableRef} className="flex-1 overflow-auto">
        {columns.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-gray-400">No data</div>
        ) : (
          <table className="w-full border-collapse text-xs">
            <thead className="sticky top-0 z-[1] bg-gray-50 dark:bg-gray-800">
              <tr>
                {columns.map(col => (
                  <th
                    key={col}
                    onClick={() => handleSort(col)}
                    className="cursor-pointer select-none whitespace-nowrap border-b border-gray-200 px-2 py-1.5 text-left font-semibold text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700"
                  >
                    <div className="flex items-center gap-1">
                      <span className="truncate" style={{ maxWidth: 100 }}>{col}</span>
                      {sortCol === col ? (
                        sortDir === 'asc' ? <ChevronUp className="h-3 w-3 text-blue-500" /> : <ChevronDown className="h-3 w-3 text-blue-500" />
                      ) : <ChevronDown className="h-3 w-3 text-gray-300" />}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row, i) => {
                const pointId = rowIdToPointId(row);
                const isSelected = pointId !== null && pointId === selectedPointId;
                return (
                  <tr
                    key={i}
                    ref={el => { if (pointId) rowRefs.current[pointId] = el; }}
                    onClick={() => onRowSelect(pointId)}
                    className={`cursor-pointer border-b border-gray-100 transition-colors dark:border-gray-800 ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-900/30'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800/60'
                    }`}
                  >
                    {columns.map(col => (
                      <td
                        key={col}
                        className={`whitespace-nowrap px-2 py-1.5 ${isSelected ? 'text-blue-800 dark:text-blue-200' : 'text-gray-700 dark:text-gray-300'}`}
                        title={String(row[col] ?? '')}
                      >
                        {fmtCell(row[col])}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
