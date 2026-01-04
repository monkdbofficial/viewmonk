use crate::state::DatabaseType;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Request to connect to a database
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectRequest {
    pub name: String,
    pub db_type: String,
    pub host: String,
    pub port: u16,
    pub database: String,
    pub username: String,
    pub password: String,
    pub ssl_enabled: bool,
    pub ssl_cert_path: Option<String>,
    #[serde(default)]
    pub connection_options: HashMap<String, String>,
}

/// Response from connecting to a database
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectResponse {
    pub connection_id: String,
    pub status: String,
    pub server_version: Option<String>,
    pub metadata: ConnectionMetadataResponse,
}

/// Connection metadata response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionMetadataResponse {
    pub name: String,
    pub host: String,
    pub port: u16,
    pub database: String,
    pub db_type: String,
    pub username: Option<String>,
}

/// Test connection result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestConnectionResult {
    pub success: bool,
    pub latency_ms: u64,
    pub message: String,
}

/// Pool statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PoolStats {
    pub connection_id: String,
    pub active_connections: u32,
    pub idle_connections: u32,
    pub max_connections: u32,
    pub total_connections: u32,
}

impl ConnectRequest {
    /// Build a PostgreSQL connection string
    pub fn to_postgres_connection_string(&self) -> String {
        let ssl_mode = if self.ssl_enabled { "require" } else { "prefer" };

        format!(
            "postgresql://{}:{}@{}:{}/{}?sslmode={}",
            self.username,
            self.password,
            self.host,
            self.port,
            self.database,
            ssl_mode
        )
    }

    /// Build a MongoDB connection string
    pub fn to_mongodb_connection_string(&self) -> String {
        let auth = if !self.username.is_empty() {
            format!("{}:{}@", self.username, self.password)
        } else {
            String::new()
        };

        let ssl = if self.ssl_enabled { "&tls=true" } else { "" };

        format!(
            "mongodb://{}{}:{}/{}?retryWrites=true&w=majority{}",
            auth, self.host, self.port, self.database, ssl
        )
    }

    /// Parse database type
    pub fn parse_db_type(&self) -> Result<DatabaseType, crate::utils::DbError> {
        self.db_type.parse()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_postgres_connection_string() {
        let req = ConnectRequest {
            name: "test".to_string(),
            db_type: "tabular".to_string(),
            host: "localhost".to_string(),
            port: 5432,
            database: "testdb".to_string(),
            username: "user".to_string(),
            password: "pass".to_string(),
            ssl_enabled: false,
            ssl_cert_path: None,
            connection_options: HashMap::new(),
        };

        let conn_str = req.to_postgres_connection_string();
        assert!(conn_str.contains("postgresql://"));
        assert!(conn_str.contains("user:pass"));
        assert!(conn_str.contains("localhost:5432"));
    }

    #[test]
    fn test_mongodb_connection_string() {
        let req = ConnectRequest {
            name: "test".to_string(),
            db_type: "document".to_string(),
            host: "localhost".to_string(),
            port: 27017,
            database: "testdb".to_string(),
            username: "admin".to_string(),
            password: "secret".to_string(),
            ssl_enabled: true,
            ssl_cert_path: None,
            connection_options: HashMap::new(),
        };

        let conn_str = req.to_mongodb_connection_string();
        assert!(conn_str.contains("mongodb://"));
        assert!(conn_str.contains("admin:secret"));
        assert!(conn_str.contains("tls=true"));
    }
}
