'use client';

import { useState } from 'react';
import { Bug, CheckCircle, XCircle, AlertCircle, RefreshCw, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { useMonkDBClient } from '@/app/lib/monkdb-context';
import { useToast } from '@/app/components/ToastContext';

interface DiagnosticResult {
  test: string;
  status: 'success' | 'error' | 'warning' | 'info';
  message: string;
  details?: string;
  sql?: string;
}

export default function VectorDebugPanel() {
  const client = useMonkDBClient();
  const toast = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [showSql, setShowSql] = useState<Record<number, boolean>>({});

  const runDiagnostics = async () => {
    if (!client) {
      toast.error('No Connection', 'Please connect to a database first');
      return;
    }

    setIsRunning(true);
    const diagnostics: DiagnosticResult[] = [];

    try {
      // Test 1: Check if information_schema.columns is accessible
      try {
        const query1 = `SELECT COUNT(*) as count FROM information_schema.columns LIMIT 1`;
        await client.query(query1);
        diagnostics.push({
          test: '1. Information Schema Access',
          status: 'success',
          message: 'Can access information_schema.columns',
          sql: query1,
        });
      } catch (err) {
        diagnostics.push({
          test: '1. Information Schema Access',
          status: 'error',
          message: 'Cannot access information_schema.columns',
          details: err instanceof Error ? err.message : 'Unknown error',
        });
      }

      // Test 2: Check for any FLOAT_VECTOR columns
      try {
        const query2 = `
          SELECT
            table_schema,
            table_name,
            column_name,
            data_type,
            ordinal_position
          FROM information_schema.columns
          WHERE LOWER(data_type) LIKE '%float_vector%'
            OR LOWER(data_type) LIKE '%vector%'
          ORDER BY table_schema, table_name, ordinal_position
        `;
        const result = await client.query(query2);

        const rows = result.rows.map((row: any[]) => {
          const obj: any = {};
          result.cols.forEach((col: string, idx: number) => {
            obj[col] = row[idx];
          });
          return obj;
        });

        if (rows.length === 0) {
          diagnostics.push({
            test: '2. Vector Column Detection',
            status: 'warning',
            message: 'No FLOAT_VECTOR columns found in any tables',
            details: 'Create a table with FLOAT_VECTOR column:\n\nCREATE TABLE my_table (\n  id INTEGER PRIMARY KEY,\n  content TEXT,\n  embedding FLOAT_VECTOR(384)\n);',
            sql: query2,
          });
        } else {
          const tableList = rows.map((r: any) =>
            `${r.table_schema}.${r.table_name}.${r.column_name} (${r.data_type})`
          ).join('\n');

          diagnostics.push({
            test: '2. Vector Column Detection',
            status: 'success',
            message: `Found ${rows.length} vector column${rows.length !== 1 ? 's' : ''}`,
            details: tableList,
            sql: query2,
          });
        }
      } catch (err) {
        diagnostics.push({
          test: '2. Vector Column Detection',
          status: 'error',
          message: 'Failed to query for vector columns',
          details: err instanceof Error ? err.message : 'Unknown error',
        });
      }

      // Test 3: Check accessible schemas
      try {
        const query3 = `
          SELECT DISTINCT table_schema
          FROM information_schema.tables
          WHERE table_schema NOT IN ('sys', 'information_schema', 'pg_catalog')
          ORDER BY table_schema
        `;
        const result = await client.query(query3);

        const schemas = result.rows.map((row: any[]) => row[0]);

        if (schemas.length === 0) {
          diagnostics.push({
            test: '3. Schema Permissions',
            status: 'warning',
            message: 'No accessible user schemas found',
            details: 'You may not have permission to any schemas, or no user schemas exist',
            sql: query3,
          });
        } else {
          diagnostics.push({
            test: '3. Schema Permissions',
            status: 'success',
            message: `Found ${schemas.length} accessible schema${schemas.length !== 1 ? 's' : ''}`,
            details: schemas.join(', '),
            sql: query3,
          });
        }
      } catch (err) {
        diagnostics.push({
          test: '3. Schema Permissions',
          status: 'error',
          message: 'Failed to query schemas',
          details: err instanceof Error ? err.message : 'Unknown error',
        });
      }

      // Test 4: Check current user privileges
      try {
        const query4 = `
          SELECT
            grantee,
            grantor,
            type,
            class,
            ident
          FROM sys.privileges
          WHERE grantee = current_user
          LIMIT 10
        `;
        const result = await client.query(query4);

        const rows = result.rows.map((row: any[]) => {
          const obj: any = {};
          result.cols.forEach((col: string, idx: number) => {
            obj[col] = row[idx];
          });
          return obj;
        });

        if (rows.length === 0) {
          diagnostics.push({
            test: '4. User Privileges',
            status: 'warning',
            message: 'No privileges found for current user',
            details: 'You may need an admin to grant you DQL/DML permissions',
            sql: query4,
          });
        } else {
          const privList = rows.map((r: any) =>
            `${r.type} on ${r.class} ${r.ident || '(all)'}`
          ).slice(0, 5).join('\n');

          diagnostics.push({
            test: '4. User Privileges',
            status: 'success',
            message: `Found ${rows.length} privilege${rows.length !== 1 ? 's' : ''}`,
            details: privList + (rows.length > 5 ? '\n...(and more)' : ''),
            sql: query4,
          });
        }
      } catch (err) {
        diagnostics.push({
          test: '4. User Privileges',
          status: 'info',
          message: 'Could not query privileges',
          details: 'This is normal if you are not an admin user',
        });
      }

      // Test 5: Try to find any tables with vector-like columns
      try {
        const query5 = `
          SELECT
            table_schema,
            table_name,
            column_name,
            data_type
          FROM information_schema.columns
          WHERE (
            LOWER(data_type) LIKE '%float%'
            OR LOWER(data_type) LIKE '%vector%'
            OR LOWER(column_name) LIKE '%embed%'
            OR LOWER(column_name) LIKE '%vector%'
          )
          AND table_schema NOT IN ('sys', 'information_schema', 'pg_catalog')
          ORDER BY table_schema, table_name
          LIMIT 20
        `;
        const result = await client.query(query5);

        const rows = result.rows.map((row: any[]) => {
          const obj: any = {};
          result.cols.forEach((col: string, idx: number) => {
            obj[col] = row[idx];
          });
          return obj;
        });

        if (rows.length > 0) {
          const tableList = rows.map((r: any) =>
            `${r.table_schema}.${r.table_name}.${r.column_name} (${r.data_type})`
          ).join('\n');

          diagnostics.push({
            test: '5. Potential Vector Tables',
            status: 'info',
            message: `Found ${rows.length} column${rows.length !== 1 ? 's' : ''} that might be vector-related`,
            details: tableList,
            sql: query5,
          });
        }
      } catch (err) {
        diagnostics.push({
          test: '5. Potential Vector Tables',
          status: 'info',
          message: 'Could not scan for potential vector columns',
          details: err instanceof Error ? err.message : 'Unknown error',
        });
      }

      // Test 6: Check MonkDB version
      try {
        const query6 = `SELECT version()`;
        const result = await client.query(query6);
        const version = result.rows[0]?.[0] || 'Unknown';

        diagnostics.push({
          test: '6. MonkDB Version',
          status: 'info',
          message: 'Database version detected',
          details: version,
          sql: query6,
        });
      } catch (err) {
        diagnostics.push({
          test: '6. MonkDB Version',
          status: 'info',
          message: 'Could not detect version',
          details: err instanceof Error ? err.message : 'Unknown error',
        });
      }

      setResults(diagnostics);

      const errorCount = diagnostics.filter(d => d.status === 'error').length;
      const warningCount = diagnostics.filter(d => d.status === 'warning').length;

      if (errorCount > 0) {
        toast.error('Diagnostics Complete', `Found ${errorCount} error${errorCount !== 1 ? 's' : ''}`);
      } else if (warningCount > 0) {
        toast.warning('Diagnostics Complete', `Found ${warningCount} warning${warningCount !== 1 ? 's' : ''}`);
      } else {
        toast.success('Diagnostics Complete', 'All tests passed!');
      }

    } catch (err) {
      toast.error('Diagnostics Failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsRunning(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied', 'Diagnostic results copied to clipboard');
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'info':
        return <AlertCircle className="w-5 h-5 text-blue-600" />;
    }
  };

  const getStatusColor = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800';
      case 'error':
        return 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800';
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800';
      case 'info':
        return 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Bug className="w-5 h-5 text-purple-600" />
          <div className="text-left">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Debug & Diagnostics
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
              Troubleshoot vector collection detection issues
            </p>
          </div>
        </div>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {/* Content */}
      {isOpen && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-4">
          {/* Run Diagnostics Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={runDiagnostics}
              disabled={isRunning || !client}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Running Tests...
                </>
              ) : (
                <>
                  <Bug className="w-4 h-4" />
                  Run Full Diagnostics
                </>
              )}
            </button>

            {results.length > 0 && (
              <button
                onClick={() => {
                  const text = results.map(r =>
                    `${r.test}\nStatus: ${r.status}\n${r.message}\n${r.details ? r.details + '\n' : ''}${r.sql ? 'SQL: ' + r.sql + '\n' : ''}\n`
                  ).join('\n---\n\n');
                  copyToClipboard(text);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <Copy className="w-4 h-4" />
                Copy Results
              </button>
            )}
          </div>

          {/* Results */}
          {results.length > 0 && (
            <div className="space-y-3">
              {results.map((result, idx) => (
                <div
                  key={idx}
                  className={`border rounded-lg p-4 ${getStatusColor(result.status)}`}
                >
                  <div className="flex items-start gap-3">
                    {getStatusIcon(result.status)}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {result.test}
                      </div>
                      <div className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                        {result.message}
                      </div>

                      {result.details && (
                        <div className="mt-2 p-2 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
                          <pre className="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-mono">
                            {result.details}
                          </pre>
                        </div>
                      )}

                      {result.sql && (
                        <div className="mt-2">
                          <button
                            onClick={() => setShowSql(prev => ({ ...prev, [idx]: !prev[idx] }))}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            {showSql[idx] ? 'Hide SQL' : 'Show SQL'}
                          </button>
                          {showSql[idx] && (
                            <div className="mt-2 p-2 bg-gray-900 dark:bg-black rounded border border-gray-700">
                              <pre className="text-xs text-green-400 whitespace-pre-wrap font-mono">
                                {result.sql}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Help Text */}
          {results.length === 0 && (
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
              <p className="font-medium">This diagnostic tool will check:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Database connection and permissions</li>
                <li>Existing tables with FLOAT_VECTOR columns</li>
                <li>Schema access and privileges</li>
                <li>Common configuration issues</li>
                <li>MonkDB version compatibility</li>
              </ul>
              <p className="mt-3">
                Click <strong>Run Full Diagnostics</strong> to identify why your vector tables aren't showing up.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
