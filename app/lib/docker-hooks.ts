import { useState, useEffect, useCallback } from 'react';
import { useDocker, ContainerDetails, ContainerLogs } from './docker-context';

/**
 * Hook to fetch and monitor container details
 */
export function useContainerDetails(containerId: string | null) {
  const { getContainerDetails } = useDocker();
  const [details, setDetails] = useState<ContainerDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDetails = useCallback(async () => {
    if (!containerId) {
      setDetails(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getContainerDetails(containerId);
      setDetails(data);
    } catch (err) {
      setError(String(err));
      setDetails(null);
    } finally {
      setLoading(false);
    }
  }, [containerId, getContainerDetails]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  return { details, loading, error, refresh: fetchDetails };
}

/**
 * Hook to fetch and monitor container logs
 */
export function useContainerLogs(containerId: string | null, tail: number = 100) {
  const { getContainerLogs } = useDocker();
  const [logs, setLogs] = useState<ContainerLogs | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchLogs = useCallback(async () => {
    if (!containerId) {
      setLogs(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getContainerLogs(containerId, tail);
      setLogs(data);
    } catch (err) {
      setError(String(err));
      setLogs(null);
    } finally {
      setLoading(false);
    }
  }, [containerId, tail, getContainerLogs]);

  // Auto-refresh logs
  useEffect(() => {
    if (!autoRefresh || !containerId) return;

    const interval = setInterval(() => {
      fetchLogs();
    }, 2000); // Refresh every 2 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, containerId, fetchLogs]);

  // Initial fetch
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return { logs, loading, error, refresh: fetchLogs, autoRefresh, setAutoRefresh };
}

/**
 * Hook to filter containers by state
 */
export function useContainersByState() {
  const { containers } = useDocker();

  const running = containers.filter((c) => c.state === 'running');
  const stopped = containers.filter((c) => c.state === 'exited');
  const paused = containers.filter((c) => c.state === 'paused');
  const other = containers.filter(
    (c) => c.state !== 'running' && c.state !== 'exited' && c.state !== 'paused'
  );

  return { running, stopped, paused, other, all: containers };
}

/**
 * Hook to get container statistics
 */
export function useContainerStats() {
  const { containers, monkdbContainers } = useDocker();

  const stats = {
    total: containers.length,
    running: containers.filter((c) => c.state === 'running').length,
    stopped: containers.filter((c) => c.state === 'exited').length,
    paused: containers.filter((c) => c.state === 'paused').length,
    monkdb: monkdbContainers.length,
    monkdbRunning: monkdbContainers.filter((c) => c.state === 'running').length,
  };

  return stats;
}

/**
 * Hook to search/filter containers
 */
export function useContainerSearch(searchTerm: string = '') {
  const { containers } = useDocker();

  const filteredContainers = containers.filter((container) => {
    const term = searchTerm.toLowerCase();
    return (
      container.name.toLowerCase().includes(term) ||
      container.image.toLowerCase().includes(term) ||
      container.id.toLowerCase().includes(term) ||
      container.status.toLowerCase().includes(term)
    );
  });

  return filteredContainers;
}

/**
 * Hook to extract MonkDB connection info from containers
 */
export function useMonkDBConnectionInfo() {
  const { monkdbContainers } = useDocker();

  const connections = monkdbContainers.map((container) => {
    // Extract ports
    const pgWirePort = container.ports.find(
      (p) => p.container_port === 5432
    )?.host_port;
    const httpPort = container.ports.find(
      (p) => p.container_port === 4200
    )?.host_port;

    // Extract environment variables from labels if available
    const labels = container.labels || {};
    const cluster = labels['monkdb.cluster'] || 'default';
    const node = labels['monkdb.node'] || container.name;

    return {
      containerId: container.id,
      containerName: container.name,
      image: container.image,
      state: container.state,
      pgWirePort: pgWirePort || 5432,
      httpPort: httpPort || 4200,
      cluster,
      node,
      host: 'localhost',
    };
  });

  return connections;
}

/**
 * Hook to check if a container is MonkDB
 */
export function useIsMonkDBContainer(containerId: string | null) {
  const { monkdbContainers } = useDocker();

  if (!containerId) return false;

  return monkdbContainers.some((c) => c.id === containerId);
}

/**
 * Hook to get container health status
 */
export function useContainerHealth(containerId: string | null) {
  const { details } = useContainerDetails(containerId);

  if (!details) {
    return {
      healthy: false,
      status: 'unknown',
    };
  }

  const isRunning = details.state.running;
  const exitCode = details.state.exit_code;

  return {
    healthy: isRunning && exitCode === 0,
    status: isRunning ? 'running' : 'stopped',
    exitCode,
    oomKilled: details.state.oom_killed,
    dead: details.state.dead,
  };
}

/**
 * Hook to batch container operations
 */
export function useBatchContainerOperations() {
  const { startContainer, stopContainer, restartContainer, removeContainer } = useDocker();
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<Record<string, { success: boolean; error?: string }>>({});

  const execute = useCallback(
    async (
      operation: 'start' | 'stop' | 'restart' | 'remove',
      containerIds: string[]
    ) => {
      setProcessing(true);
      setResults({});

      const newResults: Record<string, { success: boolean; error?: string }> = {};

      const operationFn = {
        start: startContainer,
        stop: stopContainer,
        restart: restartContainer,
        remove: removeContainer,
      }[operation];

      for (const containerId of containerIds) {
        try {
          await operationFn(containerId);
          newResults[containerId] = { success: true };
        } catch (error) {
          newResults[containerId] = { success: false, error: String(error) };
        }
      }

      setResults(newResults);
      setProcessing(false);

      return newResults;
    },
    [startContainer, stopContainer, restartContainer, removeContainer]
  );

  return { execute, processing, results };
}

/**
 * Hook to format container uptime
 */
export function useContainerUptime(created: number) {
  const [uptime, setUptime] = useState('');

  useEffect(() => {
    const updateUptime = () => {
      const now = Date.now();
      const diff = now - created * 1000; // created is in seconds

      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (days > 0) {
        setUptime(`${days}d ${hours % 24}h`);
      } else if (hours > 0) {
        setUptime(`${hours}h ${minutes % 60}m`);
      } else if (minutes > 0) {
        setUptime(`${minutes}m ${seconds % 60}s`);
      } else {
        setUptime(`${seconds}s`);
      }
    };

    updateUptime();
    const interval = setInterval(updateUptime, 1000);

    return () => clearInterval(interval);
  }, [created]);

  return uptime;
}

/**
 * Hook to parse container ports into a readable format
 */
export function useContainerPorts(containerId: string | null) {
  const { details } = useContainerDetails(containerId);

  if (!details) return [];

  return details.ports.map((port) => ({
    containerPort: port.container_port,
    hostPort: port.host_port,
    protocol: port.protocol,
    display: port.host_port
      ? `${port.host_port} → ${port.container_port}/${port.protocol}`
      : `${port.container_port}/${port.protocol}`,
  }));
}
