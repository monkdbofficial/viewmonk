-- =============================================================================
-- GEOSPATIAL DATA TOOLS DEMO - Sample Dataset Setup
-- =============================================================================
-- This script creates sample geospatial data for demonstrating the
-- Geospatial Data Tools feature in MonkDB Workbench
--
-- Use Cases: Store locations, delivery tracking, geographic analysis
-- Data: Real-world locations across major US cities
-- Includes: Points, polygons, spatial queries
-- =============================================================================

-- Step 1: Create Stores Table (Point Data)
-- Note: In CrateDB, schemas are created automatically when you create a table
-- No explicit CREATE SCHEMA statement is needed
-- =============================================================================
DROP TABLE IF EXISTS demo.stores;

CREATE TABLE demo.stores (
  id INTEGER PRIMARY KEY,
  store_name TEXT,
  location GEO_POINT,
  address TEXT,
  city TEXT,
  state TEXT,
  category TEXT,
  revenue DOUBLE,
  employees INTEGER,
  opened_date TIMESTAMP
);

-- Insert sample store locations across major US cities
INSERT INTO demo.stores (id, store_name, location, address, city, state, category, revenue, employees, opened_date)
VALUES
  -- New York Stores
  (1, 'Manhattan Flagship', [40.7589, -73.9851], '1 Times Square', 'New York', 'NY', 'Flagship', 2500000.00, 45, '2020-01-15'),
  (2, 'Brooklyn Heights', [40.6959, -73.9931], '123 Montague St', 'Brooklyn', 'NY', 'Retail', 850000.00, 15, '2021-03-20'),
  (3, 'Queens Center', [40.7347, -73.8694], '90-15 Queens Blvd', 'Queens', 'NY', 'Retail', 720000.00, 12, '2021-06-10'),

  -- San Francisco Stores
  (4, 'SF Market Street', [37.7897, -122.4011], '1 Market St', 'San Francisco', 'CA', 'Flagship', 1950000.00, 38, '2019-11-01'),
  (5, 'Mission District', [37.7599, -122.4148], '3200 16th St', 'San Francisco', 'CA', 'Retail', 680000.00, 10, '2022-02-14'),
  (6, 'Fishermans Wharf', [37.8080, -122.4177], 'Pier 39', 'San Francisco', 'CA', 'Retail', 920000.00, 18, '2020-08-25'),

  -- Los Angeles Stores
  (7, 'Hollywood Boulevard', [34.1016, -118.3406], '6801 Hollywood Blvd', 'Los Angeles', 'CA', 'Flagship', 2100000.00, 42, '2018-05-20'),
  (8, 'Santa Monica', [34.0195, -118.4912], '1315 3rd St Promenade', 'Santa Monica', 'CA', 'Retail', 1150000.00, 22, '2020-09-15'),
  (9, 'Beverly Hills', [34.0736, -118.4004], '9570 Wilshire Blvd', 'Beverly Hills', 'CA', 'Premium', 3200000.00, 55, '2017-12-01'),

  -- Chicago Stores
  (10, 'Magnificent Mile', [41.8955, -87.6244], '835 N Michigan Ave', 'Chicago', 'IL', 'Flagship', 1800000.00, 35, '2019-04-10'),
  (11, 'Wicker Park', [41.9097, -87.6776], '1443 N Milwaukee Ave', 'Chicago', 'IL', 'Retail', 590000.00, 11, '2021-10-05'),
  (12, 'Lincoln Park', [41.9217, -87.6542], '2104 N Halsted St', 'Chicago', 'IL', 'Retail', 740000.00, 14, '2022-01-20'),

  -- Miami Stores
  (13, 'South Beach', [25.7907, -80.1300], '1111 Lincoln Rd', 'Miami Beach', 'FL', 'Flagship', 1650000.00, 32, '2020-12-12'),
  (14, 'Brickell', [25.7670, -80.1918], '701 S Miami Ave', 'Miami', 'FL', 'Retail', 890000.00, 16, '2021-07-18'),
  (15, 'Coconut Grove', [25.7261, -80.2422], '3390 Mary St', 'Miami', 'FL', 'Retail', 620000.00, 9, '2022-03-05'),

  -- Seattle Stores
  (16, 'Pike Place Market', [47.6097, -122.3421], '93 Pike St', 'Seattle', 'WA', 'Flagship', 1450000.00, 28, '2020-02-28'),
  (17, 'Capitol Hill', [47.6205, -122.3212], '1511 10th Ave', 'Seattle', 'WA', 'Retail', 670000.00, 13, '2021-09-22'),
  (18, 'Fremont', [47.6513, -122.3501], '3400 Fremont Ave N', 'Seattle', 'WA', 'Retail', 550000.00, 8, '2022-05-14'),

  -- Boston Stores
  (19, 'Newbury Street', [42.3505, -71.0844], '338 Newbury St', 'Boston', 'MA', 'Flagship', 1350000.00, 26, '2019-08-05'),
  (20, 'Cambridge', [42.3736, -71.1097], '1 Cambridge Center', 'Cambridge', 'MA', 'Retail', 780000.00, 15, '2021-11-30'),

  -- Austin Stores
  (21, '6th Street', [30.2672, -97.7431], '523 E 6th St', 'Austin', 'TX', 'Retail', 820000.00, 17, '2020-10-08'),
  (22, 'South Congress', [30.2529, -97.7501], '1500 S Congress Ave', 'Austin', 'TX', 'Retail', 710000.00, 14, '2021-12-15'),

  -- Denver Stores
  (23, 'LoDo', [39.7539, -105.0021], '1616 17th St', 'Denver', 'CO', 'Flagship', 1250000.00, 24, '2020-06-20'),
  (24, 'Cherry Creek', [39.7168, -104.9538], '3000 E 1st Ave', 'Denver', 'CO', 'Premium', 1580000.00, 30, '2019-09-12'),

  -- Portland Stores
  (25, 'Pearl District', [45.5266, -122.6825], '1001 NW Lovejoy St', 'Portland', 'OR', 'Retail', 690000.00, 13, '2021-04-25');

-- Step 3: Create Delivery Zones Table (Polygon Data)
-- =============================================================================
DROP TABLE IF EXISTS demo.delivery_zones;

CREATE TABLE demo.delivery_zones (
  id INTEGER PRIMARY KEY,
  zone_name TEXT,
  zone_area GEO_SHAPE,
  city TEXT,
  delivery_fee DOUBLE,
  estimated_time_minutes INTEGER,
  active BOOLEAN
);

-- Insert delivery zone polygons (sample zones around major cities)
INSERT INTO demo.delivery_zones (id, zone_name, zone_area, city, delivery_fee, estimated_time_minutes, active)
VALUES
  -- New York - Manhattan Zone
  (1, 'Manhattan Core',
   'POLYGON((-73.9950 40.7589, -73.9750 40.7589, -73.9750 40.7789, -73.9950 40.7789, -73.9950 40.7589))',
   'New York', 5.00, 30, true),

  -- San Francisco - Downtown Zone
  (2, 'SF Downtown',
   'POLYGON((-122.4150 37.7750, -122.3900 37.7750, -122.3900 37.8000, -122.4150 37.8000, -122.4150 37.7750))',
   'San Francisco', 7.00, 25, true),

  -- Los Angeles - Hollywood Zone
  (3, 'Hollywood Area',
   'POLYGON((-118.3600 34.0900, -118.3200 34.0900, -118.3200 34.1200, -118.3600 34.1200, -118.3600 34.0900))',
   'Los Angeles', 6.00, 35, true),

  -- Chicago - Downtown Zone
  (4, 'Chicago Loop',
   'POLYGON((-87.6400 41.8750, -87.6100 41.8750, -87.6100 41.9050, -87.6400 41.9050, -87.6400 41.8750))',
   'Chicago', 5.50, 28, true),

  -- Miami - South Beach Zone
  (5, 'South Beach Area',
   'POLYGON((-80.1450 25.7700, -80.1200 25.7700, -80.1200 25.8000, -80.1450 25.8000, -80.1450 25.7700))',
   'Miami', 8.00, 20, true);

-- Step 4: Create Customer Orders Table (with pickup/delivery locations)
-- =============================================================================
DROP TABLE IF EXISTS demo.customer_orders;

CREATE TABLE demo.customer_orders (
  order_id INTEGER PRIMARY KEY,
  store_id INTEGER,
  customer_location GEO_POINT,
  delivery_location GEO_POINT,
  order_date TIMESTAMP,
  order_amount DOUBLE,
  distance_km DOUBLE,
  status TEXT
);

-- Insert sample orders with customer and delivery locations
INSERT INTO demo.customer_orders (order_id, store_id, customer_location, delivery_location, order_date, order_amount, distance_km, status)
VALUES
  -- Orders from Manhattan Flagship (store_id: 1)
  (1001, 1, [40.7614, -73.9776], [40.7614, -73.9776], CURRENT_TIMESTAMP - INTERVAL '2 hours', 125.50, 0.5, 'Delivered'),
  (1002, 1, [40.7489, -73.9680], [40.7489, -73.9680], CURRENT_TIMESTAMP - INTERVAL '1 hour', 89.99, 1.2, 'In Transit'),
  (1003, 1, [40.7558, -73.9862], [40.7558, -73.9862], CURRENT_TIMESTAMP - INTERVAL '30 minutes', 210.00, 0.3, 'Preparing'),

  -- Orders from SF Market Street (store_id: 4)
  (1004, 4, [37.7956, -122.3933], [37.7956, -122.3933], CURRENT_TIMESTAMP - INTERVAL '3 hours', 156.75, 0.8, 'Delivered'),
  (1005, 4, [37.7833, -122.4167], [37.7833, -122.4167], CURRENT_TIMESTAMP - INTERVAL '45 minutes', 98.50, 1.5, 'In Transit'),

  -- Orders from Hollywood Boulevard (store_id: 7)
  (1006, 7, [34.0928, -118.3287], [34.0928, -118.3287], CURRENT_TIMESTAMP - INTERVAL '4 hours', 342.00, 1.0, 'Delivered'),
  (1007, 7, [34.1141, -118.3534], [34.1141, -118.3534], CURRENT_TIMESTAMP - INTERVAL '2 hours', 275.99, 2.1, 'Delivered'),
  (1008, 7, [34.0971, -118.3381], [34.0971, -118.3381], CURRENT_TIMESTAMP - INTERVAL '20 minutes', 145.00, 0.6, 'Preparing'),

  -- Orders from Chicago Magnificent Mile (store_id: 10)
  (1009, 10, [41.8981, -87.6231], [41.8981, -87.6231], CURRENT_TIMESTAMP - INTERVAL '5 hours', 189.50, 0.4, 'Delivered'),
  (1010, 10, [41.9023, -87.6313], [41.9023, -87.6313], CURRENT_TIMESTAMP - INTERVAL '1 hour', 67.25, 0.9, 'In Transit'),

  -- Orders from Miami South Beach (store_id: 13)
  (1011, 13, [25.7825, -80.1340], [25.7825, -80.1340], CURRENT_TIMESTAMP - INTERVAL '6 hours', 420.00, 0.7, 'Delivered'),
  (1012, 13, [25.7952, -80.1298], [25.7952, -80.1298], CURRENT_TIMESTAMP - INTERVAL '3 hours', 156.80, 1.1, 'Delivered'),
  (1013, 13, [25.7863, -80.1389], [25.7863, -80.1389], CURRENT_TIMESTAMP - INTERVAL '15 minutes', 92.00, 0.5, 'Preparing');

-- Step 5: Create Points of Interest Table
-- =============================================================================
DROP TABLE IF EXISTS demo.points_of_interest;

CREATE TABLE demo.points_of_interest (
  id INTEGER PRIMARY KEY,
  name TEXT,
  location GEO_POINT,
  category TEXT,
  city TEXT,
  rating DOUBLE,
  visit_count INTEGER
);

-- Insert famous landmarks and points of interest
INSERT INTO demo.points_of_interest (id, name, location, category, city, rating, visit_count)
VALUES
  -- New York
  (1, 'Statue of Liberty', [40.6892, -74.0445], 'Landmark', 'New York', 4.8, 125000),
  (2, 'Central Park', [40.7829, -73.9654], 'Park', 'New York', 4.9, 250000),
  (3, 'Empire State Building', [40.7484, -73.9857], 'Landmark', 'New York', 4.7, 180000),

  -- San Francisco
  (4, 'Golden Gate Bridge', [37.8199, -122.4783], 'Landmark', 'San Francisco', 4.9, 320000),
  (5, 'Alcatraz Island', [37.8267, -122.4233], 'Historic', 'San Francisco', 4.6, 145000),
  (6, 'Lombard Street', [37.8021, -122.4187], 'Landmark', 'San Francisco', 4.3, 95000),

  -- Los Angeles
  (7, 'Hollywood Sign', [34.1341, -118.3215], 'Landmark', 'Los Angeles', 4.5, 210000),
  (8, 'Venice Beach', [33.9850, -118.4695], 'Beach', 'Los Angeles', 4.4, 175000),
  (9, 'Griffith Observatory', [34.1184, -118.3004], 'Landmark', 'Los Angeles', 4.8, 160000),

  -- Chicago
  (10, 'Cloud Gate (The Bean)', [41.8827, -87.6233], 'Art', 'Chicago', 4.7, 190000),
  (11, 'Navy Pier', [41.8919, -87.6051], 'Entertainment', 'Chicago', 4.5, 220000),
  (12, 'Willis Tower', [41.8789, -87.6359], 'Landmark', 'Chicago', 4.6, 155000),

  -- Miami
  (13, 'Art Deco District', [25.7814, -80.1300], 'Historic', 'Miami', 4.6, 140000),
  (14, 'Vizcaya Museum', [25.7444, -80.2106], 'Museum', 'Miami', 4.7, 85000),
  (15, 'Wynwood Walls', [25.8010, -80.1994], 'Art', 'Miami', 4.8, 125000);

-- Step 6: Create Verification Queries
-- =============================================================================

-- View all stores
SELECT
  id,
  store_name,
  city,
  state,
  category,
  CONCAT('POINT(', longitude(location), ' ', latitude(location), ')') as wkt_location
FROM demo.stores
ORDER BY state, city;

-- Count by category
SELECT
  category,
  COUNT(*) as store_count,
  ROUND(AVG(revenue), 2) as avg_revenue,
  SUM(employees) as total_employees
FROM demo.stores
GROUP BY category
ORDER BY store_count DESC;

-- Verify delivery zones
SELECT
  id,
  zone_name,
  city,
  delivery_fee,
  estimated_time_minutes,
  active
FROM demo.delivery_zones
ORDER BY city;

-- Recent orders summary
SELECT
  COUNT(*) as total_orders,
  COUNT(DISTINCT store_id) as stores_with_orders,
  ROUND(AVG(order_amount), 2) as avg_order_value,
  ROUND(AVG(distance_km), 2) as avg_delivery_distance,
  COUNT(CASE WHEN status = 'Delivered' THEN 1 END) as delivered,
  COUNT(CASE WHEN status = 'In Transit' THEN 1 END) as in_transit,
  COUNT(CASE WHEN status = 'Preparing' THEN 1 END) as preparing
FROM demo.customer_orders;

-- Points of interest by city
SELECT
  city,
  COUNT(*) as poi_count,
  ROUND(AVG(rating), 2) as avg_rating,
  SUM(visit_count) as total_visits
FROM demo.points_of_interest
GROUP BY city
ORDER BY total_visits DESC;

-- =============================================================================
-- DATA SUMMARY
-- =============================================================================
SELECT 'Stores' AS table_name, COUNT(*) AS record_count FROM demo.stores
UNION ALL
SELECT 'Delivery Zones', COUNT(*) FROM demo.delivery_zones
UNION ALL
SELECT 'Customer Orders', COUNT(*) FROM demo.customer_orders
UNION ALL
SELECT 'Points of Interest', COUNT(*) FROM demo.points_of_interest;

-- Expected Results:
-- Stores: 25 records (across 10 US cities)
-- Delivery Zones: 5 polygons
-- Customer Orders: 13 orders
-- Points of Interest: 15 landmarks

-- =============================================================================
-- DEMO READY!
-- =============================================================================
-- You now have:
-- ✓ 25 store locations across 10 major US cities
-- ✓ 5 delivery zone polygons with coverage areas
-- ✓ 13 customer orders with pickup/delivery locations
-- ✓ 15 famous landmarks and points of interest
-- ✓ Mix of GEO_POINT and GEO_SHAPE data types
-- ✓ Realistic revenue, employee, and rating data
--
-- Next Steps:
-- 1. Go to Geospatial Data Tools page in MonkDB Workbench
-- 2. Use the Query Builder to execute spatial queries
-- 3. View results on the interactive map
-- =============================================================================
