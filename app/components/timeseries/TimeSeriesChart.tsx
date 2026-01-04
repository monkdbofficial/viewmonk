'use client';

import { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

export interface TimeSeriesDataPoint {
  timestamp: Date;
  value: number;
  series?: string;
}

export interface TimeSeriesSeries {
  name: string;
  data: TimeSeriesDataPoint[];
  color?: string;
  type?: 'line' | 'area';
}

interface TimeSeriesChartProps {
  series: TimeSeriesSeries[];
  title?: string;
  height?: number;
  showZoomControls?: boolean;
  anomalies?: Date[];
}

export default function TimeSeriesChart({
  series,
  title,
  height = 400,
  showZoomControls = true,
  anomalies = [],
}: TimeSeriesChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const [zoomLevel, setZoomLevel] = useState(100);

  useEffect(() => {
    if (!chartRef.current || series.length === 0) return;

    // Initialize or get existing chart instance
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const chart = chartInstance.current;

    // Prepare data for each series
    const seriesOptions = series.map((s, idx) => {
      const sortedData = [...s.data].sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
      );

      const dataPoints = sortedData.map((d) => [
        d.timestamp.getTime(),
        d.value,
      ]);

      const color = s.color || getDefaultColor(idx);

      const baseOption: any = {
        name: s.name,
        type: 'line',
        smooth: true,
        data: dataPoints,
        showSymbol: false,
        itemStyle: {
          color,
        },
        lineStyle: {
          width: 2,
        },
      };

      // Add area style if specified
      if (s.type === 'area') {
        baseOption.areaStyle = {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: `${color}40` },
            { offset: 1, color: `${color}10` },
          ]),
        };
      }

      return baseOption;
    });

    // Add anomaly markers
    if (anomalies.length > 0) {
      const anomalyPoints = anomalies.map((timestamp) => ({
        xAxis: timestamp.getTime(),
        yAxis: 0,
        itemStyle: {
          color: '#ef4444',
        },
      }));

      seriesOptions.push({
        name: 'Anomalies',
        type: 'scatter',
        data: anomalyPoints,
        symbolSize: 10,
        itemStyle: {
          color: '#ef4444',
        },
        z: 10,
      });
    }

    const option: any = {
      title: title
        ? {
            text: title,
            left: 'center',
            textStyle: {
              color: '#1f2937',
              fontSize: 16,
              fontWeight: 600,
            },
          }
        : undefined,
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          label: {
            backgroundColor: '#6a7985',
          },
        },
        formatter: (params: any) => {
          if (!Array.isArray(params)) return '';
          const date = new Date(params[0].value[0]);
          let tooltip = `<div class="font-semibold">${date.toLocaleString()}</div>`;
          params.forEach((param: any) => {
            if (param.seriesName !== 'Anomalies') {
              tooltip += `<div style="color: ${param.color}">${param.seriesName}: ${param.value[1].toFixed(2)}</div>`;
            }
          });
          return tooltip;
        },
      },
      legend: {
        data: series.map((s) => s.name),
        top: title ? 40 : 10,
        textStyle: {
          color: '#6b7280',
        },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        top: title ? 80 : 50,
        containLabel: true,
      },
      xAxis: {
        type: 'time',
        boundaryGap: false,
        axisLine: {
          lineStyle: {
            color: '#e5e7eb',
          },
        },
        axisLabel: {
          color: '#6b7280',
          formatter: (value: number) => {
            const date = new Date(value);
            return date.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            });
          },
        },
        splitLine: {
          lineStyle: {
            color: '#f3f4f6',
          },
        },
      },
      yAxis: {
        type: 'value',
        axisLine: {
          lineStyle: {
            color: '#e5e7eb',
          },
        },
        axisLabel: {
          color: '#6b7280',
        },
        splitLine: {
          lineStyle: {
            color: '#f3f4f6',
          },
        },
      },
      dataZoom: [
        {
          type: 'inside',
          start: 0,
          end: 100,
        },
        {
          start: 0,
          end: 100,
          handleIcon:
            'path://M10.7,11.9v-1.3H9.3v1.3c-4.9,0.3-8.8,4.4-8.8,9.4c0,5,3.9,9.1,8.8,9.4v1.3h1.3v-1.3c4.9-0.3,8.8-4.4,8.8-9.4C19.5,16.3,15.6,12.2,10.7,11.9z M13.3,24.4H6.7V23h6.6V24.4z M13.3,19.6H6.7v-1.4h6.6V19.6z',
          handleSize: '80%',
          handleStyle: {
            color: '#3b82f6',
          },
          textStyle: {
            color: '#6b7280',
          },
          borderColor: '#e5e7eb',
        },
      ],
      series: seriesOptions,
    };

    chart.setOption(option, true);

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [series, title, anomalies]);

  const handleZoomIn = () => {
    if (chartInstance.current) {
      const option = chartInstance.current.getOption() as any;
      const dataZoom = option.dataZoom?.[0];
      if (dataZoom) {
        const range = dataZoom.end - dataZoom.start;
        const center = (dataZoom.start + dataZoom.end) / 2;
        const newRange = range * 0.8;
        chartInstance.current.dispatchAction({
          type: 'dataZoom',
          start: center - newRange / 2,
          end: center + newRange / 2,
        });
        setZoomLevel((prev) => Math.min(prev + 20, 200));
      }
    }
  };

  const handleZoomOut = () => {
    if (chartInstance.current) {
      const option = chartInstance.current.getOption() as any;
      const dataZoom = option.dataZoom?.[0];
      if (dataZoom) {
        const range = dataZoom.end - dataZoom.start;
        const center = (dataZoom.start + dataZoom.end) / 2;
        const newRange = Math.min(range * 1.2, 100);
        chartInstance.current.dispatchAction({
          type: 'dataZoom',
          start: Math.max(center - newRange / 2, 0),
          end: Math.min(center + newRange / 2, 100),
        });
        setZoomLevel((prev) => Math.max(prev - 20, 20));
      }
    }
  };

  const handleResetZoom = () => {
    if (chartInstance.current) {
      chartInstance.current.dispatchAction({
        type: 'dataZoom',
        start: 0,
        end: 100,
      });
      setZoomLevel(100);
    }
  };

  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, []);

  return (
    <div className="relative">
      {showZoomControls && (
        <div className="absolute right-4 top-4 z-10 flex gap-2">
          <button
            onClick={handleZoomIn}
            className="rounded-lg bg-white p-2 shadow-md transition-colors hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700"
            title="Zoom In"
          >
            <ZoomIn className="h-4 w-4 text-gray-600 dark:text-gray-300" />
          </button>
          <button
            onClick={handleZoomOut}
            className="rounded-lg bg-white p-2 shadow-md transition-colors hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700"
            title="Zoom Out"
          >
            <ZoomOut className="h-4 w-4 text-gray-600 dark:text-gray-300" />
          </button>
          <button
            onClick={handleResetZoom}
            className="rounded-lg bg-white p-2 shadow-md transition-colors hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700"
            title="Reset Zoom"
          >
            <Maximize2 className="h-4 w-4 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
      )}
      <div ref={chartRef} style={{ width: '100%', height: `${height}px` }} />
    </div>
  );
}

function getDefaultColor(index: number): string {
  const colors = [
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#14b8a6', // teal
    '#f97316', // orange
  ];
  return colors[index % colors.length];
}
