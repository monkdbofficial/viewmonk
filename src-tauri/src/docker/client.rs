use super::models::{ContainerInfo, DockerStatus, DockerVersion, PortMapping};
use anyhow::{Context, Result};
use bollard::container::ListContainersOptions;
use bollard::Docker;

pub struct DockerClient {
    docker: Docker,
}

impl DockerClient {
    /// Create a new Docker client instance
    pub fn new() -> Result<Self> {
        let docker = Docker::connect_with_local_defaults()
            .context("Failed to connect to Docker daemon")?;
        Ok(Self { docker })
    }

    /// Check if Docker is available and running
    pub async fn is_available(&self) -> bool {
        self.docker.ping().await.is_ok()
    }

    /// Get Docker status (availability and version)
    pub async fn get_status(&self) -> DockerStatus {
        match self.docker.ping().await {
            Ok(_) => match self.get_version().await {
                Ok(version) => DockerStatus {
                    available: true,
                    version: Some(version.version),
                    error: None,
                },
                Err(e) => DockerStatus {
                    available: false,
                    version: None,
                    error: Some(format!("Failed to get Docker version: {}", e)),
                },
            },
            Err(e) => DockerStatus {
                available: false,
                version: None,
                error: Some(format!("Docker daemon not available: {}", e)),
            },
        }
    }

    /// Get Docker version information
    pub async fn get_version(&self) -> Result<DockerVersion> {
        let version_info = self
            .docker
            .version()
            .await
            .context("Failed to get Docker version")?;

        Ok(DockerVersion {
            version: version_info.version.unwrap_or_else(|| "unknown".to_string()),
            api_version: version_info.api_version.unwrap_or_else(|| "unknown".to_string()),
            os: version_info.os.unwrap_or_else(|| "unknown".to_string()),
            arch: version_info.arch.unwrap_or_else(|| "unknown".to_string()),
            kernel_version: version_info
                .kernel_version
                .unwrap_or_else(|| "unknown".to_string()),
        })
    }

    /// List all containers
    pub async fn list_all_containers(&self) -> Result<Vec<ContainerInfo>> {
        let options = Some(ListContainersOptions {
            all: true,
            ..Default::default()
        });

        self.list_containers_with_options(options).await
    }

    /// List only running containers
    pub async fn list_running_containers(&self) -> Result<Vec<ContainerInfo>> {
        let options = Some(ListContainersOptions {
            all: false,
            ..Default::default()
        });

        self.list_containers_with_options(options).await
    }

    /// List only MonkDB containers
    pub async fn list_monkdb_containers(&self) -> Result<Vec<ContainerInfo>> {
        let containers = self.list_all_containers().await?;

        // Filter containers that have MonkDB-related images or labels
        let monkdb_containers: Vec<ContainerInfo> = containers
            .into_iter()
            .filter(|container| {
                // Check if image contains "monk" or "monkdb" (case insensitive)
                let image_lower = container.image.to_lowercase();
                let has_monkdb_image = image_lower.contains("monk") || image_lower.contains("monkdb");

                // Check if any label contains "monkdb"
                let has_monkdb_label = container.labels.iter().any(|(k, v)| {
                    let key_lower = k.to_lowercase();
                    let val_lower = v.to_lowercase();
                    key_lower.contains("monkdb") || val_lower.contains("monkdb")
                });

                has_monkdb_image || has_monkdb_label
            })
            .collect();

        Ok(monkdb_containers)
    }

    /// Internal helper to list containers with custom options
    async fn list_containers_with_options(
        &self,
        options: Option<ListContainersOptions<String>>,
    ) -> Result<Vec<ContainerInfo>> {
        let containers = self
            .docker
            .list_containers(options)
            .await
            .context("Failed to list containers")?;

        let container_infos = containers
            .into_iter()
            .map(|container| {
                let ports = container
                    .ports
                    .unwrap_or_default()
                    .into_iter()
                    .map(|port| PortMapping {
                        private_port: port.private_port,
                        public_port: port.public_port,
                        r#type: port.typ.map(|t| t.to_string()).unwrap_or_else(|| "tcp".to_string()),
                        ip: port.ip,
                    })
                    .collect();

                let names = container.names.unwrap_or_default();
                let name = names
                    .first()
                    .map(|n| n.trim_start_matches('/').to_string())
                    .unwrap_or_else(|| "unknown".to_string());

                ContainerInfo {
                    id: container.id.unwrap_or_default(),
                    name,
                    image: container.image.unwrap_or_else(|| "unknown".to_string()),
                    status: container.status.unwrap_or_else(|| "unknown".to_string()),
                    state: container.state.unwrap_or_else(|| "unknown".to_string()),
                    created: container.created.unwrap_or(0),
                    ports,
                    labels: container.labels.unwrap_or_default(),
                }
            })
            .collect();

        Ok(container_infos)
    }

    /// Get reference to underlying Docker client
    pub fn client(&self) -> &Docker {
        &self.docker
    }
}
