// ─────────────────────────────────────────────────────────────────────────────
// MonkDB Workbench — Time Range Utilities
// Presets, auto-interval calculation, SQL timestamp formatting
// ─────────────────────────────────────────────────────────────────────────────

import type { TimeRange, TimePreset } from './types';

// ── Preset Definitions ────────────────────────────────────────────────────────

export interface TimePresetConfig {
  id: TimePreset;
  label: string;
  shortLabel: string;
  getRange: () => { from: Date; to: Date };
}

export const TIME_PRESETS: TimePresetConfig[] = [
  {
    id: '15m',
    label: 'Last 15 minutes',
    shortLabel: '15m',
    getRange: () => ({ from: new Date(Date.now() - 15 * 60_000), to: new Date() }),
  },
  {
    id: '1h',
    label: 'Last 1 hour',
    shortLabel: '1h',
    getRange: () => ({ from: new Date(Date.now() - 60 * 60_000), to: new Date() }),
  },
  {
    id: '6h',
    label: 'Last 6 hours',
    shortLabel: '6h',
    getRange: () => ({ from: new Date(Date.now() - 6 * 60 * 60_000), to: new Date() }),
  },
  {
    id: '24h',
    label: 'Last 24 hours',
    shortLabel: '24h',
    getRange: () => ({ from: new Date(Date.now() - 24 * 60 * 60_000), to: new Date() }),
  },
  {
    id: '7d',
    label: 'Last 7 days',
    shortLabel: '7d',
    getRange: () => ({ from: new Date(Date.now() - 7 * 24 * 60 * 60_000), to: new Date() }),
  },
  {
    id: '30d',
    label: 'Last 30 days',
    shortLabel: '30d',
    getRange: () => ({ from: new Date(Date.now() - 30 * 24 * 60 * 60_000), to: new Date() }),
  },
];

// ── Default time range ────────────────────────────────────────────────────────

export function getDefaultTimeRange(): TimeRange {
  const preset = TIME_PRESETS.find((p) => p.id === '24h')!;
  return { preset: '24h', ...preset.getRange() };
}

export function getTimeRangeForPreset(preset: TimePreset): TimeRange {
  if (preset === 'custom') {
    return getDefaultTimeRange();
  }
  const config = TIME_PRESETS.find((p) => p.id === preset)!;
  return { preset, ...config.getRange() };
}

// ── Auto-interval calculation ─────────────────────────────────────────────────
// Picks the right DATE_TRUNC interval based on the selected time range

// MonkDB DATE_TRUNC accepts: second, minute, hour, day, week, month, quarter, year
export type DateTruncInterval =
  | 'second'
  | 'minute'
  | 'hour'
  | 'day'
  | 'week'
  | 'month';

export function getAutoInterval(from: Date, to: Date): DateTruncInterval {
  const diffMs = to.getTime() - from.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours <= 2)       return 'minute';
  if (diffHours <= 48)      return 'hour';
  if (diffHours <= 7 * 24)  return 'day';
  if (diffHours <= 90 * 24) return 'week';
  return 'month';
}

// ── SQL timestamp formatting ───────────────────────────────────────────────────

export function toSQLTimestamp(date: Date): string {
  return date.toISOString().replace('T', ' ').replace('Z', '+00');
}

// ── Time range label ──────────────────────────────────────────────────────────

export function getTimeRangeLabel(range: TimeRange): string {
  if (range.preset !== 'custom') {
    const config = TIME_PRESETS.find((p) => p.id === range.preset);
    return config?.label ?? 'Custom';
  }
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  return `${fmt(range.from)} — ${fmt(range.to)}`;
}

// ── Refresh interval options ──────────────────────────────────────────────────

export interface RefreshOption {
  value: number | 'manual';
  label: string;
}

export const REFRESH_OPTIONS: RefreshOption[] = [
  { value: 'manual', label: 'Manual' },
  { value: 10_000,   label: 'Every 10s' },
  { value: 30_000,   label: 'Every 30s' },
  { value: 60_000,   label: 'Every 1m' },
  { value: 300_000,  label: 'Every 5m' },
];

// ── Duration formatting ───────────────────────────────────────────────────────

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1000)}s`;
}

export function formatRelativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  if (diff < 5_000) return 'just now';
  if (diff < 60_000) return `${Math.floor(diff / 1_000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  return `${Math.floor(diff / 3_600_000)}h ago`;
}
