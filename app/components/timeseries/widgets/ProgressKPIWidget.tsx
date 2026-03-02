'use client';
import type { ThemeTokens } from '@/app/lib/timeseries/themes';
import type { WidgetStyle } from '@/app/lib/timeseries/types';

export interface ProgressItem {
  label: string;
  value: number;
  target: number;
  unit?: string;
  color?: string;
}

interface ProgressKPIWidgetProps {
  items: ProgressItem[];
  style: WidgetStyle;
  theme: ThemeTokens;
}

function fmtNum(n: number, style: WidgetStyle, unit?: string) {
  const prefix  = style.prefix ?? '';
  const suffix  = style.unit   ?? unit ?? '';
  const abs     = Math.abs(n);
  let   s: string;
  if (style.decimals !== undefined) {
    s = n.toFixed(style.decimals);
  } else if (abs >= 1_000_000) {
    s = (n / 1_000_000).toFixed(1) + 'M';
  } else if (abs >= 1_000) {
    s = (n / 1_000).toFixed(1) + 'K';
  } else {
    s = n.toLocaleString(undefined, { maximumFractionDigits: 1 });
  }
  return `${prefix}${s}${suffix}`;
}

export default function ProgressKPIWidget({ items, style, theme }: ProgressKPIWidgetProps) {
  const isLight = theme.id === 'light-clean';

  const trackCls  = isLight ? 'bg-gray-200'   : 'bg-white/10';
  const labelCls  = isLight ? 'text-gray-700'  : 'text-white/80';
  const valueCls  = isLight ? 'text-gray-900'  : 'text-white';
  const targetCls = isLight ? 'text-gray-400'  : 'text-white/40';
  const pctCls    = isLight ? 'text-gray-500'  : 'text-white/50';

  return (
    <div className="flex h-full flex-col justify-around gap-0 px-1 py-1">
      {items.map((item, i) => {
        const pct     = Math.min(100, Math.round((item.value / item.target) * 100));
        const color   = item.color ?? theme.chartColors[i % theme.chartColors.length];
        const overGoal = item.value >= item.target;

        return (
          <div key={i} className="flex flex-col gap-1">
            {/* Label + values row */}
            <div className="flex items-baseline justify-between gap-2">
              <span className={`truncate text-xs font-semibold ${labelCls}`}>{item.label}</span>
              <div className="flex flex-shrink-0 items-baseline gap-1.5">
                <span className={`text-sm font-bold ${valueCls}`} style={{ color }}>
                  {fmtNum(item.value, style, item.unit)}
                </span>
                <span className={`text-xs ${targetCls}`}>/ {fmtNum(item.target, style, item.unit)}</span>
                <span
                  className={`text-[10px] font-semibold ${overGoal ? '' : pctCls}`}
                  style={overGoal ? { color } : {}}
                >
                  {pct}%
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div className={`h-1.5 w-full overflow-hidden rounded-full ${trackCls}`}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  background: color,
                  boxShadow: theme.glowEffect ? `0 0 6px ${color}80` : 'none',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
