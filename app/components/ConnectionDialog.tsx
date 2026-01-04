'use client';

import { useState } from 'react';
import { MonkDBClient } from '../lib/monkdb-client';
import { isDesktopApp } from '../lib/tauri-utils';
import { Loader2, CheckCircle, XCircle, AlertCircle, ExternalLink, Database, Eye, EyeOff } from 'lucide-react';
import DebugInfo from './DebugInfo';
import Select from './ui/Select';

interface ConnectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (connectionData: ConnectionFormData) => void;
  initialData?: ConnectionFormData;
  mode?: 'add' | 'edit';
}

export interface ConnectionFormData {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  authType: string;
  savePassword: boolean;
  showAllDatabases: boolean;
}

export default function ConnectionDialog({
  isOpen,
  onClose,
  onConnect,
  initialData,
  mode = 'add'
}: ConnectionDialogProps) {
  const [connectBy, setConnectBy] = useState<'host' | 'url'>('host');
  const [formData, setFormData] = useState<ConnectionFormData>(
    initialData || {
      host: isDesktopApp() ? '127.0.0.1' : 'localhost',
      port: 4200,
      database: 'doc',
      username: '',
      password: '',
      authType: 'Database Native',
      savePassword: true,
      showAllDatabases: false,
    }
  );
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [monkDBStatus, setMonkDBStatus] = useState<'checking' | 'online' | 'offline' | 'unknown'>('unknown');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConnect(formData);
  };

  const checkMonkDBStatus = async () => {
    setMonkDBStatus('checking');
    try {
      console.log('[ConnectionDialog] Checking MonkDB status...');

      // Use MonkDBClient which automatically handles Tauri commands in desktop mode
      const client = new MonkDBClient({
        host: 'localhost',
        port: 4200,
        protocol: 'http',
        timeout: 5000,
      });

      // Try a simple query
      await client.query('SELECT 1');

      console.log('[ConnectionDialog] MonkDB is online');
      setMonkDBStatus('online');
    } catch (error) {
      console.error('[ConnectionDialog] MonkDB check failed:', error);
      setMonkDBStatus('offline');
    }
  };

  const handleTestConnection = async () => {
    setTestStatus('testing');
    setTestMessage('');

    try {
      console.log('[ConnectionDialog] Testing connection to', formData.host + ':' + formData.port);

      // Create a temporary MonkDB client with the form data
      const client = new MonkDBClient({
        host: formData.host,
        port: formData.port,
        protocol: 'http',
        username: formData.username,
        password: formData.password,
        timeout: 5000, // 5 second timeout for testing
      });

      // Try a simple query to test the connection
      const result = await client.query('SELECT 1');
      console.log('[ConnectionDialog] Test connection successful:', result);

      setTestStatus('success');
      setTestMessage('Connection successful!');

      // Clear success message after 3 seconds
      setTimeout(() => {
        setTestStatus('idle');
        setTestMessage('');
      }, 3000);
    } catch (error) {
      console.error('[ConnectionDialog] Test connection failed:', error);
      setTestStatus('error');

      let errorMessage = 'Unknown error occurred';

      if (error instanceof Error) {
        errorMessage = error.message;
        console.error('[ConnectionDialog] Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
      } else {
        console.error('[ConnectionDialog] Non-Error object:', error);
        errorMessage = String(error);
      }

      // Provide helpful error messages
      if (errorMessage.includes('fetch failed') || errorMessage.includes('ECONNREFUSED')) {
        errorMessage = '❌ Cannot reach MonkDB!\n\nSteps to fix:\n1. Install Docker Desktop (see link above)\n2. Open Docker Desktop\n3. Run: ./scripts/start-monkdb.sh\n4. Wait 15 seconds\n5. Try again';
      } else if (errorMessage.includes('timeout')) {
        errorMessage = '⏱️ Connection timeout\n\nMonkDB might be starting up.\nWait 10 seconds and try again.';
      } else if (errorMessage.includes('Authentication')) {
        errorMessage = '🔒 Authentication failed\n\nCheck your username and password.';
      }

      setTestMessage(errorMessage);
    }
  };

  if (!isOpen) return null;

  const jdbcUrl = `jdbc:postgresql://${formData.host}:${formData.port}/${formData.database}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <DebugInfo />
      <div className="w-full max-w-5xl my-auto rounded-xl bg-white shadow-2xl dark:bg-gray-800 max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700 flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Connect to MonkDB
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              MonkDB connection settings
            </p>
          </div>
          {/* Close Button - Enterprise Grade */}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:hover:bg-gray-700 dark:hover:text-gray-300"
            aria-label="Close dialog"
            title="Close"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* MonkDB Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-3 flex-shrink-0">
          <div className="flex items-center justify-center gap-3 text-white">
            <div className="flex items-center gap-2 text-xl font-bold">
              <Database className="h-7 w-7" />
              MonkDB
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex flex-1 min-h-0 overflow-y-auto">
            {/* Left Panel - Form */}
            <div className="flex-1 p-6">
              <div className="space-y-4">
                  {/* Setup Guide Banner */}
                  <div className={`rounded-lg border p-3 ${
                    monkDBStatus === 'online'
                      ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                      : monkDBStatus === 'offline'
                      ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                      : 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20'
                  }`}>
                    <div className="flex items-start gap-3">
                      {monkDBStatus === 'online' ? (
                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                      ) : monkDBStatus === 'offline' ? (
                        <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className={`text-sm font-semibold ${
                            monkDBStatus === 'online'
                              ? 'text-green-900 dark:text-green-100'
                              : monkDBStatus === 'offline'
                              ? 'text-red-900 dark:text-red-100'
                              : 'text-blue-900 dark:text-blue-100'
                          }`}>
                            {monkDBStatus === 'online' && 'MonkDB is running!'}
                            {monkDBStatus === 'offline' && 'MonkDB is not running'}
                            {monkDBStatus === 'unknown' && 'MonkDB Required'}
                            {monkDBStatus === 'checking' && 'Checking MonkDB...'}
                          </h4>
                          <button
                            type="button"
                            onClick={checkMonkDBStatus}
                            disabled={monkDBStatus === 'checking'}
                            className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
                              monkDBStatus === 'online'
                                ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-800 dark:text-green-200'
                                : monkDBStatus === 'offline'
                                ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-800 dark:text-red-200'
                                : 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-800 dark:text-blue-200'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {monkDBStatus === 'checking' ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              'Check Status'
                            )}
                          </button>
                        </div>

                        {monkDBStatus === 'online' ? (
                          <p className="mt-1 text-xs text-green-700 dark:text-green-300">
                            MonkDB is accessible on port 4200. You can now test your connection.
                          </p>
                        ) : monkDBStatus === 'offline' ? (
                          <div className="mt-2 space-y-2">
                            <p className="text-xs text-red-700 dark:text-red-300 font-semibold">
                              ⚠️ MonkDB is not running
                            </p>
                            <div className="text-xs text-red-600 dark:text-red-400 space-y-1">
                              <p className="font-medium">Quick Start:</p>
                              <ol className="list-decimal list-inside space-y-0.5 ml-1">
                                <li>Install Docker Desktop: <a href="https://www.docker.com/products/docker-desktop" target="_blank" rel="noopener noreferrer" className="underline hover:text-red-700">Download</a></li>
                                <li>Open Docker Desktop and wait for it to start</li>
                                <li>Run: <code className="px-1 py-0.5 bg-red-100 dark:bg-red-900 rounded font-mono text-[10px]">./scripts/start-monkdb.sh</code></li>
                                <li>Click "Check Status" above</li>
                              </ol>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="mt-1 text-xs text-blue-700 dark:text-blue-300">
                              Click "Check Status" to verify MonkDB is running.
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Server Section */}
                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Server
                    </h3>

                    {/* Connect By */}
                    <div className="mb-4">
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Connect by:
                      </label>
                      <div className="flex gap-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            value="host"
                            checked={connectBy === 'host'}
                            onChange={(e) => setConnectBy(e.target.value as 'host')}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">Host</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            value="url"
                            checked={connectBy === 'url'}
                            onChange={(e) => setConnectBy(e.target.value as 'url')}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">URL</span>
                        </label>
                      </div>
                    </div>

                    {connectBy === 'url' ? (
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          URL:
                        </label>
                        <input
                          type="text"
                          value={jdbcUrl}
                          readOnly
                          className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                    ) : (
                      <>
                        {/* Host and Port */}
                        <div className="mb-4 flex gap-4">
                          <div className="flex-1">
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                              Host:
                            </label>
                            <input
                              type="text"
                              required
                              value={formData.host}
                              onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                              placeholder={isDesktopApp() ? "127.0.0.1" : "localhost"}
                            />
                          </div>
                          <div className="w-32">
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                              Port:
                            </label>
                            <input
                              type="number"
                              required
                              value={formData.port}
                              onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) })}
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            />
                          </div>
                        </div>

                        {/* Database */}
                        <div className="mb-4 flex items-center gap-4">
                          <div className="flex-1">
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                              Database:
                            </label>
                            <input
                              type="text"
                              required
                              value={formData.database}
                              onChange={(e) => setFormData({ ...formData, database: e.target.value })}
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                              placeholder="doc (default schema)"
                            />
                          </div>
                          <div className="mt-7">
                            <label className="flex items-center text-sm">
                              <input
                                type="checkbox"
                                checked={formData.showAllDatabases}
                                onChange={(e) => setFormData({ ...formData, showAllDatabases: e.target.checked })}
                                className="mr-2"
                              />
                              <span className="text-gray-700 dark:text-gray-300">Show all databases</span>
                            </label>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Authentication Section */}
                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Authentication
                    </h3>

                    {/* Auth Type */}
                    <div className="mb-4">
                      <Select
                        label="Authentication:"
                        value={formData.authType}
                        onChange={(e) => setFormData({ ...formData, authType: e.target.value })}
                        fullWidth
                      >
                        <option value="Database Native">Database Native</option>
                        <option value="LDAP">LDAP</option>
                        <option value="Kerberos">Kerberos</option>
                      </Select>
                    </div>

                    {/* Username */}
                    <div className="mb-4">
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Username:
                        <span className="ml-2 text-xs text-gray-500">(optional - leave empty if no auth)</span>
                      </label>
                      <input
                        type="text"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        placeholder="Leave empty for no authentication"
                      />
                    </div>

                    {/* Password with Show/Hide Toggle - Enterprise Grade */}
                    <div className="mb-4">
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Password:
                        <span className="ml-2 text-xs text-gray-500">(optional)</span>
                      </label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            type={showPassword ? "text" : "password"}
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            placeholder="Leave empty for no authentication"
                            autoComplete="new-password"
                          />
                          {/* Password Toggle Button */}
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-gray-200"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                            title={showPassword ? "Hide password" : "Show password"}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                        <label className="flex items-center text-sm">
                          <input
                            type="checkbox"
                            checked={formData.savePassword}
                            onChange={(e) => setFormData({ ...formData, savePassword: e.target.checked })}
                            className="mr-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700"
                          />
                          <span className="text-gray-700 dark:text-gray-300">Save password</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
            </div>

            {/* Right Panel - Info */}
            <div className="w-96 border-l border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-900">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="flex items-center gap-2 text-sm text-blue-600 hover:underline dark:text-blue-400"
                  >
                    + SSH, SSL, ...
                  </button>
                  <Select className="flex-1">
                    <option>No profile</option>
                  </Select>
                </div>

                <div className="mt-6 space-y-3">
                  <a href="#" className="flex items-center gap-2 text-sm text-blue-600 hover:underline dark:text-blue-400">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Connection variables information
                  </a>
                  <span className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    MonkDB Documentation
                  </span>
                  <button
                    type="button"
                    className="rounded border border-gray-300 bg-white px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    Connection details (name, type, ...)
                  </button>
                </div>

                <div className="mt-6 flex gap-2">
                  <button
                    type="button"
                    className="flex-1 rounded border border-gray-300 bg-white px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    Driver Settings
                  </button>
                  <button
                    type="button"
                    className="flex-1 rounded border border-gray-300 bg-white px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    Driver license
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4 dark:border-gray-700 flex-shrink-0 bg-white dark:bg-gray-800">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testStatus === 'testing'}
                className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                {testStatus === 'testing' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  'Test Connection'
                )}
              </button>

              {/* Test Status Message */}
              {testStatus === 'success' && (
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <CheckCircle className="h-5 w-5" />
                  <span>{testMessage}</span>
                </div>
              )}
              {testStatus === 'error' && (
                <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
                  <XCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <pre className="whitespace-pre-wrap font-sans">{testMessage}</pre>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-300 bg-white px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                &lt; Back
              </button>
              <button
                type="button"
                className="rounded-lg border border-gray-300 bg-white px-6 py-2 text-sm font-medium text-gray-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-500"
                disabled
              >
                Next &gt;
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-300 bg-white px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                Finish
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
