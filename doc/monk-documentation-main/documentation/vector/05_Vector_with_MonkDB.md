# Working with Vector Workloads Using MonkDB

## Simulation

In this demo, we are working with synthetic documents that would be embedded using a model and finally upserting the data into MonkDB.

We are executing `knn_match` to perform **KNN** and `vector_similarity` to perform **Similarity Search** on the upserted documents.

The steps followed in the scripted simulation are:

- Define database connection variables. 
- Connect to MonkDB. This creates a connection to the MonkDB instance. It opens a cursor for executing SQL queries.
- Load `sentence-transformer` model from huggingface. You may use an alternative to sentence transformer to embed text data such as `Cohere`, `OpenAI`, etc. The model which we have used in sentence transformers leverage 384 dimensions. The quality/accuracy of those dimensions would be low when compared with models that support 2048 dimensions. Hence, as mentioned before, use embedding and infer model based on your needs.
- Create a table in MonkDB if not already created. This will store the generated vector floats (embeddings) for downstream querying.
- The table that we have created has `id`, `context` and `embedding` columns. You may create tables according to your need.
- We are following the `upsert` approach. Vectors are inserted, and if it is an old document which is being inserted again, we are updating the entry. Otherwise, we would be bricked with `DuplicateKey` exception from MonkDB on data conflicts. It ensures duplicates are not inserted into the database.
- We have added five sample documents. 
- We are performing `knn_match` to find the top k nearest documents based on the vector embedding similarity. Here, we have utilized MonkDB's `knn_match` function.
- Next, we are finding similar documents using MonkDB's `vector_similarity()` function, which computes Euclidean distance. **Please note that we don't support cosine similarity and dot product as on today. They are in our roadmap.**
- In the next step, we are extending `VectorStore` class from LangChain.
- We then insert documents using LangChain and ensure duplicates are not inserted by passing `ON CONFLICT DO UPDATE` argument to the SQL statement.
- Search using LangChain
- Initialize LangChain vector store. This creates a MonkDB vector store and inserts sample documents.
- Retrieves similar documents using LangChain's retrieval mechanism.

A user will receive a below output upon executing the [vector script](vector_ops.py).

```zsh  
✅ Table 'monkdb.documents' is ready.
Upserted document: doc_1
Upserted document: doc_2
Upserted document: doc_3
Upserted document: doc_4
Upserted document: doc_5
✅ Documents inserted into monkdb.documents.

🔍 KNN Search Results:
ID: doc_2, Content: Vector search in databases is important for AI applications., Score: 0.7389452
ID: doc_4, Content: Machine learning models can benefit from vector databases., Score: 0.59701025
ID: doc_1, Content: MonkDB is great for time-series and vector workloads., Score: 0.45875195
ID: doc_3, Content: MonkDB provides scalable distributed storage., Score: 0.39378193

🔍 Similarity Search Results:
ID: doc_2, Content: Vector search in databases is important for AI applications., Similarity: 0.7389452
ID: doc_4, Content: Machine learning models can benefit from vector databases., Similarity: 0.59701025
ID: doc_1, Content: MonkDB is great for time-series and vector workloads., Similarity: 0.45875195

🔍 LangChain Similarity Search Results:
MonkDB supports fast vector search.
Vector search in databases is important for AI applications.
MonkDB is great for time-series and vector workloads.

✅ MonkDB vector search with Sentence Transformers & LangChain completed successfully under schema 'monkdb'!
```

---

## SQL Statements utilized here

### knn_match

```psql
SELECT id, content, _score
FROM {DB_SCHEMA}.documents
WHERE knn_match(embedding, ?, {k})  
ORDER BY _score DESC
```

#### Explanation:
- **This performs a k-nearest neighbor (KNN) search** on the `embedding` column, which is a `FLOAT_VECTOR(dimension)`, meaning it contains **dense vector embeddings**.
- **The function `knn_match(embedding, ?, {k})`**:
    - `embedding` → The vector column we are searching against.
    - `?` → The query vector (a `FLOAT_VECTOR(dimension)` generated from the input text).
    - `{k}` → The number of **nearest neighbors** to return.
- **The `WHERE` clause `WHERE knn_match(embedding, ?, {k})`**:
    - Filters results to **only include the `k` most similar** vectors to the query.
    - Computes similarity scores using **Euclidean distance**.
    - Returns results with a `_score` column, which represents **similarity** (**higher score = closer match**).
- **`ORDER BY _score DESC`** ensures that the **most similar results appear first**.

#### Execution Process:
- **Computing Vector Distances**:
    - The query vector is compared to all vectors stored in the `embedding` column.
    - Distance is measured using **Euclidean distance (`L2 norm`)** by default.
- **Retrieving `k` Nearest Neighbors**:
    - The query vector is matched with the `k` closest vectors.
- **Sorting by `_score`**:
    - `_score` is an internal similarity metric computed based on distance.
    - The closest vectors (**smallest Euclidean distance**) get the **highest `_score`**.
- **Returning the `id`, `content`, and `_score`**:
    - Results are ordered by similarity, with **most relevant documents appearing first**.

### vector_similarity

```psql
SELECT id, content, vector_similarity(embedding, ?) AS similarity 
FROM {DB_SCHEMA}.documents 
ORDER BY similarity DESC
LIMIT {k}
```
#### Explanation:
- **This computes the similarity** between the stored embeddings and a query embedding.
- **The `vector_similarity(embedding, ?)` function**:
    - `embedding` → The stored `FLOAT_VECTOR(dimensions)` column.
    - `?` → The query vector (input text converted into a `FLOAT_VECTOR(dimensions)`).
- **Returns a similarity score** (range `0 to 1`):
    - `1` → Perfect match (identical vectors).
    - **Closer to `0`** → Distant vectors (low similarity).
- **`ORDER BY similarity DESC`** ensures the most similar results come first.
- **`LIMIT {k}`** restricts the output to the **`top k` most relevant matches**.

#### Execution Process:
- **Query embedding generation** (done before executing the SQL query).
- **Computing similarity** (`vector_similarity()`):
    - Uses **normalized Euclidean**.
    - Unlike `knn_match()`, this explicitly returns similarity values.
- **Sorting Results**:
    - Sorts in *descending* order (**highest similarity first**).
- **Limiting Output**:
    - Returns only the **`top k`** results (e.g., **3 most similar documents**).

### Upsert Using `ON CONFLICT DO UPDATE`

```psql
INSERT INTO {DB_SCHEMA}.documents (id, content, embedding) 
VALUES (?, ?, ?)
ON CONFLICT (id) DO UPDATE SET 
    content = excluded.content, 
    embedding = excluded.embedding
```

#### Explanation:
- This inserts a new document or updates an existing one if a conflict occurs due to a duplicate `id`.
- The `id` column is a `PRIMARY KEY`, so inserting the same `id` twice would normally cause a `DuplicateKeyException`.
- Using `ON CONFLICT (id) DO UPDATE SET` allows us to:
    - **Insert** a new record if `id` does not exist.
    - **Update** the existing record if `id` already exists.

#### Execution Process:
- **Attempt to Insert a New Document** `(VALUES (?, ?, ?))`
    - `?` placeholders represent parameters passed dynamically.
    - If the `id` does not exist, a new row is inserted.
- **Handling Conflict** `(ON CONFLICT (id) DO UPDATE SET)`
    - If the `id` already exists, an update operation is performed.
    - The existing `content` and `embedding` are replaced with new values from `excluded.content` and `excluded.embedding`.
    - `excluded` refers to the new row that was attempted to be inserted.
- **Final Storage:**
    - If a **new document** was inserted, it is stored normally.
    - If an **existing document** was updated, it replaces old data.

#### Benefits of `ON CONFLICT DO UPDATE`

✔ Prevents duplicate key errors (`DuplicateKeyException`)  
✔ Efficiently updates old data while allowing new inserts.  
✔ Ensures documents stay up to date in vector storage.

---

**PS**: As mentioned before, an enterprise grade embedding model like `Cohere` would generate high quality embeddings that would aid in perfect outputs. This is even true for AI ML models. Enterprise grade models on production grade infra would yield high-quality results.
For the sake of demo, we have utilized sentence transformers.