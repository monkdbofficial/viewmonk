/**
 * MonkDB HTTP API Client
 * Production-ready client for MonkDB SQL HTTP endpoint
 *
 * Default endpoint: http://localhost:4200/_sql
 * PostgreSQL wire protocol: port 5432
 */

import { isDesktopApp } from './tauri-utils';

export interface MonkDBConfig {
  host: string;
  port: number;
  protocol?: 'http' | 'https';
  username?: string;
  password?: string;
  timeout?: number;
  role?: 'read-only' | 'read-write' | 'superuser';
}

export interface SQLRequest {
  stmt: string;
  args?: any[];
  bulk_args?: any[][];
}

export interface SQLResponse<T = any> {
  cols: string[];
  rows: T[][];
  rowcount: number;
  duration: number;
  error?: {
    message: string;
    code: number;
  };
}

export interface NodeInfo {
  name: string;
  uptime: number;
  hostname?: string;
  heap_used?: number;
  heap_max?: number;
  fs_total?: number;
  fs_used?: number;
}

export interface TableMetadata {
  table_name: string;
  table_schema: string;
  number_of_shards?: number;
  number_of_replicas?: string;
  clustered_by?: string;
}

export interface ColumnMetadata {
  ordinal_position: number;
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default?: string;
  character_maximum_length?: number;
  numeric_precision?: number;
  numeric_scale?: number;
  datetime_precision?: number;
}

export interface TableTreeNode {
  node_type: 'COLUMN' | 'PRIMARY_KEY' | 'TABLE_SETTING' | 'PRIVILEGE' | 'PARTITION';
  name: string;
  detail_1?: string;
  detail_2?: string;
  detail_3?: string;
}

export class MonkDBClient {
  private config: Required<MonkDBConfig>;
  private baseUrl: string;
  private useProxy: boolean;

  constructor(config: MonkDBConfig) {
    this.config = {
      host: config.host,
      port: config.port,
      protocol: config.protocol || 'http',
      username: config.username || '',
      password: config.password || '',
      timeout: config.timeout || 30000,
      role: config.role || 'read-only',
    };

    // Desktop app: use direct connections (no CORS issues in Tauri)
    // Web app: use proxy API to avoid CORS issues
    this.useProxy = typeof window !== 'undefined' && !isDesktopApp();
    this.baseUrl = this.useProxy ? '/api/monkdb/query' : `${this.config.protocol}://${this.config.host}:${this.config.port}/_sql`;
  }

  /**
   * Execute a SQL query
   */
  async query<T = any>(stmt: string, args?: any[]): Promise<SQLResponse<T>> {
    try {
      // Desktop app: Use Tauri command instead of fetch
      if (!this.useProxy && typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
        // Dynamically import Tauri invoke
        const { invoke } = await import('@tauri-apps/api/core');

        const result = await invoke<{
          cols: string[];
          rows: T[][];
          rowcount: number;
          duration: number;
        }>('execute_monkdb_http_query', {
          host: this.config.host,
          port: this.config.port,
          username: this.config.username || '',
          password: this.config.password || '',
          stmt,
          args: args || []
        });

        // Convert MonkDB response format to SQLResponse format
        return {
          cols: result.cols,
          rows: result.rows,
          rowcount: result.rowcount,
          duration: result.duration * 1000, // Convert seconds to milliseconds
        };
      }

      // Web app or fallback: Use fetch
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      let requestBody: any;

      if (this.useProxy) {
        // When using proxy, send connection config and query
        requestBody = {
          host: this.config.host,
          port: this.config.port,
          protocol: this.config.protocol,
          username: this.config.username,
          password: this.config.password,
          stmt,
          args: args || [],
        };
      } else {
        // Direct connection (server-side or desktop)
        requestBody = { stmt };
        if (args && args.length > 0) {
          requestBody.args = args;
        }

        // Add basic auth if credentials provided
        if (this.config.username && this.config.password) {
          const credentials = btoa(`${this.config.username}:${this.config.password}`);
          headers['Authorization'] = `Basic ${credentials}`;
        }
      }

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();

        let errorData: any;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          throw new Error(`HTTP ${response.status}: ${response.statusText}\nResponse: ${errorText}`);
        }

        const errorMessage = errorData.error?.message || errorData.message || `HTTP ${response.status}: ${response.statusText}`;

        throw new Error(errorMessage);
      }

      const responseText = await response.text();

      let data: SQLResponse<T>;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {

        // Check if this is an authentication error (catch all variations)
        const lowerText = responseText.toLowerCase();
        if (lowerText.includes('authentication') ||
            lowerText.includes('password') ||
            lowerText.includes('auth') ||
            lowerText.includes('trust') ||
            lowerText.includes('credentials') ||
            lowerText.includes('unauthorized') ||
            lowerText.includes('access denied')) {

          const authError = new Error('Authentication failed - Invalid username or password. Please check your credentials or create a new user.');
          (authError as any).category = 'auth';
          (authError as any).isAuthError = true;
          throw authError;
        }

        // Check if this is a connection refused error
        if (lowerText.includes('connection') || lowerText.includes('refused') || lowerText.includes('timeout')) {
          throw new Error('Cannot connect to MonkDB. Make sure MonkDB is running on the specified host and port.');
        }

        throw new Error(`Server returned invalid response: ${responseText.substring(0, 150)}`);
      }

      // ENTERPRISE: Preserve full error structure for better error handling
      if (data.error) {
        const dbError = new Error(`MonkDB Error [${data.error.code}]: ${data.error.message}`);
        // Attach the original error object for detailed error handling
        (dbError as any).code = data.error.code;
        (dbError as any).dbError = data.error;
        (dbError as any).category = 'query';
        throw dbError;
      }

      return data;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          const timeoutError = new Error(`Query timeout after ${this.config.timeout}ms`);
          (timeoutError as any).category = 'network';
          throw timeoutError;
        }
        // Preserve existing error category if set
        if (!(error as any).category) {
          (error as any).category = 'query';
        }
        throw error;
      }
      // Handle non-Error objects by including their details
      const errorDetails = typeof error === 'object' ? JSON.stringify(error) : String(error);
      const unknownError = new Error(`Query execution error: ${errorDetails}`);
      (unknownError as any).category = 'unknown';
      (unknownError as any).originalError = error;
      throw unknownError;
    }
  }

  /**
   * Execute a bulk query with multiple parameter sets
   */
  async bulkQuery<T = any>(stmt: string, bulkArgs: any[][]): Promise<SQLResponse<T>> {
    const request: SQLRequest = { stmt, bulk_args: bulkArgs };

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: SQLResponse<T> = await response.json();

      // ENTERPRISE: Preserve full error structure for better error handling
      if (data.error) {
        const dbError = new Error(`MonkDB Error [${data.error.code}]: ${data.error.message}`);
        // Attach the original error object for detailed error handling
        (dbError as any).code = data.error.code;
        (dbError as any).dbError = data.error;
        (dbError as any).category = 'query';
        throw dbError;
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  // ===== Node & Cluster Information =====

  /**
   * Get all nodes in the cluster
   */
  async getNodes(): Promise<NodeInfo[]> {
    const result = await this.query<any>(
      "SELECT name, os['uptime'], hostname, heap['used'], heap['max'], fs['total']['size'], fs['total']['used'] FROM sys.nodes"
    );

    return result.rows.map((row) => ({
      name: row[0],
      uptime: Math.floor((row[1] || 0) / 1000), // os['uptime'] is in ms → convert to seconds
      hostname: row[2],
      heap_used: row[3],
      heap_max: row[4],
      fs_total: row[5],
      fs_used: row[6],
    }));
  }

  /**
   * Get cluster uptime — time since MonkDB process was started.
   *
   * Uses the earliest entry in sys.jobs_log as a proxy for the MonkDB
   * process start time, which is accurate as long as the jobs_log hasn't
   * been fully cycled (default: 10,000 entries).
   *
   * Falls back to os['uptime'] / 1000 if jobs_log is empty.
   */
  async getClusterUptime(): Promise<number> {
    const result = await this.query<any>("SELECT min(started) AS monkdb_start_ms FROM sys.jobs_log");
    const monkdbStartMs: number | null = result.rows[0]?.[0] ?? null;
    if (monkdbStartMs != null && monkdbStartMs > 0) {
      return Math.floor((Date.now() - monkdbStartMs) / 1000);
    }
    // Fallback: use OS uptime (ms → seconds)
    const fallback = await this.query<any>("SELECT min(os['uptime']) FROM sys.nodes");
    return Math.floor((fallback.rows[0]?.[0] || 0) / 1000);
  }

  /**
   * Get node information by name
   */
  async getNodeByName(nodeName: string): Promise<NodeInfo | null> {
    const result = await this.query<any>(
      "SELECT name, os['uptime'], hostname, heap['used'], heap['max'], fs['total']['size'], fs['total']['used'] FROM sys.nodes WHERE name = ?",
      [nodeName]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      name: row[0],
      uptime: Math.floor((row[1] || 0) / 1000), // os['uptime'] is in ms → convert to seconds
      hostname: row[2],
      heap_used: row[3],
      heap_max: row[4],
      fs_total: row[5],
      fs_used: row[6],
    };
  }

  // ===== Schema & Table Metadata =====

  /**
   * Get all tables in a schema
   */
  async getTables(schemaName: string = 'doc'): Promise<TableMetadata[]> {
    const result = await this.query<any>(
      `SELECT table_name, table_schema, number_of_shards, number_of_replicas, clustered_by
       FROM information_schema.tables
       WHERE table_schema = ?`,
      [schemaName]
    );

    return result.rows.map((row) => ({
      table_name: row[0],
      table_schema: row[1],
      number_of_shards: row[2],
      number_of_replicas: row[3],
      clustered_by: row[4],
    }));
  }

  /**
   * Get all schemas
   */
  async getSchemas(): Promise<string[]> {
    const result = await this.query<any>(
      'SELECT DISTINCT table_schema FROM information_schema.tables ORDER BY table_schema'
    );
    return result.rows.map((row) => row[0]);
  }

  /**
   * Get columns for a specific table
   */
  async getTableColumns(schemaName: string, tableName: string): Promise<ColumnMetadata[]> {
    const result = await this.query<any>(
      `SELECT
        ordinal_position,
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length,
        numeric_precision,
        numeric_scale,
        datetime_precision
      FROM information_schema.columns
      WHERE table_schema = ?
        AND table_name = ?
      ORDER BY ordinal_position`,
      [schemaName, tableName]
    );

    return result.rows.map((row) => ({
      ordinal_position: row[0],
      column_name: row[1],
      data_type: row[2],
      is_nullable: row[3],
      column_default: row[4],
      character_maximum_length: row[5],
      numeric_precision: row[6],
      numeric_scale: row[7],
      datetime_precision: row[8],
    }));
  }

  /**
   * Get complete table tree structure (columns, PKs, settings, privileges, partitions)
   */
  async getTableTree(schemaName: string, tableName: string): Promise<TableTreeNode[]> {
    const result = await this.query<any>(
      `SELECT
        'COLUMN' AS node_type,
        c.column_name AS name,
        c.data_type AS detail_1,
        c.is_nullable AS detail_2,
        c.column_default AS detail_3
      FROM information_schema.columns c
      WHERE c.table_schema = ?
        AND c.table_name = ?

      UNION ALL

      SELECT
        'PRIMARY_KEY' AS node_type,
        k.column_name AS name,
        NULL AS detail_1,
        NULL AS detail_2,
        NULL AS detail_3
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage k
        ON tc.constraint_name = k.constraint_name
      WHERE tc.table_schema = ?
        AND tc.table_name = ?
        AND tc.constraint_type = 'PRIMARY KEY'

      UNION ALL

      SELECT
        'TABLE_SETTING' AS node_type,
        'shards' AS name,
        CAST(number_of_shards AS TEXT) AS detail_1,
        NULL AS detail_2,
        NULL AS detail_3
      FROM information_schema.tables
      WHERE table_schema = ?
        AND table_name = ?

      UNION ALL

      SELECT
        'TABLE_SETTING',
        'replicas',
        number_of_replicas,
        NULL,
        NULL
      FROM information_schema.tables
      WHERE table_schema = ?
        AND table_name = ?

      UNION ALL

      SELECT
        'TABLE_SETTING',
        'clustered_by',
        clustered_by,
        NULL,
        NULL
      FROM information_schema.tables
      WHERE table_schema = ?
        AND table_name = ?

      UNION ALL

      SELECT
        'PRIVILEGE' AS node_type,
        type AS name,
        grantee AS detail_1,
        state AS detail_2,
        NULL AS detail_3
      FROM sys.privileges
      WHERE class = 'TABLE'
        AND ident = ? || '.' || ?

      UNION ALL

      SELECT
        'PARTITION' AS node_type,
        CAST(values AS TEXT) AS name,
        NULL AS detail_1,
        NULL AS detail_2,
        NULL AS detail_3
      FROM sys.partitions
      WHERE schema_name = ?
        AND table_name = ?`,
      [
        schemaName, tableName, // COLUMN
        schemaName, tableName, // PRIMARY_KEY
        schemaName, tableName, // TABLE_SETTING - shards
        schemaName, tableName, // TABLE_SETTING - replicas
        schemaName, tableName, // TABLE_SETTING - clustered_by
        schemaName, tableName, // PRIVILEGE
        schemaName, tableName, // PARTITION
      ]
    );

    return result.rows.map((row) => ({
      node_type: row[0] as TableTreeNode['node_type'],
      name: row[1],
      detail_1: row[2],
      detail_2: row[3],
      detail_3: row[4],
    }));
  }

  /**
   * Get table row count
   */
  async getTableRowCount(schemaName: string, tableName: string): Promise<number> {
    const result = await this.query<any>(`SELECT COUNT(*) FROM "${schemaName}"."${tableName}"`);
    return result.rows[0]?.[0] || 0;
  }

  /**
   * Get table size from sys.shards
   */
  async getTableSize(schemaName: string, tableName: string): Promise<number> {
    const result = await this.query<any>(
      `SELECT SUM(size) FROM sys.shards WHERE table_schema = ? AND table_name = ? AND "primary" = true`,
      [schemaName, tableName]
    );
    return result.rows[0]?.[0] || 0;
  }

  // ===== Health & Diagnostics =====

  /**
   * Test connection to MonkDB
   */
  async testConnection(): Promise<{ success: boolean; message: string; version?: string }> {
    try {
      const result = await this.query('SELECT version()');
      return {
        success: true,
        message: 'Connected successfully',
        version: result.rows[0]?.[0],
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  /**
   * Get cluster health status
   */
  async getClusterHealth(): Promise<{
    nodeCount: number;
    healthyNodes: number;
    clusterUptime: number;
  }> {
    const nodes = await this.getNodes();
    const clusterUptime = await this.getClusterUptime();

    return {
      nodeCount: nodes.length,
      healthyNodes: nodes.filter((n) => n.uptime > 0).length,
      clusterUptime,
    };
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats(): Promise<{
    totalTables: number;
    totalSchemas: number;
    totalSize: number;
  }> {
    const [tablesResult, schemasResult, sizeResult] = await Promise.all([
      this.query<any>("SELECT COUNT(*) FROM information_schema.tables WHERE table_type = 'BASE TABLE'"),
      this.query<any>('SELECT COUNT(DISTINCT table_schema) FROM information_schema.tables'),
      this.query<any>('SELECT SUM(size) FROM sys.shards WHERE "primary" = true'),
    ]);

    return {
      totalTables: tablesResult.rows[0]?.[0] || 0,
      totalSchemas: schemasResult.rows[0]?.[0] || 0,
      totalSize: sizeResult.rows[0]?.[0] || 0,
    };
  }
}

/**
 * Create a new MonkDB client instance
 */
export function createMonkDBClient(config: MonkDBConfig): MonkDBClient {
  return new MonkDBClient(config);
}

/**
 * Default client instance for localhost
 */
export const defaultMonkDBClient = createMonkDBClient({
  host: process.env.NEXT_PUBLIC_DEFAULT_MONKDB_HOST || 'localhost',
  port: parseInt(process.env.NEXT_PUBLIC_DEFAULT_MONKDB_PORT || '4200'),
  protocol: 'http',
});

export default MonkDBClient;
