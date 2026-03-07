'use client';
import type { WidgetConfig } from '@/app/lib/timeseries/types';

interface DividerWidgetProps {
  widget: WidgetConfig;
}

export default function DividerWidget({ widget }: DividerWidgetProps) {
  const label = widget.title?.trim();
  const align = widget.style.textAlign ?? 'center';

  return (
    <div className="flex h-full items-center gap-4 px-4">
      {/* Left line — always shown */}
      <div className="min-w-0 flex-1 border-t border-gray-200 dark:border-gray-700/60" />

      {label && (
        <span className="flex-shrink-0 text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500"
          style={{ textAlign: align }}>
          {label}
        </span>
      )}

      {/* Right line — only shown when label exists so it bookends the text */}
      {label && (
        <div className="min-w-0 flex-1 border-t border-gray-200 dark:border-gray-700/60" />
      )}
    </div>
  );
}
