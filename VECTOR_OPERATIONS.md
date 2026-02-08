# MonkDB Vector Operations - Official Workflow

This guide explains how to use vector search in MonkDB Workbench following the **official MonkDB documentation**.

## Overview

MonkDB supports vector search using the `FLOAT_VECTOR` data type and specialized functions:
- `knn_match(column, vector, k)` - Find K nearest neighbors using Euclidean distance
- `vector_similarity(column, vector)` - Calculate similarity scores for all rows

## Official Workflow (Recommended)

The official MonkDB documentation shows using **Python with sentence-transformers** to generate embeddings externally, then search using MonkDB's SQL functions.

### Step 1: Install Dependencies

```bash
pip install sentence-transformers numpy
```

### Step 2: Generate and Use Python Script

1. Navigate to **Vector Operations** page in MonkDB Workbench
2. Select your vector collection (e.g., `shop.my_shop`)
3. Click **"Python Script"** tab (default)
4. Click **"Download"** button to get a custom script for your table
5. Edit the script to add your database credentials:
   ```python
   DB_PASSWORD = "your-password"  # Update this line
   ```
6. Run the script:
   ```bash
   python vector_search_my_shop.py
   ```
7. Enter your search query when prompted
8. The script will:
   - Generate embeddings using sentence-transformers
   - Execute search using `knn_match()` or `vector_similarity()`
   - Display results with similarity scores

### Step 3: View Results

Results are displayed directly in the terminal with:
- Similarity scores
- Document IDs
- Content preview
- Execution time

## Alternative Methods

### Manual Search (Web UI)

If you've already generated embeddings externally, you can paste them directly:

1. Go to **Vector Operations** page
2. Select your collection
3. Click **"Manual Search"** tab
4. Paste your pre-computed embedding array (e.g., `[0.123, -0.456, ...]`)
5. Configure search options (KNN Match or Vector Similarity, Top K)
6. Click **"Search"**
7. View results in the web interface

### External APIs (Enterprise Grade)

MonkDB documentation recommends enterprise APIs for production:

**OpenAI Embeddings** (1536 dimensions):
```python
import openai

client = openai.OpenAI(api_key="your-api-key")
response = client.embeddings.create(
    model="text-embedding-3-small",
    input="your search query"
)
embedding = response.data[0].embedding
```

**Cohere Embeddings** (1024 dimensions):
```python
import cohere

co = cohere.Client('your-api-key')
response = co.embed(
    texts=["your search query"],
    model='embed-english-v3.0',
    input_type='search_query'
)
embedding = response.embeddings[0]
```

Click **"API Examples"** tab in the web interface for more code samples.

## SQL Functions Reference

### KNN Match
Finds K nearest neighbors using Euclidean distance:

```sql
SELECT *, _score
FROM "schema"."table"
WHERE knn_match(embedding, [0.1, 0.2, ...], 5)
ORDER BY _score DESC
```

**Returns**: Top 5 most similar documents with `_score` between 0 and 1 (higher = more similar)

### Vector Similarity
Calculates similarity for all rows:

```sql
SELECT *, vector_similarity(embedding, [0.1, 0.2, ...]) AS similarity
FROM "schema"."table"
ORDER BY similarity DESC
LIMIT 5
```

**Returns**: All documents ranked by similarity (0 to 1 scale)

## Inserting Documents with Embeddings

Use the `ON CONFLICT DO UPDATE` pattern from official docs:

```sql
INSERT INTO "schema"."table" (id, content, embedding)
VALUES ('doc_1', 'MonkDB is great', [0.1, 0.2, ...])
ON CONFLICT (id) DO UPDATE SET
    content = excluded.content,
    embedding = excluded.embedding
```

This ensures duplicates are updated instead of causing errors.

## Embedding Dimensions

Common embedding models:

| Model | Dimensions | Source | Best For |
|-------|-----------|--------|----------|
| all-MiniLM-L6-v2 | 384 | sentence-transformers | Fast, free, local |
| all-mpnet-base-v2 | 768 | sentence-transformers | Balanced quality/speed |
| text-embedding-3-small | 1536 | OpenAI API | High quality, $0.02/1M tokens |
| embed-english-v3.0 | 1024 | Cohere API | Enterprise grade |

**Important**: All documents in a collection must use the same model and dimensions.

## Performance Tips

1. **Use appropriate dimensions**: More dimensions = higher accuracy but slower search
2. **Index your vector columns**: MonkDB automatically optimizes FLOAT_VECTOR columns
3. **Batch inserts**: Use `ON CONFLICT` to efficiently update existing documents
4. **Limit results**: Use `LIMIT` or `k` parameter to avoid large result sets
5. **Cache embeddings**: Don't regenerate embeddings for the same text

## Troubleshooting

### "Dimension mismatch" error
- Ensure all embeddings in a collection have the same dimension
- Check that your query embedding matches the table's vector dimension
- Run: `SELECT array_length(embedding, 1) FROM table LIMIT 1` to check actual dimension

### "No results found"
- Verify table contains documents: `SELECT COUNT(*) FROM table`
- Check that embedding column is not NULL: `SELECT COUNT(*) FROM table WHERE embedding IS NOT NULL`
- Try different search types (KNN vs Similarity)
- Increase `k` parameter to get more results

### Python script fails to connect
- Verify MonkDB is running: `curl http://localhost:4200`
- Check credentials (DB_USER, DB_PASSWORD)
- Ensure port 4200 is accessible
- Check firewall settings

## Resources

- [MonkDB Vector Documentation](monk-documentation-main/documentation/vector/)
- [sentence-transformers Documentation](https://www.sbert.net/)
- [OpenAI Embeddings API](https://platform.openai.com/docs/guides/embeddings)
- [Cohere Embeddings API](https://docs.cohere.com/docs/embeddings)

## Example: Complete Workflow

```python
# 1. Install dependencies
# pip install sentence-transformers numpy

# 2. Load model
from sentence_transformers import SentenceTransformer
model = SentenceTransformer('all-MiniLM-L6-v2')

# 3. Generate embedding
query = "Find books about databases"
embedding = model.encode(query).tolist()

# 4. Execute search (using Python script or SQL client)
# KNN Match:
SELECT *, _score
FROM "shop"."my_shop"
WHERE knn_match(embedding, [0.123, -0.456, ...], 5)
ORDER BY _score DESC

# Output:
# _score | id | content | embedding
# 0.85   | 1  | Database books collection | [...]
# 0.72   | 3  | SQL and NoSQL guide | [...]
```

## Migration from Quick Search (Deprecated)

The "Quick Search" feature (browser-based embeddings) has been removed as it:
- Was not in the official MonkDB documentation
- Had compatibility issues with Next.js 16/Turbopack
- Is not recommended for production use

**Use the Python script or Manual Search instead** - these follow the official MonkDB workflow and are production-ready.
