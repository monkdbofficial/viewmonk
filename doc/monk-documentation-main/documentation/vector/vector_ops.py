import numpy as np
from monkdb import client
from sentence_transformers import SentenceTransformer
from langchain_core.documents import Document
from langchain_community.vectorstores import VectorStore
from typing import List
import configparser
import os

# ==============================
# DATABASE CONNECTION VARIABLES
# ==============================

# Determine the absolute path of the config.ini file
# Get the directory of the current script
current_directory = os.path.dirname(os.path.realpath(__file__))
# Construct absolute path
config_file_path = os.path.join(current_directory, "..", "config.ini")

# Load configuration from config.ini file
config = configparser.ConfigParser()
config.read(config_file_path, encoding="utf-8")

# MonkDB Connection Details from config file
DB_HOST = config['database']['DB_HOST']
DB_PORT = config['database']['DB_PORT']
DB_USER = config['database']['DB_USER']
DB_PASSWORD = config['database']['DB_PASSWORD']
DB_SCHEMA = config['database']['DB_SCHEMA']
TABLE_NAME = config['database']['VECTOR_TABLE_NAME']

# ==============================
# 1️⃣ CONNECT TO MONKDB
# ==============================
try:
    connection = client.connect(
        f"http://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}", username=DB_USER
    )
    cursor = connection.cursor()
    print("✅ Database connection established successfully!")
except Exception as e:
    print(f"⚠️ Error connecting to the database: {e}")
    exit(1)

# ==============================
# 2️⃣ LOAD EMBEDDING MODEL
# ==============================
MODEL_NAME = "all-MiniLM-L6-v2"
model = SentenceTransformer(MODEL_NAME)
EMBEDDING_DIM = 384  # All-MiniLM-L6-v2 outputs 384-dimensional vectors

# ==============================
# 3️⃣ CREATE TABLE WITH FLOAT_VECTOR(384) UNDER `monkdb` SCHEMA
# ==============================

# Drop table if exists
cursor.execute(f"DROP TABLE IF EXISTS {DB_SCHEMA}.{TABLE_NAME}")
print(f"Dropped {DB_SCHEMA}.{TABLE_NAME} table")

cursor.execute(f"""
CREATE TABLE IF NOT EXISTS {DB_SCHEMA}.{TABLE_NAME} (
    id TEXT PRIMARY KEY,
    content TEXT,
    embedding FLOAT_VECTOR({EMBEDDING_DIM})
)
""")
connection.commit()
print(f"✅ Table '{DB_SCHEMA}.{TABLE_NAME}' is ready.")

# ==============================
# 4️⃣ FUNCTION TO GENERATE EMBEDDINGS
# ==============================


def generate_embedding(text):
    """Generate a 384-dimensional vector for the input text."""
    return model.encode(text).tolist()  # Convert NumPy array to list for MonkDB compatibility

# ==============================
# 5️⃣ INSERT DOCUMENTS INTO MONKDB
# ==============================


def insert_or_update_document(doc_id, text):
    """Insert a document into MonkDB, updating it if it already exists."""
    embedding = generate_embedding(text)

    try:
        """Insert a document into MonkDB, updating it if it already exists."""
        embedding = generate_embedding(text)
        cursor.execute(f"""
            INSERT INTO {DB_SCHEMA}.{TABLE_NAME} (id, content, embedding) VALUES (?, ?, ?) ON CONFLICT (id) DO UPDATE SET content = excluded.content, embedding = excluded.embedding""", [doc_id, text, embedding])
        connection.commit()
        print(f"Upserted document: {doc_id}")

    except client.exceptions.MonkIntegrityError as e:
        print(f"⚠️ IntegrityError for doc_id {doc_id}: {str(e)}")
        print("Skipping insertion to prevent DuplicateKeyException.")


# Insert some sample documents
documents = [
    ("doc_1", "MonkDB is great for time-series and vector workloads."),
    ("doc_2", "Vector search in databases is important for AI applications."),
    ("doc_3", "MonkDB provides scalable distributed storage."),
    ("doc_4", "Machine learning models can benefit from vector databases."),
    ("doc_5", "AI-powered search engines rely on efficient embeddings.")
]

for doc_id, text in documents:
    insert_or_update_document(doc_id, text)

print(f"✅ Documents inserted into {DB_SCHEMA}.{TABLE_NAME}.")

# ==============================
# 6️⃣ PERFORM KNN SEARCH USING knn_match()
# ==============================


def knn_search(query, k=3):
    """Find the top k nearest neighbors for a given query."""
    query_embedding = generate_embedding(query)
    cursor.execute(f"""
    SELECT id, content, _score 
    FROM {DB_SCHEMA}.{TABLE_NAME} 
    WHERE knn_match(embedding, ?, {k})  
    ORDER BY _score DESC
    """, [query_embedding])

    results = cursor.fetchall()
    return results


query_text = "Find databases optimized for vector search."
print("\n🔍 KNN Search Results:")
for row in knn_search(query_text):
    print(f"ID: {row[0]}, Content: {row[1]}, Score: {row[2]}")

# ==============================
# 7️⃣ COMPUTE VECTOR SIMILARITY USING vector_similarity()
# ==============================


def similarity_search(query, k=3):
    """Find similar documents using vector similarity scoring."""
    query_embedding = generate_embedding(query)
    cursor.execute(f"""
    SELECT id, content, vector_similarity(embedding, ?) AS similarity 
    FROM {DB_SCHEMA}.{TABLE_NAME} 
    ORDER BY similarity DESC
    LIMIT {k}
    """, [query_embedding])

    results = cursor.fetchall()
    return results


print("\n🔍 Similarity Search Results:")
for row in similarity_search(query_text):
    print(f"ID: {row[0]}, Content: {row[1]}, Similarity: {row[2]}")

# ==============================
# 8️⃣ INTEGRATE WITH LANGCHAIN
# ==============================


class MonkDBVectorStore(VectorStore):
    def __init__(self, connection, embedding_dim):
        self.connection = connection
        self.cursor = connection.cursor()
        self.embedding_dim = embedding_dim

    def add_documents(self, docs: List[Document]):
        """Insert documents into MonkDB with embeddings."""
        for doc in docs:
            embedding = generate_embedding(doc.page_content)
            self.cursor.execute(
                f"""
            INSERT INTO {DB_SCHEMA}.{TABLE_NAME} (id, content, embedding) 
            VALUES (?, ?, ?)
            ON CONFLICT (id) DO UPDATE SET 
                content = excluded.content, 
                embedding = excluded.embedding
            """,
                [doc.metadata.get("id", "unknown"),
                 doc.page_content, embedding]
            )
        self.connection.commit()

    def similarity_search(self, query: str, k: int = 3):
        """Find similar documents using vector similarity."""
        query_embedding = generate_embedding(query)
        self.cursor.execute(f"""
        SELECT id, content, vector_similarity(embedding, ?) AS similarity 
        FROM {DB_SCHEMA}.{TABLE_NAME} 
        ORDER BY similarity DESC
        LIMIT ?
        """, [query_embedding, k])
        results = self.cursor.fetchall()
        return [Document(page_content=row[1], metadata={"id": row[0]}) for row in results]

    @classmethod
    def from_texts(cls, texts: List[str], metadatas: List[dict] = None):
        """Create a vector store from a list of texts."""
        connection = client.connect(
            f"http://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}", username=DB_USER)
        instance = cls(connection, EMBEDDING_DIM)

        metadatas = metadatas or [{}] * len(texts)

        docs = [Document(page_content=text, metadata=meta)
                for text, meta in zip(texts, metadatas)]
        instance.add_documents(docs)

        return instance


# Initialize MonkDB Vector Store
monkdb_vector_store = MonkDBVectorStore.from_texts([
    "MonkDB supports fast vector search.",
    "Embedding-based retrieval is powerful in AI applications."
])

# Perform similarity search using LangChain
print("\n🔍 LangChain Similarity Search Results:")
for doc in monkdb_vector_store.similarity_search("How does MonkDB handle vector search?"):
    print(doc.page_content)

print(
    f"\n✅ MonkDB vector search with Sentence Transformers & LangChain completed successfully under schema '{DB_SCHEMA}'!")
