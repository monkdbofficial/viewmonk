import { useState, useEffect, useCallback } from 'react';
import { useActiveConnection } from '../monkdb-context';

interface SchemaInfo {
  name: string;
}

interface TableInfo {
  schema: string;
  name: string;
}

interface ColumnInfo {
  schema: string;
  table: string;
  name: string;
  type: string;
}

interface SchemaMetadata {
  schemas: SchemaInfo[];
  tables: TableInfo[];
  columns: ColumnInfo[];
  loading: boolean;
  error: string | null;
}

/**
 * useSchemaMetadata Hook
 *
 * Fetches and caches schema metadata (schemas, tables, columns).
 * Provides filtered methods for specific use cases:
 * - getVectorColumns: Filter columns with FLOAT_VECTOR type
 * - getGeoColumns: Filter columns with GEO_POINT or GEO_SHAPE type
 * - getTablesBySchema: Get tables for a specific schema
 */
export function useSchemaMetadata() {
  const activeConnection = useActiveConnection();
  const [metadata, setMetadata] = useState<SchemaMetadata>({
    schemas: [],
    tables: [],
    columns: [],
    loading: false,
    error: null,
  });

  // Fetch schemas (filtered by user permissions)
  const fetchSchemas = useCallback(async () => {
    if (!activeConnection) return [];

    try {
      // Check if user is superuser
      const currentUserResult = await activeConnection.client.query(`SELECT CURRENT_USER`);
      const currentUser = currentUserResult.rows[0]?.[0];

      const userCheckResult = await activeConnection.client.query(`
        SELECT superuser FROM sys.users WHERE name = ?
      `, [currentUser]);
      const isSuperuser = userCheckResult.rows[0]?.[0] === true;

      if (isSuperuser) {
        // Superuser: see all schemas
        const result = await activeConnection.client.query(`
          SELECT DISTINCT table_schema
          FROM information_schema.tables
          WHERE table_schema NOT IN ('pg_catalog', 'information_schema', 'sys')
          ORDER BY table_schema
        `);
        return result.rows.map((row: any[]) => ({ name: row[0] }));
      } else {
        // Regular user: filter by privileges from sys.privileges
        const result = await activeConnection.client.query(`
          SELECT DISTINCT ident
          FROM sys.privileges
          WHERE grantee = ?
            AND class = 'SCHEMA'
            AND state = 'GRANT'
            AND ident NOT IN ('pg_catalog', 'information_schema', 'sys')
          ORDER BY ident
        `, [currentUser]);
        return result.rows.map((row: any[]) => ({ name: row[0] }));
      }
    } catch (err) {
      console.error('Failed to fetch schemas:', err);
      return [];
    }
  }, [activeConnection]);

  // Fetch tables (filtered by user permissions)
  const fetchTables = useCallback(async () => {
    if (!activeConnection) return [];

    try {
      // Check if user is superuser
      const currentUserResult = await activeConnection.client.query(`SELECT CURRENT_USER`);
      const currentUser = currentUserResult.rows[0]?.[0];

      const userCheckResult = await activeConnection.client.query(`
        SELECT superuser FROM sys.users WHERE name = ?
      `, [currentUser]);
      const isSuperuser = userCheckResult.rows[0]?.[0] === true;

      if (isSuperuser) {
        // Superuser: see all tables
        const result = await activeConnection.client.query(`
          SELECT table_schema, table_name
          FROM information_schema.tables
          WHERE table_schema NOT IN ('pg_catalog', 'information_schema', 'sys')
            AND table_type = 'BASE TABLE'
          ORDER BY table_schema, table_name
        `);
        return result.rows.map((row: any[]) => ({
          schema: row[0],
          name: row[1],
        }));
      } else {
        // Regular user: filter by privileges from sys.privileges
        const result = await activeConnection.client.query(`
          SELECT DISTINCT ident
          FROM sys.privileges
          WHERE grantee = ?
            AND class = 'TABLE'
            AND state = 'GRANT'
          ORDER BY ident
        `, [currentUser]);

        // Parse schema.table format
        return result.rows
          .map((row: any[]) => {
            const fullTableName = row[0];
            const parts = fullTableName.split('.');
            if (parts.length === 2) {
              return { schema: parts[0], name: parts[1] };
            }
            return null;
          })
          .filter((table): table is TableInfo => table !== null &&
            !['pg_catalog', 'information_schema', 'sys'].includes(table.schema));
      }
    } catch (err) {
      console.error('Failed to fetch tables:', err);
      return [];
    }
  }, [activeConnection]);

  // Fetch columns (filtered by accessible tables)
  const fetchColumns = useCallback(async (accessibleTables: TableInfo[]) => {
    if (!activeConnection || accessibleTables.length === 0) return [];

    try {
      // Build WHERE clause to only fetch columns from accessible tables
      const tableConditions = accessibleTables
        .map(() => `(table_schema = ? AND table_name = ?)`)
        .join(' OR ');

      const params = accessibleTables.flatMap(t => [t.schema, t.name]);

      const result = await activeConnection.client.query(`
        SELECT table_schema, table_name, column_name, data_type
        FROM information_schema.columns
        WHERE (${tableConditions})
        ORDER BY table_schema, table_name, ordinal_position
      `, params);

      return result.rows.map((row: any[]) => ({
        schema: row[0],
        table: row[1],
        name: row[2],
        type: row[3],
      }));
    } catch (err) {
      console.error('Failed to fetch columns:', err);
      return [];
    }
  }, [activeConnection]);

  // Load all metadata
  const loadMetadata = useCallback(async () => {
    if (!activeConnection) {
      setMetadata({
        schemas: [],
        tables: [],
        columns: [],
        loading: false,
        error: 'No active database connection',
      });
      return;
    }

    setMetadata(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Fetch schemas and tables first
      const [schemas, tables] = await Promise.all([
        fetchSchemas(),
        fetchTables(),
      ]);

      // Then fetch columns only for accessible tables
      const columns = await fetchColumns(tables);

      setMetadata({
        schemas,
        tables,
        columns,
        loading: false,
        error: null,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load metadata';
      setMetadata(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
    }
  }, [activeConnection, fetchSchemas, fetchTables, fetchColumns]);

  // Load metadata when connection changes
  useEffect(() => {
    loadMetadata();
  }, [loadMetadata]);

  // Filter methods
  const getVectorColumns = useCallback(() => {
    return metadata.columns.filter(col =>
      col.type.toUpperCase().includes('FLOAT_VECTOR')
    );
  }, [metadata.columns]);

  const getGeoColumns = useCallback(() => {
    return metadata.columns.filter(col => {
      const upperType = col.type.toUpperCase();
      return upperType.includes('GEO_POINT') || upperType.includes('GEO_SHAPE');
    });
  }, [metadata.columns]);

  const getTablesBySchema = useCallback((schema: string) => {
    return metadata.tables.filter(table => table.schema === schema);
  }, [metadata.tables]);

  const getColumnsByTable = useCallback((schema: string, table: string) => {
    return metadata.columns.filter(
      col => col.schema === schema && col.table === table
    );
  }, [metadata.columns]);

  return {
    ...metadata,
    refresh: loadMetadata,
    getVectorColumns,
    getGeoColumns,
    getTablesBySchema,
    getColumnsByTable,
  };
}
