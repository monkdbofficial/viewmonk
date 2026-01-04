use chrono::{DateTime, Utc};
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;

/// Query performance metrics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryMetrics {
    pub query_id: String,
    pub connection_id: String,
    pub query_hash: String,
    pub execution_time_ms: u64,
    pub rows_scanned: Option<u64>,
    pub rows_returned: u64,
    pub index_used: Option<String>,
    pub timestamp: DateTime<Utc>,
    pub success: bool,
    pub error_message: Option<String>,
}

/// Connection pool metrics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionPoolMetrics {
    pub connection_id: String,
    pub active_connections: u32,
    pub idle_connections: u32,
    pub max_connections: u32,
    pub wait_count: u64,
    pub total_wait_time_ms: u64,
    pub timestamp: DateTime<Utc>,
}

/// Application performance metrics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppMetrics {
    pub total_queries: u64,
    pub successful_queries: u64,
    pub failed_queries: u64,
    pub avg_query_time_ms: f64,
    pub active_connections: usize,
    pub total_connections: usize,
    pub uptime_seconds: u64,
}

/// Metrics collector for tracking application performance
pub struct MetricsCollector {
    query_metrics: Arc<RwLock<Vec<QueryMetrics>>>,
    pool_metrics: Arc<RwLock<HashMap<String, Vec<ConnectionPoolMetrics>>>>,
    max_query_history: usize,
    max_pool_history: usize,
    start_time: DateTime<Utc>,
}

impl MetricsCollector {
    /// Create a new metrics collector
    pub fn new() -> Self {
        Self {
            query_metrics: Arc::new(RwLock::new(Vec::new())),
            pool_metrics: Arc::new(RwLock::new(HashMap::new())),
            max_query_history: 10_000,
            max_pool_history: 1_000,
            start_time: Utc::now(),
        }
    }

    /// Record a query execution
    pub fn record_query(&self, metrics: QueryMetrics) {
        let mut queries = self.query_metrics.write();

        queries.push(metrics.clone());

        // Keep only last N queries
        if queries.len() > self.max_query_history {
            let drain_count = queries.len() - self.max_query_history;
            queries.drain(0..drain_count);
        }

        // Log slow queries (>1 second)
        if metrics.execution_time_ms > 1000 {
            log::warn!(
                "Slow query detected: {}ms - {}",
                metrics.execution_time_ms,
                metrics.query_hash
            );
        }
    }

    /// Record connection pool metrics
    pub fn record_pool_metrics(&self, metrics: ConnectionPoolMetrics) {
        let mut pools = self.pool_metrics.write();

        let history = pools
            .entry(metrics.connection_id.clone())
            .or_insert_with(Vec::new);

        history.push(metrics);

        // Keep only last N pool snapshots
        if history.len() > self.max_pool_history {
            history.drain(0..history.len() - self.max_pool_history);
        }
    }

    /// Get recent query metrics
    pub fn get_recent_queries(&self, limit: usize) -> Vec<QueryMetrics> {
        let queries = self.query_metrics.read();
        queries
            .iter()
            .rev()
            .take(limit)
            .cloned()
            .collect()
    }

    /// Get slow queries (execution time > threshold)
    pub fn get_slow_queries(&self, threshold_ms: u64) -> Vec<QueryMetrics> {
        let queries = self.query_metrics.read();
        queries
            .iter()
            .filter(|q| q.execution_time_ms > threshold_ms)
            .cloned()
            .collect()
    }

    /// Get failed queries
    pub fn get_failed_queries(&self) -> Vec<QueryMetrics> {
        let queries = self.query_metrics.read();
        queries
            .iter()
            .filter(|q| !q.success)
            .cloned()
            .collect()
    }

    /// Get queries for a specific connection
    pub fn get_connection_queries(&self, connection_id: &str) -> Vec<QueryMetrics> {
        let queries = self.query_metrics.read();
        queries
            .iter()
            .filter(|q| q.connection_id == connection_id)
            .cloned()
            .collect()
    }

    /// Get pool metrics history for a connection
    pub fn get_pool_history(&self, connection_id: &str) -> Vec<ConnectionPoolMetrics> {
        let pools = self.pool_metrics.read();
        pools
            .get(connection_id)
            .map(|history| history.clone())
            .unwrap_or_default()
    }

    /// Get application-wide metrics
    pub fn get_app_metrics(&self, active_connections: usize, total_connections: usize) -> AppMetrics {
        let queries = self.query_metrics.read();

        let total_queries = queries.len() as u64;
        let successful_queries = queries.iter().filter(|q| q.success).count() as u64;
        let failed_queries = total_queries - successful_queries;

        let avg_query_time_ms = if !queries.is_empty() {
            queries.iter().map(|q| q.execution_time_ms).sum::<u64>() as f64
                / queries.len() as f64
        } else {
            0.0
        };

        let uptime_seconds = (Utc::now() - self.start_time).num_seconds() as u64;

        AppMetrics {
            total_queries,
            successful_queries,
            failed_queries,
            avg_query_time_ms,
            active_connections,
            total_connections,
            uptime_seconds,
        }
    }

    /// Clear all metrics
    pub fn clear_all(&self) {
        self.query_metrics.write().clear();
        self.pool_metrics.write().clear();
    }

    /// Clear metrics for a specific connection
    pub fn clear_connection_metrics(&self, connection_id: &str) {
        let mut queries = self.query_metrics.write();
        queries.retain(|q| q.connection_id != connection_id);

        let mut pools = self.pool_metrics.write();
        pools.remove(connection_id);
    }
}

impl Default for MetricsCollector {
    fn default() -> Self {
        Self::new()
    }
}

/// Hash a query for deduplication and tracking
pub fn hash_query(query: &str) -> String {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};

    let mut hasher = DefaultHasher::new();
    query.hash(&mut hasher);
    format!("{:x}", hasher.finish())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_metrics_collector_creation() {
        let collector = MetricsCollector::new();
        assert_eq!(collector.get_recent_queries(10).len(), 0);
    }

    #[test]
    fn test_record_query() {
        let collector = MetricsCollector::new();

        let metrics = QueryMetrics {
            query_id: "test-1".to_string(),
            connection_id: "conn-1".to_string(),
            query_hash: "abc123".to_string(),
            execution_time_ms: 50,
            rows_scanned: Some(100),
            rows_returned: 10,
            index_used: None,
            timestamp: Utc::now(),
            success: true,
            error_message: None,
        };

        collector.record_query(metrics);

        let recent = collector.get_recent_queries(10);
        assert_eq!(recent.len(), 1);
        assert_eq!(recent[0].query_id, "test-1");
    }

    #[test]
    fn test_slow_queries() {
        let collector = MetricsCollector::new();

        // Fast query
        collector.record_query(QueryMetrics {
            query_id: "fast".to_string(),
            connection_id: "conn-1".to_string(),
            query_hash: "fast".to_string(),
            execution_time_ms: 10,
            rows_scanned: None,
            rows_returned: 5,
            index_used: None,
            timestamp: Utc::now(),
            success: true,
            error_message: None,
        });

        // Slow query
        collector.record_query(QueryMetrics {
            query_id: "slow".to_string(),
            connection_id: "conn-1".to_string(),
            query_hash: "slow".to_string(),
            execution_time_ms: 2000,
            rows_scanned: None,
            rows_returned: 100,
            index_used: None,
            timestamp: Utc::now(),
            success: true,
            error_message: None,
        });

        let slow = collector.get_slow_queries(1000);
        assert_eq!(slow.len(), 1);
        assert_eq!(slow[0].query_id, "slow");
    }

    #[test]
    fn test_query_hash() {
        let query1 = "SELECT * FROM users";
        let query2 = "SELECT * FROM users";
        let query3 = "SELECT * FROM products";

        let hash1 = hash_query(query1);
        let hash2 = hash_query(query2);
        let hash3 = hash_query(query3);

        assert_eq!(hash1, hash2);
        assert_ne!(hash1, hash3);
    }

    #[test]
    fn test_app_metrics() {
        let collector = MetricsCollector::new();

        collector.record_query(QueryMetrics {
            query_id: "1".to_string(),
            connection_id: "conn-1".to_string(),
            query_hash: "hash1".to_string(),
            execution_time_ms: 100,
            rows_scanned: None,
            rows_returned: 10,
            index_used: None,
            timestamp: Utc::now(),
            success: true,
            error_message: None,
        });

        collector.record_query(QueryMetrics {
            query_id: "2".to_string(),
            connection_id: "conn-1".to_string(),
            query_hash: "hash2".to_string(),
            execution_time_ms: 200,
            rows_scanned: None,
            rows_returned: 20,
            index_used: None,
            timestamp: Utc::now(),
            success: false,
            error_message: Some("Error".to_string()),
        });

        let metrics = collector.get_app_metrics(2, 3);

        assert_eq!(metrics.total_queries, 2);
        assert_eq!(metrics.successful_queries, 1);
        assert_eq!(metrics.failed_queries, 1);
        assert_eq!(metrics.avg_query_time_ms, 150.0);
        assert_eq!(metrics.active_connections, 2);
    }
}
