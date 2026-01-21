'use client';

import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

interface StorageTrendsChartProps {
  totalSize: number;
  activeFiles: number;
  trashedSize: number;
  totalFiles: number;
}

export default function BlobStorageTrendsChart({
  totalSize,
  activeFiles,
  trashedSize,
  totalFiles,
}: StorageTrendsChartProps) {
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

    const activeSize = totalSize - trashedSize;
    const sizeInGB = (bytes: number) => (bytes / (1024 * 1024 * 1024)).toFixed(2);

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
        formatter: (params: any) => {
          let result = '<strong>Storage Overview</strong><br/>';
          params.forEach((param: any) => {
            result += `<span style="color: ${param.color};">●</span> ${param.seriesName}: <strong>${param.value}</strong><br/>`;
          });
          return result;
        },
      },
      legend: {
        data: ['Total Files', 'Active Files', 'Storage (GB)'],
        textStyle: {
          color: isDark ? '#9ca3af' : '#6b7280',
        },
        bottom: 0,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        top: '10%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: ['Files', 'Storage'],
        axisLine: {
          lineStyle: {
            color: isDark ? '#4b5563' : '#d1d5db',
          },
        },
        axisLabel: {
          color: isDark ? '#9ca3af' : '#6b7280',
        },
      },
      yAxis: {
        type: 'value',
        axisLine: {
          lineStyle: {
            color: isDark ? '#4b5563' : '#d1d5db',
          },
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
      series: [
        {
          name: 'Total Files',
          type: 'bar',
          data: [totalFiles, null],
          itemStyle: {
            color: '#3b82f6',
            borderRadius: [8, 8, 0, 0],
          },
          barWidth: '40%',
        },
        {
          name: 'Active Files',
          type: 'bar',
          data: [activeFiles, null],
          itemStyle: {
            color: '#10b981',
            borderRadius: [8, 8, 0, 0],
          },
          barWidth: '40%',
        },
        {
          name: 'Storage (GB)',
          type: 'bar',
          data: [null, parseFloat(sizeInGB(totalSize))],
          itemStyle: {
            color: '#f59e0b',
            borderRadius: [8, 8, 0, 0],
          },
          barWidth: '40%',
        },
      ],
      animationDuration: 500,
    } as any;

    chartInstanceRef.current.setOption(option, { notMerge: false });
  }, [totalSize, activeFiles, trashedSize, totalFiles]);

  return <div ref={chartRef} className="h-[280px] w-full" />;
}
