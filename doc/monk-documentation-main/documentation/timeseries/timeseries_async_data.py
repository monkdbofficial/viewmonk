import asyncio
from monkdb import client
from datetime import datetime
import random
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
TABLE_NAME = config['database']['TIMESERIES_ASYNC_TABLE_NAME']

# Create a MonkDB connection
try:
    connection = client.connect(
        f"http://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}", username=DB_USER
    )
    cursor = connection.cursor()
except Exception as e:
    print(f"⚠️ Error connecting to the database: {e}")
    exit(1)


# Connect to MonkDB
# connection = client.connect(DB_URI, username=DB_USER, password=DB_PASSWORD)

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

# Generate random weather data


def generate_weather_data(location):
    return {
        "timestamp": datetime.utcnow(),
        "location": location,
        "temperature": round(random.uniform(-10, 40), 2),
        "humidity": round(random.uniform(20, 100), 2),
        "wind_speed": round(random.uniform(0, 20), 2),
    }

# Insert data into MonkDB and execute queries


async def insert_data():
    locations = ["New York", "London", "Berlin", "Tokyo"]
    while True:
        cursor = connection.cursor()
        try:
            # Insert data for each location
            for location in locations:
                data = generate_weather_data(location)
                query = f"""
                    INSERT INTO {DB_SCHEMA}.{TABLE_NAME} (timestamp, location, temperature, humidity, wind_speed)
                    VALUES (?, ?, ?, ?, ?)
                """
                cursor.execute(query, [data["timestamp"], data["location"],
                               data["temperature"], data["humidity"], data["wind_speed"]])
                print(f"Inserted: {data}")

            # Example Query 1: Average temperature per location
            cursor.execute(
                f"SELECT location, AVG(temperature) AS avg_temp FROM {DB_SCHEMA}.{TABLE_NAME} GROUP BY location")
            avg_temps = cursor.fetchall()
            print("\nAverage Temperatures:")
            for row in avg_temps:
                print(f"Location: {row[0]}, Avg Temp: {row[1]}")

            # Example Query 2: Retrieve recent readings
            cursor.execute(
                f"SELECT * FROM {DB_SCHEMA}.{TABLE_NAME} ORDER BY timestamp DESC LIMIT 5")
            recent_readings = cursor.fetchall()
            print("\nRecent Readings:")
            for row in recent_readings:
                print(
                    f"Timestamp: {row[0]}, Location: {row[1]}, Temperature: {row[2]}, Humidity: {row[3]}, Wind Speed: {row[4]}")

        finally:
            # Close the cursor explicitly
            cursor.close()

        await asyncio.sleep(5)  # Wait for 5 seconds before the next batch

# Main async function to run the simulation


async def main():
    try:
        await insert_data()
    except KeyboardInterrupt:
        print("Simulation stopped.")
    finally:
        connection.close()

# Run the async simulation
if __name__ == "__main__":
    asyncio.run(main())
