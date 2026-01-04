// TypeScript types matching Rust backend types

export type DatabaseType =
  | 'document'
  | 'vector'
  | 'timeseries'
  | 'geospatial'
  | 'tabular'
  | 'olap'
  | 'blob'
  | 'fulltext';

export interface ConnectRequest {
  name: string;
  db_type: string;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl_enabled: boolean;
  ssl_cert_path?: string;
  connection_options?: Record<string, string>;
}

export interface ConnectResponse {
  connection_id: string;
  status: string;
  server_version?: string;
  metadata: ConnectionMetadataResponse;
}

export interface ConnectionMetadataResponse {
  name: string;
  host: string;
  port: number;
  database: string;
  db_type: string;
  username?: string;
}

export interface TestConnectionResult {
  success: boolean;
  latency_ms: number;
  message: string;
}

export interface PoolStats {
  connection_id: string;
  active_connections: number;
  idle_connections: number;
  max_connections: number;
  total_connections: number;
}

export interface QueryRequest {
  connection_id: string;
  query: string;
  collection?: string;
  limit?: number;
  offset?: number;
}

export interface QueryResponse {
  columns: ColumnInfo[];
  rows: any[][];
  row_count: number;
  execution_time_ms: number;
  scanned_rows?: number;
  index_used?: string;
}

export interface ColumnInfo {
  name: string;
  data_type: string;
  nullable: boolean;
}

export interface SchemaInfo {
  databases: DatabaseInfo[];
}

export interface DatabaseInfo {
  name: string;
  tables: TableInfo[];
  size_bytes?: number;
}

export interface TableInfo {
  name: string;
  row_count?: number;
  columns: ColumnInfo[];
  indexes: IndexInfo[];
}

export interface IndexInfo {
  name: string;
  columns: string[];
  unique: boolean;
  index_type: string;
}

export interface ConnectionHandle {
  id: string;
  name: string;
  db_type: DatabaseType;
  metadata: ConnectionMetadata;
  created_at: string;
  last_used: string;
}

export interface ConnectionMetadata {
  host: string;
  port: number;
  database: string;
  username?: string;
  status: ConnectionStatus;
  server_version?: string;
}

export type ConnectionStatus = 'connected' | 'disconnected' | 'error' | 'connecting';

// Error types
export interface DbError {
  type: string;
  message: string;
}
