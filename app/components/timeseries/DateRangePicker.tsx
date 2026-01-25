'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, Play, Pause } from 'lucide-react';
import { subHours, subDays, subMonths, startOfDay, endOfDay, format } from 'date-fns';

export interface DateRange {
  start: Date;
  end: Date;
}

export type TimeRangePreset = '1h' | '24h' | '7d' | '30d' | 'custom';

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  isRealTime?: boolean;
  onRealTimeToggle?: (enabled: boolean) => void;
}

export default function DateRangePicker({
  value,
  onChange,
  isRealTime = false,
  onRealTimeToggle,
}: DateRangePickerProps) {
  const [selectedPreset, setSelectedPreset] = useState<TimeRangePreset>('24h');
  const [showCustomRange, setShowCustomRange] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [countdown, setCountdown] = useState(10);

  const presets: { label: string; value: TimeRangePreset; getRange: () => DateRange }[] = [
    {
      label: 'Last 1 Hour',
      value: '1h',
      getRange: () => ({
        start: subHours(new Date(), 1),
        end: new Date(),
      }),
    },
    {
      label: 'Last 24 Hours',
      value: '24h',
      getRange: () => ({
        start: subHours(new Date(), 24),
        end: new Date(),
      }),
    },
    {
      label: 'Last 7 Days',
      value: '7d',
      getRange: () => ({
        start: startOfDay(subDays(new Date(), 7)),
        end: endOfDay(new Date()),
      }),
    },
    {
      label: 'Last 30 Days',
      value: '30d',
      getRange: () => ({
        start: startOfDay(subMonths(new Date(), 1)),
        end: endOfDay(new Date()),
      }),
    },
    {
      label: 'Custom Range',
      value: 'custom',
      getRange: () => value,
    },
  ];

  const handlePresetClick = (preset: TimeRangePreset) => {
    setSelectedPreset(preset);

    if (preset === 'custom') {
      setShowCustomRange(true);
      // Initialize custom dates with current range
      setCustomStart(format(value.start, "yyyy-MM-dd'T'HH:mm"));
      setCustomEnd(format(value.end, "yyyy-MM-dd'T'HH:mm"));
    } else {
      setShowCustomRange(false);
      const presetConfig = presets.find((p) => p.value === preset);
      if (presetConfig) {
        onChange(presetConfig.getRange());
      }
    }
  };

  const handleCustomRangeApply = () => {
    if (customStart && customEnd) {
      const start = new Date(customStart);
      const end = new Date(customEnd);

      if (start < end) {
        onChange({ start, end });
        setShowCustomRange(false);
      }
    }
  };

  const handleRealTimeToggle = () => {
    if (onRealTimeToggle) {
      onRealTimeToggle(!isRealTime);
    }
  };

  // Auto-update for real-time mode
  useEffect(() => {
    if (!isRealTime || selectedPreset === 'custom') {
      setCountdown(10);
      return;
    }

    // Reset countdown
    setCountdown(10);

    // Countdown timer (every second)
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) return 10;
        return prev - 1;
      });
    }, 1000);

    // Update date range every 10 seconds
    const refreshInterval = setInterval(() => {
      const presetConfig = presets.find((p) => p.value === selectedPreset);
      if (presetConfig) {
        onChange(presetConfig.getRange());
      }
    }, 10000);

    return () => {
      clearInterval(countdownInterval);
      clearInterval(refreshInterval);
    };
  }, [isRealTime, selectedPreset]);

  return (
    <div className="space-y-4">
      {/* Preset Buttons */}
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => (
          <button
            key={preset.value}
            onClick={() => handlePresetClick(preset.value)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              selectedPreset === preset.value
                ? 'bg-blue-600 text-white shadow-md dark:bg-blue-500'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Custom Range Inputs */}
      {showCustomRange && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <h4 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
            Custom Time Range
          </h4>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                Start Date & Time
              </label>
              <input
                type="datetime-local"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                End Date & Time
              </label>
              <input
                type="datetime-local"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => setShowCustomRange(false)}
              className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              onClick={handleCustomRangeApply}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              Apply
            </button>
          </div>
        </div>
      )}

      {/* Current Range Display and Real-Time Toggle */}
      <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
        <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <Calendar className="h-4 w-4" />
          <span className="font-medium">
            {format(value.start, 'MMM dd, yyyy HH:mm')} - {format(value.end, 'MMM dd, yyyy HH:mm')}
          </span>
        </div>

        {onRealTimeToggle && selectedPreset !== 'custom' && (
          <button
            onClick={handleRealTimeToggle}
            className={`relative flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all shadow-md hover:shadow-lg ${
              isRealTime
                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700'
                : 'bg-gradient-to-r from-gray-400 to-gray-500 text-white hover:from-gray-500 hover:to-gray-600'
            }`}
          >
            {isRealTime ? (
              <>
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                </span>
                <span className="uppercase tracking-wide">🔴 LIVE</span>
                <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs font-mono">
                  {countdown}s
                </span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                <span className="uppercase tracking-wide">START LIVE</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
