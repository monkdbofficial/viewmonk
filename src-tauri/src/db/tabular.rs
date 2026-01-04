use crate::models::{ColumnInfo, QueryResponse};
use crate::utils::{DbError, Result};
use bb8::Pool;
use bb8_postgres::PostgresConnectionManager;
use serde::{Deserialize, Serialize};
use std::time::{Duration, Instant};
use tokio_postgres::{NoTls, Row};

/// Connection pool configuration
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PoolConfig {
    /// Maximum number of connections in the pool
    pub max_size: u32,
    /// Minimum number of idle connections to maintain
    pub min_idle: Option<u32>,
    /// Maximum lifetime of a connection (in seconds)
    pub max_lifetime: Option<u64>,
    /// Idle timeout for connections (in seconds)
    pub idle_timeout: Option<u64>,
}

impl Default for PoolConfig {
    fn default() -> Self {
        Self {
            max_size: 10,
            min_idle: Some(2),
            max_lifetime: Some(1800), // 30 minutes
            idle_timeout: Some(600),   // 10 minutes
        }
    }
}

/// Pool health metrics
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PoolHealth {
    pub total_connections: u32,
    pub idle_connections: u32,
    pub active_connections: u32,
    pub max_size: u32,
    pub utilization_percent: f64,
    pub is_healthy: bool,
}

/// PostgreSQL database driver
pub struct PostgresDriver {
    pool: Pool<PostgresConnectionManager<NoTls>>,
    config: PoolConfig,
    host: String,
    port: u16,
    database: String,
}

impl PostgresDriver {
    /// Create a new PostgreSQL driver with connection pool and default config
    pub async fn new(
        host: String,
        port: u16,
        database: String,
        username: String,
        password: String,
        max_connections: u32,
    ) -> Result<Self> {
        let config = PoolConfig {
            max_size: max_connections,
            ..Default::default()
        };
        Self::with_config(host, port, database, username, password, config).await
    }

    /// Create a new PostgreSQL driver with custom pool configuration
    pub async fn with_config(
        host: String,
        port: u16,
        database: String,
        username: String,
        password: String,
        config: PoolConfig,
    ) -> Result<Self> {
        // Build connection string
        let conn_str = format!(
            "postgresql://{}:{}@{}:{}/{}",
            username, password, host, port, database
        );

        // Create connection manager
        let manager = PostgresConnectionManager::new_from_stringlike(conn_str, NoTls)
            .map_err(|e| DbError::ConnectionFailed(e.to_string()))?;

        // Build pool with configuration
        let mut builder = Pool::builder().max_size(config.max_size);

        if let Some(min_idle) = config.min_idle {
            builder = builder.min_idle(Some(min_idle));
        }

        if let Some(max_lifetime) = config.max_lifetime {
            builder = builder.max_lifetime(Some(Duration::from_secs(max_lifetime)));
        }

        if let Some(idle_timeout) = config.idle_timeout {
            builder = builder.idle_timeout(Some(Duration::from_secs(idle_timeout)));
        }

        let pool = builder
            .build(manager)
            .await
            .map_err(|e| DbError::ConnectionFailed(e.to_string()))?;

        log::info!(
            "Created PostgreSQL connection pool for {}:{}/{} (max_size: {}, min_idle: {:?})",
            host, port, database, config.max_size, config.min_idle
        );

        Ok(Self {
            pool,
            config,
            host,
            port,
            database,
        })
    }

    /// Test the database connection
    pub async fn test_connection(&self) -> Result<()> {
        let conn = self
            .pool
            .get()
            .await
            .map_err(|e| DbError::ConnectionFailed(e.to_string()))?;

        conn.query_one("SELECT 1", &[])
            .await
            .map_err(|e| DbError::ConnectionFailed(e.to_string()))?;

        Ok(())
    }

    /// Get server version
    pub async fn get_server_version(&self) -> Result<String> {
        let conn = self
            .pool
            .get()
            .await
            .map_err(|e| DbError::ConnectionFailed(e.to_string()))?;

        let row = conn
            .query_one("SELECT version()", &[])
            .await
            .map_err(|e| DbError::QueryFailed(e.to_string()))?;

        let version: String = row.get(0);
        Ok(version)
    }

    /// Execute a SQL query
    pub async fn execute_query(&self, query: &str) -> Result<QueryResponse> {
        let start = Instant::now();

        let conn = self
            .pool
            .get()
            .await
            .map_err(|_e| DbError::PoolExhausted)?;

        let rows = conn
            .query(query, &[])
            .await
            .map_err(|e| DbError::QueryFailed(e.to_string()))?;

        let execution_time_ms = start.elapsed().as_millis() as u64;

        // Extract column information
        let columns = if !rows.is_empty() {
            extract_columns(&rows[0])
        } else {
            Vec::new()
        };

        // Convert rows to JSON values
        let json_rows = rows
            .iter()
            .map(|row| row_to_json_values(row))
            .collect::<Result<Vec<_>>>()?;

        Ok(QueryResponse {
            columns,
            rows: json_rows,
            row_count: rows.len(),
            execution_time_ms,
            scanned_rows: None,
            index_used: None,
        })
    }

    /// Get connection pool statistics
    pub fn get_pool_stats(&self) -> (u32, u32) {
        let state = self.pool.state();
        (state.connections, state.idle_connections)
    }

    /// Get detailed pool health metrics
    pub fn get_pool_health(&self) -> PoolHealth {
        let state = self.pool.state();
        let total = state.connections;
        let idle = state.idle_connections;
        let active = total.saturating_sub(idle);
        let max_size = self.config.max_size;

        let utilization_percent = if max_size > 0 {
            (total as f64 / max_size as f64) * 100.0
        } else {
            0.0
        };

        // Consider pool healthy if:
        // 1. Utilization is below 90%
        // 2. We have at least min_idle connections when configured
        let is_healthy = utilization_percent < 90.0
            && self.config.min_idle.map_or(true, |min| idle >= min);

        PoolHealth {
            total_connections: total,
            idle_connections: idle,
            active_connections: active,
            max_size,
            utilization_percent,
            is_healthy,
        }
    }

    /// Get pool configuration
    pub fn get_pool_config(&self) -> &PoolConfig {
        &self.config
    }

    /// Get database metadata
    pub fn get_metadata(&self) -> (String, u16, String) {
        (self.host.clone(), self.port, self.database.clone())
    }
}

/// Extract column information from a row
fn extract_columns(row: &Row) -> Vec<ColumnInfo> {
    row.columns()
        .iter()
        .map(|col| ColumnInfo {
            name: col.name().to_string(),
            data_type: format!("{:?}", col.type_()),
            nullable: true, // PostgreSQL doesn't provide this info easily in query results
        })
        .collect()
}

/// Convert a PostgreSQL row to JSON values
fn row_to_json_values(row: &Row) -> Result<Vec<serde_json::Value>> {
    let mut values = Vec::new();

    for (idx, column) in row.columns().iter().enumerate() {
        let value = match column.type_().name() {
            "int2" | "int4" => {
                let val: Option<i32> = row.try_get(idx).ok();
                val.map(|v| serde_json::Value::Number(v.into()))
                    .unwrap_or(serde_json::Value::Null)
            }
            "int8" => {
                let val: Option<i64> = row.try_get(idx).ok();
                val.map(|v| serde_json::Value::Number(v.into()))
                    .unwrap_or(serde_json::Value::Null)
            }
            "float4" | "float8" => {
                let val: Option<f64> = row.try_get(idx).ok();
                val.and_then(|v| serde_json::Number::from_f64(v).map(serde_json::Value::Number))
                    .unwrap_or(serde_json::Value::Null)
            }
            "text" | "varchar" | "char" => {
                let val: Option<String> = row.try_get(idx).ok();
                val.map(serde_json::Value::String)
                    .unwrap_or(serde_json::Value::Null)
            }
            "bool" => {
                let val: Option<bool> = row.try_get(idx).ok();
                val.map(serde_json::Value::Bool)
                    .unwrap_or(serde_json::Value::Null)
            }
            "timestamp" | "timestamptz" => {
                let val: Option<chrono::NaiveDateTime> = row.try_get(idx).ok();
                val.map(|v| serde_json::Value::String(v.to_string()))
                    .unwrap_or(serde_json::Value::Null)
            }
            "uuid" => {
                let val: Option<uuid::Uuid> = row.try_get(idx).ok();
                val.map(|v| serde_json::Value::String(v.to_string()))
                    .unwrap_or(serde_json::Value::Null)
            }
            "json" | "jsonb" => {
                let val: Option<serde_json::Value> = row.try_get(idx).ok();
                val.unwrap_or(serde_json::Value::Null)
            }
            _ => {
                // Default: try to get as string
                let val: Option<String> = row.try_get(idx).ok();
                val.map(serde_json::Value::String)
                    .unwrap_or(serde_json::Value::Null)
            }
        };

        values.push(value);
    }

    Ok(values)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_column_info_creation() {
        let col = ColumnInfo {
            name: "id".to_string(),
            data_type: "INT4".to_string(),
            nullable: true,
        };

        assert_eq!(col.name, "id");
        assert_eq!(col.data_type, "INT4");
    }

    #[test]
    fn test_query_response_structure() {
        let response = QueryResponse {
            columns: vec![ColumnInfo {
                name: "test".to_string(),
                data_type: "TEXT".to_string(),
                nullable: true,
            }],
            rows: vec![vec![serde_json::Value::String("value".to_string())]],
            row_count: 1,
            execution_time_ms: 50,
            scanned_rows: None,
            index_used: None,
        };

        assert_eq!(response.row_count, 1);
        assert_eq!(response.columns.len(), 1);
        assert_eq!(response.execution_time_ms, 50);
    }
}
