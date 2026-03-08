import type { IntentResult, IntentType, IntentParams } from './types';
import { findTableFuzzy, getAllTableNames, getCachedSchema } from './schema-cache';

// ── Stop words (ignore in matching) ──────────────────────────────────────────
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
  'in', 'on', 'at', 'by', 'for', 'with', 'about', 'against', 'between',
  'into', 'through', 'during', 'of', 'to', 'from', 'up', 'down',
  'me', 'my', 'i', 'you', 'your', 'it', 'its', 'we', 'our', 'they',
  'please', 'just', 'only', 'also', 'very', 'really', 'quite',
  'get', 'show', 'give', 'tell', 'find', 'fetch', 'display', 'list',
]);

// ── Normalise input ───────────────────────────────────────────────────────────
function clean(s: string): string {
  return s.toLowerCase().replace(/['"`;]/g, '').replace(/\s+/g, ' ').trim();
}

function tokens(s: string): string[] {
  return clean(s).split(' ').filter(t => t.length > 0);
}

function meaningful(s: string): string[] {
  return tokens(s).filter(t => !STOP_WORDS.has(t));
}

// ── Extract number from string ────────────────────────────────────────────────
function extractNumber(s: string, defaultVal: number): number {
  const m = s.match(/\b(\d+)\b/);
  return m ? parseInt(m[1], 10) : defaultVal;
}

// ── Try to find a table name in the input ────────────────────────────────────
function extractTable(input: string): SchemaTableRef | null {
  const tableNames = getAllTableNames();
  const words = tokens(input);

  // Exact token match
  for (const word of words) {
    if (tableNames.some(t => t.toLowerCase() === word)) {
      const match = tableNames.find(t => t.toLowerCase() === word)!;
      const tableObj = findTableFuzzy(match);
      if (tableObj) return { schema: tableObj.schema, table: tableObj.table };
    }
  }

  // schema.table pattern
  const schemaDotTable = input.match(/(\w+)\.(\w+)/);
  if (schemaDotTable) {
    const t = findTableFuzzy(schemaDotTable[0]);
    if (t) return { schema: t.schema, table: t.table };
  }

  // Fuzzy: try each word against table names — only accept if distance is close enough
  for (const word of words) {
    if (word.length < 4) continue;
    const tableNames = getAllTableNames();
    // Exact prefix or suffix match first
    const prefix = tableNames.find(t =>
      t.toLowerCase().startsWith(word) || word.startsWith(t.toLowerCase())
    );
    if (prefix) {
      const t = findTableFuzzy(prefix);
      if (t) return { schema: t.schema, table: t.table };
    }
    // Only fuzzy match if the word is at least 5 chars and distance <= 2
    if (word.length >= 5) {
      const t = findTableFuzzy(word);
      if (t) {
        // Validate: only accept if the matched table name shares at least half the chars
        const dist = levenshteinLocal(word, t.table.toLowerCase());
        const maxAllowed = Math.floor(Math.min(word.length, t.table.length) / 3);
        if (dist <= maxAllowed) return { schema: t.schema, table: t.table };
      }
    }
  }

  return null;
}

function levenshteinLocal(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (__, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

interface SchemaTableRef { schema: string; table: string }

// ── Intent patterns ───────────────────────────────────────────────────────────
// Each pattern: { test: RegExp, intent: IntentType, confidence: number }

const PATTERNS: Array<{
  test: RegExp;
  intent: IntentType;
  confidence: number;
}> = [
  // Greetings
  { test: /^(hi|hello|hey|howdy|good morning|good afternoon|good evening|greetings)[\s!.]*$/i, intent: 'GREETING', confidence: 1.0 },
  // Help
  { test: /^(help|what can you do|what do you do|capabilities|what can i ask)[\s?]*$/i, intent: 'HELP_REQUEST', confidence: 1.0 },
  // List tables
  { test: /\b(list|show|get|display|what|which|all)\b.*(table|tables|schema|schemas|relation)/i, intent: 'LIST_TABLES', confidence: 0.95 },
  { test: /\btables?\b/i, intent: 'LIST_TABLES', confidence: 0.7 },
  // Describe table
  { test: /\b(describe|desc|columns?|structure|schema of|info about|details? of|what.*column|column.*in)\b/i, intent: 'DESCRIBE_TABLE', confidence: 0.9 },
  // Count rows
  { test: /\b(count|how many|number of|total|rows? in|row count)\b/i, intent: 'COUNT_ROWS', confidence: 0.88 },
  // Select all / show data — matches "show users", "show aqi_platform", "get orders data"
  { test: /\b(show|select|fetch|get|view|see|preview|sample)\b.*(data|rows?|records?|entries?)/i, intent: 'SELECT_ALL', confidence: 0.85 },
  { test: /^(show|open|fetch|get|view|preview|display)\s+\w/i, intent: 'SELECT_ALL', confidence: 0.78 },
  // Top N
  { test: /\b(top|best|highest|largest|biggest|most|lowest|smallest|least|worst|bottom)\b.*\d*/i, intent: 'TOP_N_QUERY', confidence: 0.88 },
  { test: /\b(rank|ranking|order by|sort by|sorted)\b/i, intent: 'TOP_N_QUERY', confidence: 0.75 },
  // Aggregation
  { test: /\b(average|avg|mean|sum|total|max|min|minimum|maximum|per|by|group)\b/i, intent: 'AGGREGATE', confidence: 0.82 },
  // Time series
  { test: /\b(over time|time series|timeseries|hourly|daily|weekly|monthly|trend|last \d+|past \d+|since|between)\b/i, intent: 'TIME_SERIES', confidence: 0.9 },
  { test: /\b(time.?bucket|date.?trunc|interval)\b/i, intent: 'TIME_SERIES', confidence: 0.95 },
  // Geo query
  { test: /\b(near|nearby|distance|within|around|location|geo|lat|lng|latitude|longitude|radius|km|miles?|meters?)\b/i, intent: 'GEO_QUERY', confidence: 0.9 },
  // Vector search
  { test: /\b(similar|similarity|vector|embedding|knn|nearest|semantic)\b/i, intent: 'VECTOR_SEARCH', confidence: 0.9 },
  // Feature / How-to questions
  { test: /\b(how (to|do|can|does)|how (do i|can i|do you)|what is|what are|explain|tell me about|guide|help with|tutorial)\b/i, intent: 'FEATURE_QUESTION', confidence: 0.75 },
  { test: /\b(page|feature|function|option|setting|button|panel|widget|dashboard)\b/i, intent: 'PAGE_HELP', confidence: 0.65 },
  // Filter query
  { test: /\b(where|filter|with|having|equals?|greater|less|between|contains?|starts? with|ends? with)\b/i, intent: 'FILTER_QUERY', confidence: 0.8 },
];

// ── Aggregation extraction ────────────────────────────────────────────────────
function extractAggregation(input: string): IntentParams['aggregation'] {
  const c = clean(input);
  if (/\b(average|avg|mean)\b/.test(c)) return 'AVG';
  if (/\b(sum|total)\b/.test(c)) return 'SUM';
  if (/\b(max|maximum|highest|largest|biggest|most)\b/.test(c)) return 'MAX';
  if (/\b(min|minimum|lowest|smallest|least)\b/.test(c)) return 'MIN';
  if (/\b(count|how many|number of)\b/.test(c)) return 'COUNT';
  return 'SUM';
}

// ── Column hint extraction ────────────────────────────────────────────────────
function extractColumnHint(input: string): string | undefined {
  // "by X", "of X", "for X", "X column"
  const m = input.match(/\b(?:by|of|for|column|field)\s+(\w+)/i);
  if (m) return m[1];
  return undefined;
}

// ── Interval extraction ───────────────────────────────────────────────────────
function extractInterval(input: string): string {
  const c = clean(input);
  if (/\b(minute|min)\b/.test(c)) return '1 minute';
  if (/\b(hour|hourly)\b/.test(c)) return '1 hour';
  if (/\b(day|daily)\b/.test(c)) return '1 day';
  if (/\b(week|weekly)\b/.test(c)) return '1 week';
  if (/\b(month|monthly)\b/.test(c)) return '1 month';
  return '1 hour';
}

// ── Out-of-scope detector ─────────────────────────────────────────────────────
const OUT_OF_SCOPE_SIGNALS = [
  /\b(weather|forecast|stock market|news|recipe|cook|movie|music|sport|football|cricket|politics)\b/i,
  /\b(write (a |me a )?(poem|story|essay|letter|email|joke))\b/i,
  /\b(who is|who was|who are|celebrities?|famous|president|king|queen)\b/i,
  /\b(translate|translation)\b/i,
  /\b(what (time|day|date) is it)\b/i,
  /\b(calculate|math|equation|formula)\b.*\b(not related to sql|not data)\b/i,
];

// ── RAW SQL detector ──────────────────────────────────────────────────────────
function isRawSQL(input: string): boolean {
  // SHOW is excluded — MonkDB doesn't support MySQL-style SHOW statements.
  // "show tables", "show data" etc. are handled by the intent engine.
  return /^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|WITH|EXPLAIN)\b/i.test(input.trim());
}

// ── Main classify function ────────────────────────────────────────────────────
export function classifyIntent(input: string): IntentResult {
  const cleaned = clean(input);

  // 1. Raw SQL — pass through directly
  if (isRawSQL(input)) {
    return {
      intent: 'RAW_SQL',
      confidence: 1.0,
      params: { rawSql: input.trim() },
    };
  }

  // 2. Out of scope check
  for (const pattern of OUT_OF_SCOPE_SIGNALS) {
    if (pattern.test(cleaned)) {
      return {
        intent: 'OUT_OF_SCOPE',
        confidence: 0.9,
        params: {},
        suggestedQuestions: ['show my tables', 'how do I create a dashboard', 'describe a table'],
      };
    }
  }

  // 3. Score each pattern
  let bestIntent: IntentType = 'UNCLEAR';
  let bestConfidence = 0;

  for (const p of PATTERNS) {
    if (p.test.test(cleaned) && p.confidence > bestConfidence) {
      bestConfidence = p.confidence;
      bestIntent = p.intent;
    }
  }

  // 4. Refine with context — extract table, columns, etc.
  const tableRef = extractTable(cleaned);
  const params: IntentParams = {
    table: tableRef?.table,
    schema: tableRef?.schema,
    limit: extractNumber(cleaned, 100),
    aggregation: ['AGGREGATE', 'TIME_SERIES', 'TOP_N_QUERY'].includes(bestIntent)
      ? extractAggregation(cleaned)
      : undefined,
    interval: bestIntent === 'TIME_SERIES' ? extractInterval(cleaned) : undefined,
    column: extractColumnHint(cleaned),
    orderDirection: /\b(asc|ascending|lowest|smallest|least|oldest)\b/.test(cleaned) ? 'ASC' : 'DESC',
    topicKeyword: meaningful(cleaned).slice(0, 5).join(' '),
  };

  // 5. Downgrade if no table found for data intents
  const needsTable: IntentType[] = [
    'DESCRIBE_TABLE', 'COUNT_ROWS', 'SELECT_ALL',
    'TOP_N_QUERY', 'AGGREGATE', 'TIME_SERIES', 'GEO_QUERY', 'VECTOR_SEARCH', 'FILTER_QUERY',
  ];
  if (needsTable.includes(bestIntent) && !tableRef) {
    // Check if we have any tables at all
    const tables = getAllTableNames();
    if (tables.length === 0) {
      // No schema loaded yet — keep intent but lower confidence
      bestConfidence = Math.min(bestConfidence, 0.65);
    } else {
      // Schema loaded but no table found → unclear
      bestConfidence = Math.min(bestConfidence, 0.45);
    }
  }

  // 6. Suggestions for unclear
  const suggestedQuestions = buildSuggestions(bestIntent, tableRef?.table);

  return {
    intent: bestConfidence >= 0.5 ? bestIntent : 'UNCLEAR',
    confidence: bestConfidence,
    params,
    suggestedQuestions,
  };
}

function buildSuggestions(intent: IntentType, table?: string): string[] {
  const base = table
    ? [`show data from ${table}`, `count rows in ${table}`, `describe ${table} columns`]
    : ['show my tables', 'describe a table', 'how do I create a dashboard'];

  if (intent === 'UNCLEAR') {
    return [...base, 'what can you do?'];
  }
  return base;
}

// ── Typo correction for table names ──────────────────────────────────────────
export function suggestTableCorrection(input: string): string | null {
  const schema = getCachedSchema();
  if (!schema) return null;

  const words = tokens(input);
  for (const word of words) {
    if (word.length < 3) continue;
    const found = findTableFuzzy(word);
    if (found && found.table.toLowerCase() !== word) {
      return found.table;
    }
  }
  return null;
}
