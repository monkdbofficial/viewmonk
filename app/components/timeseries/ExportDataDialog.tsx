'use client';

import { useState } from 'react';
import { X, Download, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { TimeSeriesSeries } from './TimeSeriesChart';

interface ExportDataDialogProps {
  series: TimeSeriesSeries[];
  tableName: string;
  onClose: () => void;
}

type ExportFormat = 'csv' | 'json' | 'excel' | 'sql';

interface ExportOptions {
  format: ExportFormat;
  includeHeaders: boolean;
  timestampFormat: 'iso' | 'unix' | 'human';
  groupBySeries: boolean;
}

export default function ExportDataDialog({ series, tableName, onClose }: ExportDataDialogProps) {
  const [options, setOptions] = useState<ExportOptions>({
    format: 'csv',
    includeHeaders: true,
    timestampFormat: 'iso',
    groupBySeries: false,
  });
  const [exporting, setExporting] = useState(false);

  const totalDataPoints = series.reduce((sum, s) => sum + s.data.length, 0);

  const formatTimestamp = (date: Date): string => {
    switch (options.timestampFormat) {
      case 'iso':
        return date.toISOString();
      case 'unix':
        return Math.floor(date.getTime() / 1000).toString();
      case 'human':
        return date.toLocaleString();
      default:
        return date.toISOString();
    }
  };

  const exportAsCSV = () => {
    const rows: string[] = [];

    if (options.includeHeaders) {
      rows.push('Timestamp,Series,Value');
    }

    if (options.groupBySeries) {
      // Each series gets its own column
      const allTimestamps = new Set<number>();
      series.forEach(s => s.data.forEach(d => allTimestamps.add(d.timestamp.getTime())));
      const sortedTimestamps = Array.from(allTimestamps).sort();

      if (options.includeHeaders) {
        const header = ['Timestamp', ...series.map(s => s.name)].join(',');
        rows[0] = header;
      }

      sortedTimestamps.forEach(ts => {
        const timestamp = formatTimestamp(new Date(ts));
        const values = series.map(s => {
          const dataPoint = s.data.find(d => d.timestamp.getTime() === ts);
          return dataPoint ? dataPoint.value.toString() : '';
        });
        rows.push([timestamp, ...values].join(','));
      });
    } else {
      // Long format: one row per data point
      series.forEach(s => {
        s.data.forEach(d => {
          rows.push(`${formatTimestamp(d.timestamp)},${s.name},${d.value}`);
        });
      });
    }

    return rows.join('\n');
  };

  const exportAsJSON = () => {
    if (options.groupBySeries) {
      // Group by series
      const data: any = {};
      series.forEach(s => {
        data[s.name] = s.data.map(d => ({
          timestamp: formatTimestamp(d.timestamp),
          value: d.value,
        }));
      });
      return JSON.stringify(data, null, 2);
    } else {
      // Flat array
      const data: any[] = [];
      series.forEach(s => {
        s.data.forEach(d => {
          data.push({
            timestamp: formatTimestamp(d.timestamp),
            series: s.name,
            value: d.value,
          });
        });
      });
      return JSON.stringify(data, null, 2);
    }
  };

  const exportAsSQL = () => {
    const sqlStatements: string[] = [];

    series.forEach(s => {
      s.data.forEach(d => {
        const timestamp = options.timestampFormat === 'unix'
          ? Math.floor(d.timestamp.getTime() / 1000)
          : `'${d.timestamp.toISOString()}'`;

        const sql = `INSERT INTO ${tableName} (timestamp, series_name, value) VALUES (${timestamp}, '${s.name}', ${d.value});`;
        sqlStatements.push(sql);
      });
    });

    return sqlStatements.join('\n');
  };

  const exportAsExcel = () => {
    // For Excel, we'll create a CSV with tab separators and .xls extension
    // This provides basic Excel compatibility without external libraries
    const rows: string[] = [];

    if (options.includeHeaders) {
      rows.push('Timestamp\tSeries\tValue');
    }

    series.forEach(s => {
      s.data.forEach(d => {
        rows.push(`${formatTimestamp(d.timestamp)}\t${s.name}\t${d.value}`);
      });
    });

    return rows.join('\n');
  };

  const handleExport = () => {
    setExporting(true);

    try {
      let content: string;
      let mimeType: string;
      let extension: string;

      switch (options.format) {
        case 'csv':
          content = exportAsCSV();
          mimeType = 'text/csv';
          extension = 'csv';
          break;
        case 'json':
          content = exportAsJSON();
          mimeType = 'application/json';
          extension = 'json';
          break;
        case 'sql':
          content = exportAsSQL();
          mimeType = 'text/plain';
          extension = 'sql';
          break;
        case 'excel':
          content = exportAsExcel();
          mimeType = 'application/vnd.ms-excel';
          extension = 'xls';
          break;
        default:
          throw new Error('Unsupported format');
      }

      // Create download
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `timeseries-export-${Date.now()}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Show success and close
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Download className="w-6 h-6 text-green-500" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Export Time-Series Data
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Export {totalDataPoints.toLocaleString()} data points from {series.length} series
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Data Summary */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
              Export Summary
            </h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-500 dark:text-gray-400">Series</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">
                  {series.length}
                </p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Data Points</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">
                  {totalDataPoints.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Format</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white uppercase">
                  {options.format}
                </p>
              </div>
            </div>
          </div>

          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Export Format
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setOptions({ ...options, format: 'csv' })}
                className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-colors ${
                  options.format === 'csv'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                <FileText className="w-5 h-5 text-blue-500" />
                <div className="text-left">
                  <p className="font-medium text-gray-900 dark:text-white">CSV</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Comma-separated values
                  </p>
                </div>
                {options.format === 'csv' && (
                  <CheckCircle className="w-5 h-5 text-blue-500 ml-auto" />
                )}
              </button>

              <button
                onClick={() => setOptions({ ...options, format: 'json' })}
                className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-colors ${
                  options.format === 'json'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                <FileText className="w-5 h-5 text-green-500" />
                <div className="text-left">
                  <p className="font-medium text-gray-900 dark:text-white">JSON</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    JavaScript Object Notation
                  </p>
                </div>
                {options.format === 'json' && (
                  <CheckCircle className="w-5 h-5 text-blue-500 ml-auto" />
                )}
              </button>

              <button
                onClick={() => setOptions({ ...options, format: 'excel' })}
                className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-colors ${
                  options.format === 'excel'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                <FileText className="w-5 h-5 text-emerald-500" />
                <div className="text-left">
                  <p className="font-medium text-gray-900 dark:text-white">Excel</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Microsoft Excel format
                  </p>
                </div>
                {options.format === 'excel' && (
                  <CheckCircle className="w-5 h-5 text-blue-500 ml-auto" />
                )}
              </button>

              <button
                onClick={() => setOptions({ ...options, format: 'sql' })}
                className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-colors ${
                  options.format === 'sql'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                <FileText className="w-5 h-5 text-purple-500" />
                <div className="text-left">
                  <p className="font-medium text-gray-900 dark:text-white">SQL</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    INSERT statements
                  </p>
                </div>
                {options.format === 'sql' && (
                  <CheckCircle className="w-5 h-5 text-blue-500 ml-auto" />
                )}
              </button>
            </div>
          </div>

          {/* Export Options */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Export Options
            </h4>

            {/* Include Headers */}
            {(options.format === 'csv' || options.format === 'excel') && (
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.includeHeaders}
                  onChange={(e) => setOptions({ ...options, includeHeaders: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Include column headers
                </span>
              </label>
            )}

            {/* Group by Series */}
            {options.format !== 'sql' && (
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.groupBySeries}
                  onChange={(e) => setOptions({ ...options, groupBySeries: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Group by series (wide format)
                </span>
              </label>
            )}

            {/* Timestamp Format */}
            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                Timestamp Format
              </label>
              <select
                value={options.timestampFormat}
                onChange={(e) =>
                  setOptions({ ...options, timestampFormat: e.target.value as any })
                }
                className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
              >
                <option value="iso">ISO 8601 (2024-01-15T10:30:00Z)</option>
                <option value="unix">Unix Timestamp (1705314600)</option>
                <option value="human">Human Readable (1/15/2024, 10:30:00 AM)</option>
              </select>
            </div>
          </div>

          {/* Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-medium mb-1">Export Information</p>
                <ul className="space-y-1 text-xs">
                  <li>• CSV and Excel formats are best for spreadsheet applications</li>
                  <li>• JSON format is ideal for programmatic processing</li>
                  <li>• SQL format generates INSERT statements for database import</li>
                  <li>• Wide format creates one column per series (better for analysis)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="px-6 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            {exporting ? 'Exporting...' : `Export as ${options.format.toUpperCase()}`}
          </button>
        </div>
      </div>
    </div>
  );
}
