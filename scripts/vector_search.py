#!/usr/bin/env python3
"""
MonkDB Vector Search - Official Workflow
Based on: monk-documentation-main/documentation/vector/vector_ops.py

This script generates embeddings using sentence-transformers and performs
vector search operations on MonkDB, following the official documentation.

Installation:
    pip install sentence-transformers numpy

Usage:
    python vector_search.py
"""

import numpy as np
from sentence_transformers import SentenceTransformer
import urllib.request
import json

# ==============================
# CONFIGURATION
# ==============================

# MonkDB Connection (update these values)
DB_HOST = "localhost"
DB_PORT = "4200"
DB_USER = "crate"
DB_PASSWORD = ""
DB_SCHEMA = "doc"  # Change to your schema
TABLE_NAME = "documents"  # Change to your table
VECTOR_COLUMN = "embedding"  # Change to your vector column name

# ==============================
# 1️⃣ LOAD EMBEDDING MODEL
# ==============================
print("Loading embedding model...")
MODEL_NAME = "all-MiniLM-L6-v2"
model = SentenceTransformer(MODEL_NAME)
EMBEDDING_DIM = 384  # All-MiniLM-L6-v2 outputs 384-dimensional vectors
print(f"✅ Model loaded: {MODEL_NAME} ({EMBEDDING_DIM} dimensions)")

# ==============================
# 2️⃣ FUNCTION TO GENERATE EMBEDDINGS
# ==============================

def generate_embedding(text):
    """Generate a 384-dimensional vector for the input text."""
    return model.encode(text).tolist()

# ==============================
# 3️⃣ EXECUTE SQL ON MONKDB
# ==============================

def execute_query(sql, args=None):
    """Execute SQL query on MonkDB via HTTP API."""
    url = f"http://{DB_HOST}:{DB_PORT}/_sql"

    payload = {"stmt": sql}
    if args:
        payload["args"] = args

    data = json.dumps(payload).encode('utf-8')

    req = urllib.request.Request(
        url,
        data=data,
        headers={
            'Content-Type': 'application/json',
        }
    )

    # Add basic auth if password is set
    if DB_PASSWORD:
        import base64
        credentials = base64.b64encode(f"{DB_USER}:{DB_PASSWORD}".encode()).decode()
        req.add_header('Authorization', f'Basic {credentials}')

    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode())
            return result
    except urllib.error.HTTPError as e:
        error_body = e.read().decode()
        print(f"❌ SQL Error: {error_body}")
        raise

# ==============================
# 4️⃣ KNN SEARCH USING knn_match()
# ==============================

def knn_search(query, k=5):
    """
    Find the top k nearest neighbors for a given query.
    Uses MonkDB's knn_match() function.
    """
    print(f"\n🔍 Generating embedding for query: '{query}'")
    query_embedding = generate_embedding(query)

    sql = f"""
        SELECT id, content, _score
        FROM "{DB_SCHEMA}"."{TABLE_NAME}"
        WHERE knn_match({VECTOR_COLUMN}, ?, ?)
        ORDER BY _score DESC
    """

    result = execute_query(sql, [query_embedding, k])

    print(f"\n✅ KNN Search Results (Top {k}):")
    print("-" * 80)

    if result.get('rows'):
        for row in result['rows']:
            doc_id, content, score = row
            print(f"Score: {score:.4f} | ID: {doc_id}")
            print(f"Content: {content[:100]}{'...' if len(content) > 100 else ''}")
            print("-" * 80)
    else:
        print("No results found.")

    return result

# ==============================
# 5️⃣ SIMILARITY SEARCH USING vector_similarity()
# ==============================

def similarity_search(query, k=5):
    """
    Find similar documents using vector similarity scoring.
    Uses MonkDB's vector_similarity() function.
    """
    print(f"\n🔍 Generating embedding for query: '{query}'")
    query_embedding = generate_embedding(query)

    sql = f"""
        SELECT id, content, vector_similarity({VECTOR_COLUMN}, ?) AS similarity
        FROM "{DB_SCHEMA}"."{TABLE_NAME}"
        ORDER BY similarity DESC
        LIMIT ?
    """

    result = execute_query(sql, [query_embedding, k])

    print(f"\n✅ Similarity Search Results (Top {k}):")
    print("-" * 80)

    if result.get('rows'):
        for row in result['rows']:
            doc_id, content, similarity = row
            print(f"Similarity: {similarity:.4f} | ID: {doc_id}")
            print(f"Content: {content[:100]}{'...' if len(content) > 100 else ''}")
            print("-" * 80)
    else:
        print("No results found.")

    return result

# ==============================
# 6️⃣ UPSERT DOCUMENT WITH EMBEDDING
# ==============================

def upsert_document(doc_id, content):
    """
    Insert or update a document with its embedding.
    Uses ON CONFLICT DO UPDATE pattern from official docs.
    """
    print(f"\n📝 Generating embedding for document: '{doc_id}'")
    embedding = generate_embedding(content)

    sql = f"""
        INSERT INTO "{DB_SCHEMA}"."{TABLE_NAME}" (id, content, {VECTOR_COLUMN})
        VALUES (?, ?, ?)
        ON CONFLICT (id) DO UPDATE SET
            content = excluded.content,
            {VECTOR_COLUMN} = excluded.{VECTOR_COLUMN}
    """

    result = execute_query(sql, [doc_id, content, embedding])
    print(f"✅ Document upserted: {doc_id}")
    return result

# ==============================
# 7️⃣ BATCH UPSERT DOCUMENTS
# ==============================

def batch_upsert_documents(documents):
    """
    Insert or update multiple documents with embeddings.

    Args:
        documents: List of tuples (id, content)
    """
    print(f"\n📦 Batch upserting {len(documents)} documents...")

    for doc_id, content in documents:
        upsert_document(doc_id, content)

    print(f"✅ Batch upsert completed: {len(documents)} documents")

# ==============================
# 8️⃣ GENERATE EMBEDDING ONLY
# ==============================

def generate_and_print_embedding(text):
    """Generate embedding and print it for copying into Manual mode."""
    print(f"\n🔢 Generating embedding for: '{text}'")
    embedding = generate_embedding(text)
    print(f"\n✅ Embedding ({len(embedding)} dimensions):")
    print(json.dumps(embedding))
    print("\n💡 Copy the array above and paste into MonkDB Workbench Manual Vector mode")
    return embedding

# ==============================
# MAIN EXECUTION
# ==============================

if __name__ == "__main__":
    print("=" * 80)
    print("MonkDB Vector Search - Official Workflow")
    print("=" * 80)

    # Example 1: Generate embedding for manual paste
    print("\n" + "=" * 80)
    print("EXAMPLE 1: Generate Embedding for Manual Search")
    print("=" * 80)
    query = "Physical books"
    embedding = generate_and_print_embedding(query)

    # Example 2: KNN Search
    print("\n" + "=" * 80)
    print("EXAMPLE 2: KNN Search")
    print("=" * 80)
    try:
        knn_search(query, k=5)
    except Exception as e:
        print(f"⚠️  KNN search failed: {e}")
        print("Make sure MonkDB is running and connection settings are correct.")

    # Example 3: Similarity Search
    print("\n" + "=" * 80)
    print("EXAMPLE 3: Similarity Search")
    print("=" * 80)
    try:
        similarity_search(query, k=5)
    except Exception as e:
        print(f"⚠️  Similarity search failed: {e}")
        print("Make sure MonkDB is running and connection settings are correct.")

    # Example 4: Upsert documents (commented out by default)
    # print("\n" + "=" * 80)
    # print("EXAMPLE 4: Upsert Documents")
    # print("=" * 80)
    # sample_docs = [
    #     ("doc_1", "MonkDB is great for time-series and vector workloads."),
    #     ("doc_2", "Vector search in databases is important for AI applications."),
    #     ("doc_3", "MonkDB provides scalable distributed storage."),
    # ]
    # batch_upsert_documents(sample_docs)

    print("\n" + "=" * 80)
    print("✅ Script completed successfully!")
    print("=" * 80)
