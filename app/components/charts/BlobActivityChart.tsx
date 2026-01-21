'use client';

import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

interface BlobActivityChartProps {
  recentUploads: number;
  totalDownloads: number;
  activeUsers: number;
  favoriteCount: number;
}

export default function BlobActivityChart({
  recentUploads,
  totalDownloads,
  activeUsers,
  favoriteCount,
}: BlobActivityChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    if (!chartInstanceRef.current) {
      chartInstanceRef.current = echarts.init(chartRef.current, undefined, {
        renderer: 'canvas',
      });

      const handleResize = () => chartInstanceRef.current?.resize();
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        if (chartInstanceRef.current) {
          chartInstanceRef.current.dispose();
          chartInstanceRef.current = null;
        }
      };
    }
  }, []);

  useEffect(() => {
    if (!chartInstanceRef.current) return;

    const isDark = document.documentElement.classList.contains('dark');

    const option = {
      tooltip: {
        trigger: 'axis',
        backgroundColor: isDark ? '#1f2937' : '#ffffff',
        borderColor: isDark ? '#374151' : '#e5e7eb',
        textStyle: {
          color: isDark ? '#f3f4f6' : '#111827',
        },
        axisPointer: {
          type: 'shadow',
        },
      },
      legend: {
        data: ['Count'],
        show: false,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '3%',
        containLabel: true,
      },
      xAxis: {
        type: 'value',
        axisLine: {
          show: false,
        },
        axisTick: {
          show: false,
        },
        axisLabel: {
          color: isDark ? '#9ca3af' : '#6b7280',
        },
        splitLine: {
          lineStyle: {
            color: isDark ? '#374151' : '#f3f4f6',
          },
        },
      },
      yAxis: {
        type: 'category',
        data: ['Recent Uploads\n(30 days)', 'Total Downloads', 'Active Users', 'Favorites'],
        axisLine: {
          lineStyle: {
            color: isDark ? '#4b5563' : '#d1d5db',
          },
        },
        axisLabel: {
          color: isDark ? '#9ca3af' : '#6b7280',
          fontSize: 11,
        },
        axisTick: {
          show: false,
        },
      },
      series: [
        {
          name: 'Activity',
          type: 'bar',
          data: [
            {
              value: recentUploads,
              itemStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                  { offset: 0, color: '#10b981' },
                  { offset: 1, color: '#34d399' },
                ]),
                borderRadius: [0, 8, 8, 0],
              },
            },
            {
              value: totalDownloads,
              itemStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                  { offset: 0, color: '#3b82f6' },
                  { offset: 1, color: '#60a5fa' },
                ]),
                borderRadius: [0, 8, 8, 0],
              },
            },
            {
              value: activeUsers,
              itemStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                  { offset: 0, color: '#8b5cf6' },
                  { offset: 1, color: '#a78bfa' },
                ]),
                borderRadius: [0, 8, 8, 0],
              },
            },
            {
              value: favoriteCount,
              itemStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                  { offset: 0, color: '#f59e0b' },
                  { offset: 1, color: '#fbbf24' },
                ]),
                borderRadius: [0, 8, 8, 0],
              },
            },
          ],
          barWidth: '50%',
          label: {
            show: true,
            position: 'right',
            color: isDark ? '#f3f4f6' : '#111827',
            fontWeight: 'bold',
            fontSize: 13,
          },
        },
      ],
      animationDuration: 500,
    } as any;

    chartInstanceRef.current.setOption(option, { notMerge: false });
  }, [recentUploads, totalDownloads, activeUsers, favoriteCount]);

  return <div ref={chartRef} className="h-[280px] w-full" />;
}
