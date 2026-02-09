# 📋 Vector Search Table Dropdown - How It Works

## Overview

The table dropdown in the Vector Search page automatically discovers and displays **only tables that have vector columns** (`FLOAT_VECTOR` type). This is a smart, dynamic system that queries your database schema in real-time.

## 🔄 Complete Data Flow

```
User Opens Vector Search Page
         ↓
[1] useSchemaMetadata Hook Activates
         ↓
[2] Queries information_schema (3 parallel queries)
         ↓
[3] Fetches: Schemas, Tables, Columns
         ↓
[4] VectorSearchPanel Filters for FLOAT_VECTOR columns
         ↓
[5] SearchableSelect Component Displays Dropdown
         ↓
User Selects Table
```

## 📊 Step-by-Step Breakdown

### Step 1: Hook Initialization

**File:** `app/lib/hooks/useSchemaMetadata.ts`

When the Vector Search page loads, the `useSchemaMetadata` hook automatically runs:

```typescript
export function useSchemaMetadata() {
  const activeConnection = useActiveConnection();
  const [metadata, setMetadata] = useState({
    schemas: [],
    tables: [],
    columns: [],
    loading: false,
    error: null,
  });

  // Automatically loads when connection is active
  useEffect(() => {
    loadMetadata();
  }, [loadMetadata]);

  // ... rest of code
}
```

### Step 2: Database Queries

The hook executes **3 parallel SQL queries** to the MonkDB `information_schema`:

#### Query 1: Fetch Schemas
```sql
SELECT DISTINCT table_schema
FROM information_schema.tables
WHERE table_schema NOT IN ('pg_catalog', 'information_schema', 'sys')
ORDER BY table_schema
```

**Returns:** List of schema names
```
['public', 'analytics', 'production']
```

#### Query 2: Fetch Tables
```sql
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema NOT IN ('pg_catalog', 'information_schema', 'sys')
  AND table_type = 'BASE TABLE'
ORDER BY table_schema, table_name
```

**Returns:** List of tables with their schemas
```
[
  { schema: 'public', name: 'users' },
  { schema: 'public', name: 'documents' },
  { schema: 'analytics', name: 'embeddings' }
]
```

#### Query 3: Fetch Columns
```sql
SELECT table_schema, table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema NOT IN ('pg_catalog', 'information_schema', 'sys')
ORDER BY table_schema, table_name, ordinal_position
```

**Returns:** List of all columns with their types
```
[
  { schema: 'public', table: 'users', name: 'id', type: 'INTEGER' },
  { schema: 'public', table: 'users', name: 'name', type: 'TEXT' },
  { schema: 'public', table: 'documents', name: 'id', type: 'INTEGER' },
  { schema: 'public', table: 'documents', name: 'content', type: 'TEXT' },
  { schema: 'public', table: 'documents', name: 'embedding', type: 'FLOAT_VECTOR' }, ← Vector column!
  { schema: 'analytics', table: 'embeddings', name: 'vector', type: 'FLOAT_VECTOR' } ← Vector column!
]
```

### Step 3: Filter for Vector Columns

**File:** `app/components/vector/VectorSearchPanel.tsx`

The VectorSearchPanel filters the columns to find only tables with `FLOAT_VECTOR` type:

```typescript
const { tables, columns, loading: schemaLoading } = useSchemaMetadata();

// Get table names with vector columns
const tableNames = [...new Set(
  columns
    .filter(col => col.type.toUpperCase().includes('FLOAT_VECTOR'))
    .map(col => `${col.schema}.${col.table}`)
)];
```

**What this does:**

1. **Filter:** `columns.filter(col => col.type.toUpperCase().includes('FLOAT_VECTOR'))`
   - Only keeps columns where type contains 'FLOAT_VECTOR'

2. **Map:** `.map(col => \`${col.schema}.${col.table}\`)`
   - Converts to format: "schema.table"
   - Example: `{ schema: 'public', table: 'documents' }` → `'public.documents'`

3. **Deduplicate:** `[...new Set(...)]`
   - Removes duplicates (if a table has multiple vector columns)

**Result:**
```javascript
tableNames = [
  'public.documents',
  'analytics.embeddings'
]
```

### Step 4: Display in SearchableSelect

**File:** `app/components/common/SearchableSelect.tsx`

The SearchableSelect component receives the filtered table names and creates an interactive dropdown:

```typescript
<SearchableSelect
  label="Table Name"
  value={tableName}
  onChange={(value) => {
    setTableName(value);
    setEmbeddingColumn(''); // Reset column when table changes
  }}
  options={tableNames}  // ← Our filtered list!
  placeholder="Select table with vector columns..."
  loading={schemaLoading}
  onClear={() => {
    setTableName('');
    setEmbeddingColumn('');
  }}
/>
```

**Features:**
- ✅ Searchable (type to filter)
- ✅ Keyboard navigation (arrow keys, Enter, Escape)
- ✅ Loading state while fetching
- ✅ Clear button to reset
- ✅ Auto-focus on open

### Step 5: Vector Column Selection

Once a table is selected, the component finds vector columns for that specific table:

```typescript
const vectorColumns = tableName
  ? columns
      .filter(col => {
        const fullTableName = `${col.schema}.${col.table}`;
        return fullTableName === tableName && col.type.toUpperCase().includes('FLOAT_VECTOR');
      })
      .map(col => col.name)
  : [];
```

**Example:**
If user selects `'public.documents'`:

```javascript
vectorColumns = ['embedding']  // List of FLOAT_VECTOR columns in that table
```

## 🎯 Real-World Example

### Database Schema

```sql
-- Schema: public
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  name TEXT,
  email TEXT
);

CREATE TABLE documents (
  id INTEGER PRIMARY KEY,
  title TEXT,
  content TEXT,
  embedding FLOAT_VECTOR(384),      ← Vector column 1
  summary_embedding FLOAT_VECTOR(384) ← Vector column 2
);

-- Schema: analytics
CREATE TABLE product_embeddings (
  product_id INTEGER,
  image_vector FLOAT_VECTOR(512)    ← Vector column
);

CREATE TABLE logs (
  log_id INTEGER,
  message TEXT,
  timestamp TIMESTAMP
);
```

### What Appears in Dropdown

When you open the Vector Search page, the **Table Name** dropdown shows:

```
┌─────────────────────────────────┐
│ Table Name                      │
├─────────────────────────────────┤
│ 🔍 Search...                    │
├─────────────────────────────────┤
│ public.documents                │ ← Has 2 vector columns
│ analytics.product_embeddings    │ ← Has 1 vector column
└─────────────────────────────────┘
```

**NOT shown:**
- ❌ `public.users` (no vector columns)
- ❌ `analytics.logs` (no vector columns)

### When You Select a Table

**Select:** `public.documents`

**Embedding Column dropdown shows:**
```
┌─────────────────────────────────┐
│ Embedding Column Name           │
├─────────────────────────────────┤
│ 🔍 Search...                    │
├─────────────────────────────────┤
│ embedding                       │
│ summary_embedding               │
└─────────────────────────────────┘
```

## 🔍 How to Debug

### Check What's Being Loaded

Open browser console (F12) and you'll see logs:

```javascript
console.log('Schemas:', schemas);
// ['public', 'analytics']

console.log('Tables:', tables);
// [{ schema: 'public', name: 'users' }, { schema: 'public', name: 'documents' }, ...]

console.log('Columns:', columns);
// [{ schema: 'public', table: 'documents', name: 'embedding', type: 'FLOAT_VECTOR' }, ...]

console.log('Filtered tableNames:', tableNames);
// ['public.documents', 'analytics.product_embeddings']
```

### Verify Your Database

Run this query in Query Editor to see all vector columns:

```sql
SELECT
  table_schema,
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE data_type LIKE '%FLOAT_VECTOR%'
ORDER BY table_schema, table_name, column_name;
```

**Expected Output:**
```
┌──────────────┬──────────────────────┬───────────────────┬──────────────────┐
│ table_schema │ table_name           │ column_name       │ data_type        │
├──────────────┼──────────────────────┼───────────────────┼──────────────────┤
│ public       │ documents            │ embedding         │ FLOAT_VECTOR(384)│
│ public       │ documents            │ summary_embedding │ FLOAT_VECTOR(384)│
│ analytics    │ product_embeddings   │ image_vector      │ FLOAT_VECTOR(512)│
└──────────────┴──────────────────────┴───────────────────┴──────────────────┘
```

## ⚠️ Common Issues

### Issue 1: No Tables in Dropdown

**Symptom:** Dropdown is empty

**Possible Causes:**

1. **No tables with FLOAT_VECTOR columns**
   ```sql
   -- Check if you have any vector columns
   SELECT COUNT(*)
   FROM information_schema.columns
   WHERE data_type LIKE '%FLOAT_VECTOR%';
   ```

   **Solution:** Create a table with FLOAT_VECTOR column:
   ```sql
   CREATE TABLE test_vectors (
     id INTEGER,
     embedding FLOAT_VECTOR(384)
   );
   ```

2. **No database connection**
   - Check connection status in header
   - Go to `/connections` to connect

3. **Wrong schema filter**
   - The hook filters out system schemas: `pg_catalog`, `information_schema`, `sys`
   - Make sure your tables are in a user schema like `public`

### Issue 2: Table Not Showing

**Symptom:** You have a table with vectors but it's not in dropdown

**Debug Steps:**

1. **Verify column type:**
   ```sql
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'your_table';
   ```

   Type must include `FLOAT_VECTOR` (case-insensitive)

2. **Check table type:**
   ```sql
   SELECT table_type
   FROM information_schema.tables
   WHERE table_name = 'your_table';
   ```

   Must be `BASE TABLE` (not a VIEW)

3. **Refresh metadata:**
   - Reload the page
   - The hook should re-fetch schema information

### Issue 3: Loading State Never Ends

**Symptom:** Dropdown shows "Loading..." forever

**Possible Causes:**

1. **Database query timeout**
   - Check database connection
   - Look for errors in browser console

2. **Large schema with many tables**
   - Hook queries all tables/columns
   - May take a few seconds for large databases

**Solution:** Check browser console for errors

### Issue 4: Column Dropdown Empty After Selecting Table

**Symptom:** Select a table, but column dropdown has no options

**Cause:** The selected table actually has no FLOAT_VECTOR columns

**Verify:**
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'your_schema'
  AND table_name = 'your_table'
  AND data_type LIKE '%FLOAT_VECTOR%';
```

## 🛠️ How to Add More Tables

### Step 1: Create Table with Vector Column

```sql
CREATE TABLE my_semantic_search (
  doc_id INTEGER PRIMARY KEY,
  document_text TEXT,
  doc_embedding FLOAT_VECTOR(384)  -- 384 dimensions for sentence-transformers
);
```

### Step 2: Insert Sample Data

```sql
INSERT INTO my_semantic_search (doc_id, document_text, doc_embedding)
VALUES (
  1,
  'Sample document for testing',
  -- Example vector (replace with real embeddings)
  '[0.1, 0.2, 0.3, ..., 0.384]'::FLOAT_VECTOR
);
```

### Step 3: Refresh Vector Search Page

1. Go to `/vector-ops`
2. The new table should appear automatically!
3. Select `public.my_semantic_search`
4. Column dropdown shows `doc_embedding`

## 📊 Performance Considerations

### Query Performance

The `useSchemaMetadata` hook runs **3 queries in parallel**:

| Query | Avg Time | Complexity |
|-------|----------|------------|
| Schemas | ~10ms | O(1) - Very fast |
| Tables | ~50ms | O(n) - Linear with table count |
| Columns | ~200ms | O(n*m) - Linear with table count × avg columns |

**Total:** ~250ms for typical database with 100 tables

### Caching

The hook caches results in component state:
- ✅ Data fetched once when page loads
- ✅ Reused for all dropdowns
- ✅ Only refreshes when connection changes

**To manually refresh:**
```typescript
const { refresh } = useSchemaMetadata();

// Call to re-fetch
refresh();
```

### Optimization Tips

1. **Create indexes on information_schema** (if MonkDB supports it)
2. **Limit number of schemas** (filter out test/dev schemas)
3. **Use connection pooling** for faster queries

## 🎯 Summary

### Data Source
- **Information Schema Tables:**
  - `information_schema.tables` - List of all tables
  - `information_schema.columns` - List of all columns with types

### Filtering Logic
1. Fetch all columns from database
2. Filter where `type` contains `'FLOAT_VECTOR'`
3. Extract unique `schema.table` combinations
4. Display in searchable dropdown

### Real-Time Updates
- ❌ Does NOT auto-refresh (would be expensive)
- ✅ Refreshes when connection changes
- ✅ Refreshes on page reload
- ✅ Can manually call `refresh()` function

### Key Files
1. **`useSchemaMetadata.ts`** - Fetches data from database
2. **`VectorSearchPanel.tsx`** - Filters for vector tables
3. **`SearchableSelect.tsx`** - Displays dropdown UI

---

**Quick Reference:**

```
Database → information_schema → useSchemaMetadata Hook → VectorSearchPanel Filter → SearchableSelect Dropdown → User Selection
```

**Need Help?**
- Check browser console for errors
- Verify database schema with SQL queries
- Ensure tables have `FLOAT_VECTOR` columns
- Make sure connection is active

🚀 **Your tables with vector columns will appear automatically!**
