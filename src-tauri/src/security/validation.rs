use crate::utils::{DbError, Result};
use chrono::{DateTime, Utc};
use parking_lot::RwLock;
use sqlparser::dialect::GenericDialect;
use sqlparser::parser::Parser;
use std::collections::HashMap;
use std::sync::Arc;

/// Input validator for database operations
pub struct InputValidator {
    rate_limiter: Arc<RwLock<HashMap<String, Vec<DateTime<Utc>>>>>,
    max_requests_per_minute: usize,
}

impl InputValidator {
    /// Create a new input validator with default rate limit (100 req/min)
    pub fn new() -> Self {
        Self {
            rate_limiter: Arc::new(RwLock::new(HashMap::new())),
            max_requests_per_minute: 100,
        }
    }

    /// Create a new input validator with custom rate limit
    pub fn with_rate_limit(max_requests_per_minute: usize) -> Self {
        Self {
            rate_limiter: Arc::new(RwLock::new(HashMap::new())),
            max_requests_per_minute,
        }
    }

    /// Validate SQL query for safety
    pub fn validate_query(&self, query: &str) -> Result<()> {
        // Length check
        if query.len() > 100_000 {
            return Err(DbError::ValidationError("Query too long (max 100KB)".to_string()));
        }

        // Empty query check
        if query.trim().is_empty() {
            return Err(DbError::ValidationError("Query cannot be empty".to_string()));
        }

        // Parse SQL to validate syntax
        let dialect = GenericDialect {};
        let statements = Parser::parse_sql(&dialect, query)?;

        // Check for dangerous operations
        for statement in &statements {
            let statement_str = format!("{:?}", statement);

            // Detect DROP DATABASE
            if statement_str.contains("Drop") && statement_str.contains("Database") {
                return Err(DbError::InjectionDetected);
            }

            // Detect TRUNCATE
            if statement_str.contains("Truncate") {
                return Err(DbError::ValidationError(
                    "TRUNCATE operations must be confirmed separately".to_string(),
                ));
            }
        }

        Ok(())
    }

    /// Validate connection ID format
    pub fn validate_connection_id(&self, id: &str) -> Result<()> {
        // Check length
        if id.is_empty() || id.len() > 255 {
            return Err(DbError::ValidationError(
                "Connection ID must be between 1 and 255 characters".to_string(),
            ));
        }

        // Check format (alphanumeric, dash, underscore only)
        if !id.chars().all(|c| c.is_alphanumeric() || c == '-' || c == '_') {
            return Err(DbError::ValidationError(
                "Connection ID can only contain alphanumeric characters, dashes, and underscores"
                    .to_string(),
            ));
        }

        Ok(())
    }

    /// Validate database identifier (table name, column name, etc.)
    pub fn validate_identifier(&self, identifier: &str) -> Result<()> {
        // Check length
        if identifier.is_empty() || identifier.len() > 255 {
            return Err(DbError::ValidationError(
                "Identifier must be between 1 and 255 characters".to_string(),
            ));
        }

        // Check for SQL injection patterns
        let dangerous_patterns = ["'", "\"", ";", "--", "/*", "*/"];
        for pattern in &dangerous_patterns {
            if identifier.contains(pattern) {
                return Err(DbError::InjectionDetected);
            }
        }

        Ok(())
    }

    /// Check rate limit for a connection
    pub fn check_rate_limit(&self, connection_id: &str) -> Result<()> {
        let mut limiter = self.rate_limiter.write();
        let now = Utc::now();
        let one_minute_ago = now - chrono::Duration::minutes(1);

        let requests = limiter.entry(connection_id.to_string()).or_insert_with(Vec::new);

        // Remove old requests
        requests.retain(|&time| time > one_minute_ago);

        // Check if limit exceeded
        if requests.len() >= self.max_requests_per_minute {
            return Err(DbError::RateLimitExceeded(format!(
                "Rate limit exceeded: {} requests/minute",
                self.max_requests_per_minute
            )));
        }

        // Add current request
        requests.push(now);

        Ok(())
    }

    /// Sanitize identifier by removing dangerous characters
    pub fn sanitize_identifier(&self, identifier: &str) -> String {
        identifier
            .chars()
            .filter(|c| c.is_alphanumeric() || *c == '_' || *c == '-')
            .collect()
    }

    /// Clear rate limit history for a connection
    pub fn clear_rate_limit(&self, connection_id: &str) {
        let mut limiter = self.rate_limiter.write();
        limiter.remove(connection_id);
    }
}

impl Default for InputValidator {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_query() {
        let validator = InputValidator::new();
        assert!(validator.validate_query("SELECT * FROM users WHERE id = 1").is_ok());
    }

    #[test]
    fn test_empty_query() {
        let validator = InputValidator::new();
        assert!(validator.validate_query("").is_err());
    }

    #[test]
    fn test_query_too_long() {
        let validator = InputValidator::new();
        let long_query = "SELECT * FROM ".to_string() + &"a".repeat(100_001);
        assert!(validator.validate_query(&long_query).is_err());
    }

    #[test]
    fn test_dangerous_drop_database() {
        let validator = InputValidator::new();
        let result = validator.validate_query("DROP DATABASE test");
        assert!(result.is_err());
    }

    #[test]
    fn test_valid_connection_id() {
        let validator = InputValidator::new();
        assert!(validator.validate_connection_id("conn-123_abc").is_ok());
    }

    #[test]
    fn test_invalid_connection_id() {
        let validator = InputValidator::new();
        assert!(validator.validate_connection_id("conn@123").is_err());
    }

    #[test]
    fn test_rate_limiting() {
        let validator = InputValidator::with_rate_limit(2);

        assert!(validator.check_rate_limit("conn1").is_ok());
        assert!(validator.check_rate_limit("conn1").is_ok());
        assert!(validator.check_rate_limit("conn1").is_err());
    }

    #[test]
    fn test_sanitize_identifier() {
        let validator = InputValidator::new();
        assert_eq!(
            validator.sanitize_identifier("user';DROP TABLE users--"),
            "userDROPTABLEusers"
        );
    }
}
