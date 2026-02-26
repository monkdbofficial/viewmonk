'use client';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { ThemeTokens } from '@/app/lib/timeseries/themes';
import type { WidgetStyle } from '@/app/lib/timeseries/types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface StatCardWidgetProps {
  value: number | null;
  style: WidgetStyle;
  theme: ThemeTokens;
  demoData?: {
    statValue: number;
    trend?: string;
    direction?: 'up' | 'down' | 'neutral';
    sparkData?: number[];
  };
}

// ── Value formatting ───────────────────────────────────────────────────────────

function formatValue(v: number, decimals?: number, prefix?: string, unit?: string): string {
  const pre = prefix ?? '';
  const suf = unit ?? '';

  const fmt = (n: number): string => {
    if (decimals !== undefined && decimals >= 0) return n.toFixed(decimals);
    if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (Math.abs(n) >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
    if (Number.isInteger(n))       return n.toLocaleString();
    return n.toFixed(1);
  };

  return `${pre}${fmt(v)}${suf}`;
}

// ── Mini sparkline (div-bar style) ─────────────────────────────────────────────

function MiniSparkline({
  data,
  accentColor,
  isLight,
}: {
  data: number[];
  accentColor: string;
  isLight: boolean;
}) {
  if (data.length < 2) return null;

  const min   = Math.min(...data);
  const max   = Math.max(...data);
  const range = max - min || 1;

  const trackColor = isLight ? 'rgba(107,114,128,0.12)' : 'rgba(255,255,255,0.1)';

  return (
    <div className="flex items-end gap-[2px]" style={{ height: 24 }}>
      {data.map((v, i) => {
        const pct     = ((v - min) / range) * 100;
        const barH    = Math.max(15, pct);
        const isLast  = i === data.length - 1;
        return (
          <div
            key={i}
            className="flex-1 rounded-[2px] transition-all duration-300"
            style={{
              height:     `${barH}%`,
              background: isLast ? accentColor : trackColor,
              opacity:    isLast ? 1 : 0.6 + (i / data.length) * 0.4,
            }}
          />
        );
      })}
    </div>
  );
}

// ── Main widget ───────────────────────────────────────────────────────────────

export default function StatCardWidget({ value, style, theme, demoData }: StatCardWidgetProps) {
  const displayValue = demoData ? demoData.statValue : value;
  const trend        = demoData?.trend;
  const direction    = demoData?.direction ?? 'neutral';
  const sparkData    = demoData?.sparkData;
  const isLight      = theme.id === 'light-clean';

  if (displayValue === null || displayValue === undefined) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className={`text-2xl font-bold ${theme.textMuted}`}>—</span>
      </div>
    );
  }

  const TrendIcon =
    direction === 'up'   ? TrendingUp   :
    direction === 'down' ? TrendingDown : Minus;

  const isGood =
    direction === 'up'   ? !style.invertTrend :
    direction === 'down' ?  style.invertTrend  : false;

  const trendColor =
    direction === 'neutral'
      ? theme.textMuted
      : isGood
      ? theme.trendUp
      : theme.trendDown;

  const trendBg =
    direction === 'neutral'
      ? isLight ? 'rgba(107,114,128,0.1)' : 'rgba(255,255,255,0.08)'
      : isGood
      ? 'rgba(16,185,129,0.15)'
      : 'rgba(239,68,68,0.15)';

  return (
    <div className="flex h-full flex-col justify-between px-2 pb-2 pt-0.5">

      {/* ── Big value ──────────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col justify-center">
        <span
          className="font-bold tabular-nums leading-none tracking-tight"
          style={{
            color:    theme.accentPrimary,
            fontSize: 'clamp(1.4rem, 3.5vw, 2.25rem)',
          }}
        >
          {formatValue(displayValue, style.decimals, style.prefix, style.unit)}
        </span>

        {/* Trend pill */}
        {trend && (
          <div className={`mt-2.5 inline-flex w-fit items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${trendColor}`}
               style={{ background: trendBg }}>
            <TrendIcon className="h-3 w-3" />
            <span>{trend}</span>
          </div>
        )}
      </div>

      {/* ── Sparkline ──────────────────────────────────────────────────────── */}
      {sparkData && sparkData.length > 1 && (
        <div className="flex-shrink-0">
          <MiniSparkline
            data={sparkData}
            accentColor={theme.accentPrimary}
            isLight={isLight}
          />
        </div>
      )}
    </div>
  );
}
