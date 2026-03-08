import type { IntentResult, SQLResult } from './types';
import {
  getTableColumns,
  getNumericColumns,
  getTimestampColumns,
  getGeoColumns,
  getTextColumns,
  findColumnFuzzy,
} from './schema-cache';

// ── Safe identifier quoting ───────────────────────────────────────────────────
function qi(s: string): string {
  return `"${s.replace(/"/g, '""')}"`;
}

function qt(schema: string, table: string): string {
  return `${qi(schema)}.${qi(table)}`;
}

// ── Build SQL from intent ─────────────────────────────────────────────────────

export interface BuildResult {
  sql: string;
  explanation: string;
  canExecute: boolean;
  missingInfo?: string;
}

export function buildSQL(intent: IntentResult): BuildResult {
  const { intent: type, params } = intent;

  switch (type) {
    case 'LIST_TABLES':
      return buildListTables();

    case 'DESCRIBE_TABLE':
      return buildDescribeTable(params.schema, params.table);

    case 'COUNT_ROWS':
      return buildCount(params.schema, params.table);

    case 'SELECT_ALL':
      return buildSelectAll(params.schema, params.table, params.limit ?? 50);

    case 'TOP_N_QUERY':
      return buildTopN(params.schema, params.table, params.column, params.limit ?? 10, params.orderDirection ?? 'DESC', params.aggregation);

    case 'AGGREGATE':
      return buildAggregate(params.schema, params.table, params.column, params.aggregation ?? 'AVG');

    case 'TIME_SERIES':
      return buildTimeSeries(params.schema, params.table, params.column, params.interval ?? '1 hour');

    case 'GEO_QUERY':
      return buildGeoSelect(params.schema, params.table);

    case 'VECTOR_SEARCH':
      return buildVectorInfo(params.schema, params.table);

    case 'FILTER_QUERY':
      return buildSelectAll(params.schema, params.table, params.limit ?? 100);

    case 'RAW_SQL':
      return {
        sql: params.rawSql ?? '',
        explanation: 'Executing your SQL directly.',
        canExecute: true,
      };

    default:
      return { sql: '', explanation: '', canExecute: false };
  }
}

// ── Individual builders ───────────────────────────────────────────────────────

function buildListTables(): BuildResult {
  return {
    sql: `SELECT table_schema, table_name, number_of_shards, number_of_replicas
FROM information_schema.tables
WHERE table_schema NOT IN ('information_schema', 'sys', 'pg_catalog', 'blob')
  AND table_type = 'BASE TABLE'
ORDER BY table_schema, table_name`,
    explanation: 'Listing all user tables in the database.',
    canExecute: true,
  };
}

function buildDescribeTable(schema?: string, table?: string): BuildResult {
  if (!schema || !table) {
    return {
      sql: '',
      explanation: '',
      canExecute: false,
      missingInfo: 'table',
    };
  }
  return {
    sql: `SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = '${schema}' AND table_name = '${table}'
ORDER BY ordinal_position`,
    explanation: `Showing columns for **${schema}.${table}**.`,
    canExecute: true,
  };
}

function buildCount(schema?: string, table?: string): BuildResult {
  if (!schema || !table) {
    return { sql: '', explanation: '', canExecute: false, missingInfo: 'table' };
  }
  return {
    sql: `SELECT COUNT(*) AS row_count FROM ${qt(schema, table)}`,
    explanation: `Counting all rows in **${schema}.${table}**.`,
    canExecute: true,
  };
}

function buildSelectAll(schema?: string, table?: string, limit = 50): BuildResult {
  if (!schema || !table) {
    return { sql: '', explanation: '', canExecute: false, missingInfo: 'table' };
  }
  const tsCols = getTimestampColumns(schema, table);
  const orderClause = tsCols.length > 0 ? `ORDER BY ${qi(tsCols[0].name)} DESC` : '';
  return {
    sql: `SELECT * FROM ${qt(schema, table)}\n${orderClause}\nLIMIT ${limit}`,
    explanation: `Showing latest ${limit} rows from **${schema}.${table}**.`,
    canExecute: true,
  };
}

function buildTopN(
  schema?: string,
  table?: string,
  columnHint?: string,
  limit = 10,
  direction: 'ASC' | 'DESC' = 'DESC',
  aggregation?: IntentResult['params']['aggregation'],
): BuildResult {
  if (!schema || !table) {
    return { sql: '', explanation: '', canExecute: false, missingInfo: 'table' };
  }

  const numCols = getNumericColumns(schema, table);
  const textCols = getTextColumns(schema, table);

  // Find the sort column
  let sortCol = columnHint
    ? findColumnFuzzy(schema, table, columnHint)
    : numCols[0] ?? null;
  if (!sortCol) sortCol = numCols[0] ?? null;
  if (!sortCol) {
    return { sql: '', explanation: '', canExecute: false, missingInfo: 'numeric column' };
  }

  // Find a label column
  const labelCol = textCols.find(c =>
    /name|title|label|id|code|key/.test(c.name.toLowerCase())
  ) ?? textCols[0] ?? null;

  const agg = aggregation ?? 'SUM';
  const dir = direction;

  if (labelCol) {
    return {
      sql: `SELECT ${qi(labelCol.name)}, ${agg}(${qi(sortCol.name)}) AS ${agg.toLowerCase()}_${sortCol.name}
FROM ${qt(schema, table)}
GROUP BY ${qi(labelCol.name)}
ORDER BY ${agg.toLowerCase()}_${sortCol.name} ${dir}
LIMIT ${limit}`,
      explanation: `Top ${limit} by **${sortCol.name}** (${agg}) grouped by **${labelCol.name}**.`,
      canExecute: true,
    };
  }

  return {
    sql: `SELECT * FROM ${qt(schema, table)}
ORDER BY ${qi(sortCol.name)} ${dir}
LIMIT ${limit}`,
    explanation: `Top ${limit} rows ordered by **${sortCol.name}** (${dir}).`,
    canExecute: true,
  };
}

function buildAggregate(schema?: string, table?: string, columnHint?: string, agg: string = 'AVG'): BuildResult {
  if (!schema || !table) {
    return { sql: '', explanation: '', canExecute: false, missingInfo: 'table' };
  }

  const numCols = getNumericColumns(schema, table);
  const textCols = getTextColumns(schema, table);
  const tsCols = getTimestampColumns(schema, table);

  const valueCol = (columnHint ? findColumnFuzzy(schema, table, columnHint) : null) ?? numCols[0];
  if (!valueCol) {
    return { sql: '', explanation: '', canExecute: false, missingInfo: 'numeric column' };
  }

  const groupCol = textCols.find(c => /name|title|label|id|code|category|type|status|region/.test(c.name.toLowerCase()))
    ?? textCols[0];

  if (groupCol) {
    return {
      sql: `SELECT ${qi(groupCol.name)}, ${agg}(${qi(valueCol.name)}) AS ${agg.toLowerCase()}_${valueCol.name}
FROM ${qt(schema, table)}
GROUP BY ${qi(groupCol.name)}
ORDER BY ${agg.toLowerCase()}_${valueCol.name} DESC
LIMIT 50`,
      explanation: `${agg} of **${valueCol.name}** grouped by **${groupCol.name}**.`,
      canExecute: true,
    };
  }

  // No group col — just aggregate over whole table
  const allAggs = numCols.slice(0, 4).map(c =>
    `${agg}(${qi(c.name)}) AS ${agg.toLowerCase()}_${c.name}`
  );
  const hasTs = tsCols.length > 0;
  return {
    sql: `SELECT ${allAggs.join(', ')}${hasTs ? `,\n  MIN(${qi(tsCols[0].name)}) AS earliest, MAX(${qi(tsCols[0].name)}) AS latest` : ''}
FROM ${qt(schema, table)}`,
    explanation: `Aggregate stats for **${schema}.${table}**.`,
    canExecute: true,
  };
}

function buildTimeSeries(schema?: string, table?: string, columnHint?: string, interval = '1 hour'): BuildResult {
  if (!schema || !table) {
    return { sql: '', explanation: '', canExecute: false, missingInfo: 'table' };
  }

  const tsCols = getTimestampColumns(schema, table);
  const numCols = getNumericColumns(schema, table);

  if (!tsCols.length) {
    return { sql: '', explanation: '', canExecute: false, missingInfo: 'timestamp column' };
  }
  if (!numCols.length) {
    return { sql: '', explanation: '', canExecute: false, missingInfo: 'numeric column' };
  }

  const tsCol = tsCols[0];
  const valueCol = (columnHint ? findColumnFuzzy(schema, table, columnHint) : null) ?? numCols[0];

  // Build multi-metric aggregations (up to 3 numeric cols)
  const metrics = numCols.slice(0, 3).map(c =>
    `AVG(${qi(c.name)}) AS avg_${c.name}`
  ).join(',\n  ');

  return {
    sql: `SELECT
  time_bucket('${interval}', ${qi(tsCol.name)}) AS bucket,
  ${metrics},
  COUNT(*) AS row_count
FROM ${qt(schema, table)}
WHERE ${qi(tsCol.name)} > NOW() - INTERVAL '24 hours'
GROUP BY 1
ORDER BY 1`,
    explanation: `Time-series view of **${schema}.${table}** bucketed by **${interval}** over the last 24 hours.`,
    canExecute: true,
  };
}

function buildGeoSelect(schema?: string, table?: string): BuildResult {
  if (!schema || !table) {
    return { sql: '', explanation: '', canExecute: false, missingInfo: 'table' };
  }

  const geoCols = getGeoColumns(schema, table);
  if (!geoCols.length) {
    return { sql: '', explanation: '', canExecute: false, missingInfo: 'GEO_POINT column' };
  }

  const geoCol = geoCols[0];
  const otherCols = getTableColumns(schema, table)
    .filter(c => !c.isGeo)
    .slice(0, 6)
    .map(c => qi(c.name));

  return {
    sql: `SELECT
  ${otherCols.join(', ')},
  latitude(${qi(geoCol.name)}) AS latitude,
  longitude(${qi(geoCol.name)}) AS longitude
FROM ${qt(schema, table)}
LIMIT 500`,
    explanation: `Geographic points from **${schema}.${table}** using column **${geoCol.name}**.`,
    canExecute: true,
  };
}

function buildVectorInfo(schema?: string, table?: string): BuildResult {
  if (!schema || !table) {
    return { sql: '', explanation: '', canExecute: false, missingInfo: 'table' };
  }

  const cols = getTableColumns(schema, table);
  const vectorCols = cols.filter(c => c.isVector);

  if (!vectorCols.length) {
    return {
      sql: `SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema = '${schema}' AND table_name = '${table}'
  AND data_type LIKE '%float_vector%'`,
      explanation: `Looking for FLOAT_VECTOR columns in **${schema}.${table}**.`,
      canExecute: true,
    };
  }

  const textCols = getTextColumns(schema, table);
  const displayCols = cols.filter(c => !c.isVector).slice(0, 4).map(c => qi(c.name));
  const vectorCol = vectorCols[0];

  return {
    sql: `-- KNN search example (replace the query vector with your embedding):
SELECT ${displayCols.join(', ')}, _score
FROM ${qt(schema, table)}
WHERE knn_match(${qi(vectorCol.name)}, [0.1, 0.2, 0.3], 10)
ORDER BY _score DESC
LIMIT 10`,
    explanation: `KNN similarity search example for **${schema}.${table}** using vector column **${vectorCol.name}**. Replace the \`[0.1, 0.2, 0.3]\` with your actual query vector.`,
    canExecute: false, // needs real vector values
  };
}

// ── Format SQL result as markdown table (for text display) ───────────────────
export function resultToMarkdown(result: SQLResult): string {
  if (result.rows.length === 0) return '_No rows returned._';
  const header = '| ' + result.cols.join(' | ') + ' |';
  const divider = '| ' + result.cols.map(() => '---').join(' | ') + ' |';
  const rows = result.rows.slice(0, 10).map(row =>
    '| ' + row.map(v => (v === null || v === undefined ? '—' : String(v))).join(' | ') + ' |'
  );
  const truncated = result.rows.length > 10
    ? `\n_Showing 10 of ${result.rows.length} rows_`
    : '';
  return [header, divider, ...rows].join('\n') + truncated;
}
