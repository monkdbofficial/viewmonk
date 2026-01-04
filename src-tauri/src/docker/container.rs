use super::client::DockerClient;
use super::models::{ContainerDetails, ContainerLogs, ContainerState, MountInfo, NetworkInfo, NetworkSettings, PortMapping};
use anyhow::{Context, Result};
use bollard::container::{InspectContainerOptions, LogsOptions};
use bollard::service::ContainerInspectResponse;
use futures_util::stream::StreamExt;
use std::collections::HashMap;

pub struct ContainerOperations {
    client: DockerClient,
}

impl ContainerOperations {
    pub fn new(client: DockerClient) -> Self {
        Self { client }
    }

    /// Get detailed information about a specific container
    pub async fn get_container_details(&self, container_id: &str) -> Result<ContainerDetails> {
        let docker = self.client.client();
        let options = InspectContainerOptions { size: false };

        let container = docker
            .inspect_container(container_id, Some(options))
            .await
            .context(format!("Failed to inspect container: {}", container_id))?;

        self.convert_to_container_details(container)
    }

    /// Start a container
    pub async fn start_container(&self, container_id: &str) -> Result<()> {
        let docker = self.client.client();
        docker
            .start_container::<String>(container_id, None)
            .await
            .context(format!("Failed to start container: {}", container_id))?;

        log::info!("Started container: {}", container_id);
        Ok(())
    }

    /// Stop a container
    pub async fn stop_container(&self, container_id: &str) -> Result<()> {
        let docker = self.client.client();
        docker
            .stop_container(container_id, None)
            .await
            .context(format!("Failed to stop container: {}", container_id))?;

        log::info!("Stopped container: {}", container_id);
        Ok(())
    }

    /// Restart a container
    pub async fn restart_container(&self, container_id: &str) -> Result<()> {
        let docker = self.client.client();
        docker
            .restart_container(container_id, None)
            .await
            .context(format!("Failed to restart container: {}", container_id))?;

        log::info!("Restarted container: {}", container_id);
        Ok(())
    }

    /// Remove a container
    pub async fn remove_container(&self, container_id: &str, force: bool) -> Result<()> {
        let docker = self.client.client();

        let mut options = bollard::container::RemoveContainerOptions::default();
        options.force = force;

        docker
            .remove_container(container_id, Some(options))
            .await
            .context(format!("Failed to remove container: {}", container_id))?;

        log::info!("Removed container: {}", container_id);
        Ok(())
    }

    /// Get container logs
    pub async fn get_container_logs(
        &self,
        container_id: &str,
        tail: Option<usize>,
    ) -> Result<ContainerLogs> {
        let docker = self.client.client();

        let tail_str = tail.unwrap_or(100).to_string();
        let options = LogsOptions {
            stdout: true,
            stderr: true,
            tail: tail_str.as_str(),
            ..Default::default()
        };

        let mut log_stream = docker.logs(container_id, Some(options));
        let mut logs = Vec::new();

        while let Some(log_result) = log_stream.next().await {
            match log_result {
                Ok(log_output) => {
                    let log_str = log_output.to_string();
                    logs.push(log_str);
                }
                Err(e) => {
                    log::warn!("Error reading log line: {}", e);
                }
            }
        }

        Ok(ContainerLogs {
            container_id: container_id.to_string(),
            logs,
            timestamp: chrono::Utc::now().timestamp(),
        })
    }

    /// Convert Bollard's ContainerInspectResponse to our ContainerDetails
    fn convert_to_container_details(
        &self,
        container: ContainerInspectResponse,
    ) -> Result<ContainerDetails> {
        let id = container.id.unwrap_or_default();
        let name = container
            .name
            .unwrap_or_default()
            .trim_start_matches('/')
            .to_string();

        let config = container.config.unwrap_or_default();
        let image = config.image.unwrap_or_else(|| "unknown".to_string());
        let env = config.env.unwrap_or_default();

        let state_info = container.state.unwrap_or_default();
        let state = ContainerState {
            status: state_info.status.map(|s| s.to_string()).unwrap_or_else(|| "unknown".to_string()),
            running: state_info.running.unwrap_or(false),
            paused: state_info.paused.unwrap_or(false),
            restarting: state_info.restarting.unwrap_or(false),
            dead: state_info.dead.unwrap_or(false),
            pid: state_info.pid.unwrap_or(0),
            exit_code: state_info.exit_code.unwrap_or(0),
            error: state_info.error.unwrap_or_default(),
            started_at: state_info.started_at.unwrap_or_default(),
            finished_at: state_info.finished_at.unwrap_or_default(),
        };

        let status = format!(
            "{} ({})",
            state.status,
            if state.running { "running" } else { "stopped" }
        );

        let created = container.created.unwrap_or_default();

        // Parse ports
        let network_settings = container.network_settings.unwrap_or_default();
        let ports_map = network_settings.ports.unwrap_or_default();
        let mut ports = Vec::new();

        for (port_key, port_bindings) in ports_map {
            let parts: Vec<&str> = port_key.split('/').collect();
            if let Some(port_str) = parts.first() {
                if let Ok(private_port) = port_str.parse::<u16>() {
                    let port_type = parts.get(1).unwrap_or(&"tcp").to_string();

                    if let Some(bindings) = port_bindings {
                        for binding in bindings {
                            ports.push(PortMapping {
                                private_port,
                                public_port: binding.host_port.as_ref().and_then(|p| p.parse().ok()),
                                r#type: port_type.clone(),
                                ip: binding.host_ip.clone(),
                            });
                        }
                    } else {
                        // No binding, just add the private port
                        ports.push(PortMapping {
                            private_port,
                            public_port: None,
                            r#type: port_type,
                            ip: None,
                        });
                    }
                }
            }
        }

        // Parse labels
        let labels = config.labels.unwrap_or_default();

        // Parse mounts
        let mounts_vec = container.mounts.unwrap_or_default();
        let mounts = mounts_vec
            .into_iter()
            .map(|mount| MountInfo {
                source: mount.source.unwrap_or_default(),
                destination: mount.destination.unwrap_or_default(),
                mode: mount.mode.unwrap_or_default(),
                rw: mount.rw.unwrap_or(false),
            })
            .collect();

        // Parse network settings
        let ip_address = network_settings
            .ip_address
            .unwrap_or_else(|| "".to_string());
        let gateway = network_settings.gateway.unwrap_or_else(|| "".to_string());
        let mac_address = network_settings
            .mac_address
            .unwrap_or_else(|| "".to_string());

        let networks_map = network_settings.networks.unwrap_or_default();
        let mut networks = HashMap::new();

        for (network_name, network_config) in networks_map {
            networks.insert(
                network_name,
                NetworkInfo {
                    network_id: network_config.network_id.unwrap_or_default(),
                    ip_address: network_config.ip_address.unwrap_or_default(),
                    gateway: network_config.gateway.unwrap_or_default(),
                },
            );
        }

        let network_settings_detail = NetworkSettings {
            ip_address,
            gateway,
            mac_address,
            networks,
        };

        Ok(ContainerDetails {
            id,
            name,
            image,
            status,
            state,
            created,
            ports,
            labels,
            env,
            mounts,
            network_settings: network_settings_detail,
        })
    }
}
