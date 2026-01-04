'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

// Declare Tauri global type
declare global {
  interface Window {
    __TAURI__?: any;
  }
}

// Types matching Rust backend
export interface ContainerInfo {
  id: string;
  name: string;
  image: string;
  status: string;
  state: string;
  created: number;
  ports: PortMapping[];
  labels: Record<string, string>;
}

export interface PortMapping {
  container_port: number;
  host_port?: number;
  protocol: string;
}

export interface DockerStatus {
  available: boolean;
  version: string | null;
  error: string | null;
}

export interface ContainerDetails {
  id: string;
  name: string;
  image: string;
  state: ContainerState;
  created: number;
  started?: number;
  finished?: number;
  ports: PortMapping[];
  environment: Record<string, string>;
  mounts: Mount[];
  network_settings: NetworkSettings;
}

export interface ContainerState {
  status: string;
  running: boolean;
  paused: boolean;
  restarting: boolean;
  oom_killed: boolean;
  dead: boolean;
  pid: number;
  exit_code: number;
}

export interface Mount {
  type_: string;
  source: string;
  destination: string;
  read_only: boolean;
}

export interface NetworkSettings {
  networks: Record<string, Network>;
  ip_address: string;
  ports: Record<string, PortBinding[]>;
}

export interface Network {
  network_id: string;
  endpoint_id: string;
  gateway: string;
  ip_address: string;
  ip_prefix_len: number;
  mac_address: string;
}

export interface PortBinding {
  host_ip: string;
  host_port: string;
}

export interface ContainerLogs {
  stdout: string;
  stderr: string;
  timestamp: number;
}

interface DockerContextType {
  // State
  dockerAvailable: boolean;
  dockerVersion: string | null;
  dockerError: string | null;
  containers: ContainerInfo[];
  monkdbContainers: ContainerInfo[];
  loading: boolean;
  refreshing: boolean;

  // Actions
  checkDocker: () => Promise<void>;
  refreshContainers: () => Promise<void>;
  startContainer: (containerId: string) => Promise<void>;
  stopContainer: (containerId: string) => Promise<void>;
  restartContainer: (containerId: string) => Promise<void>;
  removeContainer: (containerId: string) => Promise<void>;
  getContainerDetails: (containerId: string) => Promise<ContainerDetails>;
  getContainerLogs: (containerId: string, tail?: number) => Promise<ContainerLogs>;

  // Auto-refresh control
  autoRefresh: boolean;
  setAutoRefresh: (enabled: boolean) => void;
  refreshInterval: number;
  setRefreshInterval: (seconds: number) => void;
}

const DockerContext = createContext<DockerContextType | undefined>(undefined);

export function DockerProvider({ children }: { children: ReactNode }) {
  // State
  const [dockerAvailable, setDockerAvailable] = useState(false);
  const [dockerVersion, setDockerVersion] = useState<string | null>(null);
  const [dockerError, setDockerError] = useState<string | null>(null);
  const [containers, setContainers] = useState<ContainerInfo[]>([]);
  const [monkdbContainers, setMonkdbContainers] = useState<ContainerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(10); // seconds

  // Check Docker availability
  const checkDocker = useCallback(async () => {
    // Check if we're running in Tauri environment
    if (typeof window === 'undefined' || !window.__TAURI__) {
      console.log('Not running in Tauri environment, skipping Docker check');
      setDockerAvailable(false);
      setDockerError('Docker management requires Tauri desktop app');
      return;
    }

    try {
      const status = await invoke<DockerStatus>('check_docker_available');
      setDockerAvailable(status.available);
      setDockerVersion(status.version);
      setDockerError(status.error);
    } catch (error) {
      console.error('Failed to check Docker:', error);
      setDockerAvailable(false);
      setDockerError(String(error));
    }
  }, []);

  // Refresh containers
  const refreshContainers = useCallback(async () => {
    if (!dockerAvailable || typeof window === 'undefined' || !window.__TAURI__) return;

    setRefreshing(true);
    try {
      const [allContainers, monkContainers] = await Promise.all([
        invoke<ContainerInfo[]>('list_containers'),
        invoke<ContainerInfo[]>('list_monkdb_containers'),
      ]);

      setContainers(allContainers);
      setMonkdbContainers(monkContainers);
    } catch (error) {
      console.error('Failed to refresh containers:', error);
    } finally {
      setRefreshing(false);
    }
  }, [dockerAvailable]);

  // Container operations
  const startContainer = useCallback(async (containerId: string) => {
    if (typeof window === 'undefined' || !window.__TAURI__) {
      throw new Error('Docker operations require Tauri desktop app');
    }
    try {
      await invoke('start_container', { containerId });
      await refreshContainers();
    } catch (error) {
      console.error('Failed to start container:', error);
      throw error;
    }
  }, [refreshContainers]);

  const stopContainer = useCallback(async (containerId: string) => {
    if (typeof window === 'undefined' || !window.__TAURI__) {
      throw new Error('Docker operations require Tauri desktop app');
    }
    try {
      await invoke('stop_container', { containerId });
      await refreshContainers();
    } catch (error) {
      console.error('Failed to stop container:', error);
      throw error;
    }
  }, [refreshContainers]);

  const restartContainer = useCallback(async (containerId: string) => {
    if (typeof window === 'undefined' || !window.__TAURI__) {
      throw new Error('Docker operations require Tauri desktop app');
    }
    try {
      await invoke('restart_container', { containerId });
      await refreshContainers();
    } catch (error) {
      console.error('Failed to restart container:', error);
      throw error;
    }
  }, [refreshContainers]);

  const removeContainer = useCallback(async (containerId: string) => {
    if (typeof window === 'undefined' || !window.__TAURI__) {
      throw new Error('Docker operations require Tauri desktop app');
    }
    try {
      await invoke('remove_container', { containerId });
      await refreshContainers();
    } catch (error) {
      console.error('Failed to remove container:', error);
      throw error;
    }
  }, [refreshContainers]);

  const getContainerDetails = useCallback(async (containerId: string): Promise<ContainerDetails> => {
    if (typeof window === 'undefined' || !window.__TAURI__) {
      throw new Error('Docker operations require Tauri desktop app');
    }
    try {
      return await invoke<ContainerDetails>('get_container', { containerId });
    } catch (error) {
      console.error('Failed to get container details:', error);
      throw error;
    }
  }, []);

  const getContainerLogs = useCallback(async (containerId: string, tail: number = 100): Promise<ContainerLogs> => {
    if (typeof window === 'undefined' || !window.__TAURI__) {
      throw new Error('Docker operations require Tauri desktop app');
    }
    try {
      return await invoke<ContainerLogs>('get_container_logs', { containerId, tail });
    } catch (error) {
      console.error('Failed to get container logs:', error);
      throw error;
    }
  }, []);

  // Initial setup
  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      await checkDocker();
      setLoading(false);
    };

    initialize();
  }, [checkDocker]);

  // Load containers when Docker becomes available
  useEffect(() => {
    if (dockerAvailable) {
      refreshContainers();
    }
  }, [dockerAvailable, refreshContainers]);

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh || !dockerAvailable) return;

    const interval = setInterval(() => {
      refreshContainers();
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, dockerAvailable, refreshInterval, refreshContainers]);

  const value: DockerContextType = {
    dockerAvailable,
    dockerVersion,
    dockerError,
    containers,
    monkdbContainers,
    loading,
    refreshing,
    checkDocker,
    refreshContainers,
    startContainer,
    stopContainer,
    restartContainer,
    removeContainer,
    getContainerDetails,
    getContainerLogs,
    autoRefresh,
    setAutoRefresh,
    refreshInterval,
    setRefreshInterval,
  };

  return <DockerContext.Provider value={value}>{children}</DockerContext.Provider>;
}

export function useDocker() {
  const context = useContext(DockerContext);
  if (!context) {
    throw new Error('useDocker must be used within DockerProvider');
  }
  return context;
}

// Specialized hooks for specific use cases
export function useMonkDBContainers() {
  const { monkdbContainers, refreshContainers, refreshing } = useDocker();
  return { containers: monkdbContainers, refresh: refreshContainers, refreshing };
}

export function useContainerActions(containerId: string) {
  const { startContainer, stopContainer, restartContainer, removeContainer } = useDocker();

  return {
    start: () => startContainer(containerId),
    stop: () => stopContainer(containerId),
    restart: () => restartContainer(containerId),
    remove: () => removeContainer(containerId),
  };
}
