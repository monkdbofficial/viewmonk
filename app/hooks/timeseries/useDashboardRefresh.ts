'use client';
import { useEffect, useLayoutEffect, useRef, useCallback } from 'react';

export function useDashboardRefresh(
  interval: number | 'manual',
  onRefresh: () => void,
) {
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const onRefreshRef = useRef(onRefresh);

  // Keep the ref up-to-date without re-running the interval effect
  useLayoutEffect(() => {
    onRefreshRef.current = onRefresh;
  });

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    clear();
    if (interval === 'manual' || typeof interval !== 'number') return;

    timerRef.current = setInterval(() => {
      // Pause when tab is hidden (saves DB load)
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      onRefreshRef.current();
    }, interval);

    return clear;
  }, [interval, clear]);

  // When tab becomes visible again → immediate refresh
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handle = () => {
      if (document.visibilityState === 'visible' && interval !== 'manual') {
        onRefreshRef.current();
      }
    };
    document.addEventListener('visibilitychange', handle);
    return () => document.removeEventListener('visibilitychange', handle);
  }, [interval]);

  return { clear };
}
