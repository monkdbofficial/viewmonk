use crate::audit::AuditLogger;
use crate::db::{PostgresDriver, QueryCache};
use crate::monitoring::MetricsCollector;
use crate::security::{InputValidator, KeychainManager};
use crate::utils::Result;
use chrono::{DateTime, Utc};
use dashmap::DashMap;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use uuid::Uuid;

/// Global application state
pub struct AppState {
    /// Connection registry (thread-safe concurrent HashMap)
    pub connections: Arc<DashMap<String, ConnectionHandle>>,

    /// Database drivers (separate from serializable connection handles)
    pub drivers: Arc<DashMap<String, Arc<PostgresDriver>>>,

    /// Credential store (OS keychain wrapper)
    pub credentials: Arc<KeychainManager>,

    /// Input validator (rate limiting, SQL injection prevention)
    pub validator: Arc<InputValidator>,

    /// Metrics collector for performance tracking
    pub metrics: Arc<MetricsCollector>,

    /// Audit logger for compliance and security
    pub audit: Arc<AuditLogger>,

    /// Query cache for optimizing repeated queries
    pub query_cache: Arc<QueryCache>,
}

impl AppState {
    /// Create a new application state
    pub fn new() -> Self {
        // Initialize logging
        if let Ok(log_dir) = crate::monitoring::get_log_dir() {
            if let Err(e) = crate::monitoring::init_logging(log_dir) {
                eprintln!("Failed to initialize logging: {}", e);
            }
        }

        // Initialize audit logger
        let audit_logger = match crate::audit::get_audit_dir() {
            Ok(audit_dir) => match AuditLogger::new(audit_dir) {
                Ok(logger) => Arc::new(logger),
                Err(e) => {
                    eprintln!("Failed to initialize audit logger: {}", e);
                    // Create a temporary audit logger in temp directory
                    let temp_dir = std::env::temp_dir().join("monkdb-audit");
                    Arc::new(AuditLogger::new(temp_dir).expect("Failed to create temp audit logger"))
                }
            },
            Err(e) => {
                eprintln!("Failed to get audit directory: {}", e);
                let temp_dir = std::env::temp_dir().join("monkdb-audit");
                Arc::new(AuditLogger::new(temp_dir).expect("Failed to create temp audit logger"))
            }
        };

        Self {
            connections: Arc::new(DashMap::new()),
            drivers: Arc::new(DashMap::new()),
            credentials: Arc::new(KeychainManager::new()),
            validator: Arc::new(InputValidator::new()),
            metrics: Arc::new(MetricsCollector::new()),
            audit: audit_logger,
            query_cache: Arc::new(QueryCache::new()),
        }
    }

    /// Generate a new unique connection ID
    pub fn generate_connection_id(&self) -> String {
        Uuid::new_v4().to_string()
    }

    /// Register a new connection
    pub fn register_connection(
        &self,
        connection_id: String,
        handle: ConnectionHandle,
    ) -> Result<()> {
        self.connections.insert(connection_id, handle);
        Ok(())
    }

    /// Get a connection by ID
    pub fn get_connection(&self, connection_id: &str) -> Option<ConnectionHandle> {
        self.connections.get(connection_id).map(|r| r.clone())
    }

    /// Remove a connection
    pub fn remove_connection(&self, connection_id: &str) -> Option<ConnectionHandle> {
        self.connections.remove(connection_id).map(|(_, v)| v)
    }

    /// Get all connection IDs
    pub fn list_connections(&self) -> Vec<String> {
        self.connections.iter().map(|r| r.key().clone()).collect()
    }

    /// Get connection count
    pub fn connection_count(&self) -> usize {
        self.connections.len()
    }

    /// Register a database driver
    pub fn register_driver(&self, connection_id: String, driver: Arc<PostgresDriver>) {
        self.drivers.insert(connection_id, driver);
    }

    /// Get a database driver by connection ID
    pub fn get_driver(&self, connection_id: &str) -> Option<Arc<PostgresDriver>> {
        self.drivers.get(connection_id).map(|r| r.clone())
    }

    /// Remove a database driver
    pub fn remove_driver(&self, connection_id: &str) -> Option<Arc<PostgresDriver>> {
        self.drivers.remove(connection_id).map(|(_, v)| v)
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}

/// Handle for an active database connection
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ConnectionHandle {
    pub id: String,
    pub name: String,
    pub db_type: DatabaseType,
    pub metadata: ConnectionMetadata,
    pub created_at: DateTime<Utc>,
    pub last_used: DateTime<Utc>,
}

impl ConnectionHandle {
    /// Create a new connection handle
    pub fn new(id: String, name: String, db_type: DatabaseType, metadata: ConnectionMetadata) -> Self {
        let now = Utc::now();
        Self {
            id,
            name,
            db_type,
            metadata,
            created_at: now,
            last_used: now,
        }
    }

    /// Update last used timestamp
    pub fn touch(&mut self) {
        self.last_used = Utc::now();
    }
}

/// Database type enumeration
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum DatabaseType {
    /// Document Store (MongoDB-style)
    Document,
    /// Vector Database (AI/ML embeddings)
    Vector,
    /// Time Series (metrics/telemetry)
    TimeSeries,
    /// Geospatial (location data)
    Geospatial,
    /// SQL Tables (relational)
    Tabular,
    /// OLAP Analytics (columnar)
    Olap,
    /// Blob Storage (object storage)
    Blob,
    /// Full-Text Search
    FullText,
}

impl std::str::FromStr for DatabaseType {
    type Err = crate::utils::DbError;

    fn from_str(s: &str) -> std::result::Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "document" => Ok(DatabaseType::Document),
            "vector" => Ok(DatabaseType::Vector),
            "timeseries" | "time_series" => Ok(DatabaseType::TimeSeries),
            "geospatial" => Ok(DatabaseType::Geospatial),
            "tabular" | "sql" => Ok(DatabaseType::Tabular),
            "olap" => Ok(DatabaseType::Olap),
            "blob" => Ok(DatabaseType::Blob),
            "fulltext" | "full_text" => Ok(DatabaseType::FullText),
            _ => Err(crate::utils::DbError::ValidationError(format!(
                "Unknown database type: {}",
                s
            ))),
        }
    }
}

/// Connection metadata
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ConnectionMetadata {
    pub host: String,
    pub port: u16,
    pub database: String,
    pub username: Option<String>,
    pub status: ConnectionStatus,
    pub server_version: Option<String>,
}

/// Connection status
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ConnectionStatus {
    Connected,
    Disconnected,
    Error,
    Connecting,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_app_state_creation() {
        let state = AppState::new();
        assert_eq!(state.connection_count(), 0);
    }

    #[test]
    fn test_connection_registration() {
        let state = AppState::new();
        let id = state.generate_connection_id();

        let handle = ConnectionHandle::new(
            id.clone(),
            "Test Connection".to_string(),
            DatabaseType::Tabular,
            ConnectionMetadata {
                host: "localhost".to_string(),
                port: 5432,
                database: "testdb".to_string(),
                username: Some("user".to_string()),
                status: ConnectionStatus::Connected,
                server_version: Some("14.0".to_string()),
            },
        );

        state.register_connection(id.clone(), handle).unwrap();
        assert_eq!(state.connection_count(), 1);

        let retrieved = state.get_connection(&id);
        assert!(retrieved.is_some());
    }

    #[test]
    fn test_connection_removal() {
        let state = AppState::new();
        let id = state.generate_connection_id();

        let handle = ConnectionHandle::new(
            id.clone(),
            "Test".to_string(),
            DatabaseType::Document,
            ConnectionMetadata {
                host: "localhost".to_string(),
                port: 27017,
                database: "test".to_string(),
                username: None,
                status: ConnectionStatus::Connected,
                server_version: None,
            },
        );

        state.register_connection(id.clone(), handle).unwrap();
        assert_eq!(state.connection_count(), 1);

        let removed = state.remove_connection(&id);
        assert!(removed.is_some());
        assert_eq!(state.connection_count(), 0);
    }

    #[test]
    fn test_database_type_from_str() {
        assert_eq!("document".parse::<DatabaseType>().unwrap(), DatabaseType::Document);
        assert_eq!("tabular".parse::<DatabaseType>().unwrap(), DatabaseType::Tabular);
        assert_eq!("sql".parse::<DatabaseType>().unwrap(), DatabaseType::Tabular);
        assert!("invalid".parse::<DatabaseType>().is_err());
    }

    #[test]
    fn test_connection_handle_touch() {
        let mut handle = ConnectionHandle::new(
            "test".to_string(),
            "Test".to_string(),
            DatabaseType::Tabular,
            ConnectionMetadata {
                host: "localhost".to_string(),
                port: 5432,
                database: "test".to_string(),
                username: None,
                status: ConnectionStatus::Connected,
                server_version: None,
            },
        );

        let original_time = handle.last_used;
        std::thread::sleep(std::time::Duration::from_millis(10));
        handle.touch();

        assert!(handle.last_used > original_time);
    }
}
