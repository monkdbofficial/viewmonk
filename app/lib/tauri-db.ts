import {
  connectDatabase as connectDatabaseCommand,
  disconnectDatabase as disconnectDatabaseCommand,
  testConnection as testConnectionCommand,
  listConnections as listConnectionsCommand,
  getConnectionInfo as getConnectionInfoCommand,
  executeQuery as executeQueryCommand,
} from '@/tauri-bindings/commands';
import type {
  ConnectRequest,
  ConnectResponse,
  TestConnectionResult,
  ConnectionHandle,
  QueryRequest,
  QueryResponse,
} from '@/tauri-bindings/types';

/**
 * Tauri Database Client
 * Provides a clean API for interacting with the Tauri backend
 */
export class TauriDBClient {
  /**
   * Connect to a database
   */
  async connect(request: ConnectRequest): Promise<ConnectResponse> {
    try {
      const response = await connectDatabaseCommand(request);
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Disconnect from a database
   */
  async disconnect(connectionId: string): Promise<void> {
    try {
      await disconnectDatabaseCommand(connectionId);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Test database connection
   */
  async testConnection(connectionId: string): Promise<TestConnectionResult> {
    try {
      const result = await testConnectionCommand(connectionId);
      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * List all active connections
   */
  async listConnections(): Promise<string[]> {
    try {
      const connections = await listConnectionsCommand();
      return connections;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get connection information
   */
  async getConnectionInfo(connectionId: string): Promise<ConnectionHandle> {
    try {
      const info = await getConnectionInfoCommand(connectionId);
      return info;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Execute a database query
   */
  async executeQuery(request: QueryRequest): Promise<QueryResponse> {
    try {
      const response = await executeQueryCommand(request);
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check if running in Tauri environment
   */
  isAvailable(): boolean {
    return typeof window !== 'undefined' && '__TAURI__' in window;
  }
}

// Singleton instance
export const tauriDB = new TauriDBClient();

// Default export
export default tauriDB;
