'use client';

import { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { useActiveConnection } from '../../lib/monkdb-context';
import { useSchemas } from '../../lib/monkdb-hooks';
import { PieChart, Database, AlertCircle, RefreshCw, TrendingUp } from 'lucide-react';

interface SchemaStats {
  schema: string;
  tableCount: number;
  totalDocs: number;
}

export default function CollectionDistribution() {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);
  const chartInitializedRef = useRef(false);
  const activeConnection = useActiveConnection();
  const { data: schemas } = useSchemas();
  const [schemaData, setSchemaData] = useState<SchemaStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const fetchSchemaStats = async () => {
    if (!activeConnection || !schemas || schemas.length === 0) {
      setLoading(false);
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
          schema_name,
          COUNT(DISTINCT table_name) as table_count,
          SUM(num_docs) as total_docs
        FROM sys.shards
        WHERE schema_name NOT IN ('sys', 'information_schema', 'pg_catalog')
          AND "primary" = true
        GROUP BY schema_name
        ORDER BY total_docs DESC
      `;

      const result = await activeConnection.client.query(query);

      if (result.rows && result.rows.length > 0) {
        const allSchemas: SchemaStats[] = result.rows.map((row: any[]) => ({
          schema: row[0],
          tableCount: row[1] || 0,
          totalDocs: row[2] || 0,
        }));
        setSchemaData(allSchemas);
      } else {
        setSchemaData([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      setSchemaData([]);
    } finally {
      if (isInitialLoad) {
        setLoading(false);
        setIsInitialLoad(false);
      }
    }
  };

  useEffect(() => {
    fetchSchemaStats();
    // Silent background refresh every 30 seconds - no loading state, no blink
    const interval = setInterval(fetchSchemaStats, 30000);
    return () => clearInterval(interval);
  }, [activeConnection, schemas]);

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
    if (!chartInstanceRef.current) return;

    const isDark = document.documentElement.classList.contains('dark');

    const data =
      schemaData.length > 0
        ? schemaData.map((s) => ({
            name: s.schema,
            value: s.totalDocs,
            tableCount: s.tableCount,
          }))
        : [{ name: 'No Data', value: 1, tableCount: 0 }];

    const colors =
      schemaData.length > 0
        ? ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']
        : ['#e5e7eb'];

    const option = {
      tooltip: {
        trigger: 'item',
        backgroundColor: isDark ? '#1f2937' : '#ffffff',
        borderColor: isDark ? '#374151' : '#e5e7eb',
        textStyle: {
          color: isDark ? '#f3f4f6' : '#111827',
        },
        formatter: (params: any) => {
          if (params.name === 'No Data') return 'No data available';
          const schema = schemaData.find((s) => s.schema === params.name);
          return `<strong>${params.name}</strong><br/>
            <span style="color: #3b82f6;">●</span> Tables: <strong>${schema?.tableCount || 0}</strong><br/>
            <span style="color: #10b981;">●</span> Documents: <strong>${params.value.toLocaleString()}</strong><br/>
            <span style="color: #f59e0b;">●</span> Percentage: <strong>${params.percent}%</strong>`;
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
          if (name === 'No Data') return name;
          const schema = schemaData.find((s) => s.schema === name);
          return `${name} (${schema?.tableCount || 0})`;
        },
      },
      series: [
        {
          name: 'Schema Distribution',
          type: 'pie',
          radius: ['45%', '75%'],
          center: ['60%', '50%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 8,
            borderColor: isDark ? '#1f2937' : '#ffffff',
            borderWidth: 3,
          },
          label: {
            show: false,
            position: 'center',
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 16,
              fontWeight: 'bold',
              color: isDark ? '#f3f4f6' : '#111827',
              formatter: (params: any) => {
                if (params.name === 'No Data') return 'No Data';
                return `{name|${params.name}}\n{value|${params.value.toLocaleString()} docs}`;
              },
              rich: {
                name: {
                  fontSize: 14,
                  fontWeight: 'bold',
                  lineHeight: 20,
                  color: isDark ? '#f3f4f6' : '#111827',
                },
                value: {
                  fontSize: 12,
                  lineHeight: 18,
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
          data: data,
          color: colors,
        },
      ],
      animationDuration: 300,
    } as any;

    // Update chart data smoothly without recreation
    chartInstanceRef.current.setOption(option, { notMerge: false });
  }, [schemaData]);

  return (
    <div className="relative h-[300px] w-full">
      <div ref={chartRef} className="h-full w-full" />

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center gap-4 bg-white dark:bg-gray-800">
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 animate-pulse">
                <div className="h-3 w-3 rounded-full bg-gray-300 dark:bg-gray-600" />
                <div className="h-3 w-24 rounded bg-gray-200 dark:bg-gray-700" />
              </div>
            ))}
          </div>
          <div className="relative h-48 w-48">
            <div className="absolute inset-0 animate-spin rounded-full border-8 border-gray-200 border-t-blue-500 dark:border-gray-700 dark:border-t-blue-400" />
          </div>
          <div className="absolute bottom-4 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Loading schema distribution...</span>
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
            <p className="mt-1 max-w-sm text-xs text-red-700 dark:text-red-400">{error}</p>
          </div>
          <button
            onClick={fetchSchemaStats}
            className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      )}

      {/* Empty State Overlay */}
      {!loading && !error && schemaData.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/95 dark:bg-gray-800/95">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
            <PieChart className="h-7 w-7 text-gray-400 dark:text-gray-500" />
          </div>
          <div className="text-center">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              No Schema Data Available
            </h3>
            <p className="mt-1 max-w-sm text-xs text-gray-600 dark:text-gray-400">
              Create tables and insert data to see schema distribution
            </p>
          </div>
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 dark:border-blue-800 dark:bg-blue-900/20">
            <Database className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-medium text-blue-900 dark:text-blue-300">
              Distribution will appear here
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
