'use client';
import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, RefreshCw } from 'lucide-react';
import type { ThemeTokens } from '@/app/lib/timeseries/themes';
import type { TimeRange } from '@/app/lib/timeseries/types';
import { TIME_PRESETS, REFRESH_OPTIONS, getTimeRangeLabel } from '@/app/lib/timeseries/time-range';

interface GlobalTimeRangeBarProps {
  timeRange: TimeRange;
  refreshInterval: number | 'manual';
  isRefreshing: boolean;
  theme: ThemeTokens;
  onTimeRangeChange: (range: TimeRange) => void;
  onRefreshIntervalChange: (v: number | 'manual') => void;
  onRefreshNow: () => void;
}

export default function GlobalTimeRangeBar({
  timeRange, refreshInterval, isRefreshing, theme,
  onTimeRangeChange, onRefreshIntervalChange, onRefreshNow,
}: GlobalTimeRangeBarProps) {
  const [timeOpen, setTimeOpen]       = useState(false);
  const [refreshOpen, setRefreshOpen] = useState(false);
  const timeRef    = useRef<HTMLDivElement>(null);
  const refreshRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (timeRef.current && !timeRef.current.contains(e.target as Node)) setTimeOpen(false);
      if (refreshRef.current && !refreshRef.current.contains(e.target as Node)) setRefreshOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const isLight = theme.id === 'light-clean';
  const btnBase = isLight
    ? 'flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-colors'
    : `flex items-center gap-1.5 rounded-lg ${theme.cardBg} ${theme.cardBorder} px-3 py-1.5 text-sm ${theme.textSecondary} hover:bg-white/[0.10] hover:text-white/90 transition-colors`;

  const dropBase = isLight
    ? 'absolute top-full mt-1 rounded-xl border border-gray-200 bg-white shadow-xl z-50 min-w-[180px]'
    : `absolute top-full mt-1 rounded-xl ${theme.cardBg} ${theme.cardBorder} shadow-2xl z-50 min-w-[180px]`;

  const itemBase = isLight
    ? 'w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors first:rounded-t-xl last:rounded-b-xl'
    : `w-full text-left px-3 py-2 text-sm ${theme.textSecondary} hover:bg-white/[0.08] hover:text-white/90 transition-colors first:rounded-t-xl last:rounded-b-xl`;

  const refreshLabel = REFRESH_OPTIONS.find((o) => o.value === refreshInterval)?.label ?? 'Manual';

  return (
    <div className="flex items-center gap-2">
      {/* Time range picker */}
      <div ref={timeRef} className="relative">
        <button className={btnBase} onClick={() => setTimeOpen((v) => !v)}>
          <Calendar className="h-4 w-4 flex-shrink-0" style={{ color: theme.accentPrimary }} />
          <span>{getTimeRangeLabel(timeRange)}</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </button>
        {timeOpen && (
          <div className={dropBase}>
            <div className="py-1">
              {TIME_PRESETS.map((p) => (
                <button
                  key={p.id}
                  className={`${itemBase} ${timeRange.preset === p.id ? 'font-semibold' : ''}`}
                  style={timeRange.preset === p.id ? { color: theme.accentPrimary } : {}}
                  onClick={() => {
                    const { from, to } = p.getRange();
                    onTimeRangeChange({ preset: p.id, from, to });
                    setTimeOpen(false);
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Refresh interval picker */}
      <div ref={refreshRef} className="relative">
        <button className={btnBase} onClick={() => setRefreshOpen((v) => !v)}>
          <RefreshCw
            className={`h-4 w-4 flex-shrink-0 ${isRefreshing ? 'animate-spin' : ''}`}
            style={{ color: theme.accentPrimary }}
          />
          <span>{refreshLabel}</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </button>
        {refreshOpen && (
          <div className={dropBase}>
            <div className="py-1">
              {REFRESH_OPTIONS.map((o) => (
                <button
                  key={String(o.value)}
                  className={`${itemBase} ${refreshInterval === o.value ? 'font-semibold' : ''}`}
                  style={refreshInterval === o.value ? { color: theme.accentPrimary } : {}}
                  onClick={() => { onRefreshIntervalChange(o.value); setRefreshOpen(false); }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Refresh now */}
      <button
        onClick={onRefreshNow}
        className={btnBase}
        title="Refresh all widgets now"
      >
        <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} style={{ color: theme.accentPrimary }} />
      </button>
    </div>
  );
}
