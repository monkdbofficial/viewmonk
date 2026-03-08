'use client';

import { useState } from 'react';
import { Copy, Check, Play, AlertCircle, Info, Zap } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { AssistantMessage } from '../../lib/assistant/types';
import ResultTable from './ResultTable';

interface MessageBubbleProps {
  message: AssistantMessage;
  onSuggestionClick: (text: string) => void;
  onRunSQL?: (sql: string) => void;
}

function SQLBlock({ sql, onRun }: { sql: string; onRun?: (sql: string) => void }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="mt-2 overflow-hidden rounded-lg border border-gray-200 bg-gray-950 dark:border-gray-700">
      <div className="flex items-center justify-between border-b border-gray-700/60 bg-gray-900/80 px-3 py-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">SQL</span>
        <div className="flex items-center gap-1">
          {onRun && (
            <button
              onClick={() => onRun(sql)}
              className="flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold text-emerald-400 hover:bg-emerald-950 hover:text-emerald-300"
            >
              <Play className="h-3 w-3" /> Run
            </button>
          )}
          <button
            onClick={copy}
            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-gray-400 hover:text-gray-200"
          >
            {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
      <pre className="overflow-x-auto p-3 text-xs leading-relaxed text-gray-100">
        <code>{sql}</code>
      </pre>
    </div>
  );
}

export default function MessageBubble({ message, onSuggestionClick, onRunSQL }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isError = message.role === 'error';
  const isSystem = message.role === 'system';
  const isThinking = message.thinking;

  // ── System info message ──────────────────────────────────────────────────
  if (isSystem) {
    return (
      <div className="flex items-center justify-center py-1">
        <span className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
          <Info className="h-3 w-3 text-blue-500" />
          {message.systemInfo ?? message.text}
        </span>
      </div>
    );
  }

  // ── Thinking / loading state ─────────────────────────────────────────────
  if (isThinking) {
    return (
      <div className="flex items-start gap-2.5 px-4 py-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600">
          <Zap className="h-3.5 w-3.5 text-white" />
        </div>
        <div className="rounded-2xl rounded-tl-sm bg-gray-100 px-3 py-2.5 dark:bg-gray-800">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {message.thinkingStep ?? 'Thinking…'}
          </p>
          <div className="mt-1.5 flex items-center gap-1">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-blue-500 opacity-70"
                style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── User message ──────────────────────────────────────────────────────────
  if (isUser) {
    return (
      <div className="flex items-end justify-end gap-2 px-4 py-1.5">
        <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-blue-600 px-3.5 py-2.5 text-sm text-white shadow-sm">
          {message.text}
        </div>
      </div>
    );
  }

  // ── Error message ─────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="flex items-start gap-2.5 px-4 py-1.5">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
          <AlertCircle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
        </div>
        <div className="max-w-[88%] space-y-2">
          <div className="rounded-2xl rounded-tl-sm border border-red-200 bg-red-50 px-3.5 py-2.5 dark:border-red-800 dark:bg-red-950/40">
            <p className="text-xs font-medium text-red-700 dark:text-red-400">Query Error</p>
            <p className="mt-0.5 text-xs text-red-600 dark:text-red-500">{message.error ?? message.text}</p>
          </div>
          {message.sqlBlock && <SQLBlock sql={message.sqlBlock} />}
          {message.suggestions && message.suggestions.length > 0 && (
            <SuggestionChipsInline suggestions={message.suggestions} onClick={onSuggestionClick} />
          )}
        </div>
      </div>
    );
  }

  // ── Assistant message ─────────────────────────────────────────────────────
  return (
    <div className="flex items-start gap-2.5 px-4 py-1.5">
      {/* Avatar */}
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 shadow-sm">
        <Zap className="h-3.5 w-3.5 text-white" />
      </div>

      <div className="max-w-[90%] space-y-2">
        {/* Text content */}
        {message.text && (
          <div className="rounded-2xl rounded-tl-sm bg-gray-100 px-3.5 py-2.5 dark:bg-gray-800">
            <div className="prose prose-xs max-w-none text-gray-800 dark:text-gray-200
              prose-headings:text-gray-900 dark:prose-headings:text-gray-100
              prose-strong:text-gray-900 dark:prose-strong:text-gray-100
              prose-code:rounded prose-code:bg-gray-200 prose-code:px-1 prose-code:text-blue-700
              dark:prose-code:bg-gray-700 dark:prose-code:text-blue-300
              prose-a:text-blue-600 dark:prose-a:text-blue-400
              prose-table:text-xs">
              <ReactMarkdown>{message.text}</ReactMarkdown>
            </div>
          </div>
        )}

        {/* SQL result table */}
        {message.sqlResult && <ResultTable result={message.sqlResult} />}

        {/* SQL block (non-executable) */}
        {message.sqlBlock && !message.sqlResult && (
          <SQLBlock sql={message.sqlBlock} onRun={onRunSQL} />
        )}

        {/* Suggestion chips */}
        {message.suggestions && message.suggestions.length > 0 && (
          <SuggestionChipsInline suggestions={message.suggestions} onClick={onSuggestionClick} />
        )}
      </div>
    </div>
  );
}

function SuggestionChipsInline({ suggestions, onClick }: { suggestions: string[]; onClick: (s: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {suggestions.map(s => (
        <button
          key={s}
          onClick={() => onClick(s)}
          className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700 transition-colors hover:border-blue-300 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-400 dark:hover:bg-blue-900/40"
        >
          {s}
        </button>
      ))}
    </div>
  );
}
