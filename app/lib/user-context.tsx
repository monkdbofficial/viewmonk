'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

export type UserRole = 'admin' | 'user' | 'viewer';

interface UserContextValue {
  userId: string | null;
  username: string | null;
  role: UserRole;
  isLoading: boolean;
  hasPermission: (permission: Permission) => boolean;
  setUserRole: (role: UserRole) => void;
}

export type Permission =
  | 'upload_files'
  | 'delete_files'
  | 'rename_files'
  | 'update_files'
  | 'restore_files'
  | 'view_files'
  | 'manage_all_files';

const UserContext = createContext<UserContextValue>({
  userId: null,
  username: null,
  role: 'user',
  isLoading: true,
  hasPermission: () => false,
  setUserRole: () => {},
});

export function useUser() {
  return useContext(UserContext);
}

interface UserProviderProps {
  children: React.ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole>('user');
  const [isLoading, setIsLoading] = useState(true);

  // Permission matrix based on roles
  const hasPermission = useCallback((permission: Permission): boolean => {
    const rolePermissions: Record<UserRole, Permission[]> = {
      admin: [
        'upload_files',
        'delete_files',
        'rename_files',
        'update_files',
        'restore_files',
        'view_files',
        'manage_all_files',
      ],
      user: [
        'upload_files',
        'delete_files',
        'rename_files',
        'update_files',
        'restore_files',
        'view_files',
      ],
      viewer: ['view_files'],
    };

    return rolePermissions[role]?.includes(permission) ?? false;
  }, [role]);

  const setUserRole = useCallback((newRole: UserRole) => {
    setRole(newRole);
    // Persist role to localStorage in browser mode
    if (typeof window !== 'undefined' && !window.__TAURI__) {
      localStorage.setItem('monkdb_user_role', newRole);
    }
  }, []);

  useEffect(() => {
    async function initializeUser() {
      try {
        const isTauri = typeof window !== 'undefined' && window.__TAURI__;

        if (isTauri) {
          // In Tauri mode, get OS username
          try {
            // Try to get username from OS environment
            const osUsername = await invoke<string>('get_os_username');
            setUsername(osUsername);
            setUserId(osUsername); // Use OS username as user ID
            // Default to 'user' role in Tauri mode
            setRole('user');
          } catch (error) {
            // Fallback to a default identifier
            setUsername('desktop-user');
            setUserId('desktop-user');
            setRole('user');
          }
        } else {
          // In browser mode, use localStorage or generate a unique ID
          let storedUserId = localStorage.getItem('monkdb_user_id');
          let storedUsername = localStorage.getItem('monkdb_username');
          let storedRole = localStorage.getItem('monkdb_user_role') as UserRole | null;

          if (!storedUserId) {
            // Generate a unique user ID
            storedUserId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            localStorage.setItem('monkdb_user_id', storedUserId);

            // Prompt for username (for now, use a default)
            storedUsername = 'browser-user';
            localStorage.setItem('monkdb_username', storedUsername);

            // Default to 'user' role
            storedRole = 'user';
            localStorage.setItem('monkdb_user_role', storedRole);
          }

          setUserId(storedUserId);
          setUsername(storedUsername || storedUserId);
          setRole(storedRole || 'user');
        }
      } catch (error) {
        // Fallback to anonymous user with viewer role
        setUserId('anonymous');
        setUsername('anonymous');
        setRole('viewer');
      } finally {
        setIsLoading(false);
      }
    }

    initializeUser();
  }, []);

  return (
    <UserContext.Provider value={{ userId, username, role, isLoading, hasPermission, setUserRole }}>
      {children}
    </UserContext.Provider>
  );
}
