# Full-Text Search (FTS) — Complete Guide

## What is Full-Text Search?

Imagine you have a **database full of text** — log messages, product descriptions, articles, support tickets.
You want to search through all of it the way Google lets you search the web.

That is Full-Text Search.

> **One line:** FTS finds documents by **meaning and relevance**, not just exact character matching.

---

## The Problem with Normal Search

Normal SQL search:

```sql
SELECT * FROM logs WHERE message = 'connection error'
```

This only finds rows where `message` is **exactly** `"connection error"`.
If the row says `"Database connection timed out"` — it is **not returned**.

With `LIKE`:

```sql
SELECT * FROM logs WHERE message LIKE '%connection error%'
```

Still fails if the words appear separately, in different order, or in different forms
(`"connected"`, `"errors"`, `"connecting"`).

---

## How Full-Text Search Solves This

```sql
SELECT *, _score
FROM logs
WHERE MATCH("idx_fts", 'connection error')
ORDER BY _score DESC
```

This finds rows that:

- Contain **either or both** words
- Use **different word forms** (`connect`, `connecting`, `connected`)
- Have the words in **any order**
- **Ranks results by relevance** — best matches come first

---

## Real Example

### Your table

| id | title | body |
|----|-------|------|
| 1 | MonkDB connection errors | Database connection timeout errors occur when server is under heavy load |
| 2 | SQL query optimization | Optimizing queries involves proper indexing and efficient WHERE clauses |
| 3 | Full-text search with BM25 | BM25 ranking provides relevance-based scoring for search queries |
| 4 | Error handling in distributed systems | Distributed systems must handle network failures and timeout errors gracefully |
| 5 | Database indexing strategies | Indexes speed up query execution by allowing the engine to find rows without full scan |

### Search: `error database`

| Result | Title | Score | Why |
|--------|-------|-------|-----|
| #1 | MonkDB connection errors | 1.06 | Has "error" in title + "database" in body |
| #2 | Error handling in distributed systems | 0.45 | Has "error" in title |
| #3 | Database indexing strategies | 0.18 | Has "database" in title |

Row #2 (SQL query optimization) is **not returned** — it has neither word.

---

## What is BM25 Scoring?

BM25 (Best Match 25) is the algorithm that decides **which result is most relevant**.

It scores each result based on:

| Factor | Meaning |
|--------|---------|
| **Term Frequency (TF)** | How many times does the search word appear in this document? More = higher score |
| **Inverse Document Frequency (IDF)** | How rare is this word across all documents? Rare words = more weight |
| **Document Length** | Shorter documents with the word score higher than very long ones |

This is the same algorithm used by **Elasticsearch**, **Solr**, and **Lucene** (which powers most search engines).

The `_score` column you see in results is the BM25 score. Higher = more relevant.

---

## Query Syntax

MonkDB FTS uses a **Lucene-style query language**. Here is what you can type:

### Single term
```
error
```
Finds documents containing the word "error"

### Multiple terms (OR by default)
```
error warning
```
Finds documents containing "error" OR "warning" (or both)

### Exact phrase
```
"connection timeout"
```
Finds documents where these two words appear **next to each other in this order**

### Must include (`+`)
```
+database error
```
"database" **must** be present. "error" is optional but boosts score.

### Must exclude (`-`)
```
error -warning
```
Finds documents with "error" but **without** "warning"

### Prefix wildcard (`*`)
```
connect*
```
Matches: `connect`, `connection`, `connected`, `connecting`

### Proximity search
```
"database error"~5
```
"database" and "error" must appear within **5 words** of each other

### Boolean AND
```
database AND indexing
```
Both words must be present

### Boolean OR
```
timeout OR refused
```
Either word must be present

---

## How FTS Works in MonkDB

### Step 1 — You create a table with a FULLTEXT index

```sql
CREATE TABLE doc.articles (
   id     INTEGER PRIMARY KEY,
   title  TEXT,
   body   TEXT,
   author TEXT,
   INDEX idx_articles_fts
      USING FULLTEXT (title, body)
      WITH (analyzer = 'english')
);
```

The `INDEX ... USING FULLTEXT` part tells MonkDB to build a full-text search index
on the `title` and `body` columns.

### Step 2 — You insert data

```sql
INSERT INTO doc.articles (id, title, body, author)
VALUES
  (1, 'MonkDB connection errors',
      'Database connection timeout errors occur when server is under heavy load', 'Alice'),
  (2, 'SQL query optimization',
      'Optimizing queries involves proper indexing and efficient WHERE clauses', 'Bob');
```

### Step 3 — You REFRESH (required before searching)

```sql
REFRESH TABLE doc.articles;
```

MonkDB is a distributed database. After inserting data, you must run `REFRESH TABLE`
before the new rows become visible to MATCH queries. This is normal behavior.

### Step 4 — You search

```sql
SELECT *, _score
FROM doc.articles
WHERE MATCH("idx_articles_fts", 'connection error')
ORDER BY _score DESC
LIMIT 10;
```

**Important:** In MonkDB 6+, you must use the **index name** in MATCH, not the column name.

| Correct | Broken |
|---------|--------|
| `MATCH("idx_articles_fts", ?)` | `MATCH(title, ?)` |
| `MATCH("idx_articles_fts", ?)` | `MATCH((title, body), ?)` |

---

## Analyzers

The analyzer controls how text is **broken into tokens** and stored in the index.

| Analyzer | What it does | Best for |
|----------|-------------|----------|
| `english` | Stems words, removes stop words (the, a, in, of) | English prose, articles, descriptions |
| `standard` | Tokenizes and lowercases, no stemming | Code, IDs, mixed-language, technical text |

**Stemming** means `"running"`, `"runs"`, `"ran"` are all stored as `"run"`.
So a search for `run` finds all three forms automatically.

**Stop words** are common words (the, a, is, in) that are removed because
they appear in almost every document and add no search value.

---

## What is the FTS Page in MonkDB Workbench?

The FTS page in this workbench is a visual interface for all of the above. It lets you:

| Feature | What it does |
|---------|-------------|
| **Index Browser (left panel)** | Shows all tables that have a FULLTEXT index |
| **Search box** | Type any query using the syntax above |
| **Result cards** | Shows matching rows ranked by BM25 score with a visual relevance bar |
| **Score display** | Shows `_score` for each result |
| **Highlight** | Matched words are highlighted yellow in the results |
| **SQL Preview** | Shows the exact SQL being executed |
| **Export** | Download results as CSV or JSON |
| **Refresh** | Runs `REFRESH TABLE` so new inserts become searchable |
| **New FTS Index** | Wizard to create a new table with a FULLTEXT index |

---

## Step-by-Step Test

### Prerequisites

MonkDB running on `localhost:4200` and the workbench on `localhost:3000`.

### 1 — Create the test table

Run this in the **Query Editor** (paste and press Run):

```sql
CREATE TABLE IF NOT EXISTS doc.fts_test_articles (
   id     INTEGER PRIMARY KEY,
   title  TEXT,
   body   TEXT,
   author TEXT,
   INDEX idx_articles_fts
      USING FULLTEXT (title, body)
      WITH (analyzer = 'english')
);
```

### 2 — Insert test data

```sql
INSERT INTO doc.fts_test_articles (id, title, body, author) VALUES
(1, 'MonkDB connection errors',
    'Database connection timeout errors occur when server is under heavy load or the network is unreliable.',
    'Alice'),
(2, 'SQL query optimization',
    'Optimizing SQL queries involves proper indexing, reducing joins, and writing efficient WHERE clauses.',
    'Bob'),
(3, 'Full-text search with BM25',
    'BM25 ranking algorithm provides relevance-based scoring for full-text search queries across multiple fields.',
    'Carol'),
(4, 'Error handling in distributed systems',
    'Distributed systems must handle network failures, timeout errors, and partial failures gracefully.',
    'Alice'),
(5, 'Database indexing strategies',
    'Indexes speed up query execution by allowing the database engine to find rows without scanning the full table.',
    'Bob');
```

### 3 — Refresh the table

```sql
REFRESH TABLE doc.fts_test_articles;
```

### 4 — Go to the FTS page

Open `http://localhost:3000` → Full-Text Search in the sidebar.

### 5 — Select `doc.fts_test_articles` from the left panel

### 6 — Try these searches one by one

```
error
```
Expected: rows 1 and 4 (both have "error")

```
database
```
Expected: rows 1, 2, 5 (all mention "database")

```
"connection timeout"
```
Expected: rows 1 and 4 (exact phrase near each other)

```
+error -distributed
```
Expected: only row 1 (has "error", does NOT have "distributed")

```
connect*
```
Expected: rows 1, 4 (matches "connection", "connections")

```
BM25
```
Expected: row 3 (exact technical term)

### 7 — Click SQL Preview

Toggle the **</>** button to see the exact SQL the workbench runs.
You will see: `WHERE MATCH("idx_articles_fts", ?) ORDER BY _score DESC LIMIT 50`

### 8 — Try exporting

After a search, click **CSV** or **JSON** to download the results.

### 9 — Cleanup (when done)

```sql
DROP TABLE doc.fts_test_articles;
```

---

## Common Mistakes

| Mistake | Why it fails | Fix |
|---------|-------------|-----|
| Searching immediately after INSERT | MonkDB needs REFRESH before rows are visible | Run `REFRESH TABLE` first |
| `MATCH(column_name, ?)` | MonkDB 6+ requires index name, not column name | Use `MATCH("index_name", ?)` |
| Table has no FULLTEXT index | Cannot use MATCH at all | Create table with `INDEX ... USING FULLTEXT` |
| Using `$1`, `$2` params | PostgreSQL style, not MonkDB | Use `?` as placeholder |

---

## Where is FTS Useful in Real Projects?

| Use Case | Example |
|----------|---------|
| Log search | Find all logs related to "auth failure" across millions of rows |
| E-commerce | User types "wireless bluetooth headphones" — find relevant products |
| Support tickets | Search all tickets for "payment declined" |
| Documentation | Search technical docs for concepts |
| News/blogs | Search articles by topic |
| User-generated content | Search comments, reviews, posts |

---

*Generated for MonkDB Workbench — Full-Text Search module*
