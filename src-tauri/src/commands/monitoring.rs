use crate::audit::{AuditEvent, AuditEventType, AuditStatistics};
use crate::db::CacheStats;
use crate::monitoring::{AppMetrics, ConnectionPoolMetrics, QueryMetrics};
use crate::state::AppState;
use crate::utils::error::{DbError, Result};
use chrono::{DateTime, Utc};
use tauri::State;

/// Get recent query metrics
#[tauri::command]
pub async fn get_recent_queries(
    limit: usize,
    state: State<'_, AppState>,
) -> Result<Vec<QueryMetrics>> {
    log::debug!("Fetching {} recent queries", limit);

    let metrics = state.metrics.get_recent_queries(limit);

    Ok(metrics)
}

/// Get slow queries above a threshold
#[tauri::command]
pub async fn get_slow_queries(
    threshold_ms: u64,
    state: State<'_, AppState>,
) -> Result<Vec<QueryMetrics>> {
    log::debug!("Fetching slow queries (threshold: {}ms)", threshold_ms);

    let metrics = state.metrics.get_slow_queries(threshold_ms);

    log::info!("Found {} slow queries", metrics.len());

    Ok(metrics)
}

/// Get failed queries
#[tauri::command]
pub async fn get_failed_queries(state: State<'_, AppState>) -> Result<Vec<QueryMetrics>> {
    log::debug!("Fetching failed queries");

    let metrics = state.metrics.get_failed_queries();

    log::info!("Found {} failed queries", metrics.len());

    Ok(metrics)
}

/// Get queries for a specific connection
#[tauri::command]
pub async fn get_connection_queries(
    connection_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<QueryMetrics>> {
    log::debug!("Fetching queries for connection: {}", connection_id);

    // Validate connection exists
    if !state.connections.contains_key(&connection_id) {
        return Err(DbError::DatabaseNotFound(format!(
            "Connection {} not found",
            connection_id
        )));
    }

    let metrics = state.metrics.get_connection_queries(&connection_id);

    log::info!(
        "Found {} queries for connection {}",
        metrics.len(),
        connection_id
    );

    Ok(metrics)
}

/// Get connection pool history
#[tauri::command]
pub async fn get_pool_history(
    connection_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<ConnectionPoolMetrics>> {
    log::debug!("Fetching pool history for connection: {}", connection_id);

    // Validate connection exists
    if !state.connections.contains_key(&connection_id) {
        return Err(DbError::DatabaseNotFound(format!(
            "Connection {} not found",
            connection_id
        )));
    }

    let metrics = state.metrics.get_pool_history(&connection_id);

    log::info!(
        "Found {} pool snapshots for connection {}",
        metrics.len(),
        connection_id
    );

    Ok(metrics)
}

/// Get application-wide metrics
#[tauri::command]
pub async fn get_app_metrics(state: State<'_, AppState>) -> Result<AppMetrics> {
    log::debug!("Fetching application metrics");

    let active_connections = state.connections.len();
    let total_connections = state.connections.len(); // Could track historical count

    let metrics = state
        .metrics
        .get_app_metrics(active_connections, total_connections);

    log::debug!(
        "App metrics: {} total queries, {} active connections",
        metrics.total_queries,
        metrics.active_connections
    );

    Ok(metrics)
}

/// Clear all metrics
#[tauri::command]
pub async fn clear_metrics(state: State<'_, AppState>) -> Result<()> {
    log::warn!("Clearing all metrics");

    state.metrics.clear_all();

    Ok(())
}

/// Get query cache statistics
#[tauri::command]
pub async fn get_cache_stats(state: State<'_, AppState>) -> Result<CacheStats> {
    log::debug!("Fetching query cache statistics");

    let stats = state.query_cache.get_stats();

    log::debug!(
        "Cache stats: {:.2}% hit rate, {} cached queries",
        stats.hit_rate,
        stats.cache_size
    );

    Ok(stats)
}

/// Clear query cache
#[tauri::command]
pub async fn clear_cache(state: State<'_, AppState>) -> Result<()> {
    log::warn!("Clearing query cache");

    state.query_cache.clear();

    Ok(())
}

/// Get audit events with optional filters
#[tauri::command]
pub async fn get_audit_events(
    limit: Option<usize>,
    event_type: Option<String>,
    connection_id: Option<String>,
    since_timestamp: Option<String>,
    state: State<'_, AppState>,
) -> Result<Vec<AuditEvent>> {
    log::debug!("Fetching audit events");

    // Parse event type
    let parsed_event_type = if let Some(et_str) = event_type {
        Some(parse_event_type(&et_str)?)
    } else {
        None
    };

    // Parse timestamp
    let parsed_since = if let Some(ts) = since_timestamp {
        Some(
            DateTime::parse_from_rfc3339(&ts)
                .map_err(|e| DbError::ValidationError(format!("Invalid timestamp: {}", e)))?
                .with_timezone(&Utc),
        )
    } else {
        None
    };

    let events = state.audit.read_events(
        limit,
        parsed_event_type,
        connection_id,
        parsed_since,
    ).map_err(|e| DbError::InternalError(format!("Failed to read audit events: {}", e)))?;

    log::info!("Retrieved {} audit events", events.len());

    Ok(events)
}

/// Get audit statistics
#[tauri::command]
pub async fn get_audit_statistics(state: State<'_, AppState>) -> Result<AuditStatistics> {
    log::debug!("Fetching audit statistics");

    let stats = state.audit.get_statistics()
        .map_err(|e| DbError::InternalError(format!("Failed to get audit statistics: {}", e)))?;

    log::debug!(
        "Audit stats: {} total events, {} security violations",
        stats.total_events,
        stats.security_violations
    );

    Ok(stats)
}

/// Clear audit log (use with caution)
#[tauri::command]
pub async fn clear_audit_log(state: State<'_, AppState>) -> Result<()> {
    log::warn!("CLEARING AUDIT LOG - This action cannot be undone");

    state.audit.clear_log()
        .map_err(|e| DbError::InternalError(format!("Failed to clear audit log: {}", e)))?;

    // Log this action to the (now empty) audit log
    let _ = state.audit.log_event(crate::audit::AuditEvent::new(
        AuditEventType::SettingsChanged,
        None,
        None,
        "Audit log cleared".to_string(),
        true,
        None,
        serde_json::json!({"action": "clear_audit_log"}),
    ));

    Ok(())
}

/// Helper function to parse event type string
fn parse_event_type(event_type_str: &str) -> Result<AuditEventType> {
    match event_type_str.to_lowercase().as_str() {
        "connection_created" => Ok(AuditEventType::ConnectionCreated),
        "connection_closed" => Ok(AuditEventType::ConnectionClosed),
        "query_executed" => Ok(AuditEventType::QueryExecuted),
        "schema_accessed" => Ok(AuditEventType::SchemaAccessed),
        "credential_stored" => Ok(AuditEventType::CredentialStored),
        "credential_retrieved" => Ok(AuditEventType::CredentialRetrieved),
        "credential_deleted" => Ok(AuditEventType::CredentialDeleted),
        "settings_changed" => Ok(AuditEventType::SettingsChanged),
        "security_violation" => Ok(AuditEventType::SecurityViolation),
        _ => Err(DbError::ValidationError(format!(
            "Invalid event type: {}",
            event_type_str
        ))),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_event_type() {
        assert!(parse_event_type("connection_created").is_ok());
        assert!(parse_event_type("query_executed").is_ok());
        assert!(parse_event_type("invalid_type").is_err());
    }
}
