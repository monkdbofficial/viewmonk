use chrono::Local;
use fern::colors::{Color, ColoredLevelConfig};
use std::fs;
use std::path::PathBuf;

/// Initialize logging system with file rotation and console output
pub fn init_logging(log_dir: PathBuf) -> Result<(), Box<dyn std::error::Error>> {
    // Create log directory if it doesn't exist
    fs::create_dir_all(&log_dir)?;

    // Configure colors for console output
    let colors = ColoredLevelConfig::new()
        .error(Color::Red)
        .warn(Color::Yellow)
        .info(Color::Green)
        .debug(Color::Blue)
        .trace(Color::BrightBlack);

    // Base configuration
    let base_config = fern::Dispatch::new();

    // Console output (pretty format for development)
    let console_config = fern::Dispatch::new()
        .format(move |out, message, record| {
            out.finish(format_args!(
                "[{} {} {}] {}",
                Local::now().format("%Y-%m-%d %H:%M:%S"),
                colors.color(record.level()),
                record.target(),
                message
            ))
        })
        .level(if cfg!(debug_assertions) {
            log::LevelFilter::Debug
        } else {
            log::LevelFilter::Info
        })
        .chain(std::io::stdout());

    // File output (JSON format for production)
    let file_path = log_dir.join(format!(
        "monkdb-{}.log",
        Local::now().format("%Y-%m-%d")
    ));

    let file_config = fern::Dispatch::new()
        .format(|out, message, record| {
            out.finish(format_args!(
                "{{\"timestamp\":\"{}\",\"level\":\"{}\",\"target\":\"{}\",\"message\":\"{}\"}}",
                Local::now().to_rfc3339(),
                record.level(),
                record.target(),
                message
            ))
        })
        .level(log::LevelFilter::Info)
        .chain(fern::log_file(&file_path)?);

    // Combine and apply
    base_config
        .chain(console_config)
        .chain(file_config)
        .apply()?;

    log::info!("Logging initialized");
    log::info!("Log directory: {}", log_dir.display());
    log::info!("Log file: {}", file_path.display());

    // Clean up old log files (keep last 30 days)
    cleanup_old_logs(&log_dir, 30)?;

    Ok(())
}

/// Clean up log files older than specified days
fn cleanup_old_logs(log_dir: &PathBuf, days_to_keep: i64) -> Result<(), Box<dyn std::error::Error>> {
    let cutoff = Local::now() - chrono::Duration::days(days_to_keep);

    for entry in fs::read_dir(log_dir)? {
        let entry = entry?;
        let path = entry.path();

        if path.is_file() && path.extension().and_then(|s| s.to_str()) == Some("log") {
            if let Ok(metadata) = fs::metadata(&path) {
                if let Ok(modified) = metadata.modified() {
                    let modified_time: chrono::DateTime<Local> = modified.into();
                    if modified_time < cutoff {
                        log::info!("Removing old log file: {}", path.display());
                        fs::remove_file(&path)?;
                    }
                }
            }
        }
    }

    Ok(())
}

/// Get log directory path
pub fn get_log_dir() -> Result<PathBuf, Box<dyn std::error::Error>> {
    let app_dir = dirs::data_local_dir()
        .ok_or("Could not determine local data directory")?
        .join("MonkDB Workbench")
        .join("logs");

    Ok(app_dir)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;

    #[test]
    fn test_get_log_dir() {
        let log_dir = get_log_dir();
        assert!(log_dir.is_ok());

        let path = log_dir.unwrap();
        assert!(path.to_str().unwrap().contains("MonkDB Workbench"));
    }

    #[test]
    fn test_log_dir_creation() {
        let temp_dir = env::temp_dir().join("test-monkdb-logs");

        if temp_dir.exists() {
            fs::remove_dir_all(&temp_dir).ok();
        }

        let result = fs::create_dir_all(&temp_dir);
        assert!(result.is_ok());
        assert!(temp_dir.exists());

        // Cleanup
        fs::remove_dir_all(&temp_dir).ok();
    }
}
