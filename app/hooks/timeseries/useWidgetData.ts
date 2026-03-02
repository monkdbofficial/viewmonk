'use client';
import { useState, useCallback, useRef } from 'react';
import { useMonkDBClient } from '@/app/lib/monkdb-context';
import { executeWidget, type ExecutorResult } from '@/app/lib/timeseries/widget-executor';
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
  const abortRef    = useRef<AbortController | null>(null);
  // Monotonically-increasing counter: each `run()` call stamps its sequence number.
  // When the async result arrives, we discard it if a newer run has since started.
  // This prevents stale HTTP responses from overwriting fresh results when the user
  // rapidly changes time ranges or filters before the previous query finishes.
  const runSeqRef   = useRef(0);

  const run = useCallback(
    async (timeRange: TimeRange, activeFilter: ActiveFilter | null, isRefresh = false) => {
      if (!client) return;

      // Cancel any in-flight request (best-effort — MonkDB client has its own timeout)
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      // Stamp this invocation so we can detect stale completions later
      const thisSeq = ++runSeqRef.current;

      setState((prev) => ({
        ...prev,
        status: isRefresh ? 'refreshing' : 'loading',
        error: null,
      }));

      const t0 = Date.now();
      try {
        // Race the query against a timeout so slow/hung MonkDB queries don't
        // block the widget forever.
        const queryPromise = executeWidget(
          widget,
          timeRange,
          activeFilter,
          async (sql) => {
            const r = await client.query(sql);
            return { cols: r.cols, rows: r.rows };
          },
        );
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`Query timed out after ${QUERY_TIMEOUT_MS / 1000}s`)),
            QUERY_TIMEOUT_MS,
          ),
        );
        const res = await Promise.race([queryPromise, timeoutPromise]);

        // Discard result if a newer run has since superseded this one
        if (thisSeq !== runSeqRef.current) return;

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
        // Don't surface error from a superseded run
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

  return { state, result, run };
}
