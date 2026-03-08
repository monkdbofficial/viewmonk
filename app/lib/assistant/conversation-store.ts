import type { Conversation, AssistantMessage } from './types';

const STORAGE_KEY = 'monkdb_ai_conversations';
const MAX_CONVERSATIONS = 10;
const MAX_MESSAGES_PER_CONVERSATION = 100;

// ── Persistence ───────────────────────────────────────────────────────────────

function loadAll(): Conversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Conversation[]) : [];
  } catch {
    return [];
  }
}

function saveAll(conversations: Conversation[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  } catch {
    // Storage quota exceeded — trim oldest and retry
    const trimmed = conversations.slice(0, MAX_CONVERSATIONS - 2);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed)); } catch { /* ignore */ }
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export function listConversations(): Conversation[] {
  return loadAll().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getConversation(id: string): Conversation | null {
  return loadAll().find(c => c.id === id) ?? null;
}

export function createConversation(name?: string): Conversation {
  const conv: Conversation = {
    id: `conv_${Date.now()}`,
    name: name ?? `Chat ${new Date().toLocaleDateString()}`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [],
  };
  const all = loadAll();
  // Keep only most recent MAX_CONVERSATIONS
  const updated = [conv, ...all].slice(0, MAX_CONVERSATIONS);
  saveAll(updated);
  return conv;
}

export function addMessage(conversationId: string, message: AssistantMessage): void {
  const all = loadAll();
  const idx = all.findIndex(c => c.id === conversationId);
  if (idx === -1) return;

  const conv = all[idx];
  conv.messages = [...conv.messages, message].slice(-MAX_MESSAGES_PER_CONVERSATION);
  conv.updatedAt = Date.now();
  all[idx] = conv;
  saveAll(all);
}

export function clearConversation(conversationId: string): void {
  const all = loadAll();
  const idx = all.findIndex(c => c.id === conversationId);
  if (idx === -1) return;
  all[idx].messages = [];
  all[idx].updatedAt = Date.now();
  saveAll(all);
}

export function deleteConversation(conversationId: string): void {
  const all = loadAll().filter(c => c.id !== conversationId);
  saveAll(all);
}

export function renameConversation(conversationId: string, name: string): void {
  const all = loadAll();
  const idx = all.findIndex(c => c.id === conversationId);
  if (idx === -1) return;
  all[idx].name = name;
  saveAll(all);
}

export function exportConversation(conversationId: string): string {
  const conv = getConversation(conversationId);
  if (!conv) return '';
  return JSON.stringify(conv, null, 2);
}

export function getOrCreateDefault(): Conversation {
  const all = listConversations();
  if (all.length > 0) return all[0];
  return createConversation('Default Chat');
}
