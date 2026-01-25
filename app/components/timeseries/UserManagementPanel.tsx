'use client';

import { useState } from 'react';
import { Users, Shield, UserPlus, Trash2, X, Edit2, Check, Crown, Eye, EyeOff } from 'lucide-react';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  status: 'active' | 'inactive' | 'pending';
  lastActive?: Date;
  createdAt: Date;
  permissions: {
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canExport: boolean;
    canManageUsers: boolean;
    canManageSettings: boolean;
  };
}

interface UserManagementPanelProps {
  users: User[];
  onAddUser: (user: Omit<User, 'id' | 'createdAt' | 'lastActive'>) => void;
  onUpdateUser: (id: string, updates: Partial<User>) => void;
  onDeleteUser: (id: string) => void;
  currentUser: string;
}

export default function UserManagementPanel({ users, onAddUser, onUpdateUser, onDeleteUser, currentUser }: UserManagementPanelProps) {
  const [showPanel, setShowPanel] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'viewer' as 'admin' | 'editor' | 'viewer',
    status: 'active' as 'active' | 'inactive' | 'pending',
    permissions: {
      canCreate: false,
      canEdit: false,
      canDelete: false,
      canExport: true,
      canManageUsers: false,
      canManageSettings: false,
    },
  });

  const handleAddUser = () => {
    if (!newUser.name || !newUser.email) {
      alert('Please fill all required fields');
      return;
    }

    // Set permissions based on role
    const permissions = {
      canCreate: newUser.role !== 'viewer',
      canEdit: newUser.role !== 'viewer',
      canDelete: newUser.role === 'admin',
      canExport: true,
      canManageUsers: newUser.role === 'admin',
      canManageSettings: newUser.role === 'admin',
    };

    onAddUser({
      ...newUser,
      permissions,
    });

    setNewUser({
      name: '',
      email: '',
      role: 'viewer',
      status: 'active',
      permissions: {
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canExport: true,
        canManageUsers: false,
        canManageSettings: false,
      },
    });
    setShowAddForm(false);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'from-red-600 to-red-700';
      case 'editor': return 'from-blue-600 to-blue-700';
      case 'viewer': return 'from-gray-600 to-gray-700';
      default: return 'from-gray-600 to-gray-700';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Crown className="h-3 w-3" />;
      case 'editor': return <Edit2 className="h-3 w-3" />;
      case 'viewer': return <Eye className="h-3 w-3" />;
      default: return <Users className="h-3 w-3" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
      case 'inactive': return 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300';
      case 'pending': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300';
      default: return 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300';
    }
  };

  const activeUsers = users.filter(u => u.status === 'active').length;
  const adminUsers = users.filter(u => u.role === 'admin').length;

  return (
    <div className="relative">
      {/* User Management Button */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="flex items-center gap-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-5 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-md hover:shadow-lg transition-all"
      >
        <Users className="h-4 w-4" />
        Users
        {users.length > 0 && (
          <span className="ml-1 rounded-full bg-gradient-to-r from-purple-600 to-purple-700 px-2.5 py-0.5 text-xs font-bold text-white shadow-md">
            {users.length}
          </span>
        )}
      </button>

      {/* User Management Panel */}
      {showPanel && (
        <div className="absolute right-0 top-full mt-3 w-[800px] rounded-2xl border border-gray-200/50 bg-white/95 backdrop-blur-xl shadow-2xl dark:border-gray-700/50 dark:bg-gray-800/95 z-50 max-h-[600px] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="border-b border-gray-200 dark:border-gray-700/50 bg-gradient-to-r from-purple-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-850 dark:to-gray-900 px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 shadow-lg">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    User Management & Permissions
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                    {activeUsers} active • {adminUsers} admins • {users.length} total
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all"
                  title="Add user"
                >
                  <UserPlus className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setShowPanel(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Add User Form */}
          {showAddForm && (
            <div className="border-b border-gray-200 dark:border-gray-700 p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30">
              <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Add New User</h4>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                  />
                  <input
                    type="email"
                    placeholder="Email Address"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value as any })}
                    className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                  >
                    <option value="viewer">Viewer (Read Only)</option>
                    <option value="editor">Editor (Create & Edit)</option>
                    <option value="admin">Admin (Full Access)</option>
                  </select>

                  <select
                    value={newUser.status}
                    onChange={(e) => setNewUser({ ...newUser, status: e.target.value as any })}
                    className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                  >
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <button
                  onClick={handleAddUser}
                  className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg text-sm font-semibold shadow-lg transition-all"
                >
                  Add User
                </button>
              </div>
            </div>
          )}

          {/* Users List */}
          <div className="flex-1 overflow-y-auto p-6">
            {users.length === 0 ? (
              <div className="py-12 text-center">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-600 dark:text-gray-400">No users yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {users.map(user => (
                  <div
                    key={user.id}
                    className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r ${getRoleColor(user.role)} flex-shrink-0 shadow-md`}>
                          <span className="text-sm font-bold text-white">
                            {user.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-bold text-gray-900 dark:text-white">{user.name}</h4>
                            {user.email === currentUser && (
                              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-semibold">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">{user.email}</div>
                          {user.lastActive && (
                            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                              Last active: {new Date(user.lastActive).toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${getStatusColor(user.status)}`}>
                          {user.status}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-bold bg-gradient-to-r ${getRoleColor(user.role)} text-white flex items-center gap-1`}>
                          {getRoleIcon(user.role)}
                          {user.role}
                        </span>
                        {user.email !== currentUser && (
                          <button
                            onClick={() => onDeleteUser(user.id)}
                            className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-all"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Permissions */}
                    <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      {[
                        { key: 'canCreate', label: 'Create', enabled: user.permissions.canCreate },
                        { key: 'canEdit', label: 'Edit', enabled: user.permissions.canEdit },
                        { key: 'canDelete', label: 'Delete', enabled: user.permissions.canDelete },
                        { key: 'canExport', label: 'Export', enabled: user.permissions.canExport },
                        { key: 'canManageUsers', label: 'Users', enabled: user.permissions.canManageUsers },
                        { key: 'canManageSettings', label: 'Settings', enabled: user.permissions.canManageSettings },
                      ].map(perm => (
                        <div
                          key={perm.key}
                          className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs ${
                            perm.enabled
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                              : 'bg-gray-100 dark:bg-gray-900/30 text-gray-500 dark:text-gray-500'
                          }`}
                        >
                          {perm.enabled ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <X className="h-3 w-3" />
                          )}
                          {perm.label}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
