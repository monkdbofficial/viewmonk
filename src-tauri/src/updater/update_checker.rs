use serde::{Deserialize, Serialize};
use std::time::Duration;
use tauri::AppHandle;

/// Update status information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateStatus {
    pub available: bool,
    pub current_version: String,
    pub latest_version: Option<String>,
    pub download_url: Option<String>,
    pub release_notes: Option<String>,
    pub release_date: Option<String>,
}

/// Update check result
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "status")]
pub enum UpdateCheckResult {
    #[serde(rename = "upToDate")]
    UpToDate { version: String },

    #[serde(rename = "updateAvailable")]
    UpdateAvailable {
        current_version: String,
        latest_version: String,
        download_url: String,
        release_notes: Option<String>,
    },

    #[serde(rename = "error")]
    Error { message: String },
}

/// Initialize the update checker
pub fn init_updater(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    log::info!("Initializing update checker");

    // Check for updates on startup (after a delay)
    let app_handle = app.clone();
    tauri::async_runtime::spawn(async move {
        // Wait 10 seconds after startup before checking
        tokio::time::sleep(Duration::from_secs(10)).await;

        log::info!("Performing initial update check");
        if let Err(e) = check_for_updates_internal(&app_handle).await {
            log::error!("Initial update check failed: {}", e);
        }
    });

    // Schedule periodic checks (every 6 hours)
    let app_handle = app.clone();
    tauri::async_runtime::spawn(async move {
        let mut interval = tokio::time::interval(Duration::from_secs(6 * 60 * 60));

        loop {
            interval.tick().await;

            log::debug!("Performing scheduled update check");
            if let Err(e) = check_for_updates_internal(&app_handle).await {
                log::error!("Scheduled update check failed: {}", e);
            }
        }
    });

    Ok(())
}

/// Check for updates (Tauri command)
#[tauri::command]
pub async fn check_for_updates(app: AppHandle) -> Result<UpdateCheckResult, String> {
    log::info!("Manual update check requested");

    check_for_updates_internal(&app)
        .await
        .map_err(|e| e.to_string())
}

/// Internal update check implementation
async fn check_for_updates_internal(app: &AppHandle) -> Result<UpdateCheckResult, Box<dyn std::error::Error>> {
    // Get current version
    let current_version = app.package_info().version.to_string();

    log::debug!("Current version: {}", current_version);

    // Note: In Tauri 2.x, the updater plugin handles the actual update checking
    // This is a wrapper that provides additional UI feedback

    // For now, we return that we're up to date
    // In production, the Tauri updater plugin will handle this automatically
    Ok(UpdateCheckResult::UpToDate {
        version: current_version,
    })
}

/// Download and install update (Tauri command)
#[tauri::command]
pub async fn install_update(_app: AppHandle) -> Result<(), String> {
    log::info!("Update installation requested");

    // The Tauri updater plugin handles downloads and installation
    // This command triggers the process

    // Note: The actual implementation will use the tauri-plugin-updater
    // which automatically handles downloading, verifying signatures, and installing

    log::info!("Update installation will be handled by Tauri updater plugin");

    Ok(())
}

/// Get update preferences
#[tauri::command]
pub async fn get_update_preferences() -> Result<UpdatePreferences, String> {
    // In a real implementation, this would read from a config file
    Ok(UpdatePreferences {
        auto_check: true,
        auto_download: false,
        auto_install: false,
        check_interval_hours: 6,
    })
}

/// Set update preferences
#[tauri::command]
pub async fn set_update_preferences(prefs: UpdatePreferences) -> Result<(), String> {
    log::info!("Updating preferences: auto_check={}, auto_download={}, auto_install={}",
        prefs.auto_check, prefs.auto_download, prefs.auto_install);

    // In a real implementation, this would save to a config file
    Ok(())
}

/// Update preferences
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdatePreferences {
    pub auto_check: bool,
    pub auto_download: bool,
    pub auto_install: bool,
    pub check_interval_hours: u64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_update_preferences_serialization() {
        let prefs = UpdatePreferences {
            auto_check: true,
            auto_download: false,
            auto_install: false,
            check_interval_hours: 6,
        };

        let json = serde_json::to_string(&prefs).unwrap();
        assert!(json.contains("auto_check"));
        assert!(json.contains("true"));
    }

    #[test]
    fn test_update_check_result_serialization() {
        let result = UpdateCheckResult::UpToDate {
            version: "1.0.0".to_string(),
        };

        let json = serde_json::to_string(&result).unwrap();
        assert!(json.contains("upToDate"));
        assert!(json.contains("1.0.0"));
    }

    #[test]
    fn test_update_available_serialization() {
        let result = UpdateCheckResult::UpdateAvailable {
            current_version: "1.0.0".to_string(),
            latest_version: "1.1.0".to_string(),
            download_url: "https://example.com/update".to_string(),
            release_notes: Some("Bug fixes".to_string()),
        };

        let json = serde_json::to_string(&result).unwrap();
        assert!(json.contains("updateAvailable"));
        assert!(json.contains("1.1.0"));
    }
}
