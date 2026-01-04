use crate::utils::{DbError, Result};
use keyring::Entry;
use serde::{Deserialize, Serialize};

/// Database credentials stored in OS keychain
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseCredentials {
    pub connection_id: String,
    pub host: String,
    pub port: u16,
    pub database: String,
    pub username: Option<String>,
    pub password: Option<String>,
    pub ssl_cert: Option<String>,
    pub connection_string: Option<String>,
}

/// Manages secure credential storage using OS keychain
/// - macOS: Keychain.app
/// - Windows: Credential Manager
/// - Linux: Secret Service API
pub struct KeychainManager {
    service_name: String,
}

impl KeychainManager {
    /// Create a new keychain manager
    pub fn new() -> Self {
        Self {
            service_name: "com.monkdb.workbench".to_string(),
        }
    }

    /// Store credentials securely in OS keychain
    pub fn store_credentials(
        &self,
        connection_id: &str,
        credentials: &DatabaseCredentials,
    ) -> Result<()> {
        let entry = Entry::new(&self.service_name, connection_id)
            .map_err(|e| DbError::CredentialError(format!("Failed to create keychain entry: {}", e)))?;

        let json = serde_json::to_string(credentials)?;

        entry
            .set_password(&json)
            .map_err(|e| DbError::CredentialError(format!("Failed to store credentials: {}", e)))?;

        Ok(())
    }

    /// Retrieve credentials from OS keychain
    pub fn retrieve_credentials(&self, connection_id: &str) -> Result<DatabaseCredentials> {
        let entry = Entry::new(&self.service_name, connection_id)
            .map_err(|e| DbError::CredentialError(format!("Failed to access keychain: {}", e)))?;

        let password = entry.get_password().map_err(|e| match e {
            keyring::Error::NoEntry => DbError::CredentialError(format!(
                "No credentials found for connection: {}",
                connection_id
            )),
            _ => DbError::CredentialError(format!("Failed to retrieve credentials: {}", e)),
        })?;

        let credentials: DatabaseCredentials = serde_json::from_str(&password)?;
        Ok(credentials)
    }

    /// Delete credentials from OS keychain
    pub fn delete_credentials(&self, connection_id: &str) -> Result<()> {
        let entry = Entry::new(&self.service_name, connection_id)
            .map_err(|e| DbError::CredentialError(format!("Failed to access keychain: {}", e)))?;

        entry.delete_credential().map_err(|e| {
            DbError::CredentialError(format!("Failed to delete credentials: {}", e))
        })?;

        Ok(())
    }

    /// Check if credentials exist for a connection
    pub fn has_credentials(&self, connection_id: &str) -> bool {
        if let Ok(entry) = Entry::new(&self.service_name, connection_id) {
            entry.get_password().is_ok()
        } else {
            false
        }
    }

    /// Update existing credentials
    pub fn update_credentials(
        &self,
        connection_id: &str,
        credentials: &DatabaseCredentials,
    ) -> Result<()> {
        // Delete old credentials if they exist
        let _ = self.delete_credentials(connection_id);

        // Store new credentials
        self.store_credentials(connection_id, credentials)
    }
}

impl Default for KeychainManager {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_keychain_manager_creation() {
        let manager = KeychainManager::new();
        assert_eq!(manager.service_name, "com.monkdb.workbench");
    }

    #[test]
    fn test_credentials_serialization() {
        let creds = DatabaseCredentials {
            connection_id: "test-123".to_string(),
            host: "localhost".to_string(),
            port: 5432,
            database: "testdb".to_string(),
            username: Some("user".to_string()),
            password: Some("pass".to_string()),
            ssl_cert: None,
            connection_string: None,
        };

        let json = serde_json::to_string(&creds).unwrap();
        let parsed: DatabaseCredentials = serde_json::from_str(&json).unwrap();

        assert_eq!(parsed.connection_id, creds.connection_id);
        assert_eq!(parsed.host, creds.host);
        assert_eq!(parsed.port, creds.port);
    }
}
