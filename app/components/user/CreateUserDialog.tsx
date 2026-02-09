'use client';

import { useState } from 'react';
import { X, User, Lock, Crown, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useActiveConnection } from '../../lib/monkdb-context';
import { useToast } from '../ToastContext';

interface CreateUserDialogProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateUserDialog({ onClose, onSuccess }: CreateUserDialogProps) {
  const activeConnection = useActiveConnection();
  const toast = useToast();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSuperuser, setIsSuperuser] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateForm = (): boolean => {
    if (!username.trim()) {
      setError('Username is required');
      return false;
    }

    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(username)) {
      setError('Username must start with a letter or underscore and contain only letters, numbers, and underscores');
      return false;
    }

    if (password && password.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    return true;
  };

  const handleCreate = async () => {
    if (!activeConnection) return;

    setError(null);

    if (!validateForm()) {
      return;
    }

    setCreating(true);

    try {
      // Create user with password (if provided) - CrateDB/MonkDB syntax
      if (password) {
        await activeConnection.client.query(
          `CREATE USER ${username} WITH (password = '${password.replace(/'/g, "''")}')`
        );
      } else {
        await activeConnection.client.query(`CREATE USER ${username}`);
      }

      // Grant superuser status using AL (Admin Level) privilege
      if (isSuperuser) {
        await activeConnection.client.query(`GRANT AL TO ${username}`);
      }

      toast.success('User created', `User "${username}" has been created successfully`);
      onSuccess();
    } catch (err) {
      console.error('Failed to create user:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      toast.error('Failed to create user', errorMessage);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white dark:bg-gray-800 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create New User</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Add a new database user</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <div className="p-4 space-y-4">
          {/* Error Message */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            </div>
          )}

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Username <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              autoFocus
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Must start with a letter or underscore
            </p>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Password (optional)
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Minimum 8 characters. Leave empty to create user without password.
            </p>
          </div>

          {/* Confirm Password */}
          {password && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Confirm Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
          )}

          {/* Superuser Toggle */}
          <div className="rounded-lg border-2 border-purple-200 bg-purple-50 p-3 dark:border-purple-800 dark:bg-purple-900/20">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="superuser"
                checked={isSuperuser}
                onChange={(e) => setIsSuperuser(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-purple-300 text-purple-600 focus:ring-purple-500"
              />
              <div className="flex-1">
                <label htmlFor="superuser" className="flex items-center gap-2 text-sm font-medium text-purple-900 dark:text-purple-300 cursor-pointer">
                  <Crown className="h-4 w-4" />
                  Create as Superuser
                </label>
                <p className="mt-1 text-xs text-purple-700 dark:text-purple-400">
                  Superusers have full access to all databases, schemas, and tables. They can create users and grant permissions.
                </p>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="text-xs text-blue-800 dark:text-blue-200">
                <p className="font-medium mb-1">After creating the user:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Click "Permissions" to grant schema/table access</li>
                  <li>Regular users have no permissions by default</li>
                  <li>Superusers have access to everything automatically</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 p-4 dark:border-gray-700">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={creating || !username.trim()}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Creating...
              </>
            ) : (
              <>
                <User className="h-4 w-4" />
                Create User
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
