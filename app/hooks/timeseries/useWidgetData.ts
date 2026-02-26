'use client';
import { useState, useCallback, useRef } from 'react';
import { useMonkDBClient } from '@/app/lib/monkdb-context';
import { executeWidget, type ExecutorResult } from '@/app/lib/timeseries/widget-executor';
import type { WidgetConfig, WidgetRuntimeState, TimeRange, ActiveFilter } from '@/app/lib/timeseries/types';

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
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(
    async (timeRange: TimeRange, activeFilter: ActiveFilter | null, isRefresh = false) => {
      if (!client) return;

      // Cancel any in-flight request
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      setState((prev) => ({
        ...prev,
        status: isRefresh ? 'refreshing' : 'loading',
        error: null,
      }));

      const t0 = Date.now();
      try {
        const res = await executeWidget(
          widget,
          timeRange,
          activeFilter,
          async (sql) => {
            const r = await client.query(sql);
            return { cols: r.cols, rows: r.rows };
          },
        );

        const executionTime = Date.now() - t0;
        const hasData =
          res.raw.length > 0 ||
          (res.series && res.series.some((s) => s.data.length > 0)) ||
          (res.pieSlices && res.pieSlices.length > 0) ||
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
