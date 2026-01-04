'use client';

import { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { useActiveConnection } from '../../lib/monkdb-context';
import { Activity, TrendingUp, AlertCircle, RefreshCw } from 'lucide-react';

interface QueryStats {
  timeLabel: string;
  queryCount: number;
  avgDuration: number;
}

export default function PerformanceChart() {
  const chartRef = useRef<HTMLDivElement>(null);
  const activeConnection = useActiveConnection();
  const [stats, setStats] = useState<QueryStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasData, setHasData] = useState(false);

  const fetchStats = async () => {
    if (!activeConnection) return;

    try {
      setLoading(true);
      setError(null);

      const query = `
        SELECT
          DATE_TRUNC('hour', started) AS hour,
          COUNT(*) AS query_count,
          AVG(ended - started) AS avg_duration_ms
        FROM sys.jobs_log
        WHERE started > CURRENT_TIMESTAMP - INTERVAL '24 hours'
          AND error IS NULL
        GROUP BY DATE_TRUNC('hour', started)
        ORDER BY hour ASC
      `;

      const result = await activeConnection.client.query(query);

      if (result.rows.length > 0) {
        console.log('PerformanceChart: Fetched', result.rows.length, 'hourly data points');
        const hours: QueryStats[] = result.rows.map((row: any[]) => {
          const hourTimestamp = row[0];
          const queryCount = row[1] || 0;
          const avgDuration = row[2] || 0;

          const date = new Date(hourTimestamp);
          const hourStr = `${date.getHours().toString().padStart(2, '0')}:00`;

          return {
            timeLabel: hourStr,
            queryCount,
            avgDuration: Math.round(avgDuration * 100) / 100,
          };
        });

        setStats(hours);
        setHasData(true);
      } else {
        console.log('PerformanceChart: No query history found');
        const now = new Date();
        const hours = [];

        for (let i = 23; i >= 0; i--) {
          const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
          hours.push({
            timeLabel: `${hour.getHours().toString().padStart(2, '0')}:00`,
            queryCount: 0,
            avgDuration: 0,
          });
        }

        setStats(hours);
        setHasData(false);
      }
    } catch (err) {
      console.error('PerformanceChart: Error fetching stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      setHasData(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [activeConnection]);

  useEffect(() => {
    if (!chartRef.current || stats.length === 0 || loading) return;

    const chart = echarts.init(chartRef.current, undefined, {
      renderer: 'canvas',
    });

    const isDark = document.documentElement.classList.contains('dark');

    const timeLabels = stats.map((s) => s.timeLabel);
    const queryData = stats.map((s) => s.queryCount);
    const responseTimeData = stats.map((s) => s.avgDuration);

    const option = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          crossStyle: {
            color: isDark ? '#6b7280' : '#9ca3af',
          },
        },
        backgroundColor: isDark ? '#1f2937' : '#ffffff',
        borderColor: isDark ? '#374151' : '#e5e7eb',
        textStyle: {
          color: isDark ? '#f3f4f6' : '#111827',
        },
        formatter: (params: any) => {
          const time = params[0].name;
          const queries = params[0].value;
          const avgTime = params[1].value;
          return `<strong>${time}</strong><br/>
            <span style="color: #3b82f6;">●</span> Queries: <strong>${queries}</strong><br/>
            <span style="color: #10b981;">●</span> Avg Response: <strong>${avgTime.toFixed(2)} ms</strong>`;
        },
      },
      legend: {
        data: ['Query Count', 'Avg Response Time (ms)'],
        textStyle: {
          color: isDark ? '#9ca3af' : '#6b7280',
          fontSize: 11,
        },
        top: 0,
        left: 'center',
      },
      grid: {
        left: '3%',
        right: '3%',
        bottom: '3%',
        top: '15%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: timeLabels,
        axisLine: {
          lineStyle: {
            color: isDark ? '#374151' : '#e5e7eb',
          },
        },
        axisLabel: {
          color: isDark ? '#9ca3af' : '#6b7280',
          fontSize: 11,
          interval: Math.max(1, Math.floor(timeLabels.length / 12)),
        },
        axisTick: {
          show: false,
        },
      },
      yAxis: [
        {
          type: 'value',
          name: 'Queries',
          position: 'left',
          nameTextStyle: {
            color: isDark ? '#9ca3af' : '#6b7280',
            fontSize: 11,
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
          },
          splitLine: {
            lineStyle: {
              color: isDark ? '#374151' : '#f3f4f6',
              type: 'dashed',
            },
          },
        },
        {
          type: 'value',
          name: 'Response Time',
          position: 'right',
          nameTextStyle: {
            color: isDark ? '#9ca3af' : '#6b7280',
            fontSize: 11,
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
            show: false,
          },
        },
      ],
      series: [
        {
          name: 'Query Count',
          type: 'line',
          smooth: true,
          data: queryData,
          itemStyle: {
            color: '#3b82f6',
          },
          lineStyle: {
            width: 2,
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(59, 130, 246, 0.25)' },
              { offset: 1, color: 'rgba(59, 130, 246, 0.02)' },
            ]),
          },
          symbol: 'circle',
          symbolSize: 6,
        },
        {
          name: 'Avg Response Time (ms)',
          type: 'line',
          smooth: true,
          yAxisIndex: 1,
          data: responseTimeData,
          itemStyle: {
            color: '#10b981',
          },
          lineStyle: {
            width: 2,
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(16, 185, 129, 0.25)' },
              { offset: 1, color: 'rgba(16, 185, 129, 0.02)' },
            ]),
          },
          symbol: 'circle',
          symbolSize: 6,
        },
      ],
      animationDuration: 750,
    } as any;

    chart.setOption(option);

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [stats, loading]);

  // Loading Skeleton
  if (loading) {
    return (
      <div className="flex h-[300px] w-full animate-pulse flex-col gap-3">
        <div className="flex h-full flex-col gap-2">
          <div className="flex items-end justify-between gap-1">
            {Array.from({ length: 24 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm bg-gray-200 dark:bg-gray-700"
                style={{ height: `${Math.random() * 200 + 50}px` }}
              />
            ))}
          </div>
        </div>
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Loading performance metrics...</span>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="flex h-[300px] w-full flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-red-300 bg-red-50/50 dark:border-red-800 dark:bg-red-900/10">
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
          onClick={fetchStats}
          className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      </div>
    );
  }

  // Empty State
  if (!hasData) {
    return (
      <div className="relative h-[300px] w-full">
        <div ref={chartRef} className="h-full w-full" />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/95 dark:bg-gray-800/95">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
            <Activity className="h-7 w-7 text-gray-400 dark:text-gray-500" />
          </div>
          <div className="text-center">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              No Performance Data Available
            </h3>
            <p className="mt-1 max-w-sm text-xs text-gray-600 dark:text-gray-400">
              Execute queries to see performance trends and query counts
            </p>
          </div>
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 dark:border-blue-800 dark:bg-blue-900/20">
            <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-medium text-blue-900 dark:text-blue-300">
              Metrics will populate automatically
            </span>
          </div>
        </div>
      </div>
    );
  }

  return <div ref={chartRef} className="h-[300px] w-full" />;
}
