'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, Plus, Loader2, ChevronRight, ChevronLeft, Check, AlertTriangle, Copy, Terminal, Database } from 'lucide-react';
import { useMonkDBClient } from '@/app/lib/monkdb-context';
import { useAccessibleSchemas } from '@/app/hooks/useAccessibleSchemas';
import { useAccessibleTables } from '@/app/hooks/useAccessibleTables';
import { useToast } from '@/app/components/ToastContext';
import { useTheme } from '../ThemeProvider';



// ─── Types ────────────────────────────────────────────────────────────────────
interface CreateFTSIndexDialogProps {
  onClose: () => void;
  onSuccess: () => void;
}

type AnalyzerType = 'standard' | 'english';

interface ColDef {
  name: string;
  dataType: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
  isText: boolean;
}

const ANALYZER_OPTIONS: Array<{ value: AnalyzerType; label: string; desc: string; badge: string }> = [
  { value: 'english',  label: 'English',  badge: 'Recommended', desc: 'Stemming + stop-words (the, a, in…). Best for English prose.' },
  { value: 'standard', label: 'Standard', badge: '',            desc: 'Basic tokenisation, no stemming. Good for code or mixed-language text.' },
];

const STEPS = ['Source Table', 'Columns & Name', 'Analyzer', 'Review'];

// ─── Main component ────────────────────────────────────────────────────────────
export default function CreateFTSIndexDialog({ onClose, onSuccess }: CreateFTSIndexDialogProps) {
  const client = useMonkDBClient();
  const { schemas } = useAccessibleSchemas();
  const toast = useToast();
  const { theme } = useTheme();
  const D = theme === 'dark';
  const C = {
    bgModal:  D ? '#112233' : '#ffffff',
    bgHeader: D ? '#0e1e2e' : '#f8fafc',
    bgInput:  D ? '#1a3048' : '#f8fafc',
    bgSub:    D ? '#0d1b2a' : '#f1f5f9',
    bgRowHov: D ? 'rgba(148,163,184,0.04)' : 'rgba(0,0,0,0.02)',
    border:   D ? '#1a3050' : '#e2e8f0',
    borderSub: D ? 'rgba(148,163,184,0.10)' : 'rgba(0,0,0,0.07)',
    borderFocus: '#7c3aed',
    textPrimary:  D ? '#d1d5db' : '#1e293b',
    textSecondary: D ? '#9ca3af' : '#475569',
    textMuted:    D ? '#6b7280' : '#94a3b8',
    accent:      '#7c3aed',
    accentText:  D ? '#c4b5fd' : '#6d28d9',
    accentBg:    D ? 'rgba(124,58,237,0.12)' : 'rgba(124,58,237,0.07)',
    accentBorder: D ? 'rgba(124,58,237,0.35)' : 'rgba(124,58,237,0.3)',
    success:     '#4ade80',
    successBg:   'rgba(74,222,128,0.10)',
    successBorder:'rgba(74,222,128,0.3)',
    warning:     '#fbbf24',
    warningBg:   D ? 'rgba(251,191,36,0.08)' : 'rgba(251,191,36,0.05)',
    warningBorder: D ? 'rgba(251,191,36,0.25)' : 'rgba(251,191,36,0.2)',
  };
  const inpSt: React.CSSProperties = {
    width: '100%', background: C.bgInput, border: `1px solid ${C.border}`,
    borderRadius: 7, color: C.textPrimary, fontSize: 13, padding: '7px 11px',
    outline: 'none', fontFamily: 'var(--font-geist-mono), monospace', boxSizing: 'border-box',
  };
  const selSt: React.CSSProperties = {
    width: '100%', background: C.bgInput, border: `1px solid ${C.border}`,
    borderRadius: 7, color: C.textPrimary, fontSize: 13, padding: '7px 11px',
    outline: 'none', cursor: 'pointer', appearance: 'auto',
  };

  const [step, setStep] = useState(1);
  const [schema, setSchema] = useState('');
  const [sourceTable, setSourceTable] = useState('');
  const [colDefs, setColDefs] = useState<ColDef[]>([]);
  const [loadingCols, setLoadingCols] = useState(false);
  const [selectedFTSCols, setSelectedFTSCols] = useState<string[]>([]);
  const [newTableName, setNewTableName] = useState('');
  const [indexName, setIndexName] = useState('');
  const [analyzer, setAnalyzer] = useState<AnalyzerType>('english');
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  const { tables } = useAccessibleTables(schema);

  // Fetch column definitions when table selected
  useEffect(() => {
    if (!client || !schema || !sourceTable) { setColDefs([]); return; }
    setLoadingCols(true);
    const run = async () => {
      try {
        const colResult = await client.query(
          `SELECT column_name, data_type, is_nullable
           FROM information_schema.columns
           WHERE table_schema = ? AND table_name = ?
           ORDER BY ordinal_position`,
          [schema, sourceTable]
        );
        const pkResult = await client.query(
          `SELECT kcu.column_name
           FROM information_schema.key_column_usage kcu
           JOIN information_schema.table_constraints tc
             ON kcu.constraint_name = tc.constraint_name
             AND kcu.table_schema = tc.table_schema
             AND kcu.table_name = tc.table_name
           WHERE tc.constraint_type = 'PRIMARY KEY'
             AND kcu.table_schema = ? AND kcu.table_name = ?`,
          [schema, sourceTable]
        );
        const pkSet = new Set(pkResult.rows.map((r: any[]) => r[0]));
        const cols: ColDef[] = colResult.rows.map((r: any[]) => ({
          name: r[0],
          dataType: r[1],
          isNullable: r[2] === 'YES',
          isPrimaryKey: pkSet.has(r[0]),
          isText: /^(text|varchar|character varying|char)/.test(String(r[1]).toLowerCase()),
        }));
        setColDefs(cols);
        // Pre-select all text columns
        setSelectedFTSCols(cols.filter(c => c.isText).map(c => c.name));
        // Default new table name
        setNewTableName(sourceTable + '_fts');
        setIndexName(`idx_${sourceTable}_fts`);
      } catch (err) {
        toast.error('Error', 'Failed to fetch columns');
      } finally { setLoadingCols(false); }
    };
    run();
  }, [client, schema, sourceTable]);

  // ── SQL preview (memoised) ────────────────────────────────────────────────
  const generatedSQL = useMemo(() => {
    if (!schema || !sourceTable || !newTableName || selectedFTSCols.length === 0) return '';
    const finalIndex = indexName || `idx_${newTableName}_fts`;
    const colList = colDefs.map(c => {
      let line = `  "${c.name}" ${c.dataType.toUpperCase()}`;
      if (c.isPrimaryKey) line += ' PRIMARY KEY';
      else if (!c.isNullable) line += ' NOT NULL';
      return line;
    });
    const indexLine = `  INDEX "${finalIndex}" USING FULLTEXT (${selectedFTSCols.join(', ')}) WITH (analyzer = '${analyzer}')`;
    const createSQL = `CREATE TABLE "${schema}"."${newTableName}" (\n${[...colList, indexLine].join(',\n')}\n);`;
    const insertSQL = `\nINSERT INTO "${schema}"."${newTableName}"\n  SELECT * FROM "${schema}"."${sourceTable}";`;
    const refreshSQL = `\nREFRESH TABLE "${schema}"."${newTableName}";`;
    return createSQL + insertSQL + refreshSQL;
  }, [schema, sourceTable, newTableName, indexName, colDefs, selectedFTSCols, analyzer]);

  // ── Navigation ────────────────────────────────────────────────────────────
  const canProceed = () => {
    if (step === 1) return !!schema && !!sourceTable && colDefs.length > 0;
    if (step === 2) return selectedFTSCols.length > 0 && newTableName.trim().length > 0;
    return true;
  };

  // ── Create ────────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!client || !generatedSQL) return;
    setCreating(true);
    try {
      const finalIndex = indexName || `idx_${newTableName}_fts`;
      const colList = colDefs.map(c => {
        let line = `"${c.name}" ${c.dataType.toUpperCase()}`;
        if (c.isPrimaryKey) line += ' PRIMARY KEY';
        else if (!c.isNullable) line += ' NOT NULL';
        return line;
      });
      const indexLine = `INDEX "${finalIndex}" USING FULLTEXT (${selectedFTSCols.join(', ')}) WITH (analyzer = '${analyzer}')`;
      const createSQL = `CREATE TABLE "${schema}"."${newTableName}" (${[...colList, indexLine].join(', ')})`;
      await client.query(createSQL);
      await client.query(`INSERT INTO "${schema}"."${newTableName}" SELECT * FROM "${schema}"."${sourceTable}"`);
      await client.query(`REFRESH TABLE "${schema}"."${newTableName}"`);
      toast.success('FTS Table Created', `${schema}.${newTableName} created with full-text index on [${selectedFTSCols.join(', ')}]`);
      onSuccess();
    } catch (err) {
      toast.error('Creation Failed', err instanceof Error ? err.message : 'Unknown error');
    } finally { setCreating(false); }
  };

  const handleCopySQL = () => {
    navigator.clipboard.writeText(generatedSQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const toggleFTSCol = (name: string) =>
    setSelectedFTSCols(prev => prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.65)', fontFamily: 'var(--font-geist-sans), system-ui, sans-serif' }}
      onClick={e => { if (e.target === e.currentTarget && !creating) onClose(); }}>
      <div style={{ width: 600, maxWidth: '95vw', maxHeight: '90vh', background: C.bgModal, border: `1px solid ${C.border}`, borderRadius: 14, boxShadow: '0 28px 72px rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: C.bgHeader, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 7, background: C.accentBg, border: `1px solid ${C.accentBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Database style={{ width: 14, height: 14, color: C.accentText }} />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: C.textPrimary, lineHeight: 1.2 }}>Create Full-Text Search Table</p>
              <p style={{ fontSize: 11, color: C.textMuted }}>Step {step} of {STEPS.length}</p>
            </div>
          </div>
          <button onClick={() => !creating && onClose()}
            style={{ padding: 6, borderRadius: 6, background: 'transparent', border: 'none', cursor: 'pointer', color: C.textSecondary, display: 'flex' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(148,163,184,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <X style={{ width: 15, height: 15 }} />
          </button>
        </div>

        {/* MonkDB note */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 20px', background: C.warningBg, borderBottom: `1px solid ${C.warningBorder}`, flexShrink: 0 }}>
          <AlertTriangle style={{ width: 13, height: 13, color: C.warning, flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 11, color: '#fde68a', lineHeight: 1.5 }}>
            <strong>MonkDB:</strong> FULLTEXT indexes must be defined at table creation time — there is no <code style={{ fontFamily: 'var(--font-geist-mono), monospace' }}>CREATE INDEX</code> command. This wizard creates a <strong>new FTS-enabled table</strong> and copies your data into it.
          </p>
        </div>

        {/* Step indicators */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 20px', background: C.bgHeader, borderBottom: `1px solid ${C.border}`, flexShrink: 0, gap: 0 }}>
          {STEPS.map((label, idx) => {
            const n = idx + 1;
            const done = step > n;
            const active = step === n;
            return (
              <div key={n} style={{ display: 'flex', alignItems: 'center', flex: idx < STEPS.length - 1 ? 1 : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, background: done ? C.successBg : active ? C.accentBg : 'rgba(148,163,184,0.06)', border: `1.5px solid ${done ? C.successBorder : active ? C.accentBorder : C.borderSub}`, color: done ? C.success : active ? C.accentText : C.textMuted, flexShrink: 0 }}>
                    {done ? <Check style={{ width: 12, height: 12 }} /> : n}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: active ? 600 : 400, color: active ? C.textPrimary : C.textMuted, whiteSpace: 'nowrap' }}>{label}</span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div style={{ flex: 1, height: 1, background: step > n ? C.successBorder : C.borderSub, margin: '0 10px' }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>

          {/* ── Step 1: Source table ─────────────────────────────────────── */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <FLabel label="Schema" textPrimary={C.textPrimary} textMuted={C.textMuted}>
                <select value={schema} onChange={e => { setSchema(e.target.value); setSourceTable(''); setColDefs([]); }}
                  style={selSt}>
                  <option value="">Select schema…</option>
                  {schemas.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                </select>
              </FLabel>

              <FLabel label="Source Table" textPrimary={C.textPrimary} textMuted={C.textMuted}>
                <select value={sourceTable} onChange={e => setSourceTable(e.target.value)} disabled={!schema}
                  style={{ ...selSt, opacity: !schema ? 0.45 : 1, cursor: !schema ? 'not-allowed' : 'pointer' }}>
                  <option value="">Select table…</option>
                  {tables.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                </select>
              </FLabel>

              {loadingCols && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.textMuted, fontSize: 13 }}>
                  <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /> Loading columns…
                </div>
              )}

              {colDefs.length > 0 && (
                <div style={{ background: C.bgSub, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
                  <div style={{ padding: '8px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: C.textMuted }}>{colDefs.length} columns found</span>
                    <span style={{ fontSize: 10, color: C.textMuted }}>·</span>
                    <span style={{ fontSize: 11, color: C.accentText }}>{colDefs.filter(c => c.isText).length} text columns eligible for FTS</span>
                  </div>
                  <div style={{ maxHeight: 180, overflowY: 'auto' }}>
                    {colDefs.map(c => (
                      <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 14px', borderBottom: `1px solid ${C.borderSub}` }}>
                        <span style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: 12, color: c.isPrimaryKey ? '#fde68a' : C.textPrimary, flex: 1 }}>{c.name}</span>
                        <span style={{ fontSize: 10, fontWeight: 600, color: c.isText ? '#6ee7b7' : C.textMuted, background: c.isText ? 'rgba(52,211,153,0.08)' : 'rgba(148,163,184,0.06)', border: `1px solid ${c.isText ? 'rgba(52,211,153,0.2)' : C.borderSub}`, borderRadius: 4, padding: '1px 6px', fontFamily: 'var(--font-geist-mono), monospace' }}>
                          {c.dataType}
                        </span>
                        {c.isPrimaryKey && <span style={{ fontSize: 10, color: '#fbbf24' }}>PK</span>}
                        {c.isText && <span style={{ fontSize: 10, color: C.accentText, fontWeight: 600 }}>FTS-eligible</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: Columns & new table name ────────────────────────── */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <FLabel label="New Table Name" hint="A new table will be created with FTS enabled" textPrimary={C.textPrimary} textMuted={C.textMuted}>
                <input type="text" value={newTableName} onChange={e => setNewTableName(e.target.value)}
                  placeholder={sourceTable + '_fts'}
                  style={inpSt}
                  onFocus={e => e.currentTarget.style.borderColor = C.borderFocus}
                  onBlur={e => e.currentTarget.style.borderColor = C.border}
                />
                {newTableName === sourceTable && (
                  <p style={{ fontSize: 11, color: C.warning, marginTop: 4 }}>⚠ Must be different from source table name</p>
                )}
              </FLabel>

              <FLabel label="Index Name" hint="Optional — auto-generated if left empty" textPrimary={C.textPrimary} textMuted={C.textMuted}>
                <input type="text" value={indexName} onChange={e => setIndexName(e.target.value)}
                  placeholder={`idx_${newTableName}_fts`}
                  style={inpSt}
                  onFocus={e => e.currentTarget.style.borderColor = C.borderFocus}
                  onBlur={e => e.currentTarget.style.borderColor = C.border}
                />
              </FLabel>

              <FLabel label="Select Columns for Full-Text Index" textPrimary={C.textPrimary} textMuted={C.textMuted}>
                {colDefs.filter(c => c.isText).length === 0 ? (
                  <p style={{ fontSize: 13, color: C.textMuted, padding: '10px 0' }}>No TEXT columns found in this table.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {colDefs.filter(c => c.isText).map(col => {
                      const active = selectedFTSCols.includes(col.name);
                      return (
                        <label key={col.name}
                          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: active ? C.accentBg : 'rgba(148,163,184,0.03)', border: `1px solid ${active ? C.accentBorder : C.border}`, borderRadius: 8, cursor: 'pointer', transition: 'all 0.1s' }}>
                          <div style={{ width: 18, height: 18, borderRadius: 4, border: `1.5px solid ${active ? C.accent : 'rgba(148,163,184,0.35)'}`, background: active ? C.accentBg : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {active && <Check style={{ width: 11, height: 11, color: C.accentText }} />}
                          </div>
                          <input type="checkbox" checked={active} onChange={() => toggleFTSCol(col.name)} style={{ display: 'none' }} />
                          <span style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: 13, fontWeight: 500, color: active ? C.accentText : C.textPrimary, flex: 1 }}>{col.name}</span>
                          <span style={{ fontSize: 10, color: '#6ee7b7', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 4, padding: '1px 6px', fontFamily: 'var(--font-geist-mono), monospace' }}>{col.dataType}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </FLabel>

              {colDefs.filter(c => !c.isText).length > 0 && (
                <div style={{ padding: '8px 12px', background: 'rgba(148,163,184,0.04)', border: `1px solid ${C.borderSub}`, borderRadius: 7 }}>
                  <p style={{ fontSize: 11, color: C.textMuted }}>
                    <strong style={{ color: C.textSecondary }}>{colDefs.filter(c => !c.isText).length} non-text column{colDefs.filter(c => !c.isText).length !== 1 ? 's' : ''}</strong> ({colDefs.filter(c => !c.isText).map(c => c.name).join(', ')}) will be copied as-is.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: Analyzer ─────────────────────────────────────────── */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 6 }}>Choose how text is tokenised before indexing.</p>
              {ANALYZER_OPTIONS.map(opt => {
                const active = analyzer === opt.value;
                return (
                  <label key={opt.value}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', background: active ? C.accentBg : 'rgba(148,163,184,0.03)', border: `1px solid ${active ? C.accentBorder : C.border}`, borderRadius: 9, cursor: 'pointer', transition: 'all 0.1s' }}
                    onMouseEnter={e => { if (!active) (e.currentTarget as HTMLLabelElement).style.borderColor = 'rgba(124,58,237,0.25)'; }}
                    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLLabelElement).style.borderColor = C.border; }}>
                    <div style={{ width: 18, height: 18, marginTop: 1, borderRadius: '50%', border: `1.5px solid ${active ? C.accent : 'rgba(148,163,184,0.35)'}`, background: active ? C.accent : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {active && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff' }} />}
                    </div>
                    <input type="radio" name="analyzer" checked={active} onChange={() => setAnalyzer(opt.value)} style={{ display: 'none' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: active ? C.accentText : C.textPrimary }}>{opt.label}</span>
                        {opt.badge && <span style={{ fontSize: 10, fontWeight: 700, color: C.success, background: C.successBg, border: `1px solid ${C.successBorder}`, borderRadius: 4, padding: '1px 6px' }}>{opt.badge}</span>}
                      </div>
                      <p style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.5 }}>{opt.desc}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          )}

          {/* ── Step 4: Review ───────────────────────────────────────────── */}
          {step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Summary */}
              <div style={{ background: C.bgSub, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
                {[
                  ['Source Table', `${schema}.${sourceTable}`],
                  ['New FTS Table', `${schema}.${newTableName}`],
                  ['FTS Columns', selectedFTSCols.join(', ')],
                  ['Analyzer', analyzer],
                  ['Index Name', indexName || `idx_${newTableName}_fts`],
                ].map(([k, v], i, arr) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 14px', borderBottom: i < arr.length - 1 ? `1px solid ${C.borderSub}` : 'none' }}>
                    <span style={{ fontSize: 12, color: C.textMuted }}>{k}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: C.textPrimary, fontFamily: 'var(--font-geist-mono), monospace', maxWidth: 280, textAlign: 'right', wordBreak: 'break-all' }}>{v}</span>
                  </div>
                ))}
              </div>

              {/* SQL preview */}
              <div style={{ background: C.bgSub, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', background: C.bgHeader, borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Terminal style={{ width: 12, height: 12, color: C.textMuted }} />
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: C.textMuted }}>SQL to execute</span>
                  </div>
                  <button onClick={handleCopySQL}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 8px', background: copied ? C.successBg : C.accentBg, border: `1px solid ${copied ? C.successBorder : C.accentBorder}`, borderRadius: 5, color: copied ? C.success : C.accentText, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                    {copied ? <><Check style={{ width: 11, height: 11 }} /> Copied</> : <><Copy style={{ width: 11, height: 11 }} /> Copy</>}
                  </button>
                </div>
                <pre style={{ margin: 0, padding: '12px 14px', fontFamily: 'var(--font-geist-mono), monospace', fontSize: 11, color: '#4ade80', whiteSpace: 'pre-wrap', lineHeight: 1.8, maxHeight: 260, overflowY: 'auto' }}>
                  {generatedSQL}
                </pre>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, padding: '9px 12px', background: C.warningBg, border: `1px solid ${C.warningBorder}`, borderRadius: 7 }}>
                <AlertTriangle style={{ width: 13, height: 13, color: C.warning, flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 11, color: '#fde68a', lineHeight: 1.6 }}>
                  This will create a new table <strong>{schema}.{newTableName}</strong>, copy all rows from <strong>{schema}.{sourceTable}</strong>, then run REFRESH. The source table is not modified.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: C.bgHeader, borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
          <button onClick={() => step > 1 && setStep(s => s - 1)} disabled={step === 1 || creating}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 7, background: 'transparent', border: `1px solid ${C.border}`, color: step === 1 || creating ? C.textMuted : C.textSecondary, fontSize: 13, fontWeight: 500, cursor: step === 1 || creating ? 'not-allowed' : 'pointer', opacity: step === 1 ? 0.4 : 1 }}>
            <ChevronLeft style={{ width: 14, height: 14 }} /> Back
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => !creating && onClose()} disabled={creating}
              style={{ padding: '6px 14px', borderRadius: 7, background: 'transparent', border: `1px solid ${C.border}`, color: C.textSecondary, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
              Cancel
            </button>

            {step < 4 ? (
              <button onClick={() => canProceed() && setStep(s => s + 1)} disabled={!canProceed() || (step === 2 && newTableName === sourceTable)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 16px', borderRadius: 7, background: canProceed() ? C.accentBg : 'rgba(148,163,184,0.05)', border: `1px solid ${canProceed() ? C.accentBorder : C.border}`, color: canProceed() ? C.accentText : C.textMuted, fontSize: 13, fontWeight: 700, cursor: canProceed() ? 'pointer' : 'not-allowed', transition: 'all 0.1s' }}>
                Next <ChevronRight style={{ width: 13, height: 13 }} />
              </button>
            ) : (
              <button onClick={handleCreate} disabled={creating || !generatedSQL}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 18px', borderRadius: 7, background: creating ? C.successBg : 'rgba(74,222,128,0.14)', border: `1px solid ${C.successBorder}`, color: C.success, fontSize: 13, fontWeight: 700, cursor: creating ? 'not-allowed' : 'pointer', transition: 'all 0.1s' }}>
                {creating
                  ? <><Loader2 style={{ width: 13, height: 13, animation: 'spin 1s linear infinite' }} /> Creating…</>
                  : <><Plus style={{ width: 13, height: 13 }} /> Create FTS Table</>
                }
              </button>
            )}
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────
function FLabel({ label, hint, children, textPrimary, textMuted }: {
  label: string; hint?: string; children: React.ReactNode;
  textPrimary: string; textMuted: string;
}) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: textPrimary }}>{label}</label>
        {hint && <span style={{ fontSize: 11, color: textMuted }}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}
