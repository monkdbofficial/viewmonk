from monkdb import client
import configparser
import os
import json

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
TABLE_NAME = config['database']['DOC_TABLE_NAME']

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
print(f"Dropped {DB_SCHEMA}.{TABLE_NAME} table")

# Create table with JSON storage and indexing
cursor.execute(f"""
    CREATE TABLE {DB_SCHEMA}.{TABLE_NAME} (
        id INTEGER PRIMARY KEY,
        name TEXT,
        age INTEGER,
        metadata OBJECT(DYNAMIC) AS (
            city TEXT INDEX USING PLAIN
        )
    )
""")

print("✅ Table created successfully!")

# Insert sample users with nested JSON
users_data = [
    (1, "Alice", 30, {
        "city": "New York",
        "skills": ["Python", "SQL", "AI"],
        "profile": {
            "preferences": {
                "food": "Italian",
                "language": "English"
            }
        }
    }),
    (2, "Bob", 25, {
        "city": "San Francisco",
        "skills": ["JavaScript", "Node.js"],
        "profile": {
            "preferences": {
                "food": "Mexican",
                "language": "Spanish"
            }
        }
    }),
    (3, "Charlie", 35, {
        "city": "Berlin",
        "skills": ["Go", "Rust"],
        "profile": {}  # Empty profile (No food preference)
    }),
    (4, "David", 28, {
        "city": "London",
        "skills": ["Java", "Spring Boot"],
    }),
    (5, "Eve", 40, {
        "city": "Tokyo",
        "skills": ["AI", "Machine Learning"],
        "profile": {
            "preferences": {
                "food": "Sushi",
                "language": "Japanese"
            }
        }
    })
]

# Insert data
try:
    cursor.executemany(
        f"INSERT INTO {DB_SCHEMA}.{TABLE_NAME} (id, name, age, metadata) VALUES (?, ?, ?, ?)", users_data)
    connection.commit()  # ✅ Ensure the transaction is committed
    print("✅ Sample user data inserted successfully!")
except Exception as e:
    print(f"⚠️ Error during data insertion: {e}")

# ✅ Refresh table to ensure visibility of inserted records
cursor.execute(f"REFRESH TABLE {DB_SCHEMA}.{TABLE_NAME}")

# Fetch the number of records after commit
cursor.execute(f"SELECT COUNT(*) FROM {DB_SCHEMA}.{TABLE_NAME}")
print("\n🔍 Number of records in table:")
print(json.dumps(cursor.fetchall(), indent=4))

# Fetch all data to verify insertion
cursor.execute(f"SELECT id, name, metadata FROM {DB_SCHEMA}.{TABLE_NAME}")
print("\n🔍 Full User Data:")
print(json.dumps(cursor.fetchall(), indent=4))

# Query JSON field (metadata['city'])
cursor.execute(f"SELECT name, metadata['city'] FROM {DB_SCHEMA}.{TABLE_NAME}")
print("\n🌍 Users and Their Cities:")
print(json.dumps(cursor.fetchall(), indent=4))

# Query array elements inside JSON
cursor.execute(
    f"SELECT name, metadata['skills'] FROM {DB_SCHEMA}.{TABLE_NAME} WHERE metadata['skills'] IS NOT NULL")
print("\n💡 Users with Skills:")
print(json.dumps(cursor.fetchall(), indent=4))

# Check if a user has 'AI' in their skills (Array Filtering using ANY)
cursor.execute(
    f"SELECT name FROM {DB_SCHEMA}.{TABLE_NAME} WHERE 'AI' = ANY(metadata['skills'])")
print("\n🧠 Users with AI Skills:")
print(json.dumps(cursor.fetchall(), indent=4))

# Query Nested Object Data (Fix for NULL food preference issue)
cursor.execute(f"""
    SELECT name, metadata['profile']['preferences']['food']
    FROM {DB_SCHEMA}.{TABLE_NAME}
    WHERE metadata['profile']['preferences']['food'] IS NOT NULL
""")
print("\n🍔 Users with Food Preferences:")
food_prefs = cursor.fetchall()
if food_prefs:
    print(json.dumps(food_prefs, indent=4))
else:
    print("⚠️ No users with food preferences found!")

# Query JSON keys dynamically
cursor.execute(
    f"SELECT name, object_keys(metadata) FROM {DB_SCHEMA}.{TABLE_NAME}")
print("\n🔑 JSON Keys for Each User:")
print(json.dumps(cursor.fetchall(), indent=4))

# Fetch Alice's metadata
cursor.execute(
    f"SELECT metadata FROM {DB_SCHEMA}.{TABLE_NAME} WHERE name = 'Alice'"
)
alice_metadata = cursor.fetchone()

if alice_metadata:
    alice_metadata = alice_metadata[0]  # Extract JSON object (dict)

    # Modify the 'city' field
    alice_metadata['city'] = "Paris"

    # Debug: Print new metadata before updating
    print("\n🔄 New Metadata Before Update:")
    print(json.dumps(alice_metadata, indent=4))

    # Convert modified metadata to ensure it's JSON-compatible
    updated_metadata = json.loads(json.dumps(alice_metadata))

    # ✅ Replace the entire metadata object and return the updated row
    cursor.execute(
        f"UPDATE {DB_SCHEMA}.{TABLE_NAME} SET metadata = ? WHERE name = 'Alice' RETURNING metadata",
        (updated_metadata,)
    )
    updated_row = cursor.fetchone()  # Fetch the updated data
    connection.commit()  # Ensure update is saved
    print("\n✏️ Successfully Updated Alice's City to Paris!")

    # Debug: Show returned metadata after update
    print("\n🔄 Updated Metadata After Update (Direct Fetch from Query):")
    print(json.dumps(updated_row, indent=4))

# ✅ Force a REFRESH TABLE to make updates immediately visible
cursor.execute(f"REFRESH TABLE {DB_SCHEMA}.{TABLE_NAME}")

# Verify the update after refreshing
cursor.execute(
    f"SELECT name, metadata FROM {DB_SCHEMA}.{TABLE_NAME} WHERE name = 'Alice'"
)
print("\n✅ Alice's Updated Metadata (After Refresh):")
print(json.dumps(cursor.fetchall(), indent=4))


# Close connection
cursor.close()
connection.close()
print("\n🚀 MonkDB JSON Store Simulation Completed Successfully!")
