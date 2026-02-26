import { TableDesign, ColumnDefinition } from './TableDesignerWizard';

/**
 * Generate MonkDB CREATE TABLE SQL from table design
 */
export function generateCreateTableSQL(design: TableDesign): string {
  const parts: string[] = [];
  const schema = design.schema_name;
  const table  = design.table_name;

  // Header
  parts.push(`CREATE TABLE IF NOT EXISTS "${schema}"."${table}" (`);

  // ── Column definitions ────────────────────────────────────────────────
  const pkCols = design.columns.filter(c => c.constraints.includes('PRIMARY KEY') && c.name.trim());
  const compositePk = pkCols.length > 1;

  const colDefs = design.columns.map(col => '  ' + generateColumnDef(col, compositePk));

  // Composite PK table-level constraint (only when > 1 PK column)
  if (compositePk) {
    colDefs.push(`  PRIMARY KEY (${pkCols.map(c => `"${c.name.trim()}"`).join(', ')})`);
  }

  parts.push(colDefs.join(',\n'));
  parts.push(')');

  // ── PARTITIONED BY ────────────────────────────────────────────────────
  if (design.partition_config?.enabled && design.partition_config?.partition_column) {
    parts.push(`PARTITIONED BY ("${design.partition_config.partition_column}")`);
  }

  // ── CLUSTERED ─────────────────────────────────────────────────────────
  const shardCount = design.sharding_config?.shard_count || 6;
  if (design.sharding_config?.clustering_column) {
    parts.push(`CLUSTERED BY ("${design.sharding_config.clustering_column}") INTO ${shardCount} SHARDS`);
  } else {
    parts.push(`CLUSTERED INTO ${shardCount} SHARDS`);
  }

  // ── WITH clause ───────────────────────────────────────────────────────
  const withParams: string[] = [];

  const replicas = design.replication_config?.number_of_replicas ?? 1;
  withParams.push(`number_of_replicas = '${replicas}'`);

  const refreshInterval = design.refresh_interval ?? 1000;
  withParams.push(`refresh_interval = ${refreshInterval}`);

  if (design.column_policy && design.column_policy !== 'strict') {
    withParams.push(`column_policy = '${design.column_policy}'`);
  }

  parts.push(`WITH (${withParams.join(', ')})`);

  return parts.join('\n');
}

/**
 * Generate a single column definition SQL fragment
 */
function generateColumnDef(col: ColumnDefinition, compositePk: boolean): string {
  const parts: string[] = [];
  const name = col.name.trim();

  // name + type
  parts.push(`"${name}" ${col.column_type}`);

  // Generated column (mutually exclusive with DEFAULT)
  if (col.generated_expression && col.generated_expression.trim()) {
    parts.push(`GENERATED ALWAYS AS (${col.generated_expression.trim()})`);
  } else if (col.default_value && col.default_value.trim()) {
    const sanitized = sanitizeDefaultValue(col.default_value, col.column_type);
    parts.push(`DEFAULT ${sanitized}`);
  }

  // Inline PRIMARY KEY (only for single-PK tables — composite goes table-level)
  if (!compositePk && col.constraints.includes('PRIMARY KEY')) {
    parts.push('PRIMARY KEY');
  }

  // NOT NULL (skip when PRIMARY KEY already implies it)
  if (col.constraints.includes('NOT NULL') && !col.constraints.includes('PRIMARY KEY')) {
    parts.push('NOT NULL');
  }

  // NULL explicit
  if (col.constraints.includes('NULL') && !col.constraints.includes('PRIMARY KEY')) {
    parts.push('NULL');
  }

  // UNIQUE (syntactically valid in MonkDB but not enforced at DB level)
  if (col.constraints.includes('UNIQUE')) {
    parts.push('UNIQUE');
  }

  // Index method
  if (col.index_method === 'OFF') {
    parts.push('INDEX OFF');
  } else if (col.index_method === 'PLAIN') {
    parts.push('INDEX USING PLAIN');
  } else if (col.index_method === 'FULLTEXT') {
    const analyzer = col.index_analyzer || 'standard';
    parts.push(`INDEX USING FULLTEXT WITH (analyzer = '${analyzer}')`);
  }

  // CHECK constraint
  if (col.constraints.includes('CHECK') && col.check_expression && col.check_expression.trim()) {
    parts.push(`CHECK (${col.check_expression.trim()})`);
  }

  return parts.join(' ');
}

/**
 * Sanitize a default value for SQL output
 */
function sanitizeDefaultValue(value: string, columnType: string): string {
  const v  = value.trim();
  const ut = columnType.toUpperCase();

  if (v.includes('(') && v.includes(')')) return v; // function call
  if (/^-?\d+(\.\d+)?$/.test(v)) return v;           // number
  if (v.toLowerCase() === 'true' || v.toLowerCase() === 'false') return v.toUpperCase();
  if (v.toUpperCase() === 'NULL') return 'NULL';

  // Already quoted
  if ((v.startsWith("'") && v.endsWith("'")) || (v.startsWith('"') && v.endsWith('"'))) {
    return `'${v.slice(1, -1).replace(/'/g, "''")}'`;
  }

  if (ut.includes('TEXT') || ut.includes('VARCHAR') || ut.includes('CHAR') || ut.includes('STRING')) {
    return `'${v.replace(/'/g, "''")}'`;
  }

  if (ut.includes('TIMESTAMP') || ut.includes('DATE') || ut.includes('TIME')) {
    const uv = v.toUpperCase();
    if (['NOW', 'CURRENT_TIMESTAMP', 'CURRENT_DATE', 'CURRENT_TIME'].includes(uv)) return `${uv}()`;
    return `'${v.replace(/'/g, "''")}'`;
  }

  if (/^[a-zA-Z_]/.test(v)) return `'${v.replace(/'/g, "''")}'`;

  return v;
}

// ─── Validation ───────────────────────────────────────────────────────────────
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

  if (!design.schema_name?.trim()) errors.push('Schema name is required');

  if (!design.table_name?.trim()) {
    errors.push('Table name is required');
  } else if (existingTables?.length) {
    const exists = existingTables.some(
      t =>
        t.schema.toLowerCase() === design.schema_name.toLowerCase() &&
        t.name.toLowerCase() === design.table_name.trim().toLowerCase(),
    );
    if (exists) warnings.push(`Table "${design.schema_name}.${design.table_name}" already exists`);
  }

  if (design.columns.length === 0) errors.push('At least one column is required');

  // Duplicate column names
  const nameCount: Record<string, number> = {};
  for (const col of design.columns) {
    const n = col.name?.trim();
    if (n) nameCount[n.toLowerCase()] = (nameCount[n.toLowerCase()] ?? 0) + 1;
  }
  const dups = Object.keys(nameCount).filter(k => nameCount[k] > 1);
  if (dups.length > 0) errors.push(`Duplicate column name${dups.length > 1 ? 's' : ''}: ${dups.join(', ')}`);

  design.columns.forEach((col, idx) => {
    const n = col.name?.trim() || '';
    if (!n) errors.push(`Column ${idx + 1}: name is required`);
    if (!col.column_type) errors.push(`Column "${n || idx + 1}": type is required`);

    if (col.column_type === 'FLOAT_VECTOR') {
      warnings.push(`Column "${n}": specify a dimension, e.g. FLOAT_VECTOR(384)`);
    }

    if (col.generated_expression?.trim() && col.default_value?.trim()) {
      errors.push(`Column "${n}": cannot combine GENERATED ALWAYS AS with DEFAULT`);
    }

    if (col.constraints.includes('CHECK') && !col.check_expression?.trim()) {
      errors.push(`Column "${n}": CHECK constraint requires an expression`);
    }

    if (col.index_method === 'FULLTEXT' && !col.index_analyzer) {
      warnings.push(`Column "${n}": no analyzer for FULLTEXT — using 'standard'`);
    }

    if (col.default_value?.trim() && !col.generated_expression?.trim()) {
      const dv = col.default_value.trim();
      if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(dv)) {
        const reserved = ['true', 'false', 'null', 'now', 'current_timestamp', 'current_date', 'current_time'];
        if (!reserved.includes(dv.toLowerCase())) {
          warnings.push(`Column "${n}": default "${dv}" — did you mean '${dv}' (string) or ${dv}() (function)?`);
        }
      }
    }
  });

  // PK validation — composite PKs are fully valid in MonkDB
  const pkCols = design.columns.filter(c => c.constraints.includes('PRIMARY KEY') && c.name.trim());
  if (pkCols.length === 0) {
    warnings.push('No primary key — consider adding one for performance and data integrity');
  } else if (pkCols.length > 1) {
    warnings.push(`Composite PK across ${pkCols.length} columns: ${pkCols.map(c => c.name.trim()).join(', ')}`);
  }

  // Sharding
  const sc = design.sharding_config?.shard_count || 6;
  if (sc < 1) errors.push('Shard count must be at least 1');
  if (sc > 32) warnings.push('Shard count > 32 may increase overhead');

  if (design.sharding_config?.clustering_column) {
    const found = design.columns.some(c => c.name.trim() === design.sharding_config?.clustering_column);
    if (!found) errors.push(`Clustering column "${design.sharding_config.clustering_column}" not found`);
  }

  // Partitioning
  if (design.partition_config?.enabled) {
    if (!design.partition_config.partition_column) {
      errors.push('Partition column is required when partitioning is enabled');
    } else {
      const pc = design.columns.find(c => c.name.trim() === design.partition_config?.partition_column);
      if (!pc) {
        errors.push(`Partition column "${design.partition_config.partition_column}" not found`);
      } else if (/^(OBJECT|ARRAY)/.test(pc.column_type.toUpperCase())) {
        errors.push(`Partition column "${pc.name.trim()}" cannot be OBJECT or ARRAY type`);
      }
    }
  }

  // Replication
  const rep = design.replication_config?.number_of_replicas ?? 1;
  if (rep < 0) errors.push('Replicas cannot be negative');
  if (rep === 0) warnings.push('Zero replicas — no fault tolerance');
  if (rep > 5) warnings.push('> 5 replicas increases storage and network overhead');

  return { valid: errors.length === 0, errors, warnings };
}

export function formatSQL(sql: string): string {
  return sql.split('\n').map(l => l.trimEnd()).join('\n');
}
