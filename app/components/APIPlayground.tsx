'use client';

import { useState, useMemo } from 'react';
import { useActiveConnection } from '../lib/monkdb-context';
import { useToast } from './ToastContext';
import {
  AlertCircle, Code, CheckCircle, Copy, Check,
  AlertTriangle, Download, ChevronLeft, ChevronRight, Play, Zap,
} from 'lucide-react';

const EXAMPLES = [
  {
    label: 'SELECT',
    desc: 'Query rows with a filter',
    body: '{\n  "stmt": "SELECT * FROM your_schema.your_table WHERE id = ?",\n  "args": [1]\n}',
  },
  {
    label: 'INSERT',
    desc: 'Insert a new record',
    body: '{\n  "stmt": "INSERT INTO your_schema.your_table (id, name, description) VALUES (?, ?, ?)",\n  "args": [1, "Sample Name", "Sample Description"]\n}',
  },
  {
    label: 'UPDATE',
    desc: 'Modify existing data',
    body: '{\n  "stmt": "UPDATE your_schema.your_table SET name = ? WHERE id = ?",\n  "args": ["Updated Name", 1]\n}',
  },
  {
    label: 'DELETE',
    desc: 'Remove a record',
    body: '{\n  "stmt": "DELETE FROM your_schema.your_table WHERE id = ?",\n  "args": [1]\n}',
  },
  {
    label: 'List Tables',
    desc: 'Show all user tables',
    body: '{\n  "stmt": "SELECT table_schema, table_name FROM information_schema.tables WHERE table_type = \'BASE TABLE\' AND table_schema NOT LIKE \'sys.%\' ORDER BY table_schema, table_name",\n  "args": []\n}',
  },
  {
    label: 'Storage Stats',
    desc: 'Table sizes and row counts',
    body: '{\n  "stmt": "SELECT table_name, SUM(num_docs) as records, ROUND(SUM(size) / 1048576.0, 2) as size_mb FROM sys.shards WHERE primary = true GROUP BY 1 ORDER BY size_mb DESC",\n  "args": []\n}',
  },
];

export default function APIPlayground() {
  const activeConnection = useActiveConnection();
  const toast = useToast();

  const [body, setBody] = useState('{\n  "stmt": "SELECT 1",\n  "args": []\n}');
  const [response, setResponse] = useState('');
  const [responseData, setResponseData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [responseTime, setResponseTime] = useState(0);
  const [statusCode, setStatusCode] = useState(0);
  const [error, setError] = useState('');
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [resultsPerPage, setResultsPerPage] = useState(50);
  const [responseSize, setResponseSize] = useState(0);

  const handleSend = async () => {
    if (!activeConnection) {
      toast.error('No Connection', 'Please connect to a MonkDB instance first.');
      return;
    }

    setIsLoading(true);
    setError('');
    const startTime = performance.now();

    try {
      const requestBody = JSON.parse(body);
      const { stmt, args } = requestBody;

      if (!stmt) throw new Error('Missing "stmt" field in request body');

      const result = await activeConnection.client.query(stmt, args || []);

      const time = Math.round(performance.now() - startTime);
      const responseJson = JSON.stringify(result, null, 2);
      const size = new Blob([responseJson]).size;

      setResponseTime(time);
      setStatusCode(200);
      setResponse(responseJson);
      setResponseData(result);
      setResponseSize(size);
      setCurrentPage(1);
      toast.success('Request Successful', `Response received in ${time}ms`);
    } catch (err) {
      setResponseTime(Math.round(performance.now() - startTime));
      setStatusCode(500);
      const errorMsg = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMsg);
      setResponse(JSON.stringify({ error: errorMsg, message: 'Query execution failed' }, null, 2));
      toast.error('Request Failed', errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const generateCurlCommand = () => {
    const host = activeConnection?.config.host || 'localhost';
    const port = activeConnection?.config.port || 4200;
    const protocol = activeConnection?.config.protocol || 'http';
    return `curl -X POST -H "Content-Type: application/json" \\\n  -d '${body.replace(/\n/g, '')}' \\\n  "${protocol}://${host}:${port}/_sql"`;
  };

  const handleCopyCurl = () => {
    navigator.clipboard.writeText(generateCurlCommand());
    setCopiedCurl(true);
    toast.success('cURL Copied', 'Command copied to clipboard');
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
  };

  const handleDownloadResponse = () => {
    const blob = new Blob([response], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monkdb-response-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Downloaded', 'Response saved to file');
  };

  const paginatedRows = useMemo(() => {
    if (!responseData?.rows || !Array.isArray(responseData.rows)) return null;
    const start = (currentPage - 1) * resultsPerPage;
    return responseData.rows.slice(start, start + resultsPerPage);
  }, [responseData, currentPage, resultsPerPage]);

  const totalRows = responseData?.rows?.length || 0;
  const totalPages = Math.ceil(totalRows / resultsPerPage);
  const startRow = totalRows > 0 ? (currentPage - 1) * resultsPerPage + 1 : 0;
  const endRow = Math.min(currentPage * resultsPerPage, totalRows);

  return (
    <div className="flex h-full flex-col overflow-hidden">

      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-6 py-4 dark:border-gray-700 dark:from-gray-800 dark:to-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <Code className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">API Playground</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Test MonkDB's SQL HTTP API — <code className="font-mono">POST /_sql</code>
              </p>
            </div>
          </div>

          {activeConnection ? (
            <div className="flex items-center gap-2 rounded-lg border border-green-300 bg-green-50 px-3 py-2 dark:border-green-900/50 dark:bg-green-900/20">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-xs font-medium text-green-700 dark:text-green-300">
                {activeConnection.config.host}:{activeConnection.config.port}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 dark:border-red-900/50 dark:bg-red-900/20">
              <AlertCircle className="h-4 w-4 text-red-500 dark:text-red-400" />
              <span className="text-xs font-medium text-red-700 dark:text-red-300">Not connected</span>
            </div>
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-auto">
        <div className="space-y-4 p-4">

          {/* Security warnings — compact */}
          {activeConnection && (
            <>
              {(activeConnection.config.username === 'crate' || !activeConnection.config.password) && (
                <div className="flex items-start gap-2.5 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 dark:border-orange-800 dark:bg-orange-900/20">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-orange-600 dark:text-orange-400" />
                  <p className="text-xs text-orange-800 dark:text-orange-200">
                    <strong>Default or empty credentials detected.</strong> Use strong authentication in production.
                  </p>
                </div>
              )}
              {typeof window !== 'undefined' && !window.location.hostname.match(/^(localhost|127\.0\.0\.1|192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/) && (
                <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-900/20">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600 dark:text-red-400" />
                  <p className="text-xs text-red-800 dark:text-red-200">
                    <strong>Public network detected.</strong> Ensure your MonkDB instance is secured with authentication and firewall rules.
                  </p>
                </div>
              )}
            </>
          )}

          {/* API info */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
            <h3 className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-blue-900 dark:text-blue-300">
              <Zap className="h-4 w-4" />
              MonkDB HTTP API
            </h3>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-blue-800 dark:text-blue-200">
              <span className="rounded bg-green-600 px-2 py-0.5 text-xs font-bold text-white">POST</span>
              <code className="rounded bg-blue-100 px-2 py-0.5 font-mono dark:bg-blue-900">/_sql</code>
              <span className="text-blue-400">·</span>
              <span>Body: <code className="rounded bg-blue-100 px-1 dark:bg-blue-900">{`{ "stmt": "...", "args": [...] }`}</code></span>
              <span className="text-blue-400">·</span>
              <span>Returns: <code className="rounded bg-blue-100 px-1 dark:bg-blue-900">cols</code>, <code className="rounded bg-blue-100 px-1 dark:bg-blue-900">rows</code>, <code className="rounded bg-blue-100 px-1 dark:bg-blue-900">rowcount</code></span>
            </div>
          </div>

          {/* Quick examples */}
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Quick Examples</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {EXAMPLES.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => setBody(ex.body)}
                  className="rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-left transition-colors hover:border-blue-300 hover:bg-blue-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-blue-600 dark:hover:bg-blue-900/20"
                >
                  <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">{ex.label}</p>
                  <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-500">{ex.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-900/20">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
              <div>
                <p className="text-sm font-semibold text-red-900 dark:text-red-300">Request Failed</p>
                <p className="mt-1 text-xs text-red-800 dark:text-red-200">{error}</p>
              </div>
            </div>
          )}

          {/* Request + Response */}
          <div className="grid gap-4 lg:grid-cols-2">

            {/* Request */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Request</h3>

              {/* Static endpoint + Send */}
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-900">
                <span className="rounded bg-green-600 px-2 py-0.5 text-xs font-bold text-white">POST</span>
                <span className="flex-1 font-mono text-sm text-gray-700 dark:text-gray-300">/_sql</span>
                <button
                  onClick={handleSend}
                  disabled={isLoading || !activeConnection}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                  {isLoading ? (
                    <>
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Sending
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5" />
                      Send
                    </>
                  )}
                </button>
              </div>

              {/* Body */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">
                  Request Body <span className="text-gray-400">(JSON)</span>
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={10}
                  spellCheck={false}
                  className="w-full rounded-lg border border-gray-300 p-3 font-mono text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>

              {/* cURL */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">cURL</label>
                  <button
                    onClick={handleCopyCurl}
                    className="flex items-center gap-1 rounded bg-gray-200 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                  >
                    {copiedCurl ? (
                      <><Check className="h-3 w-3" /> Copied</>
                    ) : (
                      <><Copy className="h-3 w-3" /> Copy</>
                    )}
                  </button>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900">
                  <pre className="overflow-x-auto text-xs text-gray-800 dark:text-gray-200">
                    {generateCurlCommand()}
                  </pre>
                </div>
              </div>
            </div>

            {/* Response */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Response</h3>
                {statusCode > 0 && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className={`rounded-full px-2.5 py-1 font-semibold ${
                      statusCode === 200
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {statusCode === 200 ? '200 OK' : `${statusCode} Error`}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">{responseTime}ms</span>
                    {response && (
                      <span className="text-gray-500 dark:text-gray-400">{formatFileSize(responseSize)}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Row / column summary */}
              {totalRows > 0 && (
                <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-900/50">
                  <span className="text-gray-600 dark:text-gray-400">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {totalRows.toLocaleString()}
                    </span>{' '}
                    rows returned
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">
                    {responseData?.cols?.length || 0} columns
                  </span>
                </div>
              )}

              {/* Pagination */}
              {totalRows > resultsPerPage && (
                <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-800">
                  <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <span>{startRow}–{endRow} of {totalRows.toLocaleString()}</span>
                    <select
                      value={resultsPerPage}
                      onChange={(e) => { setResultsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                      className="rounded border border-gray-300 bg-white px-1.5 py-0.5 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    >
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                      <option value={200}>200</option>
                    </select>
                    <span className="text-gray-400">per page</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="rounded border border-gray-300 p-1 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-600 dark:hover:bg-gray-700"
                    >
                      <ChevronLeft className="h-3 w-3" />
                    </button>
                    <span className="px-2 text-xs text-gray-600 dark:text-gray-400">
                      {currentPage}/{totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="rounded border border-gray-300 p-1 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-600 dark:hover:bg-gray-700"
                    >
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )}

              {/* Response body */}
              <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2 dark:border-gray-700">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Response Body</span>
                  {response && (
                    <button
                      onClick={handleDownloadResponse}
                      className="flex items-center gap-1 rounded bg-gray-200 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                    >
                      <Download className="h-3 w-3" />
                      Download
                    </button>
                  )}
                </div>
                <div className="p-4">
                  {response ? (
                    <pre className="overflow-x-auto text-xs text-gray-900 dark:text-gray-100">
                      {paginatedRows
                        ? JSON.stringify({
                            ...responseData,
                            rows: paginatedRows,
                            _pagination: {
                              page: currentPage,
                              per_page: resultsPerPage,
                              total_rows: totalRows,
                              showing: `${startRow}-${endRow} of ${totalRows}`,
                            },
                          }, null, 2)
                        : response}
                    </pre>
                  ) : (
                    <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">
                      Send a request to see the response
                    </p>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
