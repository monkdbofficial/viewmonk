'use client';

import { useState, useRef } from 'react';
import { X, Upload, FileText, CheckCircle, AlertTriangle, Download, Database } from 'lucide-react';
import { useActiveConnection } from '../../lib/monkdb-context';

interface ImportDataDialogProps {
  tableName: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface ParsedData {
  headers: string[];
  rows: any[][];
  rowCount: number;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export default function ImportDataDialog({ tableName, onClose, onSuccess }: ImportDataDialogProps) {
  const activeConnection = useActiveConnection();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'complete'>('upload');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    parseFile(selectedFile);
  };

  const parseFile = async (file: File) => {
    try {
      const text = await file.text();
      const fileExt = file.name.toLowerCase().split('.').pop();

      let parsed: ParsedData;

      if (fileExt === 'csv') {
        parsed = parseCSV(text);
      } else if (fileExt === 'json') {
        parsed = parseJSON(text);
      } else {
        alert('Unsupported file format. Please use CSV or JSON files.');
        return;
      }

      setParsedData(parsed);
      validateData(parsed);
      setStep('preview');
    } catch (error) {
      console.error('Failed to parse file:', error);
      alert('Failed to parse file: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const parseCSV = (text: string): ParsedData => {
    const lines = text.trim().split('\n');
    if (lines.length === 0) throw new Error('File is empty');

    // Parse header
    const headers = lines[0].split(',').map(h => h.trim().replace(/['"]/g, ''));

    // Parse rows
    const rows: any[][] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(',').map(v => v.trim().replace(/['"]/g, ''));
      rows.push(values);
    }

    return {
      headers,
      rows,
      rowCount: rows.length,
    };
  };

  const parseJSON = (text: string): ParsedData => {
    const data = JSON.parse(text);

    if (!Array.isArray(data)) {
      throw new Error('JSON must be an array of objects');
    }

    if (data.length === 0) {
      throw new Error('JSON array is empty');
    }

    // Extract headers from first object
    const headers = Object.keys(data[0]);

    // Convert objects to arrays
    const rows = data.map(obj => headers.map(key => obj[key]));

    return {
      headers,
      rows,
      rowCount: rows.length,
    };
  };

  const validateData = (data: ParsedData) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for empty data
    if (data.rowCount === 0) {
      errors.push('No data rows found');
    }

    // Check for timestamp column
    const hasTimestampColumn = data.headers.some(h =>
      h.toLowerCase().includes('timestamp') ||
      h.toLowerCase().includes('time') ||
      h.toLowerCase() === 'ts' ||
      h.toLowerCase() === 'date'
    );

    if (!hasTimestampColumn) {
      warnings.push('No timestamp column detected. Time-series analysis may not work correctly.');
    }

    // Check for numeric columns
    const numericColumns = data.headers.filter((h, idx) => {
      const sample = data.rows.slice(0, 5).map(row => row[idx]);
      return sample.every(val => !isNaN(Number(val)));
    });

    if (numericColumns.length === 0) {
      warnings.push('No numeric columns detected. You may not be able to create aggregations.');
    }

    // Check row consistency
    const inconsistentRows = data.rows.filter(row => row.length !== data.headers.length);
    if (inconsistentRows.length > 0) {
      errors.push(`${inconsistentRows.length} rows have mismatched column counts`);
    }

    // Large dataset warning
    if (data.rowCount > 10000) {
      warnings.push(`Large dataset (${data.rowCount} rows). Import may take some time.`);
    }

    setValidation({
      valid: errors.length === 0,
      errors,
      warnings,
    });
  };

  const handleImport = async () => {
    if (!parsedData || !activeConnection) return;

    setImporting(true);
    setStep('importing');
    setProgress(0);

    try {
      // Try to insert data first
      const batchSize = 100;
      const totalRows = parsedData.rows.length;

      for (let i = 0; i < totalRows; i += batchSize) {
        const batch = parsedData.rows.slice(i, i + batchSize);

        // Build INSERT statement
        const values = batch.map(row => {
          const valueStr = row.map(val => {
            if (val === null || val === undefined || val === '') return 'NULL';
            if (!isNaN(Number(val)) && val !== '') return val;
            return `'${String(val).replace(/'/g, "''")}'`;
          }).join(', ');
          return `(${valueStr})`;
        }).join(',\n');

        const columns = parsedData.headers.join(', ');
        const sql = `INSERT INTO ${tableName} (${columns}) VALUES ${values}`;

        try {
          await activeConnection.client.query(sql);
        } catch (insertError: any) {
          // If table doesn't exist, try to create it
          if (insertError.message && (insertError.message.includes('unknown') || insertError.message.includes('not found'))) {
            console.log('Table does not exist, attempting to create it...');

            // Auto-detect column types from first few rows
            const columnDefs = parsedData.headers.map((header, idx) => {
              const samples = parsedData.rows.slice(0, 10).map(row => row[idx]);
              const hasTimestamp = header.toLowerCase().includes('timestamp') || header.toLowerCase().includes('time');
              const allNumeric = samples.every(val => !isNaN(Number(val)));

              let type = 'TEXT';
              if (hasTimestamp) {
                type = 'TIMESTAMP';
              } else if (allNumeric) {
                type = 'DOUBLE';
              }

              return `${header} ${type}`;
            });

            // Create table (use first column as primary key)
            const createSql = `CREATE TABLE ${tableName} (${columnDefs.join(', ')}, PRIMARY KEY (${parsedData.headers[0]}))`;
            console.log('Creating table with SQL:', createSql);

            await activeConnection.client.query(createSql);

            // Retry the insert
            await activeConnection.client.query(sql);
          } else {
            throw insertError;
          }
        }

        setProgress(Math.round(((i + batch.length) / totalRows) * 100));
      }

      setStep('complete');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Failed to import data:', error);
      alert('Failed to import data: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setStep('preview');
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const csv = 'timestamp,sensor_id,location,temperature,humidity,pressure\n2024-01-01T00:00:00Z,sensor_01,Office,22.5,45.2,1013.2\n2024-01-01T01:00:00Z,sensor_01,Office,22.3,46.1,1013.5';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'timeseries-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Upload className="w-6 h-6 text-blue-500" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Import Time-Series Data
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Import CSV or JSON data into {tableName}
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
        <div className="flex-1 overflow-auto p-6">
          {step === 'upload' && (
            <div className="space-y-6">
              {/* Template Download */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
                  Need a template?
                </h3>
                <p className="text-xs text-blue-800 dark:text-blue-200 mb-3">
                  Download our sample CSV template to see the expected format
                </p>
                <button
                  onClick={downloadTemplate}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download Template
                </button>
              </div>

              {/* File Upload Area */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-12 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors"
              >
                <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Click to select file
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  or drag and drop
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Supports: CSV, JSON (Max size: 50MB)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Supported Formats */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  Supported Formats
                </h4>
                <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                  <div className="flex items-start gap-2">
                    <FileText className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong>CSV:</strong> Comma-separated values with header row
                      <br />
                      <code className="text-xs bg-gray-200 dark:bg-gray-800 px-1 rounded">
                        timestamp,sensor_id,value
                      </code>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <FileText className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong>JSON:</strong> Array of objects
                      <br />
                      <code className="text-xs bg-gray-200 dark:bg-gray-800 px-1 rounded">
                        [{`{"timestamp": "...", "sensor_id": "...", "value": ...}`}]
                      </code>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 'preview' && parsedData && validation && (
            <div className="space-y-6">
              {/* Validation Results */}
              {validation.errors.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-red-900 dark:text-red-300 mb-2">
                        Validation Errors
                      </h4>
                      <ul className="text-sm text-red-800 dark:text-red-200 space-y-1 list-disc list-inside">
                        {validation.errors.map((error, idx) => (
                          <li key={idx}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {validation.warnings.length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-yellow-900 dark:text-yellow-300 mb-2">
                        Warnings
                      </h4>
                      <ul className="text-sm text-yellow-800 dark:text-yellow-200 space-y-1 list-disc list-inside">
                        {validation.warnings.map((warning, idx) => (
                          <li key={idx}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Data Summary */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  Data Summary
                </h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Total Rows</p>
                    <p className="text-xl font-semibold text-gray-900 dark:text-white">
                      {parsedData.rowCount.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Columns</p>
                    <p className="text-xl font-semibold text-gray-900 dark:text-white">
                      {parsedData.headers.length}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">File Size</p>
                    <p className="text-xl font-semibold text-gray-900 dark:text-white">
                      {(file!.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              </div>

              {/* Data Preview */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  Data Preview (First 10 rows)
                </h4>
                <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        {parsedData.headers.map((header, idx) => (
                          <th
                            key={idx}
                            className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {parsedData.rows.slice(0, 10).map((row, rowIdx) => (
                        <tr key={rowIdx}>
                          {row.map((cell, cellIdx) => (
                            <td
                              key={cellIdx}
                              className="px-4 py-2 text-gray-900 dark:text-white whitespace-nowrap"
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Database className="w-16 h-16 text-blue-500 mb-4 animate-pulse" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Importing Data...
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Please wait while we insert {parsedData?.rowCount} rows
              </p>
              <div className="w-full max-w-md">
                <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-blue-600 h-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-2">
                  {progress}% complete
                </p>
              </div>
            </div>
          )}

          {step === 'complete' && (
            <div className="flex flex-col items-center justify-center py-12">
              <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Import Complete!
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Successfully imported {parsedData?.rowCount} rows
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        {(step === 'upload' || step === 'preview') && (
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            {step === 'preview' && validation && (
              <button
                onClick={handleImport}
                disabled={!validation.valid || importing}
                className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Import {parsedData?.rowCount} Rows
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
