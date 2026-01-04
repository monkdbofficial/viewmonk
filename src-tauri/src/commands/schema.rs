use crate::state::AppState;
use crate::utils::{DbError, Result};
use serde::{Deserialize, Serialize};
use tauri::State;

/// Schema metadata containing all schemas and tables
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SchemaMetadata {
    pub schemas: Vec<SchemaInfo>,
}

/// Schema information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SchemaInfo {
    pub name: String,
    pub tables: Vec<TableInfo>,
}

/// Table information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TableInfo {
    pub name: String,
    pub columns: Vec<ColumnInfo>,
}

/// Column information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ColumnInfo {
    pub name: String,
    #[serde(rename = "type")]
    pub column_type: String,
    pub nullable: bool,
}

/// Get schema metadata for a connection
#[tauri::command]
pub async fn get_schema_metadata(
    connection_id: String,
    state: State<'_, AppState>,
) -> Result<SchemaMetadata> {
    log::info!("Fetching schema metadata for connection: {}", connection_id);

    // Get the database driver
    let driver = state
        .get_driver(&connection_id)
        .ok_or_else(|| {
            DbError::ValidationError(format!(
                "No driver found for connection: {}",
                connection_id
            ))
        })?;

    // Query to get all schemas (including system catalogs)
    let schema_query = "SELECT schema_name FROM information_schema.schemata
                        WHERE schema_name NOT IN ('pg_catalog')
                        ORDER BY CASE
                            WHEN schema_name = 'sys' THEN 1
                            WHEN schema_name = 'information_schema' THEN 2
                            ELSE 3
                        END, schema_name";

    let schema_rows = driver.execute_query(schema_query).await?;

    let mut schemas = Vec::new();

    for schema_row in schema_rows.rows {
        if let Some(schema_name) = schema_row.get(0).and_then(|v| v.as_str()) {
            log::debug!("Fetching tables for schema: {}", schema_name);

            // Query to get all tables in this schema
            let tables_query = format!(
                "SELECT table_name FROM information_schema.tables
                 WHERE table_schema = '{}' AND table_type = 'BASE TABLE'
                 ORDER BY table_name",
                schema_name
            );

            let table_rows = driver.execute_query(&tables_query).await?;

            let mut tables = Vec::new();

            for table_row in table_rows.rows {
                if let Some(table_name) = table_row.get(0).and_then(|v| v.as_str()) {
                    log::debug!("Fetching columns for table: {}.{}", schema_name, table_name);

                    // Get columns for this table
                    let columns = get_table_columns_internal(
                        &driver,
                        schema_name.to_string(),
                        table_name.to_string(),
                    )
                    .await?;

                    tables.push(TableInfo {
                        name: table_name.to_string(),
                        columns,
                    });
                }
            }

            schemas.push(SchemaInfo {
                name: schema_name.to_string(),
                tables,
            });
        }
    }

    log::info!(
        "Fetched schema metadata: {} schemas, {} total tables",
        schemas.len(),
        schemas.iter().map(|s| s.tables.len()).sum::<usize>()
    );

    Ok(SchemaMetadata { schemas })
}

/// Get columns for a specific table
#[tauri::command]
pub async fn get_table_columns(
    connection_id: String,
    schema: String,
    table: String,
    state: State<'_, AppState>,
) -> Result<Vec<ColumnInfo>> {
    log::info!("Fetching columns for table: {}.{}", schema, table);

    // Get the database driver
    let driver = state
        .get_driver(&connection_id)
        .ok_or_else(|| {
            DbError::ValidationError(format!(
                "No driver found for connection: {}",
                connection_id
            ))
        })?;

    let columns = get_table_columns_internal(&driver, schema, table).await?;

    log::info!("Fetched {} columns", columns.len());

    Ok(columns)
}

/// Internal function to get table columns
async fn get_table_columns_internal(
    driver: &std::sync::Arc<crate::db::PostgresDriver>,
    schema: String,
    table: String,
) -> Result<Vec<ColumnInfo>> {
    let columns_query = format!(
        "SELECT column_name, data_type, is_nullable
         FROM information_schema.columns
         WHERE table_schema = '{}' AND table_name = '{}'
         ORDER BY ordinal_position",
        schema, table
    );

    let column_rows = driver.execute_query(&columns_query).await?;

    let mut columns = Vec::new();

    for column_row in column_rows.rows {
        if let (Some(column_name), Some(data_type), Some(is_nullable)) = (
            column_row.get(0).and_then(|v| v.as_str()),
            column_row.get(1).and_then(|v| v.as_str()),
            column_row.get(2).and_then(|v| v.as_str()),
        ) {
            columns.push(ColumnInfo {
                name: column_name.to_string(),
                column_type: data_type.to_string(),
                nullable: is_nullable.eq_ignore_ascii_case("YES"),
            });
        }
    }

    Ok(columns)
}

/// List all tables in a connection
#[tauri::command]
pub async fn list_tables(
    connection_id: String,
    schema: Option<String>,
    state: State<'_, AppState>,
) -> Result<Vec<String>> {
    log::info!("Listing tables for connection: {}", connection_id);

    // Get the database driver
    let driver = state
        .get_driver(&connection_id)
        .ok_or_else(|| {
            DbError::ValidationError(format!(
                "No driver found for connection: {}",
                connection_id
            ))
        })?;

    let query = if let Some(schema_name) = schema {
        format!(
            "SELECT table_name FROM information_schema.tables
             WHERE table_schema = '{}' AND table_type = 'BASE TABLE'
             ORDER BY table_name",
            schema_name
        )
    } else {
        "SELECT table_name FROM information_schema.tables
         WHERE table_schema NOT IN ('pg_catalog')
         AND table_type = 'BASE TABLE'
         ORDER BY table_name"
            .to_string()
    };

    let result = driver.execute_query(&query).await?;

    let tables: Vec<String> = result
        .rows
        .iter()
        .filter_map(|row| row.get(0).and_then(|v| v.as_str()).map(|s| s.to_string()))
        .collect();

    log::info!("Found {} tables", tables.len());

    Ok(tables)
}

/// List all schemas in a connection
#[tauri::command]
pub async fn list_schemas(
    connection_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<String>> {
    log::info!("Listing schemas for connection: {}", connection_id);

    // Get the database driver
    let driver = state
        .get_driver(&connection_id)
        .ok_or_else(|| {
            DbError::ValidationError(format!(
                "No driver found for connection: {}",
                connection_id
            ))
        })?;

    let query = "SELECT schema_name FROM information_schema.schemata
                 WHERE schema_name NOT IN ('pg_catalog')
                 ORDER BY CASE
                     WHEN schema_name = 'sys' THEN 1
                     WHEN schema_name = 'information_schema' THEN 2
                     ELSE 3
                 END, schema_name";

    let result = driver.execute_query(query).await?;

    let schemas: Vec<String> = result
        .rows
        .iter()
        .filter_map(|row| row.get(0).and_then(|v| v.as_str()).map(|s| s.to_string()))
        .collect();

    log::info!("Found {} schemas", schemas.len());

    Ok(schemas)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_column_info_serialization() {
        let column = ColumnInfo {
            name: "id".to_string(),
            column_type: "INTEGER".to_string(),
            nullable: false,
        };

        let json = serde_json::to_string(&column).unwrap();
        assert!(json.contains("\"name\":\"id\""));
        assert!(json.contains("\"type\":\"INTEGER\""));
    }

    #[test]
    fn test_schema_metadata_structure() {
        let metadata = SchemaMetadata {
            schemas: vec![SchemaInfo {
                name: "public".to_string(),
                tables: vec![TableInfo {
                    name: "users".to_string(),
                    columns: vec![
                        ColumnInfo {
                            name: "id".to_string(),
                            column_type: "INTEGER".to_string(),
                            nullable: false,
                        },
                        ColumnInfo {
                            name: "name".to_string(),
                            column_type: "TEXT".to_string(),
                            nullable: true,
                        },
                    ],
                }],
            }],
        };

        assert_eq!(metadata.schemas.len(), 1);
        assert_eq!(metadata.schemas[0].tables.len(), 1);
        assert_eq!(metadata.schemas[0].tables[0].columns.len(), 2);
    }
}
