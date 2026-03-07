// ── Widget Query Result Cache ─────────────────────────────────────────────────
// Module-level (per browser tab), survives React re-renders.
// Entries are keyed by widgetId + time range + filter + variables.
// Supports stale-while-revalidate: callers check `fresh` to decide whether to
// background-refresh while immediately serving the stale entry.

import type { ExecutorResult } from './widget-executor';
import type { TimeRange, ActiveFilter } from './types';

interface CacheEntry {
  result: ExecutorResult;
  fetchedAt: number;
  ttl: number; // ms
}

const CACHE = new Map<string, CacheEntry>();

// ── Key construction ──────────────────────────────────────────────────────────

export function makeCacheKey(
  widgetId: string,
  timeRange: TimeRange,
  filter: ActiveFilter | null,
  variables?: Record<string, string>,
): string {
  return [
    widgetId,
    timeRange.from.getTime(),
    timeRange.to.getTime(),
    filter ? `${filter.column}=${filter.value}` : '',
    variables ? Object.entries(variables).sort().map(([k, v]) => `${k}=${v}`).join('&') : '',
  ].join('|');
}

// ── Cache operations ──────────────────────────────────────────────────────────

export function getCached(key: string): { entry: CacheEntry; fresh: boolean } | null {
  const entry = CACHE.get(key);
  if (!entry) return null;
  const fresh = Date.now() - entry.fetchedAt < entry.ttl;
  return { entry, fresh };
}

export function setCached(key: string, result: ExecutorResult, ttl: number): void {
  CACHE.set(key, { result, fetchedAt: Date.now(), ttl });
}

/** Remove all cache entries belonging to a specific widget */
export function invalidateWidget(widgetId: string): void {
  for (const key of CACHE.keys()) {
    if (key.startsWith(`${widgetId}|`)) CACHE.delete(key);
  }
}

/** Age of a cache entry in milliseconds, or 0 if not cached */
export function cacheAgeMs(key: string): number {
  const entry = CACHE.get(key);
  return entry ? Date.now() - entry.fetchedAt : 0;
}
