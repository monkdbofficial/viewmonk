'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from './ToastContext';
import { useActiveConnection } from '../lib/monkdb-context';
import { useQueryTabs } from '../lib/query-tabs-context';
import { useSavedViews } from '../lib/saved-views-context';
import { useSchema } from '../contexts/schema-context';
import MonacoSQLEditor, { SchemaMetadata } from './MonacoSQLEditor';
import DroppableMonacoEditor from './DroppableMonacoEditor';
import SchemaExplorer from './SchemaExplorer';
import SavedQueries from './SavedQueries';
import ExplainVisualizer from './ExplainVisualizer';
import SQLDocumentation from './SQLDocumentation';
import ConnectionPrompt from './common/ConnectionPrompt';
import { invoke } from '@tauri-apps/api/core';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import {
  Database,
  Loader2,
  AlertCircle,
  Download,
  Copy,
  History,
  BookOpen,
  Book,
  Zap,
  FileText,
  Trash2,
  Play,
  BarChart3,
  BookmarkIcon,
  SaveIcon,
  PlusIcon,
  XIcon,
  ChevronUp,
  ChevronDown,
  Keyboard,
  Wand2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

type ViewMode = 'table' | 'json';
type SidebarTab = 'templates' | 'history' | 'schema' | 'docs';

interface QueryHistoryItem {
  id: string;
  query: string;
  timestamp: number;
  duration: number;
  rowcount: number;
  success: boolean;
  error?: string;
}

interface SchemaTable {
  schema: string;
  table: string;
  columns?: string[];
}

export default function QueryEditor() {
  const router = useRouter();
  const queryTabs = useQueryTabs();
  const { activeTab, updateTab, createTab, closeTab, switchTab, tabs, renameTab } = queryTabs;
  const { addRecentQuery } = useSavedViews();
  const { activeSchema } = useSchema();

  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [isExecuting, setIsExecuting] = useState(false);
  const [queryHistory, setQueryHistory] = useState<QueryHistoryItem[]>([]);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('history');
  const [schemaTables, setSchemaTables] = useState<SchemaTable[]>([]);
  const [loadingSchema, setLoadingSchema] = useState(false);
  const [schemaMetadata, setSchemaMetadata] = useState<SchemaMetadata | undefined>(undefined);
  const [schemaExplorerMetadata, setSchemaExplorerMetadata] = useState<any>(undefined);
  const [showSavedQueries, setShowSavedQueries] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveQueryData, setSaveQueryData] = useState({
    name: '',
    description: '',
    folder: '',
    tags: '',
  });
  const [sortConfig, setSortConfig] = useState<{col: string, dir: 'asc'|'desc'} | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showDocsModal, setShowDocsModal] = useState(false);
  const [renamingTabId, setRenamingTabId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Guard against infinite schema loading
  const isLoadingSchemaRef = useRef(false);

  const toast = useToast();
  const activeConnection = useActiveConnection();

  // Derived state from active tab
  const query = activeTab?.query || '';
  const results = activeTab?.results || { cols: [], rows: [], rowcount: 0 };
  const error = activeTab?.error || null;
  const executionStats = activeTab?.executionStats || { executionTime: 0, returnedDocs: 0 };

  // Check if current query is an EXPLAIN query
  const isExplainQuery = query.trim().toUpperCase().startsWith('EXPLAIN');
  const isExplainAnalyze = query.trim().toUpperCase().includes('EXPLAIN') &&
                           query.trim().toUpperCase().includes('ANALYZE');

  // Check if current query is a data modification query
  const upperQuery = query.trim().toUpperCase();
  const isModificationQuery = upperQuery.startsWith('INSERT') ||
                              upperQuery.startsWith('UPDATE') ||
                              upperQuery.startsWith('DELETE');

  // Check if query is DDL (Data Definition Language) - CREATE, ALTER, DROP, TRUNCATE
  const isDDLQuery = upperQuery.startsWith('CREATE') ||
                     upperQuery.startsWith('ALTER') ||
                     upperQuery.startsWith('DROP') ||
                     upperQuery.startsWith('TRUNCATE');

  // Combined: queries that should show success panel instead of results table
  const isNonSelectQuery = isModificationQuery || isDDLQuery;

  // Helper function to convert technical errors to user-friendly messages
  const parseErrorMessage = (rawError: string): { title: string; message: string; suggestions: string[] } => {
    // RelationUnknown - Table doesn't exist
    if (rawError.includes('RelationUnknown') || rawError.includes('Relation') && rawError.includes('unknown')) {
      const tableMatch = rawError.match(/Relation '([^']+)' unknown/i) || rawError.match(/RelationUnknown\[Relation '([^']+)'/i);
      const tableName = tableMatch ? tableMatch[1] : 'table';

      return {
        title: '❌ Table Not Found',
        message: `The table "${tableName}" does not exist in the database.`,
        suggestions: [
          `Make sure you created the table first using: CREATE TABLE ${tableName} (...)`,
          `Check if the table name is spelled correctly`,
          `Verify the schema name (e.g., "demo.${tableName.split('.').pop()}")`,
          `View available tables in the Schema Explorer (left sidebar)`
        ]
      };
    }

    // ColumnUnknown - Column doesn't exist
    if (rawError.includes('ColumnUnknown') || rawError.includes('Column') && rawError.includes('unknown')) {
      const columnMatch = rawError.match(/Column '([^']+)' unknown/i) || rawError.match(/ColumnUnknown\[([^\]]+)\]/i);
      const columnName = columnMatch ? columnMatch[1] : 'column';

      return {
        title: '❌ Column Not Found',
        message: `The column "${columnName}" does not exist in the table.`,
        suggestions: [
          `Check if the column name is spelled correctly`,
          `Use "SELECT * FROM table LIMIT 1" to see available columns`,
          `Verify column was created in the table schema`,
          `Check the Schema Explorer for correct column names`
        ]
      };
    }

    // DuplicateKey - Primary key or unique constraint violation
    if (rawError.includes('DuplicateKey') || rawError.includes('duplicate key') || rawError.includes('already exists')) {
      return {
        title: '❌ Duplicate Entry',
        message: `A record with this primary key or unique value already exists.`,
        suggestions: [
          `Change the ID or unique field to a different value`,
          `Check existing data: SELECT * FROM table WHERE id = your_value`,
          `Use UPDATE instead of INSERT if you want to modify existing data`,
          `Delete the existing record first if you want to replace it`
        ]
      };
    }

    // SQLParseException - Syntax error
    if (rawError.includes('SQLParseException') || rawError.includes('syntax error') || rawError.includes('mismatched input')) {
      const lineMatch = rawError.match(/line (\d+):(\d+)/i);
      const location = lineMatch ? ` at line ${lineMatch[1]}, column ${lineMatch[2]}` : '';

      return {
        title: '❌ SQL Syntax Error',
        message: `There is a syntax error in your SQL query${location}.`,
        suggestions: [
          `Check for missing commas, parentheses, or semicolons`,
          `Make sure all SQL keywords are spelled correctly`,
          `Remove any extra characters (like triple backticks from markdown code blocks)`,
          `Verify table and column names are properly quoted if needed`,
          `Use the SQL Templates in the sidebar for correct syntax examples`
        ]
      };
    }

    // ValidationException - Invalid data type or value
    if (rawError.includes('ValidationException') || rawError.includes('invalid') || rawError.includes('cannot be cast')) {
      return {
        title: '❌ Invalid Data Type',
        message: `The data you're trying to insert doesn't match the column type.`,
        suggestions: [
          `Check that numbers are not in quotes (use 123, not '123')`,
          `Verify date/timestamp format: '2020-01-15' or CURRENT_TIMESTAMP`,
          `Make sure text values are in single quotes: 'text here'`,
          `Check column data types in the Schema Explorer`
        ]
      };
    }

    // NullValue - NOT NULL constraint violation
    if (rawError.includes('NullValue') || rawError.includes('NOT NULL') || rawError.includes('null value')) {
      const columnMatch = rawError.match(/column '([^']+)'/i);
      const columnName = columnMatch ? columnMatch[1] : 'a required column';

      return {
        title: '❌ Missing Required Value',
        message: `The column "${columnName}" cannot be NULL - you must provide a value.`,
        suggestions: [
          `Add a value for "${columnName}" in your INSERT or UPDATE statement`,
          `Check which columns are marked as NOT NULL in the table schema`,
          `Provide a default value or remove the NOT NULL constraint`
        ]
      };
    }

    // Connection errors
    if (rawError.includes('ECONNREFUSED') || rawError.includes('connection refused') || rawError.includes('network')) {
      return {
        title: '❌ Database Connection Failed',
        message: `Cannot connect to the MonkDB server.`,
        suggestions: [
          `Make sure MonkDB server is running on the configured host and port`,
          `Check your connection settings in the Connections page`,
          `Verify firewall is not blocking the connection`,
          `Try reconnecting from the Connections page`
        ]
      };
    }

    // Timeout errors
    if (rawError.includes('timeout') || rawError.includes('ETIMEDOUT')) {
      return {
        title: '❌ Query Timeout',
        message: `The query took too long to execute and was cancelled.`,
        suggestions: [
          `Try adding a LIMIT clause to reduce the number of rows`,
          `Add a WHERE clause to filter data more specifically`,
          `Consider creating an index on frequently queried columns`,
          `Break complex queries into smaller steps`
        ]
      };
    }

    // OperationOnInaccessibleRelation - Blob tables don't support SQL DML
    if (rawError.includes('OperationOnInaccessibleRelation') || rawError.includes("doesn't support or allow")) {
      const tableMatch = rawError.match(/relation "([^"]+)"/i);
      const tableName = tableMatch ? tableMatch[1] : 'blob table';
      const opMatch = rawError.match(/allow (\w+) operations/i);
      const operation = opMatch ? opMatch[1].toUpperCase() : 'DML';

      return {
        title: '❌ Blob Table Cannot Use SQL DML',
        message: `The table "${tableName}" is a blob table and does not support SQL ${operation} operations. Blobs are managed via the HTTP API, not SQL.`,
        suggestions: [
          `Use the Blob Storage page to delete files through the UI`,
          `To delete a specific blob via HTTP: DELETE /_blobs/${tableName.split('.').pop()}/{sha1_hash}`,
          `To list blobs: SELECT digest, last_modified FROM blob.${tableName.split('.').pop()}`,
          `Blob tables only support SELECT — use the Blob Storage page for uploads and deletes`
        ]
      };
    }

    // Permission errors
    if (rawError.includes('permission') || rawError.includes('unauthorized') || rawError.includes('access denied')) {
      return {
        title: '❌ Permission Denied',
        message: `You don't have permission to perform this operation.`,
        suggestions: [
          `Check your database user permissions`,
          `Contact your database administrator for access`,
          `Verify you're connected with the correct user account`
        ]
      };
    }

    // Generic fallback with original error
    return {
      title: '❌ Query Execution Failed',
      message: rawError,
      suggestions: [
        `Check the error message above for specific details`,
        `Review your SQL syntax and table/column names`,
        `Use the SQL Templates for example queries`,
        `Check the Schema Explorer to verify available tables and columns`
      ]
    };
  };

  // Update query in active tab
  const setQuery = (newQuery: string) => {
    if (activeTab) {
      // Check if there are previous execution results BEFORE updating the query
      const hasPreviousResults = (activeTab.results?.cols?.length > 0) || (activeTab.executionStats?.executionTime > 0);

      // Check if query actually changed - compare EXACT strings (including whitespace)
      // This ensures even typing one character triggers clearing
      const queryChanged = activeTab.query !== newQuery;

      // IMPORTANT: Clear results and stats when query changes to prevent showing old success messages
      // This ensures "Completed" status only shows AFTER executing, not while typing
      if (queryChanged && hasPreviousResults) {
        // Single atomic update: change query AND clear results simultaneously
        updateTab(activeTab.id, {
          query: newQuery,
          results: { cols: [], rows: [], rowcount: 0 },
          executionStats: { executionTime: 0, returnedDocs: 0 },
          error: null
        });
      } else {
        // Just update the query text (no previous results to clear)
        updateTab(activeTab.id, { query: newQuery });
      }
    }
  };

  // Set results in active tab
  const setResults = (newResults: any) => {
    if (activeTab) {
      updateTab(activeTab.id, { results: newResults });
    }
  };

  // Set error in active tab
  const setError = (newError: string | null) => {
    if (activeTab) {
      updateTab(activeTab.id, { error: newError });
    }
  };

  // Set execution stats in active tab
  const setExecutionStats = (stats: { executionTime: number; returnedDocs: number }) => {
    if (activeTab) {
      updateTab(activeTab.id, { executionStats: stats });
    }
  };

  // Load query history from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('monkdb_query_history');
    if (stored) {
      try {
        setQueryHistory(JSON.parse(stored));
      } catch {
        // ignore malformed localStorage entry
      }
    }
  }, []);

  // Save query history to localStorage
  const saveQueryHistory = (history: QueryHistoryItem[]) => {
    try {
      localStorage.setItem('monkdb_query_history', JSON.stringify(history.slice(0, 50)));
    } catch {
      // storage quota exceeded — in-memory history still works
    }
    setQueryHistory(history);
  };

  // Load schema metadata for autocomplete with retry and fallback
  const loadSchemaMetadata = useCallback(async () => {
    if (!activeConnection) return;

    // Prevent concurrent schema loading
    if (isLoadingSchemaRef.current) return;

    isLoadingSchemaRef.current = true;
    setLoadingSchema(true);

    // Safety net: guarantee the ref is always released even on unexpected throws
    const releaseRef = () => {
      isLoadingSchemaRef.current = false;
      setLoadingSchema(false);
    };

    // Retry configuration
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000; // 1 second

    // Helper function to wait
    const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // Try Tauri-based loading with retry
    if (typeof window !== 'undefined' && window.__TAURI__) {
      let shouldRetry = true;

      for (let attempt = 1; attempt <= MAX_RETRIES && shouldRetry; attempt++) {
        try {
          const metadata = await invoke<SchemaMetadata>('get_schema_metadata', {
            connectionId: activeConnection.id,
          });
          setSchemaMetadata(metadata);

          // Transform metadata for SchemaExplorer
          const transformedMetadata = {
            schemas: metadata.schemas.map((schema) => ({
              name: schema.name,
              tables: schema.tables.map((table) => ({
                name: table.name,
                schema: schema.name,
                columns: table.columns.map((column) => ({
                  name: column.name,
                  type: column.type,
                  nullable: column.nullable,
                  isPrimaryKey: false,
                  isForeignKey: false,
                  hasIndex: false,
                })),
                primaryKeys: [],
                foreignKeys: [],
                indexes: [],
              })),
            })),
          };
          setSchemaExplorerMetadata(transformedMetadata);

          toast.success('Schema Loaded', `Loaded ${metadata.schemas.length} schemas`);
          releaseRef();
          return; // Success!
        } catch (err) {
          // Extract error details
          let errorMessage = 'Unknown error';
          let isCommandNotFound = false;

          if (err && typeof err === 'object') {
            // Check for Tauri error format
            if ('message' in err && typeof err.message === 'string') {
              errorMessage = err.message;
            } else if ('error' in err && typeof err.error === 'string') {
              errorMessage = err.error;
            } else {
              errorMessage = JSON.stringify(err);
            }

            // Check if command doesn't exist
            isCommandNotFound = errorMessage.includes('command') &&
                               (errorMessage.includes('not found') || errorMessage.includes('not registered'));
          } else if (err instanceof Error) {
            errorMessage = err.message;
          }

          // If command not found, skip retries and go straight to SQL fallback
          if (isCommandNotFound) {
            shouldRetry = false;
            break;
          }

          if (attempt < MAX_RETRIES) {
            await wait(RETRY_DELAY);
          }
        }
      }
    }

    // Fallback to SQL-based loading - Load complete metadata (schemas, tables, columns)
    try {
      // Load all columns from all tables in user schemas
      const columnsResult = await activeConnection.client.query(`
        SELECT
          table_schema,
          table_name,
          column_name,
          data_type,
          is_nullable,
          ordinal_position
        FROM information_schema.columns
        WHERE table_schema NOT IN ('pg_catalog', 'information_schema', 'sys')
        ORDER BY table_schema, table_name, ordinal_position
      `);

      // Build complete schema metadata structure
      const schemaMap: Record<string, Record<string, any[]>> = {};

      columnsResult.rows.forEach((row: any[]) => {
        const schemaName = row[0];
        const tableName = row[1];
        const columnName = row[2];
        const dataType = row[3];
        const isNullable = row[4] === 'YES';

        // Initialize schema if not exists
        if (!schemaMap[schemaName]) {
          schemaMap[schemaName] = {};
        }

        // Initialize table if not exists
        if (!schemaMap[schemaName][tableName]) {
          schemaMap[schemaName][tableName] = [];
        }

        // Add column
        schemaMap[schemaName][tableName].push({
          name: columnName,
          type: dataType,
          nullable: isNullable,
        });
      });

      // Convert to SchemaMetadata format
      const fallbackMetadata: SchemaMetadata = {
        schemas: Object.entries(schemaMap).map(([schemaName, tables]) => ({
          name: schemaName,
          tables: Object.entries(tables).map(([tableName, columns]) => ({
            name: tableName,
            columns: columns,
          })),
        })),
      };

      setSchemaMetadata(fallbackMetadata);

      // Transform for SchemaExplorer
      const transformedMetadata = {
        schemas: fallbackMetadata.schemas.map((schema) => ({
          name: schema.name,
          tables: schema.tables.map((table) => ({
            name: table.name,
            schema: schema.name,
            columns: table.columns.map((column) => ({
              name: column.name,
              type: column.type,
              nullable: column.nullable,
              isPrimaryKey: false,
              isForeignKey: false,
              hasIndex: false,
            })),
            primaryKeys: [],
            foreignKeys: [],
            indexes: [],
          })),
        })),
      };
      setSchemaExplorerMetadata(transformedMetadata);

      const totalTables = Object.values(schemaMap).reduce((sum, tables) => sum + Object.keys(tables).length, 0);
      const totalColumns = columnsResult.rows.length;

      toast.success('Schema Loaded', `Loaded ${Object.keys(schemaMap).length} schemas, ${totalTables} tables, ${totalColumns} columns`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Could not load schema';
      toast.error('Schema Load Failed', errorMessage);
    } finally {
      releaseRef();
    }
  }, [activeConnection, toast]);

  // Load schema tables
  const loadSchema = useCallback(async () => {
    if (!activeConnection) return;

    setLoadingSchema(true);
    try {
      const result = await activeConnection.client.query(`
        SELECT table_schema, table_name
        FROM information_schema.tables
        WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
          AND table_type = 'BASE TABLE'
        ORDER BY table_schema, table_name
      `);

      const tables: SchemaTable[] = result.rows.map((row: any[]) => ({
        schema: row[0],
        table: row[1],
      }));

      setSchemaTables(tables);
    } catch {
      // silent — UI stays with previous schema state
    } finally {
      setLoadingSchema(false);
    }
  }, [activeConnection]);

  // Load schema metadata when connection changes
  useEffect(() => {
    if (activeConnection) {
      loadSchemaMetadata();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConnection]); // Only run when connection changes, not when function changes

  // Keyboard shortcuts for tab management
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + T: New tab
      if ((e.metaKey || e.ctrlKey) && e.key === 't') {
        e.preventDefault();
        createTab();
      }
      // Cmd/Ctrl + W: Close tab
      else if ((e.metaKey || e.ctrlKey) && e.key === 'w' && activeTab) {
        e.preventDefault();
        closeTab(activeTab.id);
      }
      // Cmd/Ctrl + ]: Next tab
      else if ((e.metaKey || e.ctrlKey) && e.key === ']' && tabs.length > 1) {
        e.preventDefault();
        const currentIndex = tabs.findIndex((t) => t.id === activeTab?.id);
        const nextIndex = (currentIndex + 1) % tabs.length;
        switchTab(tabs[nextIndex].id);
      }
      // Cmd/Ctrl + [: Previous tab
      else if ((e.metaKey || e.ctrlKey) && e.key === '[' && tabs.length > 1) {
        e.preventDefault();
        const currentIndex = tabs.findIndex((t) => t.id === activeTab?.id);
        const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        switchTab(tabs[prevIndex].id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, tabs, createTab, closeTab, switchTab]);

  // Load schema when switching to schema tab
  useEffect(() => {
    if (sidebarTab === 'schema' && !schemaExplorerMetadata) {
      loadSchemaMetadata();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sidebarTab, schemaExplorerMetadata]); // Don't include loadSchemaMetadata to avoid infinite loop

  // Detect dangerous/destructive queries
  const isDangerousQuery = (sql: string): { dangerous: boolean; type: string } => {
    const upperQuery = sql.trim().toUpperCase();
    const dangerousPatterns = [
      { pattern: /^\s*DROP\s+(TABLE|DATABASE|SCHEMA|INDEX)/i, type: 'DROP operation' },
      { pattern: /^\s*DELETE\s+FROM/i, type: 'DELETE operation' },
      { pattern: /^\s*TRUNCATE\s+TABLE/i, type: 'TRUNCATE operation' },
      { pattern: /^\s*ALTER\s+TABLE/i, type: 'ALTER TABLE operation' },
      { pattern: /DELETE\s+FROM\s+\S+\s*;?\s*$/i, type: 'DELETE without WHERE clause' },
      { pattern: /UPDATE\s+\S+\s+SET\s+[^W]+;?\s*$/i, type: 'UPDATE without WHERE clause' },
    ];

    for (const { pattern, type } of dangerousPatterns) {
      if (pattern.test(upperQuery)) {
        return { dangerous: true, type };
      }
    }
    return { dangerous: false, type: '' };
  };

  const handleExecute = async (explainMode: boolean = false) => {
    if (!activeConnection) {
      toast.error('No Connection', 'Please connect to a database first');
      return;
    }

    if (!query.trim()) {
      toast.error('Empty Query', 'Please enter a query to execute');
      return;
    }

    // Warn about dangerous queries
    const { dangerous, type } = isDangerousQuery(query);
    if (dangerous && !explainMode) {
      const confirmed = window.confirm(
        `⚠️ DESTRUCTIVE OPERATION WARNING\n\n` +
        `This query contains a ${type}.\n\n` +
        `This operation may modify or delete data permanently.\n\n` +
        `Are you sure you want to execute this query?\n\n` +
        `Query: ${query.substring(0, 200)}${query.length > 200 ? '...' : ''}`
      );

      if (!confirmed) {
        toast.info('Query Cancelled', 'Dangerous query execution cancelled');
        return;
      }
    }

    setIsExecuting(true);
    // Don't clear error immediately - only clear on success to prevent flash

    const startTime = Date.now();
    let queryToExecute = query.trim();

    // Add EXPLAIN if requested
    if (explainMode && !queryToExecute.toUpperCase().startsWith('EXPLAIN')) {
      queryToExecute = `EXPLAIN ${queryToExecute}`;
    }

    try {
      const result = await activeConnection.client.query(queryToExecute);
      const duration = Date.now() - startTime;

      // Clear error only on successful execution
      setError(null);

      setResults({
        cols: result.cols,
        rows: result.rows,
        rowcount: result.rowcount,
      });

      setExecutionStats({
        executionTime: result.duration || duration,
        returnedDocs: result.rowcount,
      });

      // Add to history
      const historyItem: QueryHistoryItem = {
        id: crypto.randomUUID(),
        query: queryToExecute,
        timestamp: Date.now(),
        duration: result.duration || duration,
        rowcount: result.rowcount,
        success: true,
      };
      saveQueryHistory([historyItem, ...queryHistory]);

      // Add to recent queries (Saved Views)
      addRecentQuery(queryToExecute, result.rowcount, result.duration || duration);

      // Detect query type and show appropriate success message
      const upperQuery = queryToExecute.toUpperCase().trim();
      const queryType = upperQuery.split(/\s+/)[0];

      // Helper function to extract table name from query
      const extractTableName = (q: string) => {
        const match = q.match(/(?:INTO|FROM|TABLE|UPDATE)\s+([a-zA-Z_][a-zA-Z0-9_]*\.?[a-zA-Z_][a-zA-Z0-9_]*)/i);
        return match ? match[1] : null;
      };

      const tableName = extractTableName(queryToExecute);

      // DDL Operations (Data Definition Language)
      if (queryType === 'CREATE') {
        const isTable = upperQuery.includes('CREATE TABLE');
        const isIndex = upperQuery.includes('CREATE INDEX');

        if (isTable) {
          const name = tableName || 'table';
          // Count columns
          const columnMatches = queryToExecute.match(/\([^)]*\)/);
          const columns = columnMatches ? columnMatches[0].split(',').length : 0;
          toast.success(
            `✅ Table "${name}" Created`,
            `Created with ${columns} column${columns !== 1 ? 's' : ''} in ${(result.duration || duration).toFixed(2)}ms. Refresh Schema Explorer to see it.`,
            8000
          );
        } else if (isIndex) {
          toast.success(
            '✅ Index Created Successfully',
            `Index created in ${(result.duration || duration).toFixed(2)}ms`,
            6000
          );
        } else {
          toast.success(
            '✅ CREATE Successful',
            `Object created in ${(result.duration || duration).toFixed(2)}ms. Refresh Schema Explorer to see changes.`,
            6000
          );
        }
      } else if (queryType === 'ALTER') {
        const name = tableName || 'table';
        toast.success(
          `✅ Table "${name}" Altered`,
          `Schema modified in ${(result.duration || duration).toFixed(2)}ms. Refresh Schema Explorer to see changes.`,
          8000
        );
      } else if (queryType === 'DROP') {
        const name = tableName || 'object';
        toast.success(
          `✅ "${name}" Dropped Successfully`,
          `Dropped in ${(result.duration || duration).toFixed(2)}ms. Refresh Schema Explorer to update.`,
          8000
        );
      } else if (queryType === 'TRUNCATE') {
        const name = tableName || 'table';
        toast.success(
          `✅ Table "${name}" Truncated`,
          `All rows removed in ${(result.duration || duration).toFixed(2)}ms`,
          6000
        );
      }
      // DML Operations (Data Manipulation Language)
      else if (queryType === 'INSERT' || queryType === 'UPDATE' || queryType === 'DELETE') {
        const name = tableName || 'table';
        const rowText = result.rowcount === 1 ? 'row' : 'rows';

        if (result.rowcount > 0) {
          let actionText = '';
          if (queryType === 'INSERT') {
            actionText = `Inserted ${result.rowcount} ${rowText} into "${name}"`;
          } else if (queryType === 'UPDATE') {
            actionText = `Updated ${result.rowcount} ${rowText} in "${name}"`;
          } else if (queryType === 'DELETE') {
            actionText = `Deleted ${result.rowcount} ${rowText} from "${name}"`;
          }

          toast.success(
            `✅ ${queryType} Successful`,
            `${actionText} in ${(result.duration || duration).toFixed(2)}ms`,
            8000
          );
        } else {
          toast.success(
            `✅ ${queryType} Executed`,
            `No rows affected in "${name}" (${(result.duration || duration).toFixed(2)}ms)`,
            6000
          );
        }
      }
      // DQL Operations (Data Query Language)
      else {
        const rowText = result.rowcount === 1 ? 'row' : 'rows';
        toast.success(
          '✅ Query Successful',
          `Retrieved ${result.rowcount} ${rowText} in ${(result.duration || duration).toFixed(2)}ms`,
          5000
        );
      }
    } catch (err) {
      const rawError = err instanceof Error ? err.message : 'Query execution failed';
      const parsedError = parseErrorMessage(rawError);

      // Create user-friendly error message with suggestions
      const userFriendlyError = `${parsedError.message}\n\n💡 Suggestions:\n${parsedError.suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;

      setError(userFriendlyError);

      // Add failed query to history with original error
      const historyItem: QueryHistoryItem = {
        id: crypto.randomUUID(),
        query: queryToExecute,
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        rowcount: 0,
        success: false,
        error: parsedError.message,
      };
      saveQueryHistory([historyItem, ...queryHistory]);

      // Show toast with parsed error title and message
      toast.error(parsedError.title, parsedError.message);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleExplain = () => {
    handleExecute(true);
  };

  const exportToCSV = () => {
    if (results.rowcount === 0) {
      toast.error('No Data', 'Execute a query first to export results');
      return;
    }

    const csv = [
      results.cols.join(','),
      ...results.rows.map((row: any[]) =>
        row.map((cell) => {
          if (cell === null) return 'NULL';
          if (typeof cell === 'object') return `"${JSON.stringify(cell).replace(/"/g, '""')}"`;
          if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))) {
            return `"${cell.replace(/"/g, '""')}"`;
          }
          return cell;
        }).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monkdb_export_${Date.now()}.csv`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Exported', 'Results exported to CSV');
  };

  const exportToJSON = () => {
    if (results.rowcount === 0) {
      toast.error('No Data', 'Execute a query first to export results');
      return;
    }

    const data = results.rows.map((row: any[]) => {
      const obj: any = {};
      results.cols.forEach((col: string, idx: number) => {
        obj[col] = row[idx];
      });
      return obj;
    });

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monkdb_export_${Date.now()}.json`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Exported', 'Results exported to JSON');
  };

  const copyToClipboard = async () => {
    if (results.rowcount === 0) {
      toast.error('No Data', 'Execute a query first to copy results');
      return;
    }

    const text = viewMode === 'json'
      ? JSON.stringify({ cols: results.cols, rows: results.rows, rowcount: results.rowcount }, null, 2)
      : results.cols.join('\t') + '\n' + results.rows.map((row: any[]) => row.join('\t')).join('\n');

    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied', 'Results copied to clipboard');
    } catch {
      toast.error('Copy Failed', 'Failed to copy to clipboard');
    }
  };

  const clearHistory = () => {
    if (confirm('Are you sure you want to clear all query history?')) {
      setQueryHistory([]);
      localStorage.removeItem('monkdb_query_history');
      toast.success('Cleared', 'Query history cleared');
    }
  };

  // SQL Formatting
  const formatSQL = (sql: string): string => {
    if (!sql.trim()) return sql;

    // ── Phase 1: Stash string literals & comments ──────────────────────────
    // Protects quoted content from keyword substitution
    const stash: string[] = [];
    let work = '';
    let i = 0;
    while (i < sql.length) {
      // -- single-line comment
      if (sql[i] === '-' && sql[i + 1] === '-') {
        const nl = sql.indexOf('\n', i);
        const end = nl < 0 ? sql.length : nl + 1;
        stash.push(sql.slice(i, end));
        work += `\x01${stash.length - 1}\x01`;
        i = end;
        continue;
      }
      // /* block comment */
      if (sql[i] === '/' && sql[i + 1] === '*') {
        const end = sql.indexOf('*/', i + 2);
        const endPos = end < 0 ? sql.length : end + 2;
        stash.push(sql.slice(i, endPos));
        work += `\x01${stash.length - 1}\x01`;
        i = endPos;
        continue;
      }
      // 'string literal' (handles '' escaped quotes)
      if (sql[i] === "'") {
        let j = i + 1;
        while (j < sql.length) {
          if (sql[j] === "'" && sql[j + 1] === "'") { j += 2; continue; }
          if (sql[j] === "'") { j++; break; }
          j++;
        }
        stash.push(sql.slice(i, j));
        work += `\x01${stash.length - 1}\x01`;
        i = j;
        continue;
      }
      // "quoted identifier"
      if (sql[i] === '"') {
        let j = i + 1;
        while (j < sql.length) {
          if (sql[j] === '"' && sql[j + 1] === '"') { j += 2; continue; }
          if (sql[j] === '"') { j++; break; }
          j++;
        }
        stash.push(sql.slice(i, j));
        work += `\x01${stash.length - 1}\x01`;
        i = j;
        continue;
      }
      work += sql[i++];
    }

    // ── Phase 2: Normalize whitespace ─────────────────────────────────────
    work = work.trim().replace(/\s+/g, ' ');

    // ── Phase 3: Uppercase keywords (longest/most-specific first) ─────────
    const KWS = [
      'SELECT DISTINCT', 'SELECT',
      'INSERT INTO', 'VALUES',
      'UPDATE', 'DELETE FROM',
      'CREATE TABLE IF NOT EXISTS', 'CREATE TABLE',
      'DROP TABLE IF EXISTS', 'DROP TABLE',
      'ALTER TABLE', 'TRUNCATE TABLE',
      'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
      'LEFT OUTER JOIN', 'RIGHT OUTER JOIN', 'FULL OUTER JOIN',
      'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'CROSS JOIN', 'JOIN',
      'FROM', 'WHERE', 'ON', 'SET',
      'GROUP BY', 'HAVING', 'ORDER BY',
      'LIMIT', 'OFFSET',
      'AND', 'OR', 'NOT IN', 'NOT',
      'UNION ALL', 'UNION', 'INTERSECT', 'EXCEPT',
      'AS', 'IN', 'BETWEEN', 'LIKE', 'IS NOT NULL', 'IS NULL',
      'ASC', 'DESC', 'DISTINCT', 'NULL', 'TRUE', 'FALSE',
    ];
    for (const kw of KWS) {
      work = work.replace(new RegExp(`\\b${kw.replace(/ /g, '\\s+')}\\b`, 'gi'), kw);
    }

    // ── Phase 4: Protect commas inside parentheses ─────────────────────────
    // Prevents function-call args like ROUND(x, 2) from being comma-expanded
    const PC = '\x02'; // protected comma placeholder
    let safe = '';
    let depth = 0;
    for (let k = 0; k < work.length; k++) {
      if      (work[k] === '(')               { depth++; safe += '('; }
      else if (work[k] === ')')               { depth--; safe += ')'; }
      else if (work[k] === ',' && depth > 0)  { safe += PC; }
      else                                    { safe += work[k]; }
    }
    work = safe;

    // ── Phase 5: Structural line breaks ────────────────────────────────────
    // Multi-word patterns BEFORE their component single words
    let s = work

      // Set operations
      .replace(/\bUNION ALL\b/g,   '\n\nUNION ALL\n\n')
      .replace(/\bUNION\b/g,       '\n\nUNION\n\n')
      .replace(/\bINTERSECT\b/g,   '\n\nINTERSECT\n\n')
      .replace(/\bEXCEPT\b/g,      '\n\nEXCEPT\n\n')

      // DDL
      .replace(/\bCREATE TABLE IF NOT EXISTS\b/g, '\nCREATE TABLE IF NOT EXISTS ')
      .replace(/\bCREATE TABLE\b/g,   '\nCREATE TABLE ')
      .replace(/\bDROP TABLE IF EXISTS\b/g, '\nDROP TABLE IF EXISTS ')
      .replace(/\bDROP TABLE\b/g,     '\nDROP TABLE ')
      .replace(/\bALTER TABLE\b/g,    '\nALTER TABLE ')
      .replace(/\bTRUNCATE TABLE\b/g, '\nTRUNCATE TABLE ')

      // DML — INSERT
      .replace(/\bINSERT INTO\b/g, '\nINSERT INTO ')
      .replace(/\bVALUES\b/g,      '\nVALUES\n  ')

      // DML — DELETE (must be before standalone FROM)
      .replace(/\bDELETE FROM\b/g, '\nDELETE FROM\n  ')

      // DML — UPDATE
      .replace(/\bUPDATE\b/g, '\nUPDATE ')
      .replace(/\bSET\b/g,    '\nSET\n  ')

      // SELECT
      .replace(/\bSELECT DISTINCT\b/g, '\nSELECT DISTINCT\n  ')
      .replace(/\bSELECT\b/g,          '\nSELECT\n  ')

      // FROM — negative lookbehind prevents double-match inside DELETE FROM
      .replace(/(?<!DELETE )\bFROM\b/g, '\nFROM\n  ')

      // JOINs (specific variants before plain JOIN)
      .replace(/\bLEFT OUTER JOIN\b/g,  '\n  LEFT OUTER JOIN ')
      .replace(/\bRIGHT OUTER JOIN\b/g, '\n  RIGHT OUTER JOIN ')
      .replace(/\bFULL OUTER JOIN\b/g,  '\n  FULL OUTER JOIN ')
      .replace(/\bLEFT JOIN\b/g,        '\n  LEFT JOIN ')
      .replace(/\bRIGHT JOIN\b/g,       '\n  RIGHT JOIN ')
      .replace(/\bINNER JOIN\b/g,       '\n  INNER JOIN ')
      .replace(/\bCROSS JOIN\b/g,       '\n  CROSS JOIN ')
      .replace(/\bJOIN\b/g,             '\n  JOIN ')
      .replace(/\bON\b/g,               '\n    ON ')

      // WHERE / predicates
      .replace(/\bWHERE\b/g, '\nWHERE\n  ')
      .replace(/\bAND\b/g,   '\n  AND ')
      .replace(/\bOR\b/g,    '\n  OR ')

      // Grouping / sorting / pagination
      .replace(/\bGROUP BY\b/g, '\nGROUP BY\n  ')
      .replace(/\bHAVING\b/g,   '\nHAVING\n  ')
      .replace(/\bORDER BY\b/g, '\nORDER BY\n  ')
      .replace(/\bLIMIT\b/g,    '\nLIMIT ')
      .replace(/\bOFFSET\b/g,   '\nOFFSET ')

      // Top-level commas only (depth > 0 commas are protected as \x02)
      .replace(/,\s*/g, ',\n  ')

      // Semicolons on their own line
      .replace(/;\s*/g, ';\n')

      // Trailing whitespace on lines
      .replace(/ +\n/g, '\n')

      // Collapse 3+ blank lines → 1
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    // ── Phase 6: Restore protected commas ─────────────────────────────────
    s = s.replace(/\x02/g, ', ');

    // ── Phase 7: Restore stashed literals ─────────────────────────────────
    for (let j = stash.length - 1; j >= 0; j--) {
      s = s.replace(new RegExp(`\x01${j}\x01`, 'g'), () => stash[j]);
    }

    return s;
  };

  const handleFormatSQL = () => {
    if (!query.trim()) {
      toast.error('Empty Query', 'Please enter a query to format');
      return;
    }

    const formatted = formatSQL(query);
    setQuery(formatted);
    toast.success('Formatted', 'SQL query formatted successfully');
  };

  // Column sorting
  const handleSort = (colIndex: number) => {
    const colName = results.cols[colIndex];
    const newDir = sortConfig?.col === colName && sortConfig?.dir === 'asc' ? 'desc' : 'asc';
    setSortConfig({ col: colName, dir: newDir });
    setCurrentPage(1); // Reset to first page when sorting
  };

  // Sorted and paginated rows
  const sortedRows = useMemo(() => {
    if (!sortConfig || results.rows.length === 0) return results.rows;

    const colIdx = results.cols.indexOf(sortConfig.col);
    const sorted = [...results.rows].sort((a, b) => {
      const aVal = a[colIdx];
      const bVal = b[colIdx];

      // Handle null values
      if (aVal === null && bVal === null) return 0;
      if (aVal === null) return 1;
      if (bVal === null) return -1;

      // Compare based on type
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return aVal - bVal;
      }

      // String comparison
      return String(aVal).localeCompare(String(bVal));
    });

    return sortConfig.dir === 'desc' ? sorted.reverse() : sorted;
  }, [results, sortConfig]);

  const ROWS_PER_PAGE = 100;
  const totalPages = Math.ceil(sortedRows.length / ROWS_PER_PAGE);

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * ROWS_PER_PAGE;
    const end = start + ROWS_PER_PAGE;
    return sortedRows.slice(start, end);
  }, [sortedRows, currentPage]);

  // Reset page when results change
  useEffect(() => {
    setCurrentPage(1);
    setSortConfig(null);
  }, [results]);

  // Tab rename handlers
  const startRename = (tabId: string, currentName: string) => {
    setRenamingTabId(tabId);
    setRenameValue(currentName);
  };

  const saveRename = () => {
    if (renamingTabId && renameValue.trim()) {
      renameTab(renamingTabId, renameValue.trim());
      setRenamingTabId(null);
      setRenameValue('');
    }
  };

  const cancelRename = () => {
    setRenamingTabId(null);
    setRenameValue('');
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveRename();
    } else if (e.key === 'Escape') {
      cancelRename();
    }
  };

  const handleSaveQuery = () => {
    if (!saveQueryData.name.trim()) {
      toast.error('Validation Error', 'Please enter a query name');
      return;
    }

    if (!query.trim()) {
      toast.error('Validation Error', 'No query to save');
      return;
    }

    try {
      const tags = saveQueryData.tags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const now = new Date().toISOString();
      const newEntry = {
        id: `sq_${crypto.randomUUID()}`,
        name: saveQueryData.name.trim(),
        description: saveQueryData.description.trim() || undefined,
        query: query.trim(),
        connection_id: activeConnection?.id,
        folder: saveQueryData.folder.trim() || undefined,
        tags,
        is_favorite: false,
        created_at: now,
        updated_at: now,
        execution_count: 0,
      };

      const existing = JSON.parse(localStorage.getItem('monkdb_saved_queries') || '[]');
      existing.unshift(newEntry);
      localStorage.setItem('monkdb_saved_queries', JSON.stringify(existing));

      toast.success('Saved', `Query "${saveQueryData.name}" saved`);
      setShowSaveDialog(false);
      setSaveQueryData({ name: '', description: '', folder: '', tags: '' });
    } catch {
      toast.error('Save Failed', 'Could not save query');
    }
  };

  // Enterprise-Grade MonkDB Query Templates
  // Production-ready examples covering all MonkDB features
  const queryTemplates = [
    {
      category: '📋 System Information',
      queries: [
        {
          name: 'List All Tables',
          sql: `-- List all tables with shard and replica information
SELECT
  table_schema AS "Schema",
  table_name AS "Table",
  table_type AS "Type",
  number_of_shards AS "Shards",
  number_of_replicas AS "Replicas",
  clustered_by AS "Clustered By"
FROM information_schema.tables
WHERE table_schema NOT IN ('pg_catalog')
ORDER BY table_schema, table_name;`,
        },
        {
          name: 'Describe Table Structure',
          sql: `-- Describe table columns and constraints
-- Replace 'doc' and 'users' with your schema and table
SELECT
  ordinal_position AS "Position",
  column_name AS "Column",
  data_type AS "Type",
  is_nullable AS "Nullable",
  column_default AS "Default"
FROM information_schema.columns
WHERE table_schema = 'doc' AND table_name = 'users'
ORDER BY ordinal_position;`,
        },
        {
          name: 'List Schemas with Table Count',
          sql: `-- List all schemas with table counts
SELECT
  table_schema AS "Schema",
  COUNT(*) AS "Tables",
  SUM(number_of_shards) AS "Total Shards"
FROM information_schema.tables
WHERE table_type = 'BASE TABLE'
  AND table_schema NOT IN ('pg_catalog', 'information_schema')
GROUP BY table_schema
ORDER BY table_schema;`,
        },
        {
          name: 'Cluster Health Overview',
          sql: `-- Cluster nodes and health status
SELECT
  name AS "Node",
  hostname AS "Hostname",
  ROUND((heap['used']::float / heap['max']::float * 100), 2) AS "Heap Usage %",
  ROUND((fs['total']['used']::float / fs['total']['size']::float * 100), 2) AS "Disk Usage %",
  load['1'] AS "Load (1m)",
  ROUND(os['uptime'] / 3600000) AS "Uptime (hours)"
FROM sys.nodes
ORDER BY name;`,
        },
      ],
    },
    {
      category: '🏗️ Table Creation (DDL)',
      queries: [
        {
          name: 'Basic Table',
          sql: `-- Create a simple table
CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  price DOUBLE PRECISION,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`,
        },
        {
          name: 'Table with Sharding',
          sql: `-- Create table with custom sharding
CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL,
  total DOUBLE PRECISION,
  order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
CLUSTERED BY (customer_id) INTO 8 SHARDS
WITH (
  number_of_replicas = 1,
  refresh_interval = 1000
);`,
        },
        {
          name: 'Time-Series Table',
          sql: `-- Create time-series table with partitioning
CREATE TABLE sensor_data (
  timestamp TIMESTAMP WITH TIME ZONE PRIMARY KEY,
  sensor_id TEXT NOT NULL,
  temperature DOUBLE PRECISION,
  humidity DOUBLE PRECISION,
  location TEXT,
  day AS date_trunc('day', timestamp) STORED
)
PARTITIONED BY (day)
CLUSTERED INTO 4 SHARDS
WITH (
  number_of_replicas = '0-1',
  refresh_interval = 1000,
  column_policy = 'strict'
);`,
        },
        {
          name: 'Table with JSON/Objects',
          sql: `-- Create table with dynamic JSON objects
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  profile OBJECT(DYNAMIC) AS (
    first_name TEXT,
    last_name TEXT,
    age INTEGER,
    preferences OBJECT
  ),
  tags ARRAY(TEXT),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
CLUSTERED INTO 4 SHARDS;`,
        },
      ],
    },
    {
      category: '⏰ Time-Series Queries',
      queries: [
        {
          name: 'Recent Time-Series Data',
          sql: `-- Query recent sensor data (last 24 hours)
SELECT
  timestamp,
  sensor_id,
  temperature,
  humidity,
  location
FROM sensor_data
WHERE timestamp > CURRENT_TIMESTAMP - INTERVAL '24 hours'
ORDER BY timestamp DESC
LIMIT 1000;`,
        },
        {
          name: 'Time-Series Aggregation',
          sql: `-- Hourly aggregation of sensor data
SELECT
  date_trunc('hour', timestamp) AS hour,
  sensor_id,
  AVG(temperature) AS avg_temp,
  MIN(temperature) AS min_temp,
  MAX(temperature) AS max_temp,
  AVG(humidity) AS avg_humidity,
  COUNT(*) AS reading_count
FROM sensor_data
WHERE timestamp > CURRENT_TIMESTAMP - INTERVAL '7 days'
GROUP BY date_trunc('hour', timestamp), sensor_id
ORDER BY hour DESC, sensor_id;`,
        },
        {
          name: 'Daily Statistics',
          sql: `-- Daily statistics with trends
SELECT
  DATE(timestamp) AS day,
  location,
  ROUND(AVG(temperature)::numeric, 2) AS avg_temp,
  ROUND(MIN(temperature)::numeric, 2) AS min_temp,
  ROUND(MAX(temperature)::numeric, 2) AS max_temp,
  COUNT(*) AS measurements
FROM sensor_data
WHERE timestamp > CURRENT_TIMESTAMP - INTERVAL '30 days'
GROUP BY DATE(timestamp), location
ORDER BY day DESC, location;`,
        },
      ],
    },
    {
      category: '🔍 Full-Text Search',
      queries: [
        {
          name: 'Create FTS Table',
          sql: `-- Create table with full-text search index
CREATE TABLE articles (
  id INTEGER PRIMARY KEY,
  title TEXT,
  content TEXT INDEX USING FULLTEXT WITH (analyzer = 'english'),
  author TEXT,
  published_at TIMESTAMP,
  category TEXT
)
CLUSTERED INTO 4 SHARDS;`,
        },
        {
          name: 'Basic Text Search',
          sql: `-- Search documents with relevance scoring
SELECT
  id,
  title,
  author,
  _score,
  LEFT(content, 200) AS preview
FROM articles
WHERE MATCH(content, 'machine learning')
ORDER BY _score DESC
LIMIT 20;`,
        },
        {
          name: 'Multi-Field Search',
          sql: `-- Search across multiple fields with boosting
SELECT
  id,
  title,
  author,
  category,
  _score
FROM articles
WHERE MATCH((title 3.0, content), 'artificial intelligence')
  AND published_at > CURRENT_TIMESTAMP - INTERVAL '1 year'
ORDER BY _score DESC
LIMIT 50;`,
        },
      ],
    },
    {
      category: '🎯 Vector Search',
      queries: [
        {
          name: 'Create Vector Table',
          sql: `-- Create table for vector embeddings
CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  embedding FLOAT_VECTOR(384),
  metadata OBJECT AS (
    author TEXT,
    category TEXT,
    created_at TIMESTAMP
  )
)
CLUSTERED INTO 4 SHARDS;`,
        },
        {
          name: 'KNN Vector Search',
          sql: `-- K-Nearest Neighbors search (replace ? with vector)
-- Generate vector using your embedding model first
SELECT
  id,
  content,
  metadata['author'] AS author,
  metadata['category'] AS category,
  _score
FROM documents
WHERE knn_match(embedding, [0.1, 0.2, ...], 10)
ORDER BY _score DESC;`,
        },
        {
          name: 'Vector Similarity with Filter',
          sql: `-- Similarity search with metadata filtering
SELECT
  id,
  content,
  metadata['category'] AS category,
  _score
FROM documents
WHERE knn_match(embedding, [0.1, 0.2, ...], 20)
  AND metadata['category'] = 'technology'
ORDER BY _score DESC
LIMIT 10;`,
        },
      ],
    },
    {
      category: '🗺️ Geospatial Queries',
      queries: [
        {
          name: 'Create Geo Table',
          sql: `-- Create table with geospatial data
CREATE TABLE stores (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  location GEO_POINT,
  service_area GEO_SHAPE,
  city TEXT,
  rating DOUBLE PRECISION
)
CLUSTERED INTO 4 SHARDS;`,
        },
        {
          name: 'Insert Geo Points',
          sql: `-- Insert locations (longitude, latitude)
INSERT INTO stores (id, name, location, city, rating)
VALUES
  (1, 'Downtown Store', [40.7128, -74.0060], 'New York', 4.5),
  (2, 'Harbor Store', [34.0522, -118.2437], 'Los Angeles', 4.2),
  (3, 'Bay Store', [37.7749, -122.4194], 'San Francisco', 4.8);`,
        },
        {
          name: 'Distance-Based Search',
          sql: `-- Find stores within distance (sorted by proximity)
-- Replace coordinates with your location
SELECT
  id,
  name,
  city,
  rating,
  ROUND(distance(location, [40.7580, -73.9855])::numeric / 1000, 2) AS distance_km
FROM stores
WHERE distance(location, [40.7580, -73.9855]) < 50000  -- 50km radius
ORDER BY distance(location, [40.7580, -73.9855]) ASC
LIMIT 10;`,
        },
        {
          name: 'Polygon Area Search',
          sql: `-- Find points within polygon boundary
SELECT
  id,
  name,
  location,
  city
FROM stores
WHERE location WITHIN 'POLYGON((
  -74.05 40.70,
  -74.00 40.70,
  -74.00 40.75,
  -74.05 40.75,
  -74.05 40.70
))';`,
        },
      ],
    },
    {
      category: '📄 Document/JSON Queries',
      queries: [
        {
          name: 'Insert JSON Documents',
          sql: `-- Insert documents with nested JSON
INSERT INTO users (id, username, email, profile, tags)
VALUES (
  1,
  'john_doe',
  'john@example.com',
  {
    'first_name': 'John',
    'last_name': 'Doe',
    'age': 30,
    'preferences': {
      'theme': 'dark',
      'language': 'en',
      'notifications': true
    }
  },
  ['developer', 'nodejs', 'python']
);`,
        },
        {
          name: 'Query JSON Fields',
          sql: `-- Query nested JSON object fields
SELECT
  id,
  username,
  email,
  profile['first_name'] AS first_name,
  profile['last_name'] AS last_name,
  profile['age'] AS age,
  profile['preferences']['theme'] AS theme,
  tags
FROM users
WHERE profile['age'] > 25
ORDER BY username;`,
        },
        {
          name: 'Array Membership Query',
          sql: `-- Find users with specific tags
SELECT
  username,
  email,
  tags,
  profile['first_name'] AS name
FROM users
WHERE 'python' = ANY(tags)
  OR 'nodejs' = ANY(tags)
ORDER BY username;`,
        },
        {
          name: 'Update JSON Objects',
          sql: `-- Update nested JSON object (full replacement)
UPDATE users
SET profile = {
  'first_name': 'John',
  'last_name': 'Doe',
  'age': 31,
  'preferences': {
    'theme': 'light',
    'language': 'en',
    'notifications': true
  }
}
WHERE id = 1;

REFRESH TABLE users;`,
        },
      ],
    },
    {
      category: '💾 BLOB Storage',
      queries: [
        {
          name: 'Create BLOB Table',
          sql: `-- Create BLOB table for file storage
CREATE BLOB TABLE my_files
CLUSTERED INTO 3 SHARDS
WITH (
  number_of_replicas = 1
);`,
        },
        {
          name: 'BLOB Metadata Table',
          sql: `-- Create metadata table to track BLOBs
CREATE TABLE blob_metadata (
  sha1_hash TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  folder_path TEXT,
  file_size BIGINT,
  content_type TEXT,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  uploaded_by TEXT,
  metadata OBJECT
)
CLUSTERED INTO 4 SHARDS;`,
        },
        {
          name: 'Query BLOB Metadata',
          sql: `-- Search BLOB metadata
SELECT
  filename,
  folder_path,
  file_size,
  content_type,
  uploaded_at,
  uploaded_by
FROM blob_metadata
WHERE folder_path LIKE '/projects/%'
  AND uploaded_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
ORDER BY uploaded_at DESC
LIMIT 100;`,
        },
      ],
    },
    {
      category: '📊 Performance & Monitoring',
      queries: [
        {
          name: 'Table Size Analysis',
          sql: `-- Analyze table sizes and row counts
SELECT
  schema_name AS "Schema",
  table_name AS "Table",
  SUM(num_docs) AS "Rows",
  ROUND(SUM(size) / 1024.0 / 1024.0, 2) AS "Size (MB)",
  COUNT(*) AS "Shards"
FROM sys.shards
WHERE "primary" = true
  AND schema_name NOT IN ('sys', 'information_schema')
GROUP BY schema_name, table_name
ORDER BY SUM(size) DESC
LIMIT 20;`,
        },
        {
          name: 'Active Queries',
          sql: `-- Monitor currently running queries
SELECT
  id,
  username,
  node['name'] AS node,
  started,
  ROUND((CURRENT_TIMESTAMP - started) / 1000.0, 2) AS duration_sec,
  LEFT(stmt, 100) AS query
FROM sys.jobs
WHERE stmt NOT LIKE '%sys.jobs%'
ORDER BY started DESC;`,
        },
        {
          name: 'Query Performance Stats',
          sql: `-- Analyze query execution statistics (last hour)
SELECT
  LEFT(stmt, 80) AS query,
  COUNT(*) AS executions,
  ROUND(AVG(ended - started), 2) AS avg_duration_ms,
  ROUND(MIN(ended - started), 2) AS min_duration_ms,
  ROUND(MAX(ended - started), 2) AS max_duration_ms
FROM sys.jobs_log
WHERE ended > CURRENT_TIMESTAMP - 3600000
  AND error IS NULL
GROUP BY LEFT(stmt, 80)
ORDER BY AVG(ended - started) DESC
LIMIT 20;`,
        },
        {
          name: 'Shard Distribution',
          sql: `-- View shard distribution across nodes
SELECT
  node['name'] AS node,
  COUNT(*) AS total_shards,
  SUM(num_docs) AS total_docs,
  ROUND(SUM(size) / 1024.0 / 1024.0, 2) AS size_mb,
  COUNT(DISTINCT schema_name || '.' || table_name) AS tables
FROM sys.shards
GROUP BY node['name']
ORDER BY node['name'];`,
        },
        {
          name: 'Recent Errors',
          sql: `-- View recent query errors
SELECT
  ended,
  username,
  LEFT(stmt, 100) AS query,
  error AS error_message
FROM sys.jobs_log
WHERE error IS NOT NULL
  AND ended > CURRENT_TIMESTAMP - 3600000
ORDER BY ended DESC
LIMIT 50;`,
        },
      ],
    },
    {
      category: '💼 Backup & Snapshots',
      queries: [
        {
          name: 'Create Repository (Local)',
          sql: `-- Create local filesystem repository
CREATE REPOSITORY backup_local TYPE fs
WITH (
  location = '/var/lib/monkdb/backups'
);`,
        },
        {
          name: 'Create Repository (S3)',
          sql: `-- Create S3 repository for cloud backups
CREATE REPOSITORY backup_s3 TYPE s3
WITH (
  bucket = 'my-monkdb-backups',
  region = 'us-east-1',
  access_key = 'your-access-key',
  secret_key = 'your-secret-key'
);`,
        },
        {
          name: 'Create Snapshot',
          sql: `-- Create snapshot of all tables
CREATE SNAPSHOT backup_local.snapshot_2024_01_15 ALL
WITH (wait_for_completion = true);`,
        },
        {
          name: 'Create Partial Snapshot',
          sql: `-- Create snapshot of specific tables
CREATE SNAPSHOT backup_local.snapshot_products TABLE doc.products, doc.orders
WITH (wait_for_completion = true);`,
        },
        {
          name: 'List Snapshots',
          sql: `-- View all snapshots in repository
SELECT
  name,
  repository,
  state,
  started,
  finished,
  array_length(indices, 1) AS table_count
FROM sys.snapshots
WHERE repository = 'backup_local'
ORDER BY started DESC;`,
        },
        {
          name: 'Restore Snapshot',
          sql: `-- Restore all tables from snapshot
RESTORE SNAPSHOT backup_local.snapshot_2024_01_15 ALL
WITH (wait_for_completion = true);`,
        },
      ],
    },
    {
      category: '🔧 Advanced Queries',
      queries: [
        {
          name: 'Common Table Expression (CTE)',
          sql: `-- Use WITH clause for complex queries
WITH daily_stats AS (
  SELECT
    DATE(timestamp) AS day,
    sensor_id,
    AVG(temperature) AS avg_temp,
    COUNT(*) AS readings
  FROM sensor_data
  WHERE timestamp > CURRENT_TIMESTAMP - INTERVAL '7 days'
  GROUP BY DATE(timestamp), sensor_id
)
SELECT
  day,
  sensor_id,
  ROUND(avg_temp::numeric, 2) AS avg_temperature,
  readings,
  ROUND((avg_temp - LAG(avg_temp) OVER (PARTITION BY sensor_id ORDER BY day))::numeric, 2) AS temp_change
FROM daily_stats
ORDER BY day DESC, sensor_id;`,
        },
        {
          name: 'Window Functions',
          sql: `-- Advanced analytics with window functions
SELECT
  id,
  customer_id,
  total,
  order_date,
  ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date DESC) AS order_rank,
  SUM(total) OVER (PARTITION BY customer_id) AS customer_lifetime_value,
  AVG(total) OVER (PARTITION BY customer_id) AS avg_order_value
FROM orders
WHERE order_date > CURRENT_TIMESTAMP - INTERVAL '1 year'
LIMIT 100;`,
        },
        {
          name: 'COPY FROM CSV',
          sql: `-- Import data from CSV file
COPY sensor_data
FROM '/path/to/data.csv'
WITH (
  format = 'csv',
  delimiter = ',',
  header = true
);

REFRESH TABLE sensor_data;`,
        },
        {
          name: 'COPY TO CSV Export',
          sql: `-- Export query results to CSV
COPY (
  SELECT timestamp, sensor_id, temperature, humidity
  FROM sensor_data
  WHERE timestamp > CURRENT_TIMESTAMP - INTERVAL '1 day'
) TO '/path/to/export.csv'
WITH (format = 'csv', header = true);`,
        },
        {
          name: 'EXPLAIN Query Plan',
          sql: `-- Analyze query execution plan
EXPLAIN SELECT
  sensor_id,
  AVG(temperature) AS avg_temp
FROM sensor_data
WHERE timestamp > CURRENT_TIMESTAMP - INTERVAL '7 days'
GROUP BY sensor_id;`,
        },
        {
          name: 'ANALYZE Table Statistics',
          sql: `-- Update table statistics for query optimization
ANALYZE;`,
        },
        {
          name: 'REFRESH Table',
          sql: `-- Force immediate refresh of table data
REFRESH TABLE sensor_data;`,
        },
        {
          name: 'OPTIMIZE Table',
          sql: `-- Optimize table (force merge segments)
OPTIMIZE TABLE sensor_data
WITH (max_num_segments = 1);`,
        },
      ],
    },
  ];

  if (!activeConnection) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="max-w-md rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/50 p-12 text-center dark:border-gray-700 dark:bg-gray-800/50">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
            <Database className="h-10 w-10 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="mt-6 text-xl font-bold text-gray-900 dark:text-white">
            No Active Connection
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Please connect to a MonkDB database to execute queries.
          </p>
          <a
            href="/connections"
            className="mt-6 inline-block rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            Manage Connections
          </a>
        </div>
      </div>
    );
  }

  // CRITICAL: Guard against no connection - prevent query execution without database connection
  if (!activeConnection) {
    return (
      <ConnectionPrompt
        onConnect={() => router.push('/connections')}
        title="No Database Connection"
        message="Please connect to a MonkDB database to use the Query Editor."
        buttonText="Go to Connections"
      />
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex h-full flex-col">
        {/* Professional Toolbar */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-6 py-3 shadow-sm dark:border-gray-700 dark:from-gray-800 dark:to-gray-800">
        {/* Left: Connection Info + File Actions */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Database className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                SQL Editor
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {activeConnection.name} • Schema: {activeSchema || 'doc'}
              </p>
            </div>
          </div>

          <div className="h-8 w-px bg-gray-300 dark:bg-gray-600" />

          <button
            onClick={() => setShowSavedQueries(true)}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            title="Browse saved queries"
          >
            <BookmarkIcon className="h-3.5 w-3.5" />
            Saved
          </button>
          <button
            onClick={() => setShowSaveDialog(true)}
            disabled={!query.trim()}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            title="Save current query (Ctrl+S)"
          >
            <SaveIcon className="h-3.5 w-3.5" />
            Save
          </button>
          <button
            onClick={handleFormatSQL}
            disabled={!query.trim()}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            title="Format SQL (Ctrl+Shift+F)"
          >
            <Wand2 className="h-3.5 w-3.5" />
            Format
          </button>
          <button
            onClick={() => setShowShortcuts(true)}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            title="Keyboard shortcuts"
          >
            <Keyboard className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Right: Execution Actions */}
        <div className="flex items-center gap-2">
          {/* Query Warning Indicator */}
          {query.trim() && isDangerousQuery(query).dangerous && (
            <div className="flex items-center gap-2 rounded-lg border border-orange-300 bg-orange-50 px-3 py-2 dark:border-orange-700 dark:bg-orange-900/20">
              <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              <span className="text-xs font-semibold text-orange-700 dark:text-orange-400">
                {isDangerousQuery(query).type}
              </span>
            </div>
          )}

          {/* Connection Status Indicator */}
          <div className="flex items-center gap-2 rounded-lg border border-green-300 bg-green-50 px-3 py-2 dark:border-green-700 dark:bg-green-900/20">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span className="text-xs font-medium text-green-700 dark:text-green-400">
              Connected
            </span>
          </div>

          <div className="h-8 w-px bg-gray-300 dark:bg-gray-600" />

          <button
            onClick={handleExplain}
            disabled={isExecuting || !query.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-500 dark:hover:bg-blue-600"
            title="Explain query execution plan"
          >
            <BarChart3 className="h-4 w-4" />
            Explain
          </button>
          <button
            onClick={() => handleExecute(false)}
            disabled={isExecuting || !query.trim()}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white shadow-md transition-all hover:bg-green-700 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none dark:bg-green-500 dark:hover:bg-green-600"
            title="Execute query (Ctrl+Enter)"
          >
            {isExecuting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Executing...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Execute
              </>
            )}
          </button>
        </div>
      </div>

      {/* Query Tabs */}
      <div className="flex items-center border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/60 pl-3 pr-2">
        <div className="flex flex-1 items-end gap-0.5 overflow-x-auto py-1.5">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`group relative flex min-w-0 max-w-[180px] flex-shrink-0 items-center gap-1.5 rounded-t-md border-t border-l border-r px-3 py-1.5 transition-all ${
                renamingTabId !== tab.id ? 'cursor-pointer' : ''
              } ${
                tab.id === activeTab?.id
                  ? 'border-gray-200 bg-white text-gray-900 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white'
                  : 'border-transparent bg-transparent text-gray-500 hover:bg-white/60 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800/60 dark:hover:text-gray-200'
              }`}
              onClick={() => renamingTabId !== tab.id && switchTab(tab.id)}
            >
              {tab.id === activeTab?.id && (
                <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-md bg-blue-500" />
              )}
              <FileText className="h-3 w-3 flex-shrink-0 text-gray-400" />
              {renamingTabId === tab.id ? (
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={handleRenameKeyDown}
                  onBlur={saveRename}
                  autoFocus
                  className="min-w-[80px] max-w-[140px] rounded border border-blue-500 bg-white px-1 py-0 text-sm font-medium outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:border-blue-400 dark:focus:ring-blue-400"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span
                  className="min-w-0 flex-1 truncate text-sm font-medium"
                  onDoubleClick={(e) => { e.stopPropagation(); startRename(tab.id, tab.name); }}
                  title={`${tab.name} — double-click to rename`}
                >
                  {tab.name}
                  {tab.isDirty && <span className="ml-1 text-orange-400">●</span>}
                </span>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                className="flex-shrink-0 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-600"
                title="Close tab"
              >
                <XIcon className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={() => createTab()}
          className="ml-1 flex flex-shrink-0 items-center gap-1 rounded-md px-2 py-1.5 text-gray-500 transition-colors hover:bg-white hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          title="New tab (Cmd+T)"
        >
          <PlusIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 min-h-0 gap-4 overflow-hidden px-4 py-2">
        {/* Sidebar */}
        <div className="w-80 flex flex-col space-y-2 overflow-hidden">
          {/* Sidebar Tabs */}
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
            {/* <button
              onClick={() => setSidebarTab('templates')}
              className={`flex items-center justify-center gap-1 rounded px-2 py-2 text-sm font-medium transition-colors ${
                sidebarTab === 'templates'
                  ? 'bg-white text-gray-900 shadow dark:bg-gray-700 dark:text-white'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
              title="Query Templates"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Templates</span>
            </button> */}
            <button
              onClick={() => setSidebarTab('history')}
              className={`flex items-center justify-center gap-1 rounded px-2 py-2 text-sm font-medium transition-colors ${
                sidebarTab === 'history'
                  ? 'bg-white text-gray-900 shadow dark:bg-gray-700 dark:text-white'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
              title="Query History"
            >
              <History className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">History</span>
            </button>
            <button
              onClick={() => setSidebarTab('schema')}
              className={`flex items-center justify-center gap-1 rounded px-2 py-2 text-sm font-medium transition-colors ${
                sidebarTab === 'schema'
                  ? 'bg-white text-gray-900 shadow dark:bg-gray-700 dark:text-white'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
              title="Database Schema"
            >
              <Database className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Schema</span>
            </button>
            <button
              onClick={() => setShowDocsModal(true)}
              className="flex items-center justify-center gap-1 rounded px-2 py-2 text-sm font-medium transition-colors text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-white dark:hover:bg-gray-700"
              title="SQL Documentation"
            >
              <Book className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Docs</span>
            </button>
          </div>

          {/* Sidebar Content */}
          <div className="flex-1 overflow-y-auto rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
            {/* {sidebarTab === 'templates' && (
              <div className="space-y-4">
                {queryTemplates.map((category, catIdx) => (
                  <div key={catIdx}>
                    <h4 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                      {category.category}
                    </h4>
                    <div className="space-y-0.5">
                      {category.queries.map((template, idx) => (
                        <button
                          key={idx}
                          onClick={() => setQuery(template.sql)}
                          className="group w-full rounded-lg border border-transparent px-3 py-2 text-left transition-all hover:border-blue-200 hover:bg-blue-50 dark:hover:border-blue-800 dark:hover:bg-blue-900/10"
                          title={template.sql.slice(0, 200)}
                        >
                          <div className="flex items-center gap-2">
                            <Zap className="h-3 w-3 flex-shrink-0 text-blue-400 group-hover:text-blue-600 dark:text-blue-500 dark:group-hover:text-blue-400" />
                            <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700 dark:text-gray-300 dark:group-hover:text-blue-300">
                              {template.name}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )} */}

            {sidebarTab === 'history' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">
                    Recent Queries ({queryHistory.length})
                  </h4>
                  {queryHistory.length > 0 && (
                    <button
                      onClick={clearHistory}
                      className="text-xs text-red-600 hover:text-red-700 dark:text-red-400"
                      title="Clear history"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                {queryHistory.length === 0 ? (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    No query history yet. Execute queries to build history.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {queryHistory.map((item) => {
                      const qType = item.query.trim().split(/\s+/)[0].toUpperCase();
                      const typeColors: Record<string, string> = {
                        SELECT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
                        INSERT: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
                        UPDATE: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
                        DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
                        CREATE: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
                        DROP: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
                        ALTER: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
                        EXPLAIN: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
                      };
                      return (
                        <button
                          key={item.id}
                          onClick={() => setQuery(item.query)}
                          className={`group w-full rounded-lg border p-2.5 text-left transition-colors hover:border-blue-200 hover:bg-blue-50/50 dark:hover:border-blue-800 dark:hover:bg-blue-900/10 ${
                            item.success
                              ? 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800/50'
                              : 'border-red-200 bg-red-50/50 dark:border-red-900/60 dark:bg-red-900/10'
                          }`}
                        >
                          <div className="mb-1.5 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className={`flex-shrink-0 rounded px-1.5 py-0.5 font-mono text-xs font-bold ${typeColors[qType] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                                {qType}
                              </span>
                              <span className={`text-sm font-semibold ${item.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {item.success ? '✓' : '✗'} {item.duration.toFixed(0)}ms
                              </span>
                              {item.success && item.rowcount > 0 && (
                                <span className="text-sm text-gray-400">{item.rowcount} rows</span>
                              )}
                            </div>
                            <span className="flex-shrink-0 text-xs text-gray-400">
                              {new Date(item.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <code className="block truncate text-sm text-gray-600 dark:text-gray-400">
                            {item.query.replace(/\s+/g, ' ').slice(0, 120)}
                          </code>
                          {!item.success && item.error && (
                            <p className="mt-1 truncate text-sm text-red-500 dark:text-red-400">
                              {item.error}
                            </p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {sidebarTab === 'schema' && (
              <SchemaExplorer
                metadata={schemaExplorerMetadata}
                onRefresh={loadSchemaMetadata}
                onInsertText={setQuery}
                loading={loadingSchema}
                connectionId={activeConnection?.id}
              />
            )}
          </div>
        </div>

        {/* Main Editor Area */}
        <div className="flex flex-1 min-h-0 flex-col gap-4 overflow-hidden">
          {/* Query Input */}
          <div className="h-72 min-h-72 flex-shrink-0 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
            <DroppableMonacoEditor
              value={query}
              onChange={setQuery}
              onExecute={() => handleExecute(false)}
              height="288px"
              schema={schemaMetadata}
            />
          </div>

          {/* Results Panel */}
          <div className="flex-1 min-h-0 flex flex-col rounded-lg border border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800 overflow-hidden">
            <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 px-4 py-2 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold uppercase tracking-widest text-gray-400">Results</span>
                {results.rowcount > 0 && !error && (
                  <>
                    <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-sm font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                      {results.rowcount.toLocaleString()} {results.rowcount === 1 ? 'row' : 'rows'}
                    </span>
                    {results.cols.length > 0 && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-sm font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                        {results.cols.length} cols
                      </span>
                    )}
                    {executionStats.executionTime > 0 && (
                      <span className="text-sm text-gray-400">
                        {executionStats.executionTime < 1000
                          ? `${executionStats.executionTime.toFixed(0)}ms`
                          : `${(executionStats.executionTime / 1000).toFixed(2)}s`}
                      </span>
                    )}
                  </>
                )}
                {error && <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-sm font-semibold text-red-600 dark:bg-red-900/30 dark:text-red-400">Error</span>}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={copyToClipboard}
                  disabled={results.rowcount === 0}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                  title="Copy to clipboard"
                >
                  <Copy className="h-3.5 w-3.5" />Copy
                </button>
                <button
                  onClick={exportToCSV}
                  disabled={results.rowcount === 0}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                  title="Download CSV"
                >
                  <Download className="h-3.5 w-3.5" />CSV
                </button>
                <button
                  onClick={exportToJSON}
                  disabled={results.rowcount === 0}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                  title="Download JSON"
                >
                  <Download className="h-3.5 w-3.5" />JSON
                </button>
                <div className="mx-1 h-4 w-px bg-gray-200 dark:bg-gray-700" />
                <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-0.5 dark:border-gray-700 dark:bg-gray-900">
                  <button
                    onClick={() => setViewMode('table')}
                    className={`rounded px-2.5 py-1 text-sm font-medium transition-colors ${
                      viewMode === 'table'
                        ? 'bg-white text-blue-600 shadow-sm dark:bg-gray-700 dark:text-blue-400'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                  >
                    Table
                  </button>
                  <button
                    onClick={() => setViewMode('json')}
                    className={`rounded px-2.5 py-1 text-sm font-medium transition-colors ${
                      viewMode === 'json'
                        ? 'bg-white text-blue-600 shadow-sm dark:bg-gray-700 dark:text-blue-400'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                  >
                    JSON
                  </button>
                </div>
              </div>
            </div>

            {/* Results Content Area */}
            {error ? (
              <div className="flex-1 min-h-0 overflow-auto">
                <div className="m-6 rounded-lg border-2 border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/20">
                  <div className="flex items-start gap-4 p-6">
                    <div className="flex-shrink-0">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50">
                        <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-red-900 dark:text-red-300">
                        {(() => {
                          // Extract title from error message if present
                          const lines = error.split('\n');
                          const firstLine = lines[0];
                          // If first line looks like a title (short and descriptive), use it
                          if (firstLine.includes('❌') || firstLine.length < 100) {
                            return firstLine;
                          }
                          return 'Query Execution Failed';
                        })()}
                      </h3>
                      <pre className="mt-3 rounded-lg bg-red-100 p-4 font-mono text-sm text-red-800 dark:bg-red-900/30 dark:text-red-200 whitespace-pre-wrap overflow-x-auto">
{error}</pre>
                      <button
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(error);
                            toast.success('Copied', 'Error message copied to clipboard');
                          } catch {
                            toast.error('Failed', 'Could not copy error');
                          }
                        }}
                        className="mt-3 flex items-center gap-2 rounded-lg bg-red-200 px-3 py-1.5 text-sm font-medium text-red-900 hover:bg-red-300 dark:bg-red-900/50 dark:text-red-100 dark:hover:bg-red-900/70"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Copy Error
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : results.cols.length > 0 && results.rows.length > 0 ? (
              isExplainQuery ? (
                <div className="flex-1 min-h-0 overflow-auto">
                  <div className="p-4">
                    <ExplainVisualizer
                      explainData={results.rows[0][0]}
                      isAnalyze={isExplainAnalyze}
                    />
                  </div>
                </div>
              ) : viewMode === 'table' ? (
                <div className="flex flex-1 min-h-0 flex-col">
                  {/* Scrollable Table */}
                  <div className="flex-1 overflow-auto">
                    <table className="min-w-full border-collapse">
                      <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-900">
                        <tr>
                          <th className="whitespace-nowrap border-b border-gray-200 px-3 py-2.5 text-left text-sm font-semibold uppercase tracking-wider text-gray-400 dark:border-gray-700 dark:text-gray-500">
                            #
                          </th>
                          {results.cols.map((col: string, idx: number) => (
                            <th
                              key={idx}
                              onClick={() => handleSort(idx)}
                              className="cursor-pointer select-none whitespace-nowrap border-b border-gray-200 px-3 py-2.5 text-left text-sm font-semibold uppercase tracking-wider text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                            >
                              <div className="flex items-center gap-1.5">
                                <span>{col}</span>
                                {sortConfig?.col === col ? (
                                  sortConfig.dir === 'asc' ? (
                                    <ChevronUp className="h-3.5 w-3.5 text-blue-500" />
                                  ) : (
                                    <ChevronDown className="h-3.5 w-3.5 text-blue-500" />
                                  )
                                ) : (
                                  <ChevronDown className="h-3 w-3 opacity-20" />
                                )}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                        {paginatedRows.map((row: any[], rowIdx: number) => {
                          const absoluteRowIdx = (currentPage - 1) * ROWS_PER_PAGE + rowIdx;
                          return (
                            <tr
                              key={absoluteRowIdx}
                              className="bg-white transition-colors hover:bg-blue-50/40 dark:bg-gray-800 dark:hover:bg-gray-700/30"
                            >
                              <td className="whitespace-nowrap px-3 py-1.5 font-mono text-sm text-gray-300 dark:text-gray-600">
                                {absoluteRowIdx + 1}
                              </td>
                              {row.map((cell: any, cellIdx: number) => (
                                <td
                                  key={cellIdx}
                                  className="whitespace-nowrap px-3 py-1.5 font-mono text-sm"
                                  title={cell === null ? 'NULL' : typeof cell === 'object' ? JSON.stringify(cell) : String(cell)}
                                >
                                  {cell === null ? (
                                    <span className="italic text-gray-300 dark:text-gray-600">NULL</span>
                                  ) : typeof cell === 'object' ? (
                                    <span className="text-amber-700 dark:text-amber-400">{JSON.stringify(cell)}</span>
                                  ) : typeof cell === 'boolean' ? (
                                    <span className={`inline-flex items-center gap-1 font-medium ${cell ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                      {cell ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XIcon className="h-3.5 w-3.5" />}
                                      {cell ? 'true' : 'false'}
                                    </span>
                                  ) : typeof cell === 'number' ? (
                                    <span className="text-blue-600 dark:text-blue-400">{String(cell)}</span>
                                  ) : (
                                    <span className="text-gray-800 dark:text-gray-200">{String(cell)}</span>
                                  )}
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Fixed Pagination */}
                  {sortedRows.length > ROWS_PER_PAGE && (
                    <div className="flex flex-shrink-0 items-center justify-between border-t border-gray-100 bg-gray-50/80 px-4 py-2 dark:border-gray-700 dark:bg-gray-900/50">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Rows {((currentPage - 1) * ROWS_PER_PAGE + 1).toLocaleString()}–{Math.min(currentPage * ROWS_PER_PAGE, sortedRows.length).toLocaleString()} of {sortedRows.length.toLocaleString()}
                      </span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1}
                          className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">
                          First
                        </button>
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                          className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </button>
                        <span className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                          {currentPage} / {totalPages}
                        </span>
                        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                          className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}
                          className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">
                          Last
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 min-h-0 overflow-auto">
                  <pre className="p-4 text-sm text-gray-900 dark:text-gray-100 font-mono">
                    {JSON.stringify(
                      results.rows.map((row: any[]) => {
                        const obj: any = {};
                        results.cols.forEach((col: string, idx: number) => {
                          obj[col] = row[idx];
                        });
                        return obj;
                      }),
                      null,
                      2
                    )}
                  </pre>
                </div>
              )
            ) : isNonSelectQuery && executionStats.executionTime > 0 && !error && !isExecuting && results.rowcount >= 0 ? (
              (() => {
                const queryUpper = query.trim().toUpperCase();
                const queryType = queryUpper.split(/\s+/)[0];

                // Extract table name helper
                const extractTableName = (q: string) => {
                  const match = q.match(/(?:INTO|FROM|TABLE|UPDATE)\s+([a-zA-Z_][a-zA-Z0-9_]*\.?[a-zA-Z_][a-zA-Z0-9_]*)/i);
                  return match ? match[1] : 'table';
                };
                const tableName = extractTableName(query);

                // ============================================================
                // CREATE TABLE - Show table structure
                // ============================================================
                if (queryType === 'CREATE' && queryUpper.includes('CREATE TABLE')) {
                  const columnMatches = query.match(/\(([^)]+)\)/);
                  if (columnMatches) {
                    const columnList = columnMatches[1].split(',').map(col => {
                      const parts = col.trim().split(/\s+/);
                      return {
                        name: parts[0],
                        type: parts[1] || '',
                        constraints: parts.slice(2).join(' ') || '-'
                      };
                    });

                    return (
                      <div className="flex flex-1 min-h-0 flex-col">
                        <div className="border-b border-gray-200 bg-green-50 px-4 py-3 dark:border-gray-700 dark:bg-green-900/20">
                          <div className="flex items-center gap-3">
                            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                            <div>
                              <h3 className="text-sm font-bold text-green-900 dark:text-green-300">
                                CREATE TABLE: "{tableName}"
                              </h3>
                              <p className="text-xs text-green-700 dark:text-green-400">
                                {columnList.length} columns defined • {executionStats.executionTime.toFixed(2)}ms
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex-1 min-h-0 overflow-auto">
                          <table className="w-full border-collapse text-sm">
                            <thead className="sticky top-0 z-10 bg-gray-100 dark:bg-gray-700">
                              <tr>
                                <th className="border-b-2 border-gray-300 px-4 py-2 text-left font-semibold text-gray-700 dark:border-gray-600 dark:text-gray-200">#</th>
                                <th className="border-b-2 border-gray-300 px-4 py-2 text-left font-semibold text-gray-700 dark:border-gray-600 dark:text-gray-200">Column Name</th>
                                <th className="border-b-2 border-gray-300 px-4 py-2 text-left font-semibold text-gray-700 dark:border-gray-600 dark:text-gray-200">Data Type</th>
                                <th className="border-b-2 border-gray-300 px-4 py-2 text-left font-semibold text-gray-700 dark:border-gray-600 dark:text-gray-200">Constraints</th>
                              </tr>
                            </thead>
                            <tbody>
                              {columnList.map((col, idx) => (
                                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                  <td className="border-b border-gray-200 px-4 py-2 text-gray-600 dark:border-gray-700 dark:text-gray-400">{idx + 1}</td>
                                  <td className="border-b border-gray-200 px-4 py-2 font-mono font-semibold text-blue-600 dark:border-gray-700 dark:text-blue-400">{col.name}</td>
                                  <td className="border-b border-gray-200 px-4 py-2 font-mono text-purple-600 dark:border-gray-700 dark:text-purple-400">{col.type}</td>
                                  <td className="border-b border-gray-200 px-4 py-2 font-mono text-sm text-gray-600 dark:border-gray-700 dark:text-gray-400">{col.constraints}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="border-t border-gray-200 bg-blue-50 px-4 py-3 dark:border-gray-700 dark:bg-blue-900/20">
                          <p className="text-xs font-medium text-blue-900 dark:text-blue-300">
                            💡 Next: <code className="rounded bg-blue-100 px-2 py-0.5 font-mono text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">SELECT * FROM {tableName};</code> to view data
                          </p>
                        </div>
                      </div>
                    );
                  }
                }

                // ============================================================
                // INSERT - Show operation summary in table format
                // ============================================================
                if (queryType === 'INSERT') {
                  const rowCount = results.rowcount || 0;
                  return (
                    <div className="flex flex-1 min-h-0 flex-col">
                      <div className="border-b border-gray-200 bg-green-50 px-4 py-3 dark:border-gray-700 dark:bg-green-900/20">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                          <div>
                            <h3 className="text-sm font-bold text-green-900 dark:text-green-300">
                              INSERT: {rowCount} row{rowCount !== 1 ? 's' : ''} → "{tableName}"
                            </h3>
                            <p className="text-xs text-green-700 dark:text-green-400">
                              {executionStats.executionTime.toFixed(2)}ms
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 min-h-0 overflow-auto">
                        <table className="w-full border-collapse text-sm">
                          <thead className="sticky top-0 z-10 bg-gray-100 dark:bg-gray-700">
                            <tr>
                              <th className="border-b-2 border-gray-300 px-4 py-2 text-left font-semibold text-gray-700 dark:border-gray-600 dark:text-gray-200">Operation</th>
                              <th className="border-b-2 border-gray-300 px-4 py-2 text-left font-semibold text-gray-700 dark:border-gray-600 dark:text-gray-200">Table</th>
                              <th className="border-b-2 border-gray-300 px-4 py-2 text-left font-semibold text-gray-700 dark:border-gray-600 dark:text-gray-200">Rows Affected</th>
                              <th className="border-b-2 border-gray-300 px-4 py-2 text-left font-semibold text-gray-700 dark:border-gray-600 dark:text-gray-200">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                              <td className="border-b border-gray-200 px-4 py-2 font-mono font-semibold text-green-600 dark:border-gray-700 dark:text-green-400">INSERT</td>
                              <td className="border-b border-gray-200 px-4 py-2 font-mono text-blue-600 dark:border-gray-700 dark:text-blue-400">{tableName}</td>
                              <td className="border-b border-gray-200 px-4 py-2 font-bold text-green-600 dark:border-gray-700 dark:text-green-400">{rowCount}</td>
                              <td className="border-b border-gray-200 px-4 py-2 text-green-600 dark:border-gray-700 dark:text-green-400">Completed</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <div className="border-t border-gray-200 bg-blue-50 px-4 py-3 dark:border-gray-700 dark:bg-blue-900/20">
                        <p className="text-xs font-medium text-blue-900 dark:text-blue-300">
                          💡 Next: <code className="rounded bg-blue-100 px-2 py-0.5 font-mono text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">SELECT * FROM {tableName};</code> to view inserted data
                        </p>
                      </div>
                    </div>
                  );
                }

                // ============================================================
                // UPDATE - Show operation summary in table format
                // ============================================================
                if (queryType === 'UPDATE') {
                  const rowCount = results.rowcount || 0;
                  const whereMatch = query.match(/WHERE\s+(.+?)(?:;|$)/i);
                  const condition = whereMatch ? whereMatch[1].trim() : 'All rows';

                  return (
                    <div className="flex flex-1 min-h-0 flex-col">
                      <div className="border-b border-gray-200 bg-green-50 px-4 py-3 dark:border-gray-700 dark:bg-green-900/20">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                          <div>
                            <h3 className="text-sm font-bold text-orange-900 dark:text-orange-300">
                              UPDATE: {rowCount} row{rowCount !== 1 ? 's' : ''} in "{tableName}"
                            </h3>
                            <p className="text-xs text-orange-700 dark:text-orange-400">
                              {executionStats.executionTime.toFixed(2)}ms
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 min-h-0 overflow-auto">
                        <table className="w-full border-collapse text-sm">
                          <thead className="sticky top-0 z-10 bg-gray-100 dark:bg-gray-700">
                            <tr>
                              <th className="border-b-2 border-gray-300 px-4 py-2 text-left font-semibold text-gray-700 dark:border-gray-600 dark:text-gray-200">Operation</th>
                              <th className="border-b-2 border-gray-300 px-4 py-2 text-left font-semibold text-gray-700 dark:border-gray-600 dark:text-gray-200">Table</th>
                              <th className="border-b-2 border-gray-300 px-4 py-2 text-left font-semibold text-gray-700 dark:border-gray-600 dark:text-gray-200">Rows Affected</th>
                              <th className="border-b-2 border-gray-300 px-4 py-2 text-left font-semibold text-gray-700 dark:border-gray-600 dark:text-gray-200">Condition</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                              <td className="border-b border-gray-200 px-4 py-2 font-mono font-semibold text-orange-600 dark:border-gray-700 dark:text-orange-400">UPDATE</td>
                              <td className="border-b border-gray-200 px-4 py-2 font-mono text-blue-600 dark:border-gray-700 dark:text-blue-400">{tableName}</td>
                              <td className="border-b border-gray-200 px-4 py-2 font-bold text-orange-600 dark:border-gray-700 dark:text-orange-400">{rowCount}</td>
                              <td className="border-b border-gray-200 px-4 py-2 font-mono text-sm text-gray-600 dark:border-gray-700 dark:text-gray-400">{condition.substring(0, 60)}{condition.length > 60 ? '...' : ''}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <div className="border-t border-gray-200 bg-blue-50 px-4 py-3 dark:border-gray-700 dark:bg-blue-900/20">
                        <p className="text-xs font-medium text-blue-900 dark:text-blue-300">
                          💡 Next: <code className="rounded bg-blue-100 px-2 py-0.5 font-mono text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">SELECT * FROM {tableName};</code> to verify updates
                        </p>
                      </div>
                    </div>
                  );
                }

                // ============================================================
                // DELETE - Show operation summary in table format
                // ============================================================
                if (queryType === 'DELETE') {
                  const rowCount = results.rowcount || 0;
                  const whereMatch = query.match(/WHERE\s+(.+?)(?:;|$)/i);
                  const condition = whereMatch ? whereMatch[1].trim() : 'All rows';

                  return (
                    <div className="flex flex-1 min-h-0 flex-col">
                      <div className="border-b border-gray-200 bg-red-50 px-4 py-3 dark:border-gray-700 dark:bg-red-900/20">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                          <div>
                            <h3 className="text-sm font-bold text-red-900 dark:text-red-300">
                              DELETE: {rowCount} row{rowCount !== 1 ? 's' : ''} from "{tableName}"
                            </h3>
                            <p className="text-xs text-red-700 dark:text-red-400">
                              {executionStats.executionTime.toFixed(2)}ms
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 min-h-0 overflow-auto">
                        <table className="w-full border-collapse text-sm">
                          <thead className="sticky top-0 z-10 bg-gray-100 dark:bg-gray-700">
                            <tr>
                              <th className="border-b-2 border-gray-300 px-4 py-2 text-left font-semibold text-gray-700 dark:border-gray-600 dark:text-gray-200">Operation</th>
                              <th className="border-b-2 border-gray-300 px-4 py-2 text-left font-semibold text-gray-700 dark:border-gray-600 dark:text-gray-200">Table</th>
                              <th className="border-b-2 border-gray-300 px-4 py-2 text-left font-semibold text-gray-700 dark:border-gray-600 dark:text-gray-200">Rows Deleted</th>
                              <th className="border-b-2 border-gray-300 px-4 py-2 text-left font-semibold text-gray-700 dark:border-gray-600 dark:text-gray-200">Condition</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                              <td className="border-b border-gray-200 px-4 py-2 font-mono font-semibold text-red-600 dark:border-gray-700 dark:text-red-400">DELETE</td>
                              <td className="border-b border-gray-200 px-4 py-2 font-mono text-blue-600 dark:border-gray-700 dark:text-blue-400">{tableName}</td>
                              <td className="border-b border-gray-200 px-4 py-2 font-bold text-red-600 dark:border-gray-700 dark:text-red-400">{rowCount}</td>
                              <td className="border-b border-gray-200 px-4 py-2 font-mono text-sm text-gray-600 dark:border-gray-700 dark:text-gray-400">{condition.substring(0, 60)}{condition.length > 60 ? '...' : ''}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <div className="border-t border-gray-200 bg-blue-50 px-4 py-3 dark:border-gray-700 dark:bg-blue-900/20">
                        <p className="text-xs font-medium text-blue-900 dark:text-blue-300">
                          💡 Next: <code className="rounded bg-blue-100 px-2 py-0.5 font-mono text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">SELECT COUNT(*) FROM {tableName};</code> to check remaining rows
                        </p>
                      </div>
                    </div>
                  );
                }

                // ============================================================
                // DROP/ALTER/TRUNCATE - Show simple table format
                // ============================================================
                return (
                  <div className="flex flex-1 min-h-0 flex-col">
                    <div className="border-b border-gray-200 bg-green-50 px-4 py-3 dark:border-gray-700 dark:bg-green-900/20">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                        <div>
                          <h3 className="text-sm font-bold text-green-900 dark:text-green-300">
                            {queryType}: "{tableName}"
                          </h3>
                          <p className="text-xs text-green-700 dark:text-green-400">
                            {executionStats.executionTime.toFixed(2)}ms
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 min-h-0 overflow-auto">
                      <table className="w-full border-collapse text-sm">
                        <thead className="sticky top-0 z-10 bg-gray-100 dark:bg-gray-700">
                          <tr>
                            <th className="border-b-2 border-gray-300 px-4 py-2 text-left font-semibold text-gray-700 dark:border-gray-600 dark:text-gray-200">Operation</th>
                            <th className="border-b-2 border-gray-300 px-4 py-2 text-left font-semibold text-gray-700 dark:border-gray-600 dark:text-gray-200">Target</th>
                            <th className="border-b-2 border-gray-300 px-4 py-2 text-left font-semibold text-gray-700 dark:border-gray-600 dark:text-gray-200">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="border-b border-gray-200 px-4 py-2 font-mono font-semibold text-green-600 dark:border-gray-700 dark:text-green-400">{queryType}</td>
                            <td className="border-b border-gray-200 px-4 py-2 font-mono text-blue-600 dark:border-gray-700 dark:text-blue-400">{tableName}</td>
                            <td className="border-b border-gray-200 px-4 py-2 text-green-600 dark:border-gray-700 dark:text-green-400">Completed</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="border-t border-gray-200 bg-blue-50 px-4 py-3 dark:border-gray-700 dark:bg-blue-900/20">
                      <p className="text-xs font-medium text-blue-900 dark:text-blue-300">
                        💡 Check Schema Explorer (left sidebar) to see updated database structure
                      </p>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                  <Play className="h-7 w-7 text-gray-300 dark:text-gray-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Run a query to see results</p>
                  <p className="mt-1 text-xs text-gray-400">
                    Press{' '}
                    <kbd className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 font-mono text-xs dark:border-gray-700 dark:bg-gray-800">⌘</kbd>
                    {' '}/{' '}
                    <kbd className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 font-mono text-xs dark:border-gray-700 dark:bg-gray-800">Ctrl</kbd>
                    {' '}+{' '}
                    <kbd className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 font-mono text-xs dark:border-gray-700 dark:bg-gray-800">Enter</kbd>
                    {' '}to execute
                  </p>
                </div>
                <div className="flex items-center gap-6 text-xs text-gray-400">
                  <span className="flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5" />Use Templates for quick queries</span>
                  <span className="flex items-center gap-1.5"><History className="h-3.5 w-3.5" />History auto-saves executions</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Status Bar */}
      <div className="flex items-center justify-between border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white px-6 py-2.5 dark:border-gray-700 dark:from-gray-900 dark:to-gray-800">
        <div className="flex items-center gap-6">
          {/* Connection */}
          <div className="flex items-center gap-2">
            <Database className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-medium text-gray-900 dark:text-white">
              {activeConnection.name}
            </span>
          </div>

          <div className="h-4 w-px bg-gray-300 dark:bg-gray-600" />

          {/* Execution Time */}
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {executionStats.executionTime > 0 ? `${executionStats.executionTime.toFixed(2)}ms` : '-'}
            </span>
          </div>

          <div className="h-4 w-px bg-gray-300 dark:bg-gray-600" />

          {/* Row Count */}
          <div className="flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {executionStats.returnedDocs > 0 ? `${executionStats.returnedDocs.toLocaleString()} rows` : 'No rows'}
            </span>
          </div>

          {/* Query Length */}
          {query && (
            <>
              <div className="h-4 w-px bg-gray-300 dark:bg-gray-600" />
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {query.length} chars
                </span>
              </div>
            </>
          )}
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-2 rounded-full px-3 py-1 ${
            isExecuting
              ? 'bg-yellow-100 dark:bg-yellow-900/30'
              : error
              ? 'bg-red-100 dark:bg-red-900/30'
              : results.rowcount > 0
              ? 'bg-green-100 dark:bg-green-900/30'
              : 'bg-gray-100 dark:bg-gray-700'
          }`}>
            {isExecuting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-yellow-600 dark:text-yellow-400" />
                <span className="text-xs font-semibold text-yellow-700 dark:text-yellow-400">
                  Executing
                </span>
              </>
            ) : error ? (
              <>
                <AlertCircle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                <span className="text-xs font-semibold text-red-700 dark:text-red-400">
                  Failed
                </span>
              </>
            ) : results.rowcount > 0 ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                <span className="text-xs font-semibold text-green-700 dark:text-green-400">
                  Success
                </span>
              </>
            ) : (
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Ready
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Saved Queries Dialog */}
      <SavedQueries
        isOpen={showSavedQueries}
        onClose={() => setShowSavedQueries(false)}
        onSelectQuery={setQuery}
        connectionId={activeConnection?.id}
      />

      {/* Save Query Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="relative w-full max-w-md mx-4 bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Save Query
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={saveQueryData.name}
                  onChange={(e) => setSaveQueryData({ ...saveQueryData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="My Query"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={saveQueryData.description}
                  onChange={(e) => setSaveQueryData({ ...saveQueryData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                  placeholder="Optional description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Folder
                </label>
                <input
                  type="text"
                  value={saveQueryData.folder}
                  onChange={(e) => setSaveQueryData({ ...saveQueryData, folder: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Analytics"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={saveQueryData.tags}
                  onChange={(e) => setSaveQueryData({ ...saveQueryData, tags: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="reports, users, monthly"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSaveQuery}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Save Query
                </button>
                <button
                  onClick={() => {
                    setShowSaveDialog(false);
                    setSaveQueryData({ name: '', description: '', folder: '', tags: '' });
                  }}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Dialog */}
      {showShortcuts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-3xl bg-white dark:bg-gray-800 rounded-lg shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-white dark:from-blue-900/20 dark:to-gray-800 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Keyboard className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Keyboard Shortcuts
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Boost your productivity with these shortcuts
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowShortcuts(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="max-h-[70vh] overflow-y-auto p-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Query Execution */}
                <div className="space-y-3">
                  <h4 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    <Play className="h-4 w-4 text-green-600 dark:text-green-400" />
                    Query Execution
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-900/50">
                      <span className="text-sm text-gray-700 dark:text-gray-300">Execute query</span>
                      <kbd className="rounded bg-gray-200 px-2 py-1 text-xs font-semibold text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                        Cmd+Enter
                      </kbd>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-900/50">
                      <span className="text-sm text-gray-700 dark:text-gray-300">Explain query</span>
                      <kbd className="rounded bg-gray-200 px-2 py-1 text-xs font-semibold text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                        Cmd+Shift+E
                      </kbd>
                    </div>
                  </div>
                </div>

                {/* File Operations */}
                <div className="space-y-3">
                  <h4 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    <SaveIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    File Operations
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-900/50">
                      <span className="text-sm text-gray-700 dark:text-gray-300">Save query</span>
                      <kbd className="rounded bg-gray-200 px-2 py-1 text-xs font-semibold text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                        Cmd+S
                      </kbd>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-900/50">
                      <span className="text-sm text-gray-700 dark:text-gray-300">Open saved queries</span>
                      <kbd className="rounded bg-gray-200 px-2 py-1 text-xs font-semibold text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                        Cmd+O
                      </kbd>
                    </div>
                  </div>
                </div>

                {/* Editor Actions */}
                <div className="space-y-3">
                  <h4 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    <Wand2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    Editor Actions
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-900/50">
                      <span className="text-sm text-gray-700 dark:text-gray-300">Format SQL</span>
                      <kbd className="rounded bg-gray-200 px-2 py-1 text-xs font-semibold text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                        Cmd+Shift+F
                      </kbd>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-900/50">
                      <span className="text-sm text-gray-700 dark:text-gray-300">Toggle comment</span>
                      <kbd className="rounded bg-gray-200 px-2 py-1 text-xs font-semibold text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                        Cmd+/
                      </kbd>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-900/50">
                      <span className="text-sm text-gray-700 dark:text-gray-300">Duplicate line</span>
                      <kbd className="rounded bg-gray-200 px-2 py-1 text-xs font-semibold text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                        Cmd+Shift+D
                      </kbd>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-900/50">
                      <span className="text-sm text-gray-700 dark:text-gray-300">Find</span>
                      <kbd className="rounded bg-gray-200 px-2 py-1 text-xs font-semibold text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                        Cmd+F
                      </kbd>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-900/50">
                      <span className="text-sm text-gray-700 dark:text-gray-300">Replace</span>
                      <kbd className="rounded bg-gray-200 px-2 py-1 text-xs font-semibold text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                        Cmd+H
                      </kbd>
                    </div>
                  </div>
                </div>

                {/* Tab Navigation */}
                <div className="space-y-3">
                  <h4 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    <FileText className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    Tab Navigation
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-900/50">
                      <span className="text-sm text-gray-700 dark:text-gray-300">New tab</span>
                      <kbd className="rounded bg-gray-200 px-2 py-1 text-xs font-semibold text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                        Cmd+T
                      </kbd>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-900/50">
                      <span className="text-sm text-gray-700 dark:text-gray-300">Close tab</span>
                      <kbd className="rounded bg-gray-200 px-2 py-1 text-xs font-semibold text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                        Cmd+W
                      </kbd>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-900/50">
                      <span className="text-sm text-gray-700 dark:text-gray-300">Next tab</span>
                      <kbd className="rounded bg-gray-200 px-2 py-1 text-xs font-semibold text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                        Cmd+]
                      </kbd>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-900/50">
                      <span className="text-sm text-gray-700 dark:text-gray-300">Previous tab</span>
                      <kbd className="rounded bg-gray-200 px-2 py-1 text-xs font-semibold text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                        Cmd+[
                      </kbd>
                    </div>
                  </div>
                </div>

                {/* Results Actions */}
                <div className="space-y-3">
                  <h4 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    <Download className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                    Results Actions
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-900/50">
                      <span className="text-sm text-gray-700 dark:text-gray-300">Export CSV</span>
                      <kbd className="rounded bg-gray-200 px-2 py-1 text-xs font-semibold text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                        Cmd+Shift+C
                      </kbd>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-900/50">
                      <span className="text-sm text-gray-700 dark:text-gray-300">Export JSON</span>
                      <kbd className="rounded bg-gray-200 px-2 py-1 text-xs font-semibold text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                        Cmd+Shift+J
                      </kbd>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-900/50">
                      <span className="text-sm text-gray-700 dark:text-gray-300">Copy results</span>
                      <kbd className="rounded bg-gray-200 px-2 py-1 text-xs font-semibold text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                        Cmd+Shift+Copy
                      </kbd>
                    </div>
                  </div>
                </div>

                {/* General */}
                <div className="space-y-3">
                  <h4 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    <Keyboard className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    General
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-900/50">
                      <span className="text-sm text-gray-700 dark:text-gray-300">Show shortcuts</span>
                      <kbd className="rounded bg-gray-200 px-2 py-1 text-xs font-semibold text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                        Cmd+K
                      </kbd>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-900/50">
                      <span className="text-sm text-gray-700 dark:text-gray-300">Toggle sidebar</span>
                      <kbd className="rounded bg-gray-200 px-2 py-1 text-xs font-semibold text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                        Cmd+B
                      </kbd>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 px-6 py-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Replace <kbd className="rounded bg-gray-200 px-1.5 py-0.5 text-xs font-semibold dark:bg-gray-700">Cmd</kbd> with{' '}
                  <kbd className="rounded bg-gray-200 px-1.5 py-0.5 text-xs font-semibold dark:bg-gray-700">Ctrl</kbd> on Windows/Linux
                </p>
                <button
                  onClick={() => setShowShortcuts(false)}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SQL Documentation Modal */}
      {showDocsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="h-[90vh] w-[90vw] max-w-7xl rounded-lg bg-white shadow-xl dark:bg-gray-900">
            <SQLDocumentation
              onClose={() => setShowDocsModal(false)}
              onInsertExample={(sql) => {
                setQuery(sql);
                setShowDocsModal(false);
              }}
            />
          </div>
        </div>
      )}
      </div>
    </DndProvider>
  );
}
