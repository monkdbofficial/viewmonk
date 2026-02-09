/**
 * usePermissions Hook
 * Provides permission-based access control based on active connection role
 */

import { useMonkDB } from '../lib/monkdb-context';

export interface UserPermissions {
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  canCreate: boolean;
  canManageUsers: boolean;
  canAlterSchema: boolean;
  role: 'read-only' | 'read-write' | 'superuser';
}

export function usePermissions(): UserPermissions {
  const { activeConnection } = useMonkDB();
  // ENTERPRISE DEFAULT: If no role specified, assume superuser (full access)
  // This prevents false restrictions when role detection fails
  const role = activeConnection?.config.role || 'superuser';

  return {
    canRead: true, // Everyone can read
    canWrite: role !== 'read-only',
    canDelete: role !== 'read-only',
    canCreate: role === 'superuser',
    canManageUsers: role === 'superuser',
    canAlterSchema: role === 'superuser',
    role,
  };
}
