'use client';
import { useState, useEffect } from 'react';
import { Link2, Copy, Check, X, ExternalLink } from 'lucide-react';
import type { DashboardConfig } from '@/app/lib/timeseries/types';
import type { ThemeTokens } from '@/app/lib/timeseries/themes';

interface ShareLinkPanelProps {
  config: DashboardConfig;
  theme: ThemeTokens;
  onClose: () => void;
}

export default function ShareLinkPanel({ config, theme, onClose }: ShareLinkPanelProps) {
  const [url,     setUrl]     = useState('');
  const [copied,  setCopied]  = useState(false);

  const isLight = theme.id === 'light-clean';
  const panelBg  = isLight ? 'bg-white border-gray-200'     : 'bg-gray-900 border-gray-700/60';
  const headerBg = isLight ? 'border-gray-100 bg-gray-50/80' : 'border-gray-800 bg-gray-800/40';
  const inputCls = isLight
    ? 'border border-gray-200 bg-gray-50 text-gray-700'
    : 'border border-gray-700 bg-gray-800 text-gray-300';
  const textMuted   = isLight ? 'text-gray-500' : 'text-gray-400';
  const textPrimary = isLight ? 'text-gray-900' : 'text-white';
  const divider     = isLight ? 'border-gray-100' : 'border-gray-800';

  useEffect(() => {
    // Encode config as base64 URL fragment — no server required
    try {
      const json    = JSON.stringify(config);
      const encoded = btoa(encodeURIComponent(json));
      const base    = typeof window !== 'undefined' ? window.location.href.split('#')[0] : '';
      setUrl(`${base}#share=${encoded}`);
    } catch {
      setUrl('');
    }
  }, [config]);

  const handleCopy = () => {
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className={`absolute right-0 top-full z-50 mt-2 w-96 overflow-hidden rounded-2xl border shadow-2xl ${panelBg}`}
      >
        {/* Header */}
        <div className={`flex items-center gap-2 border-b px-4 py-3 ${headerBg}`}>
          <Link2 className="h-4 w-4 flex-shrink-0" style={{ color: theme.accentPrimary }} />
          <span className={`flex-1 text-sm font-bold ${textPrimary}`}>Share Dashboard</span>
          <button onClick={onClose} className={`rounded-lg p-1 ${textMuted} hover:opacity-80`}>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {/* Info */}
          <p className={`text-xs ${textMuted}`}>
            Share this link to give anyone read-only access to this dashboard. The full configuration is encoded in the URL — no sign-in required.
          </p>

          {/* URL field */}
          <div className="flex gap-2">
            <input
              readOnly
              value={url}
              className={`flex-1 rounded-lg px-2.5 py-1.5 text-[11px] font-mono outline-none truncate ${inputCls}`}
            />
            <button
              onClick={handleCopy}
              className="flex flex-shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors"
              style={{ background: copied ? '#10B981' : theme.accentPrimary }}
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          {/* Open in new tab */}
          <button
            onClick={() => url && window.open(url, '_blank')}
            className={`flex w-full items-center justify-center gap-2 rounded-lg border py-2 text-xs font-medium transition-colors ${
              isLight
                ? 'border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600'
                : `border-gray-700 ${textMuted} hover:border-gray-500 hover:text-white`
            }`}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Preview shared view
          </button>

          {/* Warning */}
          <div className={`rounded-xl border px-3 py-2 text-[11px] ${textMuted} ${divider} ${isLight ? 'bg-amber-50/60 border-amber-200/60' : 'bg-amber-500/5 border-amber-500/20'}`}>
            <span className="font-semibold" style={{ color: '#F59E0B' }}>Note:</span>{' '}
            The link contains the full dashboard config. Anyone with the link can view (not edit) it. For large dashboards the URL may be long.
          </div>
        </div>
      </div>
    </>
  );
}
