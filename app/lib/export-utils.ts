/**
 * Export Utilities for Table Data
 *
 * Provides functions to export table data in various formats:
 * - CSV: Comma-separated values with proper escaping
 * - JSON: Array of objects with column names as keys
 * - SQL: INSERT statements with escaped values
 * - Excel: .xlsx workbook using the xlsx library
 */

import * as XLSX from 'xlsx';

/**
 * Escape special characters in CSV cells
 */
function escapeCSV(value: any): string {
  if (value === null || value === undefined) return '';

  const str = typeof value === 'object' ? JSON.stringify(value) : String(value);

  // If the value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Export table data to CSV format
 */
export function exportToCSV(
  columns: string[],
  rows: any[][],
  fileName: string = 'export.csv'
): void {
  // Create CSV header
  const header = columns.map(escapeCSV).join(',');

  // Create CSV rows
  const csvRows = rows.map(row =>
    row.map(cell => escapeCSV(cell)).join(',')
  );

  // Combine header and rows
  const csv = [header, ...csvRows].join('\n');

  // Download CSV file
  downloadFile(csv, fileName, 'text/csv');
}

/**
 * Export table data to JSON format
 */
export function exportToJSON(
  columns: string[],
  rows: any[][],
  fileName: string = 'export.json'
): void {
  // Convert rows to array of objects
  const jsonData = rows.map(row => {
    const obj: Record<string, any> = {};
    columns.forEach((col, idx) => {
      obj[col] = row[idx];
    });
    return obj;
  });

  // Pretty-print JSON
  const json = JSON.stringify(jsonData, null, 2);

  // Download JSON file
  downloadFile(json, fileName, 'application/json');
}

/**
 * Escape SQL string values
 */
function escapeSQLValue(value: any): string {
  if (value === null || value === undefined) return 'NULL';

  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';

  if (typeof value === 'object') {
    // Handle arrays and objects as JSON strings
    return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
  }

  // Escape single quotes in string values
  return `'${String(value).replace(/'/g, "''")}'`;
}

/**
 * Export table data to SQL INSERT statements
 */
export function exportToSQL(
  schema: string,
  tableName: string,
  columns: string[],
  rows: any[][],
  fileName: string = 'export.sql'
): void {
  const sqlStatements: string[] = [];

  // Add header comment
  sqlStatements.push(`-- SQL Export for ${schema}.${tableName}`);
  sqlStatements.push(`-- Generated at ${new Date().toISOString()}`);
  sqlStatements.push(`-- Total rows: ${rows.length}`);
  sqlStatements.push('');

  // Generate INSERT statement for each row
  rows.forEach(row => {
    const columnList = columns.map(col => `"${col}"`).join(', ');
    const valueList = row.map(cell => escapeSQLValue(cell)).join(', ');
    sqlStatements.push(
      `INSERT INTO "${schema}"."${tableName}" (${columnList}) VALUES (${valueList});`
    );
  });

  const sql = sqlStatements.join('\n');

  // Download SQL file
  downloadFile(sql, fileName, 'text/sql');
}

/**
 * Export table data to Excel (.xlsx) format
 */
export function exportToExcel(
  columns: string[],
  rows: any[][],
  sheetName: string = 'Sheet1',
  fileName: string = 'export.xlsx'
): void {
  // Create worksheet data (header + rows)
  const wsData = [columns, ...rows];

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Auto-size columns based on content
  const colWidths = columns.map((col, idx) => {
    const maxLength = Math.max(
      col.length,
      ...rows.map(row => {
        const cell = row[idx];
        if (cell === null || cell === undefined) return 4; // "NULL"
        return String(cell).length;
      })
    );
    return { wch: Math.min(maxLength + 2, 50) }; // Cap at 50 characters
  });
  ws['!cols'] = colWidths;

  // Create workbook and add worksheet
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Write workbook to file
  XLSX.writeFile(wb, fileName);
}

/**
 * Helper function to download a file
 */
function downloadFile(content: string, fileName: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Format file name based on table and format
 */
export function formatFileName(
  schema: string,
  tableName: string,
  format: 'csv' | 'json' | 'sql' | 'xlsx'
): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  return `${schema}_${tableName}_${timestamp}.${format}`;
}
