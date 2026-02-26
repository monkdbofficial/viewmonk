'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  sub?:  string;
}

interface SearchableSelectProps {
  options:      SelectOption[];
  value:        string;
  onChange:     (v: string) => void;
  placeholder?: string;
  disabled?:    boolean;
  emptyText?:   string;
  size?:        'sm' | 'md';
}

export function SearchableSelect({
  options, value, onChange,
  placeholder = 'Select…', disabled = false,
  emptyText = 'No results', size = 'md',
}: SearchableSelectProps) {
  const [open,  setOpen]  = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const filtered = useMemo(
    () => options.filter((o) =>
      o.label.toLowerCase().includes(query.toLowerCase()) ||
      (o.sub ?? '').toLowerCase().includes(query.toLowerCase()),
    ),
    [options, query],
  );

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false); setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const selected = options.find((o) => o.value === value);
  const btnCls = size === 'sm'
    ? 'px-2.5 py-1.5 text-xs'
    : 'px-3 py-2 text-sm';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => { if (!disabled) { setOpen((o) => !o); setQuery(''); } }}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border transition-all ${btnCls} ${
          disabled
            ? 'cursor-not-allowed border-gray-100 bg-gray-50 text-gray-300 dark:border-white/[0.05] dark:bg-white/[0.02] dark:text-white/20'
            : open
            ? 'border-blue-500 bg-white ring-2 ring-blue-500/10 dark:border-blue-500/60 dark:bg-white/[0.06]'
            : 'border-gray-200 bg-white text-gray-800 hover:border-gray-300 dark:border-white/[0.10] dark:bg-white/[0.04] dark:text-white/80 dark:hover:border-white/[0.20]'
        }`}
      >
        <span className={`truncate ${!selected ? 'text-gray-400 dark:text-white/25' : ''}`}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 flex-shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-[70] mt-1.5 w-full min-w-[180px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-white/[0.12] dark:bg-[#0e1929]">
          <div className="border-b border-gray-100 p-2 dark:border-white/[0.07]">
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 dark:border-white/[0.08] dark:bg-white/[0.05]">
              <Search className="h-3 w-3 flex-shrink-0 text-gray-400" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search…"
                className="w-full bg-transparent text-xs text-gray-700 outline-none placeholder-gray-400 dark:text-white/70 dark:placeholder-white/25"
              />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto p-1.5">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-xs text-gray-400 dark:text-white/25">{emptyText}</p>
            ) : (
              filtered.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => { onChange(o.value); setOpen(false); setQuery(''); }}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors ${
                    o.value === value
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400'
                      : 'text-gray-700 hover:bg-gray-50 dark:text-white/70 dark:hover:bg-white/[0.05]'
                  }`}
                >
                  <span className="flex-1 text-sm">{o.label}</span>
                  {o.sub && <span className="text-xs text-gray-400 dark:text-white/25">{o.sub}</span>}
                  {o.value === value && <Check className="h-3.5 w-3.5 flex-shrink-0 text-blue-500" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
