-- =============================================================================
-- TIME-SERIES ANALYTICS DEMO - Simple Setup (Run statements separately)
-- =============================================================================
-- IMPORTANT: Run each statement ONE AT A TIME in Query Editor
-- Copy and execute each section separately
-- =============================================================================

-- STEP 1: Create the sensor readings table
-- Copy and run this first:
-- =============================================================================

DROP TABLE IF EXISTS demo.sensor_readings;

-- STEP 2: Create the table
-- Copy and run this second:
-- =============================================================================

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
);

-- STEP 3: Insert sample data for Office sensor (last 24 hours)
-- Copy and run this third:
-- =============================================================================

INSERT INTO demo.sensor_readings (sensor_id, location, timestamp, temperature, humidity, pressure, cpu_usage, memory_usage, response_time) VALUES
('sensor_01', 'Office - Floor 1', CURRENT_TIMESTAMP - INTERVAL '1 hour', 22.5, 45.2, 1013.2, 35.5, 42.3, 125.5),
('sensor_01', 'Office - Floor 1', CURRENT_TIMESTAMP - INTERVAL '2 hours', 23.1, 46.8, 1012.8, 38.2, 45.1, 98.3),
('sensor_01', 'Office - Floor 1', CURRENT_TIMESTAMP - INTERVAL '3 hours', 21.8, 44.5, 1014.1, 42.7, 48.9, 156.7),
('sensor_01', 'Office - Floor 1', CURRENT_TIMESTAMP - INTERVAL '4 hours', 22.3, 47.2, 1013.5, 36.1, 43.5, 112.4),
('sensor_01', 'Office - Floor 1', CURRENT_TIMESTAMP - INTERVAL '5 hours', 35.0, 42.1, 1012.9, 55.3, 62.8, 550.2),
('sensor_01', 'Office - Floor 1', CURRENT_TIMESTAMP - INTERVAL '6 hours', 21.5, 45.8, 1013.7, 34.8, 41.2, 105.9),
('sensor_01', 'Office - Floor 1', CURRENT_TIMESTAMP - INTERVAL '7 hours', 22.7, 46.3, 1013.1, 37.9, 44.7, 118.6),
('sensor_01', 'Office - Floor 1', CURRENT_TIMESTAMP - INTERVAL '8 hours', 23.2, 47.1, 1012.6, 39.4, 46.2, 132.1),
('sensor_01', 'Office - Floor 1', CURRENT_TIMESTAMP - INTERVAL '9 hours', 21.9, 44.9, 1014.3, 35.7, 42.8, 108.5),
('sensor_01', 'Office - Floor 1', CURRENT_TIMESTAMP - INTERVAL '10 hours', 22.4, 45.7, 1013.4, 38.6, 45.5, 121.3),
('sensor_01', 'Office - Floor 1', CURRENT_TIMESTAMP - INTERVAL '11 hours', 23.0, 46.5, 1012.9, 40.2, 47.1, 145.8),
('sensor_01', 'Office - Floor 1', CURRENT_TIMESTAMP - INTERVAL '12 hours', 22.1, 45.1, 1013.8, 36.5, 43.2, 110.7),
('sensor_01', 'Office - Floor 1', CURRENT_TIMESTAMP - INTERVAL '13 hours', 21.7, 44.6, 1014.2, 34.9, 41.8, 102.4),
('sensor_01', 'Office - Floor 1', CURRENT_TIMESTAMP - INTERVAL '14 hours', 22.8, 46.9, 1013.0, 38.1, 44.9, 125.9),
('sensor_01', 'Office - Floor 1', CURRENT_TIMESTAMP - INTERVAL '15 hours', 23.3, 47.4, 1012.5, 41.3, 48.2, 152.6),
('sensor_01', 'Office - Floor 1', CURRENT_TIMESTAMP - INTERVAL '16 hours', 22.0, 45.3, 1013.9, 36.8, 43.6, 115.2),
('sensor_01', 'Office - Floor 1', CURRENT_TIMESTAMP - INTERVAL '17 hours', 21.6, 44.2, 1014.5, 33.7, 40.5, 95.8),
('sensor_01', 'Office - Floor 1', CURRENT_TIMESTAMP - INTERVAL '18 hours', 22.6, 46.7, 1013.2, 37.5, 44.3, 120.4),
('sensor_01', 'Office - Floor 1', CURRENT_TIMESTAMP - INTERVAL '19 hours', 23.1, 47.2, 1012.7, 39.8, 46.8, 138.7),
('sensor_01', 'Office - Floor 1', CURRENT_TIMESTAMP - INTERVAL '20 hours', 22.2, 45.5, 1013.6, 36.2, 42.9, 108.9),
('sensor_01', 'Office - Floor 1', CURRENT_TIMESTAMP - INTERVAL '21 hours', 21.8, 44.8, 1014.1, 35.1, 41.6, 103.5),
('sensor_01', 'Office - Floor 1', CURRENT_TIMESTAMP - INTERVAL '22 hours', 22.9, 46.4, 1013.3, 38.9, 45.7, 128.3),
('sensor_01', 'Office - Floor 1', CURRENT_TIMESTAMP - INTERVAL '23 hours', 23.4, 47.6, 1012.4, 42.1, 49.5, 165.4),
('sensor_01', 'Office - Floor 1', CURRENT_TIMESTAMP - INTERVAL '24 hours', 22.3, 45.9, 1013.5, 37.3, 44.1, 118.7);

-- STEP 4: Insert data for Warehouse sensor
-- Copy and run this fourth:
-- =============================================================================

INSERT INTO demo.sensor_readings (sensor_id, location, timestamp, temperature, humidity, pressure, cpu_usage, memory_usage, response_time) VALUES
('sensor_02', 'Warehouse - Section A', CURRENT_TIMESTAMP - INTERVAL '1 hour', 27.5, 58.3, 1012.5, 62.3, 68.4, 245.6),
('sensor_02', 'Warehouse - Section A', CURRENT_TIMESTAMP - INTERVAL '2 hours', 28.2, 60.1, 1011.9, 65.8, 71.2, 267.8),
('sensor_02', 'Warehouse - Section A', CURRENT_TIMESTAMP - INTERVAL '3 hours', 26.8, 56.7, 1013.2, 58.9, 65.3, 221.5),
('sensor_02', 'Warehouse - Section A', CURRENT_TIMESTAMP - INTERVAL '4 hours', 27.3, 59.2, 1012.3, 61.7, 67.8, 238.9),
('sensor_02', 'Warehouse - Section A', CURRENT_TIMESTAMP - INTERVAL '5 hours', 48.5, 54.8, 1012.1, 85.2, 88.6, 678.3),
('sensor_02', 'Warehouse - Section A', CURRENT_TIMESTAMP - INTERVAL '6 hours', 27.1, 57.5, 1012.8, 60.4, 66.5, 229.7),
('sensor_02', 'Warehouse - Section A', CURRENT_TIMESTAMP - INTERVAL '7 hours', 28.0, 59.8, 1011.7, 64.5, 70.1, 255.4),
('sensor_02', 'Warehouse - Section A', CURRENT_TIMESTAMP - INTERVAL '8 hours', 28.5, 61.3, 1011.2, 67.2, 72.9, 289.1),
('sensor_02', 'Warehouse - Section A', CURRENT_TIMESTAMP - INTERVAL '9 hours', 27.2, 58.1, 1012.6, 61.1, 67.2, 234.6),
('sensor_02', 'Warehouse - Section A', CURRENT_TIMESTAMP - INTERVAL '10 hours', 26.9, 57.3, 1013.0, 59.7, 65.8, 225.8),
('sensor_02', 'Warehouse - Section A', CURRENT_TIMESTAMP - INTERVAL '11 hours', 27.8, 59.5, 1012.0, 63.9, 69.5, 249.3),
('sensor_02', 'Warehouse - Section A', CURRENT_TIMESTAMP - INTERVAL '12 hours', 28.3, 60.7, 1011.5, 66.1, 71.8, 272.5),
('sensor_02', 'Warehouse - Section A', CURRENT_TIMESTAMP - INTERVAL '13 hours', 27.0, 57.9, 1012.7, 60.8, 67.0, 232.1),
('sensor_02', 'Warehouse - Section A', CURRENT_TIMESTAMP - INTERVAL '14 hours', 26.7, 56.4, 1013.3, 58.2, 64.6, 218.9),
('sensor_02', 'Warehouse - Section A', CURRENT_TIMESTAMP - INTERVAL '15 hours', 27.9, 59.9, 1011.8, 64.8, 70.4, 258.7),
('sensor_02', 'Warehouse - Section A', CURRENT_TIMESTAMP - INTERVAL '16 hours', 28.4, 61.0, 1011.3, 66.9, 72.6, 283.4),
('sensor_02', 'Warehouse - Section A', CURRENT_TIMESTAMP - INTERVAL '17 hours', 27.4, 58.6, 1012.4, 62.5, 68.7, 241.2),
('sensor_02', 'Warehouse - Section A', CURRENT_TIMESTAMP - INTERVAL '18 hours', 26.6, 55.9, 1013.5, 57.6, 63.9, 215.3),
('sensor_02', 'Warehouse - Section A', CURRENT_TIMESTAMP - INTERVAL '19 hours', 27.7, 59.3, 1012.1, 63.4, 69.1, 246.8),
('sensor_02', 'Warehouse - Section A', CURRENT_TIMESTAMP - INTERVAL '20 hours', 28.1, 60.4, 1011.6, 65.3, 71.5, 265.9),
('sensor_02', 'Warehouse - Section A', CURRENT_TIMESTAMP - INTERVAL '21 hours', 27.2, 58.3, 1012.5, 61.5, 67.6, 236.4),
('sensor_02', 'Warehouse - Section A', CURRENT_TIMESTAMP - INTERVAL '22 hours', 26.8, 57.1, 1012.9, 59.3, 65.5, 223.7),
('sensor_02', 'Warehouse - Section A', CURRENT_TIMESTAMP - INTERVAL '23 hours', 27.6, 59.1, 1012.2, 62.8, 68.3, 243.5),
('sensor_02', 'Warehouse - Section A', CURRENT_TIMESTAMP - INTERVAL '24 hours', 28.2, 60.6, 1011.4, 65.7, 71.3, 269.8);

-- STEP 5: Verify the data
-- Copy and run this last:
-- =============================================================================

SELECT
  sensor_id,
  location,
  COUNT(*) as readings,
  ROUND(AVG(temperature), 2) as avg_temp,
  ROUND(AVG(humidity), 2) as avg_humidity,
  ROUND(AVG(response_time), 2) as avg_response_ms
FROM demo.sensor_readings
GROUP BY sensor_id, location
ORDER BY sensor_id;

-- Expected: 2 sensors with 24 readings each (48 total)
-- sensor_01 should show anomaly spike at hour 5 (35°C, 550ms response)
-- sensor_02 should show anomaly spike at hour 5 (48.5°C, 678ms response)

-- =============================================================================
-- Now you can use this data in Time-Series Analytics page!
-- =============================================================================


  Step 2: Use Query Editor

  Go to the Query Editor page (not Time-Series Analytics) and run this query:

  -- Query for Time-Series visualization
  SELECT
    timestamp,
    sensor_id,
    location,
    temperature,
    humidity,
    pressure,
    cpu_usage,
    memory_usage,
    response_time
  FROM monkdb.sensor_readings
  WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
  ORDER BY timestamp DESC;

  This will show you all the raw data.

  Step 3: For Time-Series Analytics Page - Use Aggregation

  Since the Time-Series Analytics page expects aggregated data with time buckets, run this query in Query Editor:

  -- Hourly aggregation for visualization
  SELECT
    DATE_TRUNC('hour', timestamp) AS time_bucket,
    sensor_id,
    location,
    COUNT(*) AS reading_count,
    AVG(temperature) AS avg_temperature,
    MAX(temperature) AS max_temperature,
    MIN(temperature) AS min_temperature,
    AVG(humidity) AS avg_humidity,
    AVG(pressure) AS avg_pressure,
    AVG(cpu_usage) AS avg_cpu,
    AVG(memory_usage) AS avg_memory,
    AVG(response_time) AS avg_response_time,
    MAX(response_time) AS max_response_time
  FROM monkdb.sensor_readings
  WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
  GROUP BY time_bucket, sensor_id, location
  ORDER BY time_bucket DESC, sensor_id;
