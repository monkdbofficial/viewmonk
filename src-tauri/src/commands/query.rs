use crate::db::QueryCache;
use crate::models::{QueryRequest, QueryResponse};
use crate::monitoring::{hash_query, QueryMetrics};
use crate::state::AppState;
use crate::utils::{DbError, Result};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::time::Instant;
use tauri::State;
use uuid::Uuid;

/// Execute a database query
#[tauri::command]
pub async fn execute_query(
    request: QueryRequest,
    state: State<'_, AppState>,
) -> Result<QueryResponse> {
    log::info!("Executing query on connection: {}", request.connection_id);
    log::debug!("Query: {}", request.query);

    // Get connection
    let handle = state
        .get_connection(&request.connection_id)
        .ok_or_else(|| DbError::DatabaseNotFound(request.connection_id.clone()))?;

    // Validate query
    state.validator.validate_query(&request.query)?;

    // Check rate limit
    state.validator.check_rate_limit(&request.connection_id)?;

    // Start timing query execution
    let start_time = Instant::now();
    let query_id = Uuid::new_v4().to_string();
    let query_hash = hash_query(&request.query);

    // Generate cache key
    let cache_key = QueryCache::generate_key(&request.query, &request.connection_id);

    // Check cache first (only for SELECT queries)
    if request.query.trim().to_uppercase().starts_with("SELECT") {
        if let Some(cached_response) = state.query_cache.get(&cache_key) {
            log::info!(
                "Cache HIT for query on '{}': {} rows (cached)",
                handle.name,
                cached_response.row_count
            );

            // Still record metrics for cache hits
            let metrics = QueryMetrics {
                query_id: query_id.clone(),
                connection_id: request.connection_id.clone(),
                query_hash: query_hash.clone(),
                execution_time_ms: 0, // Cache hit is instant
                rows_scanned: cached_response.scanned_rows,
                rows_returned: cached_response.row_count as u64,
                index_used: cached_response.index_used.clone(),
                timestamp: Utc::now(),
                success: true,
                error_message: None,
            };

            state.metrics.record_query(metrics);

            return Ok(cached_response);
        }
    }

    // Get the database driver for this connection
    let driver = state
        .get_driver(&request.connection_id)
        .ok_or_else(|| {
            DbError::ValidationError(format!(
                "No driver found for connection: {}",
                request.connection_id
            ))
        })?;

    // Execute query using the PostgreSQL driver
    let mut response = driver.execute_query(&request.query).await?;

    // Calculate total execution time (including validation, rate limit, etc.)
    let execution_time_ms = start_time.elapsed().as_millis() as u64;

    // Update response with total execution time
    response.execution_time_ms = execution_time_ms;

    // Cache the result if it's a SELECT query
    if request.query.trim().to_uppercase().starts_with("SELECT") {
        state.query_cache.put(cache_key, response.clone());
        log::debug!("Cached query result for connection: {}", request.connection_id);
    }

    // Record query metrics
    let metrics = QueryMetrics {
        query_id: query_id.clone(),
        connection_id: request.connection_id.clone(),
        query_hash: query_hash.clone(),
        execution_time_ms,
        rows_scanned: response.scanned_rows,
        rows_returned: response.row_count as u64,
        index_used: response.index_used.clone(),
        timestamp: Utc::now(),
        success: true,
        error_message: None,
    };

    state.metrics.record_query(metrics);

    // Log query execution to audit trail
    let _ = state.audit.log_query(
        request.connection_id.clone(),
        query_hash,
        execution_time_ms,
        response.row_count,
        true,
        None,
    );

    log::info!(
        "Query executed successfully on '{}': {} rows in {}ms",
        handle.name,
        response.row_count,
        execution_time_ms
    );

    Ok(response)
}

/// MonkDB SQL HTTP response format
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MonkDBSQLResponse {
    pub cols: Vec<String>,
    pub rows: Vec<Vec<serde_json::Value>>,
    pub rowcount: i64,
    pub duration: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<MonkDBError>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MonkDBError {
    pub message: String,
    pub code: i32,
}

/// Execute a direct HTTP query to MonkDB (for desktop app)
/// This bypasses CORS restrictions by making the HTTP request from Rust
#[tauri::command]
pub async fn execute_monkdb_http_query(
    host: String,
    port: u16,
    username: String,
    password: String,
    stmt: String,
    args: Vec<serde_json::Value>,
) -> Result<MonkDBSQLResponse> {
    log::info!("Executing MonkDB HTTP query to {}:{}", host, port);
    log::debug!("Query: {}", stmt);

    let url = format!("http://{}:{}/_sql", host, port);
    let client = reqwest::Client::new();

    let mut request_body = serde_json::json!({
        "stmt": stmt,
    });

    // Add args if provided
    if !args.is_empty() {
        request_body["args"] = serde_json::json!(args);
    }

    let mut request_builder = client
        .post(&url)
        .header("Content-Type", "application/json")
        .json(&request_body);

    // Add basic auth if credentials provided
    if !username.is_empty() && !password.is_empty() {
        request_builder = request_builder.basic_auth(username, Some(password));
    }

    let start = Instant::now();
    let response = request_builder
        .send()
        .await
        .map_err(|e| DbError::QueryFailed(format!("HTTP request failed: {}", e)))?;

    let status = response.status();
    let response_text: String = response
        .text()
        .await
        .map_err(|e| DbError::QueryFailed(format!("Failed to read response: {}", e)))?;

    if !status.is_success() {
        log::error!("MonkDB HTTP error {}: {}", status, response_text);
        return Err(DbError::QueryFailed(format!(
            "HTTP {}: {}",
            status, response_text
        )));
    }

    let monkdb_response: MonkDBSQLResponse = serde_json::from_str(&response_text)
        .map_err(|e| DbError::QueryFailed(format!("Failed to parse MonkDB response: {}", e)))?;

    if let Some(error) = &monkdb_response.error {
        log::error!("MonkDB query error [{}]: {}", error.code, error.message);
        return Err(DbError::QueryFailed(format!(
            "MonkDB Error [{}]: {}",
            error.code, error.message
        )));
    }

    let duration = start.elapsed().as_secs_f64();
    log::info!(
        "MonkDB query executed successfully: {} rows in {:.3}s",
        monkdb_response.rowcount,
        duration
    );

    Ok(monkdb_response)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_query_request_structure() {
        let request = QueryRequest {
            connection_id: "test-123".to_string(),
            query: "SELECT * FROM users".to_string(),
            collection: None,
            limit: Some(100),
            offset: None,
        };

        assert_eq!(request.connection_id, "test-123");
        assert!(request.query.contains("SELECT"));
    }
}
