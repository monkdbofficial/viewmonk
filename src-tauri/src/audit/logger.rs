use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::PathBuf;
use std::sync::Arc;
use parking_lot::Mutex;

/// Audit event types
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum AuditEventType {
    ConnectionCreated,
    ConnectionClosed,
    QueryExecuted,
    SchemaAccessed,
    CredentialStored,
    CredentialRetrieved,
    CredentialDeleted,
    SettingsChanged,
    SecurityViolation,
}

impl std::fmt::Display for AuditEventType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AuditEventType::ConnectionCreated => write!(f, "ConnectionCreated"),
            AuditEventType::ConnectionClosed => write!(f, "ConnectionClosed"),
            AuditEventType::QueryExecuted => write!(f, "QueryExecuted"),
            AuditEventType::SchemaAccessed => write!(f, "SchemaAccessed"),
            AuditEventType::CredentialStored => write!(f, "CredentialStored"),
            AuditEventType::CredentialRetrieved => write!(f, "CredentialRetrieved"),
            AuditEventType::CredentialDeleted => write!(f, "CredentialDeleted"),
            AuditEventType::SettingsChanged => write!(f, "SettingsChanged"),
            AuditEventType::SecurityViolation => write!(f, "SecurityViolation"),
        }
    }
}

/// Audit event representing a logged action
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditEvent {
    pub event_id: String,
    pub event_type: AuditEventType,
    pub timestamp: DateTime<Utc>,
    pub connection_id: Option<String>,
    pub database_type: Option<String>,
    pub user_action: String,
    pub success: bool,
    pub error_message: Option<String>,
    pub metadata: serde_json::Value,
}

impl AuditEvent {
    /// Create a new audit event
    pub fn new(
        event_type: AuditEventType,
        connection_id: Option<String>,
        database_type: Option<String>,
        user_action: String,
        success: bool,
        error_message: Option<String>,
        metadata: serde_json::Value,
    ) -> Self {
        Self {
            event_id: uuid::Uuid::new_v4().to_string(),
            event_type,
            timestamp: Utc::now(),
            connection_id,
            database_type,
            user_action,
            success,
            error_message,
            metadata,
        }
    }
}

/// Audit logger for tracking all database operations
pub struct AuditLogger {
    file_path: PathBuf,
    file_handle: Arc<Mutex<Option<std::fs::File>>>,
}

impl AuditLogger {
    /// Create a new audit logger
    pub fn new(audit_dir: PathBuf) -> Result<Self, Box<dyn std::error::Error>> {
        // Create audit directory if it doesn't exist
        fs::create_dir_all(&audit_dir)?;

        let file_path = audit_dir.join("audit.jsonl");

        // Open file in append mode
        let file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&file_path)?;

        log::info!("Audit logger initialized: {}", file_path.display());

        Ok(Self {
            file_path: file_path.clone(),
            file_handle: Arc::new(Mutex::new(Some(file))),
        })
    }

    /// Log an audit event
    pub fn log_event(&self, event: AuditEvent) -> Result<(), Box<dyn std::error::Error>> {
        let mut file_guard = self.file_handle.lock();

        if let Some(ref mut file) = *file_guard {
            // Serialize event to JSON
            let json = serde_json::to_string(&event)?;

            // Write to file with newline (JSONL format)
            writeln!(file, "{}", json)?;

            // Flush to ensure data is written immediately
            file.flush()?;

            log::debug!(
                "Audit event logged: {} - {}",
                event.event_type,
                event.user_action
            );
        }

        Ok(())
    }

    /// Log a connection event
    pub fn log_connection(
        &self,
        event_type: AuditEventType,
        connection_id: String,
        database_type: String,
        success: bool,
        error_message: Option<String>,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let action = match event_type {
            AuditEventType::ConnectionCreated => "Database connection established",
            AuditEventType::ConnectionClosed => "Database connection closed",
            _ => "Connection event",
        };

        let event = AuditEvent::new(
            event_type,
            Some(connection_id.clone()),
            Some(database_type.clone()),
            action.to_string(),
            success,
            error_message,
            serde_json::json!({
                "connection_id": connection_id,
                "database_type": database_type,
            }),
        );

        self.log_event(event)
    }

    /// Log a query execution
    pub fn log_query(
        &self,
        connection_id: String,
        query_hash: String,
        execution_time_ms: u64,
        row_count: usize,
        success: bool,
        error_message: Option<String>,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let event = AuditEvent::new(
            AuditEventType::QueryExecuted,
            Some(connection_id.clone()),
            None,
            "Query executed".to_string(),
            success,
            error_message,
            serde_json::json!({
                "query_hash": query_hash,
                "execution_time_ms": execution_time_ms,
                "row_count": row_count,
            }),
        );

        self.log_event(event)
    }

    /// Log schema access
    pub fn log_schema_access(
        &self,
        connection_id: String,
        success: bool,
        error_message: Option<String>,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let event = AuditEvent::new(
            AuditEventType::SchemaAccessed,
            Some(connection_id.clone()),
            None,
            "Schema information accessed".to_string(),
            success,
            error_message,
            serde_json::json!({
                "connection_id": connection_id,
            }),
        );

        self.log_event(event)
    }

    /// Log credential operations
    pub fn log_credential_operation(
        &self,
        event_type: AuditEventType,
        connection_id: String,
        success: bool,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let action = match event_type {
            AuditEventType::CredentialStored => "Credentials stored in OS keychain",
            AuditEventType::CredentialRetrieved => "Credentials retrieved from OS keychain",
            AuditEventType::CredentialDeleted => "Credentials deleted from OS keychain",
            _ => "Credential operation",
        };

        let event = AuditEvent::new(
            event_type,
            Some(connection_id.clone()),
            None,
            action.to_string(),
            success,
            None,
            serde_json::json!({
                "connection_id": connection_id,
            }),
        );

        self.log_event(event)
    }

    /// Log security violations
    pub fn log_security_violation(
        &self,
        violation_type: String,
        details: String,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let event = AuditEvent::new(
            AuditEventType::SecurityViolation,
            None,
            None,
            format!("Security violation: {}", violation_type),
            false,
            Some(details.clone()),
            serde_json::json!({
                "violation_type": violation_type,
                "details": details,
            }),
        );

        self.log_event(event)?;

        // Also log as error
        log::error!("SECURITY VIOLATION: {} - {}", violation_type, details);

        Ok(())
    }

    /// Read audit events with optional filters
    pub fn read_events(
        &self,
        limit: Option<usize>,
        event_type: Option<AuditEventType>,
        connection_id: Option<String>,
        since: Option<DateTime<Utc>>,
    ) -> Result<Vec<AuditEvent>, Box<dyn std::error::Error>> {
        let contents = fs::read_to_string(&self.file_path)?;

        let mut events: Vec<AuditEvent> = contents
            .lines()
            .filter_map(|line| serde_json::from_str(line).ok())
            .collect();

        // Apply filters
        if let Some(et) = event_type {
            events.retain(|e| e.event_type == et);
        }

        if let Some(cid) = connection_id {
            events.retain(|e| e.connection_id.as_ref() == Some(&cid));
        }

        if let Some(since_time) = since {
            events.retain(|e| e.timestamp >= since_time);
        }

        // Sort by timestamp (most recent first)
        events.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));

        // Apply limit
        if let Some(limit_count) = limit {
            events.truncate(limit_count);
        }

        Ok(events)
    }

    /// Get audit statistics
    pub fn get_statistics(&self) -> Result<AuditStatistics, Box<dyn std::error::Error>> {
        let events = self.read_events(None, None, None, None)?;

        let total_events = events.len();
        let successful_events = events.iter().filter(|e| e.success).count();
        let failed_events = total_events - successful_events;

        let connections_created = events
            .iter()
            .filter(|e| e.event_type == AuditEventType::ConnectionCreated)
            .count();

        let queries_executed = events
            .iter()
            .filter(|e| e.event_type == AuditEventType::QueryExecuted)
            .count();

        let security_violations = events
            .iter()
            .filter(|e| e.event_type == AuditEventType::SecurityViolation)
            .count();

        Ok(AuditStatistics {
            total_events,
            successful_events,
            failed_events,
            connections_created,
            queries_executed,
            security_violations,
        })
    }

    /// Clear audit log (use with caution)
    pub fn clear_log(&self) -> Result<(), Box<dyn std::error::Error>> {
        // Close current file handle
        {
            let mut file_guard = self.file_handle.lock();
            *file_guard = None;
        }

        // Truncate file
        fs::write(&self.file_path, "")?;

        // Reopen file
        let file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&self.file_path)?;

        {
            let mut file_guard = self.file_handle.lock();
            *file_guard = Some(file);
        }

        log::warn!("Audit log cleared");

        Ok(())
    }
}

/// Audit statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditStatistics {
    pub total_events: usize,
    pub successful_events: usize,
    pub failed_events: usize,
    pub connections_created: usize,
    pub queries_executed: usize,
    pub security_violations: usize,
}

/// Get audit directory path
pub fn get_audit_dir() -> Result<PathBuf, Box<dyn std::error::Error>> {
    let app_dir = dirs::data_local_dir()
        .ok_or("Could not determine local data directory")?
        .join("MonkDB Workbench")
        .join("audit");

    Ok(app_dir)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;

    #[test]
    fn test_audit_event_creation() {
        let event = AuditEvent::new(
            AuditEventType::QueryExecuted,
            Some("conn-1".to_string()),
            Some("tabular".to_string()),
            "Test query".to_string(),
            true,
            None,
            serde_json::json!({"test": "data"}),
        );

        assert_eq!(event.event_type, AuditEventType::QueryExecuted);
        assert_eq!(event.connection_id, Some("conn-1".to_string()));
        assert!(event.success);
    }

    #[test]
    fn test_audit_logger_creation() {
        let temp_dir = env::temp_dir().join("test-monkdb-audit");

        if temp_dir.exists() {
            fs::remove_dir_all(&temp_dir).ok();
        }

        let logger = AuditLogger::new(temp_dir.clone());
        assert!(logger.is_ok());

        // Cleanup
        fs::remove_dir_all(&temp_dir).ok();
    }

    #[test]
    fn test_log_event() {
        let temp_dir = env::temp_dir().join("test-monkdb-audit-events");

        if temp_dir.exists() {
            fs::remove_dir_all(&temp_dir).ok();
        }

        let logger = AuditLogger::new(temp_dir.clone()).unwrap();

        let event = AuditEvent::new(
            AuditEventType::ConnectionCreated,
            Some("test-conn".to_string()),
            Some("tabular".to_string()),
            "Test connection".to_string(),
            true,
            None,
            serde_json::json!({"host": "localhost"}),
        );

        let result = logger.log_event(event);
        assert!(result.is_ok());

        // Cleanup
        fs::remove_dir_all(&temp_dir).ok();
    }

    #[test]
    fn test_read_events() {
        let temp_dir = env::temp_dir().join("test-monkdb-audit-read");

        if temp_dir.exists() {
            fs::remove_dir_all(&temp_dir).ok();
        }

        let logger = AuditLogger::new(temp_dir.clone()).unwrap();

        // Log multiple events
        logger
            .log_connection(
                AuditEventType::ConnectionCreated,
                "conn-1".to_string(),
                "tabular".to_string(),
                true,
                None,
            )
            .unwrap();

        logger
            .log_query("conn-1".to_string(), "hash1".to_string(), 100, 10, true, None)
            .unwrap();

        // Read events
        let events = logger.read_events(None, None, None, None).unwrap();
        assert_eq!(events.len(), 2);

        // Filter by event type
        let connections = logger
            .read_events(None, Some(AuditEventType::ConnectionCreated), None, None)
            .unwrap();
        assert_eq!(connections.len(), 1);

        // Cleanup
        fs::remove_dir_all(&temp_dir).ok();
    }
}
