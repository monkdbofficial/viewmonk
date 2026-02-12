# Working with Full Text Search (FTS) Workloads Using MonkDB

MonkDB offers full-text search capabilities to efficiently query large volumes of textual data. Unlike traditional SQL queries using LIKE, which are slow for large datasets, MonkDB's full-text indexing enables fast, intelligent text searches using techniques like tokenization, stemming, stop-word removal, and relevance scoring.

To leverage full-text search, MonkDB requires full-text indices on text columns, which preprocess and optimize the text for search queries. These indices allow for natural language processing (NLP)-like searches, enabling more relevant results based on language analysis.

## Defining Full-Text Indices

A full-text index in MonkDB is an advanced index that breaks text into searchable components (tokens) using an analyzer.
Default Indexing Behavior (plain Index)

By default, MonkDB indexes text using the plain index, which treats the entire input as a single entity:

```psql
CREATE TABLE example (
    id INTEGER PRIMARY KEY,
    title TEXT,
    content TEXT -- Plain index (default)
);
```

In this case, searching for "machine" will not match "Machine learning" because MonkDB treats the text as a single string without breaking it into words.

### Creating a Full-Text Index

To perform efficient full-text searches, you must define a full-text index explicitly. This enables text tokenization, stemming, and stop-word filtering, making searches more flexible and efficient.

**Example**: Defining a Full-Text Index on the content Column

```psql
CREATE TABLE example_table (
    id INTEGER PRIMARY KEY,
    title TEXT,
    content TEXT INDEX USING FULLTEXT WITH (analyzer = 'english')
);
```

- `TEXT INDEX USING FULLTEXT` defines a full-text index on content.
- `WITH (analyzer = 'english')` specifies that the English language analyzer will process the text.

### How Full-Text Indexing Works

When inserting "Machine learning algorithms power modern AI applications.":

- The text is **tokenized** into words: ["machine", "learning", "algorithms", "power", "modern", "AI", "applications"].
- Stop words (e.g., "the", "and", "is") may be **removed**.
- **Stemming** reduces words to their root forms (e.g., "running" → "run").
- The processed tokens are **stored in the index**, making them searchable individually.

## Comparison of Plain vs. Full-Text Index

| Query Type         | Plain Index (LIKE)                | Full-Text Index (MATCH())                |
|--------------------|-----------------------------------|------------------------------------------|
| "machine" search   | ❌ No Match                       | ✅ Matches "Machine learning"            |
| "learning" search  | ❌ No Match                       | ✅ Matches "Deep learning"               |
| "modern AI" search | ❌ No Match (exact match required)| ✅ Matches "modern AI applications"      |
| "deep learning" search | ❌ No Match (case-sensitive)  | ✅ Matches "Deep Learning"               |

---

## Using Full-Text Search in Queries

Once a full-text index is created, use the `MATCH()` function to perform searches.

### Basic Full-Text Search

```psql
SELECT id, title, content
FROM example_table
WHERE MATCH(content, 'AI');
```
- Searches the `content` column for relevant results related to `"AI"`.
- The search **ignores case**, applies **stemming**, and ranks results based on **relevance**.

### Sorting by Relevance (_score)

MonkDB provides a **relevance score** (`_score`), which indicates how well a document matches the query.

```psql
SELECT id, title, content, _score
FROM example_table
WHERE MATCH(content, 'AI')
ORDER BY _score DESC;
```
- Higher `_score` means better **relevance**.
- Results are **automatically ranked** by **semantic meaning** rather than **exact keyword matching**.

### Composite Full-Text Index (Multiple Columns)

You can create composite full-text indices that search across multiple fields.

```psql
CREATE TABLE example_table (
    id INTEGER PRIMARY KEY,
    title TEXT,
    description TEXT,
    INDEX title_description_ft USING FULLTEXT (title, description) WITH (analyzer = 'english')
);
```

Now, searching will return results from both **title** and **description** fields.

### Boosting (Prioritizing Fields)

You can **assign different weights** to fields to **prioritize certain columns** over others.

```psql
SELECT id, title, description, _score
FROM example_table
WHERE MATCH((title 2.0, description), 'AI')
ORDER BY _score DESC;
```

`title` field has **double** the importance (2.0) compared to `description`.

---

In the [script](fts.py), we use `MATCH(content, ?)` to find relevant results for `search_term = "AI"`. Results are **sorted by relevance score** (`_score`).

We will get the below output upon execution of the python script.

```bash
Title: Machine Learning, Content: Machine learning algorithms power modern AI applications., Score: 0.49705768
Title: AI Ethics, Content: Ethical considerations in AI are crucial for fairness and bias mitigation., Score: 0.40984035
```

The output returns `ID`, `Title`, `Content`, and `Score` for each matching row.

---

## BM25 Scoring Formula

MonkDB's full-text search ranking is based on **Okapi BM25** (Best Matching 25) coupled with **Inverted Index (IVF)** data structure, which is a probabilistic ranking function. It determines the relevance of a document to a query based on term frequency, inverse document frequency, and document length normalization.

The BM25 algorithm is widely used in information retrieval systems to rank documents based on their relevance to a given query. The formula for the BM25 score is as follows:


$$
\text{score}(D, Q) = \sum_{t \in Q} IDF(t) \times \frac{TF(t, D) \times (k_1 + 1)}{TF(t, D) + k_1 \times (1 - b + b \times \frac{|D|}{\text{avgD}})}
$$

Where:

- **`TF(t, D)`** = Term Frequency (how often the search term appears in the document).
- **`IDF(t)`** = Inverse Document Frequency (how rare the term is across all documents).
- **`|D|`** = Document length (number of tokens in the document).
- **`avgD`** = Average document length across all documents.
- **`k1`** = Term saturation factor (MonkDB defaults to `1.2`).
- **`b`** = Length normalization factor (MonkDB defaults to `0.75`).

### Key Features of BM25

1. **Term Frequency Saturation**:
   - The contribution of term frequency \( \text{TF}(t, D) \) to the score grows quickly at first but slows down as it increases, approaching an asymptote.

2. **Inverse Document Frequency (IDF)**:
   - Penalizes terms that are very common across documents, as they are less informative for ranking.

3. **Document Length Normalization**:
   - Adjusts scores to prevent longer documents from being unfairly favored due to higher term frequencies.

### Default Parameter Values
- \( k_1 = 1.2 \): Controls term frequency scaling.
- \( b = 0.75 \): Balances normalization based on document length.

BM25 is highly effective because it balances simplicity and performance, making it a foundational component in many search engines and information retrieval systems.

---

## Other search engines using BM25

- **Elasticsearch**: This popular open-source search engine uses BM25 as its default similarity algorithm for scoring and ranking search results.
- **Apache Solr**: Solr, another open-source search platform, also implements BM25 as one of its scoring models, allowing users to leverage its capabilities for better search relevance.
- **Microsoft Azure Cognitive Search**: This cloud-based search service uses BM25 as part of its ranking algorithms to improve search result quality.
- **Amazon Elasticsearch Service**: This managed service, which is based on Elasticsearch, also utilizes BM25 for ranking search results.
- **Lucene**: The underlying library for both Solr and Elasticsearch, Apache Lucene, has BM25 as one of its scoring models.
- **Algolia**: While Algolia primarily focuses on relevance tuning and custom ranking, it incorporates principles similar to BM25 in its search algorithms.
- **Yelp**: Yelp has been known to use BM25 in its search algorithms to rank business listings based on user queries.

## Benefits of Full-Text Search in MonkDB

- ✅ **Fast and Efficient** – Optimized for millions of text records.
- ✅ **Smart Query Matching** – Handles word variations, stemming, stop-words.
- ✅ **Relevance Ranking** – Results are scored based on match strength.
- ✅ **Supports Multiple Languages** – Use different analyzers for English, German, etc..
- ✅ **Ideal for AI/NLP Use Cases** – Useful for chatbots, document search, semantic retrieval.


