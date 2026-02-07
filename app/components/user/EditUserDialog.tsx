'use client';

import { useState } from 'react';
import { X, Edit, Lock, Crown, AlertCircle, Eye, EyeOff, Save } from 'lucide-react';
import { useActiveConnection } from '../../lib/monkdb-context';
import { useToast } from '../ToastContext';

interface User {
  name: string;
  superuser: boolean;
  password_set: boolean;
}

interface EditUserDialogProps {
  user: User;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditUserDialog({ user, onClose, onSuccess }: EditUserDialogProps) {
  const activeConnection = useActiveConnection();
  const toast = useToast();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSuperuser, setIsSuperuser] = useState(user.superuser);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateForm = (): boolean => {
    if (newPassword && newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!activeConnection) return;

    setError(null);

    if (!validateForm()) {
      return;
    }

    setSaving(true);

    try {
      const updates: string[] = [];

      // Update password if provided
      if (newPassword) {
        updates.push(`password = '${newPassword.replace(/'/g, "''")}'`);
      }

      // Update superuser status if changed
      if (isSuperuser !== user.superuser) {
        updates.push(`superuser = ${isSuperuser}`);
      }

      if (updates.length > 0) {
        const sql = `ALTER USER ${user.name} SET (${updates.join(', ')})`;
        await activeConnection.client.query(sql);
        toast.success('User updated', `User "${user.name}" has been updated successfully`);
        onSuccess();
      } else {
        toast.info('No changes', 'No changes were made to the user');
        onClose();
      }
    } catch (err) {
      console.error('Failed to update user:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      toast.error('Failed to update user', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white dark:bg-gray-800 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
              <Edit className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Edit User</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Update {user.name}'s settings</p>
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

          {/* Username (read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Username
            </label>
            <input
              type="text"
              value={user.name}
              disabled
              className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-400"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Username cannot be changed
            </p>
          </div>

          {/* Current Status */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Current Status:</span>
              </div>
              <div className="flex items-center gap-2">
                {user.superuser && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                    <Crown className="h-3 w-3" />
                    Superuser
                  </span>
                )}
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                    user.password_set
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                      : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                  }`}
                >
                  {user.password_set ? 'Password Set' : 'No Password'}
                </span>
              </div>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              New Password (optional)
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
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
              Leave empty to keep current password unchanged
            </p>
          </div>

          {/* Confirm New Password */}
          {newPassword && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Confirm New Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
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
                  Superuser Status
                </label>
                <p className="mt-1 text-xs text-purple-700 dark:text-purple-400">
                  {isSuperuser !== user.superuser ? (
                    <span className="font-medium">
                      Will {isSuperuser ? 'promote to' : 'demote from'} superuser on save
                    </span>
                  ) : (
                    'Superusers have full access to all databases, schemas, and tables'
                  )}
                </p>
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
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
