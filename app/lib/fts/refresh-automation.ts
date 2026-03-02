/**
 * FTS Table Refresh Automation Utilities
 */

export interface RefreshSchedule {
  schema: string;
  table: string;
  enabled: boolean;
  interval: number; // minutes
  lastRefresh?: number; // timestamp
  nextRefresh?: number; // timestamp
  autoRefreshOnInsert: boolean;
}

export interface RefreshHistoryEntry {
  id: string;
  schema: string;
  table: string;
  timestamp: number;
  success: boolean;
  error?: string;
  duration?: number; // ms
  triggeredBy: 'manual' | 'scheduled' | 'auto-insert';
}

const SCHEDULES_KEY = 'monkdb-fts-refresh-schedules';
const HISTORY_KEY = 'monkdb-fts-refresh-history';
const MAX_HISTORY = 100;

/**
 * Get all refresh schedules
 */
export function getRefreshSchedules(): RefreshSchedule[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(SCHEDULES_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Save refresh schedules
 */
export function saveRefreshSchedules(schedules: RefreshSchedule[]): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(SCHEDULES_KEY, JSON.stringify(schedules));
  } catch {
    // storage quota exceeded — in-memory state still intact
  }
}

/**
 * Get schedule for a specific table
 */
export function getTableSchedule(schema: string, table: string): RefreshSchedule | null {
  const schedules = getRefreshSchedules();
  return schedules.find(s => s.schema === schema && s.table === table) || null;
}

/**
 * Update or create schedule for a table
 */
export function updateTableSchedule(schedule: RefreshSchedule): void {
  const schedules = getRefreshSchedules();
  const index = schedules.findIndex(
    s => s.schema === schedule.schema && s.table === schedule.table
  );

  if (index >= 0) {
    schedules[index] = schedule;
  } else {
    schedules.push(schedule);
  }

  saveRefreshSchedules(schedules);
}

/**
 * Delete schedule for a table
 */
export function deleteTableSchedule(schema: string, table: string): void {
  const schedules = getRefreshSchedules();
  const filtered = schedules.filter(s => !(s.schema === schema && s.table === table));
  saveRefreshSchedules(filtered);
}

/**
 * Get refresh history
 */
export function getRefreshHistory(): RefreshHistoryEntry[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Add entry to refresh history
 */
export function addRefreshHistory(entry: Omit<RefreshHistoryEntry, 'id'>): void {
  if (typeof window === 'undefined') return;

  try {
    const history = getRefreshHistory();
    const newEntry: RefreshHistoryEntry = {
      ...entry,
      id: crypto.randomUUID(),
    };

    history.unshift(newEntry);

    // Keep only last MAX_HISTORY entries
    const trimmed = history.slice(0, MAX_HISTORY);

    localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  } catch {
    // storage quota exceeded — in-memory state still intact
  }
}

/**
 * Get refresh history for a specific table
 */
export function getTableRefreshHistory(schema: string, table: string): RefreshHistoryEntry[] {
  const history = getRefreshHistory();
  return history.filter(h => h.schema === schema && h.table === table);
}

/**
 * Clear refresh history
 */
export function clearRefreshHistory(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(HISTORY_KEY);
}

/**
 * Calculate next refresh time based on schedule
 */
export function calculateNextRefresh(schedule: RefreshSchedule): number {
  if (!schedule.enabled) return 0;

  const lastRefresh = schedule.lastRefresh || Date.now();
  const intervalMs = schedule.interval * 60 * 1000;
  return lastRefresh + intervalMs;
}

/**
 * Check if table needs refresh
 */
export function needsRefresh(schedule: RefreshSchedule): boolean {
  if (!schedule.enabled) return false;

  const nextRefresh = calculateNextRefresh(schedule);
  return Date.now() >= nextRefresh;
}

/**
 * Format interval for display
 */
export function formatInterval(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }

  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Format time until next refresh
 */
export function formatTimeUntilRefresh(nextRefresh: number): string {
  if (nextRefresh <= Date.now()) {
    return 'Now';
  }

  const diff = nextRefresh - Date.now();
  const minutes = Math.ceil(diff / 60000);

  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Preset refresh intervals
 */
export const REFRESH_PRESETS = [
  { label: '5 minutes', value: 5 },
  { label: '15 minutes', value: 15 },
  { label: '30 minutes', value: 30 },
  { label: '1 hour', value: 60 },
  { label: '2 hours', value: 120 },
  { label: '6 hours', value: 360 },
  { label: '12 hours', value: 720 },
  { label: '24 hours', value: 1440 },
];
