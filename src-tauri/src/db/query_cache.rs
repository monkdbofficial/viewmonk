use crate::models::QueryResponse;
use chrono::{DateTime, Duration, Utc};
use lru::LruCache;
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use std::num::NonZeroUsize;

/// Cache entry with TTL
#[derive(Clone, Debug)]
struct CacheEntry {
    response: QueryResponse,
    cached_at: DateTime<Utc>,
    ttl_seconds: i64,
}

impl CacheEntry {
    /// Check if cache entry is still valid
    fn is_valid(&self) -> bool {
        let now = Utc::now();
        let expires_at = self.cached_at + Duration::seconds(self.ttl_seconds);
        now < expires_at
    }
}

/// Cache statistics
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CacheStats {
    pub hits: u64,
    pub misses: u64,
    pub total_queries: u64,
    pub hit_rate: f64,
    pub cache_size: usize,
    pub max_capacity: usize,
}

/// Query cache configuration
#[derive(Clone, Debug)]
pub struct CacheConfig {
    /// Maximum number of cached queries
    pub max_size: usize,
    /// Default TTL in seconds
    pub default_ttl_seconds: i64,
}

impl Default for CacheConfig {
    fn default() -> Self {
        Self {
            max_size: 1000,
            default_ttl_seconds: 300, // 5 minutes
        }
    }
}

/// LRU cache for query results
pub struct QueryCache {
    cache: RwLock<LruCache<String, CacheEntry>>,
    config: CacheConfig,
    hits: RwLock<u64>,
    misses: RwLock<u64>,
}

impl QueryCache {
    /// Create a new query cache with default configuration
    pub fn new() -> Self {
        Self::with_config(CacheConfig::default())
    }

    /// Create a new query cache with custom configuration
    pub fn with_config(config: CacheConfig) -> Self {
        let capacity = NonZeroUsize::new(config.max_size).unwrap_or(NonZeroUsize::new(1000).unwrap());

        Self {
            cache: RwLock::new(LruCache::new(capacity)),
            config,
            hits: RwLock::new(0),
            misses: RwLock::new(0),
        }
    }

    /// Generate a cache key from query and parameters
    pub fn generate_key(query: &str, connection_id: &str) -> String {
        let mut hasher = DefaultHasher::new();
        query.hash(&mut hasher);
        connection_id.hash(&mut hasher);
        format!("{}:{:x}", connection_id, hasher.finish())
    }

    /// Get cached query result if available and not expired
    pub fn get(&self, key: &str) -> Option<QueryResponse> {
        let mut cache = self.cache.write();

        if let Some(entry) = cache.get(key) {
            if entry.is_valid() {
                *self.hits.write() += 1;
                log::debug!("Cache HIT for key: {}", key);
                return Some(entry.response.clone());
            } else {
                // Entry expired, remove it
                cache.pop(key);
                log::debug!("Cache entry EXPIRED for key: {}", key);
            }
        }

        *self.misses.write() += 1;
        log::debug!("Cache MISS for key: {}", key);
        None
    }

    /// Store query result in cache
    pub fn put(&self, key: String, response: QueryResponse) {
        self.put_with_ttl(key, response, self.config.default_ttl_seconds);
    }

    /// Store query result in cache with custom TTL
    pub fn put_with_ttl(&self, key: String, response: QueryResponse, ttl_seconds: i64) {
        let entry = CacheEntry {
            response,
            cached_at: Utc::now(),
            ttl_seconds,
        };

        let mut cache = self.cache.write();
        cache.put(key.clone(), entry);
        log::debug!("Cached query result for key: {} (TTL: {}s)", key, ttl_seconds);
    }

    /// Clear all cached entries
    pub fn clear(&self) {
        let mut cache = self.cache.write();
        cache.clear();
        *self.hits.write() = 0;
        *self.misses.write() = 0;
        log::info!("Query cache cleared");
    }

    /// Invalidate a specific cache entry
    pub fn invalidate(&self, key: &str) {
        let mut cache = self.cache.write();
        cache.pop(key);
        log::debug!("Invalidated cache entry: {}", key);
    }

    /// Get cache statistics
    pub fn get_stats(&self) -> CacheStats {
        let cache = self.cache.read();
        let hits = *self.hits.read();
        let misses = *self.misses.read();
        let total = hits + misses;
        let hit_rate = if total > 0 {
            (hits as f64 / total as f64) * 100.0
        } else {
            0.0
        };

        CacheStats {
            hits,
            misses,
            total_queries: total,
            hit_rate,
            cache_size: cache.len(),
            max_capacity: self.config.max_size,
        }
    }

    /// Remove expired entries from cache
    pub fn cleanup_expired(&self) {
        let mut cache = self.cache.write();
        let keys_to_remove: Vec<String> = cache
            .iter()
            .filter(|(_, entry)| !entry.is_valid())
            .map(|(key, _)| key.clone())
            .collect();

        let removed_count = keys_to_remove.len();
        for key in keys_to_remove {
            cache.pop(&key);
        }

        if removed_count > 0 {
            log::debug!("Cleaned up {} expired cache entries", removed_count);
        }
    }
}

impl Default for QueryCache {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::ColumnInfo;

    fn create_test_response() -> QueryResponse {
        QueryResponse {
            columns: vec![ColumnInfo {
                name: "id".to_string(),
                data_type: "INT4".to_string(),
                nullable: true,
            }],
            rows: vec![vec![serde_json::Value::Number(1.into())]],
            row_count: 1,
            execution_time_ms: 50,
            scanned_rows: None,
            index_used: None,
        }
    }

    #[test]
    fn test_cache_key_generation() {
        let key1 = QueryCache::generate_key("SELECT * FROM users", "conn-1");
        let key2 = QueryCache::generate_key("SELECT * FROM users", "conn-1");
        let key3 = QueryCache::generate_key("SELECT * FROM users", "conn-2");

        assert_eq!(key1, key2); // Same query and connection should generate same key
        assert_ne!(key1, key3); // Different connection should generate different key
    }

    #[test]
    fn test_cache_hit() {
        let cache = QueryCache::new();
        let key = "test-key".to_string();
        let response = create_test_response();

        cache.put(key.clone(), response.clone());
        let cached = cache.get(&key);

        assert!(cached.is_some());
        assert_eq!(cached.unwrap().row_count, response.row_count);
    }

    #[test]
    fn test_cache_miss() {
        let cache = QueryCache::new();
        let cached = cache.get("non-existent-key");

        assert!(cached.is_none());
    }

    #[test]
    fn test_cache_stats() {
        let cache = QueryCache::new();
        let key = "test-key".to_string();
        let response = create_test_response();

        cache.put(key.clone(), response);
        let _ = cache.get(&key); // Hit
        let _ = cache.get("missing-key"); // Miss

        let stats = cache.get_stats();
        assert_eq!(stats.hits, 1);
        assert_eq!(stats.misses, 1);
        assert_eq!(stats.total_queries, 2);
        assert_eq!(stats.cache_size, 1);
    }

    #[test]
    fn test_cache_clear() {
        let cache = QueryCache::new();
        let key = "test-key".to_string();
        let response = create_test_response();

        cache.put(key.clone(), response);
        cache.clear();

        let stats = cache.get_stats();
        assert_eq!(stats.cache_size, 0);
        assert_eq!(stats.hits, 0);
        assert_eq!(stats.misses, 0);
    }

    #[test]
    fn test_entry_expiration() {
        let config = CacheConfig {
            max_size: 100,
            default_ttl_seconds: -1, // Expired immediately
        };
        let cache = QueryCache::with_config(config);
        let key = "test-key".to_string();
        let response = create_test_response();

        cache.put(key.clone(), response);
        let cached = cache.get(&key);

        assert!(cached.is_none()); // Should be expired
    }
}
