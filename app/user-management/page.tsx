'use client';

import { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Shield,
  Key,
  Search,
  Filter,
  RefreshCw,
  CheckCircle,
  XCircle,
  Crown,
  Lock,
  Unlock,
  Settings,
  Eye,
  MoreVertical,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useActiveConnection } from '../lib/monkdb-context';
import { useToast } from '../components/ToastContext';
import ConnectionPrompt from '../components/common/ConnectionPrompt';
import CreateUserDialog from '../components/user/CreateUserDialog';
import EditUserDialog from '../components/user/EditUserDialog';
import PermissionDialog from '../components/user/PermissionDialog';

interface User {
  name: string;
  superuser: boolean;
  password_set: boolean;
}

interface UserPermission {
  schema?: string;
  table?: string;
  privilege: string;
  grantee: string;
}

export default function UserManagementPage() {
  const router = useRouter();
  const activeConnection = useActiveConnection();
  const toast = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'superuser' | 'regular'>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [permissionUser, setPermissionUser] = useState<User | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [currentUserIsSuperuser, setCurrentUserIsSuperuser] = useState(false);

  // Check if current user is superuser
  useEffect(() => {
    if (!activeConnection) return;

    const checkSuperuser = async () => {
      try {
        const currentUserResult = await activeConnection.client.query(`SELECT CURRENT_USER`);
        const currentUser = currentUserResult.rows[0]?.[0];

        const userCheckResult = await activeConnection.client.query(`
          SELECT superuser FROM sys.users WHERE name = ?
        `, [currentUser]);
        const isSuperuser = userCheckResult.rows[0]?.[0] === true;
        setCurrentUserIsSuperuser(isSuperuser);

        if (!isSuperuser) {
          toast.error('Access Denied', 'Only superusers can manage users');
          router.push('/dashboard');
        }
      } catch (err) {
        console.error('Failed to check superuser status:', err);
      }
    };

    checkSuperuser();
  }, [activeConnection, router, toast]);

  // Fetch users
  const fetchUsers = async () => {
    if (!activeConnection) return;

    setLoading(true);
    try {
      const result = await activeConnection.client.query(`
        SELECT name, superuser, password IS NOT NULL as password_set
        FROM sys.users
        ORDER BY name
      `);

      const userList = result.rows.map((row: any[]) => ({
        name: row[0],
        superuser: row[1] === true,
        password_set: row[2] === true,
      }));

      setUsers(userList);
      setFilteredUsers(userList);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      toast.error('Failed to load users', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeConnection && currentUserIsSuperuser) {
      fetchUsers();
    }
  }, [activeConnection, currentUserIsSuperuser]);

  // Filter users
  useEffect(() => {
    let filtered = users;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by type
    if (filterType === 'superuser') {
      filtered = filtered.filter(user => user.superuser);
    } else if (filterType === 'regular') {
      filtered = filtered.filter(user => !user.superuser);
    }

    setFilteredUsers(filtered);
  }, [searchTerm, filterType, users]);

  // Delete user
  const handleDeleteUser = async (username: string) => {
    if (!activeConnection) return;

    if (!confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await activeConnection.client.query(`DROP USER ${username}`);
      toast.success('User deleted', `User "${username}" has been deleted successfully`);
      fetchUsers();
    } catch (err) {
      console.error('Failed to delete user:', err);
      toast.error('Failed to delete user', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // Toggle superuser status
  const handleToggleSuperuser = async (username: string, currentStatus: boolean) => {
    if (!activeConnection) return;

    try {
      const newStatus = !currentStatus;
      await activeConnection.client.query(`
        ALTER USER ${username} SET (superuser = ${newStatus})
      `);
      toast.success(
        'Superuser status updated',
        `User "${username}" is ${newStatus ? 'now' : 'no longer'} a superuser`
      );
      fetchUsers();
    } catch (err) {
      console.error('Failed to update superuser status:', err);
      toast.error('Failed to update superuser status', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // Require active connection
  if (!activeConnection) {
    return (
      <div className="flex h-screen items-center justify-center">
        <ConnectionPrompt onConnect={() => router.push('/connections')} />
      </div>
    );
  }

  // Require superuser
  if (!currentUserIsSuperuser && !loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Shield className="mx-auto h-16 w-16 text-red-600 dark:text-red-400 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Only superusers can access User Management
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50 px-6 py-4 dark:border-gray-700 dark:from-gray-800 dark:to-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 shadow-lg">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                User Management
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Manage database users, roles, and permissions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Refresh */}
            <button
              onClick={fetchUsers}
              disabled={loading}
              className="rounded-lg border border-gray-300 bg-white p-2 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700"
              title="Refresh users"
            >
              <RefreshCw className={`h-4 w-4 text-gray-600 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* Create User */}
            <button
              onClick={() => setShowCreateDialog(true)}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              <Plus className="h-4 w-4" />
              Create User
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs text-gray-600 dark:text-gray-400">Total Users</span>
            </div>
            <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
              {users.length}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <span className="text-xs text-gray-600 dark:text-gray-400">Superusers</span>
            </div>
            <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
              {users.filter(u => u.superuser).length}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-xs text-gray-600 dark:text-gray-400">Regular Users</span>
            </div>
            <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
              {users.filter(u => !u.superuser).length}
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="border-b border-gray-200 bg-white px-6 py-3 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search users by name..."
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Users</option>
              <option value="superuser">Superusers Only</option>
              <option value="regular">Regular Users Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* User List */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <RefreshCw className="mx-auto h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading users...</p>
            </div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No users found</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {searchTerm ? 'Try adjusting your search' : 'Create your first user to get started'}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {filteredUsers.map((user) => (
              <div
                key={user.name}
                className={`rounded-lg border-2 bg-white p-4 transition-all hover:shadow-lg dark:bg-gray-800 ${
                  selectedUser === user.name
                    ? 'border-blue-500 dark:border-blue-400'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
                onClick={() => setSelectedUser(user.name)}
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full ${
                        user.superuser
                          ? 'bg-gradient-to-br from-purple-600 to-pink-600'
                          : 'bg-gradient-to-br from-blue-600 to-cyan-600'
                      }`}
                    >
                      {user.superuser ? (
                        <Crown className="h-5 w-5 text-white" />
                      ) : (
                        <Users className="h-5 w-5 text-white" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{user.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
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
                          {user.password_set ? (
                            <>
                              <Lock className="h-3 w-3" />
                              Secured
                            </>
                          ) : (
                            <>
                              <Unlock className="h-3 w-3" />
                              No Password
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Dropdown */}
                  <div className="relative">
                    <button
                      className="rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Toggle dropdown
                      }}
                    >
                      <MoreVertical className="h-4 w-4 text-gray-500" />
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPermissionUser(user);
                    }}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/30"
                  >
                    <Key className="h-4 w-4" />
                    Permissions
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingUser(user);
                    }}
                    className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    <Edit className="h-4 w-4" />
                  </button>

                  {!user.superuser && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteUser(user.name);
                      }}
                      className="flex items-center justify-center gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 dark:border-red-700 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Quick Actions */}
                {!user.superuser && (
                  <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleSuperuser(user.name, user.superuser);
                      }}
                      className="w-full text-xs text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 font-medium"
                    >
                      Promote to Superuser
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dialogs */}
      {showCreateDialog && (
        <CreateUserDialog
          onClose={() => setShowCreateDialog(false)}
          onSuccess={() => {
            setShowCreateDialog(false);
            fetchUsers();
          }}
        />
      )}

      {editingUser && (
        <EditUserDialog
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSuccess={() => {
            setEditingUser(null);
            fetchUsers();
          }}
        />
      )}

      {permissionUser && (
        <PermissionDialog
          user={permissionUser}
          onClose={() => setPermissionUser(null)}
          onSuccess={() => {
            setPermissionUser(null);
            fetchUsers();
          }}
        />
      )}
    </div>
  );
}
