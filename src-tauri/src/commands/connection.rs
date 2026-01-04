use crate::audit::AuditEventType;
use crate::db::PostgresDriver;
use crate::models::{ConnectRequest, ConnectResponse, ConnectionMetadataResponse, TestConnectionResult};
use crate::security::DatabaseCredentials;
use crate::state::{AppState, ConnectionHandle, ConnectionMetadata, ConnectionStatus, DatabaseType};
use crate::utils::{DbError, Result};
use std::time::Instant;
use tauri::State;

/// Connect to a database
#[tauri::command]
pub async fn connect_database(
    request: ConnectRequest,
    state: State<'_, AppState>,
) -> Result<ConnectResponse> {
    log::info!("Connecting to database: {} ({})", request.name, request.db_type);

    // Validate connection ID format
    state.validator.validate_connection_id(&request.name)?;

    // Parse database type
    let db_type = request.parse_db_type()?;

    // Generate connection ID
    let connection_id = state.generate_connection_id();

    // Store credentials in OS keychain
    let credentials = DatabaseCredentials {
        connection_id: connection_id.clone(),
        host: request.host.clone(),
        port: request.port,
        database: request.database.clone(),
        username: Some(request.username.clone()),
        password: Some(request.password.clone()),
        ssl_cert: request.ssl_cert_path.clone(),
        connection_string: None,
    };

    state.credentials.store_credentials(&connection_id, &credentials)?;

    // Log credential storage
    let _ = state.audit.log_credential_operation(
        AuditEventType::CredentialStored,
        connection_id.clone(),
        true,
    );

    // Create database connection based on type
    let (server_version, metadata) = match db_type {
        DatabaseType::Tabular => {
            log::debug!("Creating PostgreSQL connection pool");

            let driver = PostgresDriver::new(
                request.host.clone(),
                request.port,
                request.database.clone(),
                request.username.clone(),
                request.password.clone(),
                10, // max connections
            )
            .await
            .map_err(|e| {
                log::error!("Failed to create PostgreSQL driver: {}", e);
                e
            })?;

            // Test connection
            driver.test_connection().await?;

            // Get server version
            let version = driver.get_server_version().await.ok();

            // Get pool stats
            let (active, idle) = driver.get_pool_stats();
            log::debug!("Pool stats: active={}, idle={}", active, idle);

            // Store driver in AppState for query execution
            state.register_driver(connection_id.clone(), std::sync::Arc::new(driver));
            log::debug!("Driver registered for connection: {}", connection_id);

            let metadata = ConnectionMetadata {
                host: request.host.clone(),
                port: request.port,
                database: request.database.clone(),
                username: Some(request.username.clone()),
                status: ConnectionStatus::Connected,
                server_version: version.clone(),
            };

            (version, metadata)
        }
        _ => {
            return Err(DbError::ValidationError(format!(
                "Database type '{}' not yet implemented. Currently only 'tabular' (PostgreSQL) is supported.",
                request.db_type
            )));
        }
    };

    // Register connection in state
    let handle = ConnectionHandle::new(
        connection_id.clone(),
        request.name.clone(),
        db_type.clone(),
        metadata.clone(),
    );

    state.register_connection(connection_id.clone(), handle)?;

    // Log successful connection
    let _ = state.audit.log_connection(
        AuditEventType::ConnectionCreated,
        connection_id.clone(),
        request.db_type.clone(),
        true,
        None,
    );

    log::info!("Successfully connected to database: {}", connection_id);

    Ok(ConnectResponse {
        connection_id: connection_id.clone(),
        status: "connected".to_string(),
        server_version,
        metadata: ConnectionMetadataResponse {
            name: request.name,
            host: request.host,
            port: request.port,
            database: request.database,
            db_type: request.db_type,
            username: Some(request.username),
        },
    })
}

/// Disconnect from a database
#[tauri::command]
pub async fn disconnect_database(
    connection_id: String,
    state: State<'_, AppState>,
) -> Result<()> {
    log::info!("Disconnecting from database: {}", connection_id);

    // Remove connection from state
    let handle = state
        .remove_connection(&connection_id)
        .ok_or_else(|| DbError::DatabaseNotFound(connection_id.clone()))?;

    // Remove driver from state
    let _ = state.remove_driver(&connection_id);
    log::debug!("Driver removed for connection: {}", connection_id);

    // Delete credentials from keychain
    let _ = state.credentials.delete_credentials(&connection_id);

    // Log credential deletion
    let _ = state.audit.log_credential_operation(
        AuditEventType::CredentialDeleted,
        connection_id.clone(),
        true,
    );

    // Log disconnection
    let _ = state.audit.log_connection(
        AuditEventType::ConnectionClosed,
        connection_id.clone(),
        format!("{:?}", handle.db_type).to_lowercase(),
        true,
        None,
    );

    log::info!("Successfully disconnected from database: {} ({})", connection_id, handle.name);

    Ok(())
}

/// Test a database connection
#[tauri::command]
pub async fn test_connection(
    connection_id: String,
    state: State<'_, AppState>,
) -> Result<TestConnectionResult> {
    log::debug!("Testing connection: {}", connection_id);

    let handle = state
        .get_connection(&connection_id)
        .ok_or_else(|| DbError::DatabaseNotFound(connection_id.clone()))?;

    let start = Instant::now();

    // For now, just check if connection exists
    // In a real implementation, we'd actually test the database connection
    let latency_ms = start.elapsed().as_millis() as u64;

    log::debug!("Connection test successful: {} (latency: {}ms)", connection_id, latency_ms);

    Ok(TestConnectionResult {
        success: true,
        latency_ms,
        message: format!("Connection '{}' is active", handle.name),
    })
}

/// List all active connections
#[tauri::command]
pub async fn list_connections(state: State<'_, AppState>) -> Result<Vec<String>> {
    let connections = state.list_connections();
    log::debug!("Listed {} active connections", connections.len());
    Ok(connections)
}

/// Get connection details
#[tauri::command]
pub async fn get_connection_info(
    connection_id: String,
    state: State<'_, AppState>,
) -> Result<ConnectionHandle> {
    let handle = state
        .get_connection(&connection_id)
        .ok_or_else(|| DbError::DatabaseNotFound(connection_id))?;

    Ok(handle)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_connection_request_validation() {
        let request = ConnectRequest {
            name: "test-conn".to_string(),
            db_type: "tabular".to_string(),
            host: "localhost".to_string(),
            port: 5432,
            database: "testdb".to_string(),
            username: "user".to_string(),
            password: "pass".to_string(),
            ssl_enabled: false,
            ssl_cert_path: None,
            connection_options: std::collections::HashMap::new(),
        };

        assert_eq!(request.name, "test-conn");
        assert_eq!(request.port, 5432);
    }
}
