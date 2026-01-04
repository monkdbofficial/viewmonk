from monkdb import client
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
TABLE_NAME = config['database']['BLOB_TABLE_NAME']

connection = client.connect(
    f"http://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}", username=DB_USER)
cursor = connection.cursor()

# Create a BLOB table
# BLOB tables in MonkDB do not support schemas. Unlike regular tables, BLOB tables exist at the cluster level and are not associated with a schema (such as doc, myschema, etc.).
cursor.execute(f"""
    CREATE BLOB TABLE {TABLE_NAME}
    CLUSTERED INTO 3 SHARDS
""")

print(f"BLOB table {TABLE_NAME} created successfully!")
connection.close()
