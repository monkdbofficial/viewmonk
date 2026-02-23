import { TableDesign, ColumnDefinition } from './TableDesignerWizard';

/**
 * Generate MonkDB CREATE TABLE SQL from table design
 */
export function generateCreateTableSQL(design: TableDesign): string {
  const parts: string[] = [];

  // Start CREATE TABLE
  parts.push(`CREATE TABLE IF NOT EXISTS ${design.schema_name}.${design.table_name} (`);

  // Generate column definitions
  const columnDefs = design.columns.map((col) => generateColumnDefinition(col));
  parts.push('  ' + columnDefs.join(',\n  '));

  parts.push(')');

  // Add PARTITIONED BY clause if enabled
  if (design.partition_config?.enabled && design.partition_config?.partition_column) {
    parts.push(`PARTITIONED BY (${design.partition_config.partition_column})`);
  }

  // Add CLUSTERED clause
  const shardCount = design.sharding_config?.shard_count || 6;
  if (design.sharding_config?.clustering_column) {
    parts.push(
      `CLUSTERED BY (${design.sharding_config.clustering_column}) INTO ${shardCount} SHARDS`
    );
  } else {
    parts.push(`CLUSTERED INTO ${shardCount} SHARDS`);
  }

  // Add WITH clause for table parameters
  const withParams: string[] = [];

  // Replication configuration
  const replicas = design.replication_config?.number_of_replicas ?? 2;
  withParams.push(`number_of_replicas = '${replicas}'`);

  // Add other table parameters
  withParams.push(`refresh_interval = 1000`); // Default 1 second refresh

  if (withParams.length > 0) {
    parts.push(`WITH (${withParams.join(', ')})`);
  }

  return parts.join('\n');
}

/**
 * Sanitize default value based on column type
 * Note: This function assumes value is non-empty after trimming
 */
function sanitizeDefaultValue(value: string, columnType: string): string {
  const trimmedValue = value.trim();
  const upperType = columnType.toUpperCase();

  // Check if it's already a function call (contains parentheses)
  if (trimmedValue.includes('(') && trimmedValue.includes(')')) {
    return trimmedValue; // NOW(), CURRENT_TIMESTAMP(), gen_random_uuid(), etc.
  }

  // Check if it's a number
  if (/^-?\d+(\.\d+)?$/.test(trimmedValue)) {
    return trimmedValue; // 0, 123, -45.67, etc.
  }

  // Check if it's a boolean
  if (trimmedValue.toLowerCase() === 'true' || trimmedValue.toLowerCase() === 'false') {
    return trimmedValue.toUpperCase(); // TRUE or FALSE
  }

  // Check if it's NULL
  if (trimmedValue.toUpperCase() === 'NULL') {
    return 'NULL';
  }

  // Check if it's already quoted
  if (
    (trimmedValue.startsWith("'") && trimmedValue.endsWith("'")) ||
    (trimmedValue.startsWith('"') && trimmedValue.endsWith('"'))
  ) {
    // Already quoted, ensure single quotes
    return `'${trimmedValue.slice(1, -1).replace(/'/g, "''")}'`;
  }

  // For TEXT, VARCHAR, CHAR types, add quotes
  if (
    upperType.includes('TEXT') ||
    upperType.includes('VARCHAR') ||
    upperType.includes('CHAR') ||
    upperType.includes('STRING')
  ) {
    return `'${trimmedValue.replace(/'/g, "''")}'`;
  }

  // For TIMESTAMP/DATE types, check for special keywords
  if (
    upperType.includes('TIMESTAMP') ||
    upperType.includes('DATE') ||
    upperType.includes('TIME')
  ) {
    const upperValue = trimmedValue.toUpperCase();
    if (
      upperValue === 'NOW' ||
      upperValue === 'CURRENT_TIMESTAMP' ||
      upperValue === 'CURRENT_DATE' ||
      upperValue === 'CURRENT_TIME'
    ) {
      return `${upperValue}()`;
    }
    // Otherwise treat as string literal
    return `'${trimmedValue.replace(/'/g, "''")}'`;
  }

  // For other types, if it looks like a string, quote it
  if (/^[a-zA-Z_]/.test(trimmedValue)) {
    // Looks like an identifier or keyword, quote it as string
    return `'${trimmedValue.replace(/'/g, "''")}'`;
  }

  // Default: return as-is
  return trimmedValue;
}

/**
 * Generate column definition SQL
 */
function generateColumnDefinition(col: ColumnDefinition): string {
  const parts: string[] = [];

  // Column name and type (trim name to handle any whitespace)
  const columnName = col.name.trim();
  parts.push(`${columnName} ${col.column_type}`);

  // Generated column
  if (col.generated_expression) {
    parts.push(`GENERATED ALWAYS AS (${col.generated_expression})`);
  }

  // Default value (only if not generated and has meaningful value)
  if (col.default_value && col.default_value.trim() && !col.generated_expression) {
    const sanitizedDefault = sanitizeDefaultValue(col.default_value, col.column_type);
    parts.push(`DEFAULT ${sanitizedDefault}`);
  }

  // Constraints
  if (col.constraints.includes('PRIMARY KEY')) {
    parts.push('PRIMARY KEY');
  }

  if (col.constraints.includes('NOT NULL') && !col.constraints.includes('PRIMARY KEY')) {
    parts.push('NOT NULL');
  }

  if (col.constraints.includes('NULL')) {
    parts.push('NULL');
  }

  if (col.constraints.includes('UNIQUE')) {
    parts.push('UNIQUE');
  }

  // Index configuration
  if (col.constraints.includes('INDEX OFF')) {
    parts.push('INDEX OFF');
  } else if (col.constraints.includes('INDEX PLAIN')) {
    parts.push('INDEX USING PLAIN');
  } else if (col.constraints.includes('INDEX FULLTEXT')) {
    const analyzer = col.index_analyzer || 'standard';
    parts.push(`INDEX USING FULLTEXT WITH (analyzer = '${analyzer}')`);
  }

  // Check constraint
  if (col.constraints.includes('CHECK') && col.check_expression) {
    parts.push(`CHECK (${col.check_expression})`);
  }

  return parts.join(' ');
}

/**
 * Validate table design
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateTableDesign(
  design: TableDesign,
  existingTables?: Array<{ schema: string; name: string }>,
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate schema name
  if (!design.schema_name || !design.schema_name.trim()) {
    errors.push('Schema name is required');
  }

  // Validate table name
  if (!design.table_name || !design.table_name.trim()) {
    errors.push('Table name is required');
  } else if (existingTables && existingTables.length > 0) {
    const alreadyExists = existingTables.some(
      t =>
        t.schema.toLowerCase() === design.schema_name.toLowerCase() &&
        t.name.toLowerCase() === design.table_name.trim().toLowerCase(),
    );
    if (alreadyExists) {
      warnings.push(
        `Table "${design.schema_name}.${design.table_name}" already exists — this will fail if you create it`,
      );
    }
  }

  // Validate columns
  if (design.columns.length === 0) {
    errors.push('At least one column is required');
  }

  // Check for duplicate column names
  const nameCount: Record<string, number> = {};
  for (const col of design.columns) {
    const n = col.name?.trim();
    if (n && n.length > 0) {
      const key = n.toLowerCase();
      nameCount[key] = (nameCount[key] ?? 0) + 1;
    }
  }
  const dupNames = Object.keys(nameCount).filter(k => nameCount[k] > 1);
  if (dupNames.length > 0) {
    errors.push(
      `Duplicate column name${dupNames.length > 1 ? 's' : ''}: ${dupNames.join(', ')}`,
    );
  }

  design.columns.forEach((col, idx) => {
    const trimmedName = col.name?.trim() || '';
    if (!trimmedName) {
      errors.push(`Column ${idx + 1}: Column name is required`);
    } else if (col.name !== trimmedName) {
      warnings.push(
        `Column "${col.name}": Column name has leading or trailing whitespace. It will be trimmed to "${trimmedName}"`
      );
    }

    if (!col.column_type) {
      errors.push(`Column "${trimmedName}": Column type is required`);
    }

    // Validate generated column
    if (col.generated_expression && col.default_value) {
      errors.push(
        `Column "${trimmedName}": Cannot have both generated expression and default value`
      );
    }

    // Validate default value
    if (col.default_value && !col.generated_expression) {
      const trimmedDefault = col.default_value.trim();

      // Warn if default looks like it might be trying to reference a column
      if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmedDefault)) {
        // It's a single identifier without quotes or parentheses
        if (
          !['true', 'false', 'null', 'now', 'current_timestamp', 'current_date', 'current_time'].includes(
            trimmedDefault.toLowerCase()
          )
        ) {
          warnings.push(
            `Column "${trimmedName}": Default value "${trimmedDefault}" looks like an identifier. If you meant a string, use quotes: '${trimmedDefault}'. If you meant a function, use parentheses: ${trimmedDefault}()`
          );
        }
      }
    }

    // Validate check constraint
    if (col.constraints.includes('CHECK') && !col.check_expression) {
      errors.push(`Column "${trimmedName}": CHECK constraint requires an expression`);
    }

    // Validate fulltext index
    if (col.constraints.includes('INDEX FULLTEXT') && !col.index_analyzer) {
      warnings.push(`Column "${trimmedName}": No analyzer specified for FULLTEXT index, using default`);
    }
  });

  // Validate primary key
  const primaryKeyColumns = design.columns.filter((col) =>
    col.constraints.includes('PRIMARY KEY')
  );
  if (primaryKeyColumns.length === 0) {
    warnings.push(
      'No primary key defined. Consider adding a primary key for better performance and data integrity'
    );
  }
  if (primaryKeyColumns.length > 1) {
    errors.push(
      'Multiple PRIMARY KEY constraints found. Use a composite primary key or select only one column'
    );
  }

  // Validate sharding
  const shardCount = design.sharding_config?.shard_count || 6;
  if (shardCount < 1) {
    errors.push('Shard count must be at least 1');
  }
  if (shardCount > 32) {
    warnings.push(
      'Shard count exceeds 32. This may impact performance and increase overhead'
    );
  }

  // Validate clustering column
  if (design.sharding_config?.clustering_column) {
    const clusteringCol = design.columns.find(
      (col) => col.name.trim() === design.sharding_config?.clustering_column
    );
    if (!clusteringCol) {
      errors.push(
        `Clustering column "${design.sharding_config.clustering_column}" not found in column definitions`
      );
    }
  }

  // Validate partitioning
  if (design.partition_config?.enabled) {
    if (!design.partition_config.partition_column) {
      errors.push('Partition column is required when partitioning is enabled');
    } else {
      const partitionCol = design.columns.find(
        (col) => col.name.trim() === design.partition_config?.partition_column
      );
      if (!partitionCol) {
        errors.push(
          `Partition column "${design.partition_config.partition_column}" not found in column definitions`
        );
      }
    }
  }

  // Validate replication
  const replicas = design.replication_config?.number_of_replicas ?? 2;
  if (replicas < 0) {
    errors.push('Number of replicas cannot be negative');
  }
  if (replicas > 5) {
    warnings.push('Number of replicas exceeds 5. This may increase storage and network overhead');
  }
  if (replicas === 0) {
    warnings.push(
      'Zero replicas configured. This provides no fault tolerance. Production recommendation: minimum 2 replicas'
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Format SQL for display
 */
export function formatSQL(sql: string): string {
  return sql
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n');
}
