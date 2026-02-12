'use client';

import { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';

interface ForecastData {
  hour: number;
  timestamp: string;
  aqi: number;
  confidence: number;
}

interface AQIForecastChartProps {
  stationId: string;
  hoursAhead?: number;
}

export default function AQIForecastChart({ stationId, hoursAhead = 24 }: AQIForecastChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forecastData, setForecastData] = useState<ForecastData[]>([]);

  useEffect(() => {
    fetchForecast();
    const interval = setInterval(fetchForecast, 5 * 60 * 1000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, [stationId, hoursAhead]);

  const fetchForecast = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/aqi/forecast?station_id=${stationId}&hours=${hoursAhead}`);
      const data = await response.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      setForecastData(data.predictions || []);
      setError(null);
    } catch (err) {
      setError('Failed to fetch forecast data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!chartRef.current || forecastData.length === 0) return;

    const chart = echarts.init(chartRef.current);

    // Prepare data
    const timestamps = forecastData.map(d => {
      const date = new Date(d.timestamp);
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    });
    const aqiValues = forecastData.map(d => d.aqi);
    const confidenceValues = forecastData.map(d => d.confidence * 100);

    // Calculate confidence bands (upper/lower bounds)
    const upperBound = forecastData.map((d, i) => {
      const variance = (1 - d.confidence) * 50; // Higher uncertainty = wider band
      return d.aqi + variance;
    });
    const lowerBound = forecastData.map((d, i) => {
      const variance = (1 - d.confidence) * 50;
      return Math.max(0, d.aqi - variance);
    });

    const option: echarts.EChartsOption = {
      title: {
        text: `AQI Forecast - ${hoursAhead}h`,
        left: 'center',
        textStyle: {
          color: '#334155',
          fontSize: 16,
          fontWeight: 600,
        },
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
        },
        formatter: (params: any) => {
          const data = params[0];
          const idx = data.dataIndex;
          const forecast = forecastData[idx];
          return `
            <div style="padding: 8px;">
              <strong>${timestamps[idx]}</strong><br/>
              AQI: <span style="color: ${getAQIColor(forecast.aqi)}; font-weight: bold;">${forecast.aqi}</span><br/>
              Confidence: ${(forecast.confidence * 100).toFixed(0)}%<br/>
              Category: ${getAQICategory(forecast.aqi)}
            </div>
          `;
        },
      },
      legend: {
        data: ['Predicted AQI', 'Confidence Band', 'Confidence %'],
        top: 35,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: 80,
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: timestamps,
        boundaryGap: false,
        axisLabel: {
          rotate: 45,
          fontSize: 10,
        },
      },
      yAxis: [
        {
          type: 'value',
          name: 'AQI',
          position: 'left',
          axisLabel: {
            formatter: '{value}',
          },
          splitLine: {
            lineStyle: {
              type: 'dashed',
            },
          },
        },
        {
          type: 'value',
          name: 'Confidence (%)',
          position: 'right',
          min: 0,
          max: 100,
          axisLabel: {
            formatter: '{value}%',
          },
        },
      ],
      series: [
        // Confidence band (area)
        {
          name: 'Confidence Band',
          type: 'line',
          data: upperBound,
          lineStyle: {
            opacity: 0,
          },
          stack: 'confidence',
          symbol: 'none',
          areaStyle: {
            color: 'rgba(59, 130, 246, 0.1)',
          },
          tooltip: {
            show: false,
          },
        },
        {
          name: 'Confidence Band Lower',
          type: 'line',
          data: lowerBound,
          lineStyle: {
            opacity: 0,
          },
          stack: 'confidence',
          symbol: 'none',
          areaStyle: {
            color: 'rgba(59, 130, 246, 0.1)',
          },
          tooltip: {
            show: false,
          },
        },
        // Predicted AQI line
        {
          name: 'Predicted AQI',
          type: 'line',
          data: aqiValues,
          smooth: true,
          lineStyle: {
            width: 3,
            color: '#3b82f6',
          },
          itemStyle: {
            color: (params: any) => {
              return getAQIColor(aqiValues[params.dataIndex]);
            },
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
              { offset: 1, color: 'rgba(59, 130, 246, 0.05)' },
            ]),
          },
          markLine: {
            data: [
              { yAxis: 50, name: 'Good', lineStyle: { color: '#10b981', type: 'dashed' } },
              { yAxis: 100, name: 'Moderate', lineStyle: { color: '#eab308', type: 'dashed' } },
              { yAxis: 150, name: 'Unhealthy (Sensitive)', lineStyle: { color: '#f97316', type: 'dashed' } },
              { yAxis: 200, name: 'Unhealthy', lineStyle: { color: '#ef4444', type: 'dashed' } },
              { yAxis: 300, name: 'Very Unhealthy', lineStyle: { color: '#a855f7', type: 'dashed' } },
            ],
            label: {
              show: false,
            },
          },
        },
        // Confidence percentage line
        {
          name: 'Confidence %',
          type: 'line',
          yAxisIndex: 1,
          data: confidenceValues,
          lineStyle: {
            width: 2,
            type: 'dashed',
            color: '#10b981',
          },
          itemStyle: {
            color: '#10b981',
          },
        },
      ],
    };

    chart.setOption(option);

    // Handle resize
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [forecastData, hoursAhead]);

  const getAQIColor = (aqi: number): string => {
    if (aqi <= 50) return '#10b981'; // Green - Good
    if (aqi <= 100) return '#eab308'; // Yellow - Moderate
    if (aqi <= 150) return '#f97316'; // Orange - Unhealthy for Sensitive
    if (aqi <= 200) return '#ef4444'; // Red - Unhealthy
    if (aqi <= 300) return '#a855f7'; // Purple - Very Unhealthy
    return '#7e1946'; // Maroon - Hazardous
  };

  const getAQICategory = (aqi: number): string => {
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Moderate';
    if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
    if (aqi <= 200) return 'Unhealthy';
    if (aqi <= 300) return 'Very Unhealthy';
    return 'Hazardous';
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading forecast...</p>
        </div>
      </div>
    );
  }

  if (error || forecastData.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="text-center">
          <svg className="mx-auto mb-4 h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {error || 'No forecast data available'}
          </p>
          <p className="mt-2 text-xs text-gray-500">
            AI models may not have run yet. Try running the forecaster manually.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div ref={chartRef} className="h-96 w-full" />
      <div className="mt-4 grid grid-cols-6 gap-2 text-xs">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-green-500"></div>
          <span className="text-gray-600 dark:text-gray-400">Good (0-50)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
          <span className="text-gray-600 dark:text-gray-400">Moderate (51-100)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-orange-500"></div>
          <span className="text-gray-600 dark:text-gray-400">Unhealthy (101-150)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-red-500"></div>
          <span className="text-gray-600 dark:text-gray-400">Unhealthy (151-200)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-purple-500"></div>
          <span className="text-gray-600 dark:text-gray-400">Very Unhealthy (201-300)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-pink-900"></div>
          <span className="text-gray-600 dark:text-gray-400">Hazardous (300+)</span>
        </div>
      </div>
    </div>
  );
}
