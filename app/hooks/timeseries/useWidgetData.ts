'use client';
import { useState, useCallback, useRef } from 'react';
import { useMonkDBClient } from '@/app/lib/monkdb-context';
import { executeWidget, type ExecutorResult } from '@/app/lib/timeseries/widget-executor';
import { makeCacheKey, getCached, setCached, invalidateWidget, cacheAgeMs } from '@/app/lib/timeseries/widget-cache';
import type { WidgetConfig, WidgetRuntimeState, TimeRange, ActiveFilter } from '@/app/lib/timeseries/types';

/** Maximum time (ms) a widget query is allowed to run before it's aborted with a timeout error. */
const QUERY_TIMEOUT_MS = 30_000;

export function useWidgetData(widget: WidgetConfig) {
  const client = useMonkDBClient();
  const [state, setState] = useState<WidgetRuntimeState>({
    widgetId: widget.id,
    status: 'idle',
    data: [],
    columns: [],
    error: null,
    lastUpdated: null,
    executionTime: 0,
  });
  const [result, setResult] = useState<ExecutorResult | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [cacheKey, setCacheKey] = useState<string | null>(null);

  const abortRef  = useRef<AbortController | null>(null);
  // Monotonically-increasing counter: each `run()` call stamps its sequence number.
  // When the async result arrives, we discard it if a newer run has since started.
  const runSeqRef = useRef(0);

  const run = useCallback(
    async (timeRange: TimeRange, activeFilter: ActiveFilter | null, isRefresh = false, variables?: Record<string, string>) => {
      if (!client) return;

      const cacheEnabled = widget.dataSource.cacheEnabled ?? false;
      const cacheTtl     = widget.dataSource.cacheTtl ?? 60_000;
      const key = makeCacheKey(widget.id, timeRange, activeFilter, variables);
      setCacheKey(key);

      // ── Cache check (skip when manually refreshing) ──────────────────────
      if (cacheEnabled && !isRefresh) {
        const hit = getCached(key);
        if (hit) {
          // Serve cached result immediately
          setResult(hit.entry.result);
          setFromCache(true);
          setState((prev) => ({
            ...prev,
            status: 'loaded',
            error: null,
            lastUpdated: new Date(hit.entry.fetchedAt),
            executionTime: 0,
          }));

          if (hit.fresh) return; // Fresh hit — no background re-fetch needed
          // Stale hit — fall through to background re-fetch (status stays 'loaded')
        }
      }

      // ── Network fetch ────────────────────────────────────────────────────
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      const thisSeq = ++runSeqRef.current;

      // Only show loading spinner if we have no cached data to show
      const hasCachedData = cacheEnabled && !isRefresh && getCached(key) !== null;
      if (!hasCachedData) {
        setState((prev) => ({
          ...prev,
          status: isRefresh ? 'refreshing' : 'loading',
          error: null,
        }));
      }

      const t0 = Date.now();
      try {
        const queryFn = async (sql: string) => {
          const r = await client.query(sql);
          return { cols: r.cols, rows: r.rows };
        };

        const queryPromise = (async (): Promise<ExecutorResult> => {
          let res = await executeWidget(widget, timeRange, activeFilter, queryFn, variables);

          // Time-range comparison: run a second query for the previous period
          const compareWith = widget.dataSource.compareWith;
          if (compareWith && (widget.type === 'line-chart' || widget.type === 'area-chart') && res.series) {
            const rangeMs = timeRange.to.getTime() - timeRange.from.getTime();
            const offsetMs =
              compareWith === 'previous-week'  ? 7  * 24 * 60 * 60 * 1000 :
              compareWith === 'previous-month' ? 30 * 24 * 60 * 60 * 1000 :
              rangeMs;

            const compareRange: TimeRange = {
              preset: timeRange.preset,
              from: new Date(timeRange.from.getTime() - offsetMs),
              to:   new Date(timeRange.to.getTime()   - offsetMs),
            };

            try {
              const compareWidget = { ...widget, dataSource: { ...widget.dataSource, compareWith: undefined } };
              const compareRes = await executeWidget(compareWidget, compareRange, activeFilter, queryFn, variables);
              if (compareRes.series) {
                const prevSeries = compareRes.series.map((s) => ({
                  name: `${s.name} (prev)`,
                  data: s.data.map(([ts, v]) => [
                    new Date(new Date(ts).getTime() + offsetMs).toISOString(),
                    v,
                  ] as [string, number]),
                }));
                res = { ...res, series: [...res.series, ...prevSeries] };
              }
            } catch {
              // Comparison query failure is non-fatal
            }
          }

          return res;
        })();

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`Query timed out after ${QUERY_TIMEOUT_MS / 1000}s`)),
            QUERY_TIMEOUT_MS,
          ),
        );
        const res = await Promise.race([queryPromise, timeoutPromise]);

        if (thisSeq !== runSeqRef.current) return;

        // Store in cache if enabled
        if (cacheEnabled) {
          setCached(key, res, cacheTtl);
        }

        const executionTime = Date.now() - t0;
        const hasData =
          res.raw.length > 0 ||
          (res.series        && res.series.some((s) => s.data.length > 0)) ||
          (res.pieSlices     && res.pieSlices.length > 0) ||
          (res.scatterPoints && res.scatterPoints.length > 0) ||
          (res.tableRows     && res.tableRows.length > 0) ||
          (res.treemapNodes  && res.treemapNodes.length > 0) ||
          (res.candleData    && res.candleData.length > 0) ||
          (res.progressItems && res.progressItems.length > 0) ||
          res.statValue != null ||
          res.gaugeValue != null;

        setResult(res);
        setFromCache(false);
        setState({
          widgetId: widget.id,
          status: hasData ? 'loaded' : 'no-data',
          data: res.raw,
          columns: res.columns,
          error: null,
          lastUpdated: new Date(),
          executionTime,
        });
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
        if (thisSeq !== runSeqRef.current) return;
        setState((prev) => ({
          ...prev,
          status: 'error',
          error: e instanceof Error ? e.message : 'Query failed',
          executionTime: Date.now() - t0,
        }));
      }
    },
    [client, widget],
  );

  /** Evict all cache entries for this widget and force a fresh fetch */
  const clearCache = useCallback(() => {
    invalidateWidget(widget.id);
  }, [widget.id]);

  /** Current age of the cached result in ms (0 if not cached) */
  const cachedResultAge = cacheKey ? cacheAgeMs(cacheKey) : 0;

  return { state, result, run, fromCache, cachedResultAge, clearCache };
}
