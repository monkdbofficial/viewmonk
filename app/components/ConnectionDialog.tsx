'use client';

import { useState } from 'react';
import { MonkDBClient } from '../lib/monkdb-client';
import { isDesktopApp } from '../lib/tauri-utils';
import { Loader2, CheckCircle, XCircle, AlertCircle, ExternalLink, Database, Eye, EyeOff } from 'lucide-react';
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
  useSSL: boolean;
  sslMode: 'require' | 'prefer' | 'disable';
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
      useSSL: false,
      sslMode: 'prefer',
    }
  );
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  // Reset test status when connection details change
  const updateFormData = (updates: Partial<ConnectionFormData>) => {
    setFormData({ ...formData, ...updates });
    // If critical connection fields change, reset test status
    if ('host' in updates || 'port' in updates || 'username' in updates || 'password' in updates) {
      if (testStatus === 'success') {
        setTestStatus('idle');
        setTestMessage('');
      }
    }
  };
  const [monkDBStatus, setMonkDBStatus] = useState<'checking' | 'online' | 'offline' | 'unknown'>('unknown');
  const [showPassword, setShowPassword] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [userManagementMode, setUserManagementMode] = useState<'create' | 'reset'>('create');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [userRole, setUserRole] = useState<'read-write' | 'read-only' | 'superuser'>('read-write');
  const [createUserStatus, setCreateUserStatus] = useState<'idle' | 'creating' | 'success' | 'error'>('idle');
  const [createUserMessage, setCreateUserMessage] = useState('');

  // Password strength calculation
  const calculatePasswordStrength = (password: string): { score: number; label: string; color: string; feedback: string[] } => {
    if (!password) return { score: 0, label: 'None', color: 'gray', feedback: [] };

    let score = 0;
    const feedback: string[] = [];

    // Length check
    if (password.length >= 8) score += 25;
    else feedback.push('At least 8 characters');

    if (password.length >= 12) score += 10;

    // Uppercase letter
    if (/[A-Z]/.test(password)) score += 20;
    else feedback.push('At least 1 uppercase letter');

    // Lowercase letter
    if (/[a-z]/.test(password)) score += 15;

    // Number
    if (/\d/.test(password)) score += 20;
    else feedback.push('At least 1 number');

    // Special character
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 20;
    else feedback.push('At least 1 special character');

    // Determine label and color
    let label = 'Weak';
    let color = 'red';

    if (score >= 90) {
      label = 'Strong';
      color = 'green';
    } else if (score >= 60) {
      label = 'Medium';
      color = 'yellow';
    }

    return { score, label, color, feedback };
  };

  const passwordStrength = calculatePasswordStrength(newPassword);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate username is provided
    if (!formData.username.trim()) {
      setTestStatus('error');
      setTestMessage('❌ Username is required\n\nMonkDB requires authentication. Create a user first:\n\n1. Connect as superuser:\n   psql -h localhost -p 5432 -U monkdb -d monkdb\n\n2. Create user:\n   CREATE USER youruser WITH (password = \'yourpassword\');\n\n3. Grant privileges:\n   GRANT ALL PRIVILEGES TO youruser;');
      return;
    }

    // Validate password is provided
    if (!formData.password.trim()) {
      setTestStatus('error');
      setTestMessage('❌ Password is required\n\nMonkDB requires password-based authentication for all client connections.');
      return;
    }

    // Require successful connection test before allowing finish
    if (testStatus !== 'success') {
      setTestStatus('error');
      setTestMessage('⚠️ Please test the connection first\n\nClick "Test Connection" to verify your credentials work before saving.');
      return;
    }

    onConnect(formData);
  };

  const checkMonkDBStatus = async () => {
    setMonkDBStatus('checking');
    try {
      console.log('[ConnectionDialog] Checking MonkDB status on', formData.host + ':' + formData.port);

      // Use MonkDBClient which automatically handles Tauri commands in desktop mode
      const client = new MonkDBClient({
        host: formData.host,
        port: formData.port,
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

      // Clear success message after 3 seconds but keep the success status
      setTimeout(() => {
        setTestMessage('');
      }, 3000);
    } catch (error) {
      console.error('[ConnectionDialog] Test connection failed:', error);
      setTestStatus('error');

      let errorMessage = 'Unknown error occurred';
      let isAuthError = false;

      if (error instanceof Error) {
        errorMessage = error.message;
        isAuthError = (error as any).isAuthError || (error as any).category === 'auth';
        console.error('[ConnectionDialog] Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name,
          category: (error as any).category,
          isAuthError
        });
      } else {
        console.error('[ConnectionDialog] Non-Error object:', error);
        errorMessage = String(error);
      }

      // Provide helpful error messages
      if (errorMessage.includes('fetch failed') || errorMessage.includes('ECONNREFUSED')) {
        errorMessage = '❌ Cannot reach MonkDB!\n\nSteps to fix:\n1. Install Docker Desktop (see link above)\n2. Open Docker Desktop\n3. Run: ./scripts/start-monkdb.sh\n4. Wait 15 seconds\n5. Try again';
      } else if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
        errorMessage = '⏱️ Connection timeout\n\nMonkDB might be starting up.\nWait 10 seconds and try again.';
      } else if (
        isAuthError ||
        errorMessage.toLowerCase().includes('authentication') ||
        errorMessage.toLowerCase().includes('password') ||
        errorMessage.toLowerCase().includes('auth') ||
        errorMessage.toLowerCase().includes('trust') ||
        errorMessage.toLowerCase().includes('credentials') ||
        errorMessage.toLowerCase().includes('invalid username')
      ) {
        errorMessage = '🔒 Invalid Credentials\n\n❌ Username or password is incorrect.\n\n💡 New user? Click the button below to create an account!';
      } else if (errorMessage.includes('parse') || errorMessage.includes('JSON')) {
        errorMessage = '🔒 Authentication Error\n\n❌ Invalid credentials or MonkDB configuration issue.\n\n💡 Click the button below to create an account!';
      }

      setTestMessage(errorMessage);
    }
  };

  const handleCreateUser = async () => {
    setCreateUserStatus('creating');
    setCreateUserMessage('');

    // Validate inputs
    if (!newUsername.trim()) {
      setCreateUserStatus('error');
      setCreateUserMessage('❌ Please enter a username');
      return;
    }

    if (!newPassword.trim()) {
      setCreateUserStatus('error');
      setCreateUserMessage('❌ Please enter a password');
      return;
    }

    try {
      console.log('[ConnectionDialog] Creating new MonkDB user:', newUsername);

      // Connect as superuser (no password, localhost only)
      const superuserClient = new MonkDBClient({
        host: formData.host,
        port: formData.port,
        protocol: 'http',
        username: 'monkdb',
        password: '', // Trust authentication
        timeout: 10000,
      });

      // Create the user
      console.log('[ConnectionDialog] Executing CREATE USER...');
      await superuserClient.query(
        `CREATE USER ${newUsername} WITH (password = '${newPassword}')`
      );

      // Grant privileges based on role
      console.log('[ConnectionDialog] Granting privileges based on role:', userRole);
      if (userRole === 'superuser') {
        // Grant AL (Admin Level) privilege for superuser access
        await superuserClient.query(`GRANT AL TO ${newUsername}`);
      } else if (userRole === 'read-write') {
        await superuserClient.query(`GRANT ALL PRIVILEGES TO ${newUsername}`);
      } else if (userRole === 'read-only') {
        // For read-only, grant SELECT on all tables
        await superuserClient.query(`GRANT SELECT ON ALL TABLES IN SCHEMA doc TO ${newUsername}`);
        await superuserClient.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA doc GRANT SELECT ON TABLES TO ${newUsername}`);
      }

      console.log('[ConnectionDialog] User created successfully!');
      setCreateUserStatus('success');
      setCreateUserMessage(`✅ User "${newUsername}" created successfully!\n\nCredentials have been filled in the form. You can now click "Finish".`);

      // Auto-fill the connection form with new credentials
      setFormData({
        ...formData,
        username: newUsername,
        password: newPassword,
      });

      // Auto-mark connection as tested since we just created the user
      setTestStatus('success');
      setTestMessage('Connection verified (user created)');

      // Close create user panel after 2 seconds
      setTimeout(() => {
        setShowCreateUser(false);
        setCreateUserStatus('idle');
        setCreateUserMessage('');
      }, 2000);

    } catch (error) {
      console.error('[ConnectionDialog] Failed to create user:', error);
      setCreateUserStatus('error');

      let errorMessage = 'Failed to create user';

      if (error instanceof Error) {
        errorMessage = error.message;

        // Provide helpful error messages
        if (errorMessage.includes('already exists')) {
          // Offer to switch to reset password mode
          setCreateUserStatus('error');
          setCreateUserMessage(`⚠️ User "${newUsername}" already exists!\n\nWould you like to reset the password instead?`);
          // Auto-switch to reset mode
          setTimeout(() => {
            setUserManagementMode('reset');
            setCreateUserStatus('idle');
            setCreateUserMessage('');
          }, 2000);
          return;
        } else if (errorMessage.includes('Authentication') || errorMessage.includes('authentication')) {
          errorMessage = `❌ Cannot connect as superuser\n\nMake sure MonkDB is running and accessible on ${formData.host}:${formData.port}`;
        } else if (errorMessage.includes('Connection') || errorMessage.includes('ECONNREFUSED')) {
          errorMessage = `❌ Cannot reach MonkDB at ${formData.host}:${formData.port}\n\nMake sure MonkDB is running.`;
        }
      }

      setCreateUserMessage(errorMessage);
    }
  };

  const handleResetPassword = async () => {
    setCreateUserStatus('creating');
    setCreateUserMessage('');

    // Validate inputs
    if (!newUsername.trim()) {
      setCreateUserStatus('error');
      setCreateUserMessage('❌ Please enter a username');
      return;
    }

    if (!newPassword.trim()) {
      setCreateUserStatus('error');
      setCreateUserMessage('❌ Please enter a new password');
      return;
    }

    try {
      console.log('[ConnectionDialog] Resetting password for user:', newUsername);

      // Connect as superuser (no password, localhost only)
      const superuserClient = new MonkDBClient({
        host: formData.host,
        port: formData.port,
        protocol: 'http',
        username: 'monkdb',
        password: '', // Trust authentication
        timeout: 10000,
      });

      // Check if user exists
      console.log('[ConnectionDialog] Checking if user exists...');
      const userCheck = await superuserClient.query(
        `SELECT usename FROM pg_user WHERE usename = '${newUsername}'`
      );

      if (!userCheck.rows || userCheck.rows.length === 0) {
        setCreateUserStatus('error');
        setCreateUserMessage(`❌ User "${newUsername}" does not exist\n\nCreate the user first using "Create User" mode.`);
        return;
      }

      // Reset the password
      console.log('[ConnectionDialog] Resetting password...');
      await superuserClient.query(
        `ALTER USER ${newUsername} WITH (password = '${newPassword}')`
      );

      console.log('[ConnectionDialog] Password reset successfully!');
      setCreateUserStatus('success');
      setCreateUserMessage(`✅ Password reset for "${newUsername}" successful!\n\nCredentials have been filled in the form. You can now click "Finish".`);

      // Auto-fill the connection form with new credentials
      setFormData({
        ...formData,
        username: newUsername,
        password: newPassword,
      });

      // Auto-mark connection as tested since we just reset the password
      setTestStatus('success');
      setTestMessage('Connection verified (password reset)');

      // Close panel after 2 seconds
      setTimeout(() => {
        setShowCreateUser(false);
        setCreateUserStatus('idle');
        setCreateUserMessage('');
      }, 2000);

    } catch (error) {
      console.error('[ConnectionDialog] Failed to reset password:', error);
      setCreateUserStatus('error');

      let errorMessage = 'Failed to reset password';

      if (error instanceof Error) {
        errorMessage = error.message;

        // Provide helpful error messages
        if (errorMessage.includes('does not exist')) {
          errorMessage = `❌ User "${newUsername}" does not exist\n\nSwitch to "Create User" mode to create this user first.`;
        } else if (errorMessage.includes('Authentication') || errorMessage.includes('authentication')) {
          errorMessage = `❌ Cannot connect as superuser\n\nMake sure MonkDB is running and accessible on ${formData.host}:${formData.port}`;
        } else if (errorMessage.includes('Connection') || errorMessage.includes('ECONNREFUSED')) {
          errorMessage = `❌ Cannot reach MonkDB at ${formData.host}:${formData.port}\n\nMake sure MonkDB is running.`;
        }
      }

      setCreateUserMessage(errorMessage);
    }
  };

  if (!isOpen) return null;

  const jdbcUrl = `jdbc:postgresql://${formData.host}:${formData.port}/${formData.database}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
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
                              onChange={(e) => updateFormData({ host: e.target.value })}
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
                              onChange={(e) => updateFormData({ port: parseInt(e.target.value) })}
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

                    {/* SSL/TLS Configuration */}
                    <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
                      <div className="mb-2 flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="useSSL"
                          checked={formData.useSSL}
                          onChange={(e) => setFormData({ ...formData, useSSL: e.target.checked })}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700"
                        />
                        <label htmlFor="useSSL" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          🔒 Use SSL/TLS Encryption
                        </label>
                      </div>

                      {formData.useSSL && (
                        <div className="mt-2">
                          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                            SSL Mode:
                          </label>
                          <select
                            value={formData.sslMode}
                            onChange={(e) => setFormData({ ...formData, sslMode: e.target.value as 'require' | 'prefer' | 'disable' })}
                            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                          >
                            <option value="require">Require (Most Secure)</option>
                            <option value="prefer">Prefer (Fallback to non-SSL)</option>
                            <option value="disable">Disable (Not Recommended)</option>
                          </select>
                          <p className="mt-1 text-[10px] text-gray-600 dark:text-gray-400">
                            {formData.sslMode === 'require' && '✓ Connection will fail if SSL is not available'}
                            {formData.sslMode === 'prefer' && '⚠️ Uses SSL if available, falls back to non-SSL'}
                            {formData.sslMode === 'disable' && '❌ No encryption (only for development)'}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Username */}
                    <div className="mb-4">
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Username:
                        <span className="ml-2 text-xs text-red-600 dark:text-red-400">* required for MonkDB connections</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.username}
                        onChange={(e) => updateFormData({ username: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        placeholder="Enter MonkDB username (e.g., testuser)"
                      />
                    </div>

                    {/* Password with Show/Hide Toggle - Enterprise Grade */}
                    <div className="mb-4">
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Password:
                        <span className="ml-2 text-xs text-red-600 dark:text-red-400">* required</span>
                      </label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            type={showPassword ? "text" : "password"}
                            required
                            value={formData.password}
                            onChange={(e) => updateFormData({ password: e.target.value })}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            placeholder="Enter password"
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

                    {/* Create New User Section */}
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700" data-create-user-section>
                      {/* Highlight if authentication error */}
                      {testStatus === 'error' && (testMessage.toLowerCase().includes('auth') || testMessage.toLowerCase().includes('credentials') || testMessage.toLowerCase().includes('password')) && (
                        <div className="mb-2 rounded-lg bg-green-100 border-2 border-green-400 dark:bg-green-900/30 dark:border-green-600 p-2 animate-pulse">
                          <p className="text-xs font-bold text-green-800 dark:text-green-300">
                            💡 Click below to create a user automatically!
                          </p>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => setShowCreateUser(!showCreateUser)}
                        className={`flex items-center gap-2 text-sm font-medium transition-all ${
                          testStatus === 'error' && (testMessage.toLowerCase().includes('auth') || testMessage.toLowerCase().includes('credentials'))
                            ? 'text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 font-bold'
                            : 'text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300'
                        }`}
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        {showCreateUser ? 'Hide Create User' : 'Create New MonkDB User'}
                      </button>

                      {showCreateUser && (
                        <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                          {/* Mode Switcher */}
                          <div className="mb-3 flex gap-2">
                            <button
                              type="button"
                              onClick={() => setUserManagementMode('create')}
                              className={`flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                                userManagementMode === 'create'
                                  ? 'bg-blue-600 text-white dark:bg-blue-700'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                              }`}
                            >
                              Create User
                            </button>
                            <button
                              type="button"
                              onClick={() => setUserManagementMode('reset')}
                              className={`flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                                userManagementMode === 'reset'
                                  ? 'bg-blue-600 text-white dark:bg-blue-700'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                              }`}
                            >
                              Reset Password
                            </button>
                          </div>

                          <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
                            <svg className="h-4 w-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                            </svg>
                            {userManagementMode === 'create' ? 'Create MonkDB User' : 'Reset User Password'}
                          </h4>

                          <p className="mb-3 text-xs text-gray-600 dark:text-gray-400">
                            {userManagementMode === 'create'
                              ? 'This will automatically connect as superuser and create a new user account for you.'
                              : 'This will automatically connect as superuser and reset the password for an existing user.'}
                          </p>

                          <div className="space-y-3">
                            <div>
                              <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                                New Username:
                              </label>
                              <input
                                type="text"
                                value={newUsername}
                                onChange={(e) => setNewUsername(e.target.value)}
                                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                placeholder="e.g., myuser"
                              />
                            </div>

                            {/* User Role Selection (only for create mode) */}
                            {userManagementMode === 'create' && (
                              <div>
                                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                                  User Role:
                                </label>
                                <select
                                  value={userRole}
                                  onChange={(e) => setUserRole(e.target.value as 'read-write' | 'read-only' | 'superuser')}
                                  className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                >
                                  <option value="read-write">Read-Write (Full Access)</option>
                                  <option value="read-only">Read-Only (SELECT only)</option>
                                  <option value="superuser">Superuser (Admin)</option>
                                </select>
                                <p className="mt-1 text-[10px] text-blue-600 dark:text-blue-400">
                                  {userRole === 'read-write' && '✓ Can read and write data'}
                                  {userRole === 'read-only' && '✓ Can only read data (no modifications)'}
                                  {userRole === 'superuser' && '⚠️ Full database admin privileges'}
                                </p>
                              </div>
                            )}

                            <div>
                              <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                                New Password:
                              </label>
                              <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                placeholder="Choose a strong password"
                              />

                              {/* Password Strength Meter */}
                              {newPassword && (
                                <div className="mt-2">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] text-gray-600 dark:text-gray-400">Password Strength:</span>
                                    <span className={`text-[10px] font-bold ${
                                      passwordStrength.color === 'green' ? 'text-green-600 dark:text-green-400' :
                                      passwordStrength.color === 'yellow' ? 'text-yellow-600 dark:text-yellow-400' :
                                      'text-red-600 dark:text-red-400'
                                    }`}>
                                      {passwordStrength.label}
                                    </span>
                                  </div>

                                  {/* Progress bar */}
                                  <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full transition-all duration-300 ${
                                        passwordStrength.color === 'green' ? 'bg-green-500' :
                                        passwordStrength.color === 'yellow' ? 'bg-yellow-500' :
                                        'bg-red-500'
                                      }`}
                                      style={{ width: `${passwordStrength.score}%` }}
                                    />
                                  </div>

                                  {/* Feedback */}
                                  {passwordStrength.feedback.length > 0 && (
                                    <div className="mt-1 text-[10px] text-gray-600 dark:text-gray-400">
                                      Missing: {passwordStrength.feedback.join(', ')}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={userManagementMode === 'create' ? handleCreateUser : handleResetPassword}
                              disabled={createUserStatus === 'creating'}
                              className="flex w-full items-center justify-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-500 dark:hover:bg-blue-600"
                            >
                              {createUserStatus === 'creating' ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  {userManagementMode === 'create' ? 'Creating User...' : 'Resetting Password...'}
                                </>
                              ) : (
                                <>
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  {userManagementMode === 'create' ? 'Create User' : 'Reset Password'}
                                </>
                              )}
                            </button>

                            {/* Status Message */}
                            {createUserStatus === 'success' && (
                              <div className="flex items-start gap-2 text-xs text-green-700 dark:text-green-300">
                                <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                                <pre className="whitespace-pre-wrap font-sans">{createUserMessage}</pre>
                              </div>
                            )}
                            {createUserStatus === 'error' && (
                              <div className="flex items-start gap-2 text-xs text-red-600 dark:text-red-400">
                                <XCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                                <pre className="whitespace-pre-wrap font-sans">{createUserMessage}</pre>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
            </div>

            {/* Right Panel - Info */}
            <div className="w-96 border-l border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-900">
              <div className="space-y-4">
                {/* Authentication Required Notice */}
                <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-blue-900 dark:text-blue-300">
                    <AlertCircle className="h-4 w-4" />
                    First Time Setup?
                  </h3>
                  <div className="space-y-3 text-xs text-blue-800 dark:text-blue-200">
                    <div className="rounded bg-blue-100 dark:bg-blue-900 p-2">
                      <p className="font-bold text-[11px] mb-1">👤 New users: Create an account first!</p>
                      <p className="text-[10px]">MonkDB requires authentication.</p>
                    </div>

                    <div className="rounded bg-green-100 dark:bg-green-900 p-2 border border-green-300 dark:border-green-700">
                      <p className="font-bold text-[11px] text-green-800 dark:text-green-300 mb-1">✨ Easy Way (Recommended)</p>
                      <p className="text-[10px] text-green-700 dark:text-green-400">
                        Click "<strong>Create New MonkDB User</strong>" button below the password field to automatically create a user account!
                      </p>
                    </div>

                    <div className="pt-2 border-t border-blue-200 dark:border-blue-800">
                      <p className="font-semibold text-[10px] mb-2">Or manually via terminal:</p>

                      <p className="font-semibold">Step 1: Connect as superuser</p>
                      <code className="block bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded font-mono text-[10px]">
                        psql -h localhost -p 5432 -U monkdb -d monkdb
                      </code>

                      <p className="font-semibold mt-2">Step 2: Create your user</p>
                      <code className="block bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded font-mono text-[10px]">
                        CREATE USER myuser WITH (password = 'mypassword');
                      </code>

                      <p className="font-semibold mt-2">Step 3: Grant privileges</p>
                      <code className="block bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded font-mono text-[10px]">
                        GRANT ALL PRIVILEGES TO myuser;
                      </code>
                    </div>
                  </div>
                </div>

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
