'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Plus, Trash2, Copy, Check,
  AlertTriangle, CheckCircle2, XCircle, Loader2, Database, Table2, ChevronDown, Search,
} from 'lucide-react';
import { generateCreateTableSQL, validateTableDesign } from './SQLGenerator';
import { useActiveConnection } from '../../lib/monkdb-context';
import { useToast } from '../ToastContext';
import { useSchema } from '../../contexts/schema-context';
import { useSchemaMetadata } from '../../lib/hooks/useSchemaMetadata';

// ─── Interfaces ───────────────────────────────────────────────────────────────
export interface ColumnDefinition {
  name: string;
  column_type: string;
  constraints: string[];
  default_value?: string;
  description?: string;
  generated_expression?: string;
  index_method?: 'PLAIN' | 'FULLTEXT' | 'OFF';
  index_analyzer?: string;
  check_expression?: string;
  storage_options?: Record<string, any>;
}
export interface ShardingConfig {
  shard_count: number;
  clustering_column?: string;
}
export interface PartitionConfig {
  enabled: boolean;
  partition_type?: 'RANGE' | 'LIST' | 'HASH';
  partition_column?: string;
}
export interface ReplicationConfig {
  number_of_replicas: number;
  tier_allocation?: 'hot' | 'warm' | 'cold';
}
export interface TableDesign {
  schema_name: string;
  table_name: string;
  columns: ColumnDefinition[];
  sharding_config?: ShardingConfig;
  partition_config?: PartitionConfig;
  replication_config?: ReplicationConfig;
}
interface TableDesignerWizardProps {
  connectionId: string;
  onClose: () => void;
  onSuccess: () => void;
}

// ─── Color tokens — match app's exact dark palette ────────────────────────────
// App uses: #0A1929 (layout/sidebar), #0D1B2A (content), #001E2B (nav)
const C = {
  bgPanel:   '#112233',   // left sidebar + SQL panel
  bgApp:     '#162840',   // center column grid
  bgHeader:  '#0e1e2e',   // sticky column header / toolbars
  bgInput:   '#1a3048',   // inputs & selects fill
  bgDropdown:'#152d45',   // type-selector dropdown bg

  // Borders — solid so they're always visible
  border:    '#1a3050',
  borderSub: '#112540',
  borderFocus: '#2563eb',  // blue-700 focus ring

  // Text — high-contrast grays matching app Tailwind classes
  textPrimary:   '#d1d5db',  // gray-300  — main text (sidebar menu items use this)
  textSecondary: '#9ca3af',  // gray-400  — secondary / descriptions
  textLabel:     '#9ca3af',  // gray-400  — section labels, field labels
  textMuted:     '#6b7280',  // gray-500  — faint hints, row numbers
  textDisabled:  '#374151',  // gray-700  — truly disabled

  // Blue accent — matches sidebar's blue-500/20 + blue-300 pattern
  accent:      '#3b82f6',   // blue-500
  accentHover: '#60a5fa',   // blue-400
  accentText:  '#93c5fd',   // blue-300 (sidebar active text)
  accentBg:    'rgba(59,130,246,0.14)',
  accentBorder:'rgba(59,130,246,0.4)',

  // Status
  success:  '#4ade80',  // green-400
  warning:  '#fbbf24',  // amber-400
  error:    '#f87171',  // red-400
  errorText:'#fca5a5',  // red-300
};

// ─── Column types ─────────────────────────────────────────────────────────────
const COLUMN_TYPES = [
  { group: 'Numeric',       types: ['INTEGER', 'BIGINT', 'SMALLINT', 'FLOAT', 'DOUBLE PRECISION', 'NUMERIC', 'DECIMAL', 'BYTE', 'SHORT', 'LONG'] },
  { group: 'String',        types: ['TEXT', 'VARCHAR', 'CHAR'] },
  { group: 'Boolean',       types: ['BOOLEAN'] },
  { group: 'Date / Time',   types: ['TIMESTAMP WITH TIME ZONE', 'TIMESTAMP', 'DATE', 'TIME'] },
  { group: 'JSON / Object', types: ['OBJECT', 'OBJECT(DYNAMIC)', 'OBJECT(STRICT)', 'OBJECT(IGNORED)'] },
  { group: 'Array',         types: ['ARRAY(TEXT)', 'ARRAY(INTEGER)', 'ARRAY(FLOAT)', 'ARRAY(OBJECT)', 'ARRAY(BIGINT)'] },
  { group: 'Geospatial',    types: ['GEO_POINT', 'GEO_SHAPE'] },
  { group: 'Other',         types: ['IP', 'FLOAT_VECTOR', 'BIT', 'BINARY'] },
];

function typeBadge(t: string): { bg: string; text: string; border: string } {
  if (/^(INTEGER|BIGINT|SMALLINT|FLOAT|DOUBLE|NUMERIC|DECIMAL|BYTE|SHORT|LONG)/.test(t))
    return { bg: 'rgba(59,130,246,0.15)', text: '#93c5fd', border: 'rgba(59,130,246,0.3)' };
  if (/^(TEXT|VARCHAR|CHAR)/.test(t))
    return { bg: 'rgba(52,211,153,0.12)', text: '#6ee7b7', border: 'rgba(52,211,153,0.28)' };
  if (/^(BOOLEAN)/.test(t))
    return { bg: 'rgba(167,139,250,0.12)', text: '#c4b5fd', border: 'rgba(167,139,250,0.28)' };
  if (/^(TIMESTAMP|DATE|TIME)/.test(t))
    return { bg: 'rgba(251,191,36,0.12)', text: '#fde68a', border: 'rgba(251,191,36,0.28)' };
  if (/^(OBJECT|ARRAY)/.test(t))
    return { bg: 'rgba(251,146,60,0.12)', text: '#fed7aa', border: 'rgba(251,146,60,0.28)' };
  return { bg: 'rgba(148,163,184,0.1)', text: '#94a3b8', border: 'rgba(148,163,184,0.25)' };
}

function newColumn(): ColumnDefinition {
  return { name: '', column_type: 'TEXT', constraints: [], default_value: '' };
}

function sqlLineColor(line: string): string {
  const t = line.trim();
  if (/^(CREATE TABLE|CLUSTERED|PARTITIONED|WITH|IF NOT EXISTS)\b/.test(t)) return C.accentText;
  if (/\b(PRIMARY KEY|NOT NULL|NULL|UNIQUE|DEFAULT|INDEX|GENERATED|CHECK|ALWAYS AS)\b/.test(line)) return '#fde68a';
  if (/^\s*\)/.test(line) || /^\s*--/.test(line)) return C.textMuted;
  if (/^\s*(number_of_replicas|refresh_interval)\b/.test(t)) return '#c4b5fd';
  return C.textPrimary;
}

// ─── Searchable type selector ─────────────────────────────────────────────────
function TypeSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const badge = typeBadge(value);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!containerRef.current?.contains(t) && !dropRef.current?.contains(t)) {
        setOpen(false); setSearch('');
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); setSearch(''); }
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 0);
  }, [open]);

  const handleToggle = () => {
    if (!open && containerRef.current) {
      const r = containerRef.current.getBoundingClientRect();
      setDropPos({ top: r.bottom + 4, left: r.left, width: r.width });
    }
    setOpen(v => !v);
  };

  const filtered = COLUMN_TYPES
    .map(g => ({ ...g, types: g.types.filter(t => t.toLowerCase().includes(search.toLowerCase().trim())) }))
    .filter(g => g.types.length > 0);

  const dropdown = open && (
    <div
      ref={dropRef}
      style={{
        position: 'fixed',
        top: dropPos.top,
        left: dropPos.left,
        minWidth: dropPos.width,
        width: 220,
        zIndex: 9999,
        background: C.bgDropdown,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
        overflow: 'hidden',
      }}
    >
      {/* Search input */}
      <div style={{ padding: '8px 10px', borderBottom: `1px solid ${C.borderSub}`, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Search style={{ width: 13, height: 13, color: C.textMuted, flexShrink: 0 }} />
        <input
          ref={searchRef}
          type="text"
          placeholder="Search types…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            color: C.textPrimary, fontSize: 13, padding: 0,
          }}
        />
      </div>
      {/* List */}
      <div style={{ maxHeight: 220, overflowY: 'auto' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 14, textAlign: 'center', color: C.textMuted, fontSize: 13 }}>No types found</div>
        ) : (
          filtered.map(g => (
            <div key={g.group}>
              <div style={{ padding: '5px 10px 2px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.textMuted }}>
                {g.group}
              </div>
              {g.types.map(t => {
                const b = typeBadge(t);
                const isSelected = t === value;
                return (
                  <button
                    key={t}
                    onClick={() => { onChange(t); setOpen(false); setSearch(''); }}
                    style={{
                      width: '100%', textAlign: 'left',
                      padding: '6px 10px',
                      background: isSelected ? C.accentBg : 'transparent',
                      border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      transition: 'background 0.08s',
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(148,163,184,0.06)'; }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 500, color: b.text, fontFamily: 'var(--font-geist-mono), monospace' }}>{t}</span>
                    {isSelected && <Check style={{ width: 11, height: 11, color: C.accentText, flexShrink: 0 }} />}
                  </button>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {/* Trigger */}
      <button
        onClick={handleToggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6,
          background: badge.bg, border: `1px solid ${open ? C.borderFocus : badge.border}`,
          borderRadius: 5, padding: '5px 8px', cursor: 'pointer', transition: 'border-color 0.1s',
        }}
      >
        <span style={{ color: badge.text, fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-geist-mono), monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {value}
        </span>
        <ChevronDown style={{ width: 12, height: 12, color: badge.text, flexShrink: 0, transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.15s' }} />
      </button>

      {/* Dropdown — portal-rendered to escape overflow:hidden/auto ancestors */}
      {typeof document !== 'undefined' && dropdown && createPortal(dropdown, document.body)}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TableDesignerWizard({ onClose, onSuccess }: TableDesignerWizardProps) {
  const activeConnection = useActiveConnection();
  const { success: showSuccess, error: showError } = useToast();
  const { activeSchema } = useSchema();
  const { schemas, tables: existingTables } = useSchemaMetadata();

  const [design, setDesign] = useState<TableDesign>({
    schema_name: activeSchema || 'doc',
    table_name: '',
    columns: [newColumn()],
    sharding_config: { shard_count: 6 },
    partition_config: { enabled: false },
    replication_config: { number_of_replicas: 1, tier_allocation: 'hot' },
  });
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [focusedRow, setFocusedRow] = useState<number | null>(null);

  const sql = useMemo(() => {
    if (!design.table_name.trim() || design.columns.length === 0) return '';
    try { return generateCreateTableSQL(design); } catch { return ''; }
  }, [design]);
  const validation = useMemo(() => validateTableDesign(design, existingTables), [design, existingTables]);
  const canCreate = validation.valid && !!design.table_name.trim() && design.columns.length > 0 && !creating;

  // Can only add a new column once the last column has a name AND data type
  const lastCol = design.columns[design.columns.length - 1];
  const canAddColumn = lastCol.name.trim().length > 0 && !!lastCol.column_type;

  const addColumn = () => {
    if (!canAddColumn) return;
    setDesign(d => ({ ...d, columns: [...d.columns, newColumn()] }));
    setTimeout(() => setFocusedRow(design.columns.length), 0);
  };

  const removeColumn = (i: number) =>
    setDesign(d => ({ ...d, columns: d.columns.filter((_, j) => j !== i) }));

  const updateColumn = (i: number, patch: Partial<ColumnDefinition>) =>
    setDesign(d => ({ ...d, columns: d.columns.map((c, j) => j === i ? { ...c, ...patch } : c) }));

  const toggleConstraint = (i: number, flag: string) => {
    const col = design.columns[i];
    const has = col.constraints.includes(flag);
    let next = has ? col.constraints.filter(c => c !== flag) : [...col.constraints, flag];
    if (flag === 'PRIMARY KEY' && !has) next = [...new Set([...next, 'NOT NULL'])];
    updateColumn(i, { constraints: next });
  };

  const handleCreate = async () => {
    if (!canCreate || !activeConnection) return;
    setCreating(true);
    try {
      await activeConnection.client.query(sql);
      showSuccess('Table Created', `${design.schema_name}.${design.table_name} created successfully`);
      onSuccess();
    } catch (err: any) {
      showError('Failed to Create Table', err.message || 'Unknown error');
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = () => {
    if (!sql) return;
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const pkCount = design.columns.filter(c => c.constraints.includes('PRIMARY KEY')).length;
  const filledCols = design.columns.filter(c => c.name.trim()).length;
  const partitionEnabled = design.partition_config?.enabled ?? false;

  const inputSt: React.CSSProperties = {
    width: '100%', background: C.bgInput,
    border: `1px solid ${C.border}`, borderRadius: 6,
    color: C.textPrimary, fontSize: 13, padding: '6px 10px',
    outline: 'none', appearance: 'auto' as any,
  };

  const statusColor =
    !design.table_name.trim() || validation.errors.length > 0 ? C.error :
    validation.warnings.length > 0 ? C.warning :
    filledCols === 0 ? C.textMuted : C.success;

  const statusLabel =
    !design.table_name.trim() ? 'Unnamed' :
    validation.errors.length > 0 ? 'Has errors' :
    validation.warnings.length > 0 ? 'Warnings' :
    filledCols === 0 ? 'No columns' : 'Ready';

  return (
    <div style={{
      display: 'flex', height: '100%',
      background: C.bgApp,
      fontFamily: 'var(--font-geist-sans), -apple-system, system-ui, sans-serif',
      color: C.textPrimary, overflow: 'hidden',
    }}>

      {/* ══ LEFT SIDEBAR ════════════════════════════════════════════════════ */}
      <div style={{
        width: 236, flexShrink: 0,
        background: C.bgPanel,
        borderRight: `1px solid ${C.border}`,
        display: 'flex', flexDirection: 'column', overflowY: 'auto',
      }}>
        {/* Brand + Close */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 30, height: 30, background: C.accentBg, border: `1px solid ${C.accentBorder}`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Table2 style={{ width: 15, height: 15, color: C.accentText }} />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary, lineHeight: 1.3 }}>Table Designer</p>
              <p style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.3 }}>MonkDB</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ padding: 5, borderRadius: 6, color: C.textSecondary, background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(148,163,184,0.1)'; e.currentTarget.style.color = C.textPrimary; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.textSecondary; }}
          >
            <X style={{ width: 15, height: 15 }} />
          </button>
        </div>

        {/* TABLE IDENTITY */}
        <SidebarSection label="Table Identity">
          <SidebarField label="Schema">
            <select value={design.schema_name} onChange={e => setDesign(d => ({ ...d, schema_name: e.target.value }))} style={inputSt}
              onFocus={e => e.currentTarget.style.borderColor = C.borderFocus}
              onBlur={e => e.currentTarget.style.borderColor = C.border}>
              {schemas.length > 0
                ? schemas.map(s => <option key={s.name} value={s.name}>{s.name}</option>)
                : <option value={design.schema_name}>{design.schema_name}</option>}
            </select>
          </SidebarField>
          <SidebarField label="Table Name">
            <input type="text" placeholder="e.g. users" value={design.table_name}
              onChange={e => setDesign(d => ({ ...d, table_name: e.target.value }))}
              spellCheck={false}
              style={{ ...inputSt, fontWeight: design.table_name ? 500 : 400 }}
              onFocus={e => e.currentTarget.style.borderColor = C.borderFocus}
              onBlur={e => e.currentTarget.style.borderColor = C.border}
            />
          </SidebarField>
        </SidebarSection>

        {/* STORAGE */}
        <SidebarSection label="Storage">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <SidebarField label="Shards">
              <input type="number" min={1} max={32} value={design.sharding_config?.shard_count ?? 6}
                onChange={e => setDesign(d => ({ ...d, sharding_config: { ...d.sharding_config!, shard_count: Math.max(1, Math.min(32, +e.target.value)) } }))}
                style={inputSt}
                onFocus={e => e.currentTarget.style.borderColor = C.borderFocus}
                onBlur={e => e.currentTarget.style.borderColor = C.border}
              />
            </SidebarField>
            <SidebarField label="Replicas">
              <input type="number" min={0} max={5} value={design.replication_config?.number_of_replicas ?? 1}
                onChange={e => setDesign(d => ({ ...d, replication_config: { ...d.replication_config!, number_of_replicas: Math.max(0, Math.min(5, +e.target.value)) } }))}
                style={inputSt}
                onFocus={e => e.currentTarget.style.borderColor = C.borderFocus}
                onBlur={e => e.currentTarget.style.borderColor = C.border}
              />
            </SidebarField>
          </div>
          <SidebarField label="Storage Tier">
            <select value={design.replication_config?.tier_allocation ?? 'hot'}
              onChange={e => setDesign(d => ({ ...d, replication_config: { ...d.replication_config!, tier_allocation: e.target.value as any } }))}
              style={inputSt}>
              <option value="hot">Hot (SSD)</option>
              <option value="warm">Warm (HDD)</option>
              <option value="cold">Cold (Archive)</option>
            </select>
          </SidebarField>
          <SidebarField label="Clustering Column">
            <select value={design.sharding_config?.clustering_column ?? ''}
              onChange={e => setDesign(d => ({ ...d, sharding_config: { ...d.sharding_config!, clustering_column: e.target.value || undefined } }))}
              style={inputSt}>
              <option value="">Auto</option>
              {design.columns.filter(c => c.name.trim()).map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </SidebarField>
        </SidebarSection>

        {/* PARTITIONING */}
        <SidebarSection label="Partitioning">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <ToggleSwitch checked={partitionEnabled} onChange={v => setDesign(d => ({ ...d, partition_config: { ...d.partition_config!, enabled: v } }))} />
            <span style={{ fontSize: 13, color: partitionEnabled ? C.accentText : C.textSecondary }}>
              {partitionEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </label>
          {partitionEnabled && (
            <>
              <SidebarField label="Type">
                <select value={design.partition_config?.partition_type ?? 'RANGE'}
                  onChange={e => setDesign(d => ({ ...d, partition_config: { ...d.partition_config!, partition_type: e.target.value as any } }))}
                  style={inputSt}>
                  <option value="RANGE">RANGE</option>
                  <option value="LIST">LIST</option>
                  <option value="HASH">HASH</option>
                </select>
              </SidebarField>
              <SidebarField label="Column">
                <select value={design.partition_config?.partition_column ?? ''}
                  onChange={e => setDesign(d => ({ ...d, partition_config: { ...d.partition_config!, partition_column: e.target.value || undefined } }))}
                  style={inputSt}>
                  <option value="">— select —</option>
                  {design.columns.filter(c => c.name.trim()).map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </SidebarField>
            </>
          )}
        </SidebarSection>

        {/* SUMMARY */}
        <div style={{ marginTop: 'auto', padding: '14px 16px', borderTop: `1px solid ${C.borderSub}` }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.textLabel, marginBottom: 10 }}>
            Summary
          </p>
          <StatRow label="Columns" value={filledCols} valueColor={filledCols > 0 ? C.textPrimary : C.textMuted} />
          <StatRow label="Primary Keys" value={pkCount} valueColor={pkCount > 0 ? C.accentText : C.textMuted} />
          <StatRow label="Status" value={statusLabel} valueColor={statusColor} />
        </div>
      </div>

      {/* ══ CENTER: Column Grid ══════════════════════════════════════════════ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0, background: C.bgApp }}>

        {/* ── Toolbar ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px',
          background: C.bgHeader,
          borderBottom: `1px solid ${C.border}`,
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.textLabel }}>
              Columns
            </span>
            <span style={{
              fontSize: 11, fontWeight: 700,
              background: C.accentBg, color: C.accentText,
              border: `1px solid ${C.accentBorder}`,
              borderRadius: 10, padding: '1px 8px',
            }}>
              {design.columns.length}
            </span>
          </div>
          <button
            onClick={addColumn}
            disabled={!canAddColumn}
            title={!canAddColumn ? 'Fill in the current column name before adding another' : undefined}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: canAddColumn ? C.accentBg : 'rgba(148,163,184,0.05)',
              color: canAddColumn ? C.accentText : C.textMuted,
              border: `1px solid ${canAddColumn ? C.accentBorder : C.borderSub}`,
              borderRadius: 6, padding: '6px 14px',
              fontSize: 13, fontWeight: 600,
              cursor: canAddColumn ? 'pointer' : 'not-allowed',
              transition: 'all 0.1s',
            }}
            onMouseEnter={e => { if (canAddColumn) { e.currentTarget.style.background = 'rgba(59,130,246,0.22)'; e.currentTarget.style.color = C.accentHover; } }}
            onMouseLeave={e => { if (canAddColumn) { e.currentTarget.style.background = C.accentBg; e.currentTarget.style.color = C.accentText; } }}
          >
            <Plus style={{ width: 13, height: 13 }} />
            Add Column
          </button>
        </div>

        {/* ── Column table ── */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
          <div style={{ minWidth: 700 }}>

            {/* ── Header row ── */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: COL_GRID,
              position: 'sticky', top: 0, zIndex: 10,
              background: C.bgHeader,
              borderBottom: `1px solid ${GB.head}`,
            }}>
              <div style={thCell({ align: 'center' })}>#</div>
              <div style={thCell({})}>Column Name</div>
              <div style={thCell({})}>Data Type</div>
              <div style={thCell({})}>Default</div>
              {/* Constraint group — strong left separator before PK */}
              <div style={{ ...thCell({ align: 'center', color: C.textLabel, leftSep: true }), background: 'rgba(148,163,184,0.04)' }}>Primary Key</div>
              <div style={{ ...thCell({ align: 'center', color: '#fde68a' }), background: 'rgba(148,163,184,0.04)' }}>Not Null</div>
              <div style={{ ...thCell({ align: 'center', color: '#c4b5fd' }), background: 'rgba(148,163,184,0.04)' }}>Unique</div>
              <div style={{ borderRight: 'none' }} />
            </div>

            {/* ── Data rows ── */}
            {design.columns.map((col, i) => {
              const isPK = col.constraints.includes('PRIMARY KEY');
              const isNN = col.constraints.includes('NOT NULL');
              const isUQ = col.constraints.includes('UNIQUE');
              const hasName = col.name.trim().length > 0;

              return (
                <div
                  key={i}
                  className="group"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: COL_GRID,
                    minHeight: 52,
                    borderBottom: `1px solid ${GB.row}`,
                    background: isPK ? 'rgba(59,130,246,0.04)' : 'transparent',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { if (!isPK) (e.currentTarget as HTMLDivElement).style.background = 'rgba(148,163,184,0.04)'; }}
                  onMouseLeave={e => { if (!isPK) (e.currentTarget as HTMLDivElement).style.background = isPK ? 'rgba(59,130,246,0.04)' : 'transparent'; }}
                >
                  {/* # */}
                  <div style={dcell({ align: 'center' })}>
                    <span style={{ fontSize: 12, color: C.textMuted, fontVariantNumeric: 'tabular-nums' }}>{i + 1}</span>
                  </div>

                  {/* Column Name */}
                  <div style={dcell({ px: 6 })}>
                    <input
                      autoFocus={i === focusedRow}
                      type="text"
                      value={col.name}
                      onChange={e => updateColumn(i, { name: e.target.value })}
                      onFocus={() => setFocusedRow(i)}
                      onBlur={() => setFocusedRow(null)}
                      placeholder="column_name"
                      spellCheck={false}
                      style={{
                        width: '100%',
                        background: 'transparent',
                        border: '1px solid transparent',
                        borderRadius: 5,
                        color: hasName ? C.textPrimary : C.textSecondary,
                        fontSize: 14,
                        fontWeight: isPK ? 600 : 400,
                        padding: '6px 8px',
                        outline: 'none',
                        fontFamily: 'var(--font-geist-mono), monospace',
                        transition: 'border-color 0.1s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(148,163,184,0.3)')}
                      onMouseLeave={e => { if (document.activeElement !== e.currentTarget) (e.currentTarget as HTMLInputElement).style.borderColor = 'transparent'; }}
                      onFocusCapture={e => (e.currentTarget.style.borderColor = C.borderFocus)}
                      onBlurCapture={e => (e.currentTarget.style.borderColor = 'transparent')}
                    />
                  </div>

                  {/* Data Type */}
                  <div style={dcell({ px: 8 })}>
                    <TypeSelector value={col.column_type} onChange={v => updateColumn(i, { column_type: v })} />
                  </div>

                  {/* Default */}
                  <div style={dcell({ px: 8 })}>
                    <input
                      type="text"
                      value={col.default_value ?? ''}
                      onChange={e => updateColumn(i, { default_value: e.target.value })}
                      placeholder="NULL"
                      spellCheck={false}
                      style={{
                        width: '100%',
                        background: 'transparent',
                        border: '1px solid transparent',
                        borderRadius: 5,
                        color: col.default_value ? C.textSecondary : C.textMuted,
                        fontSize: 13,
                        padding: '6px 8px',
                        outline: 'none',
                        fontFamily: 'var(--font-geist-mono), monospace',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = C.border)}
                      onMouseLeave={e => { if (document.activeElement !== e.currentTarget) (e.currentTarget as HTMLInputElement).style.borderColor = 'transparent'; }}
                      onFocusCapture={e => (e.currentTarget.style.borderColor = C.borderFocus)}
                      onBlurCapture={e => (e.currentTarget.style.borderColor = 'transparent')}
                    />
                  </div>

                  {/* Primary Key — strong left separator matches header */}
                  <div style={dcell({ align: 'center', leftSep: true })}>
                    <ConstraintCheck active={isPK} onClick={() => toggleConstraint(i, 'PRIMARY KEY')} color={C.accent} activeText={C.accentText} />
                  </div>

                  {/* Not Null */}
                  <div style={dcell({ align: 'center' })}>
                    <ConstraintCheck active={isNN} onClick={() => !isPK && toggleConstraint(i, 'NOT NULL')} color="#f59e0b" activeText="#fde68a" disabled={isPK} />
                  </div>

                  {/* Unique */}
                  <div style={dcell({ align: 'center' })}>
                    <ConstraintCheck active={isUQ} onClick={() => toggleConstraint(i, 'UNIQUE')} color="#8b5cf6" activeText="#c4b5fd" />
                  </div>

                  {/* Delete */}
                  <div style={dcell({ align: 'center', noBorder: true })}>
                    <button
                      onClick={() => removeColumn(i)}
                      disabled={design.columns.length === 1}
                      className="opacity-0 group-hover:opacity-100"
                      style={{
                        padding: 5, borderRadius: 4,
                        background: 'transparent', border: 'none',
                        color: C.textMuted,
                        cursor: design.columns.length === 1 ? 'not-allowed' : 'pointer',
                        display: 'flex', transition: 'color 0.1s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.color = C.error)}
                      onMouseLeave={e => (e.currentTarget.style.color = C.textMuted)}
                    >
                      <Trash2 style={{ width: 13, height: 13 }} />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* ── Ghost add row ── */}
            <div
              onClick={addColumn}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 16px',
                color: canAddColumn ? C.textSecondary : C.textMuted,
                cursor: canAddColumn ? 'pointer' : 'not-allowed',
                fontSize: 13,
                borderBottom: `1px solid ${GB.row}`,
                transition: 'all 0.1s',
              }}
              onMouseEnter={e => { if (canAddColumn) (e.currentTarget as HTMLDivElement).style.background = 'rgba(148,163,184,0.03)'; }}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
            >
              <Plus style={{ width: 13, height: 13 }} />
              <span>
                {canAddColumn ? 'Add column…' : 'Enter a column name above before adding another'}
              </span>
            </div>

          </div>
        </div>
      </div>

      {/* ══ RIGHT: SQL Preview ══════════════════════════════════════════════ */}
      <div style={{ width: 400, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderLeft: `1px solid ${C.border}`, background: C.bgPanel }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: C.bgHeader, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.textLabel }}>
            SQL Preview
          </span>
          <button onClick={handleCopy} disabled={!sql}
            style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: copied ? C.success : C.textSecondary, background: 'transparent', border: 'none', borderRadius: 5, padding: '4px 8px', cursor: sql ? 'pointer' : 'not-allowed', opacity: sql ? 1 : 0.35, transition: 'all 0.1s' }}
            onMouseEnter={e => { if (sql) e.currentTarget.style.background = 'rgba(148,163,184,0.08)'; }}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            {copied ? <><Check style={{ width: 13, height: 13 }} /> Copied</> : <><Copy style={{ width: 13, height: 13 }} /> Copy</>}
          </button>
        </div>

        {/* SQL code */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '12px 0', background: C.bgPanel }}>
          {sql ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-geist-mono), monospace', fontSize: 13, lineHeight: 1.7 }}>
              <tbody>
                {sql.split('\n').map((line, i) => (
                  <tr key={i}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(148,163,184,0.04)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ textAlign: 'right', paddingRight: 14, paddingLeft: 12, userSelect: 'none', color: C.textMuted, minWidth: 32, verticalAlign: 'top', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
                      {i + 1}
                    </td>
                    <td style={{ color: sqlLineColor(line), whiteSpace: 'pre-wrap', wordBreak: 'break-all', paddingRight: 16, verticalAlign: 'top' }}>
                      {line || '\u00a0'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 10 }}>
              <Database style={{ width: 28, height: 28, color: C.textMuted }} />
              <p style={{ fontSize: 13, color: C.textSecondary, textAlign: 'center', lineHeight: 1.6 }}>
                Enter a table name and<br />add columns to generate SQL
              </p>
            </div>
          )}
        </div>

        {/* Validation */}
        <div style={{ flexShrink: 0, padding: '10px 16px', borderTop: `1px solid ${C.borderSub}`, minHeight: 42, display: 'flex', alignItems: 'flex-start' }}>
          {validation.errors.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {validation.errors.slice(0, 3).map((e, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                  <XCircle style={{ width: 13, height: 13, color: C.error, flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontSize: 12, color: C.errorText, lineHeight: 1.4 }}>{e}</span>
                </div>
              ))}
              {validation.errors.length > 3 && <span style={{ fontSize: 12, color: 'rgba(252,165,165,0.5)', marginLeft: 19 }}>+{validation.errors.length - 3} more</span>}
            </div>
          ) : validation.warnings.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {validation.warnings.slice(0, 2).map((w, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                  <AlertTriangle style={{ width: 13, height: 13, color: C.warning, flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontSize: 12, color: '#fde68a', lineHeight: 1.4 }}>{w}</span>
                </div>
              ))}
            </div>
          ) : sql ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle2 style={{ width: 13, height: 13, color: C.success }} />
              <span style={{ fontSize: 12, fontWeight: 500, color: C.success }}>Ready to create</span>
            </div>
          ) : (
            <span style={{ fontSize: 12, color: C.textMuted }}>—</span>
          )}
        </div>

        {/* Stats */}
        {sql && (
          <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', padding: '6px 16px', borderTop: `1px solid ${C.borderSub}`, fontSize: 11, color: C.textSecondary }}>
            <span>{filledCols} col{filledCols !== 1 ? 's' : ''} · {pkCount} PK</span>
            <span>{design.sharding_config?.shard_count ?? 6} shards · {design.replication_config?.number_of_replicas ?? 1} replicas</span>
          </div>
        )}

        {/* Create Table */}
        <div style={{ flexShrink: 0, padding: '12px 16px', borderTop: `1px solid ${C.border}` }}>
          <button onClick={handleCreate} disabled={!canCreate}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '10px 0', borderRadius: 8, border: 'none',
              fontSize: 14, fontWeight: 600,
              cursor: canCreate ? 'pointer' : 'not-allowed',
              background: canCreate ? C.accent : 'rgba(148,163,184,0.08)',
              color: canCreate ? '#fff' : C.textMuted,
              boxShadow: canCreate ? '0 0 18px rgba(59,130,246,0.3)' : 'none',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => { if (canCreate) { e.currentTarget.style.background = C.accentHover; e.currentTarget.style.boxShadow = '0 0 24px rgba(96,165,250,0.4)'; } }}
            onMouseLeave={e => { if (canCreate) { e.currentTarget.style.background = C.accent; e.currentTarget.style.boxShadow = '0 0 18px rgba(59,130,246,0.3)'; } }}
          >
            {creating ? <><Loader2 className="animate-spin" style={{ width: 15, height: 15 }} /> Creating…</> : 'Create Table'}
          </button>
        </div>
      </div>

    </div>
  );
}

// ─── Column grid layout constants ─────────────────────────────────────────────
// # | Name | Data Type | Default | PK | Not Null | Unique | del
const COL_GRID = '44px 1fr 180px 96px 88px 80px 70px 44px';

// Subtle border values for the column grid — softer than panel borders
const GB = {
  col:     'rgba(148,163,184,0.15)',  // column divider (header)
  colRow:  'rgba(148,163,184,0.12)',  // column divider (data rows)
  row:     'rgba(148,163,184,0.10)',  // row separator
  sep:     'rgba(148,163,184,0.20)',  // strong constraint-group separator
  head:    'rgba(148,163,184,0.18)',  // header bottom line
};

function thCell(opts: {
  align?: 'left' | 'center';
  color?: string;
  noBorder?: boolean;
  leftSep?: boolean;
}): React.CSSProperties {
  return {
    padding: '0 12px',
    height: 36,
    fontSize: 11, fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    color: opts.color ?? C.textLabel,
    whiteSpace: 'nowrap' as const,
    userSelect: 'none' as const,
    display: 'flex', alignItems: 'center',
    justifyContent: opts.align === 'center' ? 'center' : 'flex-start',
    borderRight: opts.noBorder ? 'none' : `1px solid ${GB.col}`,
    ...(opts.leftSep ? { borderLeft: `1px solid ${GB.sep}` } : {}),
  };
}

function dcell(opts: {
  align?: 'left' | 'center';
  noBorder?: boolean;
  leftSep?: boolean;
  px?: number;
}): React.CSSProperties {
  const px = opts.px ?? (opts.align === 'center' ? 0 : 10);
  return {
    padding: `0 ${px}px`,
    display: 'flex', alignItems: 'center',
    justifyContent: opts.align === 'center' ? 'center' : 'flex-start',
    borderRight: opts.noBorder ? 'none' : `1px solid ${GB.colRow}`,
    ...(opts.leftSep ? { borderLeft: `1px solid ${GB.sep}` } : {}),
    minWidth: 0, overflow: 'hidden',
  };
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function SidebarSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.borderSub}` }}>
      <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.textLabel, marginBottom: 10 }}>
        {label}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{children}</div>
    </div>
  );
}

function SidebarField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: C.textLabel }}>{label}</span>
      {children}
    </div>
  );
}

function StatRow({ label, value, valueColor }: { label: string; value: string | number; valueColor: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
      <span style={{ fontSize: 12, color: C.textSecondary }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: valueColor, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  );
}

function ConstraintCheck({ active, onClick, color, activeText, disabled = false }:
  { active: boolean; onClick: () => void; color: string; activeText: string; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 22, height: 22, borderRadius: 5, flexShrink: 0,
        border: `1.5px solid ${active ? color : 'rgba(148,163,184,0.28)'}`,
        background: active ? `${color}20` : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.32 : 1,
        transition: 'all 0.12s ease',
      }}
      onMouseEnter={e => { if (!disabled && !active) e.currentTarget.style.borderColor = color; }}
      onMouseLeave={e => { if (!disabled && !active) e.currentTarget.style.borderColor = 'rgba(148,163,184,0.28)'; }}
    >
      {active && <Check style={{ width: 13, height: 13, color: activeText, strokeWidth: 2.5 }} />}
    </button>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)}
      style={{
        position: 'relative', width: 32, height: 18, borderRadius: 9,
        background: checked ? C.accent : 'rgba(148,163,184,0.15)',
        border: `1px solid ${checked ? C.accentBorder : C.border}`,
        cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s',
      }}
    >
      <span style={{
        position: 'absolute', top: 2, left: 2, width: 12, height: 12, borderRadius: '50%',
        background: checked ? '#fff' : C.textSecondary,
        boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
        transform: checked ? 'translateX(14px)' : 'translateX(0)',
        transition: 'transform 0.2s, background 0.2s', display: 'block',
      }} />
    </button>
  );
}
