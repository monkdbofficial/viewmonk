import type { KnowledgeEntry, KnowledgeSearchResult } from './types';

// ── Knowledge Base ────────────────────────────────────────────────────────────
// All MonkDB Workbench features, pages, and concepts pre-written as Q&A entries.
// search() does fuzzy keyword matching — no external AI needed.

const ENTRIES: KnowledgeEntry[] = [
  // ── OVERVIEW ─────────────────────────────────────────────────────────────
  {
    id: 'workbench_overview',
    triggers: ['what is workbench', 'what is monkdb workbench', 'overview', 'what can i do', 'what does this do', 'help'],
    category: 'concept',
    answer: `**MonkDB Workbench** is an enterprise-grade analytics platform for MonkDB — a distributed SQL database optimized for time-series, geospatial, and vector data.

**Available pages:**
- **Dashboard** — Cluster health & real-time metrics
- **Query Editor** — Write and run SQL with a professional code editor
- **Timeseries Studio** — Drag-and-drop dashboard builder with 13 widget types
- **Geospatial Explorer** — Map visualization for GEO_POINT / GEO_SHAPE data
- **Vector Operations** — KNN similarity search on FLOAT_VECTOR columns
- **Schema Explorer** — Browse tables, columns, and schemas
- **Table Designer** — Wizard to design and create new tables
- **Blob Storage** — Manage binary files in BLOB tables
- **Monitoring** — Node health, shard distribution, query performance
- **FTS Schedules** — Full-text search index refresh management
- **Hybrid Search** — Combined BM25 + vector similarity search

Type **"show tables"** to see your data, or ask about any feature!`,
    relatedTopics: ['query editor', 'timeseries', 'geospatial', 'vector ops'],
    exampleQuestions: ['show my tables', 'how do I create a dashboard', 'what pages are available'],
  },

  // ── QUERY EDITOR ─────────────────────────────────────────────────────────
  {
    id: 'query_editor',
    triggers: ['query editor', 'sql editor', 'write sql', 'run query', 'execute query', 'monaco', 'tabs', 'saved queries'],
    category: 'page',
    page: '/query-editor',
    pageLabel: 'Query Editor',
    answer: `**Query Editor** (/query-editor) is a professional SQL workspace.

**Key features:**
- **Monaco Editor** — Full VS Code-like SQL editing with syntax highlighting and autocomplete
- **Multiple tabs** — Run several queries side-by-side
- **Saved queries** — Bookmark frequently used SQL for quick access
- **Query history** — Automatically tracks every query you run
- **Explain plan** — Visualize how MonkDB executes your query
- **Export results** — Download as CSV or JSON
- **Keyboard shortcuts:**
  - \`Ctrl/Cmd + Enter\` — Run query
  - \`Ctrl/Cmd + S\` — Save query
  - \`Ctrl/Cmd + T\` — New tab
  - \`Ctrl/Cmd + W\` — Close tab`,
    relatedTopics: ['saved queries', 'explain plan', 'export data'],
    exampleQuestions: ['how do I save a query', 'keyboard shortcuts', 'how to export results'],
  },

  // ── TIMESERIES STUDIO ─────────────────────────────────────────────────────
  {
    id: 'timeseries_overview',
    triggers: ['timeseries', 'dashboard', 'dashboard studio', 'dashboard builder', 'time series', 'widgets', 'charts'],
    category: 'page',
    page: '/timeseries',
    pageLabel: 'Timeseries Studio',
    answer: `**Timeseries Studio** (/timeseries) is a drag-and-drop dashboard builder for time-series data.

**13 widget types:**
Stat Card, Line Chart, Area Chart, Bar Chart, Pie/Donut, Gauge, Heatmap, Data Table, Scatter Plot, Funnel Chart, Treemap, Candlestick, Progress KPI

**6 built-in themes:**
Dark Navy, Midnight Glow, Light Clean, Purple Storm, Neon Cyber, Warm Vibrant

**Enterprise features:**
- Dashboard Variables (dynamic filters with \`{{varName}}\` syntax)
- Chart Annotations / Event Markers
- Time-Range Comparison (previous period/week/month)
- Threshold Alerts (in-app notifications)
- Query Result Caching (TTL-based)
- Data Freshness Badges (color-coded age indicators)
- Widget Lazy Loading (loads on scroll)
- Calculated Metrics (formula editor)
- Dashboard Drill-through Navigation
- PNG/JSON export, fullscreen mode
- Undo/redo, keyboard shortcuts`,
    relatedTopics: ['widgets', 'dashboard variables', 'themes', 'annotations'],
    exampleQuestions: ['how to add a widget', 'how to create a dashboard', 'what themes are available'],
  },
  {
    id: 'timeseries_add_widget',
    triggers: ['add widget', 'new widget', 'widget palette', 'create widget', 'insert widget'],
    category: 'how_to',
    page: '/timeseries',
    pageLabel: 'Timeseries Studio',
    answer: `**How to add a widget to a dashboard:**

1. Open or create a dashboard in **Timeseries Studio**
2. Click **"Edit"** button to enter edit mode
3. Click **"+ Add Widget"** in the toolbar to open the Widget Palette
4. Choose a widget type (Line Chart, Stat Card, Gauge, etc.)
5. The widget appears on the canvas — drag to position, drag the resize handle to resize
6. Click the widget's **gear icon** to open configuration
7. Select your table, timestamp column, metric column, and aggregation
8. Click **Save** — the widget loads live data

**Pro tip:** Use \`Ctrl/Cmd + Z\` to undo any widget move or resize.`,
    relatedTopics: ['widget types', 'widget configuration', 'resize widget'],
  },
  {
    id: 'timeseries_variables',
    triggers: ['dashboard variable', 'variables', 'dynamic filter', 'varname', 'variable bar'],
    category: 'feature',
    page: '/timeseries',
    answer: `**Dashboard Variables** let you create dynamic filters applied to all widgets.

**Types:** Textbox, Dropdown, Constant

**Usage in SQL:** \`{{varName}}\` — e.g. \`WHERE region = '{{region}}'\`

**To manage variables:**
1. Open dashboard in edit mode
2. Click **"Vars"** button in the toolbar
3. Add variables with name, label, type, and default value
4. Use \`{{varName}}\` anywhere in your widget SQL

Variables appear as interactive controls in the variable bar above the dashboard.`,
  },
  {
    id: 'timeseries_themes',
    triggers: ['theme', 'dark mode', 'color scheme', 'dashboard theme', 'change theme'],
    category: 'feature',
    page: '/timeseries',
    answer: `**Timeseries Studio** includes 6 built-in themes:
- **Dark Navy** — Deep dark blue professional theme
- **Midnight Glow** — Dark with neon accent colors
- **Light Clean** — Minimal bright white theme
- **Purple Storm** — Purple-based dark theme
- **Neon Cyber** — Vibrant cyberpunk-style colors
- **Warm Vibrant** — Warm orange/amber tones

**To change theme:** Click the palette icon in the dashboard viewer toolbar.`,
  },

  // ── GEOSPATIAL ────────────────────────────────────────────────────────────
  {
    id: 'geospatial_overview',
    triggers: ['geospatial', 'geo', 'map', 'location', 'geo_point', 'geo_shape', 'leaflet', 'spatial'],
    category: 'page',
    page: '/geospatial',
    pageLabel: 'Geospatial Explorer',
    answer: `**Geospatial Explorer** (/geospatial) visualizes geographic data on interactive maps.

**Supports:** GEO_POINT and GEO_SHAPE column types

**Map features:**
- **Point clustering** — Groups nearby points automatically
- **Heatmap layer** — Density visualization
- **Color-by column** — Color points by any column value
- **Point Detail Panel** — Click any point to see all its column data
- **Data Grid** — Spreadsheet view of all points with sorting/search
- **Saved Queries** — Save and reload spatial queries
- **Filters** — Column-based data filtering

**How to use:**
1. Select a table with a GEO_POINT or GEO_SHAPE column from the top selector
2. Points are automatically plotted on the map
3. Click any point to see full details in the right panel`,
    relatedTopics: ['geo_point', 'clustering', 'heatmap', 'color-by'],
  },
  {
    id: 'geospatial_sql',
    triggers: ['geo sql', 'geospatial query', 'distance query', 'within query', 'latitude longitude sql'],
    category: 'sql',
    answer: `**MonkDB Geospatial SQL:**

\`\`\`sql
-- Extract lat/lng from GEO_POINT
SELECT name, latitude(location) AS lat, longitude(location) AS lng
FROM doc.stores LIMIT 100;

-- Find points within distance (meters)
SELECT name FROM doc.stores
WHERE distance(location, 'POINT(77.5946 12.9716)') < 5000;

-- Points within a polygon
SELECT * FROM doc.deliveries
WHERE within(location, 'POLYGON((77.5 12.9, 77.7 12.9, 77.7 13.1, 77.5 13.1, 77.5 12.9))');

-- Intersecting shapes
SELECT * FROM doc.zones
WHERE intersects(area, 'POINT(77.59 12.97)');
\`\`\``,
  },

  // ── VECTOR OPERATIONS ─────────────────────────────────────────────────────
  {
    id: 'vector_ops',
    triggers: ['vector', 'vector ops', 'knn', 'similarity search', 'embedding', 'float_vector', 'semantic search'],
    category: 'page',
    page: '/vector-ops',
    pageLabel: 'Vector Operations',
    answer: `**Vector Operations** (/vector-ops) enables semantic/similarity search using FLOAT_VECTOR columns.

**Features:**
- **Collection Browser** — List and explore vector tables
- **KNN Search** — Find K nearest neighbors to a query vector
- **Batch Upload** — Insert documents with embeddings
- **Vector Debug Panel** — Inspect vector data

**To use:**
1. Create a table with a \`FLOAT_VECTOR(n)\` column (n = vector dimensions)
2. Insert rows with embeddings
3. Use the KNN search UI or write SQL directly

**KNN SQL:**
\`\`\`sql
SELECT id, title, _score
FROM doc.documents
WHERE knn_match(embedding, [0.1, 0.2, 0.3, ...], 5)
ORDER BY _score DESC LIMIT 5;
\`\`\``,
  },

  // ── TABLE DESIGNER ────────────────────────────────────────────────────────
  {
    id: 'table_designer',
    triggers: ['table designer', 'create table', 'new table', 'design table', 'table wizard', 'sharding', 'partitioning', 'replication'],
    category: 'page',
    page: '/table-designer',
    pageLabel: 'Table Designer',
    answer: `**Table Designer** (/table-designer) is a step-by-step wizard to create MonkDB tables.

**Wizard steps:**
1. **Table name & schema** — Name your table, choose schema
2. **Column definitions** — Add columns with type, nullability, defaults
3. **Sharding config** — Set number of shards and clustering column
4. **Partition config** — Optional: partition by date/value
5. **Replication** — Set replication factor for HA
6. **Preview & Create** — Review generated SQL, then create

**Supported column types:**
TEXT, INTEGER, BIGINT, DOUBLE, BOOLEAN, TIMESTAMP, OBJECT, ARRAY, GEO_POINT, GEO_SHAPE, FLOAT_VECTOR(n), BLOB`,
  },

  // ── SCHEMA EXPLORER ──────────────────────────────────────────────────────
  {
    id: 'schema_explorer',
    triggers: ['schema explorer', 'browse tables', 'unified browser', 'schema browser', 'view columns', 'table structure'],
    category: 'page',
    page: '/unified-browser',
    pageLabel: 'Schema Explorer',
    answer: `**Schema Explorer** (/unified-browser) lets you browse your entire database structure.

**Features:**
- Browse all schemas, tables, and columns
- Search tables/columns by name
- View column types, nullability, and constraints
- See table statistics (row count, shard count)
- Quick actions: open in Query Editor, view in Timeseries

**Navigation:**
1. Select a schema from the left panel
2. Click a table to expand its columns
3. Click a column to see detailed type information`,
  },

  // ── MONITORING ────────────────────────────────────────────────────────────
  {
    id: 'monitoring',
    triggers: ['monitoring', 'cluster health', 'node health', 'performance', 'metrics', 'shard', 'cluster status'],
    category: 'page',
    page: '/monitoring',
    pageLabel: 'Monitoring',
    answer: `**Monitoring** (/monitoring) provides real-time cluster visibility.

**Metrics shown:**
- **Cluster health** — Overall status (green/yellow/red)
- **Node list** — Each node's CPU, memory, disk usage
- **Shard distribution** — How shards are distributed across nodes
- **Query performance** — Slow query detection
- **JVM heap** — Memory usage per node
- **Uptime** — Per-node uptime tracking

The dashboard auto-refreshes every 30 seconds.`,
  },

  // ── BLOB STORAGE ─────────────────────────────────────────────────────────
  {
    id: 'blob_storage',
    triggers: ['blob', 'blob storage', 'binary', 'file storage', 'upload file', 'store file', 'blob table'],
    category: 'page',
    page: '/blob-storage',
    pageLabel: 'Blob Storage',
    answer: `**Blob Storage** (/blob-storage) manages binary files stored in MonkDB BLOB tables.

**Features:**
- Upload files (any binary format)
- Download stored blobs
- View blob metadata (SHA1 hash, size, type)
- Storage analytics — file type distribution, size trends
- Audit log — track blob access/changes
- Role-based access (admin/reader/writer roles)

**How to store files:**
1. Navigate to Blob Storage
2. Select or create a BLOB table
3. Click Upload to add files
4. Use the SHA1 digest to retrieve files via SQL`,
  },

  // ── FTS / HYBRID SEARCH ───────────────────────────────────────────────────
  {
    id: 'fts',
    triggers: ['full text search', 'fts', 'text search', 'fulltext', 'fts schedule', 'search index'],
    category: 'page',
    page: '/fts-schedules',
    pageLabel: 'FTS Schedules',
    answer: `**FTS Schedules** (/fts-schedules) manages full-text search index refresh jobs.

**MonkDB FTS SQL:**
\`\`\`sql
-- Full-text search
SELECT * FROM doc.articles
WHERE MATCH(body, 'machine learning') USING best_fields;

-- With boosting
SELECT * FROM doc.articles
WHERE MATCH((title^3, body), 'AI database');
\`\`\`

FTS schedules let you control when the inverted index is refreshed for large tables, balancing write performance vs. search freshness.`,
  },
  {
    id: 'hybrid_search',
    triggers: ['hybrid search', 'bm25', 'combined search', 'fts vector', 'text and vector'],
    category: 'page',
    page: '/hybrid-search',
    pageLabel: 'Hybrid Search',
    answer: `**Hybrid Search** (/hybrid-search) combines full-text (BM25) + vector (KNN) search.

This is the most powerful search pattern — it finds results that are both **semantically similar** (via vectors) and **keyword relevant** (via FTS), then merges scores.

**Use cases:**
- Document search engines
- Product catalogs
- Knowledge bases
- Customer support ticket search`,
  },

  // ── CONNECTIONS ───────────────────────────────────────────────────────────
  {
    id: 'connections',
    triggers: ['connection', 'connect', 'add connection', 'database connection', 'host port', 'disconnect', 'new connection'],
    category: 'page',
    page: '/connections',
    pageLabel: 'Connections',
    answer: `**Connections** (/connections) manages your MonkDB database connections.

**To add a connection:**
1. Go to Connections page
2. Click **"Add Connection"**
3. Enter: Name, Host, Port (default: 4200), Protocol (http/https)
4. Optional: Username and Password for authentication
5. Click **Test Connection** to verify
6. Click **Connect** to activate

**Multiple connections** are supported — switch between databases from the top navigation bar.

**Default MonkDB port:** 4200 (HTTP API) or 5432 (PostgreSQL wire protocol)`,
  },

  // ── SETTINGS ──────────────────────────────────────────────────────────────
  {
    id: 'settings',
    triggers: ['settings', 'preferences', 'theme', 'dark mode', 'light mode', 'app settings'],
    category: 'page',
    page: '/settings',
    pageLabel: 'Settings',
    answer: `**Settings** (/settings) controls app-wide preferences.

**Available settings:**
- **Theme** — Light / Dark / System auto
- **Default connection** — Which DB to connect on startup
- **Query timeout** — Max execution time for queries
- **Row limit** — Default LIMIT for query results
- **Notifications** — Enable/disable toast alerts
- **Keyboard shortcuts** — View and customize shortcuts (press \`?\` anywhere)`,
  },

  // ── MONKDB SQL CONCEPTS ───────────────────────────────────────────────────
  {
    id: 'monkdb_types',
    triggers: ['data types', 'column types', 'type', 'what types', 'available types', 'supported types'],
    category: 'concept',
    answer: `**MonkDB Column Types:**

| Category | Types |
|----------|-------|
| Text | TEXT, VARCHAR |
| Numbers | INTEGER, BIGINT, SMALLINT, DOUBLE PRECISION, FLOAT, DECIMAL |
| Boolean | BOOLEAN |
| Date/Time | TIMESTAMP WITH TIME ZONE, TIMESTAMP |
| Geospatial | GEO_POINT, GEO_SHAPE |
| Vector | FLOAT_VECTOR(n) — n dimensions |
| JSON | OBJECT, OBJECT(DYNAMIC), OBJECT(STRICT) |
| Arrays | ARRAY(type) |
| Binary | BYTE |

**Special types unique to MonkDB:**
- \`GEO_POINT\` — Stores lat/lng, queryable with distance(), within()
- \`FLOAT_VECTOR(n)\` — Enables KNN similarity search
- \`OBJECT\` — Schema-flexible JSON storage`,
  },
  {
    id: 'time_series_sql',
    triggers: ['time series sql', 'time bucket', 'aggregate over time', 'hourly', 'daily', 'date trunc', 'interval'],
    category: 'sql',
    answer: `**MonkDB Time-Series SQL:**

\`\`\`sql
-- Hourly averages
SELECT time_bucket('1 hour', ts) AS hour,
       AVG(value) AS avg_val,
       MAX(value) AS max_val
FROM doc.metrics
WHERE ts > NOW() - INTERVAL '24 hours'
GROUP BY 1 ORDER BY 1;

-- Daily counts
SELECT DATE_TRUNC('day', ts) AS day, COUNT(*) AS events
FROM doc.events
WHERE ts > NOW() - INTERVAL '7 days'
GROUP BY 1 ORDER BY 1;

-- Multiple intervals: 1 minute, 5 minutes, 1 hour, 1 day
-- time_bucket() accepts: '1 second', '5 minutes', '1 hour', '1 day', '1 week', '1 month'
\`\`\``,
  },
  {
    id: 'information_schema',
    triggers: ['information schema', 'system tables', 'sys tables', 'list columns sql', 'metadata sql'],
    category: 'sql',
    answer: `**MonkDB System / Information Schema SQL:**

\`\`\`sql
-- List all user tables
SELECT table_schema, table_name, number_of_shards
FROM information_schema.tables
WHERE table_schema NOT IN ('information_schema', 'sys', 'pg_catalog')
ORDER BY table_schema, table_name;

-- Describe a table's columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'doc' AND table_name = 'my_table'
ORDER BY ordinal_position;

-- List all schemas
SELECT schema_name FROM information_schema.schemata;

-- Table row counts
SELECT table_schema, table_name, number_of_shards, number_of_replicas
FROM information_schema.tables
WHERE table_schema = 'doc';
\`\`\``,
  },
  {
    id: 'sharding_concept',
    triggers: ['sharding', 'shard', 'cluster by', 'distributed', 'how sharding works'],
    category: 'concept',
    answer: `**MonkDB Sharding:**

MonkDB distributes table data across **shards** for parallel processing and scalability.

**Key concepts:**
- **Shards** — Horizontal data partitions distributed across nodes
- **CLUSTERED BY** — The column used to route rows to shards (default: \`_id\`)
- **Number of shards** — Set at table creation (default: 4); more shards = more parallelism
- **Replication** — Each shard can have replica copies for high availability

\`\`\`sql
CREATE TABLE doc.events (
  id TEXT PRIMARY KEY,
  ts TIMESTAMP,
  value DOUBLE
) CLUSTERED BY (id) INTO 6 SHARDS WITH (number_of_replicas = 1);
\`\`\``,
  },
  {
    id: 'keyboard_shortcuts',
    triggers: ['keyboard shortcut', 'shortcut', 'hotkey', 'key binding', 'ctrl', 'cmd'],
    category: 'feature',
    answer: `**MonkDB Workbench Keyboard Shortcuts:**

| Shortcut | Action |
|----------|--------|
| \`Ctrl/Cmd + K\` | Open Command Palette |
| \`Ctrl/Cmd + /\` | Toggle AI Assistant |
| \`?\` | Show all keyboard shortcuts |
| \`Escape\` | Close dialogs / panels |

**Query Editor:**
| Shortcut | Action |
|----------|--------|
| \`Ctrl/Cmd + Enter\` | Run query |
| \`Ctrl/Cmd + S\` | Save query |
| \`Ctrl/Cmd + T\` | New tab |
| \`Ctrl/Cmd + W\` | Close tab |

**Timeseries Builder:**
| Shortcut | Action |
|----------|--------|
| \`Ctrl/Cmd + Z\` | Undo |
| \`Ctrl/Cmd + Y\` | Redo |
| \`Delete\` | Delete selected widget |
| \`Escape\` | Deselect widget |`,
  },
];

// ── Search Engine ─────────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

function tokenize(s: string): string[] {
  return normalize(s).split(' ').filter(t => t.length > 1);
}

// Simple Levenshtein distance for fuzzy matching
function levenshtein(a: string, b: string): number {
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

function fuzzyScore(queryToken: string, target: string): number {
  if (target.includes(queryToken)) return 1.0;
  const words = target.split(' ');
  for (const word of words) {
    if (word === queryToken) return 1.0;
    if (word.startsWith(queryToken)) return 0.8;
    const dist = levenshtein(queryToken, word);
    if (dist <= 1 && word.length > 3) return 0.7;
    if (dist <= 2 && word.length > 5) return 0.5;
  }
  return 0;
}

export function searchKnowledge(query: string, topK = 3): KnowledgeSearchResult[] {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  const scored: KnowledgeSearchResult[] = ENTRIES.map(entry => {
    const triggerText = normalize(entry.triggers.join(' '));
    let score = 0;

    for (const qt of queryTokens) {
      const s = fuzzyScore(qt, triggerText);
      score += s;
    }

    // Normalize by query token count
    score = score / queryTokens.length;

    return { entry, score };
  });

  return scored
    .filter(r => r.score > 0.25)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

export function getEntryById(id: string): KnowledgeEntry | undefined {
  return ENTRIES.find(e => e.id === id);
}

export function getEntriesByPage(page: string): KnowledgeEntry[] {
  return ENTRIES.filter(e => e.page === page);
}

export { ENTRIES as ALL_KNOWLEDGE_ENTRIES };
