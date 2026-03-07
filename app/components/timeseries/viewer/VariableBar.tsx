'use client';
import { useState } from 'react';
import { Variable, ChevronDown, FunctionSquare } from 'lucide-react';
import type { DashboardVariable, CalculatedMetric } from '@/app/lib/timeseries/types';
import type { ThemeTokens } from '@/app/lib/timeseries/themes';
import { formatCalcValue } from '@/app/lib/timeseries/calc-metrics';

interface VariableBarProps {
  variables: DashboardVariable[];
  values: Record<string, string>;
  theme: ThemeTokens;
  onChange: (values: Record<string, string>) => void;
  calculatedMetrics?: CalculatedMetric[];
  calcValues?: Record<string, string>;
}

export default function VariableBar({ variables, values, theme, onChange, calculatedMetrics, calcValues }: VariableBarProps) {
  const hasVars  = variables.length > 0;
  const hasCalcs = (calculatedMetrics?.length ?? 0) > 0;
  if (!hasVars && !hasCalcs) return null;

  const isLight = theme.id === 'light-clean';

  const barBg = isLight
    ? 'border-b border-gray-200 bg-gray-50/80'
    : `border-b ${theme.divider} bg-black/[0.18]`;

  const labelCls = isLight ? 'text-gray-500' : theme.textMuted;

  const handleChange = (varName: string, val: string) => {
    onChange({ ...values, [varName]: val });
  };

  return (
    <div className={`flex flex-shrink-0 flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-2 ${barBg}`}>
      {/* Variable inputs */}
      {hasVars && (
        <span className="flex flex-wrap items-center gap-3">
          <Variable className={`h-3.5 w-3.5 flex-shrink-0 ${labelCls}`} style={{ opacity: 0.6 }} />
          {variables.map((v) => (
            <VariableInput
              key={v.id}
              variable={v}
              value={values[v.name] ?? v.defaultValue}
              theme={theme}
              isLight={isLight}
              onChange={(val) => handleChange(v.name, val)}
            />
          ))}
        </span>
      )}

      {/* Divider when both sections present */}
      {hasVars && hasCalcs && (
        <span className="h-4 w-px flex-shrink-0" style={{ background: isLight ? 'rgba(209,213,219,1)' : 'rgba(255,255,255,0.1)' }} />
      )}

      {/* Calculated metric read-only chips */}
      {hasCalcs && (
        <span className="flex flex-wrap items-center gap-2">
          <FunctionSquare className={`h-3.5 w-3.5 flex-shrink-0 ${labelCls}`} style={{ opacity: 0.6 }} />
          {(calculatedMetrics ?? []).map((m) => {
            const raw = calcValues?.[m.name];
            const num = raw !== undefined ? Number(raw) : null;
            const display = num !== null && isFinite(num)
              ? formatCalcValue(num, m)
              : '—';
            return (
              <span key={m.id} className="flex items-center gap-1">
                <span className={`text-[11px] font-medium ${labelCls}`} style={{ opacity: 0.7 }}>
                  {m.label}:
                </span>
                <span
                  className="rounded px-2 py-0.5 text-xs font-semibold tabular-nums"
                  style={{
                    background: '#8B5CF618',
                    color: '#8B5CF6',
                    border: '1px solid #8B5CF630',
                  }}
                  title={`Formula: ${m.formula}`}
                >
                  {display}
                </span>
              </span>
            );
          })}
        </span>
      )}
    </div>
  );
}

// ── Individual variable input ─────────────────────────────────────────────────

interface VariableInputProps {
  variable: DashboardVariable;
  value: string;
  theme: ThemeTokens;
  isLight: boolean;
  onChange: (val: string) => void;
}

function VariableInput({ variable, value, theme, isLight, onChange }: VariableInputProps) {
  const labelCls = isLight ? 'text-gray-500' : theme.textMuted;
  const inputBg  = isLight
    ? 'border border-gray-200 bg-white text-gray-800 placeholder-gray-400 focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30'
    : `border ${theme.cardBorder} ${theme.cardBg} ${theme.textPrimary} placeholder-white/25 focus:border-white/30`;

  if (variable.type === 'constant') {
    return (
      <span className="flex items-center gap-1.5">
        <span className={`text-[11px] font-medium ${labelCls}`} style={{ opacity: 0.7 }}>
          {variable.label}:
        </span>
        <span
          className="rounded px-2 py-0.5 text-xs font-semibold"
          style={{
            background: `${theme.accentPrimary}18`,
            color: theme.accentPrimary,
            border: `1px solid ${theme.accentPrimary}30`,
          }}
        >
          {value || variable.defaultValue}
        </span>
      </span>
    );
  }

  if (variable.type === 'dropdown' && variable.options?.length) {
    return (
      <DropdownInput
        variable={variable}
        value={value}
        theme={theme}
        isLight={isLight}
        onChange={onChange}
      />
    );
  }

  // textbox (default)
  return (
    <span className="flex items-center gap-1.5">
      <span className={`text-[11px] font-medium ${labelCls}`} style={{ opacity: 0.7 }}>
        {variable.label}:
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`h-6 rounded px-2 text-xs outline-none transition-colors ${inputBg}`}
        style={{ minWidth: 80, maxWidth: 180 }}
        placeholder={variable.defaultValue || variable.name}
      />
    </span>
  );
}

// ── Custom dropdown ───────────────────────────────────────────────────────────

function DropdownInput({ variable, value, theme, isLight, onChange }: VariableInputProps) {
  const [open, setOpen] = useState(false);
  const labelCls = isLight ? 'text-gray-500' : theme.textMuted;

  const triggerBg = isLight
    ? 'border border-gray-200 bg-white text-gray-800 hover:border-blue-300'
    : `border ${theme.cardBorder} ${theme.cardBg} ${theme.textPrimary} hover:border-white/25`;

  const dropBg     = isLight ? '#ffffff' : '#0f1929';
  const dropBorder = isLight ? 'rgba(229,231,235,1)' : 'rgba(255,255,255,0.1)';
  const hoverBg    = isLight ? 'rgba(239,246,255,1)' : 'rgba(255,255,255,0.07)';

  const display = value || variable.defaultValue || variable.options![0];

  return (
    <span className="relative flex items-center gap-1.5">
      <span className={`text-[11px] font-medium ${labelCls}`} style={{ opacity: 0.7 }}>
        {variable.label}:
      </span>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex h-6 items-center gap-1 rounded px-2 text-xs font-medium transition-colors ${triggerBg}`}
        style={{ minWidth: 80 }}
      >
        <span className="truncate" style={{ maxWidth: 150 }}>{display}</span>
        <ChevronDown className="h-3 w-3 flex-shrink-0 opacity-50" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute left-0 top-full z-50 mt-1 min-w-[120px] overflow-hidden rounded-xl shadow-2xl"
            style={{ background: dropBg, border: `1px solid ${dropBorder}` }}
          >
            {variable.options!.map((opt) => (
              <button
                key={opt}
                onClick={() => { onChange(opt); setOpen(false); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs transition-colors"
                style={{
                  color: opt === display ? theme.accentPrimary : (isLight ? '#374151' : 'rgba(255,255,255,0.75)'),
                  fontWeight: opt === display ? 600 : 400,
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = hoverBg; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                {opt}
                {opt === display && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full" style={{ background: theme.accentPrimary }} />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </span>
  );
}
