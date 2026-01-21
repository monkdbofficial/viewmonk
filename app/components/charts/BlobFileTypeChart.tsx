'use client';

import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

interface FileTypeData {
  contentType: string;
  count: number;
  size: number;
}

interface BlobFileTypeChartProps {
  data: FileTypeData[];
}

export default function BlobFileTypeChart({ data }: BlobFileTypeChartProps) {
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
    if (!chartInstanceRef.current || !data || data.length === 0) return;

    const isDark = document.documentElement.classList.contains('dark');

    const getFileTypeIcon = (type: string) => {
      if (type.startsWith('image/')) return '🖼️';
      if (type.startsWith('video/')) return '🎥';
      if (type.startsWith('audio/')) return '🎵';
      if (type.includes('pdf')) return '📄';
      if (type.includes('text')) return '📝';
      return '📁';
    };

    const chartData = data.slice(0, 8).map((item) => ({
      name: `${getFileTypeIcon(item.contentType)} ${item.contentType}`,
      value: item.size,
      count: item.count,
    }));

    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

    const option = {
      tooltip: {
        trigger: 'item',
        backgroundColor: isDark ? '#1f2937' : '#ffffff',
        borderColor: isDark ? '#374151' : '#e5e7eb',
        textStyle: {
          color: isDark ? '#f3f4f6' : '#111827',
        },
        formatter: (params: any) => {
          const sizeInMB = (params.value / (1024 * 1024)).toFixed(2);
          const percentage = params.percent;
          return `<strong>${params.name}</strong><br/>
            <span style="color: #3b82f6;">●</span> Files: <strong>${params.data.count}</strong><br/>
            <span style="color: #10b981;">●</span> Size: <strong>${sizeInMB} MB</strong><br/>
            <span style="color: #f59e0b;">●</span> Share: <strong>${percentage}%</strong>`;
        },
      },
      legend: {
        orient: 'vertical',
        left: 'left',
        top: 'center',
        textStyle: {
          color: isDark ? '#9ca3af' : '#6b7280',
          fontSize: 11,
        },
        formatter: (name: string) => {
          const item = chartData.find((d) => d.name === name);
          return `${name} (${item?.count || 0})`;
        },
      },
      series: [
        {
          name: 'File Types',
          type: 'pie',
          radius: ['45%', '70%'],
          center: ['60%', '50%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 8,
            borderColor: isDark ? '#1f2937' : '#ffffff',
            borderWidth: 3,
          },
          label: {
            show: false,
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 14,
              fontWeight: 'bold',
              color: isDark ? '#f3f4f6' : '#111827',
              formatter: (params: any) => {
                const sizeInMB = (params.value / (1024 * 1024)).toFixed(1);
                return `{name|${params.name}}\n{value|${sizeInMB} MB}`;
              },
              rich: {
                name: {
                  fontSize: 13,
                  fontWeight: 'bold',
                  lineHeight: 18,
                  color: isDark ? '#f3f4f6' : '#111827',
                },
                value: {
                  fontSize: 11,
                  lineHeight: 16,
                  color: isDark ? '#9ca3af' : '#6b7280',
                },
              },
            },
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.2)',
            },
          },
          labelLine: {
            show: false,
          },
          data: chartData,
          color: colors,
        },
      ],
      animationDuration: 500,
    } as any;

    chartInstanceRef.current.setOption(option, { notMerge: false });
  }, [data]);

  return <div ref={chartRef} className="h-[300px] w-full" />;
}
