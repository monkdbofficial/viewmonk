use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Saved query model
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SavedQuery {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub query: String,
    pub connection_id: Option<String>,
    pub folder: Option<String>,
    pub tags: Vec<String>,
    pub is_favorite: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub last_executed: Option<DateTime<Utc>>,
    pub execution_count: u64,
}

impl SavedQuery {
    /// Create a new saved query
    pub fn new(
        id: String,
        name: String,
        query: String,
        connection_id: Option<String>,
        folder: Option<String>,
        tags: Vec<String>,
    ) -> Self {
        let now = Utc::now();
        Self {
            id,
            name,
            description: None,
            query,
            connection_id,
            folder,
            tags,
            is_favorite: false,
            created_at: now,
            updated_at: now,
            last_executed: None,
            execution_count: 0,
        }
    }

    /// Update the last executed timestamp
    pub fn mark_executed(&mut self) {
        self.last_executed = Some(Utc::now());
        self.execution_count += 1;
    }

    /// Update the query content
    pub fn update(&mut self, query: String) {
        self.query = query;
        self.updated_at = Utc::now();
    }
}

/// Request to save a query
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SaveQueryRequest {
    pub name: String,
    pub description: Option<String>,
    pub query: String,
    pub connection_id: Option<String>,
    pub folder: Option<String>,
    pub tags: Vec<String>,
}

/// Request to update a saved query
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateQueryRequest {
    pub id: String,
    pub name: Option<String>,
    pub description: Option<String>,
    pub query: Option<String>,
    pub folder: Option<String>,
    pub tags: Option<Vec<String>>,
    pub is_favorite: Option<bool>,
}

/// Query filter for listing saved queries
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryFilter {
    pub connection_id: Option<String>,
    pub folder: Option<String>,
    pub tags: Option<Vec<String>>,
    pub search: Option<String>,
    pub favorites_only: bool,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_saved_query_creation() {
        let query = SavedQuery::new(
            "test-id".to_string(),
            "Test Query".to_string(),
            "SELECT * FROM users".to_string(),
            Some("conn-123".to_string()),
            Some("folder1".to_string()),
            vec!["analytics".to_string()],
        );

        assert_eq!(query.id, "test-id");
        assert_eq!(query.name, "Test Query");
        assert_eq!(query.execution_count, 0);
        assert!(!query.is_favorite);
    }

    #[test]
    fn test_mark_executed() {
        let mut query = SavedQuery::new(
            "test-id".to_string(),
            "Test Query".to_string(),
            "SELECT * FROM users".to_string(),
            None,
            None,
            vec![],
        );

        assert_eq!(query.execution_count, 0);
        assert!(query.last_executed.is_none());

        query.mark_executed();

        assert_eq!(query.execution_count, 1);
        assert!(query.last_executed.is_some());
    }

    #[test]
    fn test_update_query() {
        let mut query = SavedQuery::new(
            "test-id".to_string(),
            "Test Query".to_string(),
            "SELECT * FROM users".to_string(),
            None,
            None,
            vec![],
        );

        let original_updated_at = query.updated_at;
        std::thread::sleep(std::time::Duration::from_millis(10));

        query.update("SELECT * FROM products".to_string());

        assert_eq!(query.query, "SELECT * FROM products");
        assert!(query.updated_at > original_updated_at);
    }
}
