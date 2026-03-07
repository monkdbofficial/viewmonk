'use client';
import { X, AlertTriangle, BellOff } from 'lucide-react';

export interface ThresholdAlert {
  id: string;          // unique per breach: `${widgetId}_${thresholdId}`
  widgetTitle: string;
  thresholdLabel: string;
  value: number;
  thresholdValue: number;
  direction: 'above' | 'below';
  color: string;
  firedAt: Date;
}

interface ThresholdAlertToastProps {
  alerts: ThresholdAlert[];
  onDismiss: (id: string) => void;
  onDismissAll: () => void;
}

function fmt(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000)     return `${(v / 1_000).toFixed(1)}K`;
  return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default function ThresholdAlertToast({ alerts, onDismiss, onDismissAll }: ThresholdAlertToastProps) {
  if (!alerts.length) return null;

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col gap-2" style={{ maxWidth: 360 }}>
      {/* Dismiss-all button when multiple alerts */}
      {alerts.length > 1 && (
        <div className="pointer-events-auto flex justify-end">
          <button
            onClick={onDismissAll}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200/60 bg-white/90 px-2.5 py-1.5 text-xs font-medium text-gray-600 shadow-lg backdrop-blur-sm transition-colors hover:bg-gray-50 dark:border-gray-700/60 dark:bg-gray-900/90 dark:text-gray-400 dark:hover:bg-gray-800/80"
          >
            <BellOff className="h-3.5 w-3.5" />
            Dismiss all ({alerts.length})
          </button>
        </div>
      )}

      {/* Individual toasts — newest on top (reverse render) */}
      {[...alerts].reverse().map((alert) => (
        <div
          key={alert.id}
          className="pointer-events-auto flex items-start gap-3 rounded-xl border shadow-xl backdrop-blur-sm"
          style={{
            background: `${alert.color}12`,
            borderColor: `${alert.color}35`,
            boxShadow: `0 8px 32px ${alert.color}18`,
          }}
        >
          {/* Left accent stripe */}
          <div
            className="w-1 flex-shrink-0 self-stretch rounded-l-xl"
            style={{ background: alert.color }}
          />

          {/* Icon */}
          <div className="mt-3 flex-shrink-0">
            <AlertTriangle className="h-4 w-4" style={{ color: alert.color }} />
          </div>

          {/* Content */}
          <div className="flex-1 py-3 pr-1">
            <p className="text-xs font-bold text-gray-900 dark:text-white">
              {alert.widgetTitle}
            </p>
            <p className="mt-0.5 text-[11px] text-gray-600 dark:text-gray-300">
              <span className="font-semibold" style={{ color: alert.color }}>
                {fmt(alert.value)}
              </span>
              {' '}
              {alert.direction === 'above' ? 'exceeded' : 'dropped below'}{' '}
              threshold{alert.thresholdLabel ? ` "${alert.thresholdLabel}"` : ''}{' '}
              (<span className="font-mono">{fmt(alert.thresholdValue)}</span>)
            </p>
            <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">
              {alert.firedAt.toLocaleTimeString()}
            </p>
          </div>

          {/* Dismiss */}
          <button
            onClick={() => onDismiss(alert.id)}
            className="mt-2 mr-2 flex-shrink-0 rounded p-1 text-gray-400 transition-colors hover:bg-white/30 hover:text-gray-600 dark:hover:bg-white/10 dark:hover:text-gray-300"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
