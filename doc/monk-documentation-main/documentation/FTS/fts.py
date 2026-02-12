from monkdb import client
import time
import configparser
import os

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
TABLE_NAME = config['database']['FTS_TABLE_NAME']

# Create a MonkDB connection
try:
    connection = client.connect(
        f"http://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}", username=DB_USER
    )
    cursor = connection.cursor()
    print("✅ Database connection established successfully!")
except Exception as e:
    print(f"⚠️ Error connecting to the database: {e}")
    exit(1)

# Drop table if exists
cursor.execute(f"DROP TABLE IF EXISTS {DB_SCHEMA}.{TABLE_NAME}")
connection.commit()

# Create table with a full-text index using the standard analyzer
cursor.execute(f'''
CREATE TABLE {DB_SCHEMA}.{TABLE_NAME} (
    id INTEGER PRIMARY KEY,
    title TEXT,
    content TEXT INDEX USING FULLTEXT WITH (analyzer = 'standard')
)
''')
connection.commit()

# Generate synthetic data
titles = ["Machine Learning", "Deep Learning",
          "AI Ethics", "Vector Databases", "Big Data Analytics"]
contents = [
    "Machine learning algorithms power modern AI applications.",
    "Deep learning revolutionized image recognition and NLP.",
    "Ethical considerations in AI are crucial for fairness and bias mitigation.",
    "Vector databases optimize similarity search for high-dimensional data.",
    "Big data analytics transforms decision-making in businesses."
]

# Insert synthetic data (ensuring unique entries)
data = [(i, titles[i % len(titles)], contents[i % len(contents)])
        for i in range(1, 11)]
cursor.executemany(
    f"INSERT INTO {DB_SCHEMA}.{TABLE_NAME} (id, title, content) VALUES (?, ?, ?)", data)
connection.commit()

# Refresh the table to ensure changes are reflected in the index
cursor.execute(f"REFRESH TABLE {DB_SCHEMA}.{TABLE_NAME}")

time.sleep(1)  # Ensure data is indexed before querying

# GROUP BY content, title ensures each content value appears only once. Before, multiple rows for the same content could exist, leading to duplicate processing.
# Used MAX(_score) to Select the Highest Score. It finds the highest _score per unique content. This guarantees that only the most relevant version of the content appears.
# This ensures the most relevant results appear at the top.
search_term = "AI"
cursor.execute(f"""
SELECT title, content, MAX(_score) as max_score
FROM {DB_SCHEMA}.{TABLE_NAME}
WHERE MATCH(content, ?)
GROUP BY content, title
ORDER BY max_score DESC;
""", (search_term,))

# Fetch results
results = cursor.fetchall()

# Print unique results
for title, content, score in results:
    print(f"Title: {title}, Content: {content}, Score: {score}")


# Close connection
cursor.close()
connection.close()
