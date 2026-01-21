use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Request to upload a BLOB file
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UploadBlobRequest {
    pub connection_id: String,
    pub table_name: String,
    pub file_content: Vec<u8>,  // File content as bytes from browser
    pub filename: String,
    pub folder_path: Option<String>,
    pub content_type: String,
    pub metadata: Option<serde_json::Value>,
}

/// Response after successful BLOB upload
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UploadBlobResponse {
    pub id: String,
    pub sha1_hash: String,
    pub blob_url: String,  // /_blobs/<table>/<sha1>
    pub metadata_row_id: String,
}

/// Request to download a BLOB file
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadBlobRequest {
    pub connection_id: String,
    pub table_name: String,
    pub sha1_hash: String,
    pub destination_path: String,
}

/// Request to delete a BLOB file
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeleteBlobRequest {
    pub connection_id: String,
    pub table_name: String,
    pub sha1_hash: String,
    pub metadata_row_id: String,
}

/// Request to list BLOB files
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ListBlobsRequest {
    pub connection_id: String,
    pub table_name: String,
    pub folder_path: Option<String>,
    pub limit: Option<u32>,
    pub offset: Option<u32>,
}

/// BLOB metadata stored in shadow table
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlobMetadata {
    pub id: String,
    pub sha1_hash: String,
    pub filename: String,
    pub folder_path: Option<String>,
    pub file_size: i64,
    pub content_type: String,
    pub uploaded_at: DateTime<Utc>,
    pub uploaded_by: Option<String>,
    pub metadata: Option<serde_json::Value>,
}

/// File validation result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileValidationResult {
    pub valid: bool,
    pub file_size: u64,
    pub content_type: String,
    pub sha1_preview: String,
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
}
