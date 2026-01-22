'use client';

import { Shield } from 'lucide-react';
import { useUser, UserRole } from '../../lib/user-context';

export default function RoleSwitcher() {
  const { role, setUserRole, username } = useUser();

  const roles: { value: UserRole; label: string; description: string }[] = [
    { value: 'admin', label: 'Admin', description: 'Full access to all features' },
    { value: 'user', label: 'User', description: 'Can upload, edit, and delete own files' },
    { value: 'viewer', label: 'Viewer', description: 'Read-only access' },
  ];

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <Shield className="w-4 h-4 text-gray-600 dark:text-gray-400" />
      <span className="text-sm text-gray-600 dark:text-gray-400">{username || 'User'}:</span>
      <select
        value={role}
        onChange={(e) => setUserRole(e.target.value as UserRole)}
        className="text-sm font-medium bg-transparent border-none focus:outline-none focus:ring-0 text-gray-900 dark:text-white cursor-pointer"
        title="Switch role for testing purposes"
      >
        {roles.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
    </div>
  );
}
