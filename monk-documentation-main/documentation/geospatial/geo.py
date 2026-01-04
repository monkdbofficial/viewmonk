import random
from monkdb import client
from shapely.geometry import Polygon, MultiPoint
from shapely.validation import explain_validity
import configparser
import os

# Function to generate a valid convex polygon using Shapely's convex hull

"""
Creates random points within a bounded region (-50 to 50).
Uses Shapely’s convex_hull to create a valid convex polygon.
Prevents self-intersecting polygons that MonkDB would reject.
Ensures all generated polygons are valid before insertion.
"""


def generate_valid_convex_polygon(num_points=4):
    """Generates a convex polygon using Shapely's convex hull to ensure validity."""
    while True:
        coords = [
            [round(random.uniform(-50, 50), 6),
             round(random.uniform(-50, 50), 6)]
            for _ in range(num_points)
        ]
        multipoint = MultiPoint(coords)
        poly = multipoint.convex_hull  # Creates a convex polygon

        if poly.is_valid:
            break  # Only return if the polygon is valid

    coords = list(poly.exterior.coords)  # Extract WKT-compatible coords
    return coords


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
GEO_POINTS_TABLE = config['database']['GEO_POINTS_TABLE']
GEO_SHAPE_TABLE = config['database']['GEO_SHAPE_TABLE']

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

# Drop geo-points table if it exists
cursor.execute(f"DROP TABLE IF EXISTS {DB_SCHEMA}.{GEO_POINTS_TABLE}")
print(f"Dropped {DB_SCHEMA}.{GEO_POINTS_TABLE} table")

# Drop geo shapes table if it exists
cursor.execute(f"DROP TABLE IF EXISTS {DB_SCHEMA}.{GEO_SHAPE_TABLE}")
print(f"Dropped {DB_SCHEMA}.{GEO_SHAPE_TABLE} table")

"""
Creates a table (geo_points) if it doesn't exist.
id INTEGER PRIMARY KEY → Unique identifier for each point.
location GEO_POINT → Stores geospatial points (latitude, longitude).
WITH (number_of_replicas = 0) → No replication (useful for development).
"""
cursor.execute(f"""
CREATE TABLE IF NOT EXISTS {DB_SCHEMA}.{GEO_POINTS_TABLE} (
    id INTEGER PRIMARY KEY,
    location GEO_POINT
) WITH (number_of_replicas = 0);
""")
print(f"Table '{DB_SCHEMA}.{GEO_POINTS_TABLE}' has been created.")

"""
Creates a table (geo_shapes) to store polygons.
area GEO_SHAPE → Stores polygon geometries in GeoJSON or WKT format.
"""
cursor.execute(f"""
CREATE TABLE IF NOT EXISTS {DB_SCHEMA}.{GEO_SHAPE_TABLE} (
    id INTEGER PRIMARY KEY,
    area GEO_SHAPE
) WITH (number_of_replicas = 0);
""")
print(f"Table '{DB_SCHEMA}.{GEO_SHAPE_TABLE}' has been created.")

# Insert Synthetic Data
num_points = 10
num_shapes = 5

"""
Generates 10 random geographic points.
Longitude range: -180 to 180
Latitude range: -90 to 90
Uses ? placeholders to prevent SQL injection.
Inserts values as [lon, lat] (MonkDB's expected GEO_POINT format).
"""
for i in range(1, num_points + 1):
    lon, lat = round(random.uniform(-180, 180),
                     6), round(random.uniform(-90, 90), 6)
    cursor.execute(
        f"INSERT INTO {DB_SCHEMA}.{GEO_POINTS_TABLE}(id, location) VALUES (?, ?)",
        (i, [lon, lat]),
    )
    print(f"Inserted point ID {i} at location [{lon}, {lat}] in {DB_SCHEMA}.")

"""
Generates valid polygons using generate_valid_convex_polygon().
Ensures polygons are closed.
Inserts WKT (Well-Known Text) format, which MonkDB supports.
"""
for i in range(1, num_shapes + 1):
    # Generate a valid convex polygon
    coords = generate_valid_convex_polygon()

    # Convert to WKT format
    wkt_polygon = f'POLYGON ((' + \
        ', '.join([f"{lon} {lat}" for lon, lat in coords]) + '))'

    try:
        cursor.execute(
            f"INSERT INTO {DB_SCHEMA}.{GEO_SHAPE_TABLE} (id, area) VALUES (?, ?)",
            (i, wkt_polygon),
        )
        print(f"Inserted shape ID {i} with WKT: {wkt_polygon} in {DB_SCHEMA}.")
    except Exception as e:
        print(f"Error inserting shape ID {i}: {e}")

"""Verifies that points were inserted correctly."""
cursor.execute(f"SELECT * FROM {DB_SCHEMA}.{GEO_POINTS_TABLE};")
geo_points = cursor.fetchall()
print("\nGeo Points:")
for row in geo_points:
    print(row)

"""Retrieves and prints all inserted polygons."""
cursor.execute(f"SELECT * FROM {DB_SCHEMA}.{GEO_SHAPE_TABLE};")
geo_shapes = cursor.fetchall()
print("\nGeo Shapes:")
for row in geo_shapes:
    print(row)

"""
Finds all geo_points that are inside the given polygon/ It checks if a GEO_POINT exists inside a GEO_SHAPE.
Uses MonkDB's within() function.
"""
polygon_wkt = 'POLYGON ((-10 -10, 10 -10, 10 10, -10 10, -10 -10))'
cursor.execute(
    f"""
    SELECT id, location FROM {DB_SCHEMA}.{GEO_POINTS_TABLE}
    WHERE within(location, ?);
""",
    (polygon_wkt,),
)
print("\nPoints within given polygon:")
for row in cursor.fetchall():
    print(row)

# Close connection
cursor.close()
connection.close()
