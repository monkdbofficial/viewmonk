'use client';

import { useState } from 'react';
import { Code, Key, Copy, RefreshCw, Trash2, X, Plus, Eye, EyeOff, CheckCircle } from 'lucide-react';

export interface APIKey {
  id: string;
  name: string;
  key: string;
  secret: string;
  scope: 'read' | 'write' | 'admin';
  status: 'active' | 'revoked' | 'expired';
  createdAt: Date;
  expiresAt?: Date;
  lastUsed?: Date;
  requestCount: number;
  rateLimit: number;
}

interface APIAccessPanelProps {
  apiKeys: APIKey[];
  onCreateKey: (key: Omit<APIKey, 'id' | 'key' | 'secret' | 'createdAt' | 'lastUsed' | 'requestCount'>) => void;
  onRevokeKey: (id: string) => void;
  onRegenerateKey: (id: string) => void;
}

export default function APIAccessPanel({ apiKeys, onCreateKey, onRevokeKey, onRegenerateKey }: APIAccessPanelProps) {
  const [showPanel, setShowPanel] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showSecrets, setShowSecrets] = useState<{ [key: string]: boolean }>({});
  const [newKey, setNewKey] = useState({
    name: '',
    scope: 'read' as 'read' | 'write' | 'admin',
    status: 'active' as 'active' | 'revoked' | 'expired',
    expiresAt: undefined as Date | undefined,
    rateLimit: 1000,
  });

  const handleCreateKey = () => {
    if (!newKey.name) {
      alert('Please enter a name for the API key');
      return;
    }

    onCreateKey(newKey);
    setNewKey({
      name: '',
      scope: 'read',
      status: 'active',
      expiresAt: undefined,
      rateLimit: 1000,
    });
    setShowCreateForm(false);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    alert(`${label} copied to clipboard!`);
  };

  const toggleSecret = (id: string) => {
    setShowSecrets(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getScopeColor = (scope: string) => {
    switch (scope) {
      case 'admin': return 'from-red-600 to-red-700';
      case 'write': return 'from-orange-600 to-orange-700';
      case 'read': return 'from-green-600 to-green-700';
      default: return 'from-gray-600 to-gray-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
      case 'revoked': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
      case 'expired': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300';
      default: return 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300';
    }
  };

  const activeKeys = apiKeys.filter(k => k.status === 'active').length;
  const totalRequests = apiKeys.reduce((sum, k) => sum + k.requestCount, 0);

  return (
    <div className="relative">
      {/* API Access Button */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="flex items-center gap-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-5 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-md hover:shadow-lg transition-all"
      >
        <Code className="h-4 w-4" />
        API Access
        {activeKeys > 0 && (
          <span className="ml-1 rounded-full bg-gradient-to-r from-green-600 to-green-700 px-2.5 py-0.5 text-xs font-bold text-white shadow-md">
            {activeKeys}
          </span>
        )}
      </button>

      {/* API Access Panel */}
      {showPanel && (
        <div className="absolute right-0 top-full mt-3 w-[800px] rounded-2xl border border-gray-200/50 bg-white/95 backdrop-blur-xl shadow-2xl dark:border-gray-700/50 dark:bg-gray-800/95 z-50 max-h-[600px] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="border-b border-gray-200 dark:border-gray-700/50 bg-gradient-to-r from-green-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-850 dark:to-gray-900 px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-green-600 to-blue-600 shadow-lg">
                  <Code className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    API Access & Keys
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                    {activeKeys} active keys • {totalRequests.toLocaleString()} total requests
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all"
                  title="Create API key"
                >
                  <Plus className="h-4 w-4" />
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

          {/* Create API Key Form */}
          {showCreateForm && (
            <div className="border-b border-gray-200 dark:border-gray-700 p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30">
              <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Create New API Key</h4>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="API Key Name (e.g., Production App)"
                  value={newKey.name}
                  onChange={(e) => setNewKey({ ...newKey, name: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                />

                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={newKey.scope}
                    onChange={(e) => setNewKey({ ...newKey, scope: e.target.value as any })}
                    className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                  >
                    <option value="read">Read Only</option>
                    <option value="write">Read & Write</option>
                    <option value="admin">Full Access (Admin)</option>
                  </select>

                  <input
                    type="number"
                    placeholder="Rate Limit (req/hour)"
                    value={newKey.rateLimit}
                    onChange={(e) => setNewKey({ ...newKey, rateLimit: Number(e.target.value) })}
                    className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                  />
                </div>

                <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-3 text-xs text-blue-900 dark:text-blue-200">
                  <strong>⚠️ Important:</strong> API key and secret will be shown only once. Make sure to copy and store them securely.
                </div>

                <button
                  onClick={handleCreateKey}
                  className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg text-sm font-semibold shadow-lg transition-all"
                >
                  Generate API Key
                </button>
              </div>
            </div>
          )}

          {/* API Documentation */}
          <div className="border-b border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900/30">
            <div className="text-xs space-y-2">
              <div className="font-semibold text-gray-900 dark:text-white mb-2">Quick Start:</div>
              <div className="bg-gray-900 dark:bg-gray-950 rounded-lg p-3 text-green-400 font-mono overflow-x-auto">
                curl -H "X-API-Key: YOUR_KEY" -H "X-API-Secret: YOUR_SECRET" \<br />
                &nbsp;&nbsp;https://api.example.com/v1/dashboards
              </div>
              <div className="text-gray-600 dark:text-gray-400">
                Available endpoints: <code className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">/v1/dashboards</code>,
                <code className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded ml-1">/v1/widgets</code>,
                <code className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded ml-1">/v1/data</code>
              </div>
            </div>
          </div>

          {/* API Keys List */}
          <div className="flex-1 overflow-y-auto p-6">
            {apiKeys.length === 0 ? (
              <div className="py-12 text-center">
                <Key className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-600 dark:text-gray-400">No API keys created</p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Create an API key to access the dashboard programmatically
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {apiKeys.map(apiKey => (
                  <div
                    key={apiKey.id}
                    className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="text-sm font-bold text-gray-900 dark:text-white">{apiKey.name}</h4>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getStatusColor(apiKey.status)}`}>
                            {apiKey.status}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r ${getScopeColor(apiKey.scope)} text-white`}>
                            {apiKey.scope}
                          </span>
                        </div>

                        {/* API Key */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="text-xs text-gray-600 dark:text-gray-400 w-16">Key:</div>
                            <div className="flex-1 flex items-center gap-2">
                              <code className="flex-1 bg-gray-100 dark:bg-gray-900 px-3 py-1.5 rounded font-mono text-xs text-gray-900 dark:text-gray-100">
                                {apiKey.key}
                              </code>
                              <button
                                onClick={() => copyToClipboard(apiKey.key, 'API Key')}
                                className="p-1.5 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-all"
                                title="Copy key"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="text-xs text-gray-600 dark:text-gray-400 w-16">Secret:</div>
                            <div className="flex-1 flex items-center gap-2">
                              <code className="flex-1 bg-gray-100 dark:bg-gray-900 px-3 py-1.5 rounded font-mono text-xs text-gray-900 dark:text-gray-100">
                                {showSecrets[apiKey.id] ? apiKey.secret : '••••••••••••••••••••••••'}
                              </code>
                              <button
                                onClick={() => toggleSecret(apiKey.id)}
                                className="p-1.5 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-all"
                                title={showSecrets[apiKey.id] ? 'Hide secret' : 'Show secret'}
                              >
                                {showSecrets[apiKey.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                              </button>
                              <button
                                onClick={() => copyToClipboard(apiKey.secret, 'API Secret')}
                                className="p-1.5 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-all"
                                title="Copy secret"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-4 gap-4 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                          <div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">Requests</div>
                            <div className="text-sm font-bold text-gray-900 dark:text-white">{apiKey.requestCount.toLocaleString()}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">Rate Limit</div>
                            <div className="text-sm font-bold text-gray-900 dark:text-white">{apiKey.rateLimit}/hr</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">Created</div>
                            <div className="text-sm font-bold text-gray-900 dark:text-white">{new Date(apiKey.createdAt).toLocaleDateString()}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">Last Used</div>
                            <div className="text-sm font-bold text-gray-900 dark:text-white">
                              {apiKey.lastUsed ? new Date(apiKey.lastUsed).toLocaleDateString() : 'Never'}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => onRegenerateKey(apiKey.id)}
                          className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-all"
                          title="Regenerate key"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onRevokeKey(apiKey.id)}
                          className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-all"
                          title="Revoke key"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
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
