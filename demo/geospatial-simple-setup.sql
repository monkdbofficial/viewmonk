-- =============================================================================
-- GEOSPATIAL DATA TOOLS DEMO - Simple Setup (Run statements separately)
-- =============================================================================
-- IMPORTANT: Run each statement ONE AT A TIME in Query Editor
-- Copy and execute each section separately
-- =============================================================================

-- STEP 1: Drop existing tables (if any)
-- Copy and run this first:
-- =============================================================================

DROP TABLE IF EXISTS demo.stores;

-- STEP 2: Create stores table
-- Copy and run this second:
-- =============================================================================

CREATE TABLE demo.stores (
  id INTEGER PRIMARY KEY,
  store_name TEXT,
  location GEO_POINT,
  address TEXT,
  city TEXT,
  state TEXT,
  category TEXT,
  revenue DOUBLE,
  employees INTEGER
);

-- STEP 3: Insert store locations (Part 1 - New York & California)
-- Copy and run this third:
-- =============================================================================

INSERT INTO demo.stores (id, store_name, location, address, city, state, category, revenue, employees) VALUES
(1, 'Manhattan Flagship', [40.7589, -73.9851], '1 Times Square', 'New York', 'NY', 'Flagship', 2500000.00, 45),
(2, 'Brooklyn Heights', [40.6959, -73.9931], '123 Montague St', 'Brooklyn', 'NY', 'Retail', 850000.00, 15),
(3, 'Queens Center', [40.7347, -73.8694], '90-15 Queens Blvd', 'Queens', 'NY', 'Retail', 720000.00, 12),
(4, 'SF Market Street', [37.7897, -122.4011], '1 Market St', 'San Francisco', 'CA', 'Flagship', 1950000.00, 38),
(5, 'Mission District', [37.7599, -122.4148], '3200 16th St', 'San Francisco', 'CA', 'Retail', 680000.00, 10),
(6, 'Fishermans Wharf', [37.8080, -122.4177], 'Pier 39', 'San Francisco', 'CA', 'Retail', 920000.00, 18),
(7, 'Hollywood Boulevard', [34.1016, -118.3406], '6801 Hollywood Blvd', 'Los Angeles', 'CA', 'Flagship', 2100000.00, 42),
(8, 'Santa Monica', [34.0195, -118.4912], '1315 3rd St Promenade', 'Santa Monica', 'CA', 'Retail', 1150000.00, 22),
(9, 'Beverly Hills', [34.0736, -118.4004], '9570 Wilshire Blvd', 'Beverly Hills', 'CA', 'Premium', 3200000.00, 55);

-- STEP 4: Insert store locations (Part 2 - Chicago, Miami, Others)
-- Copy and run this fourth:
-- =============================================================================

INSERT INTO demo.stores (id, store_name, location, address, city, state, category, revenue, employees) VALUES
(10, 'Magnificent Mile', [41.8955, -87.6244], '835 N Michigan Ave', 'Chicago', 'IL', 'Flagship', 1800000.00, 35),
(11, 'Wicker Park', [41.9097, -87.6776], '1443 N Milwaukee Ave', 'Chicago', 'IL', 'Retail', 590000.00, 11),
(12, 'Lincoln Park', [41.9217, -87.6542], '2104 N Halsted St', 'Chicago', 'IL', 'Retail', 740000.00, 14),
(13, 'South Beach', [25.7907, -80.1300], '1111 Lincoln Rd', 'Miami Beach', 'FL', 'Flagship', 1650000.00, 32),
(14, 'Brickell', [25.7670, -80.1918], '701 S Miami Ave', 'Miami', 'FL', 'Retail', 890000.00, 16),
(15, 'Pike Place Market', [47.6097, -122.3421], '93 Pike St', 'Seattle', 'WA', 'Flagship', 1450000.00, 28);

-- STEP 5: Verify store data
-- Copy and run this fifth:
-- =============================================================================

SELECT
  id,
  store_name,
  city,
  state,
  category,
  ROUND(revenue, 2) as revenue,
  employees,
  latitude(location) as lat,
  longitude(location) as lon
FROM demo.stores
ORDER BY state, city;

-- Expected: 15 stores across 7 US cities

-- =============================================================================
-- Now you can use these queries in Geospatial Data Tools page!
-- =============================================================================

-- DEMO QUERY 1: Find all California stores
-- =============================================================================

SELECT
  id,
  store_name as name,
  latitude(location) as latitude,
  longitude(location) as longitude,
  city,
  category,
  ROUND(revenue, 2) as revenue
FROM demo.stores
WHERE state = 'CA'
ORDER BY revenue DESC;

-- DEMO QUERY 2: Find stores within 50km of Times Square
-- Times Square: 40.7589° N, 73.9851° W
-- =============================================================================

SELECT
  id,
  store_name as name,
  latitude(location) as latitude,
  longitude(location) as longitude,
  city,
  ROUND(distance(location, 'POINT(-73.9851 40.7589)') / 1000, 2) as distance_km
FROM demo.stores
WHERE distance(location, 'POINT(-73.9851 40.7589)') < 50000
ORDER BY distance(location, 'POINT(-73.9851 40.7589)');

-- DEMO QUERY 3: Find 5 closest stores to Downtown LA
-- Downtown LA: 34.0522° N, 118.2437° W
-- =============================================================================

SELECT
  store_name as name,
  city,
  latitude(location) as latitude,
  longitude(location) as longitude,
  category,
  ROUND(distance(location, 'POINT(-118.2437 34.0522)') / 1000, 2) as distance_km
FROM demo.stores
ORDER BY distance(location, 'POINT(-118.2437 34.0522)')
LIMIT 5;

-- DEMO QUERY 4: Store count and metrics by city
-- =============================================================================

SELECT
  city,
  state,
  COUNT(*) as store_count,
  ROUND(AVG(revenue), 2) as avg_revenue,
  SUM(employees) as total_employees
FROM demo.stores
GROUP BY city, state
ORDER BY store_count DESC, avg_revenue DESC;

-- =============================================================================
-- READY FOR DEMO!
-- You now have 15 stores ready to visualize on the map
-- =============================================================================
