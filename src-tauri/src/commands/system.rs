use tauri::command;

/// Get the current OS username
#[command]
pub fn get_os_username() -> Result<String, String> {
    // Try to get username from environment variables
    let username = std::env::var("USER")
        .or_else(|_| std::env::var("USERNAME"))
        .or_else(|_| std::env::var("LOGNAME"))
        .unwrap_or_else(|_| "unknown-user".to_string());

    Ok(username)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_os_username() {
        let result = get_os_username();
        assert!(result.is_ok());
        let username = result.unwrap();
        assert!(!username.is_empty());
        println!("OS Username: {}", username);
    }
}
