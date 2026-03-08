'use client';

// ── Intent Types ──────────────────────────────────────────────────────────────

export type IntentType =
  // Data intents
  | 'LIST_TABLES'
  | 'DESCRIBE_TABLE'
  | 'COUNT_ROWS'
  | 'SELECT_ALL'
  | 'TOP_N_QUERY'
  | 'AGGREGATE'
  | 'TIME_SERIES'
  | 'GEO_QUERY'
  | 'VECTOR_SEARCH'
  | 'FILTER_QUERY'
  | 'RAW_SQL'
  // Knowledge intents
  | 'FEATURE_QUESTION'
  | 'HOW_TO'
  | 'PAGE_HELP'
  | 'WHAT_IS'
  // Meta
  | 'GREETING'
  | 'HELP_REQUEST'
  | 'UNCLEAR'
  | 'OUT_OF_SCOPE';

export interface IntentParams {
  table?: string;
  schema?: string;
  column?: string;
  valueColumn?: string;
  groupColumn?: string;
  limit?: number;
  orderDirection?: 'ASC' | 'DESC';
  filters?: FilterParam[];
  interval?: string;
  aggregation?: 'AVG' | 'SUM' | 'MAX' | 'MIN' | 'COUNT';
  rawSql?: string;
  topicKeyword?: string;
}

export interface FilterParam {
  column: string;
  operator: '=' | '>' | '<' | '>=' | '<=' | 'LIKE' | '!=';
  value: string;
}

export interface IntentResult {
  intent: IntentType;
  confidence: number; // 0–1
  params: IntentParams;
  suggestedSql?: string;
  suggestedQuestions?: string[];
}

// ── Schema Types ──────────────────────────────────────────────────────────────

export interface SchemaTable {
  schema: string;
  table: string;
  fullName: string;
  shards?: number;
}

export interface SchemaColumn {
  schema: string;
  table: string;
  name: string;
  type: string;
  isNullable: boolean;
  isGeo: boolean;
  isVector: boolean;
  isTimestamp: boolean;
  isNumeric: boolean;
  isText: boolean;
}

export interface SchemaSnapshot {
  tables: SchemaTable[];
  columns: SchemaColumn[];
  loadedAt: number; // epoch ms
}

// ── Message Types ─────────────────────────────────────────────────────────────

export type MessageRole = 'user' | 'assistant' | 'system' | 'error';

export type MessageContentType =
  | 'text'
  | 'sql_result'
  | 'sql_block'
  | 'suggestions'
  | 'error'
  | 'system_info';

export interface SQLResult {
  cols: string[];
  rows: unknown[][];
  rowCount: number;
  durationMs: number;
  sql: string;
  truncated: boolean; // true if more rows exist beyond display limit
}

export interface AssistantMessage {
  id: string;
  role: MessageRole;
  timestamp: number;
  // Main text content
  text?: string;
  // Structured content
  sqlResult?: SQLResult;
  sqlBlock?: string;       // SQL code to display (not yet executed)
  suggestions?: string[];  // Clickable follow-up chips
  error?: string;
  systemInfo?: string;
  // Meta
  intent?: IntentType;
  confidence?: number;
  thinking?: boolean;      // True while streaming
  thinkingStep?: string;   // "Checking schema...", "Building query..."
}

// ── Conversation Types ────────────────────────────────────────────────────────

export interface Conversation {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  messages: AssistantMessage[];
}

// ── Knowledge Base Types ──────────────────────────────────────────────────────

export interface KnowledgeEntry {
  id: string;
  triggers: string[];      // Keywords that match this entry
  category: 'feature' | 'how_to' | 'page' | 'sql' | 'concept';
  page?: string;           // e.g. '/timeseries'
  pageLabel?: string;      // e.g. 'Timeseries Studio'
  answer: string;
  relatedTopics?: string[];
  exampleQuestions?: string[];
}

export interface KnowledgeSearchResult {
  entry: KnowledgeEntry;
  score: number;
}
