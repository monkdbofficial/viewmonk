import type { SchemaSnapshot, SchemaTable, SchemaColumn } from './types';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const EXCLUDED_SCHEMAS = ['information_schema', 'sys', 'pg_catalog', 'blob'];

const NUMERIC_TYPES = ['integer', 'bigint', 'smallint', 'double', 'float', 'decimal', 'real', 'numeric', 'short', 'long', 'money'];
const TIMESTAMP_TYPES = ['timestamp', 'timestamptz', 'timestamp with time zone', 'timestamp without time zone'];
const GEO_TYPES = ['geo_point', 'geo_shape'];
const VECTOR_TYPES = ['float_vector'];

let _cache: SchemaSnapshot | null = null;

function classifyColumn(type: string): Partial<SchemaColumn> {
  const t = type.toLowerCase();
  return {
    isGeo: GEO_TYPES.some(g => t.includes(g)),
    isVector: VECTOR_TYPES.some(v => t.includes(v)),
    isTimestamp: TIMESTAMP_TYPES.some(ts => t.includes(ts)),
    isNumeric: NUMERIC_TYPES.some(n => t.includes(n)),
    isText: t.includes('text') || t.includes('varchar') || t.includes('char'),
  };
}

// ── Fetch from MonkDB ─────────────────────────────────────────────────────────

type QueryFn = (sql: string) => Promise<{ cols: string[]; rows: unknown[][] }>;

export async function refreshSchema(queryFn: QueryFn): Promise<SchemaSnapshot> {
  // Fetch tables
  const tableResult = await queryFn(`
    SELECT table_schema, table_name, number_of_shards
    FROM information_schema.tables
    WHERE table_schema NOT IN (${EXCLUDED_SCHEMAS.map(s => `'${s}'`).join(',')})
      AND table_type = 'BASE TABLE'
    ORDER BY table_schema, table_name
  `);

  const tables: SchemaTable[] = (tableResult.rows as string[][]).map(row => ({
    schema: row[0],
    table: row[1],
    fullName: `${row[0]}.${row[1]}`,
    shards: typeof row[2] === 'number' ? row[2] : undefined,
  }));

  // Fetch columns for all user tables
  const colResult = await queryFn(`
    SELECT table_schema, table_name, column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema NOT IN (${EXCLUDED_SCHEMAS.map(s => `'${s}'`).join(',')})
    ORDER BY table_schema, table_name, ordinal_position
  `);

  const columns: SchemaColumn[] = (colResult.rows as string[][]).map(row => ({
    schema: row[0],
    table: row[1],
    name: row[2],
    type: row[3],
    isNullable: row[4] === 'YES',
    ...classifyColumn(row[3]),
  } as SchemaColumn));

  _cache = { tables, columns, loadedAt: Date.now() };
  return _cache;
}

// ── Accessors ─────────────────────────────────────────────────────────────────

export function getCachedSchema(): SchemaSnapshot | null {
  return _cache;
}

export function isCacheStale(): boolean {
  if (!_cache) return true;
  return Date.now() - _cache.loadedAt > CACHE_TTL_MS;
}

export function clearSchemaCache(): void {
  _cache = null;
}

// ── Lookup helpers ────────────────────────────────────────────────────────────

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (__, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

export function findTableFuzzy(hint: string): SchemaTable | null {
  if (!_cache) return null;
  const h = hint.toLowerCase().replace(/['"]/g, '');

  // Exact match first (table name or full schema.table)
  const exact = _cache.tables.find(t =>
    t.table.toLowerCase() === h ||
    t.fullName.toLowerCase() === h ||
    t.fullName.toLowerCase().replace(/^doc\./, '') === h
  );
  if (exact) return exact;

  // Fuzzy by table name
  let best: SchemaTable | null = null;
  let bestScore = Infinity;
  for (const t of _cache.tables) {
    const dist = levenshtein(h, t.table.toLowerCase());
    if (dist < bestScore && dist <= 3) {
      bestScore = dist;
      best = t;
    }
  }
  return best;
}

export function getTableColumns(schema: string, table: string): SchemaColumn[] {
  if (!_cache) return [];
  return _cache.columns.filter(c => c.schema === schema && c.table === table);
}

export function getNumericColumns(schema: string, table: string): SchemaColumn[] {
  return getTableColumns(schema, table).filter(c => c.isNumeric);
}

export function getTimestampColumns(schema: string, table: string): SchemaColumn[] {
  return getTableColumns(schema, table).filter(c => c.isTimestamp);
}

export function getGeoColumns(schema: string, table: string): SchemaColumn[] {
  return getTableColumns(schema, table).filter(c => c.isGeo);
}

export function getTextColumns(schema: string, table: string): SchemaColumn[] {
  return getTableColumns(schema, table).filter(c => c.isText);
}

export function findColumnFuzzy(schema: string, table: string, hint: string): SchemaColumn | null {
  const cols = getTableColumns(schema, table);
  const h = hint.toLowerCase();
  const exact = cols.find(c => c.name.toLowerCase() === h);
  if (exact) return exact;
  const partial = cols.find(c => c.name.toLowerCase().includes(h) || h.includes(c.name.toLowerCase()));
  return partial ?? null;
}

export function getAllTableNames(): string[] {
  if (!_cache) return [];
  return _cache.tables.map(t => t.table);
}
