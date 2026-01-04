'use client';

import { useState } from 'react';
import { useActiveConnection } from '../lib/monkdb-context';
import { useToast } from './ToastContext';
import { AlertCircle, Code, CheckCircle, Copy, Check, AlertTriangle } from 'lucide-react';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export default function APIPlayground() {
  const activeConnection = useActiveConnection();
  const toast = useToast();
  const [method, setMethod] = useState<HttpMethod>('POST');
  const [endpoint, setEndpoint] = useState('/_sql');
  const [headers, setHeaders] = useState('{\n  "Content-Type": "application/json"\n}');
  const [body, setBody] = useState('{\n  "stmt": "SELECT * FROM your_schema.your_table WHERE id = ?",\n  "args": [2]\n}');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [responseTime, setResponseTime] = useState(0);
  const [statusCode, setStatusCode] = useState(0);
  const [error, setError] = useState('');
  const [copiedCurl, setCopiedCurl] = useState(false);

  const endpoints = [
    {
      path: '/_sql',
      method: 'POST',
      desc: 'SELECT Query',
      body: '{\n  "stmt": "SELECT * FROM your_schema.your_table WHERE id = ?",\n  "args": [2]\n}'
    },
    {
      path: '/_sql',
      method: 'POST',
      desc: 'INSERT Record',
      body: '{\n  "stmt": "INSERT INTO your_schema.your_table (id, name, description) VALUES (?, ?, ?)",\n  "args": [2, "Sample Name", "Sample Description"]\n}'
    },
    {
      path: '/_sql',
      method: 'POST',
      desc: 'UPDATE Record',
      body: '{\n  "stmt": "UPDATE your_schema.your_table SET name = ? WHERE id = ?",\n  "args": ["Updated Name", 2]\n}'
    },
    {
      path: '/_sql',
      method: 'POST',
      desc: 'DELETE Record',
      body: '{\n  "stmt": "DELETE FROM your_schema.your_table WHERE id = ?",\n  "args": [2]\n}'
    },
    {
      path: '/_sql',
      method: 'POST',
      desc: 'Show Tables',
      body: '{\n  "stmt": "SELECT table_schema, table_name FROM information_schema.tables WHERE table_type = \'BASE TABLE\' AND table_schema NOT LIKE \'sys.%\' ORDER BY table_schema, table_name",\n  "args": []\n}'
    },
    {
      path: '/_sql',
      method: 'POST',
      desc: 'Table Storage Query',
      body: '{\n  "stmt": "SELECT table_name, SUM(num_docs) as records, (SUM(size) / (1024 * 1024)) as total_size_mb FROM sys.shards WHERE PRIMARY GROUP BY 1 ORDER BY total_size_mb",\n  "args": []\n}'
    },
  ];

  const handleSend = async () => {
    if (!activeConnection) {
      setError('No active connection. Please connect to a MonkDB instance first.');
      toast.error('No Connection', 'Please connect to a MonkDB instance first.');
      return;
    }

    setIsLoading(true);
    setError('');
    const startTime = performance.now();

    try {
      // Parse the request body to extract stmt and args
      const requestBody = JSON.parse(body);
      const { stmt, args } = requestBody;

      if (!stmt) {
        throw new Error('Missing "stmt" field in request body');
      }

      // Execute real query using MonkDB client
      const result = await activeConnection.client.query(stmt, args || []);

      const endTime = performance.now();
      const time = Math.round(endTime - startTime);
      setResponseTime(time);
      setStatusCode(200);
      setResponse(JSON.stringify(result, null, 2));
      toast.success('Request Successful', `Response received in ${time}ms`);
    } catch (err) {
      const endTime = performance.now();
      setResponseTime(Math.round(endTime - startTime));
      setStatusCode(500);
      const errorMsg = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMsg);
      setResponse(JSON.stringify({
        error: err instanceof Error ? err.message : 'Unknown error',
        message: 'Query execution failed'
      }, null, 2));
      toast.error('Request Failed', errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCurl = () => {
    const curlCmd = generateCurlCommand();
    navigator.clipboard.writeText(curlCmd);
    setCopiedCurl(true);
    toast.success('cURL Copied', 'Command copied to clipboard');
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  const generateCurlCommand = () => {
    try {
      const headersObj = JSON.parse(headers);
      const headerFlags = Object.entries(headersObj)
        .map(([key, value]) => `-H "${key}: ${value}"`)
        .join(' ');

      const host = activeConnection?.config.host || 'localhost';
      const port = activeConnection?.config.port || 4200;
      const protocol = activeConnection?.config.protocol || 'http';
      const baseUrl = `${protocol}://${host}:${port}`;

      if (method === 'GET') {
        return `curl -X ${method} ${headerFlags} "${baseUrl}${endpoint}"`;
      } else {
        return `curl -X ${method} ${headerFlags} \\\n  -d '${body.replace(/\n/g, '')}' \\\n  "${baseUrl}${endpoint}"`;
      }
    } catch (e) {
      return 'Invalid JSON in headers';
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Fixed Header */}
      <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-6 py-4 dark:border-gray-700 dark:from-gray-800 dark:to-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <Code className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                API Playground
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Test and explore MonkDB SQL API with real-time responses
              </p>
            </div>
          </div>
          {/* Connection Status */}
          {activeConnection && (
            <div className="flex items-center gap-2 rounded-lg border border-green-300 bg-green-50 px-3 py-2 dark:border-green-900/50 dark:bg-green-900/20">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-xs font-medium text-green-700 dark:text-green-300">
                Connected
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-auto">
        <div className="space-y-4 p-4">
          {/* Setup Instructions */}
          <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-blue-900 dark:text-blue-300">
              <AlertTriangle className="h-4 w-4" />
              MonkDB SQL API Endpoint
            </h3>
            <div className="space-y-2 text-xs text-blue-800 dark:text-blue-200">
              <p><strong>MonkDB uses a unified SQL endpoint for all operations:</strong></p>
              <ul className="ml-4 list-disc space-y-1">
                <li>Endpoint: <code className="rounded bg-blue-100 px-1 dark:bg-blue-900">/_sql</code> (POST method)</li>
                <li>Request body format: <code className="rounded bg-blue-100 px-1 dark:bg-blue-900">{`{"stmt": "SQL query", "args": [...]}`}</code></li>
                <li>Supports parameterized queries with <code className="rounded bg-blue-100 px-1 dark:bg-blue-900">?</code> placeholders</li>
                <li>All CRUD operations (SELECT, INSERT, UPDATE, DELETE) use the same endpoint</li>
                <li>Returns JSON response with <code className="rounded bg-blue-100 px-1 dark:bg-blue-900">rows</code> and <code className="rounded bg-blue-100 px-1 dark:bg-blue-900">cols</code> fields</li>
              </ul>
              <p className="mt-2 border-t border-blue-300 pt-2 dark:border-blue-700">
                <strong>Example:</strong> Replace <code className="rounded bg-blue-100 px-1 dark:bg-blue-900">your_schema.your_table</code> with your actual table name in the quick examples below.
              </p>
            </div>
          </div>

      {/* Quick Endpoints */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
          Quick SQL Examples
        </h3>
        <p className="mb-4 text-xs text-gray-600 dark:text-gray-400">
          MonkDB uses the <code className="rounded bg-gray-100 px-1 dark:bg-gray-700">/_sql</code> endpoint for all SQL operations
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {endpoints.map((ep, idx) => (
            <button
              key={idx}
              onClick={() => {
                setEndpoint(ep.path);
                setMethod(ep.method as HttpMethod);
                setBody((ep as any).body || body);
              }}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3 text-left hover:border-blue-300 hover:bg-blue-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-blue-600 dark:hover:bg-blue-900/20"
            >
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">{ep.desc}</p>
                <p className="mt-1 text-xs font-mono text-gray-500 dark:text-gray-500">{ep.path}</p>
              </div>
              <span
                className="ml-2 rounded px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              >
                {ep.method}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="rounded-lg border-2 border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-900/20">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-red-900 dark:text-red-300">
                API Request Failed
              </h3>
              <p className="mt-2 text-xs text-red-800 dark:text-red-200">
                {error}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Request Builder */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Request */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Request</h3>

          {/* Method & Endpoint */}
          <div className="flex gap-2">
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as HttpMethod)}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 font-semibold dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
              <option value="PATCH">PATCH</option>
            </select>
            <input
              type="text"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-mono text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              placeholder="/api/v1/..."
            />
            <button
              onClick={handleSend}
              disabled={isLoading}
              className="rounded-lg bg-blue-600 px-6 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              {isLoading ? '⟳ Sending...' : 'Send'}
            </button>
          </div>

          {/* Headers */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Headers
            </label>
            <textarea
              value={headers}
              onChange={(e) => setHeaders(e.target.value)}
              className="h-32 w-full rounded-lg border border-gray-300 p-4 font-mono text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>

          {/* Body */}
          {method !== 'GET' && method !== 'DELETE' && (
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Request Body
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="h-48 w-full rounded-lg border border-gray-300 p-4 font-mono text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>
          )}

          {/* cURL Command */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                cURL Command
              </label>
              <button
                onClick={handleCopyCurl}
                className="flex items-center gap-1 rounded bg-gray-200 px-2 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                {copiedCurl ? (
                  <>
                    <Check className="h-3 w-3" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    Copy
                  </>
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
              <div className="flex items-center gap-3 text-sm">
                <span
                  className={`rounded-full px-3 py-1 font-semibold ${
                    statusCode === 200
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}
                >
                  {statusCode}
                </span>
                <span className="text-gray-500 dark:text-gray-400">{responseTime}ms</span>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
            <div className="border-b border-gray-200 px-4 py-2 dark:border-gray-700">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Response Body
              </span>
            </div>
            <div className="p-4">
              {response ? (
                <pre className="overflow-x-auto text-xs text-gray-900 dark:text-gray-100">
                  {response}
                </pre>
              ) : (
                <p className="text-center text-sm text-gray-500 dark:text-gray-400">
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
