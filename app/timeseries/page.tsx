'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Database, Code, Download, RefreshCw, AlertTriangle } from 'lucide-react';
import { useActiveConnection } from '../lib/monkdb-context';
import TimeSeriesChart, {
  TimeSeriesSeries,
  TimeSeriesDataPoint,
} from '../components/timeseries/TimeSeriesChart';
import DateRangePicker, { DateRange } from '../components/timeseries/DateRangePicker';
import AggregationBuilder, {
  AggregationConfig,
  TimeBucket,
} from '../components/timeseries/AggregationBuilder';
import AnomalyDetector, { Anomaly } from '../components/timeseries/AnomalyDetector';
import { subHours } from 'date-fns';

// SQL template generator
function generateSQLQuery(
  tableName: string,
  timestampColumn: string,
  config: AggregationConfig,
  dateRange: DateRange
): string {
  // Map time buckets to DATE_TRUNC interval names
  const dateTruncIntervalMap: Record<TimeBucket, string> = {
    '1m': 'minute',
    '5m': 'minute',
    '15m': 'minute',
    '30m': 'minute',
    '1h': 'hour',
    '6h': 'hour',
    '12h': 'hour',
    '1d': 'day',
    '7d': 'day',
  };

  const dateTruncInterval = dateTruncIntervalMap[config.timeBucket];

  // Build SELECT clause
  const selectClauses = [
    `DATE_TRUNC('${dateTruncInterval}', ${timestampColumn}) AS time_bucket`,
  ];

  config.metrics.forEach((metric) => {
    const alias = metric.alias || `${metric.function.toLowerCase()}_${metric.column}`;
    if (metric.function === 'PERCENTILE_95') {
      selectClauses.push(`PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY ${metric.column}) AS ${alias}`);
    } else if (metric.function === 'PERCENTILE_99') {
      selectClauses.push(`PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY ${metric.column}) AS ${alias}`);
    } else {
      selectClauses.push(`${metric.function}(${metric.column}) AS ${alias}`);
    }
  });

  // Build GROUP BY clause
  let groupByClause = 'time_bucket';
  if (config.groupBy.length > 0) {
    selectClauses.push(...config.groupBy);
    groupByClause += ', ' + config.groupBy.join(', ');
  }

  const sql = `SELECT
  ${selectClauses.join(',\n  ')}
FROM ${tableName}
WHERE ${timestampColumn} >= TIMESTAMP '${dateRange.start.toISOString()}'
  AND ${timestampColumn} <= TIMESTAMP '${dateRange.end.toISOString()}'
GROUP BY ${groupByClause}
ORDER BY time_bucket DESC
LIMIT 1000;`;

  return sql;
}

// NOTE: Sample data generation removed for production
// This feature now requires REAL time-series data from your database
// Follow the instructions in the UI to configure your table and columns

export default function TimeSeriesPage() {
  const activeConnection = useActiveConnection();

  // State
  const [dateRange, setDateRange] = useState<DateRange>({
    start: subHours(new Date(), 24),
    end: new Date(),
  });
  const [isRealTime, setIsRealTime] = useState(false);
  const [aggregationConfig, setAggregationConfig] = useState<AggregationConfig>({
    timeBucket: '1h',
    metrics: [
      { column: 'temperature', function: 'AVG', alias: 'avg_temperature' },
      { column: 'temperature', function: 'MAX', alias: 'max_temperature' },
      { column: 'response_time', function: 'AVG', alias: 'avg_response_time' },
    ],
    groupBy: ['sensor_id'],
  });
  const [generatedSQL, setGeneratedSQL] = useState('');
  const [showSQL, setShowSQL] = useState(false);
  const [series, setSeries] = useState<TimeSeriesSeries[]>([]);
  const [anomalyTimestamps, setAnomalyTimestamps] = useState<Date[]>([]);
  const [loading, setLoading] = useState(false);

  // Load data from database
  useEffect(() => {
    if (activeConnection) {
      loadData();
    }
  }, [dateRange, aggregationConfig]);

  const loadData = async () => {
    if (!activeConnection) {
      alert('⚠️ No Database Connection\n\nPlease connect to a MonkDB database first.');
      return;
    }

    setLoading(true);

    try {
      // Generate the SQL query for the actual table
      const sql = generateSQLQuery(
        'monkdb.sensor_readings',
        'timestamp',
        aggregationConfig,
        dateRange
      );

      console.log('Executing time-series query:', sql);
      const result = await activeConnection.client.query(sql);

      if (result.rows && result.rows.length > 0) {
        console.log('Time-series data loaded:', result.rows.length, 'rows');

        // Transform data into time-series format
        const dataByMetric: { [key: string]: TimeSeriesDataPoint[] } = {};

        result.rows.forEach((row: any[]) => {
          const timestamp = new Date(row[0]); // time_bucket

          // Process each metric column (skip first column which is time_bucket)
          aggregationConfig.metrics.forEach((metric, index) => {
            const metricKey = metric.alias || `${metric.function.toLowerCase()}_${metric.column}`;
            const value = row[index + 1]; // +1 to skip time_bucket column

            if (!dataByMetric[metricKey]) {
              dataByMetric[metricKey] = [];
            }

            if (value !== null && value !== undefined && !isNaN(Number(value))) {
              dataByMetric[metricKey].push({
                timestamp,
                value: Number(value),
              });
            }
          });
        });

        // Convert to TimeSeriesSeries format
        const seriesData: TimeSeriesSeries[] = Object.entries(dataByMetric).map(([name, data]) => ({
          name,
          data: data.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()),
        }));

        setSeries(seriesData);
        console.log('Time-series visualization ready with', seriesData.length, 'series');
      } else {
        console.log('No time-series data found');
        setSeries([]);
      }
    } catch (error) {
      console.error('Failed to load time-series data:', error);
      alert('Failed to load data: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setSeries([]);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSQL = () => {
    const sql = generateSQLQuery(
      'monkdb.sensor_readings',
      'timestamp',
      aggregationConfig,
      dateRange
    );
    setGeneratedSQL(sql);
    setShowSQL(true);
  };

  const handleCopySQL = () => {
    navigator.clipboard.writeText(generatedSQL);
    alert('✅ SQL Copied!\n\nYou can now:\n1. Run this in Query Editor to verify\n2. Modify it for custom analysis\n3. Use it in other tools');
  };

  const handleAnomaliesDetected = useCallback((anomalies: Anomaly[]) => {
    setAnomalyTimestamps(anomalies.map((a) => a.timestamp));
  }, []);

  const handleExportData = () => {
    // Convert series data to CSV
    const csvRows = ['Timestamp,Series,Value'];
    series.forEach((s) => {
      s.data.forEach((d) => {
        csvRows.push(`${d.timestamp.toISOString()},${s.name},${d.value}`);
      });
    });
    const csv = csvRows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'timeseries-data.csv';
    a.click();
  };

  // Memoize anomaly detector data to avoid creating new array references
  const anomalyDetectorData = useMemo(() => {
    return series[0]?.data || [];
  }, [series]);

  // Show no connection state
  if (!activeConnection) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="max-w-md rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/50 p-12 text-center dark:border-gray-700 dark:bg-gray-800/50">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
            <Database className="h-10 w-10 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="mt-6 text-xl font-bold text-gray-900 dark:text-white">
            No Active Connection
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Please connect to a MonkDB database to use time-series analytics.
          </p>
          <a
            href="/connections"
            className="mt-6 inline-block rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            Manage Connections
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header - Fixed */}
      <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-6 py-4 dark:border-gray-700 dark:from-gray-800 dark:to-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Database className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Time-Series Analytics
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Analyze time-series data with aggregations and anomaly detection
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={handleExportData}
              className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-auto">
        <div className="space-y-4 p-4">

        {/* Setup Instructions */}
        <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-blue-900 dark:text-blue-300">
            <AlertTriangle className="h-4 w-4" />
            How to Use Time-Series Analytics
          </h3>
          <div className="space-y-2 text-xs text-blue-800 dark:text-blue-200">
            <p><strong>This feature visualizes data from the <code className="rounded bg-blue-100 px-1 dark:bg-blue-900">monkdb.sensor_readings</code> table.</strong></p>
            <ol className="ml-4 list-decimal space-y-1">
              <li>Use the <strong>"Date Range Picker"</strong> to select your time window</li>
              <li>Configure aggregations in the <strong>"Aggregation Builder"</strong> panel (time buckets, metrics, grouping)</li>
              <li>Data will automatically refresh when you change settings</li>
              <li>Click <strong>"Refresh"</strong> to manually reload data</li>
              <li>Click <strong>"Generate SQL"</strong> to see the exact query being executed</li>
              <li>Use <strong>"Export"</strong> to download data as CSV</li>
            </ol>
            <p className="mt-2 border-t border-blue-300 pt-2 dark:border-blue-700">
              <strong>Tip:</strong> The Anomaly Detector will automatically highlight unusual patterns in your data.
            </p>
          </div>
        </div>

        {/* Date Range Picker */}
        <DateRangePicker
          value={dateRange}
          onChange={setDateRange}
          isRealTime={isRealTime}
          onRealTimeToggle={setIsRealTime}
        />

        {/* Main Chart */}
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
            Time-Series Visualization
          </h2>
          {loading ? (
            <div className="flex h-80 items-center justify-center">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
            </div>
          ) : (
            <TimeSeriesChart
              series={series}
              height={320}
              showZoomControls={true}
              anomalies={anomalyTimestamps}
            />
          )}
        </div>

        {/* Grid Layout for Controls */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Aggregation Builder */}
          <AggregationBuilder
            value={aggregationConfig}
            onChange={setAggregationConfig}
            onGenerateSQL={handleGenerateSQL}
          />

          {/* Anomaly Detector */}
          <AnomalyDetector
            data={anomalyDetectorData}
            threshold={2}
            onAnomaliesDetected={handleAnomaliesDetected}
          />
        </div>

        {/* SQL Query Display */}
        {showSQL && (
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                <Code className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                Generated SQL Query
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={handleCopySQL}
                  className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  Copy
                </button>
                <button
                  onClick={() => setShowSQL(false)}
                  className="rounded-lg bg-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  Close
                </button>
              </div>
            </div>
            <pre className="overflow-x-auto rounded-lg bg-gray-900 p-3 text-xs text-green-400">
              <code>{generatedSQL}</code>
            </pre>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
