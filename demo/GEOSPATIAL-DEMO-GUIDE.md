# Geospatial Data Tools Demo Guide

## 🌍 Overview
The Geospatial Data Tools feature provides comprehensive capabilities for storing, querying, and visualizing location-based data in MonkDB Workbench.

**Perfect for:** Store locations, delivery tracking, proximity search, geographic analysis, fleet management, location-based services

---

## 📋 Pre-Demo Setup (5 minutes)

### Step 1: Run the Sample Data Script

1. Open **Query Editor** in MonkDB Workbench
2. Load the file: `demo/geospatial-demo-setup.sql`
3. Execute the entire script (Cmd/Ctrl + Enter)
4. Wait for completion (creates 58 geospatial records)

### Step 2: Verify Data

Run this quick verification:

```sql
-- Check all tables
SELECT 'Stores' AS table_name, COUNT(*) AS records FROM demo.stores
UNION ALL
SELECT 'Delivery Zones', COUNT(*) FROM demo.delivery_zones
UNION ALL
SELECT 'Customer Orders', COUNT(*) FROM demo.customer_orders
UNION ALL
SELECT 'Points of Interest', COUNT(*) FROM demo.points_of_interest;

-- Expected results:
-- Stores: 25 records
-- Delivery Zones: 5 polygons
-- Customer Orders: 13 orders
-- Points of Interest: 15 landmarks
```

---

## 🎬 Demo Script (10-12 minutes)

### **Introduction (1 minute)**

> "Today I'll demonstrate our Geospatial Data Tools, which allow you to store, query, and visualize location data. This is essential for businesses with physical locations, delivery services, field operations, or any location-based analytics."

**Navigate to:** Geospatial Data Tools page

**Point out the 3 main tabs:**
1. 🗺️ **Map View** - Interactive map visualization
2. 🔍 **Query Builder** - Spatial query interface
3. 📤 **Import/Export** - Data import tools

**Point out the side panel:**
- Selected coordinates display
- SQL query templates
- Query results
- Supported data types

---

### **Demo Part 1: Map Visualization (2 minutes)**

#### Show Map Features

> "Let's start with the Map View - our interactive visualization layer."

1. Click **"Map View"** tab
2. Initially shows empty state with instructions
3. Explain: *"The map will populate once we execute a geospatial query. Let's load some data."*

---

### **Demo Part 2: Basic Spatial Query (3 minutes)**

#### Execute Your First Query

> "Now let's query our store locations and visualize them on the map."

1. Click **"Query Builder"** tab
2. **Show the query interface**
3. **Copy and paste this query:**

```sql
-- Find all stores in California
SELECT
  id,
  store_name as name,
  latitude(location) as latitude,
  longitude(location) as longitude,
  city,
  category,
  revenue,
  employees
FROM demo.stores
WHERE state = 'CA'
ORDER BY revenue DESC;
```

4. Click **"Execute Query"** or press Cmd/Ctrl + Enter
5. **Results appear:**
   - Query results panel shows 6 California stores
   - Map automatically switches to **Map View**
   - 6 blue markers appear on the map (SF, LA, Santa Monica, Beverly Hills)

6. Explain: *"Notice how the system automatically detected the latitude/longitude columns and plotted them on the map. We have 6 stores in California ranging from San Francisco to Beverly Hills."*

#### Interact with Map

1. **Click on a marker** (e.g., Beverly Hills)
2. Show the popup with store details
3. Explain: *"Each marker is clickable and shows the store information"*

4. **Zoom in/out** using mouse wheel or map controls
5. **Pan** by dragging the map
6. Explain: *"The map is fully interactive - you can zoom, pan, and click to explore"*

---

### **Demo Part 3: Proximity Search (3 minutes)**

#### Find Stores Near a Location

> "One of the most powerful features is proximity search - finding locations within a certain distance."

1. Click **"Query Builder"** tab again
2. **Show the selected coordinates** in the side panel (if you clicked on map)
3. **Copy this proximity query:**

```sql
-- Find stores within 50km of Times Square, New York
-- Times Square coordinates: 40.7589° N, 73.9851° W
SELECT
  id,
  store_name as name,
  latitude(location) as latitude,
  longitude(location) as longitude,
  city,
  category,
  ROUND(distance(location, 'POINT(-73.9851 40.7589)') / 1000, 2) as distance_km
FROM demo.stores
WHERE distance(location, 'POINT(-73.9851 40.7589)') < 50000  -- 50km in meters
ORDER BY distance(location, 'POINT(-73.9851 40.7589)');
```

4. Click **"Execute Query"**
5. **Results show:**
   - Manhattan Flagship: 0.06 km away
   - Brooklyn Heights: 4.21 km away
   - Queens Center: 9.85 km away

6. Explain: *"The distance() function calculates the great-circle distance between two points. We're finding all stores within 50 kilometers of Times Square, sorted by closest first. This is perfect for 'find nearest store' features."*

#### Point Out Key Features

- **distance()** function returns meters
- Results sorted by proximity
- Useful for mobile apps, store locators
- Can adjust radius dynamically

---

### **Demo Part 4: Polygon Queries (2 minutes)**

#### Find Points Within an Area

> "We can also query points within a defined area - like a delivery zone or service area."

1. **Copy this polygon query:**

```sql
-- Find stores within Manhattan delivery zone
SELECT
  s.id,
  s.store_name as name,
  latitude(s.location) as latitude,
  longitude(s.location) as longitude,
  s.city,
  ROUND(s.revenue, 2) as revenue
FROM demo.stores s
WHERE within(
  s.location,
  'POLYGON((-74.0200 40.7000, -73.9500 40.7000, -73.9500 40.8000, -74.0200 40.8000, -74.0200 40.7000))'
);
```

2. Click **"Execute Query"**
3. **Results show stores within the Manhattan polygon**

4. Explain: *"The within() function checks if a point falls inside a polygon. This is essential for delivery zone management, service area verification, or geofencing applications. The polygon is defined by a series of coordinates forming a closed shape."*

#### Show Delivery Zones

```sql
-- View all delivery zones with their coverage areas
SELECT
  id,
  zone_name as name,
  city,
  delivery_fee,
  estimated_time_minutes,
  active
FROM demo.delivery_zones
WHERE active = true
ORDER BY city;
```

5. Explain: *"Each delivery zone is a polygon shape covering a specific area. We can calculate fees, estimate delivery times, and manage service areas geographically."*

---

### **Demo Part 5: Advanced Spatial Analysis (2 minutes)**

#### Multi-Criteria Geospatial Query

> "Let's combine spatial queries with business logic for real-world scenarios."

**Query: Find high-revenue stores near landmarks**

```sql
-- Find stores within 5km of tourist attractions (points of interest)
SELECT
  s.store_name,
  s.city,
  s.revenue,
  poi.name as nearby_landmark,
  poi.category as landmark_type,
  ROUND(distance(s.location, poi.location) / 1000, 2) as distance_km
FROM demo.stores s
CROSS JOIN demo.points_of_interest poi
WHERE distance(s.location, poi.location) < 5000  -- Within 5km
  AND s.revenue > 1000000  -- High-revenue stores only
ORDER BY s.revenue DESC, distance_km;
```

**Results show:**
- Beverly Hills store near Hollywood Sign (8.7 km)
- Hollywood Boulevard near Griffith Observatory (3.2 km)
- Manhattan Flagship near Empire State Building (0.8 km)

Explain: *"This query finds our high-revenue stores that are close to tourist attractions - perfect for understanding which locations benefit from foot traffic. We're joining two geospatial tables and applying both business and spatial criteria."*

---

### **Demo Part 6: Interactive Features (1 minute)**

#### Click on Map to Get Coordinates

1. Return to **"Map View"** tab
2. **Click anywhere on the map**
3. **Side panel updates** with selected coordinates:
   - Latitude: 40.758900
   - Longitude: -73.985100
   - WKT format: `POINT(-73.985100 40.758900)`

4. Explain: *"When you click the map, coordinates are captured in the side panel. You can copy these and use them in your spatial queries."*

#### Use SQL Templates

1. Scroll to **"SQL Templates"** in side panel
2. Show the 3 built-in templates:
   - **Points within radius**
   - **Points in polygon**
   - **Intersecting shapes**

3. Click **"Copy"** on any template
4. Explain: *"These templates provide starting points for common spatial queries. Just replace the placeholders with your actual table and column names."*

---

## 📊 Sample Queries for Live Demo

### Query 1: Store Density by City

```sql
-- Count stores per city with average metrics
SELECT
  city,
  state,
  COUNT(*) as store_count,
  ROUND(AVG(revenue), 2) as avg_revenue,
  SUM(employees) as total_employees,
  ROUND(AVG(revenue) / COUNT(*), 2) as revenue_per_store
FROM demo.stores
GROUP BY city, state
HAVING COUNT(*) > 1
ORDER BY store_count DESC, avg_revenue DESC;
```

**What to highlight:**
- New York has 3 stores with highest average revenue
- San Francisco has 3 stores with strong performance
- Shows geographic concentration

---

### Query 2: Delivery Coverage Analysis

```sql
-- Find stores NOT covered by delivery zones
SELECT
  s.id,
  s.store_name,
  s.city,
  s.state,
  latitude(s.location) as latitude,
  longitude(s.location) as longitude,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM demo.delivery_zones dz
      WHERE within(s.location, dz.zone_area)
    ) THEN 'Covered'
    ELSE 'Not Covered'
  END as delivery_coverage
FROM demo.stores s
ORDER BY delivery_coverage, state, city;
```

**What to highlight:**
- Identifies stores without delivery zone coverage
- Helps plan service expansion
- Visual gap analysis

---

### Query 3: Order Delivery Distance Analysis

```sql
-- Analyze delivery distances and patterns
SELECT
  s.store_name,
  s.city,
  COUNT(o.order_id) as total_orders,
  ROUND(AVG(o.distance_km), 2) as avg_delivery_distance,
  ROUND(AVG(o.order_amount), 2) as avg_order_value,
  MAX(o.distance_km) as max_delivery_distance,
  o.status
FROM demo.customer_orders o
JOIN demo.stores s ON o.store_id = s.id
GROUP BY s.store_name, s.city, o.status
ORDER BY total_orders DESC;
```

**What to highlight:**
- Manhattan Flagship has shortest average delivery distance
- Correlate delivery distance with order value
- Status breakdown (Delivered, In Transit, Preparing)

---

### Query 4: Find Closest Store to Any Point

```sql
-- Find the 3 closest stores to a given location
-- Example: Location in downtown Los Angeles (34.0522° N, 118.2437° W)
SELECT
  store_name,
  city,
  category,
  ROUND(distance(location, 'POINT(-118.2437 34.0522)') / 1000, 2) as distance_km,
  CONCAT(
    'https://maps.google.com/?q=',
    latitude(location),
    ',',
    longitude(location)
  ) as google_maps_link
FROM demo.stores
ORDER BY distance(location, 'POINT(-118.2437 34.0522)')
LIMIT 3;
```

**What to highlight:**
- Returns closest stores with exact distances
- Includes Google Maps links for navigation
- Limit to top 3 for "nearest store" feature

---

### Query 5: Geospatial Join - Stores Near Landmarks

```sql
-- Which stores are within 2km of major tourist attractions?
WITH store_poi_proximity AS (
  SELECT
    s.store_name,
    s.city as store_city,
    poi.name as poi_name,
    poi.category as poi_category,
    poi.visit_count,
    ROUND(distance(s.location, poi.location) / 1000, 2) as distance_km
  FROM demo.stores s
  CROSS JOIN demo.points_of_interest poi
  WHERE distance(s.location, poi.location) < 2000  -- Within 2km
)
SELECT * FROM store_poi_proximity
ORDER BY distance_km
LIMIT 15;
```

**What to highlight:**
- Spatial joins to correlate stores with foot traffic
- Identifies stores near high-traffic tourist spots
- Useful for marketing and location planning

---

### Query 6: Create New Delivery Zone (INSERT Example)

```sql
-- Add a new delivery zone for Seattle
INSERT INTO demo.delivery_zones (id, zone_name, zone_area, city, delivery_fee, estimated_time_minutes, active)
VALUES (
  6,
  'Seattle Downtown',
  'POLYGON((-122.3500 47.6000, -122.3200 47.6000, -122.3200 47.6200, -122.3500 47.6200, -122.3500 47.6000))',
  'Seattle',
  6.50,
  22,
  true
);

-- Verify insertion
SELECT * FROM demo.delivery_zones WHERE city = 'Seattle';
```

**What to highlight:**
- Can insert new geospatial data via SQL
- Polygon coordinates define service boundary
- Immediate availability for spatial queries

---

### Query 7: Revenue Heatmap Data

```sql
-- Generate data for a revenue heatmap visualization
SELECT
  city,
  state,
  category,
  latitude(location) as latitude,
  longitude(location) as longitude,
  revenue,
  employees,
  ROUND(revenue / employees, 2) as revenue_per_employee
FROM demo.stores
ORDER BY revenue DESC;
```

**What to highlight:**
- Data ready for external mapping tools
- Revenue per employee metric
- Can export as CSV for Tableau, Power BI, etc.

---

### Query 8: Store Clustering Analysis

```sql
-- Find stores clustered in the same area (within 10km of each other)
SELECT
  s1.store_name as store_1,
  s2.store_name as store_2,
  s1.city as city_1,
  s2.city as city_2,
  ROUND(distance(s1.location, s2.location) / 1000, 2) as distance_km
FROM demo.stores s1
CROSS JOIN demo.stores s2
WHERE s1.id < s2.id  -- Avoid duplicates and self-joins
  AND distance(s1.location, s2.location) < 10000  -- Within 10km
ORDER BY distance_km;
```

**What to highlight:**
- Identifies store cannibalization risks
- Helps optimize store placement
- Shows geographic clustering

---

### Query 9: Active Orders in Transit Map

```sql
-- Show current deliveries in progress on map
SELECT
  o.order_id,
  s.store_name as origin,
  latitude(o.customer_location) as latitude,
  longitude(o.customer_location) as longitude,
  ROUND(o.distance_km, 2) as delivery_distance,
  ROUND(o.order_amount, 2) as order_value,
  o.status,
  EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - o.order_date)) / 60 as minutes_ago
FROM demo.customer_orders o
JOIN demo.stores s ON o.store_id = s.id
WHERE o.status IN ('In Transit', 'Preparing')
ORDER BY o.order_date DESC;
```

**What to highlight:**
- Real-time delivery tracking
- Shows active orders on map
- Time since order placed

---

### Query 10: Bounding Box Query

```sql
-- Find all stores within a rectangular area (bounding box)
-- Southwest corner: (40.7, -74.0), Northeast corner: (40.8, -73.9)
SELECT
  id,
  store_name as name,
  city,
  category,
  latitude(location) as latitude,
  longitude(location) as longitude,
  revenue
FROM demo.stores
WHERE latitude(location) BETWEEN 40.7 AND 40.8
  AND longitude(location) BETWEEN -74.0 AND -73.9
ORDER BY revenue DESC;
```

**What to highlight:**
- Simple bounding box using lat/lon ranges
- Fast alternative to polygon queries
- Good for map viewport filtering

---

## 🎨 Visual Demo Tips

### Map Interactions

1. **Marker Clustering** - When zoomed out, nearby markers group
2. **Popup Details** - Click markers to see full information
3. **Drawing Tools** - Draw shapes directly on map (if enabled)
4. **Layer Controls** - Toggle different data layers

### Color Coding

- 🔵 **Blue Markers** - Store locations
- 🟢 **Green Polygons** - Delivery zones
- 🔴 **Red Markers** - Customer delivery locations
- 🟠 **Orange Markers** - Points of interest

### Performance

- Queries execute in real-time
- Map updates automatically
- Handles thousands of points efficiently
- Responsive zoom and pan

---

## 💡 Key Selling Points

### 1. **Native Geospatial Support**
- Built-in GEO_POINT and GEO_SHAPE types
- Optimized spatial indexing
- Standards-compliant (WKT, GeoJSON)

### 2. **Powerful Spatial Functions**
- **distance()** - Calculate distances between points
- **within()** - Check if point is inside polygon
- **intersects()** - Find overlapping geometries
- **latitude()** / **longitude()** - Extract coordinates

### 3. **Visual Analytics**
- Interactive map visualization
- Real-time query results
- Click-to-explore interface
- Export-ready data

### 4. **Real-World Use Cases**
- **Retail:** Store locators, site selection, trade area analysis
- **Logistics:** Route optimization, delivery zones, fleet tracking
- **Real Estate:** Property search, proximity analysis, market research
- **Marketing:** Customer demographics, catchment areas, geo-targeting
- **IoT:** Sensor locations, device tracking, coverage maps

### 5. **Integration Ready**
- Export to CSV for external tools
- GeoJSON support for web mapping
- API-friendly SQL queries
- Standards-compliant data formats

---

## ❓ Demo Q&A Preparation

### Q: What geospatial data types does MonkDB support?
**A:** MonkDB supports GEO_POINT (single coordinates) and GEO_SHAPE (polygons, lines, multi-polygons). Both use standard WKT and GeoJSON formats.

### Q: How accurate is the distance() function?
**A:** It uses the Haversine formula for great-circle distance calculation, accurate to within a few meters for most distances. Returns values in meters.

### Q: Can I import existing geospatial data?
**A:** Yes! Use the Import/Export tab to load GeoJSON files, CSV with lat/lon columns, or WKT-formatted data. Also supports standard SQL INSERT statements.

### Q: What's the performance like with millions of locations?
**A:** MonkDB uses spatial indexing for efficient queries. Proximity searches on millions of points typically return in milliseconds. Polygon queries are optimized with R-tree indexing.

### Q: Can I use this for real-time tracking?
**A:** Absolutely! Update locations via INSERT/UPDATE queries, then visualize on the map. Combine with time-series data for historical tracking.

### Q: Does it work with international coordinates?
**A:** Yes! Uses standard WGS84 coordinate system (latitude/longitude). Works worldwide, not limited to US locations.

### Q: Can I create custom delivery zones?
**A:** Yes! Draw polygons directly on the map (if drawing tools enabled) or insert them via SQL. Zones can be as complex as needed.

### Q: How do I integrate with Google Maps or other mapping services?
**A:** Export your data as GeoJSON or CSV, or use the coordinates in SQL results to generate links (as shown in Query 4).

---

## 🚀 Post-Demo Follow-Up

### Next Steps for Prospects

1. **Import their data:**
   - Provide data migration script
   - Help convert existing formats to GEO_POINT/GEO_SHAPE

2. **Design use cases:**
   - Store locator implementation
   - Delivery zone optimization
   - Site selection analysis

3. **API Integration:**
   - Query endpoints for location-based services
   - Real-time tracking dashboards
   - Mobile app integration

### Additional Resources

- Full documentation: `/docs/geospatial-tools.md`
- Spatial functions reference: `/docs/spatial-functions.md`
- GeoJSON format guide: `/docs/geojson-format.md`
- Sample datasets: `demo/` folder

---

## 📝 Demo Checklist

### Before Demo
- [ ] Run `geospatial-demo-setup.sql` script
- [ ] Verify data: Check all 4 tables created
- [ ] Test map loading (may take few seconds first time)
- [ ] Review this guide
- [ ] Prepare laptop/projector

### During Demo
- [ ] Navigate to Geospatial Data Tools page
- [ ] Show 3 main tabs (Map, Query, Import)
- [ ] Execute basic query to populate map
- [ ] Demonstrate proximity search
- [ ] Show polygon/zone queries
- [ ] Click map to show coordinate capture
- [ ] Copy and explain SQL templates
- [ ] Run 2-3 advanced queries
- [ ] Export data to CSV
- [ ] Answer questions

### After Demo
- [ ] Share demo guide with prospect
- [ ] Provide sample SQL scripts
- [ ] Discuss data migration plan
- [ ] Schedule technical workshop
- [ ] Gather feedback

---

## 🎯 Success Metrics

**Demo is successful if audience can:**
1. Understand how to store geospatial data (GEO_POINT, GEO_SHAPE)
2. Execute proximity and area-based queries
3. Visualize results on interactive map
4. See clear applications for their business
5. Envision integrating with existing systems

---

**Last Updated:** January 6, 2026
**Version:** 1.1.0
**Demo Duration:** 10-12 minutes
**Skill Level Required:** Beginner to Intermediate

---

## 📍 Sample Data Summary

**Stores (25 locations):**
- 10 major US cities (NY, SF, LA, Chicago, Miami, Seattle, Boston, Austin, Denver, Portland)
- 3 categories: Flagship, Retail, Premium
- Revenue range: $550K - $3.2M
- Employee count: 8-55 per store

**Delivery Zones (5 polygons):**
- Major metro areas
- Delivery fees: $5-$8
- Estimated times: 20-35 minutes

**Customer Orders (13 orders):**
- Multiple stores
- Various statuses (Delivered, In Transit, Preparing)
- Delivery distances: 0.3-2.1 km

**Points of Interest (15 landmarks):**
- Famous tourist attractions
- Ratings: 4.3-4.9 stars
- Visit counts: 85K-320K annually
