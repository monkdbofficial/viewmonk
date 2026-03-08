'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import {
  Zap, X, Trash2, ChevronDown, RefreshCw, Send,
  Maximize2, Minimize2, Database,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useActiveConnection } from '../../lib/monkdb-context';
import { processMessage, getContextualSuggestions } from '../../lib/assistant/response-engine';
import { refreshSchema, clearSchemaCache, getCachedSchema } from '../../lib/assistant/schema-cache';
import {
  getOrCreateDefault,
  addMessage,
  clearConversation,
  listConversations,
} from '../../lib/assistant/conversation-store';
import type { AssistantMessage, Conversation } from '../../lib/assistant/types';
import MessageBubble from './MessageBubble';

// ── Pulse keyframe injected once ─────────────────────────────────────────────
const PULSE_STYLE = `
@keyframes monkdb-pulse {
  0%, 100% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.5); opacity: 0; }
}
@keyframes thinking-dot {
  0%, 100% { opacity: 0.3; transform: translateY(0); }
  50% { opacity: 1; transform: translateY(-3px); }
}
`;

let styleInjected = false;
function injectStyles() {
  if (styleInjected || typeof document === 'undefined') return;
  const style = document.createElement('style');
  style.textContent = PULSE_STYLE;
  document.head.appendChild(style);
  styleInjected = true;
}

// ── Placeholder rotation ──────────────────────────────────────────────────────
const PLACEHOLDERS = [
  'Ask about your data…',
  'Try: show my tables',
  'Try: describe stores table',
  'Try: top 10 by revenue',
  'Try: how do I create a dashboard?',
  'Type any SQL directly…',
];

export default function MonkDBAssistant() {
  const pathname = usePathname();
  const activeConnection = useActiveConnection();

  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [processing, setProcessing] = useState(false);
  const [thinkingStep, setThinkingStep] = useState('');
  const [schemaLoaded, setSchemaLoaded] = useState(false);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [hasNew, setHasNew] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const userMessages = useRef<string[]>([]);

  useEffect(() => { injectStyles(); }, []);

  // ── Load / create conversation ────────────────────────────────────────────
  useEffect(() => {
    const conv = getOrCreateDefault();
    setConversation(conv);
    setMessages(conv.messages);
    if (conv.messages.length === 0) {
      // Show welcome on first open
      addWelcome(conv.id);
    }
  }, []);

  const addWelcome = (convId: string) => {
    const welcome: AssistantMessage = {
      id: `welcome_${Date.now()}`,
      role: 'assistant',
      timestamp: Date.now(),
      text: "Hey! I'm **MonkDB Assistant** — your database co-pilot.\n\nI can run queries, explore your schema, and explain any Workbench feature.\n\nTry tapping a suggestion below or ask me anything.",
      suggestions: getContextualSuggestions(pathname ?? '/'),
    };
    setMessages([welcome]);
    if (convId) addMessage(convId, welcome);
  };

  // ── Placeholder rotation ──────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIdx(i => (i + 1) % PLACEHOLDERS.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  // ── Global keyboard shortcut Ctrl/Cmd + / ────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        setOpen(o => !o);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ── Auto-scroll ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  // ── Load schema when connection changes ───────────────────────────────────
  useEffect(() => {
    if (activeConnection?.status === 'connected' && !schemaLoaded) {
      const queryFn = async (sql: string) => {
        const res = await activeConnection.client.query(sql);
        return { cols: res.cols, rows: res.rows };
      };
      refreshSchema(queryFn)
        .then(snapshot => {
          setSchemaLoaded(true);
          const info: AssistantMessage = {
            id: `sys_${Date.now()}`,
            role: 'system',
            timestamp: Date.now(),
            systemInfo: `Schema loaded — ${snapshot.tables.length} tables found`,
          };
          setMessages(prev => [...prev, info]);
          if (conversation?.id) addMessage(conversation.id, info);
        })
        .catch(() => {/* silent fail */});
    }
  }, [activeConnection?.status, schemaLoaded, conversation?.id]);

  // ── Query function ────────────────────────────────────────────────────────
  const queryFn = useCallback(async (sql: string) => {
    if (!activeConnection?.client) {
      throw new Error('No active database connection. Connect to MonkDB first.');
    }
    const res = await activeConnection.client.query(sql);
    return { cols: res.cols, rows: res.rows };
  }, [activeConnection]);

  // ── Send message ──────────────────────────────────────────────────────────
  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || processing) return;

    setInputValue('');
    setHistoryIdx(-1);
    userMessages.current.unshift(trimmed);

    const userMsg: AssistantMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      timestamp: Date.now(),
      text: trimmed,
    };

    const thinkingMsg: AssistantMessage = {
      id: `thinking_${Date.now()}`,
      role: 'assistant',
      timestamp: Date.now(),
      thinking: true,
      thinkingStep: 'Thinking…',
    };

    setMessages(prev => [...prev, userMsg, thinkingMsg]);
    if (conversation?.id) addMessage(conversation.id, userMsg);

    setProcessing(true);

    try {
      const response = await processMessage(
        trimmed,
        queryFn,
        (step) => {
          setThinkingStep(step);
          setMessages(prev =>
            prev.map(m => m.thinking ? { ...m, thinkingStep: step } : m)
          );
        }
      );

      setMessages(prev => [
        ...prev.filter(m => !m.thinking),
        response,
      ]);

      if (conversation?.id) addMessage(conversation.id, response);
    } catch (err) {
      const errMsg: AssistantMessage = {
        id: `err_${Date.now()}`,
        role: 'error',
        timestamp: Date.now(),
        text: 'Something went wrong. Please try again.',
        error: (err as Error).message,
        suggestions: ['show my tables', 'help'],
      };
      setMessages(prev => [...prev.filter(m => !m.thinking), errMsg]);
      if (conversation?.id) addMessage(conversation.id, errMsg);
    } finally {
      setProcessing(false);
      setThinkingStep('');
    }
  }, [processing, queryFn, conversation?.id]);

  // ── Run SQL from SQL block ────────────────────────────────────────────────
  const handleRunSQL = useCallback((sql: string) => {
    send(sql);
  }, [send]);

  // ── Clear chat ────────────────────────────────────────────────────────────
  const handleClear = () => {
    if (!conversation?.id) return;
    clearConversation(conversation.id);
    setMessages([]);
    addWelcome(conversation.id);
  };

  // ── Refresh schema ────────────────────────────────────────────────────────
  const handleRefreshSchema = async () => {
    clearSchemaCache();
    setSchemaLoaded(false);
    if (activeConnection?.client) {
      try {
        const snapshot = await refreshSchema(async (sql) => {
          const res = await activeConnection.client.query(sql);
          return { cols: res.cols, rows: res.rows };
        });
        setSchemaLoaded(true);
        const info: AssistantMessage = {
          id: `sys_${Date.now()}`,
          role: 'system',
          timestamp: Date.now(),
          systemInfo: `Schema refreshed — ${snapshot.tables.length} tables`,
        };
        setMessages(prev => [...prev, info]);
      } catch {/* silent */}
    }
  };

  // ── Input key handling ────────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(inputValue);
      return;
    }
    // History navigation
    if (e.key === 'ArrowUp' && inputValue === '') {
      const idx = historyIdx + 1;
      if (idx < userMessages.current.length) {
        setHistoryIdx(idx);
        setInputValue(userMessages.current[idx]);
      }
      return;
    }
    if (e.key === 'ArrowDown' && historyIdx > 0) {
      const idx = historyIdx - 1;
      setHistoryIdx(idx);
      setInputValue(userMessages.current[idx]);
    }
  };

  const connStatus = activeConnection?.status ?? 'disconnected';
  const statusColor = connStatus === 'connected' ? 'bg-green-500' : connStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500';

  // ── Panel dimensions ──────────────────────────────────────────────────────
  const panelWidth  = expanded ? 'w-[680px]' : 'w-[420px]';
  const panelHeight = expanded ? 'h-[90vh]' : 'h-[600px]';

  return (
    <>
      {/* ── Floating button ────────────────────────────────────────────── */}
      {!open && (
        <button
          onClick={() => { setOpen(true); setHasNew(false); }}
          className="fixed bottom-6 right-6 z-[9999] flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-2xl transition-all hover:scale-105 hover:bg-blue-500 active:scale-95"
          title="MonkDB Assistant (Ctrl+/)"
        >
          <Zap className="h-6 w-6" />
          {hasNew && (
            <span className="absolute right-0 top-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-red-500" />
          )}
          <span
            className="absolute inset-0 rounded-full bg-blue-600"
            style={{ animation: 'monkdb-pulse 2s ease-out infinite' }}
          />
        </button>
      )}

      {/* ── Chat panel ─────────────────────────────────────────────────── */}
      {open && (
        <div
          className={`fixed bottom-6 right-6 z-[9999] flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl transition-all dark:border-gray-700 dark:bg-gray-900 ${panelWidth} ${panelHeight}`}
          style={{ maxHeight: 'calc(100vh - 3rem)' }}
        >
          {/* Header */}
          <div className="flex shrink-0 items-center gap-3 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 dark:border-gray-700">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">MonkDB Assistant</p>
              <div className="flex items-center gap-1.5">
                <div className={`h-1.5 w-1.5 rounded-full ${statusColor}`} />
                <span className="text-[10px] text-blue-200">
                  {connStatus === 'connected'
                    ? `Connected · ${schemaLoaded ? `${getCachedSchema()?.tables.length ?? 0} tables` : 'Loading schema…'}`
                    : 'No database connected'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleRefreshSchema}
                title="Refresh schema"
                className="rounded-lg p-1.5 text-blue-200 hover:bg-white/10 hover:text-white"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={handleClear}
                title="Clear chat"
                className="rounded-lg p-1.5 text-blue-200 hover:bg-white/10 hover:text-white"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setExpanded(e => !e)}
                title={expanded ? 'Collapse' : 'Expand'}
                className="rounded-lg p-1.5 text-blue-200 hover:bg-white/10 hover:text-white"
              >
                {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-blue-200 hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* No connection banner */}
          {connStatus !== 'connected' && (
            <div className="flex shrink-0 items-center gap-2 border-b border-yellow-200 bg-yellow-50 px-4 py-2 dark:border-yellow-800/40 dark:bg-yellow-950/30">
              <Database className="h-3.5 w-3.5 shrink-0 text-yellow-600 dark:text-yellow-400" />
              <p className="text-xs text-yellow-700 dark:text-yellow-400">
                No database connected — I can still answer feature questions!
              </p>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 space-y-1 overflow-y-auto py-3 scroll-smooth">
            {messages.map(msg => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onSuggestionClick={send}
                onRunSQL={handleRunSQL}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Context suggestion chips (shown when no input) */}
          {!inputValue && !processing && messages.length <= 2 && (
            <div className="shrink-0 border-t border-gray-100 px-3 py-2 dark:border-gray-800">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                Suggested
              </p>
              <div className="flex flex-wrap gap-1.5">
                {getContextualSuggestions(pathname ?? '/').map(s => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] text-gray-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input bar */}
          <div className="shrink-0 border-t border-gray-200 bg-gray-50/50 p-3 dark:border-gray-700 dark:bg-gray-900">
            <div className="flex items-end gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 shadow-sm focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={PLACEHOLDERS[placeholderIdx]}
                disabled={processing}
                rows={1}
                style={{ resize: 'none', minHeight: '22px', maxHeight: '96px', overflowY: 'auto', fieldSizing: 'content' } as React.CSSProperties}
                className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none dark:text-gray-100 dark:placeholder-gray-500"
              />
              <button
                onClick={() => send(inputValue)}
                disabled={!inputValue.trim() || processing}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white transition-all hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {processing ? (
                  <div className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
            <p className="mt-1 text-center text-[10px] text-gray-400">
              Enter to send · Shift+Enter for new line · ↑ for history · Ctrl+/ to toggle
            </p>
          </div>
        </div>
      )}
    </>
  );
}
