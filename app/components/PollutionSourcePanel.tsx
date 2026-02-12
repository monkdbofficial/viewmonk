'use client';

import { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';

interface SourceData {
  source: string;
  confidence: number;
  evidence?: any;
  pollutants?: any;
}

interface PollutionSourcePanelProps {
  stationId?: string;
}

export default function PollutionSourcePanel({ stationId }: PollutionSourcePanelProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sourceData, setSourceData] = useState<SourceData | null>(null);

  useEffect(() => {
    fetchClassification();
    const interval = setInterval(fetchClassification, 2 * 60 * 1000); // Refresh every 2 minutes
    return () => clearInterval(interval);
  }, [stationId]);

  const fetchClassification = async () => {
    try {
      setLoading(true);
      const url = stationId
        ? `/api/aqi/classification?station_id=${stationId}`
        : `/api/aqi/classification`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      if (stationId) {
        setSourceData(data);
      } else {
        // For aggregated view, use breakdown
        setSourceData(data.source_breakdown || null);
      }

      setError(null);
    } catch (err) {
      setError('Failed to fetch classification data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!chartRef.current || !sourceData) return;

    const chart = echarts.init(chartRef.current);

    // Prepare data for pie chart
    const pieData = stationId && 'source' in sourceData
      ? [
          { value: sourceData.confidence * 100, name: sourceData.source },
          { value: (1 - sourceData.confidence) * 100, name: 'Other Factors' },
        ]
      : Object.entries(sourceData).map(([source, data]: [string, any]) => ({
          value: data.percentage || data.count || 0,
          name: source.replace(/_/g, ' '),
        }));

    const option: echarts.EChartsOption = {
      title: {
        text: stationId ? 'Primary Pollution Source' : 'Pollution Sources Breakdown',
        left: 'center',
        textStyle: {
          color: '#334155',
          fontSize: 16,
          fontWeight: 600,
        },
      },
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c}%<br/>Confidence: {d}%',
      },
      legend: {
        orient: 'vertical',
        right: 10,
        top: 'center',
        textStyle: {
          fontSize: 12,
        },
      },
      series: [
        {
          name: 'Pollution Source',
          type: 'pie',
          radius: ['40%', '70%'],
          center: ['40%', '55%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 8,
            borderColor: '#fff',
            borderWidth: 2,
          },
          label: {
            show: true,
            formatter: '{b}\n{d}%',
            fontSize: 12,
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 14,
              fontWeight: 'bold',
            },
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
            },
          },
          data: pieData.map((item) => ({
            ...item,
            itemStyle: {
              color: getSourceColor(item.name),
            },
          })),
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
  }, [sourceData, stationId]);

  const getSourceColor = (source: string): string => {
    const colors: Record<string, string> = {
      TRAFFIC: '#ef4444',
      INDUSTRIAL: '#8b5cf6',
      CONSTRUCTION: '#f59e0b',
      'REGIONAL DRIFT': '#06b6d4',
      'REGIONAL_DRIFT': '#06b6d4',
      'BIOMASS BURNING': '#84cc16',
      'BIOMASS_BURNING': '#84cc16',
      MIXED: '#6b7280',
      'Other Factors': '#d1d5db',
    };
    return colors[source] || '#94a3b8';
  };

  const getSourceIcon = (source: string): string => {
    const icons: Record<string, string> = {
      TRAFFIC: '🚗',
      INDUSTRIAL: '🏭',
      CONSTRUCTION: '🏗️',
      REGIONAL_DRIFT: '🌫️',
      BIOMASS_BURNING: '🔥',
      MIXED: '🔄',
    };
    return icons[source] || '❓';
  };

  const getRecommendation = (source: string): string => {
    const recommendations: Record<string, string> = {
      TRAFFIC: 'Consider traffic rerouting, odd-even vehicle scheme, or public transport incentives',
      INDUSTRIAL: 'Alert industrial facilities to reduce emissions, enforce compliance checks',
      CONSTRUCTION: 'Issue dust control measures, water spraying, cover exposed areas',
      REGIONAL_DRIFT: 'Regional coordination needed, monitor upwind sources',
      BIOMASS_BURNING: 'Enforce ban on crop burning, public awareness campaign',
      MIXED: 'Multiple sources detected, implement comprehensive mitigation measures',
    };
    return recommendations[source] || 'Monitor situation and implement general pollution control measures';
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-purple-500 border-t-transparent"></div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading classification...</p>
        </div>
      </div>
    );
  }

  if (error || !sourceData) {
    return (
      <div className="flex h-96 items-center justify-center rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="text-center">
          <svg className="mx-auto mb-4 h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {error || 'No classification data available'}
          </p>
          <p className="mt-2 text-xs text-gray-500">
            AI classifier may not have run yet. Try running it manually.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <div ref={chartRef} className="h-80 w-full p-4" />

      {stationId && 'source' in sourceData && (
        <div className="border-t border-gray-200 p-4 dark:border-gray-700">
          <div className="mb-4 flex items-center gap-3">
            <span className="text-4xl">{getSourceIcon(sourceData.source)}</span>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {sourceData.source.replace(/_/g, ' ')}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Confidence: {(sourceData.confidence * 100).toFixed(0)}%
              </p>
            </div>
          </div>

          {sourceData.evidence && Object.keys(sourceData.evidence).length > 0 && (
            <div className="mb-4">
              <h4 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Evidence:</h4>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(sourceData.evidence).map(([key, value]) => (
                  <div key={key} className="rounded bg-gray-50 px-3 py-2 dark:bg-gray-700">
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {key.replace(/_/g, ' ')}: <strong>{String(value)}</strong>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
            <h4 className="mb-1 flex items-center gap-2 text-sm font-semibold text-blue-900 dark:text-blue-300">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Recommended Action:
            </h4>
            <p className="text-xs text-blue-800 dark:text-blue-400">
              {getRecommendation(sourceData.source)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
