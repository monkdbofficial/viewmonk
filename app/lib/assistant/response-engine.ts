import { classifyIntent } from './intent-engine';
import { buildSQL } from './sql-builder';
import { searchKnowledge } from './knowledge-base';
import { refreshSchema, isCacheStale, getCachedSchema } from './schema-cache';
import type { AssistantMessage, SQLResult, IntentType } from './types';

// ── Query executor type (injected by UI layer) ────────────────────────────────
export type QueryFn = (sql: string) => Promise<{ cols: string[]; rows: unknown[][]; duration?: number }>;

// ── Progress callback ─────────────────────────────────────────────────────────
export type ProgressFn = (step: string) => void;

// ── Greeting responses ────────────────────────────────────────────────────────
const GREETINGS = [
  "Hey! I'm **MonkDB Assistant**. I know everything about your database and this workbench.\n\nAsk me to run queries, explore your schema, or explain any feature.\n\nTry: `show my tables` or `how do I create a dashboard`",
  "Hello! Ready to help with your MonkDB database.\n\nI can run SQL, explain features, and explore your schema — all without leaving this page.",
  "Hi there! What would you like to know about your data or the workbench?",
];

// ── Help response ─────────────────────────────────────────────────────────────
const HELP_RESPONSE = `**MonkDB Assistant** — Here's what I can do:

**Your Data:**
- \`show my tables\` — List all tables in the database
- \`describe <table>\` — Show columns and types
- \`count rows in <table>\` — Row count
- \`show data from <table>\` — Preview latest rows
- \`top 10 by revenue in stores\` — Ranked results
- \`average sales by region in orders\` — Aggregations
- \`trend of temperature last 24h in sensors\` — Time-series

**Workbench Features:**
- \`how do I create a dashboard?\`
- \`what is the geospatial page?\`
- \`how to add a widget?\`
- \`explain timeseries studio\`

**Raw SQL:** Just type any \`SELECT ...\` and I'll run it directly.

**Tip:** Press **Ctrl/Cmd + /\`** to toggle this panel anytime.`;

// ── Out-of-scope response ────────────────────────────────────────────────────
function buildOutOfScopeResponse(): AssistantMessage {
  return buildMessage({
    text: "I'm **MonkDB Assistant** — I only help with your MonkDB database and Workbench features.\n\nTry asking:\n- `show my tables`\n- `how do I create a dashboard?`\n- `describe the stores table`\n\nOr type any SQL directly and I'll run it.",
    intent: 'OUT_OF_SCOPE',
    confidence: 0.9,
    suggestions: ['show my tables', 'how do I create a dashboard?', 'help'],
  });
}

// ── Unclear response ──────────────────────────────────────────────────────────
function buildUnclearResponse(_input: string): AssistantMessage {
  const schema = getCachedSchema();
  const tables = schema?.tables ?? [];

  if (tables.length > 0) {
    // Show all real table names as clickable chips
    const tableChips = tables.slice(0, 12).map(t => `show ${t.table}`);
    return buildMessage({
      text: "I'm not sure which table you mean. Here are all your available tables — click one to explore:",
      intent: 'UNCLEAR',
      confidence: 0,
      suggestions: tableChips,
    });
  }

  return buildMessage({
    text: "I didn't quite catch that. Try one of these:",
    intent: 'UNCLEAR',
    confidence: 0,
    suggestions: ['show my tables', 'help', 'how do I create a dashboard?'],
  });
}

// ── Helper: build an AssistantMessage ────────────────────────────────────────
let _idCounter = 0;
function buildMessage(params: Partial<AssistantMessage>): AssistantMessage {
  return {
    id: `msg_${Date.now()}_${_idCounter++}`,
    role: 'assistant',
    timestamp: Date.now(),
    ...params,
  };
}

// ── Page context suggestions ──────────────────────────────────────────────────
export function getContextualSuggestions(pathname: string): string[] {
  if (pathname.includes('/timeseries')) {
    return ['list my tables', 'how to add a widget', 'what themes are available', 'how to create a dashboard'];
  }
  if (pathname.includes('/geospatial')) {
    return ['list geo tables', 'how does geospatial work', 'write a distance query', 'show geo points'];
  }
  if (pathname.includes('/vector-ops')) {
    return ['show vector tables', 'explain KNN search', 'how to upload embeddings', 'write KNN SQL'];
  }
  if (pathname.includes('/query-editor')) {
    return ['show my tables', 'explain time_bucket', 'keyboard shortcuts', 'how to save a query'];
  }
  if (pathname.includes('/monitoring')) {
    return ['explain sharding', 'what is cluster health', 'list tables with shard count'];
  }
  if (pathname.includes('/table-designer')) {
    return ['how to create a table', 'explain sharding', 'what is CLUSTERED BY', 'available column types'];
  }
  // Default
  return ['show my tables', 'how do I create a dashboard', 'explain geospatial', 'help'];
}

// ── Main orchestrator ─────────────────────────────────────────────────────────

export async function processMessage(
  input: string,
  queryFn: QueryFn,
  onProgress: ProgressFn,
): Promise<AssistantMessage> {
  const trimmed = input.trim();

  // ── 1. Ensure schema is fresh ────────────────────────────────────────────
  if (isCacheStale()) {
    onProgress('Loading schema…');
    try {
      await refreshSchema(queryFn);
    } catch {
      // Schema load failed — continue without it (docs-only mode)
    }
  }

  // ── 2. Classify intent ───────────────────────────────────────────────────
  onProgress('Understanding your question…');
  const intentResult = classifyIntent(trimmed);
  const { intent, confidence, params } = intentResult;

  // ── 3. Route by intent ───────────────────────────────────────────────────

  // Greeting
  if (intent === 'GREETING') {
    return buildMessage({
      text: GREETINGS[Math.floor(Math.random() * GREETINGS.length)],
      intent,
      confidence,
      suggestions: getContextualSuggestions('/'),
    });
  }

  // Help request
  if (intent === 'HELP_REQUEST') {
    return buildMessage({
      text: HELP_RESPONSE,
      intent,
      confidence,
      suggestions: ['show my tables', 'describe a table', 'how do I create a dashboard?'],
    });
  }

  // Out of scope
  if (intent === 'OUT_OF_SCOPE') {
    return buildOutOfScopeResponse();
  }

  // Unclear — show all available tables as clickable options
  if (intent === 'UNCLEAR') {
    return buildUnclearResponse(trimmed);
  }

  // Feature / how-to / page help — search knowledge base
  if (['FEATURE_QUESTION', 'HOW_TO', 'PAGE_HELP', 'WHAT_IS'].includes(intent)) {
    onProgress('Searching knowledge base…');
    const results = searchKnowledge(trimmed, 3);

    if (results.length > 0 && results[0].score >= 0.3) {
      const top = results[0].entry;
      const related = results.slice(1).map(r => r.entry.triggers[0]);
      return buildMessage({
        text: top.answer,
        intent,
        confidence,
        suggestions: [
          ...(top.relatedTopics?.slice(0, 2) ?? []),
          ...(top.exampleQuestions?.slice(0, 2) ?? []),
          ...related,
        ].slice(0, 4),
      });
    }

    // Low confidence knowledge match — try to help anyway
    return buildMessage({
      text: `I'm not sure about that specific topic. Here are the closest results I found:\n\n${results.map(r => `- **${r.entry.triggers[0]}**`).join('\n')}\n\nOr ask me to run SQL directly.`,
      intent,
      confidence,
      suggestions: ['help', 'show my tables', 'how do I create a dashboard?'],
    });
  }

  // ── 4. Data intents — need DB connection ────────────────────────────────

  // Build SQL from intent
  onProgress('Building query…');
  const buildResult = buildSQL(intentResult);

  if (!buildResult.canExecute || !buildResult.sql) {
    // Couldn't build SQL — need more info
    const missingInfo = buildResult.missingInfo ?? 'table name';
    const allTables = getCachedSchema()?.tables.map(t => t.table) ?? [];

    if (missingInfo === 'table' && allTables.length > 0) {
      return buildMessage({
        text: `Which table would you like to query? Here are your available tables:`,
        intent,
        confidence,
        suggestions: allTables.slice(0, 6).map(t => `${getIntentVerb(intent)} ${t}`),
      });
    }

    if (!buildResult.canExecute) {
      // Show SQL as non-runnable block
      return buildMessage({
        text: buildResult.explanation,
        sqlBlock: buildResult.sql,
        intent,
        confidence,
        suggestions: ['show my tables', 'help'],
      });
    }

    return buildUnclearResponse(trimmed);
  }

  // ── 5. Execute SQL ────────────────────────────────────────────────────────
  onProgress('Running query…');
  try {
    const startMs = Date.now();
    const raw = await queryFn(buildResult.sql);
    const durationMs = Date.now() - startMs;

    const DISPLAY_LIMIT = 200;
    const truncated = raw.rows.length > DISPLAY_LIMIT;

    const sqlResult: SQLResult = {
      cols: raw.cols,
      rows: truncated ? raw.rows.slice(0, DISPLAY_LIMIT) : raw.rows,
      rowCount: raw.rows.length,
      durationMs,
      sql: buildResult.sql,
      truncated,
    };

    // Build follow-up suggestions based on what was just done
    const followUps = buildFollowUps(intent, params.schema, params.table, raw.cols);

    return buildMessage({
      text: buildResult.explanation,
      sqlResult,
      intent,
      confidence,
      suggestions: followUps,
    });
  } catch (err) {
    const errorMsg = (err as Error).message ?? 'Query failed';
    return buildMessage({
      role: 'error',
      text: `Query failed: ${errorMsg}`,
      sqlBlock: buildResult.sql,
      error: errorMsg,
      intent,
      confidence,
      suggestions: ['show my tables', 'help'],
    });
  }
}

// ── Follow-up suggestion builder ──────────────────────────────────────────────
function buildFollowUps(intent: IntentType, schema?: string, table?: string, cols?: string[]): string[] {
  if (!table) return ['show my tables', 'help'];

  const suggestions: string[] = [];
  switch (intent) {
    case 'LIST_TABLES':
      suggestions.push('describe ' + (getCachedSchema()?.tables[0]?.table ?? 'a table'));
      suggestions.push('count rows in ' + (getCachedSchema()?.tables[0]?.table ?? 'table'));
      break;
    case 'DESCRIBE_TABLE':
      suggestions.push(`show data from ${table}`);
      suggestions.push(`count rows in ${table}`);
      if (cols?.some(c => /time|ts|date|created/.test(c))) {
        suggestions.push(`trend of ${table}`);
      }
      break;
    case 'SELECT_ALL':
    case 'COUNT_ROWS':
      suggestions.push(`top 10 in ${table}`);
      suggestions.push(`describe ${table}`);
      break;
    case 'TOP_N_QUERY':
    case 'AGGREGATE':
      suggestions.push(`trend of ${table}`);
      suggestions.push(`show data from ${table}`);
      break;
    case 'TIME_SERIES':
      suggestions.push(`average values in ${table}`);
      suggestions.push(`count rows in ${table}`);
      break;
    default:
      suggestions.push(`describe ${table}`, `show data from ${table}`);
  }
  return suggestions.slice(0, 4);
}

function getIntentVerb(intent: IntentType): string {
  switch (intent) {
    case 'COUNT_ROWS': return 'count rows in';
    case 'DESCRIBE_TABLE': return 'describe';
    case 'TOP_N_QUERY': return 'top 10 in';
    case 'AGGREGATE': return 'aggregate';
    case 'TIME_SERIES': return 'trend of';
    default: return 'show data from';
  }
}
