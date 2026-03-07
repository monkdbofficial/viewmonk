'use client';

import { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { useActiveConnection } from '../../lib/monkdb-context';

interface MetricsData {
  cpu: number[];
  memory: number[];
  disk: number[];
  load: number[];
}

export default function SystemMetricsChart() {
  const chartRef = useRef<HTMLDivElement>(null);
  const activeConnection = useActiveConnection();
  const [data, setData] = useState<MetricsData>({
    cpu: [],
    memory: [],
    disk: [],
    load: [],
  });

  useEffect(() => {
    if (!activeConnection) return;

    // Initialize with empty data
    const initialData: MetricsData = {
      cpu: Array(60).fill(0),
      memory: Array(60).fill(0),
      disk: Array(60).fill(0),
      load: Array(60).fill(0),
    };
    setData(initialData);

    // Fetch real metrics from MonkDB nodes
    const fetchMetrics = async () => {
      try {
        const result = await activeConnection.client.query(`
          SELECT
            AVG(load['1']) as avg_load,
            AVG(heap['used']::float / NULLIF(heap['max'], 0) * 100) as avg_memory_pct,
            AVG(fs['total']['used']::float / NULLIF(fs['total']['size'], 0) * 100) as avg_disk_pct
          FROM sys.nodes
        `);

        if (result.rows && result.rows.length > 0) {
          const row = result.rows[0];
          const load = row[0] ? Math.min(row[0] * 10, 100) : 0; // Scale load to percentage
          const memory = row[1] || 0;
          const disk = row[2] || 0;

          setData(prev => ({
            cpu: [...prev.cpu.slice(1), load],
            memory: [...prev.memory.slice(1), memory],
            disk: [...prev.disk.slice(1), disk],
            load: [...prev.load.slice(1), load],
          }));
        }
      } catch {
      }
    };

    // Initial fetch
    fetchMetrics();

    // Update data every 5 seconds
    const interval = setInterval(fetchMetrics, 5000);

    return () => clearInterval(interval);
  }, [activeConnection]);

  useEffect(() => {
    if (!chartRef.current) return;

    const chart = echarts.init(chartRef.current);

    const timeLabels = Array.from({ length: 60 }, (_, i) => {
      const seconds = 60 - i;
      return `${seconds}s`;
    }).reverse();

    const option = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross'
        }
      },
      legend: {
        data: ['Load Avg', 'Memory', 'Disk Usage'],
        textStyle: {
          color: '#6b7280'
        },
        bottom: 0
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '10%',
        top: '5%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: timeLabels,
        axisLine: {
          lineStyle: {
            color: '#e5e7eb'
          }
        },
        axisLabel: {
          color: '#6b7280',
          interval: 14
        }
      },
      yAxis: {
        type: 'value',
        max: 100,
        axisLabel: {
          color: '#6b7280',
          formatter: '{value}%'
        },
        splitLine: {
          lineStyle: {
            color: '#f3f4f6'
          }
        }
      },
      series: [
        {
          name: 'Load Avg',
          type: 'line',
          smooth: true,
          data: data.load,
          itemStyle: {
            color: '#3b82f6'
          },
          lineStyle: {
            width: 2
          },
          showSymbol: false
        },
        {
          name: 'Memory',
          type: 'line',
          smooth: true,
          data: data.memory,
          itemStyle: {
            color: '#f59e0b'
          },
          lineStyle: {
            width: 2
          },
          showSymbol: false
        },
        {
          name: 'Disk Usage',
          type: 'line',
          smooth: true,
          data: data.disk,
          itemStyle: {
            color: '#10b981'
          },
          lineStyle: {
            width: 2
          },
          showSymbol: false
        }
      ]
    };

    chart.setOption(option);

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [data]);

  return <div ref={chartRef} style={{ width: '100%', height: '350px' }} />;
}
