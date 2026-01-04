use crate::docker::{ContainerDetails, ContainerInfo, ContainerLogs, ContainerOperations, DockerClient, DockerStatus, DockerVersion};
use crate::utils::Result;

/// Check if Docker is available
#[tauri::command]
pub async fn check_docker_available() -> Result<DockerStatus> {
    log::info!("Checking Docker availability");

    match DockerClient::new() {
        Ok(client) => {
            let status = client.get_status().await;
            log::info!("Docker status: available={}", status.available);
            Ok(status)
        }
        Err(e) => {
            log::error!("Docker not available: {}", e);
            Ok(DockerStatus {
                available: false,
                version: None,
                error: Some(e.to_string()),
            })
        }
    }
}

/// Get Docker version information
#[tauri::command]
pub async fn get_docker_version() -> Result<DockerVersion> {
    log::info!("Getting Docker version");

    let client = DockerClient::new()
        .map_err(|e| crate::utils::DbError::Docker(format!("Failed to connect to Docker: {}", e)))?;

    let version = client
        .get_version()
        .await
        .map_err(|e| crate::utils::DbError::Docker(format!("Failed to get Docker version: {}", e)))?;

    log::info!("Docker version: {}", version.version);
    Ok(version)
}

/// List all containers
#[tauri::command]
pub async fn list_containers() -> Result<Vec<ContainerInfo>> {
    log::info!("Listing all containers");

    let client = DockerClient::new()
        .map_err(|e| crate::utils::DbError::Docker(format!("Failed to connect to Docker: {}", e)))?;

    let containers = client
        .list_all_containers()
        .await
        .map_err(|e| crate::utils::DbError::Docker(format!("Failed to list containers: {}", e)))?;

    log::info!("Found {} containers", containers.len());
    Ok(containers)
}

/// List only running containers
#[tauri::command]
pub async fn list_running_containers() -> Result<Vec<ContainerInfo>> {
    log::info!("Listing running containers");

    let client = DockerClient::new()
        .map_err(|e| crate::utils::DbError::Docker(format!("Failed to connect to Docker: {}", e)))?;

    let containers = client
        .list_running_containers()
        .await
        .map_err(|e| crate::utils::DbError::Docker(format!("Failed to list running containers: {}", e)))?;

    log::info!("Found {} running containers", containers.len());
    Ok(containers)
}

/// List only MonkDB containers
#[tauri::command]
pub async fn list_monkdb_containers() -> Result<Vec<ContainerInfo>> {
    log::info!("Listing MonkDB containers");

    let client = DockerClient::new()
        .map_err(|e| crate::utils::DbError::Docker(format!("Failed to connect to Docker: {}", e)))?;

    let containers = client
        .list_monkdb_containers()
        .await
        .map_err(|e| crate::utils::DbError::Docker(format!("Failed to list MonkDB containers: {}", e)))?;

    log::info!("Found {} MonkDB containers", containers.len());
    Ok(containers)
}

/// Get detailed information about a specific container
#[tauri::command]
pub async fn get_container(container_id: String) -> Result<ContainerDetails> {
    log::info!("Getting container details for: {}", container_id);

    let client = DockerClient::new()
        .map_err(|e| crate::utils::DbError::Docker(format!("Failed to connect to Docker: {}", e)))?;

    let ops = ContainerOperations::new(client);
    let details = ops
        .get_container_details(&container_id)
        .await
        .map_err(|e| crate::utils::DbError::Docker(format!("Failed to get container details: {}", e)))?;

    log::info!("Retrieved details for container: {}", container_id);
    Ok(details)
}

/// Start a container
#[tauri::command]
pub async fn start_container(container_id: String) -> Result<()> {
    log::info!("Starting container: {}", container_id);

    let client = DockerClient::new()
        .map_err(|e| crate::utils::DbError::Docker(format!("Failed to connect to Docker: {}", e)))?;

    let ops = ContainerOperations::new(client);
    ops.start_container(&container_id)
        .await
        .map_err(|e| crate::utils::DbError::Docker(format!("Failed to start container: {}", e)))?;

    log::info!("Container started successfully: {}", container_id);
    Ok(())
}

/// Stop a container
#[tauri::command]
pub async fn stop_container(container_id: String) -> Result<()> {
    log::info!("Stopping container: {}", container_id);

    let client = DockerClient::new()
        .map_err(|e| crate::utils::DbError::Docker(format!("Failed to connect to Docker: {}", e)))?;

    let ops = ContainerOperations::new(client);
    ops.stop_container(&container_id)
        .await
        .map_err(|e| crate::utils::DbError::Docker(format!("Failed to stop container: {}", e)))?;

    log::info!("Container stopped successfully: {}", container_id);
    Ok(())
}

/// Restart a container
#[tauri::command]
pub async fn restart_container(container_id: String) -> Result<()> {
    log::info!("Restarting container: {}", container_id);

    let client = DockerClient::new()
        .map_err(|e| crate::utils::DbError::Docker(format!("Failed to connect to Docker: {}", e)))?;

    let ops = ContainerOperations::new(client);
    ops.restart_container(&container_id)
        .await
        .map_err(|e| crate::utils::DbError::Docker(format!("Failed to restart container: {}", e)))?;

    log::info!("Container restarted successfully: {}", container_id);
    Ok(())
}

/// Remove a container
#[tauri::command]
pub async fn remove_container(container_id: String, force: bool) -> Result<()> {
    log::info!("Removing container: {} (force={})", container_id, force);

    let client = DockerClient::new()
        .map_err(|e| crate::utils::DbError::Docker(format!("Failed to connect to Docker: {}", e)))?;

    let ops = ContainerOperations::new(client);
    ops.remove_container(&container_id, force)
        .await
        .map_err(|e| crate::utils::DbError::Docker(format!("Failed to remove container: {}", e)))?;

    log::info!("Container removed successfully: {}", container_id);
    Ok(())
}

/// Get container logs
#[tauri::command]
pub async fn get_container_logs(container_id: String, tail: Option<usize>) -> Result<ContainerLogs> {
    log::info!("Getting logs for container: {} (tail={:?})", container_id, tail);

    let client = DockerClient::new()
        .map_err(|e| crate::utils::DbError::Docker(format!("Failed to connect to Docker: {}", e)))?;

    let ops = ContainerOperations::new(client);
    let logs = ops
        .get_container_logs(&container_id, tail)
        .await
        .map_err(|e| crate::utils::DbError::Docker(format!("Failed to get container logs: {}", e)))?;

    log::info!("Retrieved {} log lines for container: {}", logs.logs.len(), container_id);
    Ok(logs)
}
