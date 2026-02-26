'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Plus, Trash2, Copy, Check, ChevronDown, ChevronRight, Search,
  AlertTriangle, CheckCircle2, XCircle, Loader2, Database, Table2, Info,
} from 'lucide-react';
import { generateCreateTableSQL, validateTableDesign } from './SQLGenerator';
import { useActiveConnection } from '../../lib/monkdb-context';
import { useToast } from '../ToastContext';
import { useSchema } from '../../contexts/schema-context';
import { useSchemaMetadata } from '../../lib/hooks/useSchemaMetadata';

// ─── Interfaces ────────────────────────────────────────────────────────────────
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
  column_policy?: 'strict' | 'dynamic';
  refresh_interval?: number;
}
interface TableDesignerWizardProps {
  connectionId: string;
  onClose: () => void;
  onSuccess: () => void;
}

// ─── Column types (MonkDB-documented types only) ──────────────────────────────
const COLUMN_TYPES = [
  { group: 'Integer',      types: ['INTEGER', 'BIGINT', 'SMALLINT', 'BYTE'] },
  { group: 'Floating',     types: ['FLOAT', 'DOUBLE PRECISION', 'REAL'] },
  { group: 'String',       types: ['TEXT', 'VARCHAR', 'CHAR'] },
  { group: 'Boolean',      types: ['BOOLEAN'] },
  { group: 'Date / Time',  types: ['TIMESTAMP WITH TIME ZONE', 'TIMESTAMP', 'DATE', 'TIME'] },
  { group: 'JSON / Object',types: ['OBJECT', 'OBJECT(DYNAMIC)', 'OBJECT(STRICT)'] },
  { group: 'Array',        types: ['ARRAY(TEXT)', 'ARRAY(INTEGER)', 'ARRAY(BIGINT)', 'ARRAY(FLOAT)', 'ARRAY(BOOLEAN)', 'ARRAY(OBJECT)'] },
  { group: 'Geospatial',   types: ['GEO_POINT', 'GEO_SHAPE'] },
  { group: 'Vector / AI',  types: ['FLOAT_VECTOR'] },
];

const FULLTEXT_ANALYZERS = [
  'standard', 'english', 'german', 'french', 'spanish', 'italian',
  'portuguese', 'russian',
];

// ─── Helpers ───────────────────────────────────────────────────────────────────
function getTypeClasses(t: string): string {
  const base = t.split('(')[0].toUpperCase().trim();
  if (/^(INTEGER|BIGINT|SMALLINT|BYTE|FLOAT|DOUBLE|REAL|NUMERIC|DECIMAL)$/.test(base))
    return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
  if (/^(TEXT|VARCHAR|CHAR)$/.test(base))
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
  if (/^BOOLEAN$/.test(base))
    return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
  if (/^(TIMESTAMP|DATE|TIME)/.test(base))
    return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
  if (/^(OBJECT|ARRAY)/.test(base))
    return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
  if (/^(GEO_POINT|GEO_SHAPE)$/.test(base))
    return 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300';
  if (/^FLOAT_VECTOR$/.test(base))
    return 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300';
  if (/^(IP|BIT|BINARY)$/.test(base))
    return 'bg-gray-100 text-gray-600 dark:bg-gray-700/50 dark:text-gray-400';
  return 'bg-gray-100 text-gray-600 dark:bg-gray-700/50 dark:text-gray-400';
}

function getSqlLineClass(line: string): string {
  const t = line.trim();
  if (/^(CREATE TABLE|CLUSTERED|PARTITIONED|WITH|IF NOT EXISTS)\b/.test(t)) return 'text-blue-300';
  if (/\b(PRIMARY KEY|NOT NULL|NULL|UNIQUE|DEFAULT|INDEX|GENERATED|CHECK|ALWAYS AS)\b/.test(line)) return 'text-yellow-300';
  if (/^\s*\)/.test(line) || /^\s*--/.test(line)) return 'text-gray-500';
  if (/^\s*(number_of_replicas|refresh_interval|column_policy)\b/.test(t)) return 'text-purple-300';
  return 'text-gray-300';
}

function newColumn(): ColumnDefinition {
  return { name: '', column_type: 'TEXT', constraints: [] };
}

// ─── TypeSelector ──────────────────────────────────────────────────────────────
function TypeSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // The "base" type for list comparison (strip dimension from FLOAT_VECTOR(N))
  const baseValue = value.startsWith('FLOAT_VECTOR') ? 'FLOAT_VECTOR' : value;
  const cls = getTypeClasses(value);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node) && !dropRef.current?.contains(e.target as Node)) {
        setOpen(false); setSearch('');
      }
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); setSearch(''); } };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onMouseDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  useEffect(() => { if (open) setTimeout(() => searchRef.current?.focus(), 0); }, [open]);

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
      style={{ position: 'fixed', top: dropPos.top, left: dropPos.left, minWidth: Math.max(dropPos.width, 220), zIndex: 9999 }}
      className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800"
    >
      <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2 dark:border-gray-700">
        <Search className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
        <input ref={searchRef} type="text" placeholder="Search types…" value={search} onChange={e => setSearch(e.target.value)}
          className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none dark:text-gray-200" />
      </div>
      <div className="max-h-64 overflow-y-auto py-1">
        {filtered.length === 0 ? (
          <div className="py-4 text-center text-sm text-gray-400">No types found</div>
        ) : filtered.map(g => (
          <div key={g.group}>
            <div className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{g.group}</div>
            {g.types.map(t => {
              const tc = getTypeClasses(t);
              const isSel = t === baseValue;
              return (
                <button key={t} onClick={() => { onChange(t); setOpen(false); setSearch(''); }}
                  className={`flex w-full items-center justify-between px-3 py-1.5 text-left transition-colors ${isSel ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/40'}`}
                >
                  <div>
                    <span className={`rounded px-1.5 py-0.5 font-mono text-xs font-semibold ${tc}`}>{t}</span>
                    {t === 'FLOAT_VECTOR' && <span className="ml-2 text-xs text-gray-400">requires dimension</span>}
                    {t === 'UNIQUE' && <span className="ml-2 text-xs text-amber-500">not enforced</span>}
                  </div>
                  {isSel && <Check className="h-3.5 w-3.5 flex-shrink-0 text-blue-600 dark:text-blue-400" />}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div ref={containerRef} className="relative w-full">
      <button onClick={handleToggle}
        className={`flex w-full items-center justify-between gap-2 rounded-md border px-2 py-1.5 transition-all ${
          open ? 'border-blue-500 bg-white ring-2 ring-blue-500/20 dark:bg-gray-700'
               : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:hover:border-gray-500'
        }`}
      >
        <span className={`truncate rounded px-1.5 py-0.5 font-mono text-xs font-semibold ${cls}`}>{value}</span>
        <ChevronDown className={`h-3.5 w-3.5 flex-shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {typeof document !== 'undefined' && dropdown && createPortal(dropdown, document.body)}
    </div>
  );
}

// ─── ConstraintCheck ──────────────────────────────────────────────────────────
function ConstraintCheck({ active, onClick, color, disabled = false }: {
  active: boolean; onClick: () => void; color: 'blue' | 'amber' | 'purple'; disabled?: boolean;
}) {
  const activeClass = {
    blue:   'border-blue-500 bg-blue-50 text-blue-600 dark:border-blue-400 dark:bg-blue-900/20 dark:text-blue-400',
    amber:  'border-amber-500 bg-amber-50 text-amber-600 dark:border-amber-400 dark:bg-amber-900/20 dark:text-amber-400',
    purple: 'border-purple-500 bg-purple-50 text-purple-600 dark:border-purple-400 dark:bg-purple-900/20 dark:text-purple-400',
  }[color];
  return (
    <button onClick={onClick} disabled={disabled}
      className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded border-[1.5px] transition-all ${
        active ? activeClass : 'border-gray-300 bg-transparent hover:border-gray-400 dark:border-gray-500 dark:hover:border-gray-400'
      } ${disabled ? 'cursor-not-allowed opacity-30' : 'cursor-pointer'}`}
    >
      {active && <Check className="h-3.5 w-3.5 stroke-[2.5]" />}
    </button>
  );
}

// ─── ToggleSwitch ─────────────────────────────────────────────────────────────
function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 flex-shrink-0 rounded-full border transition-all ${
        checked ? 'border-blue-500 bg-blue-500' : 'border-gray-300 bg-gray-200 dark:border-gray-600 dark:bg-gray-700'
      }`}
    >
      <span className={`absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${checked ? 'left-[18px]' : 'left-0.5'}`} />
    </button>
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
    column_policy: 'strict',
    refresh_interval: 1000,
  });
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [focusedRow, setFocusedRow] = useState<number | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const sql = useMemo(() => {
    if (!design.table_name.trim() || design.columns.length === 0) return '';
    try { return generateCreateTableSQL(design); } catch { return ''; }
  }, [design]);

  const validation = useMemo(() => validateTableDesign(design, existingTables), [design, existingTables]);
  const canCreate = validation.valid && !!design.table_name.trim() && design.columns.length > 0 && !creating;

  const lastCol = design.columns[design.columns.length - 1];
  const canAddColumn = lastCol.name.trim().length > 0 && !!lastCol.column_type;

  const addColumn = () => {
    if (!canAddColumn) return;
    setDesign(d => ({ ...d, columns: [...d.columns, newColumn()] }));
    setTimeout(() => setFocusedRow(design.columns.length), 0);
  };

  const removeColumn = (i: number) => {
    setExpandedRows(prev => { const s = new Set(prev); s.delete(i); return s; });
    setDesign(d => ({ ...d, columns: d.columns.filter((_, j) => j !== i) }));
  };

  const updateColumn = (i: number, patch: Partial<ColumnDefinition>) =>
    setDesign(d => ({ ...d, columns: d.columns.map((c, j) => j === i ? { ...c, ...patch } : c) }));

  const toggleConstraint = (i: number, flag: string) => {
    const col = design.columns[i];
    const has = col.constraints.includes(flag);
    let next = has ? col.constraints.filter(c => c !== flag) : [...col.constraints, flag];
    if (flag === 'PRIMARY KEY' && !has) next = [...new Set([...next, 'NOT NULL'])];
    updateColumn(i, { constraints: next });
  };

  const toggleRowExpand = (i: number) =>
    setExpandedRows(prev => {
      const s = new Set(prev);
      s.has(i) ? s.delete(i) : s.add(i);
      return s;
    });

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

  const pkCount   = design.columns.filter(c => c.constraints.includes('PRIMARY KEY')).length;
  const filledCols = design.columns.filter(c => c.name.trim()).length;
  const partitionEnabled = design.partition_config?.enabled ?? false;
  const sqlLines = sql.split('\n');

  const statusClass =
    !design.table_name.trim() || validation.errors.length > 0 ? 'text-red-500 dark:text-red-400' :
    validation.warnings.length > 0 ? 'text-amber-500 dark:text-amber-400' :
    filledCols === 0 ? 'text-gray-400' : 'text-green-500 dark:text-green-400';

  const statusLabel =
    !design.table_name.trim() ? 'Unnamed' :
    validation.errors.length > 0 ? 'Has errors' :
    validation.warnings.length > 0 ? 'Has warnings' :
    filledCols === 0 ? 'No columns' : 'Ready';

  return (
    <div className="flex h-full overflow-hidden bg-gray-50 dark:bg-gray-900">

      {/* ══ LEFT SIDEBAR ═════════════════════════════════════════════════════ */}
      <div className="flex w-64 flex-shrink-0 flex-col overflow-y-auto border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">

        {/* Brand */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3.5 dark:border-gray-700">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Table2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">Table Designer</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">MonkDB</p>
            </div>
          </div>
          <button onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Table Identity */}
        <div className="border-b border-gray-200 px-4 py-4 dark:border-gray-700">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Table Identity</p>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Schema</label>
              <select value={design.schema_name} onChange={e => setDesign(d => ({ ...d, schema_name: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
                {schemas.length > 0
                  ? schemas.map(s => <option key={s.name} value={s.name}>{s.name}</option>)
                  : <option value={design.schema_name}>{design.schema_name}</option>}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Table Name</label>
              <input type="text" placeholder="e.g. sensor_readings" value={design.table_name}
                onChange={e => setDesign(d => ({ ...d, table_name: e.target.value }))} spellCheck={false}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-mono text-sm text-gray-800 placeholder-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-600" />
            </div>
          </div>
        </div>

        {/* Storage */}
        <div className="border-b border-gray-200 px-4 py-4 dark:border-gray-700">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Storage</p>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Shards</label>
                <input type="number" min={1} max={128} value={design.sharding_config?.shard_count ?? 6}
                  onChange={e => setDesign(d => ({ ...d, sharding_config: { ...d.sharding_config!, shard_count: Math.max(1, +e.target.value) } }))}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Replicas</label>
                <input type="number" min={0} max={10} value={design.replication_config?.number_of_replicas ?? 1}
                  onChange={e => setDesign(d => ({ ...d, replication_config: { ...d.replication_config!, number_of_replicas: Math.max(0, +e.target.value) } }))}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Storage Tier</label>
              <select value={design.replication_config?.tier_allocation ?? 'hot'}
                onChange={e => setDesign(d => ({ ...d, replication_config: { ...d.replication_config!, tier_allocation: e.target.value as any } }))}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white">
                <option value="hot">🔥 Hot (SSD)</option>
                <option value="warm">💾 Warm (HDD)</option>
                <option value="cold">❄️ Cold (Archive)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Clustering Column</label>
              <select value={design.sharding_config?.clustering_column ?? ''}
                onChange={e => setDesign(d => ({ ...d, sharding_config: { ...d.sharding_config!, clustering_column: e.target.value || undefined } }))}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white">
                <option value="">Auto (default)</option>
                {design.columns.filter(c => c.name.trim()).map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Partitioning */}
        <div className="border-b border-gray-200 px-4 py-4 dark:border-gray-700">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Partitioning</p>
          <div className="space-y-3">
            <label className="flex cursor-pointer items-center gap-3">
              <ToggleSwitch checked={partitionEnabled}
                onChange={v => setDesign(d => ({ ...d, partition_config: { ...d.partition_config!, enabled: v } }))} />
              <span className={`text-sm font-medium transition-colors ${partitionEnabled ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
                {partitionEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </label>
            {partitionEnabled && (
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                  Partition By Column
                </label>
                <select value={design.partition_config?.partition_column ?? ''}
                  onChange={e => setDesign(d => ({ ...d, partition_config: { ...d.partition_config!, partition_column: e.target.value || undefined } }))}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white">
                  <option value="">— select column —</option>
                  {design.columns
                    .filter(c => c.name.trim() && !c.column_type.toUpperCase().startsWith('OBJECT') && !c.column_type.toUpperCase().startsWith('ARRAY'))
                    .map(c => <option key={c.name} value={c.name}>{c.name} ({c.column_type})</option>)}
                </select>
                <p className="mt-1 text-xs text-gray-400">Primitive types only (no OBJECT/ARRAY)</p>
              </div>
            )}
          </div>
        </div>

        {/* Table Options */}
        <div className="border-b border-gray-200 px-4 py-4 dark:border-gray-700">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Table Options</p>
          <div className="space-y-3">
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                Column Policy
                <span title="strict: rejects unknown columns on insert. dynamic: auto-creates new columns." className="cursor-help">
                  <Info className="h-3 w-3 text-gray-400" />
                </span>
              </label>
              <div className="flex gap-1.5">
                {(['strict', 'dynamic'] as const).map(p => (
                  <button key={p} onClick={() => setDesign(d => ({ ...d, column_policy: p }))}
                    className={`flex-1 rounded-lg border py-1.5 text-xs font-semibold transition-colors capitalize ${
                      (design.column_policy ?? 'strict') === p
                        ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/20 dark:text-blue-300'
                        : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400'
                    }`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                Refresh Interval (ms)
                <span title="How often the table auto-refreshes. 0 disables auto-refresh." className="cursor-help">
                  <Info className="h-3 w-3 text-gray-400" />
                </span>
              </label>
              <div className="flex items-center gap-1.5">
                <input type="number" min={0} value={design.refresh_interval ?? 1000}
                  onChange={e => setDesign(d => ({ ...d, refresh_interval: Math.max(0, +e.target.value) }))}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
              </div>
              <div className="mt-1.5 flex gap-1">
                {[100, 1000, 5000, 0].map(v => (
                  <button key={v} onClick={() => setDesign(d => ({ ...d, refresh_interval: v }))}
                    className={`rounded px-1.5 py-0.5 text-xs font-medium transition-colors ${
                      (design.refresh_interval ?? 1000) === v
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400'
                    }`}>
                    {v === 0 ? 'Off' : `${v}ms`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="mt-auto border-t border-gray-100 px-4 py-4 dark:border-gray-700/60">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Summary</p>
          <div className="space-y-2.5">
            {[
              { label: 'Columns', value: String(filledCols), cls: filledCols > 0 ? 'text-gray-900 dark:text-white' : 'text-gray-400' },
              { label: 'Primary Keys', value: String(pkCount), cls: pkCount > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400' },
              { label: 'Status', value: statusLabel, cls: statusClass },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">{row.label}</span>
                <span className={`text-xs font-semibold ${row.cls}`}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ CENTER: Column Grid ═══════════════════════════════════════════════ */}
      <div className="flex flex-1 min-w-0 flex-col overflow-hidden">

        {/* Toolbar */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-5 py-2.5 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Columns</span>
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
              {design.columns.length}
            </span>
            <span className="text-xs text-gray-400">Click ▸ to expand advanced options per column</span>
          </div>
          <button onClick={addColumn} disabled={!canAddColumn}
            title={!canAddColumn ? 'Fill in the current column name first' : undefined}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-all ${
              canAddColumn ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-700'
                           : 'cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-gray-700/50 dark:text-gray-600'
            }`}>
            <Plus className="h-3.5 w-3.5" />Add Column
          </button>
        </div>

        {/* Column Table */}
        <div className="flex-1 overflow-auto">
          <table className="min-w-full border-collapse">
            <thead className="sticky top-0 z-10">
              <tr>
                <th className="w-8 border-b border-r border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900" />
                <th className="w-10 border-b border-r border-gray-200 bg-gray-50 px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-gray-400 dark:border-gray-700 dark:bg-gray-900">#</th>
                <th className="border-b border-r border-gray-200 bg-gray-50 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 dark:border-gray-700 dark:bg-gray-900">Column Name</th>
                <th className="w-52 border-b border-r border-gray-200 bg-gray-50 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 dark:border-gray-700 dark:bg-gray-900">Data Type</th>
                <th className="w-28 border-b border-r border-gray-200 bg-gray-50 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 dark:border-gray-700 dark:bg-gray-900">Default</th>
                <th className="w-16 border-b border-r border-gray-200 bg-gray-50 px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-blue-600 dark:border-gray-700 dark:bg-gray-900 dark:text-blue-400">PK</th>
                <th className="w-20 border-b border-r border-gray-200 bg-gray-50 px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-amber-600 dark:border-gray-700 dark:bg-gray-900 dark:text-amber-400">Not Null</th>
                <th className="w-20 border-b border-r border-gray-200 bg-gray-50 px-2 py-2.5 text-center dark:border-gray-700 dark:bg-gray-900">
                  <span className="text-xs font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">Unique</span>
                  <span className="ml-1 text-xs text-gray-400">(†)</span>
                </th>
                <th className="w-10 border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900" />
              </tr>
            </thead>
            <tbody>
              {design.columns.map((col, i) => {
                const isPK = col.constraints.includes('PRIMARY KEY');
                const isNN = col.constraints.includes('NOT NULL');
                const isUQ = col.constraints.includes('UNIQUE');
                const isExpanded = expandedRows.has(i);
                const hasAdvanced = !!(col.index_method || col.generated_expression || col.check_expression || col.constraints.includes('CHECK'));
                const isFloatVector = col.column_type.startsWith('FLOAT_VECTOR');

                return (
                  <React.Fragment key={i}>
                    {/* Main column row */}
                    <tr
                      className={`border-b border-gray-100 transition-colors dark:border-gray-700/60 ${
                        isPK ? 'bg-blue-50/40 dark:bg-blue-900/10' : 'bg-white hover:bg-gray-50/60 dark:bg-gray-800 dark:hover:bg-gray-700/20'
                      }`}
                    >
                      {/* Expand toggle */}
                      <td className="border-r border-gray-100 px-2 py-2 text-center dark:border-gray-700/60">
                        <button onClick={() => toggleRowExpand(i)}
                          className={`rounded p-0.5 transition-colors ${
                            isExpanded ? 'text-blue-500' : hasAdvanced ? 'text-amber-500' : 'text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400'
                          }`}
                          title="Toggle advanced column options">
                          {isExpanded
                            ? <ChevronDown className="h-3.5 w-3.5" />
                            : <ChevronRight className="h-3.5 w-3.5" />}
                        </button>
                      </td>

                      {/* # */}
                      <td className="border-r border-gray-100 px-3 py-2 text-center dark:border-gray-700/60">
                        <span className="font-mono text-xs text-gray-300 dark:text-gray-600">{i + 1}</span>
                      </td>

                      {/* Name */}
                      <td className="border-r border-gray-100 px-3 py-2 dark:border-gray-700/60">
                        <input autoFocus={i === focusedRow} type="text" value={col.name}
                          onChange={e => updateColumn(i, { name: e.target.value })}
                          onFocus={() => setFocusedRow(i)} onBlur={() => setFocusedRow(null)}
                          placeholder="column_name" spellCheck={false}
                          className={`w-full rounded border border-transparent bg-transparent px-2 py-1 font-mono text-sm transition-colors placeholder-gray-300 hover:border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20 dark:placeholder-gray-600 dark:hover:border-gray-600 ${
                            isPK ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-200'
                          }`} />
                      </td>

                      {/* Type + FLOAT_VECTOR dimension */}
                      <td className="border-r border-gray-100 px-3 py-2 dark:border-gray-700/60">
                        <TypeSelector
                          value={isFloatVector ? 'FLOAT_VECTOR' : col.column_type}
                          onChange={v => updateColumn(i, { column_type: v })}
                        />
                        {isFloatVector && (
                          <div className="mt-1 flex items-center gap-1">
                            <span className="text-xs text-gray-400">dim:</span>
                            <input type="number" min={1} max={4096}
                              value={col.column_type.match(/\((\d+)\)/)?.[1] ?? ''}
                              placeholder="e.g. 384"
                              onChange={e => {
                                const d = e.target.value;
                                updateColumn(i, { column_type: d ? `FLOAT_VECTOR(${d})` : 'FLOAT_VECTOR' });
                              }}
                              className="w-20 rounded border border-violet-200 bg-white px-2 py-0.5 font-mono text-xs text-violet-700 focus:border-violet-500 focus:outline-none dark:border-violet-800/50 dark:bg-gray-800 dark:text-violet-300" />
                          </div>
                        )}
                      </td>

                      {/* Default */}
                      <td className="border-r border-gray-100 px-3 py-2 dark:border-gray-700/60">
                        <input type="text" value={col.default_value ?? ''}
                          onChange={e => updateColumn(i, { default_value: e.target.value })}
                          placeholder={col.generated_expression ? '(generated)' : 'NULL'}
                          disabled={!!col.generated_expression}
                          spellCheck={false}
                          className="w-full rounded border border-transparent bg-transparent px-2 py-1 font-mono text-sm text-gray-600 placeholder-gray-300 transition-colors hover:border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-400 dark:placeholder-gray-600 dark:hover:border-gray-600" />
                      </td>

                      {/* PK */}
                      <td className="border-r border-gray-100 px-3 py-2 dark:border-gray-700/60">
                        <div className="flex justify-center">
                          <ConstraintCheck active={isPK} onClick={() => toggleConstraint(i, 'PRIMARY KEY')} color="blue" />
                        </div>
                      </td>

                      {/* Not Null */}
                      <td className="border-r border-gray-100 px-3 py-2 dark:border-gray-700/60">
                        <div className="flex justify-center">
                          <ConstraintCheck active={isNN} onClick={() => !isPK && toggleConstraint(i, 'NOT NULL')} color="amber" disabled={isPK} />
                        </div>
                      </td>

                      {/* Unique */}
                      <td className="border-r border-gray-100 px-3 py-2 dark:border-gray-700/60">
                        <div className="flex justify-center">
                          <ConstraintCheck active={isUQ} onClick={() => toggleConstraint(i, 'UNIQUE')} color="purple" />
                        </div>
                      </td>

                      {/* Delete */}
                      <td className="px-2 py-2 text-center">
                        {design.columns.length > 1 && (
                          <button onClick={() => removeColumn(i)}
                            className="group/del rounded p-1 text-gray-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                            style={{ opacity: undefined }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* Expanded advanced options sub-row */}
                    {isExpanded && (
                      <tr key={`exp-${i}`} className="border-b border-gray-100 dark:border-gray-700/60">
                        <td colSpan={9} className="bg-blue-50/30 px-6 pb-3 pt-2 dark:bg-blue-900/5">
                          <div className="flex flex-wrap items-start gap-4">

                            {/* Index method */}
                            <div>
                              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-400">
                                Index Method
                              </label>
                              <div className="flex gap-1">
                                {(['DEFAULT', 'PLAIN', 'FULLTEXT', 'OFF'] as const).map(m => (
                                  <button key={m}
                                    onClick={() => updateColumn(i, { index_method: m === 'DEFAULT' ? undefined : m })}
                                    className={`rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors ${
                                      (col.index_method ?? 'DEFAULT') === m
                                        ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/20 dark:text-blue-300'
                                        : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400'
                                    }`}>
                                    {m}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Analyzer (FULLTEXT only) */}
                            {col.index_method === 'FULLTEXT' && (
                              <div>
                                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-400">
                                  Analyzer
                                </label>
                                <select value={col.index_analyzer ?? 'standard'}
                                  onChange={e => updateColumn(i, { index_analyzer: e.target.value })}
                                  className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200">
                                  {FULLTEXT_ANALYZERS.map(a => <option key={a} value={a}>{a}</option>)}
                                </select>
                              </div>
                            )}

                            {/* Generated ALWAYS AS */}
                            <div className="min-w-52 flex-1">
                              <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                                <input type="checkbox"
                                  checked={col.generated_expression !== undefined && col.generated_expression !== ''}
                                  onChange={e => updateColumn(i, { generated_expression: e.target.checked ? '' : undefined })}
                                  className="h-3.5 w-3.5 accent-blue-600" />
                                Generated Always As
                              </label>
                              {col.generated_expression !== undefined && (
                                <input type="text" value={col.generated_expression}
                                  placeholder="e.g. date_trunc('day', ts)"
                                  onChange={e => updateColumn(i, { generated_expression: e.target.value })}
                                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 font-mono text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200" />
                              )}
                            </div>

                            {/* CHECK */}
                            <div className="min-w-48 flex-1">
                              <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                                <input type="checkbox"
                                  checked={col.constraints.includes('CHECK')}
                                  onChange={() => toggleConstraint(i, 'CHECK')}
                                  className="h-3.5 w-3.5 accent-blue-600" />
                                Check Constraint
                              </label>
                              {col.constraints.includes('CHECK') && (
                                <input type="text" value={col.check_expression ?? ''}
                                  placeholder="e.g. value > 0 AND value <= 100"
                                  onChange={e => updateColumn(i, { check_expression: e.target.value })}
                                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 font-mono text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200" />
                              )}
                            </div>

                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>

          {/* Ghost add row */}
          <div onClick={addColumn}
            className={`flex items-center gap-2 border-t border-gray-100 px-6 py-3 text-sm transition-colors dark:border-gray-700/60 ${
              canAddColumn
                ? 'cursor-pointer text-gray-400 hover:bg-blue-50/30 hover:text-blue-600 dark:hover:bg-blue-900/10 dark:hover:text-blue-400'
                : 'cursor-not-allowed text-gray-300 dark:text-gray-500'
            }`}>
            <Plus className="h-3.5 w-3.5" />
            <span>{canAddColumn ? 'Add column…' : 'Enter a column name above before adding another'}</span>
          </div>

          {/* UNIQUE disclaimer */}
          <div className="border-t border-gray-100 px-6 py-2 dark:border-gray-700/60">
            <p className="text-xs text-gray-400">
              <span className="font-semibold text-purple-600 dark:text-purple-400">† UNIQUE</span>
              {' '}is syntactically accepted by MonkDB but is <strong>not enforced</strong> at the database level — uniqueness must be managed in your application.
            </p>
          </div>
        </div>
      </div>

      {/* ══ RIGHT: SQL Preview ════════════════════════════════════════════════ */}
      <div className="flex w-[380px] flex-shrink-0 flex-col overflow-hidden border-l border-gray-200 dark:border-gray-700">

        {/* SQL header */}
        <div className="flex flex-shrink-0 items-center justify-between bg-slate-100 dark:bg-gray-950 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-400" />
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-gray-500">SQL Preview</span>
          </div>
          <button onClick={handleCopy} disabled={!sql}
            className="flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium text-slate-500 dark:text-gray-400 transition-colors hover:bg-slate-200 dark:hover:bg-gray-800 hover:text-slate-800 dark:hover:text-gray-200 disabled:opacity-30">
            {copied ? <><Check className="h-3 w-3" />Copied</> : <><Copy className="h-3 w-3" />Copy</>}
          </button>
        </div>

        {/* SQL code */}
        <div className="flex-1 min-h-0 overflow-auto bg-slate-100 dark:bg-gray-950">
          {sql ? (
            <div className="flex">
              <div className="select-none border-r border-slate-300 dark:border-gray-800 bg-slate-200/60 dark:bg-gray-900/60 px-3 py-3 text-right font-mono text-xs leading-6 text-slate-400 dark:text-gray-600">
                {sqlLines.map((_, i) => <div key={i}>{i + 1}</div>)}
              </div>
              <pre className="flex-1 overflow-x-auto px-4 py-3 font-mono text-sm leading-6">
                {sqlLines.map((line, i) => (
                  <div key={i} className={getSqlLineClass(line)}>{line || '\u00a0'}</div>
                ))}
              </pre>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
              <Database className="h-8 w-8 text-slate-400 dark:text-gray-700" />
              <p className="text-sm leading-relaxed text-slate-500 dark:text-gray-500">
                Enter a table name and<br />add columns to generate SQL
              </p>
            </div>
          )}
        </div>

        {/* Validation */}
        <div className="flex-shrink-0 border-t border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
          {validation.errors.length > 0 ? (
            <div className="space-y-1.5">
              {validation.errors.slice(0, 3).map((e, i) => (
                <div key={i} className="flex items-start gap-2">
                  <XCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-red-500" />
                  <span className="text-xs leading-tight text-red-600 dark:text-red-400">{e}</span>
                </div>
              ))}
              {validation.errors.length > 3 && <span className="ml-5 text-xs text-red-400/60">+{validation.errors.length - 3} more</span>}
            </div>
          ) : validation.warnings.length > 0 ? (
            <div className="space-y-1.5">
              {validation.warnings.slice(0, 2).map((w, i) => (
                <div key={i} className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
                  <span className="text-xs leading-tight text-amber-600 dark:text-amber-400">{w}</span>
                </div>
              ))}
              {validation.warnings.length > 2 && <span className="ml-5 text-xs text-amber-400/60">+{validation.warnings.length - 2} more</span>}
            </div>
          ) : sql ? (
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
              <span className="text-xs font-medium text-green-600 dark:text-green-400">Ready to create</span>
            </div>
          ) : (
            <span className="text-xs text-gray-400">Fill in table name and columns</span>
          )}
        </div>

        {/* Stats bar */}
        {sql && (
          <div className="flex flex-shrink-0 items-center justify-between border-t border-gray-100 bg-gray-50 px-4 py-2 dark:border-gray-700/60 dark:bg-gray-800/50">
            <span className="text-xs text-gray-400">
              {filledCols} col{filledCols !== 1 ? 's' : ''} · {pkCount} PK
            </span>
            <span className="text-xs text-gray-400">
              {design.sharding_config?.shard_count ?? 6} shards · {design.replication_config?.number_of_replicas ?? 1} replicas
            </span>
          </div>
        )}

        {/* Create Table button */}
        <div className="flex-shrink-0 border-t border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <button onClick={handleCreate} disabled={!canCreate}
            className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
              canCreate
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25 hover:bg-blue-700'
                : 'cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-gray-700/50 dark:text-gray-600'
            }`}>
            {creating ? <><Loader2 className="h-4 w-4 animate-spin" />Creating…</> : 'Create Table'}
          </button>
        </div>

      </div>
    </div>
  );
}
