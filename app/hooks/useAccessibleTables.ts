/**
 * useAccessibleTables Hook
 * Returns only tables in a schema that the current user has access to
 * Enterprise-grade: Filters by sys.privileges (MonkDB/CrateDB)
 */

import { useState, useEffect } from 'react';
import { useActiveConnection } from '../lib/monkdb-context';

export interface AccessibleTable {
  name: string;
  schema: string;
  privileges: string[]; // DQL, DML, DDL, AL
}

export function useAccessibleTables(schemaName: string) {
  const activeConnection = useActiveConnection();
  const [tables, setTables] = useState<AccessibleTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeConnection || !schemaName) {
      setTables([]);
      setLoading(false);
      return;
    }

    const fetchAccessibleTables = async () => {
      try {
        setLoading(true);
        setError(null);

        const client = activeConnection.client;
        const username = activeConnection.config.username || 'monkdb';

        console.log('[useAccessibleTables] Fetching tables for schema:', schemaName, 'user:', username);

        // Special case: superuser sees all tables
        const isSuperuser = activeConnection.config.role === 'superuser';

        if (isSuperuser) {
          console.log('[useAccessibleTables] User is superuser, fetching all tables');

          // Get all tables in schema
          const allTables = await client.getTables(schemaName);

          const tableList = allTables.map(table => ({
            name: table.table_name,
            schema: schemaName,
            privileges: ['DQL', 'DML', 'DDL', 'AL'], // Superuser has all
          }));

          console.log('[useAccessibleTables] Superuser tables:', tableList.length);
          setTables(tableList);
        } else {
          console.log('[useAccessibleTables] User is NOT superuser, filtering by privileges');

          // Query accessible tables based on sys.privileges
          const result = await client.query(`
            SELECT DISTINCT ident, type
            FROM sys.privileges
            WHERE grantee = ?
              AND class = 'TABLE'
              AND state = 'GRANT'
              AND ident LIKE ?
            ORDER BY ident
          `, [username, `${schemaName}.%`]);

          console.log('[useAccessibleTables] Privilege rows:', result.rows.length);

          // Group privileges by table
          const tableMap = new Map<string, string[]>();
          result.rows.forEach(row => {
            const fullTableName = row[0]; // Format: schema.table
            const privilege = row[1];
            const tableName = fullTableName.split('.')[1]; // Extract table name
            if (!tableMap.has(tableName)) {
              tableMap.set(tableName, []);
            }
            tableMap.get(tableName)!.push(privilege);
          });

          const tableList = Array.from(tableMap.entries()).map(([name, privileges]) => ({
            name,
            schema: schemaName,
            privileges: Array.from(new Set(privileges)), // Deduplicate
          }));

          console.log('[useAccessibleTables] Accessible tables:', tableList.length);
          setTables(tableList);
        }

        setLoading(false);
      } catch (err) {
        console.error('[useAccessibleTables] Error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load tables');
        setTables([]);
        setLoading(false);
      }
    };

    fetchAccessibleTables();
  }, [activeConnection, schemaName]);

  return { tables, loading, error };
}
