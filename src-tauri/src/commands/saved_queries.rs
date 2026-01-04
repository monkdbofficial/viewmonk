use crate::models::{QueryFilter, SaveQueryRequest, SavedQuery, UpdateQueryRequest};
use crate::state::AppState;
use crate::utils::{DbError, Result};
use std::fs;
use std::path::PathBuf;
use tauri::State;
use uuid::Uuid;

/// Get the saved queries directory
fn get_saved_queries_dir() -> Result<PathBuf> {
    let app_dir = dirs::data_local_dir()
        .ok_or_else(|| DbError::ValidationError("Failed to get app data directory".to_string()))?
        .join("com.monkdb.workbench")
        .join("saved_queries");

    fs::create_dir_all(&app_dir).map_err(|e| {
        DbError::ValidationError(format!("Failed to create saved queries directory: {}", e))
    })?;

    Ok(app_dir)
}

/// Get the file path for a saved query
fn get_query_file_path(id: &str) -> Result<PathBuf> {
    let dir = get_saved_queries_dir()?;
    Ok(dir.join(format!("{}.json", id)))
}

/// Save a query
#[tauri::command]
pub async fn save_query(
    request: SaveQueryRequest,
    _state: State<'_, AppState>,
) -> Result<SavedQuery> {
    log::info!("Saving query: {}", request.name);

    let id = Uuid::new_v4().to_string();
    let query = SavedQuery::new(
        id.clone(),
        request.name,
        request.query,
        request.connection_id,
        request.folder,
        request.tags,
    );

    // Save to file
    let file_path = get_query_file_path(&id)?;
    let json = serde_json::to_string_pretty(&query).map_err(|e| {
        DbError::ValidationError(format!("Failed to serialize query: {}", e))
    })?;

    fs::write(&file_path, json).map_err(|e| {
        DbError::ValidationError(format!("Failed to write query file: {}", e))
    })?;

    log::info!("Query saved: {} ({})", query.name, query.id);

    Ok(query)
}

/// List all saved queries
#[tauri::command]
pub async fn list_saved_queries(
    filter: Option<QueryFilter>,
    _state: State<'_, AppState>,
) -> Result<Vec<SavedQuery>> {
    log::debug!("Listing saved queries");

    let dir = get_saved_queries_dir()?;
    let mut queries = Vec::new();

    // Read all query files
    if let Ok(entries) = fs::read_dir(&dir) {
        for entry in entries.flatten() {
            if let Ok(content) = fs::read_to_string(entry.path()) {
                if let Ok(query) = serde_json::from_str::<SavedQuery>(&content) {
                    queries.push(query);
                }
            }
        }
    }

    // Apply filters
    if let Some(filter) = filter {
        queries.retain(|q| {
            // Filter by connection ID
            if let Some(ref conn_id) = filter.connection_id {
                if q.connection_id.as_ref() != Some(conn_id) {
                    return false;
                }
            }

            // Filter by folder
            if let Some(ref folder) = filter.folder {
                if q.folder.as_ref() != Some(folder) {
                    return false;
                }
            }

            // Filter by tags
            if let Some(ref tags) = filter.tags {
                if !tags.iter().any(|tag| q.tags.contains(tag)) {
                    return false;
                }
            }

            // Filter by search term
            if let Some(ref search) = filter.search {
                let search_lower = search.to_lowercase();
                if !q.name.to_lowercase().contains(&search_lower)
                    && !q.query.to_lowercase().contains(&search_lower)
                    && !q
                        .description
                        .as_ref()
                        .map(|d| d.to_lowercase().contains(&search_lower))
                        .unwrap_or(false)
                {
                    return false;
                }
            }

            // Filter favorites
            if filter.favorites_only && !q.is_favorite {
                return false;
            }

            true
        });
    }

    // Sort by updated_at (most recent first)
    queries.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));

    log::debug!("Found {} saved queries", queries.len());

    Ok(queries)
}

/// Get a specific saved query
#[tauri::command]
pub async fn get_saved_query(id: String, _state: State<'_, AppState>) -> Result<SavedQuery> {
    log::debug!("Getting saved query: {}", id);

    let file_path = get_query_file_path(&id)?;
    let content = fs::read_to_string(&file_path).map_err(|_| {
        DbError::ValidationError(format!("Query not found: {}", id))
    })?;

    let query = serde_json::from_str::<SavedQuery>(&content).map_err(|e| {
        DbError::ValidationError(format!("Failed to parse query: {}", e))
    })?;

    Ok(query)
}

/// Update a saved query
#[tauri::command]
pub async fn update_saved_query(
    request: UpdateQueryRequest,
    _state: State<'_, AppState>,
) -> Result<SavedQuery> {
    log::info!("Updating query: {}", request.id);

    let mut query = get_saved_query(request.id.clone(), _state).await?;

    // Update fields
    if let Some(name) = request.name {
        query.name = name;
    }
    if let Some(description) = request.description {
        query.description = Some(description);
    }
    if let Some(query_text) = request.query {
        query.update(query_text);
    }
    if let Some(folder) = request.folder {
        query.folder = Some(folder);
    }
    if let Some(tags) = request.tags {
        query.tags = tags;
    }
    if let Some(is_favorite) = request.is_favorite {
        query.is_favorite = is_favorite;
    }

    // Save updated query
    let file_path = get_query_file_path(&query.id)?;
    let json = serde_json::to_string_pretty(&query).map_err(|e| {
        DbError::ValidationError(format!("Failed to serialize query: {}", e))
    })?;

    fs::write(&file_path, json).map_err(|e| {
        DbError::ValidationError(format!("Failed to write query file: {}", e))
    })?;

    log::info!("Query updated: {} ({})", query.name, query.id);

    Ok(query)
}

/// Delete a saved query
#[tauri::command]
pub async fn delete_saved_query(id: String, _state: State<'_, AppState>) -> Result<()> {
    log::info!("Deleting query: {}", id);

    let file_path = get_query_file_path(&id)?;
    fs::remove_file(&file_path).map_err(|e| {
        DbError::ValidationError(format!("Failed to delete query: {}", e))
    })?;

    log::info!("Query deleted: {}", id);

    Ok(())
}

/// Mark a query as executed
#[tauri::command]
pub async fn mark_query_executed(id: String, _state: State<'_, AppState>) -> Result<SavedQuery> {
    log::debug!("Marking query as executed: {}", id);

    let mut query = get_saved_query(id.clone(), _state).await?;
    query.mark_executed();

    // Save updated query
    let file_path = get_query_file_path(&query.id)?;
    let json = serde_json::to_string_pretty(&query).map_err(|e| {
        DbError::ValidationError(format!("Failed to serialize query: {}", e))
    })?;

    fs::write(&file_path, json).map_err(|e| {
        DbError::ValidationError(format!("Failed to write query file: {}", e))
    })?;

    Ok(query)
}

/// List all folders
#[tauri::command]
pub async fn list_query_folders(_state: State<'_, AppState>) -> Result<Vec<String>> {
    log::debug!("Listing query folders");

    let queries = list_saved_queries(None, _state).await?;
    let mut folders: Vec<String> = queries
        .iter()
        .filter_map(|q| q.folder.clone())
        .collect();

    folders.sort();
    folders.dedup();

    Ok(folders)
}

/// List all tags
#[tauri::command]
pub async fn list_query_tags(_state: State<'_, AppState>) -> Result<Vec<String>> {
    log::debug!("Listing query tags");

    let queries = list_saved_queries(None, _state).await?;
    let mut tags: Vec<String> = queries
        .iter()
        .flat_map(|q| q.tags.clone())
        .collect();

    tags.sort();
    tags.dedup();

    Ok(tags)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_saved_queries_dir() {
        let dir = get_saved_queries_dir();
        assert!(dir.is_ok());
    }

    #[test]
    fn test_get_query_file_path() {
        let path = get_query_file_path("test-123");
        assert!(path.is_ok());
        assert!(path.unwrap().to_str().unwrap().contains("test-123.json"));
    }
}
