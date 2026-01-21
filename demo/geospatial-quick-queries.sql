-- =============================================================================
-- GEOSPATIAL DATA TOOLS - WORKING DEMO QUERIES
-- =============================================================================
-- These queries work with monkdb.stores table (15 stores)
-- Copy and paste into Query Builder tab in Geospatial Data Tools
-- =============================================================================

-- QUERY 1: View All 15 Stores on Map
-- Shows all store locations across USA
-- =============================================================================

SELECT
  id,
  store_name as name,
  latitude(location) as latitude,
  longitude(location) as longitude,
  city,
  state,
  category,
  ROUND(revenue, 2) as revenue
FROM monkdb.stores
ORDER BY state, city;


-- QUERY 2: Find All California Stores
-- Shows only CA stores (6 total)
-- =============================================================================

SELECT
  id,
  store_name as name,
  latitude(location) as latitude,
  longitude(location) as longitude,
  city,
  category,
  ROUND(revenue, 2) as revenue
FROM monkdb.stores
WHERE state = 'CA'
ORDER BY revenue DESC;


-- QUERY 3: Stores Within 50km of Times Square
-- Proximity search - finds nearby stores
-- =============================================================================

SELECT
  id,
  store_name as name,
  latitude(location) as latitude,
  longitude(location) as longitude,
  city,
  ROUND(distance(location, 'POINT(-73.9851 40.7589)') / 1000, 2) as distance_km
FROM monkdb.stores
WHERE distance(location, 'POINT(-73.9851 40.7589)') < 50000
ORDER BY distance(location, 'POINT(-73.9851 40.7589)');


-- QUERY 4: 5 Nearest Stores to Downtown LA
-- Store locator - finds closest stores
-- =============================================================================

SELECT
  store_name as name,
  city,
  latitude(location) as latitude,
  longitude(location) as longitude,
  category,
  ROUND(distance(location, 'POINT(-118.2437 34.0522)') / 1000, 2) as distance_km
FROM monkdb.stores
ORDER BY distance(location, 'POINT(-118.2437 34.0522)')
LIMIT 5;


-- QUERY 5: All Flagship Stores
-- Filter by category
-- =============================================================================

SELECT
  id,
  store_name as name,
  latitude(location) as latitude,
  longitude(location) as longitude,
  city,
  state,
  ROUND(revenue, 2) as revenue,
  employees
FROM monkdb.stores
WHERE category = 'Flagship'
ORDER BY revenue DESC;


-- QUERY 6: High Revenue Stores (Over $1M)
-- Business analytics with location
-- =============================================================================

SELECT
  id,
  store_name as name,
  latitude(location) as latitude,
  longitude(location) as longitude,
  city,
  state,
  category,
  ROUND(revenue, 2) as revenue
FROM monkdb.stores
WHERE revenue > 1000000
ORDER BY revenue DESC;


-- QUERY 7: Store Count and Metrics by State
-- Aggregate geospatial data
-- =============================================================================

SELECT
  state,
  COUNT(*) as store_count,
  ROUND(AVG(revenue), 2) as avg_revenue,
  ROUND(SUM(revenue), 2) as total_revenue,
  SUM(employees) as total_employees
FROM monkdb.stores
GROUP BY state
ORDER BY store_count DESC, total_revenue DESC;


-- =============================================================================
-- All queries above work perfectly with your loaded demo data!
-- Just copy and paste into the Query Builder in Geospatial Data Tools page.
-- =============================================================================
