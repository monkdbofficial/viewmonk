'use client';
import { useState, useEffect } from 'react';
import {
  AlertTriangle, Settings2, Trash2, GripVertical,
  Clock, Database, Copy, Check,
} from 'lucide-react';
import type { ThemeTokens } from '@/app/lib/timeseries/themes';
import type { WidgetStatus } from '@/app/lib/timeseries/types';
import { formatRelativeTime } from '@/app/lib/timeseries/time-range';

// ── Shimmer keyframe — injected once into <head>, never duplicated ────────────

const SHIMMER_CSS = `
@keyframes widget-shimmer {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(100%);  }
}
@keyframes widget-top-bar {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(100%);  }
}
`;

let shimmerInjected = false;
function useShimmerCSS() {
  useEffect(() => {
    if (shimmerInjected) return;
    const style = document.createElement('style');
    style.textContent = SHIMMER_CSS;
    document.head.appendChild(style);
    shimmerInjected = true;
  }, []);
}

// ── Shimmer skeleton block ────────────────────────────────────────────────────

function ShimmerBlock({
  className = '',
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded ${className}`}
      style={{ background: 'rgba(148,163,184,0.09)', ...style }}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg,transparent 0%,rgba(148,163,184,0.18) 50%,transparent 100%)',
          animation: 'widget-shimmer 1.8s ease-in-out infinite',
        }}
      />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface WidgetShellProps {
  title: string;
  status: WidgetStatus;
  error: string | null;
  lastUpdated: Date | null;
  executionTime: number;
  theme: ThemeTokens;
  builderMode?: boolean;
  onRetry?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  children: React.ReactNode;
}

export default function WidgetShell({
  title, status, error, lastUpdated, executionTime, theme,
  builderMode = false, onRetry, onEdit, onDelete, children,
}: WidgetShellProps) {
  useShimmerCSS();
  const [copied, setCopied] = useState(false);

  const isRefreshing = status === 'refreshing';
  const isLoaded     = status === 'loaded' || status === 'refreshing';
  const isLight      = theme.id === 'light-clean';

  // Always apply card bg + border + shadow — viewer and builder both get proper elevation.
  // Dark themes: card surface slightly lighter than page → depth.
  // Light theme: white card with border/shadow on slate-50 → clear separation.
  const cardCls = `${theme.cardBg} ${theme.cardBorder} rounded-xl ${theme.cardShadow}`;

  const glowStyle =
    theme.glowEffect && theme.glowColor
      ? { boxShadow: `0 0 28px ${theme.glowColor}1A` }
      : {};
  const glassStyle =
    theme.glassmorphism
      ? { backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }
      : {};

  const handleCopyError = () => {
    if (!error) return;
    navigator.clipboard.writeText(error).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // ── Top accent bar colour ──────────────────────────────────────────────────
  const accentBarContent = (() => {
    if (status === 'error')
      return (
        <div className="h-full w-full" style={{ background: '#EF444480' }} />
      );
    if (status === 'no-data')
      return (
        <div
          className="h-full w-full"
          style={{ background: isLight ? 'rgba(107,114,128,0.2)' : 'rgba(255,255,255,0.08)' }}
        />
      );
    if (status === 'loading')
      return (
        <>
          <div
            className="h-full w-full"
            style={{ background: isLight ? 'rgba(148,163,184,0.2)' : 'rgba(255,255,255,0.08)' }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(90deg,transparent,${theme.accentPrimary},transparent)`,
              animation: 'widget-top-bar 1.6s ease-in-out infinite',
            }}
          />
        </>
      );
    // loaded / refreshing
    return (
      <div
        className="h-full w-full transition-opacity duration-500"
        style={{
          background: `linear-gradient(90deg,${theme.accentPrimary}50,${theme.accentPrimary},${theme.accentPrimary}50)`,
          opacity: isRefreshing ? 0.7 : 1,
        }}
      />
    );
  })();

  return (
    <div
      className={`flex h-full flex-col overflow-hidden transition-all duration-300 ${cardCls}`}
      style={{ ...glowStyle, ...glassStyle }}
    >

      {/* ── Accent top bar ─────────────────────────────────────────────────── */}
      <div className="relative flex-shrink-0 h-[2px] overflow-hidden">
        {accentBarContent}
      </div>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        className={`flex flex-shrink-0 items-center justify-between px-3 py-2 ${
          builderMode ? `border-b ${theme.divider}` : 'pb-1.5'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {builderMode && (
            <GripVertical
              className={`h-4 w-4 flex-shrink-0 cursor-grab ${theme.textMuted}`}
            />
          )}
          <span
            className={`text-sm font-semibold truncate ${
              builderMode ? theme.textPrimary : theme.textSecondary
            }`}
          >
            {title}
          </span>

          {/* Live pulsing dot when refreshing */}
          {isRefreshing && (
            <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
              <span
                className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
                style={{ background: theme.accentPrimary }}
              />
              <span
                className="relative inline-flex h-1.5 w-1.5 rounded-full"
                style={{ background: theme.accentPrimary }}
              />
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {lastUpdated && !builderMode && (
            <span className={`hidden sm:flex items-center gap-1 text-[11px] ${theme.textMuted} opacity-70`}>
              <Clock className="h-2.5 w-2.5" />
              {formatRelativeTime(lastUpdated)}
            </span>
          )}
          {executionTime > 0 && !builderMode && (
            <span className={`hidden lg:block text-[11px] ${theme.textMuted} opacity-40`}>
              {executionTime >= 1000 ? `${(executionTime / 1000).toFixed(1)}s` : `${executionTime}ms`}
            </span>
          )}
          {builderMode && onEdit && (
            <button
              onClick={onEdit}
              className={`rounded-md p-1 transition-colors ${theme.textMuted}`}
              title="Configure widget"
            >
              <Settings2 className="h-3.5 w-3.5" />
            </button>
          )}
          {builderMode && onDelete && (
            <button
              onClick={onDelete}
              className="rounded-md p-1 text-red-400/60 transition-colors hover:text-red-400"
              title="Delete widget"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="relative flex-1 min-h-0 px-1 pb-1">

        {/* Shimmer loading skeleton */}
        {status === 'loading' && (
          <div className="absolute inset-2 flex flex-col gap-2.5 p-1">
            <ShimmerBlock className="h-3 w-2/5" />
            <ShimmerBlock className="h-8 w-1/2" />
            <ShimmerBlock className="flex-1 rounded-lg" />
            <div className="flex gap-2">
              <ShimmerBlock className="h-2.5 flex-1" />
              <ShimmerBlock className="h-2.5 w-12" />
            </div>
          </div>
        )}

        {/* Error state */}
        {status === 'error' && (
          <div className="absolute inset-2 flex flex-col items-center justify-center gap-3 p-3 text-center">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full ring-1"
              style={{
                background: 'rgba(239,68,68,0.12)',
                ringColor: 'rgba(239,68,68,0.2)',
              }}
            >
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>

            <div className="w-full max-w-[240px]">
              <p className={`text-sm font-semibold ${theme.textPrimary}`}>Query Failed</p>
              <p
                className={`mt-1.5 rounded px-2 py-1.5 text-left font-mono text-[10px] leading-relaxed ${theme.textMuted} line-clamp-3`}
                style={{ background: isLight ? 'rgba(239,68,68,0.04)' : 'rgba(239,68,68,0.08)' }}
              >
                {error}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/20"
                  style={{ border: '1px solid rgba(239,68,68,0.25)' }}
                >
                  Retry
                </button>
              )}
              <button
                onClick={handleCopyError}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition-colors ${theme.textMuted}`}
                style={{ border: `1px solid ${isLight ? 'rgba(107,114,128,0.18)' : 'rgba(255,255,255,0.1)'}` }}
              >
                {copied
                  ? <Check className="h-3 w-3 text-green-400" />
                  : <Copy className="h-3 w-3" />
                }
                {copied ? 'Copied' : 'Copy error'}
              </button>
            </div>
          </div>
        )}

        {/* No data state */}
        {status === 'no-data' && (
          <div className="absolute inset-2 flex flex-col items-center justify-center gap-2.5 text-center">
            <Database
              className={`h-6 w-6 ${theme.textMuted}`}
              style={{ opacity: 0.3 }}
            />
            <div>
              <p className={`text-xs font-semibold ${theme.textMuted}`}>
                No data in range
              </p>
              <p
                className={`mt-0.5 text-[11px] ${theme.textMuted}`}
                style={{ opacity: 0.5 }}
              >
                Try a wider time range
              </p>
            </div>
            {onRetry && (
              <button
                onClick={onRetry}
                className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${theme.textMuted}`}
                style={{
                  border: `1px solid ${
                    isLight ? 'rgba(107,114,128,0.18)' : 'rgba(255,255,255,0.08)'
                  }`,
                }}
              >
                Refresh
              </button>
            )}
          </div>
        )}

        {/* Chart content */}
        {isLoaded && (
          <div
            className="h-full transition-opacity duration-300"
            style={{ opacity: isRefreshing ? 0.65 : 1 }}
          >
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
