'use client';

import { useState } from 'react';
import { Download, X, FileText, Database, FileJson, FileSpreadsheet, CheckCircle2 } from 'lucide-react';
import { exportToCSV, exportToJSON, exportToSQL, exportToExcel, formatFileName } from '../lib/export-utils';
import { useToast } from './ToastContext';

interface TableExporterProps {
  schema: string;
  tableName: string;
  columns: string[];
  rows: any[][];
  onClose: () => void;
}

type ExportFormat = 'csv' | 'json' | 'sql' | 'xlsx';

/**
 * Table Exporter Component
 *
 * Modal dialog for exporting table data in various formats:
 * - CSV: Comma-separated values
 * - JSON: Array of objects
 * - SQL: INSERT statements
 * - Excel: .xlsx workbook
 */
export default function TableExporter({
  schema,
  tableName,
  columns,
  rows,
  onClose,
}: TableExporterProps) {
  const toast = useToast();
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('csv');
  const [exporting, setExporting] = useState(false);

  const formats = [
    {
      value: 'csv' as const,
      label: 'CSV',
      description: 'Comma-separated values',
      icon: FileText,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
    },
    {
      value: 'json' as const,
      label: 'JSON',
      description: 'Array of objects',
      icon: FileJson,
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    },
    {
      value: 'sql' as const,
      label: 'SQL Dump',
      description: 'INSERT statements',
      icon: Database,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      value: 'xlsx' as const,
      label: 'Excel',
      description: 'Excel workbook (.xlsx)',
      icon: FileSpreadsheet,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    },
  ];

  const handleExport = async () => {
    if (rows.length === 0) {
      toast.error('No Data', 'No data available to export');
      return;
    }

    setExporting(true);

    try {
      const fileName = formatFileName(schema, tableName, selectedFormat);

      switch (selectedFormat) {
        case 'csv':
          exportToCSV(columns, rows, fileName);
          break;
        case 'json':
          exportToJSON(columns, rows, fileName);
          break;
        case 'sql':
          exportToSQL(schema, tableName, columns, rows, fileName);
          break;
        case 'xlsx':
          exportToExcel(columns, rows, tableName, fileName);
          break;
      }

      toast.success('Export Successful', `Exported ${rows.length} rows to ${fileName}`);
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Export Failed', error instanceof Error ? error.message : 'Could not export data');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl rounded-lg border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-800">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Export Table Data</h2>
            </div>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {schema}.{tableName} - {rows.length} rows, {columns.length} columns
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Format Selection */}
        <div className="mb-6">
          <label className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Select Export Format
          </label>
          <div className="grid grid-cols-2 gap-3">
            {formats.map((format) => {
              const Icon = format.icon;
              const isSelected = selectedFormat === format.value;

              return (
                <button
                  key={format.value}
                  onClick={() => setSelectedFormat(format.value)}
                  className={`relative flex items-start gap-3 rounded-lg border-2 p-4 text-left transition-all ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/50 dark:border-blue-400 dark:bg-blue-900/20'
                      : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                  }`}
                >
                  <div className={`rounded-lg p-2 ${format.bgColor}`}>
                    <Icon className={`h-5 w-5 ${format.color}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-900 dark:text-white">{format.label}</p>
                      {isSelected && (
                        <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
                      {format.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Export Info */}
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            <strong>Note:</strong> The export will include all {rows.length} rows currently loaded in the
            preview. For complete table exports, first load all data or use the Query Editor with a full
            SELECT query.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || rows.length === 0}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            <Download className="h-4 w-4" />
            {exporting ? 'Exporting...' : `Export as ${selectedFormat.toUpperCase()}`}
          </button>
        </div>
      </div>
    </div>
  );
}
