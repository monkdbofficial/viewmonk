-- =============================================================================
-- TIME-SERIES ANALYTICS DEMO - Sample Dataset Setup
-- =============================================================================
-- This script creates sample time-series data for demonstrating the
-- Time-Series Analytics feature in MonkDB Workbench
--
-- Use Case: IoT Sensor Monitoring
-- Data: Temperature, Humidity, and Pressure readings from multiple sensors
-- Time Range: Last 7 days with hourly data points
-- =============================================================================

-- Step 1: Create Time-Series Table
-- Note: In CrateDB, schemas are created automatically when you create a table
-- No explicit CREATE SCHEMA statement is needed
-- =============================================================================
DROP TABLE IF EXISTS demo.sensor_readings;

CREATE TABLE demo.sensor_readings (
  sensor_id TEXT,
  location TEXT,
  timestamp TIMESTAMP,
  temperature DOUBLE,
  humidity DOUBLE,
  pressure DOUBLE,
  cpu_usage DOUBLE,
  memory_usage DOUBLE,
  response_time DOUBLE,
  PRIMARY KEY (sensor_id, timestamp)
) WITH (
  number_of_replicas = '0-1',
  "column_policy" = 'dynamic'
);

-- Step 3: Insert Sample Data (Last 7 Days, Hourly)
-- =============================================================================
-- This generates realistic sensor data with some intentional anomalies

-- Office Sensors (sensor_01, sensor_02)
INSERT INTO demo.sensor_readings (sensor_id, location, timestamp, temperature, humidity, pressure, cpu_usage, memory_usage, response_time)
SELECT
  'sensor_01' AS sensor_id,
  'Office - Floor 1' AS location,
  CURRENT_TIMESTAMP - (hours * INTERVAL '1 hour') AS timestamp,
  -- Normal temperature: 20-24°C with some variation
  20 + 4 * random() +
    CASE
      WHEN hours = 48 THEN 15  -- Anomaly: Too cold (AC malfunction)
      WHEN hours = 96 THEN 12  -- Anomaly: Very cold
      ELSE 0
    END AS temperature,
  -- Normal humidity: 40-60%
  40 + 20 * random() AS humidity,
  -- Normal pressure: 1010-1020 hPa
  1010 + 10 * random() AS pressure,
  -- CPU usage: 20-80%
  20 + 60 * random() AS cpu_usage,
  -- Memory usage: 30-70%
  30 + 40 * random() AS memory_usage,
  -- Response time: 50-200ms with some spikes
  50 + 150 * random() +
    CASE
      WHEN hours = 72 THEN 500  -- Anomaly: Slow response
      ELSE 0
    END AS response_time
FROM generate_series(0, 167) AS hours;  -- 7 days * 24 hours = 168 data points

-- Warehouse Sensors (sensor_02)
INSERT INTO demo.sensor_readings (sensor_id, location, timestamp, temperature, humidity, pressure, cpu_usage, memory_usage, response_time)
SELECT
  'sensor_02' AS sensor_id,
  'Warehouse - Section A' AS location,
  CURRENT_TIMESTAMP - (hours * INTERVAL '1 hour') AS timestamp,
  -- Warehouse is warmer: 25-30°C
  25 + 5 * random() +
    CASE
      WHEN hours = 120 THEN 20  -- Anomaly: Temperature spike (fire alarm)
      WHEN hours = 121 THEN 18
      ELSE 0
    END AS temperature,
  -- Higher humidity: 50-70%
  50 + 20 * random() AS humidity,
  -- Normal pressure
  1010 + 10 * random() AS pressure,
  -- Higher CPU usage: 40-90%
  40 + 50 * random() AS cpu_usage,
  -- Memory usage: 40-80%
  40 + 40 * random() AS memory_usage,
  -- Response time: 100-300ms
  100 + 200 * random() AS response_time
FROM generate_series(0, 167) AS hours;

-- Data Center Sensors (sensor_03)
INSERT INTO demo.sensor_readings (sensor_id, location, timestamp, temperature, humidity, pressure, cpu_usage, memory_usage, response_time)
SELECT
  'sensor_03' AS sensor_id,
  'Data Center - Rack 12' AS location,
  CURRENT_TIMESTAMP - (hours * INTERVAL '1 hour') AS timestamp,
  -- Data center cooled: 18-22°C
  18 + 4 * random() +
    CASE
      WHEN hours = 24 THEN 15   -- Anomaly: Cooling system failure
      WHEN hours = 25 THEN 18
      WHEN hours = 144 THEN 12  -- Anomaly: Over-cooling
      ELSE 0
    END AS temperature,
  -- Low humidity: 30-50%
  30 + 20 * random() AS humidity,
  -- Normal pressure
  1010 + 10 * random() AS pressure,
  -- High CPU usage: 60-95%
  60 + 35 * random() +
    CASE
      WHEN hours = 60 THEN 40   -- Anomaly: CPU spike
      ELSE 0
    END AS cpu_usage,
  -- High memory usage: 70-95%
  70 + 25 * random() AS memory_usage,
  -- Fast response: 20-100ms
  20 + 80 * random() AS response_time
FROM generate_series(0, 167) AS hours;

-- Outdoor Sensors (sensor_04)
INSERT INTO demo.sensor_readings (sensor_id, location, timestamp, temperature, humidity, pressure, cpu_usage, memory_usage, response_time)
SELECT
  'sensor_04' AS sensor_id,
  'Outdoor - Main Entrance' AS location,
  CURRENT_TIMESTAMP - (hours * INTERVAL '1 hour') AS timestamp,
  -- Outdoor temperature varies: 10-30°C with day/night cycle
  20 + 10 * sin(hours * 0.26) + 3 * random() +  -- Simulates day/night cycle
    CASE
      WHEN hours = 36 THEN -10  -- Anomaly: Sudden cold front
      ELSE 0
    END AS temperature,
  -- Variable humidity: 40-80%
  40 + 40 * random() AS humidity,
  -- Pressure varies: 1000-1020 hPa
  1000 + 20 * random() AS pressure,
  -- Low CPU: 10-40%
  10 + 30 * random() AS cpu_usage,
  -- Low memory: 20-50%
  20 + 30 * random() AS memory_usage,
  -- Variable response: 50-250ms
  50 + 200 * random() AS response_time
FROM generate_series(0, 167) AS hours;

-- Step 4: Create Additional Performance Metrics Table (Optional)
-- =============================================================================
DROP TABLE IF EXISTS demo.app_metrics;

CREATE TABLE demo.app_metrics (
  app_name TEXT,
  timestamp TIMESTAMP,
  request_count INTEGER,
  error_count INTEGER,
  avg_response_ms DOUBLE,
  p95_response_ms DOUBLE,
  p99_response_ms DOUBLE,
  active_users INTEGER,
  PRIMARY KEY (app_name, timestamp)
);

-- Insert application performance data
INSERT INTO demo.app_metrics (app_name, timestamp, request_count, error_count, avg_response_ms, p95_response_ms, p99_response_ms, active_users)
SELECT
  'MonkDB Workbench' AS app_name,
  CURRENT_TIMESTAMP - (hours * INTERVAL '1 hour') AS timestamp,
  -- Request count: 100-1000 with peak hours
  CAST(100 + 900 * random() +
    CASE
      WHEN (hours % 24) BETWEEN 8 AND 18 THEN 500  -- Business hours spike
      ELSE 0
    END AS INTEGER) AS request_count,
  -- Error count: 0-10
  CAST(10 * random() +
    CASE
      WHEN hours = 80 THEN 50  -- Anomaly: Error spike
      ELSE 0
    END AS INTEGER) AS error_count,
  -- Average response time: 50-200ms
  50 + 150 * random() AS avg_response_ms,
  -- P95: 100-400ms
  100 + 300 * random() AS p95_response_ms,
  -- P99: 200-800ms
  200 + 600 * random() +
    CASE
      WHEN hours = 81 THEN 1000  -- Anomaly: Slow queries
      ELSE 0
    END AS p99_response_ms,
  -- Active users: 10-100
  CAST(10 + 90 * random() AS INTEGER) AS active_users
FROM generate_series(0, 167) AS hours;

-- Step 5: Verify Data
-- =============================================================================
-- Quick verification queries

-- Count total records
SELECT COUNT(*) as total_records FROM demo.sensor_readings;

-- Show sample data
SELECT * FROM demo.sensor_readings
ORDER BY timestamp DESC
LIMIT 10;

-- Show data range
SELECT
  sensor_id,
  location,
  COUNT(*) as readings,
  MIN(timestamp) as first_reading,
  MAX(timestamp) as last_reading,
  ROUND(AVG(temperature), 2) as avg_temp,
  ROUND(AVG(humidity), 2) as avg_humidity
FROM demo.sensor_readings
GROUP BY sensor_id, location
ORDER BY sensor_id;

-- Find intentional anomalies in temperature
SELECT
  sensor_id,
  location,
  timestamp,
  temperature,
  humidity,
  response_time
FROM demo.sensor_readings
WHERE temperature < 15 OR temperature > 40
ORDER BY timestamp DESC;

-- =============================================================================
-- DEMO READY!
-- =============================================================================
-- You now have:
-- ✓ 672 sensor readings (4 sensors × 168 hours)
-- ✓ 168 application metrics (1 app × 168 hours)
-- ✓ Multiple intentional anomalies for detection demo
-- ✓ Realistic data patterns with variations
--
-- Next Steps:
-- 1. Go to Time-Series Analytics page in MonkDB Workbench
-- 2. Use these sample queries in the demo...
-- =============================================================================
