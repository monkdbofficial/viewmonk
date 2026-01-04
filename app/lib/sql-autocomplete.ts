/**
 * SQL Autocomplete Utilities
 * Provides advanced autocomplete logic for SQL queries
 */

import { SchemaMetadata, SchemaInfo, TableInfo, ColumnInfo } from '../components/MonacoSQLEditor';

export interface CompletionContext {
  query: string;
  cursorPosition: number;
  schema?: SchemaMetadata;
}

/**
 * Parse the current SQL context to determine what type of suggestions to show
 */
export function parseQueryContext(context: CompletionContext): 'table' | 'column' | 'keyword' | 'function' {
  const { query, cursorPosition } = context;
  const beforeCursor = query.substring(0, cursorPosition).toUpperCase();

  // Check if we're after FROM, JOIN, UPDATE, INSERT INTO, etc. (table context)
  if (
    beforeCursor.match(/\b(FROM|JOIN|UPDATE|INSERT\s+INTO|DELETE\s+FROM|TABLE)\s+\w*$/i) ||
    beforeCursor.match(/\bJOIN\s+\w*$/i)
  ) {
    return 'table';
  }

  // Check if we're after SELECT, WHERE, SET, VALUES (column context)
  if (
    beforeCursor.match(/\b(SELECT|WHERE|SET|AND|OR|ON|GROUP\s+BY|ORDER\s+BY)\s+\w*$/i) ||
    beforeCursor.match(/\bSELECT\s+.*,\s*\w*$/i)
  ) {
    return 'column';
  }

  // Check if we're in a function call context
  if (beforeCursor.match(/\w+\s*\(\s*\w*$/)) {
    return 'function';
  }

  // Default to keyword
  return 'keyword';
}

/**
 * Get table suggestions based on schema
 */
export function getTableSuggestions(schema: SchemaMetadata): Array<{ label: string; detail: string; documentation?: string }> {
  const suggestions: Array<{ label: string; detail: string; documentation?: string }> = [];

  schema.schemas.forEach((schemaInfo) => {
    schemaInfo.tables.forEach((table) => {
      suggestions.push({
        label: table.name,
        detail: `Table in ${schemaInfo.name}`,
        documentation: `Columns: ${table.columns.map((c) => `${c.name} (${c.type})`).join(', ')}`,
      });
    });
  });

  return suggestions;
}

/**
 * Get column suggestions based on schema and current query context
 */
export function getColumnSuggestions(
  schema: SchemaMetadata,
  currentTable?: string
): Array<{ label: string; detail: string; documentation?: string }> {
  const suggestions: Array<{ label: string; detail: string; documentation?: string }> = [];

  schema.schemas.forEach((schemaInfo) => {
    schemaInfo.tables.forEach((table) => {
      // If current table is specified, only show columns from that table
      if (currentTable && table.name !== currentTable) {
        return;
      }

      table.columns.forEach((column) => {
        suggestions.push({
          label: currentTable ? column.name : `${table.name}.${column.name}`,
          detail: `${column.type}${column.nullable ? ' (nullable)' : ''}`,
          documentation: `Column in ${table.name}`,
        });
      });
    });
  });

  return suggestions;
}

/**
 * Extract table names from the current query
 */
export function extractTableNames(query: string): string[] {
  const tables: string[] = [];
  const upperQuery = query.toUpperCase();

  // Match FROM clause
  const fromMatch = upperQuery.match(/\bFROM\s+(\w+)/gi);
  if (fromMatch) {
    fromMatch.forEach((match) => {
      const tableName = match.replace(/\bFROM\s+/i, '').trim();
      if (tableName) tables.push(tableName);
    });
  }

  // Match JOIN clauses
  const joinMatch = upperQuery.match(/\bJOIN\s+(\w+)/gi);
  if (joinMatch) {
    joinMatch.forEach((match) => {
      const tableName = match.replace(/\bJOIN\s+/i, '').trim();
      if (tableName) tables.push(tableName);
    });
  }

  return [...new Set(tables)];
}

/**
 * MonkDB-specific query templates
 */
export const MONKDB_QUERY_TEMPLATES = {
  // Vector search templates
  vectorKnn: `SELECT id, content, _score
FROM {table}
WHERE knn_match({vector_column}, ?, ?)
ORDER BY _score DESC
LIMIT ?;`,

  vectorSimilarity: `SELECT id, content, vector_similarity({vector_column}, ?) AS similarity
FROM {table}
ORDER BY similarity DESC
LIMIT ?;`,

  // Full-text search templates
  fullTextMatch: `SELECT id, title, content, _score
FROM {table}
WHERE MATCH(content, ?)
ORDER BY _score DESC;`,

  fullTextMultiField: `SELECT id, _score
FROM {table}
WHERE MATCH((title 2.0, description), ?)
ORDER BY _score DESC;`,

  // Geospatial templates
  geoDistance: `SELECT id, distance(location, 'POINT({lon} {lat})') AS dist
FROM {table}
WHERE distance(location, 'POINT({lon} {lat})') < ?
ORDER BY dist;`,

  geoWithin: `SELECT id, name
FROM {table}
WHERE within(location, 'POLYGON((...))');`,

  geoIntersects: `SELECT id, name
FROM {table}
WHERE intersects(shape, 'POLYGON((...))');`,

  // Time-series templates
  timeSeriesAggregation: `SELECT
  DATE_TRUNC('hour', timestamp) AS hour,
  AVG({metric}) AS avg_value,
  MAX({metric}) AS max_value,
  MIN({metric}) AS min_value
FROM {table}
WHERE timestamp > CURRENT_TIMESTAMP - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', timestamp)
ORDER BY hour DESC;`,

  // Document/JSON templates
  objectQuery: `SELECT metadata['city'], metadata['profile']['preferences']['food']
FROM {table};`,

  arrayQuery: `SELECT name, metadata
FROM {table}
WHERE 'skill' = ANY(metadata['skills']);`,

  // EXPLAIN template
  explainQuery: `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
{query}`,
};

/**
 * Format SQL query
 */
export function formatSQL(query: string): string {
  // Basic SQL formatting
  let formatted = query.trim();

  // Add newlines before major keywords
  const keywords = ['SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'OFFSET', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN'];
  keywords.forEach((keyword) => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    formatted = formatted.replace(regex, `\n${keyword}`);
  });

  // Remove leading newline
  formatted = formatted.replace(/^\n/, '');

  // Normalize whitespace
  formatted = formatted.replace(/\s+/g, ' ');
  formatted = formatted.replace(/\n /g, '\n');

  return formatted;
}

/**
 * Validate SQL query for common errors
 */
export function validateSQL(query: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const upperQuery = query.toUpperCase();

  // Check for unmatched parentheses
  const openParens = (query.match(/\(/g) || []).length;
  const closeParens = (query.match(/\)/g) || []).length;
  if (openParens !== closeParens) {
    errors.push('Unmatched parentheses');
  }

  // Check for unmatched quotes
  const singleQuotes = (query.match(/'/g) || []).length;
  if (singleQuotes % 2 !== 0) {
    errors.push('Unmatched single quotes');
  }

  // Check for basic SELECT structure
  if (upperQuery.includes('SELECT') && !upperQuery.includes('FROM')) {
    errors.push('SELECT query missing FROM clause');
  }

  // Check for dangerous operations
  if (upperQuery.includes('DROP TABLE') || upperQuery.includes('TRUNCATE')) {
    errors.push('Warning: Destructive operation detected');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
