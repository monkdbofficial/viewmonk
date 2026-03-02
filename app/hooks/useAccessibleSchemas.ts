/**
 * useAccessibleSchemas Hook
 * Returns only schemas the current user has access to
 * Enterprise-grade: Filters by sys.privileges (MonkDB/CrateDB)
 */

import { useState, useEffect } from 'react';
import { useActiveConnection } from '../lib/monkdb-context';

export interface AccessibleSchema {
  name: string;
  privileges: string[]; // DQL, DML, DDL, AL
}

export function useAccessibleSchemas() {
  const activeConnection = useActiveConnection();
  const [schemas, setSchemas] = useState<AccessibleSchema[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeConnection) {
      setSchemas([]);
      setLoading(false);
      return;
    }

    const fetchAccessibleSchemas = async () => {
      try {
        setLoading(true);
        setError(null);

        const client = activeConnection.client;
        const username = activeConnection.config.username || 'monkdb';

        // Special case: superuser sees all schemas
        const isSuperuser = activeConnection.config.role === 'superuser';

        if (isSuperuser) {
          // Get all schemas
          const allSchemas = await client.query(`
            SELECT schema_name
            FROM information_schema.schemata
            WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'sys')
            ORDER BY schema_name
          `);

          const schemaList = allSchemas.rows.map(row => ({
            name: row[0],
            privileges: ['DQL', 'DML', 'DDL', 'AL'], // Superuser has all
          }));

          setSchemas(schemaList);
        } else {
          // Query accessible schemas based on sys.privileges
          const result = await client.query(`
            SELECT DISTINCT ident, type
            FROM sys.privileges
            WHERE grantee = ?
              AND class = 'SCHEMA'
              AND state = 'GRANT'
              AND ident NOT IN ('information_schema', 'pg_catalog', 'sys')
            ORDER BY ident
          `, [username]);

          // Group privileges by schema
          const schemaMap = new Map<string, string[]>();
          result.rows.forEach(row => {
            const schema = row[0];
            const privilege = row[1];
            if (!schemaMap.has(schema)) {
              schemaMap.set(schema, []);
            }
            schemaMap.get(schema)!.push(privilege);
          });

          const schemaList = Array.from(schemaMap.entries()).map(([name, privileges]) => ({
            name,
            privileges: Array.from(new Set(privileges)), // Deduplicate
          }));

          setSchemas(schemaList);
        }

        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load schemas');
        setSchemas([]);
        setLoading(false);
      }
    };

    fetchAccessibleSchemas();
  }, [activeConnection]);

  return { schemas, loading, error };
}
