'use client';
import { useState, useEffect } from 'react';
import { History, Plus, Trash2, RotateCcw, X, Check, Clock } from 'lucide-react';
import { listSnapshots, saveSnapshot, deleteSnapshot, type DashboardSnapshot } from '@/app/lib/timeseries/snapshot-store';
import type { DashboardConfig } from '@/app/lib/timeseries/types';
import type { ThemeTokens } from '@/app/lib/timeseries/themes';

interface SnapshotPanelProps {
  config: DashboardConfig;
  theme: ThemeTokens;
  onRestore: (config: DashboardConfig) => void;
  onClose: () => void;
}

export default function SnapshotPanel({ config, theme, onRestore, onClose }: SnapshotPanelProps) {
  const [snapshots, setSnapshots]   = useState<DashboardSnapshot[]>([]);
  const [newName,   setNewName]     = useState('');
  const [saving,    setSaving]      = useState(false);
  const [restored,  setRestored]    = useState<string | null>(null);

  const isLight = theme.id === 'light-clean';

  const panelBg     = isLight ? 'bg-white border-gray-200'     : 'bg-gray-900 border-gray-700/60';
  const headerBg    = isLight ? 'border-gray-100 bg-gray-50/80' : 'border-gray-800 bg-gray-800/40';
  const inputCls    = isLight
    ? 'border border-gray-200 bg-white text-gray-800 placeholder-gray-400 focus:border-blue-400'
    : 'border border-gray-700 bg-gray-800 text-gray-200 placeholder-gray-600 focus:border-blue-500';
  const rowHover    = isLight ? 'hover:bg-gray-50' : 'hover:bg-white/[0.04]';
  const divider     = isLight ? 'border-gray-100' : 'border-gray-800';
  const textPrimary = isLight ? 'text-gray-900' : 'text-white';
  const textMuted   = isLight ? 'text-gray-500' : 'text-gray-400';

  useEffect(() => {
    setSnapshots(listSnapshots(config.id));
  }, [config.id]);

  const handleSave = () => {
    if (saving) return;
    setSaving(true);
    const snap = saveSnapshot(config.id, newName, config);
    setSnapshots(listSnapshots(config.id));
    setNewName('');
    setSaving(false);
    // flash check mark
    setRestored(snap.id);
    setTimeout(() => setRestored(null), 1800);
  };

  const handleDelete = (id: string) => {
    deleteSnapshot(config.id, id);
    setSnapshots(listSnapshots(config.id));
  };

  const handleRestore = (snap: DashboardSnapshot) => {
    setRestored(snap.id);
    setTimeout(() => {
      onRestore(snap.config);
      onClose();
    }, 400);
  };

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    return isToday
      ? `Today ${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`
      : d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Panel */}
      <div
        className={`absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border shadow-2xl ${panelBg}`}
      >
        {/* Header */}
        <div className={`flex items-center gap-2 border-b px-4 py-3 ${headerBg}`}>
          <History className="h-4 w-4 flex-shrink-0" style={{ color: theme.accentPrimary }} />
          <span className={`flex-1 text-sm font-bold ${textPrimary}`}>Snapshots</span>
          <span className={`text-[10px] ${textMuted}`}>{snapshots.length}/10</span>
          <button onClick={onClose} className={`rounded-lg p-1 ${textMuted} hover:opacity-80`}>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Save new snapshot */}
        <div className={`flex gap-2 border-b px-3 py-2.5 ${divider}`}>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            placeholder="Snapshot name (optional)"
            className={`flex-1 rounded-lg px-2.5 py-1.5 text-xs outline-none transition-colors ${inputCls}`}
          />
          <button
            onClick={handleSave}
            disabled={snapshots.length >= 10}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-40"
            style={{ background: theme.accentPrimary }}
            title={snapshots.length >= 10 ? 'Delete a snapshot to add more' : 'Save snapshot'}
          >
            <Plus className="h-3.5 w-3.5" />
            Save
          </button>
        </div>

        {/* Snapshot list */}
        <div className="max-h-72 overflow-y-auto">
          {snapshots.length === 0 ? (
            <div className={`py-10 text-center text-xs ${textMuted}`}>
              <History className="mx-auto mb-2 h-6 w-6 opacity-30" />
              No snapshots yet
            </div>
          ) : (
            snapshots.map((snap) => (
              <div
                key={snap.id}
                className={`flex items-center gap-2 border-b px-3 py-2.5 transition-colors ${divider} ${rowHover} ${
                  restored === snap.id ? (isLight ? 'bg-green-50' : 'bg-green-500/10') : ''
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className={`truncate text-xs font-semibold ${textPrimary}`}>{snap.name}</p>
                  <span className={`flex items-center gap-1 text-[10px] ${textMuted}`}>
                    <Clock className="h-2.5 w-2.5" />
                    {fmtDate(snap.savedAt)}
                    <span className="opacity-50">· {snap.config.widgets.length}w</span>
                  </span>
                </div>

                <div className="flex flex-shrink-0 items-center gap-1">
                  {restored === snap.id ? (
                    <Check className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <button
                      onClick={() => handleRestore(snap)}
                      className={`rounded p-1 transition-colors ${textMuted} hover:text-green-500`}
                      title="Restore this snapshot"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(snap.id)}
                    className={`rounded p-1 transition-colors ${textMuted} hover:text-red-400`}
                    title="Delete snapshot"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className={`border-t px-3 py-2 ${divider}`}>
          <p className={`text-[10px] ${textMuted} opacity-60`}>
            Snapshots are stored locally. Max 10 per dashboard.
          </p>
        </div>
      </div>
    </>
  );
}
