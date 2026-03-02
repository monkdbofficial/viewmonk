'use client';

import { useState, useEffect } from 'react';
import { X, Key, Database, Table, Check, Plus, Trash2, AlertCircle, RefreshCw, Shield, Lock } from 'lucide-react';
import { useActiveConnection } from '../../lib/monkdb-context';
import { useToast } from '../ToastContext';

interface User {
  name: string;
  superuser: boolean;
  password_set: boolean;
}

interface Permission {
  class: 'SCHEMA' | 'TABLE';
  ident: string;
  type: string;
  state: 'GRANT' | 'DENY';
}

interface PermissionDialogProps {
  user: User;
  onClose: () => void;
  onSuccess: () => void;
}

const PRIVILEGE_TYPES = [
  { value: 'DQL', label: 'DQL (SELECT)', description: 'Read data' },
  { value: 'DML', label: 'DML (INSERT/UPDATE/DELETE)', description: 'Modify data' },
  { value: 'DDL', label: 'DDL (CREATE/ALTER/DROP)', description: 'Modify schema' },
  { value: 'AL', label: 'AL (Admin)', description: 'Administrative operations' },
];

export default function PermissionDialog({ user, onClose, onSuccess }: PermissionDialogProps) {
  const activeConnection = useActiveConnection();
  const toast = useToast();

  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [schemas, setSchemas] = useState<string[]>([]);
  const [tables, setTables] = useState<{ schema: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'schema' | 'table'>('schema');

  // Grant form state
  const [selectedSchema, setSelectedSchema] = useState('');
  const [selectedTable, setSelectedTable] = useState('');
  const [selectedPrivileges, setSelectedPrivileges] = useState<string[]>([]);
  const [granting, setGranting] = useState(false);

  // Load permissions and metadata
  useEffect(() => {
    if (!activeConnection) return;

    const loadData = async () => {
      setLoading(true);
      try {
        // Load permissions
        const permResult = await activeConnection.client.query(`
          SELECT class, ident, type, state
          FROM sys.privileges
          WHERE grantee = ?
          ORDER BY class, ident, type
        `, [user.name]);

        const perms = permResult.rows.map((row: any[]) => ({
          class: row[0] as 'SCHEMA' | 'TABLE',
          ident: row[1],
          type: row[2],
          state: row[3] as 'GRANT' | 'DENY',
        }));

        setPermissions(perms);

        // Load all schemas
        const schemaResult = await activeConnection.client.query(`
          SELECT DISTINCT table_schema
          FROM information_schema.tables
          WHERE table_schema NOT IN ('pg_catalog', 'information_schema', 'sys')
          ORDER BY table_schema
        `);

        setSchemas(schemaResult.rows.map((row: any[]) => row[0]));

        // Load all tables
        const tableResult = await activeConnection.client.query(`
          SELECT table_schema, table_name
          FROM information_schema.tables
          WHERE table_schema NOT IN ('pg_catalog', 'information_schema', 'sys')
          ORDER BY table_schema, table_name
        `);

        setTables(
          tableResult.rows.map((row: any[]) => ({
            schema: row[0],
            name: row[1],
          }))
        );
      } catch (err) {
        toast.error('Failed to load permissions', err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [activeConnection, user.name, toast]);

  // Grant permission
  const handleGrant = async () => {
    if (!activeConnection) return;

    if (selectedPrivileges.length === 0) {
      toast.error('No privileges selected', 'Please select at least one privilege to grant');
      return;
    }

    setGranting(true);

    try {
      const safeGrantee = '"' + user.name.replace(/"/g, '""') + '"';

      if (activeTab === 'schema') {
        if (!selectedSchema) {
          toast.error('No schema selected', 'Please select a schema');
          return;
        }

        const safeSchema = '"' + selectedSchema.replace(/"/g, '""') + '"';
        for (const priv of selectedPrivileges) {
          await activeConnection.client.query(
            `GRANT ${priv} ON SCHEMA ${safeSchema} TO ${safeGrantee}`
          );
        }

        toast.success(
          'Permissions granted',
          `Granted ${selectedPrivileges.join(', ')} on schema ${selectedSchema} to ${user.name}`
        );
      } else {
        if (!selectedTable) {
          toast.error('No table selected', 'Please select a table');
          return;
        }

        const [tSchema, tName] = selectedTable.split('.');
        const safeTable = '"' + tSchema.replace(/"/g, '""') + '"."' + tName.replace(/"/g, '""') + '"';
        for (const priv of selectedPrivileges) {
          await activeConnection.client.query(
            `GRANT ${priv} ON TABLE ${safeTable} TO ${safeGrantee}`
          );
        }

        toast.success(
          'Permissions granted',
          `Granted ${selectedPrivileges.join(', ')} on table ${selectedTable} to ${user.name}`
        );
      }

      // Refresh permissions
      const permResult = await activeConnection.client.query(`
        SELECT class, ident, type, state
        FROM sys.privileges
        WHERE grantee = ?
        ORDER BY class, ident, type
      `, [user.name]);

      const perms = permResult.rows.map((row: any[]) => ({
        class: row[0] as 'SCHEMA' | 'TABLE',
        ident: row[1],
        type: row[2],
        state: row[3] as 'GRANT' | 'DENY',
      }));

      setPermissions(perms);
      setSelectedPrivileges([]);
    } catch (err) {
      toast.error('Failed to grant permission', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setGranting(false);
    }
  };

  // Revoke permission
  const handleRevoke = async (perm: Permission) => {
    if (!activeConnection) return;

    if (!confirm(`Revoke ${perm.type} on ${perm.class.toLowerCase()} ${perm.ident} from ${user.name}?`)) {
      return;
    }

    try {
      const safeGrantee = '"' + user.name.replace(/"/g, '""') + '"';
      const safeIdent = perm.ident.includes('.')
        ? perm.ident.split('.').map(p => '"' + p.replace(/"/g, '""') + '"').join('.')
        : '"' + perm.ident.replace(/"/g, '""') + '"';
      await activeConnection.client.query(
        `REVOKE ${perm.type} ON ${perm.class} ${safeIdent} FROM ${safeGrantee}`
      );

      toast.success('Permission revoked', `Revoked ${perm.type} from ${user.name}`);

      // Refresh permissions
      const permResult = await activeConnection.client.query(`
        SELECT class, ident, type, state
        FROM sys.privileges
        WHERE grantee = ?
        ORDER BY class, ident, type
      `, [user.name]);

      const perms = permResult.rows.map((row: any[]) => ({
        class: row[0] as 'SCHEMA' | 'TABLE',
        ident: row[1],
        type: row[2],
        state: row[3] as 'GRANT' | 'DENY',
      }));

      setPermissions(perms);
    } catch (err) {
      toast.error('Failed to revoke permission', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const schemaPermissions = permissions.filter((p) => p.class === 'SCHEMA');
  const tablePermissions = permissions.filter((p) => p.class === 'TABLE');

  // Get tables for selected schema
  const tablesForSchema = selectedSchema
    ? tables.filter((t) => t.schema === selectedSchema)
    : [];

  if (user.superuser) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-2xl rounded-lg bg-white dark:bg-gray-800 shadow-xl">
          <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Shield className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Superuser Account</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">{user.name}</p>
              </div>
            </div>
            <button onClick={onClose} className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700">
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          <div className="p-6 text-center">
            <Shield className="mx-auto h-16 w-16 text-purple-600 dark:text-purple-400 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Superuser Access
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Superusers have full access to all databases, schemas, and tables.
              <br />
              No explicit permissions need to be granted.
            </p>
            <div className="rounded-lg border-2 border-purple-200 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-900/20">
              <p className="text-sm text-purple-800 dark:text-purple-200">
                To manage this user's permissions, you must first demote them from superuser status.
              </p>
            </div>
          </div>

          <div className="flex justify-end border-t border-gray-200 p-4 dark:border-gray-700">
            <button
              onClick={onClose}
              className="rounded-lg bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-4xl rounded-lg bg-white dark:bg-gray-800 shadow-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Key className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Manage Permissions</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">User: {user.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex px-4">
            <button
              onClick={() => setActiveTab('schema')}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'schema'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <Database className="h-4 w-4" />
              Schema Permissions
            </button>
            <button
              onClick={() => setActiveTab('table')}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'table'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <Table className="h-4 w-4" />
              Table Permissions
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Grant New Permission */}
              <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-blue-900 dark:text-blue-300">
                  <Plus className="h-4 w-4" />
                  Grant New {activeTab === 'schema' ? 'Schema' : 'Table'} Permission
                </h3>

                <div className="space-y-3">
                  {/* Select Schema/Table */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-blue-800 dark:text-blue-200">
                      Select {activeTab === 'schema' ? 'Schema' : 'Table'}
                    </label>
                    {activeTab === 'schema' ? (
                      <select
                        value={selectedSchema}
                        onChange={(e) => setSelectedSchema(e.target.value)}
                        className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-blue-700 dark:bg-gray-800 dark:text-white"
                      >
                        <option value="">-- Select Schema --</option>
                        {schemas.map((schema) => (
                          <option key={schema} value={schema}>
                            {schema}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="space-y-2">
                        <select
                          value={selectedSchema}
                          onChange={(e) => {
                            setSelectedSchema(e.target.value);
                            setSelectedTable('');
                          }}
                          className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-blue-700 dark:bg-gray-800 dark:text-white"
                        >
                          <option value="">-- Select Schema First --</option>
                          {schemas.map((schema) => (
                            <option key={schema} value={schema}>
                              {schema}
                            </option>
                          ))}
                        </select>
                        {selectedSchema && (
                          <select
                            value={selectedTable}
                            onChange={(e) => setSelectedTable(e.target.value)}
                            className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-blue-700 dark:bg-gray-800 dark:text-white"
                          >
                            <option value="">-- Select Table --</option>
                            {tablesForSchema.map((table) => (
                              <option key={`${table.schema}.${table.name}`} value={`${table.schema}.${table.name}`}>
                                {table.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Select Privileges */}
                  <div>
                    <label className="mb-2 block text-xs font-medium text-blue-800 dark:text-blue-200">
                      Select Privileges to Grant
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {PRIVILEGE_TYPES.map((priv) => (
                        <label
                          key={priv.value}
                          className={`flex cursor-pointer items-center gap-2 rounded-lg border-2 p-3 transition-all ${
                            selectedPrivileges.includes(priv.value)
                              ? 'border-blue-500 bg-blue-100 dark:border-blue-400 dark:bg-blue-900/40'
                              : 'border-gray-200 bg-white hover:border-blue-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-600'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedPrivileges.includes(priv.value)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedPrivileges([...selectedPrivileges, priv.value]);
                              } else {
                                setSelectedPrivileges(selectedPrivileges.filter((p) => p !== priv.value));
                              }
                            }}
                            className="h-4 w-4 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <div className="text-xs font-medium text-gray-900 dark:text-white">{priv.label}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{priv.description}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Grant Button */}
                  <button
                    onClick={handleGrant}
                    disabled={
                      granting ||
                      selectedPrivileges.length === 0 ||
                      (activeTab === 'schema' ? !selectedSchema : !selectedTable)
                    }
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {granting ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Granting...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        Grant Permissions
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Current Permissions */}
              <div>
                <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
                  Current {activeTab === 'schema' ? 'Schema' : 'Table'} Permissions
                </h3>

                {(activeTab === 'schema' ? schemaPermissions : tablePermissions).length === 0 ? (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-900">
                    <Lock className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      No {activeTab === 'schema' ? 'schema' : 'table'} permissions granted yet
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(activeTab === 'schema' ? schemaPermissions : tablePermissions).map((perm, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800"
                      >
                        <div className="flex items-center gap-3">
                          {activeTab === 'schema' ? (
                            <Database className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          ) : (
                            <Table className="h-5 w-5 text-green-600 dark:text-green-400" />
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{perm.ident}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {perm.type} • {perm.state}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRevoke(perm)}
                          className="rounded-lg border border-red-300 bg-red-50 p-2 hover:bg-red-100 dark:border-red-700 dark:bg-red-900/20 dark:hover:bg-red-900/30"
                          title="Revoke permission"
                        >
                          <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-gray-200 p-4 dark:border-gray-700">
          <button
            onClick={onClose}
            className="rounded-lg bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
