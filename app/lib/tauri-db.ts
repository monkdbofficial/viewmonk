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
      console.log('[TauriDB] Connecting to database:', request.name);
      const response = await connectDatabaseCommand(request);
      console.log('[TauriDB] Connected successfully:', response.connection_id);
      return response;
    } catch (error) {
      console.error('[TauriDB] Connection failed:', error);
      throw error;
    }
  }

  /**
   * Disconnect from a database
   */
  async disconnect(connectionId: string): Promise<void> {
    try {
      console.log('[TauriDB] Disconnecting:', connectionId);
      await disconnectDatabaseCommand(connectionId);
      console.log('[TauriDB] Disconnected successfully');
    } catch (error) {
      console.error('[TauriDB] Disconnect failed:', error);
      throw error;
    }
  }

  /**
   * Test database connection
   */
  async testConnection(connectionId: string): Promise<TestConnectionResult> {
    try {
      console.log('[TauriDB] Testing connection:', connectionId);
      const result = await testConnectionCommand(connectionId);
      console.log('[TauriDB] Connection test result:', result);
      return result;
    } catch (error) {
      console.error('[TauriDB] Connection test failed:', error);
      throw error;
    }
  }

  /**
   * List all active connections
   */
  async listConnections(): Promise<string[]> {
    try {
      const connections = await listConnectionsCommand();
      console.log('[TauriDB] Active connections:', connections.length);
      return connections;
    } catch (error) {
      console.error('[TauriDB] Failed to list connections:', error);
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
      console.error('[TauriDB] Failed to get connection info:', error);
      throw error;
    }
  }

  /**
   * Execute a database query
   */
  async executeQuery(request: QueryRequest): Promise<QueryResponse> {
    try {
      console.log('[TauriDB] Executing query on:', request.connection_id);
      console.log('[TauriDB] Query:', request.query.substring(0, 100) + '...');

      const response = await executeQueryCommand(request);

      console.log(
        '[TauriDB] Query executed:',
        response.row_count,
        'rows in',
        response.execution_time_ms,
        'ms'
      );

      return response;
    } catch (error) {
      console.error('[TauriDB] Query execution failed:', error);
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
