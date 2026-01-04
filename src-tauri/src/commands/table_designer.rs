use crate::audit::{AuditEvent, AuditEventType};
use crate::models::table_designer::{
    CreateTableRequest, CreateTableResponse, GenerateSqlRequest, ValidationResult,
};
use crate::state::AppState;
use crate::utils::error::{DbError, Result};
use tauri::State;

/// Generate SQL for table creation
#[tauri::command]
pub async fn generate_table_sql(request: GenerateSqlRequest) -> Result<String> {
    log::debug!("Generating SQL for table: {}.{}", request.schema_name, request.table_name);

    // Convert GenerateSqlRequest to CreateTableRequest for SQL generation
    let create_request = CreateTableRequest {
        connection_id: String::new(), // Not needed for SQL generation
        schema_name: request.schema_name,
        table_name: request.table_name,
        columns: request.columns,
        sharding_config: request.sharding_config,
        partition_config: request.partition_config,
        replication_config: request.replication_config,
    };

    let sql = create_request.generate_sql();
    Ok(sql)
}

/// Validate table design
#[tauri::command]
pub async fn validate_table_design(request: CreateTableRequest) -> Result<ValidationResult> {
    log::debug!("Validating table design: {}.{}", request.schema_name, request.table_name);

    let validation = request.validate();
    Ok(validation)
}

/// Create table with advanced configuration
#[tauri::command]
pub async fn create_table_advanced(
    request: CreateTableRequest,
    state: State<'_, AppState>,
) -> Result<CreateTableResponse> {
    log::info!(
        "Creating advanced table: {}.{} on connection {}",
        request.schema_name,
        request.table_name,
        request.connection_id
    );

    // Validate the request
    let validation = request.validate();
    if !validation.valid {
        return Err(DbError::ValidationError(format!(
            "Invalid table design: {}",
            validation.errors.join(", ")
        )));
    }

    // Generate SQL
    let sql = request.generate_sql();

    // Get the database driver
    let driver = state
        .get_driver(&request.connection_id)
        .ok_or_else(|| {
            DbError::ValidationError(format!(
                "No driver found for connection: {}",
                request.connection_id
            ))
        })?;

    // Execute the SQL
    driver.execute_query(&sql).await?;

    // Log audit event
    let _ = state.audit.log_event(AuditEvent::new(
        AuditEventType::QueryExecuted,
        Some(request.connection_id.clone()),
        Some(format!("{}.{}", request.schema_name, request.table_name)),
        format!("Created table {}.{}", request.schema_name, request.table_name),
        true,
        None,
        serde_json::json!({
            "sql": sql,
            "schema": request.schema_name,
            "table": request.table_name,
            "columns": request.columns.len(),
            "sharding": request.sharding_config.is_some(),
            "partitioning": request.partition_config.as_ref().map(|p| p.enabled).unwrap_or(false),
            "replication": request.replication_config.is_some(),
        }),
    ));

    Ok(CreateTableResponse {
        success: true,
        table_name: request.table_name.clone(),
        sql,
        message: format!(
            "Table {}.{} created successfully",
            request.schema_name, request.table_name
        ),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::table_designer::{
        ColumnConstraint, ColumnDefinition, ColumnType, PartitionConfig, PartitionType,
        ReplicationConfig, ShardingConfig, TierAllocation,
    };

    #[test]
    fn test_generate_basic_table_sql() {
        let request = GenerateSqlRequest {
            schema_name: "public".to_string(),
            table_name: "users".to_string(),
            columns: vec![
                ColumnDefinition {
                    name: "id".to_string(),
                    column_type: ColumnType::Integer,
                    constraints: vec![ColumnConstraint::PrimaryKey],
                    default_value: None,
                    description: None,
                },
                ColumnDefinition {
                    name: "name".to_string(),
                    column_type: ColumnType::Text,
                    constraints: vec![ColumnConstraint::NotNull],
                    default_value: None,
                    description: None,
                },
            ],
            sharding_config: None,
            partition_config: None,
            replication_config: None,
        };

        let create_request = CreateTableRequest {
            connection_id: String::new(),
            schema_name: request.schema_name,
            table_name: request.table_name,
            columns: request.columns,
            sharding_config: request.sharding_config,
            partition_config: request.partition_config,
            replication_config: request.replication_config,
        };

        let sql = create_request.generate_sql();
        assert!(sql.contains("CREATE TABLE public.users"));
        assert!(sql.contains("id INTEGER PRIMARY KEY"));
        assert!(sql.contains("name TEXT NOT NULL"));
    }

    #[test]
    fn test_generate_advanced_table_sql() {
        let request = CreateTableRequest {
            connection_id: String::new(),
            schema_name: "public".to_string(),
            table_name: "events".to_string(),
            columns: vec![
                ColumnDefinition {
                    name: "id".to_string(),
                    column_type: ColumnType::Integer,
                    constraints: vec![ColumnConstraint::PrimaryKey],
                    default_value: None,
                    description: None,
                },
                ColumnDefinition {
                    name: "timestamp".to_string(),
                    column_type: ColumnType::Timestamp,
                    constraints: vec![],
                    default_value: Some("CURRENT_TIMESTAMP".to_string()),
                    description: None,
                },
            ],
            sharding_config: Some(ShardingConfig {
                shard_count: 4,
                clustering_column: Some("id".to_string()),
            }),
            partition_config: Some(PartitionConfig {
                enabled: true,
                partition_type: Some(PartitionType::Range),
                partition_column: Some("timestamp".to_string()),
            }),
            replication_config: Some(ReplicationConfig {
                number_of_replicas: 1,
                tier_allocation: Some(TierAllocation::Hot),
            }),
        };

        let sql = request.generate_sql();
        assert!(sql.contains("CREATE TABLE public.events"));
        assert!(sql.contains("CLUSTERED INTO 4 SHARDS BY (id)"));
        assert!(sql.contains("PARTITIONED BY (timestamp)"));
        assert!(sql.contains("number_of_replicas = 1"));
        assert!(sql.contains("routing.allocation.include._tier"));
        assert!(sql.contains("hot"));
    }

    #[test]
    fn test_validate_table_design() {
        let request = CreateTableRequest {
            connection_id: "test".to_string(),
            schema_name: "public".to_string(),
            table_name: "test_table".to_string(),
            columns: vec![ColumnDefinition {
                name: "id".to_string(),
                column_type: ColumnType::Integer,
                constraints: vec![ColumnConstraint::PrimaryKey],
                default_value: None,
                description: None,
            }],
            sharding_config: Some(ShardingConfig {
                shard_count: 4,
                clustering_column: Some("id".to_string()),
            }),
            partition_config: None,
            replication_config: None,
        };

        let validation = request.validate();
        assert!(validation.valid);
        assert!(validation.errors.is_empty());
    }

    #[test]
    fn test_validate_invalid_clustering_column() {
        let request = CreateTableRequest {
            connection_id: "test".to_string(),
            schema_name: "public".to_string(),
            table_name: "test_table".to_string(),
            columns: vec![ColumnDefinition {
                name: "id".to_string(),
                column_type: ColumnType::Integer,
                constraints: vec![ColumnConstraint::PrimaryKey],
                default_value: None,
                description: None,
            }],
            sharding_config: Some(ShardingConfig {
                shard_count: 4,
                clustering_column: Some("nonexistent".to_string()),
            }),
            partition_config: None,
            replication_config: None,
        };

        let validation = request.validate();
        assert!(!validation.valid);
        assert!(validation
            .errors
            .iter()
            .any(|e| e.contains("Clustering column")));
    }
}
