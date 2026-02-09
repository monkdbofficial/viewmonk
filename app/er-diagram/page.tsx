'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Database, RefreshCw } from 'lucide-react';
import { useActiveConnection } from '../lib/monkdb-context';
import { useSchemaMetadata } from '../lib/hooks/useSchemaMetadata';
import { useToast } from '../components/ToastContext';
import SimpleERDiagram from '../components/er-diagram/SimpleERDiagram';
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
      console.log('📊 Found tables:', tableNames);
      const tableMetadata: TableMetadata[] = [];

      // For each table, fetch columns and constraints
      for (const tableName of tableNames) {
        console.log(`🔍 Fetching columns for table: ${selectedSchema}.${tableName}`);

        // Try SHOW COLUMNS first, fallback to information_schema
        let columnsResult;
        let usingShowColumns = true;

        try {
          // Get columns using SHOW COLUMNS (MonkDB-native command)
          columnsResult = await activeConnection.client.query(`
            SHOW COLUMNS FROM ${tableName} IN ${selectedSchema}
          `);
        } catch (err) {
          console.warn(`SHOW COLUMNS failed for ${tableName}, trying information_schema:`, err);
          usingShowColumns = false;

          // Fallback to information_schema.columns
          columnsResult = await activeConnection.client.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_schema = '${selectedSchema}'
              AND table_name = '${tableName}'
            ORDER BY ordinal_position
          `);
        }

        console.log(`📋 Columns result for ${tableName}:`, {
          method: usingShowColumns ? 'SHOW COLUMNS' : 'information_schema',
          cols: columnsResult.cols,
          rowCount: columnsResult.rows.length,
          firstRow: columnsResult.rows[0]
        });

        // Parse the Key column to identify primary keys
        const pkColumns = new Set<string>();

        if (usingShowColumns) {
          // SHOW COLUMNS returns: Field, Type, Null, Key, Default, Extra
          columnsResult.rows.forEach((row: any[]) => {
            const key = row[3]; // Key column
            if (key && (key === 'PRI' || key.includes('PRI'))) {
              pkColumns.add(row[0]); // Field column
            }
          });
        } else {
          // For information_schema, assume 'id' column is primary key
          const hasIdColumn = columnsResult.rows.some((row: any[]) => row[0] === 'id');
          if (hasIdColumn) {
            pkColumns.add('id');
          }
        }

        // Get foreign keys - MonkDB doesn't support full FK metadata in information_schema
        // We'll use naming convention detection instead
        const fkMap = new Map<string, { table: string; column: string }>();

        // Infer foreign keys from column names
        // Common patterns: user_id -> users.id, product_id -> products.id
        columnsResult.rows.forEach((row: any[]) => {
          const columnName = row[0];

          // Detect FK by naming convention: *_id or *Id
          if (columnName.endsWith('_id') || (columnName.endsWith('Id') && columnName !== 'id')) {
            // Extract table name: user_id -> users, userId -> users
            let referencedTable = columnName.replace(/_id$/, '').replace(/Id$/, '');

            // Pluralize if needed (simple pluralization)
            if (!tableNames.includes(referencedTable)) {
              const pluralized = referencedTable + 's';
              if (tableNames.includes(pluralized)) {
                referencedTable = pluralized;
              }
            }

            // If we found the referenced table, add to FK map
            if (tableNames.includes(referencedTable)) {
              fkMap.set(columnName, { table: referencedTable, column: 'id' });
            }
          }
        });

        // Map columns based on which query method was used
        const columns = columnsResult.rows.map((row: any[]) => {
          let columnName, dataType, isNullable;

          if (usingShowColumns) {
            // SHOW COLUMNS format: [Field, Type, Null, Key, Default, Extra]
            columnName = row[0]; // Field
            dataType = row[1]; // Type
            isNullable = row[2]; // Null
          } else {
            // information_schema format: [column_name, data_type, is_nullable]
            columnName = row[0];
            dataType = row[1];
            isNullable = row[2];
          }

          const references = fkMap.get(columnName);

          return {
            name: columnName,
            type: dataType,
            nullable: isNullable === 'YES',
            isPrimaryKey: pkColumns.has(columnName),
            isForeignKey: references !== undefined,
            references
          };
        });

        console.log(`✅ Processed ${columns.length} columns for ${tableName}`);

        tableMetadata.push({
          name: tableName,
          columns
        });
      }

      console.log(`🎉 Successfully loaded ${tableMetadata.length} tables:`, tableMetadata.map(t => ({
        name: t.name,
        columnCount: t.columns.length,
        columns: t.columns.map(c => c.name)
      })));

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
    <div className="flex h-full flex-col bg-white dark:bg-gray-950">
      {/* Minimal Header */}
      <div className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Database className="h-7 w-7 text-blue-500" />
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                ER Diagram
              </h1>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Visual database schema explorer
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Schema Selector */}
            <select
              value={selectedSchema}
              onChange={(e) => setSelectedSchema(e.target.value)}
              className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
              className="flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
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
          <div className="flex h-full items-center justify-center bg-white dark:bg-gray-950">
            <div className="text-center">
              <RefreshCw className="mx-auto h-12 w-12 animate-spin text-blue-500" />
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading schema...</p>
            </div>
          </div>
        ) : tables.length === 0 ? (
          <div className="flex h-full items-center justify-center bg-white dark:bg-gray-950">
            <div className="text-center">
              <Database className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-600" />
              <p className="mt-4 text-lg text-gray-700 dark:text-gray-400">No tables found</p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Select a different schema or create some tables
              </p>
            </div>
          </div>
        ) : (
          <SimpleERDiagram
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
