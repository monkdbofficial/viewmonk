export interface DemoQuery {
  id: string;
  title: string;
  description: string;
  queryType: string;
  useCase: string;
  whatItDoes: string[];
  expectedResults: string;
  location: string;
  coordinates: string;
  query: string;
  icon: string;
}

export const DEMO_QUERIES: DemoQuery[] = [
  {
    id: 'radius',
    title: 'Proximity Search Template',
    description: 'Find all records within a radius of a specific point',
    queryType: 'Proximity Search (Distance)',
    useCase: 'Finding nearby locations (stores, offices, customers, etc.)',
    whatItDoes: [
      'Calculates distance from a reference point',
      'Filters records within specified radius (meters)',
      'Returns record details with calculated distance',
      'Orders results by distance (nearest first)',
    ],
    expectedResults: 'All records within the specified radius',
    location: 'Use Query Builder for visual interface',
    coordinates: 'POINT(longitude latitude)',
    query: `-- 📍 Proximity Search Template
-- Find locations within a radius of a point

SELECT
  id,                              -- Required: Unique identifier
  name_column as name,             -- Required: Display label (store_name, customer_name, etc.)
  latitude(geo_column) as latitude,   -- Required: Latitude for map display
  longitude(geo_column) as longitude, -- Required: Longitude for map display
  other_column1,                   -- Optional: Any additional data (city, address, etc.)
  other_column2,                   -- Optional: More data (category, type, etc.)
  ROUND(distance(geo_column, 'POINT(-73.9851 40.7589)') / 1000, 2) as distance_km
FROM schema.table
WHERE distance(geo_column, 'POINT(-73.9851 40.7589)') < 50000
ORDER BY distance(geo_column, 'POINT(-73.9851 40.7589)');

-- 📝 Column Requirements:
-- ✅ id: Unique identifier (INTEGER or TEXT)
-- ✅ name/label: Display name for markers (TEXT)
-- ✅ geo_column: GEO_POINT column with coordinates
-- ✅ Additional columns: Any data you want in map popups

-- 🔧 How to Customize:
-- 1. Replace 'schema.table' with your table name (e.g., monkdb.stores)
-- 2. Replace 'geo_column' with your GEO_POINT column name (e.g., location)
-- 3. Replace 'name_column' with your name/label column (e.g., store_name)
-- 4. Replace POINT coordinates with your center point
-- 5. Adjust radius: 50000 meters = 50km

-- 💡 Example:
-- SELECT id, store_name as name, latitude(location), longitude(location),
--        city, state FROM monkdb.stores
-- WHERE distance(location, 'POINT(-118.2437 34.0522)') < 10000;`,
    icon: '📍',
  },
  {
    id: 'nearest',
    title: 'Nearest Neighbor Template',
    description: 'Find the N closest records to a specific location',
    queryType: 'Nearest Neighbor Search',
    useCase: 'Finding closest locations for delivery, service routing, or recommendations',
    whatItDoes: [
      'Calculates distance from reference point to all records',
      'Sorts all records by proximity (nearest first)',
      'Returns only the top N nearest records',
      'Useful for "find 5 nearest stores" type queries',
    ],
    expectedResults: 'Top N records closest to your location',
    location: 'Use Query Builder for visual interface',
    coordinates: 'POINT(longitude latitude)',
    query: `-- 🎯 Nearest Neighbor Template
-- Find the N closest locations to a point

SELECT
  id,                              -- Required: Unique identifier
  name_column as name,             -- Required: Display label
  latitude(geo_column) as latitude,   -- Required: For map
  longitude(geo_column) as longitude, -- Required: For map
  other_column1,                   -- Optional: Additional info (category, rating, etc.)
  ROUND(distance(geo_column, 'POINT(-118.2437 34.0522)') / 1000, 2) as distance_km
FROM schema.table
ORDER BY distance(geo_column, 'POINT(-118.2437 34.0522)')
LIMIT 10;                          -- Number of results (change to 5, 20, etc.)

-- 📝 Column Requirements:
-- ✅ id: Unique identifier
-- ✅ name/label: What to display on map markers
-- ✅ geo_column: GEO_POINT column (location, coordinates, position, etc.)

-- 🔧 How to Customize:
-- 1. Change LIMIT number (5, 10, 20 for top N results)
-- 2. Replace POINT with your location coordinates
-- 3. Add more columns for richer marker popups
-- 4. Order by distance is automatic (nearest first)

-- 💡 Example Use Cases:
-- • Find 5 nearest coffee shops: LIMIT 5
-- • Find 10 closest warehouses: LIMIT 10
-- • Route planning: LIMIT 3 for top choices`,
    icon: '🎯',
  },
  {
    id: 'within',
    title: 'Within Polygon Template',
    description: 'Find all records inside a polygon area',
    queryType: 'Polygon Search (Within)',
    useCase: 'Regional analysis, delivery zones, city boundaries, custom areas',
    whatItDoes: [
      'Checks if points are within a polygon boundary',
      'Filters records by geographic area',
      'Returns all matching records in the region',
      'Perfect for city limits, districts, or custom zones',
    ],
    expectedResults: 'All records within the defined polygon area',
    location: 'Use Query Builder to draw polygon visually',
    coordinates: 'POLYGON((lon lat, lon lat, ...))',
    query: `-- 🗺️ Within Polygon Template
-- Find all locations inside a specific area

SELECT
  id,                              -- Required: Unique identifier
  name_column as name,             -- Required: Display label
  latitude(geo_column) as latitude,   -- Required: For map
  longitude(geo_column) as longitude, -- Required: For map
  other_column1,                   -- Optional: Zone, district, etc.
  other_column2                    -- Optional: Status, type, etc.
FROM schema.table
WHERE within(geo_column, 'POLYGON((
  -118.5 34.0,    -- Southwest corner (lon lat)
  -118.0 34.0,    -- Southeast corner
  -118.0 34.5,    -- Northeast corner
  -118.5 34.5,    -- Northwest corner
  -118.5 34.0     -- Close polygon (same as first point)
))');

-- 📝 Column Requirements:
-- ✅ id: Unique identifier
-- ✅ name/label: Display name for markers
-- ✅ geo_column: GEO_POINT column with coordinates

-- 🔧 How to Customize:
-- 1. Draw polygon visually in Query Builder (easier!)
-- 2. OR manually define POLYGON coordinates (lon lat format)
-- 3. First and last point must be identical (close the polygon)
-- 4. Coordinates are in longitude, latitude order

-- 💡 Example Use Cases:
-- • All stores in downtown area
-- • Customers in specific ZIP code boundary
-- • Deliveries within city limits
-- • Locations in a sales territory

-- ⚠️ Important:
-- Polygon must be closed (first point = last point)
-- Use longitude THEN latitude (POINT(lon lat))`,
    icon: '🗺️',
  },
];
