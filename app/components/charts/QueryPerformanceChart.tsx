'use client';

import { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { useActiveConnection } from '../../lib/monkdb-context';
import { BarChart3, TrendingUp, AlertCircle, RefreshCw } from 'lucide-react';

interface ChartData {
  hours: string[];
  avgTimes: number[];
}

export default function QueryPerformanceChart() {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);
  const chartInitializedRef = useRef(false);
  const activeConnection = useActiveConnection();
  const [chartData, setChartData] = useState<ChartData>({ hours: [], avgTimes: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasData, setHasData] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const fetchData = async () => {
    if (!activeConnection) {
      return;
    }

    try {
      // Only show loading state on initial load, not on refreshes
      if (isInitialLoad) {
        setLoading(true);
      }
      setError(null);

      const query = `
        SELECT
          DATE_TRUNC('hour', started) AS hour,
          AVG(EXTRACT(EPOCH FROM (ended - started)) * 1000) AS avg_duration_ms,
          COUNT(*) AS query_count
        FROM sys.jobs_log
        WHERE started > CURRENT_TIMESTAMP - INTERVAL '1 day'
          AND error IS NULL
        GROUP BY DATE_TRUNC('hour', started)
        ORDER BY hour ASC
      `;

      const result = await activeConnection.client.query(query);

      if (result.rows.length > 0) {
        const hours: string[] = [];
        const avgTimes: number[] = [];

        result.rows.forEach((row: any[]) => {
          const hourTimestamp = row[0];
          const avgDuration = row[1];

          const date = new Date(hourTimestamp);
          const hourStr = `${date.getHours().toString().padStart(2, '0')}:00`;

          // Handle null/undefined/NaN values
          const duration = avgDuration != null && !isNaN(avgDuration) ? Number(avgDuration) : 0;

          hours.push(hourStr);
          avgTimes.push(Math.round(duration * 100) / 100);
        });

        setChartData({ hours, avgTimes });
        setHasData(true);
      } else {
        const now = new Date();
        const hours = [];
        const avgTimes = [];

        for (let i = 23; i >= 0; i--) {
          const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
          hours.push(`${hour.getHours().toString().padStart(2, '0')}:00`);
          avgTimes.push(0);
        }

        setChartData({ hours, avgTimes });
        setHasData(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      setHasData(false);
    } finally {
      if (isInitialLoad) {
        setLoading(false);
        setIsInitialLoad(false);
      }
    }
  };

  useEffect(() => {
    fetchData();
    // Silent background refresh every 30 seconds - no loading state, no blink
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [activeConnection]);

  // Initialize chart once when component mounts
  useEffect(() => {
    if (!chartRef.current || chartInitializedRef.current) return;

    chartInstanceRef.current = echarts.init(chartRef.current, undefined, {
      renderer: 'canvas',
    });
    chartInitializedRef.current = true;

    const handleResize = () => chartInstanceRef.current?.resize();
    window.addEventListener('resize', handleResize);

    // Cleanup only on unmount
    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartInstanceRef.current) {
        try {
          chartInstanceRef.current.dispose();
        } catch {
        }
        chartInstanceRef.current = null;
        chartInitializedRef.current = false;
      }
    };
  }, []); // Run once on mount

  // Update chart data whenever it changes
  useEffect(() => {
    if (!chartInstanceRef.current || !chartData.hours.length) {
      return;
    }

    const isDark = document.documentElement.classList.contains('dark');

    const option = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
        },
        backgroundColor: isDark ? '#1f2937' : '#ffffff',
        borderColor: isDark ? '#374151' : '#e5e7eb',
        textStyle: {
          color: isDark ? '#f3f4f6' : '#111827',
        },
        formatter: (params: any) => {
          const data = params[0];
          return `${data.name}<br/><span style="color: #3b82f6;">●</span> Avg Response: <strong>${data.value.toFixed(2)} ms</strong>`;
        },
      },
      grid: {
        left: '3%',
        right: '3%',
        bottom: '3%',
        top: '10%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: chartData.hours,
        axisLine: {
          lineStyle: {
            color: isDark ? '#374151' : '#e5e7eb',
          },
        },
        axisLabel: {
          color: isDark ? '#9ca3af' : '#6b7280',
          fontSize: 11,
          interval: Math.max(1, Math.floor(chartData.hours.length / 12)),
        },
        axisTick: {
          show: false,
        },
      },
      yAxis: {
        type: 'value',
        name: 'Response Time (ms)',
        nameTextStyle: {
          color: isDark ? '#9ca3af' : '#6b7280',
          fontSize: 11,
          padding: [0, 0, 0, 0],
        },
        axisLine: {
          show: false,
        },
        axisTick: {
          show: false,
        },
        axisLabel: {
          color: isDark ? '#9ca3af' : '#6b7280',
          fontSize: 11,
          formatter: '{value} ms',
        },
        splitLine: {
          lineStyle: {
            color: isDark ? '#374151' : '#f3f4f6',
            type: 'dashed',
          },
        },
      },
      series: [
        {
          name: 'Query Time',
          type: 'bar',
          data: chartData.avgTimes,
          barMaxWidth: 40,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#3b82f6' },
              { offset: 1, color: '#60a5fa' },
            ]),
            borderRadius: [6, 6, 0, 0],
          },
          emphasis: {
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: '#2563eb' },
                { offset: 1, color: '#3b82f6' },
              ]),
            },
          },
        },
      ],
      animationDuration: 300,
    } as any;

    // Update chart data smoothly without recreation
    chartInstanceRef.current.setOption(option, { notMerge: false });
  }, [chartData]);

  return (
    <div className="relative h-[250px] w-full">
      <div ref={chartRef} className="h-full w-full" />

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white dark:bg-gray-800">
          <div className="flex h-full w-full animate-pulse flex-col gap-2 p-4">
            <div className="flex items-end justify-between gap-2">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-lg bg-gray-200 dark:bg-gray-700"
                  style={{ height: `${Math.random() * 150 + 50}px` }}
                />
              ))}
            </div>
          </div>
          <div className="absolute bottom-4 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Loading query performance data...</span>
          </div>
        </div>
      )}

      {/* Error Overlay */}
      {!loading && error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white dark:bg-gray-800">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <AlertCircle className="h-7 w-7 text-red-600 dark:text-red-400" />
          </div>
          <div className="text-center">
            <h3 className="text-sm font-semibold text-red-900 dark:text-red-300">
              Failed to Load Data
            </h3>
            <p className="mt-1 max-w-sm text-xs text-red-700 dark:text-red-400">
              {error}
            </p>
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      )}

      {/* Empty State Overlay */}
      {!loading && !error && !hasData && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/95 dark:bg-gray-800/95">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
            <BarChart3 className="h-7 w-7 text-gray-400 dark:text-gray-500" />
          </div>
          <div className="text-center">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              No Query History Available
            </h3>
            <p className="mt-1 max-w-sm text-xs text-gray-600 dark:text-gray-400">
              Execute queries in the Query Editor to see performance metrics here
            </p>
          </div>
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 dark:border-blue-800 dark:bg-blue-900/20">
            <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-medium text-blue-900 dark:text-blue-300">
              Data will appear here automatically
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
