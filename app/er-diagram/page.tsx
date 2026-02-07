'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Database, RefreshCw } from 'lucide-react';
import { useActiveConnection } from '../lib/monkdb-context';
import { useSchemaMetadata } from '../lib/hooks/useSchemaMetadata';
import { useToast } from '../components/ToastContext';
import EnterpriseERDiagram from '../components/er-diagram/EnterpriseERDiagram';
import ConnectionPrompt from '../components/common/ConnectionPrompt';

interface TableMetadata {
  name: string;
  columns: Array<{
    name: string;
    type: string;
    nullable: boolean;
    isPrimaryKey: boolean;
    isForeignKey: boolean;
    references?: { table: string; column: string };
  }>;
}

export default function ERDiagramPage() {
  const router = useRouter();
  const activeConnection = useActiveConnection();
  const { schemas } = useSchemaMetadata();
  const { success, error: showError } = useToast();

  const [selectedSchema, setSelectedSchema] = useState('');
  const [tables, setTables] = useState<TableMetadata[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (schemas.length > 0 && !selectedSchema) {
      setSelectedSchema(schemas[0].name);
    }
  }, [schemas]);

  useEffect(() => {
    if (selectedSchema) {
      fetchSchemaMetadata();
    }
  }, [selectedSchema]);

  const fetchSchemaMetadata = async () => {
    if (!activeConnection || !selectedSchema) return;

    setLoading(true);
    try {
      // Fetch all tables in schema
      const tablesResult = await activeConnection.client.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = ?
          AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `, [selectedSchema]);

      const tableNames = tablesResult.rows.map((row: any[]) => row[0]);
      const tableMetadata: TableMetadata[] = [];

      // For each table, fetch columns and constraints
      for (const tableName of tableNames) {
        // Get columns
        const columnsResult = await activeConnection.client.query(`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_schema = ?
            AND table_name = ?
          ORDER BY ordinal_position
        `, [selectedSchema, tableName]);

        // Get primary keys
        const pkResult = await activeConnection.client.query(`
          SELECT column_name
          FROM information_schema.key_column_usage
          WHERE table_schema = ?
            AND table_name = ?
            AND constraint_name LIKE '%_pkey'
        `, [selectedSchema, tableName]);

        const pkColumns = new Set(pkResult.rows.map((row: any[]) => row[0]));

        // Get foreign keys - Try to detect from column names
        // Note: MonkDB may not have full FK constraint metadata in information_schema
        const fkMap = new Map<string, { table: string; column: string }>();

        try {
          // Try to get foreign keys if available
          const fkResult = await activeConnection.client.query(`
            SELECT
              kcu.column_name,
              kcu.referenced_table_name,
              kcu.referenced_column_name
            FROM information_schema.key_column_usage AS kcu
            WHERE kcu.table_schema = ?
              AND kcu.table_name = ?
              AND kcu.referenced_table_name IS NOT NULL
          `, [selectedSchema, tableName]);

          fkResult.rows.forEach((row: any[]) => {
            if (row[1]) {  // has referenced_table_name
              fkMap.set(row[0], { table: row[1], column: row[2] });
            }
          });
        } catch (err) {
          // Foreign key metadata not available, infer from column names
          // Common patterns: user_id -> users.id, product_id -> products.id
          console.warn('FK metadata not available, using naming convention detection');

          columnsResult.rows.forEach((row: any[]) => {
            const columnName = row[0];

            // Detect FK by naming convention: *_id or *Id
            if (columnName.endsWith('_id') || (columnName.endsWith('Id') && columnName !== 'id')) {
              // Extract table name: user_id -> users, userId -> users
              let tableName = columnName.replace(/_id$/, '').replace(/Id$/, '');

              // Pluralize if needed (simple pluralization)
              if (!tableNames.includes(tableName)) {
                const pluralized = tableName + 's';
                if (tableNames.includes(pluralized)) {
                  tableName = pluralized;
                }
              }

              // If we found the referenced table, add to FK map
              if (tableNames.includes(tableName)) {
                fkMap.set(columnName, { table: tableName, column: 'id' });
              }
            }
          });
        }

        const columns = columnsResult.rows.map((row: any[]) => {
          const columnName = row[0];
          const references = fkMap.get(columnName);

          return {
            name: columnName,
            type: row[1],
            nullable: row[2] === 'YES',
            isPrimaryKey: pkColumns.has(columnName),
            isForeignKey: references !== undefined,
            references
          };
        });

        tableMetadata.push({
          name: tableName,
          columns
        });
      }

      setTables(tableMetadata);
      success('Schema Loaded', `Loaded ${tableMetadata.length} tables`);
    } catch (err: any) {
      console.error('Failed to fetch schema metadata:', err);
      showError('Failed to Load Schema', err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!activeConnection) {
    return <ConnectionPrompt onConnect={() => router.push('/connections')} />;
  }

  return (
    <div className="flex h-full flex-col bg-gray-950">
      {/* Minimal Header */}
      <div className="border-b border-gray-800 bg-gray-900 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Database className="h-7 w-7 text-blue-500" />
            <div>
              <h1 className="text-xl font-bold text-white">
                ER Diagram
              </h1>
              <p className="text-xs text-gray-400">
                Visual database schema explorer
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Schema Selector */}
            <select
              value={selectedSchema}
              onChange={(e) => setSelectedSchema(e.target.value)}
              className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {schemas.map(schema => (
                <option key={schema.name} value={schema.name}>
                  {schema.name}
                </option>
              ))}
            </select>

            {/* Refresh Button */}
            <button
              onClick={fetchSchemaMetadata}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-hidden">
        {loading && tables.length === 0 ? (
          <div className="flex h-full items-center justify-center bg-gray-950">
            <div className="text-center">
              <RefreshCw className="mx-auto h-12 w-12 animate-spin text-blue-500" />
              <p className="mt-4 text-gray-400">Loading schema...</p>
            </div>
          </div>
        ) : tables.length === 0 ? (
          <div className="flex h-full items-center justify-center bg-gray-950">
            <div className="text-center">
              <Database className="mx-auto h-16 w-16 text-gray-600" />
              <p className="mt-4 text-lg text-gray-400">No tables found</p>
              <p className="text-sm text-gray-500">
                Select a different schema or create some tables
              </p>
            </div>
          </div>
        ) : (
          <EnterpriseERDiagram
            tables={tables}
            onTableClick={(tableName) => {
              console.log('Clicked table:', tableName);
            }}
          />
        )}
      </div>
    </div>
  );
}
