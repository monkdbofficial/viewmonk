import { invoke } from '@tauri-apps/api/core';
import type {
  ConnectRequest,
  ConnectResponse,
  TestConnectionResult,
  ConnectionHandle,
  QueryRequest,
  QueryResponse,
} from './types';

/**
 * Connect to a database
 */
export async function connectDatabase(request: ConnectRequest): Promise<ConnectResponse> {
  return await invoke<ConnectResponse>('connect_database', { request });
}

/**
 * Disconnect from a database
 */
export async function disconnectDatabase(connectionId: string): Promise<void> {
  return await invoke('disconnect_database', { connectionId });
}

/**
 * Test a database connection
 */
export async function testConnection(connectionId: string): Promise<TestConnectionResult> {
  return await invoke<TestConnectionResult>('test_connection', { connectionId });
}

/**
 * List all active connections
 */
export async function listConnections(): Promise<string[]> {
  return await invoke<string[]>('list_connections');
}

/**
 * Get connection information
 */
export async function getConnectionInfo(connectionId: string): Promise<ConnectionHandle> {
  return await invoke<ConnectionHandle>('get_connection_info', { connectionId });
}

/**
 * Execute a database query
 */
export async function executeQuery(request: QueryRequest): Promise<QueryResponse> {
  return await invoke<QueryResponse>('execute_query', { request });
}
