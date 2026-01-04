use crate::audit::AuditEventType;
use crate::blob::FileValidator;
use crate::models::{
    BlobMetadata, DeleteBlobRequest, DownloadBlobRequest, FileValidationResult, ListBlobsRequest,
    UploadBlobRequest, UploadBlobResponse,
};
use crate::state::AppState;
use crate::utils::{DbError, Result};
use chrono::Utc;
use std::fs::File;
use std::io::{Read, Write};
use tauri::State;
use uuid::Uuid;
use zip::write::{SimpleFileOptions, ZipWriter};

/// Validate a file before upload
#[tauri::command]
pub async fn validate_file(
    file_path: String,
    _state: State<'_, AppState>,
) -> Result<FileValidationResult> {
    log::info!("Validating file: {}", file_path);

    let validator = FileValidator::default();
    let result = validator.validate_file(&file_path)?;

    if !result.valid {
        log::warn!("File validation failed: {:?}", result.errors);
    }

    Ok(result)
}

/// Upload a BLOB file to MonkDB
#[tauri::command]
pub async fn upload_blob(
    request: UploadBlobRequest,
    state: State<'_, AppState>,
) -> Result<UploadBlobResponse> {
    log::info!(
        "Uploading BLOB to table '{}' for connection: {}",
        request.table_name,
        request.connection_id
    );

    // 1. Validate connection exists
    let connection = state
        .get_connection(&request.connection_id)
        .ok_or_else(|| DbError::DatabaseNotFound(request.connection_id.clone()))?;

    // 2. Validate file
    let validator = FileValidator::default();
    let validation_result = validator.validate_file(&request.file_path)?;

    if !validation_result.valid {
        return Err(DbError::ValidationError(format!(
            "File validation failed: {}",
            validation_result.errors.join(", ")
        )));
    }

    // 3. Calculate SHA-1 hash
    let sha1_hash = validation_result.sha1_preview;
    log::debug!("File SHA-1: {}", sha1_hash);

    // 4. Upload to MonkDB via HTTP API
    let blob_url = format!(
        "http://{}:{}/_blobs/{}/{}",
        connection.metadata.host,
        connection.metadata.port,
        request.table_name,
        sha1_hash
    );

    // Read file for upload
    let mut file = File::open(&request.file_path)
        .map_err(|e| DbError::ValidationError(format!("Failed to open file: {}", e)))?;

    let mut file_bytes = Vec::new();
    file.read_to_end(&mut file_bytes)
        .map_err(|e| DbError::ValidationError(format!("Failed to read file: {}", e)))?;

    // Create HTTP client
    let client = reqwest::Client::new();

    // Build request
    let req_builder = client
        .put(&blob_url)
        .header("Content-Type", &validation_result.content_type)
        .body(file_bytes);

    // TODO: Add authentication when security module is implemented
    // For now, MonkDB development instances typically don't require auth

    // Execute upload
    let response = req_builder
        .send()
        .await
        .map_err(|e| DbError::QueryFailed(format!("HTTP upload failed: {}", e)))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        return Err(DbError::QueryFailed(format!(
            "Upload failed with status {}: {}",
            status, error_text
        )));
    }

    log::info!("BLOB uploaded successfully: {}", sha1_hash);

    // 5. Insert metadata into shadow table
    let metadata_id = Uuid::new_v4().to_string();
    let metadata_table = format!("{}_blob_metadata", request.table_name);

    // Get driver for SQL execution
    let driver = state
        .get_driver(&request.connection_id)
        .ok_or_else(|| DbError::ValidationError(format!(
            "No driver found for connection: {}",
            request.connection_id
        )))?;

    // Execute metadata insert
    // Note: This is simplified - in production, use parameterized queries
    let insert_sql_formatted = format!(
        r#"INSERT INTO {} (id, sha1_hash, filename, folder_path, file_size, content_type, uploaded_at, uploaded_by, metadata)
           VALUES ('{}', '{}', '{}', {}, {}, '{}', CURRENT_TIMESTAMP, {}, {})"#,
        metadata_table,
        metadata_id,
        sha1_hash,
        request.filename.replace("'", "''"),
        request.folder_path.as_ref().map(|f| format!("'{}'", f.replace("'", "''"))).unwrap_or_else(|| "NULL".to_string()),
        validation_result.file_size,
        request.content_type.replace("'", "''"),
        "NULL".to_string(), // uploaded_by - TODO: get from session
        request.metadata.as_ref().map(|m| format!("'{}'::OBJECT", m.to_string().replace("'", "''"))).unwrap_or_else(|| "NULL".to_string())
    );

    driver.execute_query(&insert_sql_formatted).await?;

    // 6. Log audit event
    let _ = state.audit.log_event(crate::audit::AuditEvent::new(
        AuditEventType::QueryExecuted, // TODO: Add BlobUploaded event type
        Some(request.connection_id.clone()),
        Some(request.table_name.clone()),
        format!("BLOB uploaded: {}", request.filename),
        true,
        None,
        serde_json::json!({
            "sha1_hash": sha1_hash,
            "filename": request.filename,
            "file_size": validation_result.file_size,
            "content_type": validation_result.content_type,
        }),
    ));

    Ok(UploadBlobResponse {
        id: metadata_id.clone(),
        sha1_hash: sha1_hash.clone(),
        blob_url: format!("/_blobs/{}/{}", request.table_name, sha1_hash),
        metadata_row_id: metadata_id,
    })
}

/// Download a BLOB file from MonkDB
#[tauri::command]
pub async fn download_blob(
    request: DownloadBlobRequest,
    state: State<'_, AppState>,
) -> Result<String> {
    log::info!(
        "Downloading BLOB {} from table '{}' for connection: {}",
        request.sha1_hash,
        request.table_name,
        request.connection_id
    );

    // 1. Get connection
    let connection = state
        .get_connection(&request.connection_id)
        .ok_or_else(|| DbError::DatabaseNotFound(request.connection_id.clone()))?;

    // 2. Download from MonkDB via HTTP API
    let blob_url = format!(
        "http://{}:{}/_blobs/{}/{}",
        connection.metadata.host,
        connection.metadata.port,
        request.table_name,
        request.sha1_hash
    );

    let client = reqwest::Client::new();
    let req_builder = client.get(&blob_url);

    // TODO: Add authentication when security module is implemented

    // Execute download
    let response = req_builder
        .send()
        .await
        .map_err(|e| DbError::QueryFailed(format!("HTTP download failed: {}", e)))?;

    if !response.status().is_success() {
        let status = response.status();
        return Err(DbError::QueryFailed(format!(
            "Download failed with status {}",
            status
        )));
    }

    // Get response bytes
    let bytes = response
        .bytes()
        .await
        .map_err(|e| DbError::QueryFailed(format!("Failed to read response: {}", e)))?;

    // 3. Write to destination file
    let mut dest_file = File::create(&request.destination_path)
        .map_err(|e| DbError::ValidationError(format!("Failed to create file: {}", e)))?;

    dest_file
        .write_all(&bytes)
        .map_err(|e| DbError::ValidationError(format!("Failed to write file: {}", e)))?;

    // 4. Verify SHA-1 hash
    let validator = FileValidator::default();
    let downloaded_sha1 = validator.calculate_sha1(&request.destination_path)?;

    if downloaded_sha1 != request.sha1_hash {
        log::error!(
            "SHA-1 mismatch! Expected: {}, Got: {}",
            request.sha1_hash,
            downloaded_sha1
        );
        // Delete corrupted file
        std::fs::remove_file(&request.destination_path).ok();
        return Err(DbError::ValidationError(
            "Downloaded file SHA-1 mismatch - file may be corrupted".to_string(),
        ));
    }

    log::info!("BLOB downloaded successfully: {}", request.destination_path);

    // 5. Log audit event
    let _ = state.audit.log_event(crate::audit::AuditEvent::new(
        AuditEventType::QueryExecuted, // TODO: Add BlobDownloaded event type
        Some(request.connection_id.clone()),
        Some(request.table_name.clone()),
        format!("BLOB downloaded: {}", request.sha1_hash),
        true,
        None,
        serde_json::json!({
            "sha1_hash": request.sha1_hash,
            "destination": request.destination_path,
        }),
    ));

    Ok(request.destination_path)
}

/// Delete a BLOB file from MonkDB
#[tauri::command]
pub async fn delete_blob(
    request: DeleteBlobRequest,
    state: State<'_, AppState>,
) -> Result<()> {
    log::info!(
        "Deleting BLOB {} from table '{}' for connection: {}",
        request.sha1_hash,
        request.table_name,
        request.connection_id
    );

    // 1. Get connection and driver
    let connection = state
        .get_connection(&request.connection_id)
        .ok_or_else(|| DbError::DatabaseNotFound(request.connection_id.clone()))?;

    let driver = state
        .get_driver(&request.connection_id)
        .ok_or_else(|| DbError::ValidationError(format!(
            "No driver found for connection: {}",
            request.connection_id
        )))?;

    // 2. Delete metadata row first
    let metadata_table = format!("{}_blob_metadata", request.table_name);
    let delete_sql = format!(
        "DELETE FROM {} WHERE id = '{}'",
        metadata_table,
        request.metadata_row_id.replace("'", "''")
    );

    driver.execute_query(&delete_sql).await?;

    // 3. Delete BLOB via HTTP API
    let blob_url = format!(
        "http://{}:{}/_blobs/{}/{}",
        connection.metadata.host,
        connection.metadata.port,
        request.table_name,
        request.sha1_hash
    );

    let client = reqwest::Client::new();
    let req_builder = client.delete(&blob_url);

    // TODO: Add authentication when security module is implemented

    // Execute delete
    let response = req_builder
        .send()
        .await
        .map_err(|e| DbError::QueryFailed(format!("HTTP delete failed: {}", e)))?;

    if !response.status().is_success() {
        let status = response.status();
        log::warn!("BLOB delete returned status: {}", status);
        // Don't fail if BLOB already deleted, metadata is removed
    }

    log::info!("BLOB deleted successfully: {}", request.sha1_hash);

    // 4. Log audit event
    let _ = state.audit.log_event(crate::audit::AuditEvent::new(
        AuditEventType::QueryExecuted, // TODO: Add BlobDeleted event type
        Some(request.connection_id.clone()),
        Some(request.table_name.clone()),
        format!("BLOB deleted: {}", request.sha1_hash),
        true,
        None,
        serde_json::json!({
            "sha1_hash": request.sha1_hash,
        }),
    ));

    Ok(())
}

/// List BLOB files from metadata table
#[tauri::command]
pub async fn list_blobs(
    request: ListBlobsRequest,
    state: State<'_, AppState>,
) -> Result<Vec<BlobMetadata>> {
    log::info!(
        "Listing BLOBs from table '{}' for connection: {}",
        request.table_name,
        request.connection_id
    );

    // Get driver
    let driver = state
        .get_driver(&request.connection_id)
        .ok_or_else(|| DbError::ValidationError(format!(
            "No driver found for connection: {}",
            request.connection_id
        )))?;

    // Build query
    let metadata_table = format!("{}_blob_metadata", request.table_name);
    let mut sql = format!("SELECT * FROM {}", metadata_table);

    if let Some(folder) = &request.folder_path {
        sql.push_str(&format!(" WHERE folder_path = '{}'", folder.replace("'", "''")));
    }

    sql.push_str(" ORDER BY uploaded_at DESC");

    if let Some(limit) = request.limit {
        sql.push_str(&format!(" LIMIT {}", limit));
    }

    if let Some(offset) = request.offset {
        sql.push_str(&format!(" OFFSET {}", offset));
    }

    // Execute query
    let result = driver.execute_query(&sql).await?;

    // Parse results into BlobMetadata
    let mut blobs = Vec::new();
    for row in result.rows {
        // TODO: Proper parsing - this is simplified
        // In production, use proper column mapping
        blobs.push(BlobMetadata {
            id: row.get(0).and_then(|v| v.as_str()).unwrap_or("").to_string(),
            sha1_hash: row.get(1).and_then(|v| v.as_str()).unwrap_or("").to_string(),
            filename: row.get(2).and_then(|v| v.as_str()).unwrap_or("").to_string(),
            folder_path: row.get(3).and_then(|v| v.as_str()).map(|s| s.to_string()),
            file_size: row.get(4).and_then(|v| v.as_i64()).unwrap_or(0),
            content_type: row.get(5).and_then(|v| v.as_str()).unwrap_or("").to_string(),
            uploaded_at: Utc::now(), // TODO: Parse timestamp from row
            uploaded_by: row.get(7).and_then(|v| v.as_str()).map(|s| s.to_string()),
            metadata: row.get(8).cloned(),
        });
    }

    Ok(blobs)
}

/// Create BLOB metadata table if it doesn't exist
#[tauri::command]
pub async fn create_blob_metadata_table(
    connection_id: String,
    table_name: String,
    state: State<'_, AppState>,
) -> Result<()> {
    log::info!(
        "Creating BLOB metadata table for '{}' on connection: {}",
        table_name,
        connection_id
    );

    // Get driver
    let driver = state
        .get_driver(&connection_id)
        .ok_or_else(|| DbError::ValidationError(format!(
            "No driver found for connection: {}",
            connection_id
        )))?;

    // Create metadata table SQL
    let metadata_table = format!("{}_blob_metadata", table_name);
    let create_sql = format!(
        r#"CREATE TABLE IF NOT EXISTS {} (
            id TEXT PRIMARY KEY,
            sha1_hash TEXT NOT NULL,
            filename TEXT NOT NULL,
            folder_path TEXT,
            file_size BIGINT NOT NULL,
            content_type TEXT NOT NULL,
            uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            uploaded_by TEXT,
            metadata OBJECT
        )"#,
        metadata_table
    );

    driver.execute_query(&create_sql).await?;

    log::info!("BLOB metadata table created: {}", metadata_table);

    Ok(())
}

/// Download multiple BLOBs as a ZIP archive
#[tauri::command]
pub async fn download_blobs_as_zip(
    connection_id: String,
    table_name: String,
    blobs: Vec<BlobMetadata>,
    state: State<'_, AppState>,
) -> Result<String> {
    log::info!(
        "Creating ZIP archive of {} BLOBs from table '{}' for connection: {}",
        blobs.len(),
        table_name,
        connection_id
    );

    if blobs.is_empty() {
        return Err(DbError::ValidationError("No blobs selected for download".to_string()));
    }

    // Get connection
    let connection = state
        .get_connection(&connection_id)
        .ok_or_else(|| DbError::DatabaseNotFound(connection_id.clone()))?;

    // Create temporary ZIP file
    let temp_dir = std::env::temp_dir();
    let zip_filename = format!("monkdb_blobs_{}_{}.zip", table_name, Utc::now().timestamp());
    let zip_path = temp_dir.join(&zip_filename);

    let zip_file = File::create(&zip_path)
        .map_err(|e| DbError::ValidationError(format!("Failed to create ZIP file: {}", e)))?;

    let mut zip = ZipWriter::new(zip_file);
    let options = SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);

    // Download each BLOB and add to ZIP
    let client = reqwest::Client::new();
    for blob in &blobs {
        log::debug!("Adding {} to ZIP archive", blob.filename);

        // Download BLOB from MonkDB
        let blob_url = format!(
            "http://{}:{}/_blobs/{}/{}",
            connection.metadata.host,
            connection.metadata.port,
            table_name,
            blob.sha1_hash
        );

        let response = client
            .get(&blob_url)
            .send()
            .await
            .map_err(|e| DbError::QueryFailed(format!("Failed to download BLOB {}: {}", blob.filename, e)))?;

        if !response.status().is_success() {
            log::warn!("Failed to download BLOB {} with status: {}", blob.filename, response.status());
            continue; // Skip this file and continue with others
        }

        let bytes = response
            .bytes()
            .await
            .map_err(|e| DbError::QueryFailed(format!("Failed to read BLOB data for {}: {}", blob.filename, e)))?;

        // Add file to ZIP with folder structure if present
        let zip_path_in_archive = if let Some(folder) = &blob.folder_path {
            format!("{}/{}", folder, blob.filename)
        } else {
            blob.filename.clone()
        };

        zip.start_file(zip_path_in_archive, options)
            .map_err(|e| DbError::ValidationError(format!("Failed to start ZIP file entry: {}", e)))?;

        zip.write_all(&bytes)
            .map_err(|e| DbError::ValidationError(format!("Failed to write to ZIP: {}", e)))?;
    }

    // Finalize ZIP
    zip.finish()
        .map_err(|e| DbError::ValidationError(format!("Failed to finalize ZIP: {}", e)))?;

    let zip_path_str = zip_path
        .to_str()
        .ok_or_else(|| DbError::ValidationError("Invalid ZIP path".to_string()))?
        .to_string();

    log::info!("ZIP archive created successfully: {}", zip_path_str);

    // Log audit event
    let _ = state.audit.log_event(crate::audit::AuditEvent::new(
        AuditEventType::QueryExecuted, // TODO: Add BlobBatchDownloaded event type
        Some(connection_id),
        Some(table_name),
        format!("Downloaded {} BLOBs as ZIP archive", blobs.len()),
        true,
        None,
        serde_json::json!({
            "blob_count": blobs.len(),
            "zip_path": zip_path_str,
        }),
    ));

    Ok(zip_path_str)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_metadata_table_name() {
        let table_name = "my_blobs";
        let metadata_table = format!("{}_blob_metadata", table_name);
        assert_eq!(metadata_table, "my_blobs_blob_metadata");
    }
}
