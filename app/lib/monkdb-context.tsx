'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { MonkDBClient, MonkDBConfig, createMonkDBClient } from './monkdb-client';
import { isDesktopApp } from './tauri-utils';
import { useNotifications } from './notification-context';

export interface Connection {
  id: string;
  name: string;
  config: MonkDBConfig;
  client: MonkDBClient;
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  error?: string;
  metadata?: {
    version?: string;
    nodeCount?: number;
    uptime?: number;
  };
}

interface MonkDBContextValue {
  connections: Connection[];
  activeConnectionId: string | null;
  activeConnection: Connection | null;
  addConnection: (name: string, config: MonkDBConfig) => Promise<string>;
  removeConnection: (id: string) => void;
  setActiveConnection: (id: string) => void;
  testConnection: (id: string) => Promise<boolean>;
  refreshConnection: (id: string) => Promise<void>;
}

const MonkDBContext = createContext<MonkDBContextValue | undefined>(undefined);

export function MonkDBProvider({ children }: { children: React.ReactNode }) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [activeConnectionId, setActiveConnectionId] = useState<string | null>(null);
  const { addNotification } = useNotifications();

  // Memoize activeConnection to prevent unnecessary re-renders
  const activeConnection = useMemo(() =>
    connections.find((c) => c.id === activeConnectionId) || null,
    [connections, activeConnectionId]
  );

  // Load connections from server on mount
  useEffect(() => {
    loadConnectionsFromServer();
  }, []);

  // Load active connection from localStorage after connections are loaded
  useEffect(() => {
    if (connections.length > 0 && !activeConnectionId) {
      const savedActiveId = localStorage.getItem('monkdb_active_connection');
      if (savedActiveId && connections.some(c => c.id === savedActiveId)) {
        setActiveConnectionId(savedActiveId);
      }
    }
  }, [connections, activeConnectionId]);

  // Load connections from localStorage (no auth needed)
  const loadConnectionsFromServer = async () => {
    try {
      const stored = localStorage.getItem('monkdb_connections');
      if (stored) {
        const parsed = JSON.parse(stored);
        const restoredConnections = parsed.map((conn: any) => {
          // ENTERPRISE: Ensure legacy connections without role default to superuser
          const config = {
            ...conn.config,
            role: conn.config.role || 'superuser' as 'superuser'
          };

          console.log('[MonkDBContext] Restoring connection:', conn.name, 'with role:', config.role);

          return {
            id: conn.id,
            name: conn.name,
            config,
            client: createMonkDBClient(config),
            status: 'connecting' as const,
          };
        });
        setConnections(restoredConnections);

        // Test each connection to get actual status
        restoredConnections.forEach(async (conn: Connection) => {
          try {
            const result = await conn.client.testConnection();

            if (result.success) {
              const health = await conn.client.getClusterHealth();

              setConnections((prev) =>
                prev.map((c) =>
                  c.id === conn.id
                    ? {
                        ...c,
                        status: 'connected',
                        metadata: {
                          version: result.version,
                          nodeCount: health.nodeCount,
                          uptime: health.clusterUptime,
                        },
                      }
                    : c
                )
              );

              addNotification({
                type: 'success',
                title: 'Connection Restored',
                message: `Successfully connected to ${conn.name}`,
              });
            } else {
              setConnections((prev) =>
                prev.map((c) =>
                  c.id === conn.id
                    ? {
                        ...c,
                        status: 'error',
                        error: result.message,
                      }
                    : c
                )
              );

              addNotification({
                type: 'error',
                title: 'Connection Failed',
                message: `Failed to connect to ${conn.name}: ${result.message}`,
              });
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Connection failed';

            setConnections((prev) =>
              prev.map((c) =>
                c.id === conn.id
                  ? {
                      ...c,
                      status: 'error',
                      error: errorMessage,
                    }
                  : c
              )
            );

            addNotification({
              type: 'error',
              title: 'Connection Error',
              message: `Error connecting to ${conn.name}: ${errorMessage}`,
            });
          }
        });
      }
    } catch (error) {
      console.error('Failed to load connections from localStorage:', error);
    }
  };

  // Save connections to localStorage (no auth needed)
  const saveConnections = useCallback(async (conns: Connection[]) => {
    try {
      const toSave = conns.map((conn) => ({
        id: conn.id,
        name: conn.name,
        config: {
          host: conn.config.host,
          port: conn.config.port,
          username: conn.config.username,
          password: conn.config.password,
          protocol: conn.config.protocol,
          role: conn.config.role,
        },
      }));
      localStorage.setItem('monkdb_connections', JSON.stringify(toSave));
    } catch (error) {
      console.error('Failed to save connections to localStorage:', error);
    }
  }, []);

  const addConnection = useCallback(
    async (name: string, config: MonkDBConfig): Promise<string> => {
      const id = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const client = createMonkDBClient(config);

      const newConnection: Connection = {
        id,
        name,
        config,
        client,
        status: 'connecting',
      };

      setConnections((prev) => {
        const updated = [...prev, newConnection];
        saveConnections(updated);
        return updated;
      });

      // Test the connection
      try {
        const result = await client.testConnection();

        if (result.success) {
          const health = await client.getClusterHealth();

          setConnections((prev) =>
            prev.map((conn) =>
              conn.id === id
                ? {
                    ...conn,
                    status: 'connected',
                    metadata: {
                      version: result.version,
                      nodeCount: health.nodeCount,
                      uptime: health.clusterUptime,
                    },
                  }
                : conn
            )
          );

          addNotification({
            type: 'success',
            title: 'Connection Added',
            message: `Successfully connected to ${name}`,
          });
        } else {
          setConnections((prev) =>
            prev.map((conn) =>
              conn.id === id
                ? {
                    ...conn,
                    status: 'error',
                    error: result.message,
                  }
                : conn
            )
          );

          addNotification({
            type: 'error',
            title: 'Connection Failed',
            message: `Failed to connect to ${name}: ${result.message}`,
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Connection failed';

        setConnections((prev) =>
          prev.map((conn) =>
            conn.id === id
              ? {
                  ...conn,
                  status: 'error',
                  error: errorMessage,
                }
              : conn
          )
        );

        addNotification({
          type: 'error',
          title: 'Connection Error',
          message: `Error connecting to ${name}: ${errorMessage}`,
        });
      }

      return id;
    },
    [saveConnections, addNotification]
  );

  const removeConnection = useCallback(
    (id: string) => {
      setConnections((prev) => {
        const updated = prev.filter((conn) => conn.id !== id);
        saveConnections(updated);
        return updated;
      });

      if (activeConnectionId === id) {
        setActiveConnectionId(null);
      }
    },
    [activeConnectionId, saveConnections]
  );

  const setActiveConnection = useCallback((id: string) => {
    setActiveConnectionId(id);
    localStorage.setItem('monkdb_active_connection', id);
  }, []);

  const testConnection = useCallback(async (id: string): Promise<boolean> => {
    const connection = connections.find((c) => c.id === id);
    if (!connection) return false;

    try {
      const result = await connection.client.testConnection();
      return result.success;
    } catch (error) {
      return false;
    }
  }, [connections]);

  const refreshConnection = useCallback(async (id: string) => {
    const connection = connections.find((c) => c.id === id);
    if (!connection) return;

    setConnections((prev) =>
      prev.map((conn) => (conn.id === id ? { ...conn, status: 'connecting' } : conn))
    );

    try {
      const result = await connection.client.testConnection();

      if (result.success) {
        const health = await connection.client.getClusterHealth();

        setConnections((prev) =>
          prev.map((conn) =>
            conn.id === id
              ? {
                  ...conn,
                  status: 'connected',
                  error: undefined,
                  metadata: {
                    version: result.version,
                    nodeCount: health.nodeCount,
                    uptime: health.clusterUptime,
                  },
                }
              : conn
          )
        );

        addNotification({
          type: 'info',
          title: 'Connection Refreshed',
          message: `Successfully refreshed connection to ${connection.name}`,
        });
      } else {
        setConnections((prev) =>
          prev.map((conn) =>
            conn.id === id
              ? {
                  ...conn,
                  status: 'error',
                  error: result.message,
                }
              : conn
          )
        );

        addNotification({
          type: 'warning',
          title: 'Refresh Failed',
          message: `Failed to refresh ${connection.name}: ${result.message}`,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';

      setConnections((prev) =>
        prev.map((conn) =>
          conn.id === id
            ? {
                ...conn,
                status: 'error',
                error: errorMessage,
              }
            : conn
        )
      );

      addNotification({
        type: 'error',
        title: 'Refresh Error',
        message: `Error refreshing ${connection.name}: ${errorMessage}`,
      });
    }
  }, [connections, addNotification]);

  // Load active connection on mount
  useEffect(() => {
    const storedActive = localStorage.getItem('monkdb_active_connection');
    if (storedActive && connections.find((c) => c.id === storedActive)) {
      setActiveConnectionId(storedActive);
    }
  }, [connections]);

  const value: MonkDBContextValue = {
    connections,
    activeConnectionId,
    activeConnection,
    addConnection,
    removeConnection,
    setActiveConnection,
    testConnection,
    refreshConnection,
  };

  return <MonkDBContext.Provider value={value}>{children}</MonkDBContext.Provider>;
}

export function useMonkDB() {
  const context = useContext(MonkDBContext);
  if (!context) {
    throw new Error('useMonkDB must be used within a MonkDBProvider');
  }
  return context;
}

export function useActiveConnection() {
  const { activeConnection } = useMonkDB();
  return activeConnection;
}

export function useMonkDBClient() {
  const { activeConnection } = useMonkDB();
  return activeConnection?.client || null;
}
