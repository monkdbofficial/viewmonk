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
  Download,
  Grid,
  List,
  UserPlus,
  ShieldCheck,
  Info,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
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

interface UserWithPrivileges extends User {
  privileges?: {
    privilege: string;
    class: string;
    ident: string;
  }[];
}

export default function UserManagementPage() {
  const router = useRouter();
  const activeConnection = useActiveConnection();
  const toast = useToast();

  const [users, setUsers] = useState<UserWithPrivileges[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithPrivileges[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'superuser' | 'regular'>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [permissionUser, setPermissionUser] = useState<User | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserWithPrivileges | null>(null);
  const [currentUserIsSuperuser, setCurrentUserIsSuperuser] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

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

  // Fetch users with privileges
  const fetchUsers = async () => {
    if (!activeConnection) return;

    setLoading(true);
    try {
      // Fetch users
      const result = await activeConnection.client.query(`
        SELECT name, superuser, password IS NOT NULL as password_set
        FROM sys.users
        ORDER BY name
      `);

      const userList: UserWithPrivileges[] = result.rows.map((row: any[]) => ({
        name: row[0],
        superuser: row[1] === true,
        password_set: row[2] === true,
        privileges: [],
      }));

      // Fetch privileges for each user
      for (const user of userList) {
        try {
          const privResult = await activeConnection.client.query(`
            SELECT type, class, ident
            FROM sys.privileges
            WHERE grantee = ?
            ORDER BY class, ident, type
          `, [user.name]);

          user.privileges = privResult.rows.map((row: any[]) => ({
            privilege: row[0],
            class: row[1],
            ident: row[2],
          }));

          // Cross-check superuser status with AL privilege at CLUSTER level
          // This ensures we detect superusers even if sys.users.superuser hasn't updated yet
          const hasClusterAL = user.privileges.some(
            (p) => p.privilege === 'AL' && (p.class === 'CLUSTER' || !p.ident)
          );

          // Update superuser flag if user has AL privilege but sys.users doesn't reflect it yet
          if (hasClusterAL && !user.superuser) {
            console.log(`[User Management] Detected AL privilege for ${user.name}, updating superuser status`);
            user.superuser = true;
          } else if (!hasClusterAL && user.superuser) {
            // If sys.users shows superuser but no AL privilege, trust the privilege system
            console.log(`[User Management] No AL privilege for ${user.name}, updating superuser status`);
            user.superuser = false;
          }
        } catch (err) {
          console.error(`Failed to fetch privileges for ${user.name}:`, err);
          user.privileges = [];
        }
      }

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
      await activeConnection.client.query(`DROP USER IF EXISTS ${username}`);
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

      console.log(`[User Management] ${newStatus ? 'Granting' : 'Revoking'} AL privilege for ${username}`);

      if (newStatus) {
        // Grant AL privilege at cluster level
        await activeConnection.client.query(`GRANT AL TO ${username}`);
      } else {
        // Revoke AL privilege from cluster level
        await activeConnection.client.query(`REVOKE AL FROM ${username}`);
      }

      toast.success(
        'Superuser status updated',
        `User "${username}" is ${newStatus ? 'now' : 'no longer'} a superuser`
      );

      // Wait a moment for the privilege system to update, then refresh
      setTimeout(() => {
        fetchUsers();
      }, 500);
    } catch (err) {
      console.error('Failed to update superuser status:', err);
      toast.error('Failed to update superuser status', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // Export users to CSV
  const handleExport = () => {
    const csv = [
      ['Username', 'Superuser', 'Password Set', 'Privileges Count'],
      ...filteredUsers.map(u => [
        u.name,
        u.superuser ? 'Yes' : 'No',
        u.password_set ? 'Yes' : 'No',
        u.privileges?.length || 0
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monkdb-users-${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getPrivilegeBadgeColor = (privilege: string) => {
    switch (privilege) {
      case 'AL':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
      case 'DDL':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
      case 'DML':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
      case 'DQL':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const getPrivilegeDescription = (privilege: string) => {
    switch (privilege) {
      case 'AL':
        return 'Admin Level - Full administrative privileges';
      case 'DDL':
        return 'Data Definition Language - CREATE, ALTER, DROP';
      case 'DML':
        return 'Data Manipulation Language - INSERT, UPDATE, DELETE';
      case 'DQL':
        return 'Data Query Language - SELECT';
      default:
        return privilege;
    }
  };

  // Require active connection
  if (!activeConnection) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <ConnectionPrompt onConnect={() => router.push('/connections')} />
      </div>
    );
  }

  // Require superuser
  if (!currentUserIsSuperuser && !loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md text-center rounded-lg bg-white dark:bg-gray-800 p-8 shadow-lg">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <Shield className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Only superusers with AL (Admin Level) privileges can access User Management.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="rounded-lg bg-blue-600 px-6 py-2.5 text-white font-medium hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-5 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg">
              <Users className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                User Management
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Manage database users, roles, and privileges for MonkDB
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 rounded-lg border border-gray-300 dark:border-gray-600 p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`rounded p-1.5 transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                }`}
                title="Grid view"
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`rounded p-1.5 transition-colors ${
                  viewMode === 'table'
                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                }`}
                title="Table view"
              >
                <List className="h-4 w-4" />
              </button>
            </div>

            {/* Export */}
            <button
              onClick={handleExport}
              className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              title="Export users to CSV"
            >
              <Download className="h-4 w-4" />
              Export
            </button>

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
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              <UserPlus className="h-4 w-4" />
              Create User
            </button>
          </div>
        </div>

        {/* Stats Dashboard */}
        <div className="grid grid-cols-4 gap-4">
          <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-blue-50 to-blue-100/50 p-4 dark:from-blue-900/20 dark:to-blue-900/10 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-blue-600 dark:text-blue-400">Total Users</p>
                <p className="mt-1 text-3xl font-bold text-blue-900 dark:text-blue-300">{users.length}</p>
              </div>
              <Users className="h-10 w-10 text-blue-500/30" />
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-purple-50 to-purple-100/50 p-4 dark:from-purple-900/20 dark:to-purple-900/10 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-purple-600 dark:text-purple-400">Superusers</p>
                <p className="mt-1 text-3xl font-bold text-purple-900 dark:text-purple-300">
                  {users.filter(u => u.superuser).length}
                </p>
              </div>
              <Crown className="h-10 w-10 text-purple-500/30" />
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-green-50 to-green-100/50 p-4 dark:from-green-900/20 dark:to-green-900/10 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-green-600 dark:text-green-400">Regular Users</p>
                <p className="mt-1 text-3xl font-bold text-green-900 dark:text-green-300">
                  {users.filter(u => !u.superuser).length}
                </p>
              </div>
              <Shield className="h-10 w-10 text-green-500/30" />
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-orange-50 to-orange-100/50 p-4 dark:from-orange-900/20 dark:to-orange-900/10 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-orange-600 dark:text-orange-400">Secured</p>
                <p className="mt-1 text-3xl font-bold text-orange-900 dark:text-orange-300">
                  {users.filter(u => u.password_set).length}
                </p>
              </div>
              <Lock className="h-10 w-10 text-orange-500/30" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="border-b border-gray-200 bg-white px-6 py-3 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search users by name..."
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Users ({users.length})</option>
              <option value="superuser">Superusers Only ({users.filter(u => u.superuser).length})</option>
              <option value="regular">Regular Users Only ({users.filter(u => !u.superuser).length})</option>
            </select>
          </div>

          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing <span className="font-semibold text-gray-900 dark:text-white">{filteredUsers.length}</span> of {users.length} users
          </div>
        </div>
      </div>

      {/* User List */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <RefreshCw className="mx-auto h-10 w-10 animate-spin text-blue-600 dark:text-blue-400" />
              <p className="mt-3 text-sm font-medium text-gray-900 dark:text-white">Loading users...</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Fetching user data and privileges</p>
            </div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center max-w-md">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                <Users className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No users found</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                {searchTerm ? 'Try adjusting your search criteria' : 'Create your first user to get started'}
              </p>
              {!searchTerm && (
                <button
                  onClick={() => setShowCreateDialog(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  <UserPlus className="h-4 w-4" />
                  Create First User
                </button>
              )}
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {filteredUsers.map((user) => (
              <UserCard
                key={user.name}
                user={user}
                selectedUser={selectedUser}
                onSelect={setSelectedUser}
                onEdit={setEditingUser}
                onDelete={handleDeleteUser}
                onPermissions={setPermissionUser}
                onToggleSuperuser={handleToggleSuperuser}
                getPrivilegeBadgeColor={getPrivilegeBadgeColor}
                getPrivilegeDescription={getPrivilegeDescription}
              />
            ))}
          </div>
        ) : (
          <UserTable
            users={filteredUsers}
            expandedUser={expandedUser}
            onExpand={setExpandedUser}
            onEdit={setEditingUser}
            onDelete={handleDeleteUser}
            onPermissions={setPermissionUser}
            onToggleSuperuser={handleToggleSuperuser}
            getPrivilegeBadgeColor={getPrivilegeBadgeColor}
            getPrivilegeDescription={getPrivilegeDescription}
          />
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

// User Card Component for Grid View
function UserCard({ user, selectedUser, onSelect, onEdit, onDelete, onPermissions, onToggleSuperuser, getPrivilegeBadgeColor, getPrivilegeDescription }: any) {
  const privilegeCounts = {
    AL: user.privileges?.filter((p: any) => p.privilege === 'AL').length || 0,
    DDL: user.privileges?.filter((p: any) => p.privilege === 'DDL').length || 0,
    DML: user.privileges?.filter((p: any) => p.privilege === 'DML').length || 0,
    DQL: user.privileges?.filter((p: any) => p.privilege === 'DQL').length || 0,
  };

  return (
    <div
      className={`group rounded-xl border-2 bg-white p-5 transition-all hover:shadow-lg dark:bg-gray-800 cursor-pointer ${
        selectedUser?.name === user.name
          ? 'border-blue-500 shadow-lg dark:border-blue-400'
          : 'border-gray-200 dark:border-gray-700'
      }`}
      onClick={() => onSelect(user)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div
            className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full ${
              user.superuser
                ? 'bg-gradient-to-br from-purple-600 to-pink-600'
                : 'bg-gradient-to-br from-blue-600 to-cyan-600'
            }`}
          >
            {user.superuser ? (
              <Crown className="h-6 w-6 text-white" />
            ) : (
              <Users className="h-6 w-6 text-white" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate text-lg">{user.name}</h3>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {user.superuser && (
                <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                  <Crown className="h-3 w-3" />
                  Superuser
                </span>
              )}
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
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
      </div>

      {/* Privileges Summary */}
      <div className="mb-4 rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Privileges</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {user.privileges?.length || 0} total
          </span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {['AL', 'DDL', 'DML', 'DQL'].map((priv) => (
            <div key={priv} className="text-center">
              <div className={`rounded-lg py-2 ${getPrivilegeBadgeColor(priv)}`}>
                <div className="text-lg font-bold">{privilegeCounts[priv as keyof typeof privilegeCounts]}</div>
                <div className="text-[10px] font-medium">{priv}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPermissions(user);
          }}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-blue-300 bg-blue-50 px-3 py-2.5 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/30"
          title="Manage privileges"
        >
          <Key className="h-4 w-4" />
          <span>Privileges</span>
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(user);
          }}
          className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          title="Edit user"
        >
          <Edit className="h-4 w-4" />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(user.name);
          }}
          className="flex items-center justify-center gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700 hover:bg-red-100 transition-colors dark:border-red-700 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30"
          title="Delete user"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Quick Actions */}
      {user.superuser ? (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSuperuser(user.name, user.superuser);
            }}
            className="w-full flex items-center justify-center gap-2 text-sm text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 font-medium py-1 rounded hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
          >
            <ShieldCheck className="h-4 w-4" />
            Revoke Superuser
          </button>
        </div>
      ) : (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSuperuser(user.name, user.superuser);
            }}
            className="w-full flex items-center justify-center gap-2 text-sm text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 font-medium py-1 rounded hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
          >
            <Crown className="h-4 w-4" />
            Promote to Superuser
          </button>
        </div>
      )}
    </div>
  );
}

// User Table Component for Table View
function UserTable({ users, expandedUser, onExpand, onEdit, onDelete, onPermissions, onToggleSuperuser, getPrivilegeBadgeColor, getPrivilegeDescription }: any) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-900/50">
          <tr>
            <th className="w-10 px-4 py-3"></th>
            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
              User
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
              Privileges
            </th>
            <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {users.map((user: any) => (
            <>
              <tr
                key={user.name}
                className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <td className="px-4 py-4">
                  <button
                    onClick={() => onExpand(expandedUser === user.name ? null : user.name)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    {expandedUser === user.name ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
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
                      <div className="font-semibold text-gray-900 dark:text-white">{user.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {user.superuser ? 'Administrator' : 'Regular User'}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1.5">
                    {user.superuser && (
                      <span className="inline-flex w-fit items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                        <Crown className="h-3 w-3" />
                        Superuser
                      </span>
                    )}
                    <span
                      className={`inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
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
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1.5">
                    {user.privileges?.length > 0 ? (
                      <>
                        {['AL', 'DDL', 'DML', 'DQL'].map((priv: string) => {
                          const count = user.privileges.filter((p: any) => p.privilege === priv).length;
                          if (count === 0) return null;
                          return (
                            <span
                              key={priv}
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${getPrivilegeBadgeColor(priv)}`}
                              title={getPrivilegeDescription(priv)}
                            >
                              {priv}
                              <span className="text-[10px]">({count})</span>
                            </span>
                          );
                        })}
                      </>
                    ) : (
                      <span className="text-xs text-gray-500 dark:text-gray-400">No privileges</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onPermissions(user)}
                      className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/30"
                      title="Manage privileges"
                    >
                      Privileges
                    </button>
                    <button
                      onClick={() => onEdit(user)}
                      className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                      title="Edit user"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(user.name)}
                      className="rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 dark:border-red-700 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30"
                      title="Delete user"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
              {expandedUser === user.name && (
                <tr>
                  <td colSpan={5} className="bg-gray-50 dark:bg-gray-900/50 px-6 py-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Privilege Details</h4>
                        {!user.superuser && (
                          <button
                            onClick={() => onToggleSuperuser(user.name, user.superuser)}
                            className="flex items-center gap-2 text-xs text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 font-medium"
                          >
                            <Crown className="h-3 w-3" />
                            Promote to Superuser
                          </button>
                        )}
                        {user.superuser && (
                          <button
                            onClick={() => onToggleSuperuser(user.name, user.superuser)}
                            className="flex items-center gap-2 text-xs text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 font-medium"
                          >
                            <ShieldCheck className="h-3 w-3" />
                            Revoke Superuser
                          </button>
                        )}
                      </div>
                      {user.privileges?.length > 0 ? (
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                          {user.privileges.map((priv: any, idx: number) => (
                            <div
                              key={idx}
                              className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800"
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${getPrivilegeBadgeColor(priv.privilege)}`}>
                                  {priv.privilege}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">{priv.class}</span>
                              </div>
                              <div className="text-xs font-mono text-gray-700 dark:text-gray-300 truncate">
                                {priv.ident || 'Cluster'}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <Info className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            No privileges granted to this user
                          </p>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}
