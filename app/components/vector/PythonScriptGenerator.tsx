'use client';

import { useState } from 'react';
import { FileCode, Copy, Check, Download, ExternalLink } from 'lucide-react';
import type { VectorCollection } from '@/app/hooks/useVectorCollections';

interface PythonScriptGeneratorProps {
  collection: VectorCollection;
  connectionInfo?: {
    host: string;
    port: string;
    user: string;
  };
}

export default function PythonScriptGenerator({
  collection,
  connectionInfo = { host: 'localhost', port: '4200', user: 'crate' },
}: PythonScriptGeneratorProps) {
  const [copied, setCopied] = useState(false);

  const generateScript = () => {
    return `#!/usr/bin/env python3
"""
MonkDB Vector Search Script - Generated for ${collection.schema}.${collection.table}
Based on official MonkDB documentation workflow

Installation:
    pip install sentence-transformers numpy

Usage:
    1. Update DB_HOST, DB_PORT, DB_USER, DB_PASSWORD below
    2. Run: python vector_search_${collection.table}.py
"""

from sentence_transformers import SentenceTransformer
import urllib.request
import json

# ==============================
# CONFIGURATION
# ==============================
DB_HOST = "${connectionInfo.host}"
DB_PORT = "${connectionInfo.port}"
DB_USER = "${connectionInfo.user}"
DB_PASSWORD = ""  # Update this

DB_SCHEMA = "${collection.schema}"
TABLE_NAME = "${collection.table}"
VECTOR_COLUMN = "${collection.columnName}"
EMBEDDING_DIM = ${collection.dimension}

# ==============================
# LOAD MODEL
# ==============================
print("Loading embedding model...")
MODEL_NAME = "all-MiniLM-L6-v2"  # ${collection.dimension}D model
model = SentenceTransformer(MODEL_NAME)
print(f"✅ Model loaded: {MODEL_NAME}")

def generate_embedding(text):
    """Generate ${collection.dimension}-dimensional vector."""
    return model.encode(text).tolist()

# ==============================
# EXECUTE SQL
# ==============================
def execute_query(sql, args=None):
    """Execute SQL query on MonkDB."""
    url = f"http://{DB_HOST}:{DB_PORT}/_sql"
    payload = {"stmt": sql}
    if args:
        payload["args"] = args

    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})

    if DB_PASSWORD:
        import base64
        credentials = base64.b64encode(f"{DB_USER}:{DB_PASSWORD}".encode()).decode()
        req.add_header('Authorization', f'Basic {credentials}')

    with urllib.request.urlopen(req) as response:
        return json.loads(response.read().decode())

# ==============================
# KNN SEARCH
# ==============================
def knn_search(query, k=5):
    """Find top k nearest neighbors using knn_match()."""
    print(f"\\n🔍 Searching for: '{query}'")
    embedding = generate_embedding(query)

    sql = f'''
        SELECT *, _score
        FROM "{DB_SCHEMA}"."{TABLE_NAME}"
        WHERE knn_match({VECTOR_COLUMN}, ?, ?)
        ORDER BY _score DESC
    '''

    result = execute_query(sql, [embedding, k])

    print(f"✅ Found {len(result.get('rows', []))} results:")
    for row in result.get('rows', []):
        score = row[result['cols'].index('_score')] if '_score' in result['cols'] else 0
        print(f"  Score: {score:.4f}")
        print(f"  Data: {row}")

    return result

# ==============================
# SIMILARITY SEARCH
# ==============================
def similarity_search(query, k=5):
    """Find similar documents using vector_similarity()."""
    print(f"\\n🔍 Searching for: '{query}'")
    embedding = generate_embedding(query)

    sql = f'''
        SELECT *, vector_similarity({VECTOR_COLUMN}, ?) AS _score
        FROM "{DB_SCHEMA}"."{TABLE_NAME}"
        ORDER BY _score DESC
        LIMIT ?
    '''

    result = execute_query(sql, [embedding, k])

    print(f"✅ Found {len(result.get('rows', []))} results:")
    for row in result.get('rows', []):
        score = row[-1]  # Last column is _score
        print(f"  Similarity: {score:.4f}")
        print(f"  Data: {row[:-1]}")

    return result

# ==============================
# MAIN
# ==============================
if __name__ == "__main__":
    print("=" * 80)
    print(f"MonkDB Vector Search - {DB_SCHEMA}.{TABLE_NAME}")
    print("=" * 80)

    # Example query - change this
    query = input("\\nEnter your search query: ") or "example search"

    # Choose search type
    print("\\nSearch type:")
    print("1. KNN Match (finds k nearest neighbors)")
    print("2. Vector Similarity (ranks all by similarity)")
    choice = input("Choose (1 or 2): ") or "1"

    k = int(input("Top K results (default 5): ") or "5")

    try:
        if choice == "1":
            knn_search(query, k)
        else:
            similarity_search(query, k)
    except Exception as e:
        print(f"❌ Error: {e}")
        print("Make sure MonkDB is running and connection settings are correct.")

    print("\\n✅ Done!")
`;
  };

  const script = generateScript();

  const copyScript = () => {
    navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadScript = () => {
    const blob = new Blob([script], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vector_search_${collection.table}.py`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <FileCode className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Official MonkDB Workflow (Recommended)
            </h3>
            <p className="text-xs text-blue-800 dark:text-blue-200 mb-3">
              This Python script follows the official MonkDB documentation. It generates embeddings
              using <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">sentence-transformers</code> and
              performs vector search using <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">knn_match()</code> or{' '}
              <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">vector_similarity()</code>.
            </p>
            <div className="flex items-center gap-2">
              <a
                href="https://github.com/UKPLab/sentence-transformers"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
                sentence-transformers docs
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Installation */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
          1. Install Dependencies
        </h4>
        <div className="bg-gray-900 dark:bg-black rounded-lg p-3">
          <pre className="text-xs text-green-400">
            <code>pip install sentence-transformers numpy</code>
          </pre>
        </div>
      </div>

      {/* Script */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            2. Download & Run Script
          </h4>
          <div className="flex items-center gap-2">
            <button
              onClick={copyScript}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-green-600" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  Copy
                </>
              )}
            </button>
            <button
              onClick={downloadScript}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="w-3 h-3" />
              Download
            </button>
          </div>
        </div>
        <div className="bg-gray-900 dark:bg-black rounded-lg p-4 max-h-[400px] overflow-y-auto">
          <pre className="text-xs text-green-400">
            <code>{script}</code>
          </pre>
        </div>
      </div>

      {/* Usage */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
          3. Run Script
        </h4>
        <div className="bg-gray-900 dark:bg-black rounded-lg p-3">
          <pre className="text-xs text-green-400">
            <code>python vector_search_{collection.table}.py</code>
          </pre>
        </div>
        <p className="text-xs text-gray-600 dark:text-gray-400">
          The script will prompt you for a search query and display results with similarity scores.
        </p>
      </div>

      {/* Alternative Methods */}
      <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
          Alternative: Use External APIs
        </h4>
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
          For enterprise-grade embeddings, MonkDB documentation recommends using OpenAI or Cohere APIs
          instead of sentence-transformers. These provide higher quality embeddings (1536D or 1024D).
        </p>
        <div className="space-y-2">
          <a
            href="https://platform.openai.com/docs/guides/embeddings"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            <ExternalLink className="w-3 h-3" />
            OpenAI Embeddings API
          </a>
          <a
            href="https://docs.cohere.com/docs/embeddings"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            <ExternalLink className="w-3 h-3" />
            Cohere Embeddings API
          </a>
        </div>
      </div>
    </div>
  );
}
