use serde::Serialize;
use thiserror::Error;

/// Main error type for the application
#[derive(Debug, Error, Serialize)]
#[serde(tag = "type", content = "message")]
pub enum DbError {
    #[error("Connection failed: {0}")]
    ConnectionFailed(String),

    #[error("Authentication failed: {0}")]
    AuthenticationFailed(String),

    #[error("Query execution failed: {0}")]
    QueryFailed(String),

    #[error("Invalid query syntax: {0}")]
    InvalidQuery(String),

    #[error("SQL injection attempt detected")]
    InjectionDetected,

    #[error("Connection pool exhausted")]
    PoolExhausted,

    #[error("Database {0} not found")]
    DatabaseNotFound(String),

    #[error("Credential retrieval failed: {0}")]
    CredentialError(String),

    #[error("Serialization error: {0}")]
    SerializationError(String),

    #[error("Validation error: {0}")]
    ValidationError(String),

    #[error("Rate limit exceeded: {0}")]
    RateLimitExceeded(String),

    #[error("Timeout: {0}")]
    Timeout(String),

    #[error("Docker error: {0}")]
    Docker(String),

    #[error("Internal error: {0}")]
    InternalError(String),
}

/// Result type alias for convenience
pub type Result<T> = std::result::Result<T, DbError>;

/// Convert from keyring errors
impl From<keyring::Error> for DbError {
    fn from(err: keyring::Error) -> Self {
        DbError::CredentialError(err.to_string())
    }
}

/// Convert from serde_json errors
impl From<serde_json::Error> for DbError {
    fn from(err: serde_json::Error) -> Self {
        DbError::SerializationError(err.to_string())
    }
}

/// Convert from sqlparser errors
impl From<sqlparser::parser::ParserError> for DbError {
    fn from(err: sqlparser::parser::ParserError) -> Self {
        DbError::InvalidQuery(err.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_serialization() {
        let error = DbError::ConnectionFailed("test".to_string());
        let json = serde_json::to_string(&error).unwrap();
        assert!(json.contains("ConnectionFailed"));
    }

    #[test]
    fn test_error_display() {
        let error = DbError::InjectionDetected;
        assert_eq!(error.to_string(), "SQL injection attempt detected");
    }
}
