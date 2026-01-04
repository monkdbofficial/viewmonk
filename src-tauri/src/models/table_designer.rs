use serde::{Deserialize, Serialize};

/// Column data type
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "UPPERCASE")]
pub enum ColumnType {
    // Numeric types
    Integer,
    Long,
    Short,
    Byte,
    Double,
    Float,
    // String types
    Text,
    Varchar,
    // Boolean
    Boolean,
    // Date/Time
    Timestamp,
    Date,
    Time,
    // Binary
    Blob,
    // JSON
    Object,
    Array,
    // Geo types
    GeoPoint,
    GeoShape,
    // IP
    Ip,
}

/// Column constraint
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "UPPERCASE")]
pub enum ColumnConstraint {
    NotNull,
    Unique,
    PrimaryKey,
}

/// Column definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ColumnDefinition {
    pub name: String,
    pub column_type: ColumnType,
    pub constraints: Vec<ColumnConstraint>,
    pub default_value: Option<String>,
    pub description: Option<String>,
}

/// Partition type
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "UPPERCASE")]
pub enum PartitionType {
    Range,
    List,
    Hash,
}

/// Partition configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PartitionConfig {
    pub enabled: bool,
    pub partition_type: Option<PartitionType>,
    pub partition_column: Option<String>,
}

/// Tier allocation
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum TierAllocation {
    Hot,
    Warm,
    Cold,
}

/// Replication configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReplicationConfig {
    pub number_of_replicas: u32,
    pub tier_allocation: Option<TierAllocation>,
}

/// Sharding configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShardingConfig {
    pub shard_count: u32,
    pub clustering_column: Option<String>,
}

/// Table creation request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateTableRequest {
    pub connection_id: String,
    pub schema_name: String,
    pub table_name: String,
    pub columns: Vec<ColumnDefinition>,
    pub sharding_config: Option<ShardingConfig>,
    pub partition_config: Option<PartitionConfig>,
    pub replication_config: Option<ReplicationConfig>,
}

/// Table creation response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateTableResponse {
    pub success: bool,
    pub table_name: String,
    pub sql: String,
    pub message: String,
}

/// Validation result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationResult {
    pub valid: bool,
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
}

/// SQL generation request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerateSqlRequest {
    pub schema_name: String,
    pub table_name: String,
    pub columns: Vec<ColumnDefinition>,
    pub sharding_config: Option<ShardingConfig>,
    pub partition_config: Option<PartitionConfig>,
    pub replication_config: Option<ReplicationConfig>,
}

impl CreateTableRequest {
    /// Validate the table design
    pub fn validate(&self) -> ValidationResult {
        let mut errors = Vec::new();
        let mut warnings = Vec::new();

        // Validate table name
        if self.table_name.is_empty() {
            errors.push("Table name cannot be empty".to_string());
        }

        // Validate schema name
        if self.schema_name.is_empty() {
            errors.push("Schema name cannot be empty".to_string());
        }

        // Validate columns
        if self.columns.is_empty() {
            errors.push("At least one column is required".to_string());
        }

        // Check for duplicate column names
        let mut column_names = std::collections::HashSet::new();
        for column in &self.columns {
            if !column_names.insert(&column.name) {
                errors.push(format!("Duplicate column name: {}", column.name));
            }
        }

        // Check for primary key
        let has_primary_key = self.columns.iter().any(|col| {
            col.constraints
                .contains(&ColumnConstraint::PrimaryKey)
        });
        if !has_primary_key {
            warnings.push("No primary key defined. It's recommended to define a primary key.".to_string());
        }

        // Validate sharding config
        if let Some(sharding) = &self.sharding_config {
            if sharding.shard_count == 0 {
                errors.push("Shard count must be greater than 0".to_string());
            }
            if sharding.shard_count > 32 {
                warnings.push(
                    "High shard count (>32) may impact performance. Consider using fewer shards."
                        .to_string(),
                );
            }

            if let Some(clustering_col) = &sharding.clustering_column {
                if !self.columns.iter().any(|col| &col.name == clustering_col) {
                    errors.push(format!(
                        "Clustering column '{}' does not exist",
                        clustering_col
                    ));
                }
            }
        }

        // Validate partition config
        if let Some(partition) = &self.partition_config {
            if partition.enabled {
                if partition.partition_type.is_none() {
                    errors.push("Partition type is required when partitioning is enabled".to_string());
                }
                if partition.partition_column.is_none() {
                    errors.push(
                        "Partition column is required when partitioning is enabled".to_string(),
                    );
                }

                if let Some(partition_col) = &partition.partition_column {
                    if !self.columns.iter().any(|col| &col.name == partition_col) {
                        errors.push(format!(
                            "Partition column '{}' does not exist",
                            partition_col
                        ));
                    }
                }
            }
        }

        // Validate replication config
        if let Some(replication) = &self.replication_config {
            if replication.number_of_replicas > 5 {
                warnings.push(
                    "High replica count (>5) may consume significant storage. Consider using fewer replicas."
                        .to_string(),
                );
            }
        }

        ValidationResult {
            valid: errors.is_empty(),
            errors,
            warnings,
        }
    }

    /// Generate SQL for creating the table
    pub fn generate_sql(&self) -> String {
        let mut sql = String::new();

        // CREATE TABLE clause
        sql.push_str(&format!(
            "CREATE TABLE {}.{} (\n",
            self.schema_name, self.table_name
        ));

        // Columns
        for (i, column) in self.columns.iter().enumerate() {
            sql.push_str("  ");
            sql.push_str(&column.name);
            sql.push(' ');
            sql.push_str(&format!("{:?}", column.column_type).to_uppercase());

            // Constraints
            for constraint in &column.constraints {
                sql.push(' ');
                match constraint {
                    ColumnConstraint::NotNull => sql.push_str("NOT NULL"),
                    ColumnConstraint::Unique => sql.push_str("UNIQUE"),
                    ColumnConstraint::PrimaryKey => sql.push_str("PRIMARY KEY"),
                }
            }

            // Default value
            if let Some(default) = &column.default_value {
                sql.push_str(" DEFAULT ");
                sql.push_str(default);
            }

            if i < self.columns.len() - 1 {
                sql.push(',');
            }
            sql.push('\n');
        }

        sql.push(')');

        // Sharding clause
        if let Some(sharding) = &self.sharding_config {
            sql.push_str("\nCLUSTERED INTO ");
            sql.push_str(&sharding.shard_count.to_string());
            sql.push_str(" SHARDS");

            if let Some(clustering_col) = &sharding.clustering_column {
                sql.push_str(" BY (");
                sql.push_str(clustering_col);
                sql.push(')');
            }
        }

        // Partitioning clause
        if let Some(partition) = &self.partition_config {
            if partition.enabled {
                if let Some(partition_col) = &partition.partition_column {
                    sql.push_str("\nPARTITIONED BY (");
                    sql.push_str(partition_col);
                    sql.push(')');
                }
            }
        }

        // Replication clause
        if let Some(replication) = &self.replication_config {
            sql.push_str("\nWITH (");
            sql.push_str(&format!(
                "\n  number_of_replicas = {}",
                replication.number_of_replicas
            ));

            if let Some(tier) = &replication.tier_allocation {
                sql.push_str(",\n  \"routing.allocation.include._tier\" = \"");
                sql.push_str(&format!("{:?}", tier).to_lowercase());
                sql.push('"');
            }

            sql.push_str("\n)");
        }

        sql.push(';');
        sql
    }
}
