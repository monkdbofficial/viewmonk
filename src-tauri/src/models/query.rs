use serde::{Deserialize, Serialize};

/// Request to execute a query
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryRequest {
    pub connection_id: String,
    pub query: String,
    pub collection: Option<String>, // For NoSQL databases
    pub limit: Option<u32>,
    pub offset: Option<u32>,
}

/// Response from executing a query
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryResponse {
    pub columns: Vec<ColumnInfo>,
    pub rows: Vec<Vec<serde_json::Value>>,
    pub row_count: usize,
    pub execution_time_ms: u64,
    pub scanned_rows: Option<u64>,
    pub index_used: Option<String>,
}

/// Column information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ColumnInfo {
    pub name: String,
    pub data_type: String,
    pub nullable: bool,
}

/// Schema information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SchemaInfo {
    pub databases: Vec<DatabaseInfo>,
}

/// Database information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseInfo {
    pub name: String,
    pub tables: Vec<TableInfo>,
    pub size_bytes: Option<u64>,
}

/// Table/Collection information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TableInfo {
    pub name: String,
    pub row_count: Option<u64>,
    pub columns: Vec<ColumnInfo>,
    pub indexes: Vec<IndexInfo>,
}

/// Index information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IndexInfo {
    pub name: String,
    pub columns: Vec<String>,
    pub unique: bool,
    pub index_type: String,
}

impl QueryResponse {
    /// Create a new empty query response
    pub fn empty() -> Self {
        Self {
            columns: Vec::new(),
            rows: Vec::new(),
            row_count: 0,
            execution_time_ms: 0,
            scanned_rows: None,
            index_used: None,
        }
    }

    /// Create a new query response with execution time
    pub fn new(execution_time_ms: u64) -> Self {
        Self {
            columns: Vec::new(),
            rows: Vec::new(),
            row_count: 0,
            execution_time_ms,
            scanned_rows: None,
            index_used: None,
        }
    }
}

impl ColumnInfo {
    /// Create a new column info
    pub fn new(name: impl Into<String>, data_type: impl Into<String>, nullable: bool) -> Self {
        Self {
            name: name.into(),
            data_type: data_type.into(),
            nullable,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_query_response_empty() {
        let response = QueryResponse::empty();
        assert_eq!(response.row_count, 0);
        assert_eq!(response.columns.len(), 0);
        assert_eq!(response.execution_time_ms, 0);
    }

    #[test]
    fn test_column_info_creation() {
        let col = ColumnInfo::new("id", "integer", false);
        assert_eq!(col.name, "id");
        assert_eq!(col.data_type, "integer");
        assert!(!col.nullable);
    }

    #[test]
    fn test_query_request_serialization() {
        let req = QueryRequest {
            connection_id: "test-123".to_string(),
            query: "SELECT * FROM users".to_string(),
            collection: None,
            limit: Some(100),
            offset: Some(0),
        };

        let json = serde_json::to_string(&req).unwrap();
        assert!(json.contains("SELECT"));
        assert!(json.contains("test-123"));
    }
}
