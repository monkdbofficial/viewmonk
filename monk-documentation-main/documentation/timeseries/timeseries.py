from monkdb import client
import random
from faker import Faker
from datetime import datetime, timedelta
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
TABLE_NAME = config['database']['TIMESERIES_TABLE_NAME']

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

# Faker for generating locations
fake = Faker()

# Drop table if it exists
cursor.execute(f"DROP TABLE IF EXISTS {DB_SCHEMA}.{TABLE_NAME}")
print(f"Dropped {DB_SCHEMA}.{TABLE_NAME} table")

# Create a table
cursor.execute(f"""
    CREATE TABLE IF NOT EXISTS {DB_SCHEMA}.{TABLE_NAME} (
        "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL,
       "location" TEXT NOT NULL,
        "temperature" REAL NOT NULL,
        "humidity" REAL NOT NULL,
        "wind_speed" REAL NOT NULL,
        PRIMARY KEY ("timestamp")
    )
""")
# Generate and Insert Time-Series Data


def insert_sensor_data(num_rows=10):
    base_time = datetime.utcnow()

    for _ in range(num_rows):
        timestamp = base_time - timedelta(minutes=random.randint(1, 1440))
        location = fake.city()
        temperature = round(random.uniform(10, 40), 2)
        humidity = round(random.uniform(20, 90), 2)
        wind_speed = round(random.uniform(0, 30), 2)

        query = f"""
        INSERT INTO {DB_SCHEMA}.{TABLE_NAME} (timestamp, location, temperature, humidity, wind_speed) 
        VALUES (?, ?, ?, ?, ?)
        """
        cursor.execute(query, (timestamp, location,
                       temperature, humidity, wind_speed))

    connection.commit()
    print(f"Inserted {num_rows} sensor records.")

# Query Time-Series Data


def fetch_sensor_data():
    query = f"""
    SELECT timestamp, location, temperature, humidity, wind_speed 
    FROM {DB_SCHEMA}.{TABLE_NAME} 
    WHERE timestamp >= NOW() - INTERVAL '1 day'
    ORDER BY timestamp ASC
    """
    cursor.execute(query)
    rows = cursor.fetchall()

    if not rows:
        print("No recent data found.")
        return

    print("\nRecent Sensor Data (Last 24 Hours):")
    for row in rows:
        print(
            f"{row[0]} | {row[1]} | Temp: {row[2]}°C | Humidity: {row[3]}% | Wind Speed: {row[4]} km/h")


# Run the functions
insert_sensor_data(10)
fetch_sensor_data()

# Close connection
cursor.close()
connection.close()
