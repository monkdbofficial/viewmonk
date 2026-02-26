'use client';

import { useState, useEffect } from 'react';
import { GitBranch, RefreshCw, Database } from 'lucide-react';
import { useActiveConnection } from '../lib/monkdb-context';
import { useSchemaMetadata } from '../lib/hooks/useSchemaMetadata';
import { useToast } from '../components/ToastContext';
import { useTheme } from '../components/ThemeProvider';
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
  const { theme } = useTheme();
  const D = theme === 'dark';

  const C = {
    bgApp:         D ? '#0f1f30'   : '#f1f5f9',
    bgHeader:      D ? '#0e1e2e'   : '#ffffff',
    bgInput:       D ? '#1a3048'   : '#f1f5f9',
    border:        D ? '#1a3050'   : '#e2e8f0',
    textPrimary:   D ? '#d1d5db'   : '#1e293b',
    textSecondary: D ? '#9ca3af'   : '#475569',
    textMuted:     D ? '#6b7280'   : '#94a3b8',
    accent:        '#3b82f6',
    accentText:    D ? '#93c5fd'   : '#1d4ed8',
    accentBg:      'rgba(59,130,246,0.12)',
    accentBorder:  D ? 'rgba(59,130,246,0.35)' : 'rgba(59,130,246,0.3)',
    hoverBg:       D ? 'rgba(148,163,184,0.07)' : 'rgba(0,0,0,0.04)',
  };

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
    if (selectedSchema) fetchSchemaMetadata();
  }, [selectedSchema]);

  const fetchSchemaMetadata = async () => {
    if (!activeConnection || !selectedSchema) return;
    setLoading(true);
    try {
      const tablesResult = await activeConnection.client.query(
        `SELECT table_name
         FROM information_schema.tables
         WHERE table_schema = ?
           AND table_type = 'BASE TABLE'
         ORDER BY table_name`,
        [selectedSchema]
      );
      const tableNames = tablesResult.rows.map((row: any[]) => row[0]);
      const tableMetadata: TableMetadata[] = [];

      for (const tableName of tableNames) {
        let columnsResult;
        let usingShowColumns = true;
        try {
          columnsResult = await activeConnection.client.query(
            `SHOW COLUMNS FROM ${tableName} IN ${selectedSchema}`
          );
        } catch {
          usingShowColumns = false;
          columnsResult = await activeConnection.client.query(
            `SELECT column_name, data_type, is_nullable
             FROM information_schema.columns
             WHERE table_schema = '${selectedSchema}'
               AND table_name = '${tableName}'
             ORDER BY ordinal_position`
          );
        }

        const pkColumns = new Set<string>();
        if (usingShowColumns) {
          columnsResult.rows.forEach((row: any[]) => {
            const key = row[3];
            if (key && (key === 'PRI' || key.includes('PRI'))) pkColumns.add(row[0]);
          });
        } else {
          const hasIdColumn = columnsResult.rows.some((row: any[]) => row[0] === 'id');
          if (hasIdColumn) pkColumns.add('id');
        }

        const fkMap = new Map<string, { table: string; column: string }>();
        columnsResult.rows.forEach((row: any[]) => {
          const columnName = row[0];
          if (columnName.endsWith('_id') || (columnName.endsWith('Id') && columnName !== 'id')) {
            let referencedTable = columnName.replace(/_id$/, '').replace(/Id$/, '');
            if (!tableNames.includes(referencedTable)) {
              const pluralized = referencedTable + 's';
              if (tableNames.includes(pluralized)) referencedTable = pluralized;
            }
            if (tableNames.includes(referencedTable)) {
              fkMap.set(columnName, { table: referencedTable, column: 'id' });
            }
          }
        });

        const columns = columnsResult.rows.map((row: any[]) => {
          const columnName = row[0];
          const dataType   = row[1];
          const isNullable = row[2];
          const references = fkMap.get(columnName);
          return {
            name: columnName,
            type: dataType,
            nullable: isNullable === 'YES',
            isPrimaryKey: pkColumns.has(columnName),
            isForeignKey: references !== undefined,
            references,
          };
        });

        tableMetadata.push({ name: tableName, columns });
      }

      setTables(tableMetadata);
      success('Schema Loaded', `Loaded ${tableMetadata.length} tables`);
    } catch (err: any) {
      showError('Failed to Load Schema', err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!activeConnection) {
    return (
      <div style={{ margin: '-2rem', height: 'calc(100vh - 4rem)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bgApp }}>
        <ConnectionPrompt onConnect={() => {}} />
      </div>
    );
  }

  return (
    <div style={{ margin: '-2rem', height: 'calc(100vh - 4rem)', display: 'flex', flexDirection: 'column', background: C.bgApp, fontFamily: 'var(--font-geist-sans), system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', background: C.bgHeader, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: C.accentBg, border: `1px solid ${C.accentBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GitBranch style={{ width: 15, height: 15, color: C.accentText }} />
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: C.textPrimary, lineHeight: 1.2 }}>ER Diagram</p>
            <p style={{ fontSize: 11, color: C.textMuted }}>Visual schema explorer</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Schema selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Database style={{ width: 13, height: 13, color: C.textMuted }} />
            <select
              value={selectedSchema}
              onChange={e => setSelectedSchema(e.target.value)}
              style={{ background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 7, color: C.textPrimary, fontSize: 13, padding: '5px 10px', outline: 'none', cursor: 'pointer' }}
            >
              {schemas.map(s => (
                <option key={s.name} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Refresh */}
          <button
            onClick={fetchSchemaMetadata}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 7, background: 'transparent', border: `1px solid ${C.border}`, color: loading ? C.textMuted : C.textSecondary, fontSize: 13, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = C.hoverBg; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            <RefreshCw style={{ width: 13, height: 13, animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {loading && tables.length === 0 ? (
          <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', background: C.bgApp }}>
            <div style={{ textAlign: 'center' }}>
              <RefreshCw style={{ width: 40, height: 40, color: C.accent, animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
              <p style={{ color: C.textSecondary, fontSize: 14 }}>Loading schema…</p>
            </div>
          </div>
        ) : tables.length === 0 ? (
          <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', background: C.bgApp }}>
            <div style={{ textAlign: 'center' }}>
              <Database style={{ width: 48, height: 48, color: C.textMuted, margin: '0 auto 16px' }} />
              <p style={{ fontSize: 16, color: C.textSecondary, marginBottom: 6 }}>No tables found</p>
              <p style={{ fontSize: 13, color: C.textMuted }}>Select a schema or create some tables</p>
            </div>
          </div>
        ) : (
          <SimpleERDiagram
            tables={tables}
            onTableClick={() => {}}
          />
        )}
      </div>

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}
