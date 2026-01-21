-- =============================================================================
-- TIME-SERIES ANALYTICS - Quick Demo Queries
-- =============================================================================
-- Copy and paste these queries during your demo
-- All queries work with the sample data from timeseries-demo-setup.sql
-- =============================================================================

-- QUERY 1: Basic Hourly Temperature Analysis
-- Use this to show basic time-series aggregation
-- Duration: Last 24 hours
-- =============================================================================
SELECT
  DATE_TRUNC('hour', timestamp) AS time_bucket,
  location,
  ROUND(AVG(temperature), 2) AS avg_temp,
  ROUND(MAX(temperature), 2) AS max_temp,
  ROUND(MIN(temperature), 2) AS min_temp,
  COUNT(*) AS readings
FROM demo.sensor_readings
WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
GROUP BY time_bucket, location
ORDER BY time_bucket DESC, location
LIMIT 50;

-- What to say:
-- "This query groups sensor readings by hour and location, showing average,
--  max, and min temperatures. Notice how different locations have different
--  temperature patterns."


-- QUERY 2: Multi-Metric Analysis
-- Shows multiple metrics in one query (good for dashboards)
-- =============================================================================
SELECT
  DATE_TRUNC('hour', timestamp) AS time_bucket,
  ROUND(AVG(temperature), 2) AS avg_temp,
  ROUND(AVG(humidity), 2) AS avg_humidity,
  ROUND(AVG(pressure), 2) AS avg_pressure,
  ROUND(AVG(cpu_usage), 2) AS avg_cpu,
  ROUND(AVG(memory_usage), 2) AS avg_memory,
  COUNT(*) AS total_readings
FROM demo.sensor_readings
WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '7 days'
GROUP BY time_bucket
ORDER BY time_bucket DESC
LIMIT 168;  -- 7 days * 24 hours

-- What to say:
-- "Here we're tracking 5 different metrics simultaneously - temperature,
--  humidity, pressure, CPU, and memory. This gives us a complete picture
--  of system health over the past week."


-- QUERY 3: Performance Metrics with Percentiles
-- Shows advanced aggregation functions (P95, P99)
-- =============================================================================
SELECT
  DATE_TRUNC('hour', timestamp) AS time_bucket,
  COUNT(*) AS request_count,
  ROUND(AVG(response_time), 2) AS avg_response_ms,
  ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time), 2) AS p95_response_ms,
  ROUND(PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY response_time), 2) AS p99_response_ms,
  ROUND(MAX(response_time), 2) AS max_response_ms
FROM demo.sensor_readings
WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '7 days'
  AND response_time IS NOT NULL
GROUP BY time_bucket
ORDER BY time_bucket DESC
LIMIT 168;

-- What to say:
-- "For performance monitoring, percentiles are crucial. The 95th and 99th
--  percentile tell us what response times most users experience, which is
--  more meaningful than just the average. This is how we monitor SLAs."


-- QUERY 4: Anomaly Detection with Statistics
-- Shows statistical anomaly detection (2 sigma rule)
-- =============================================================================
WITH stats AS (
  SELECT
    AVG(temperature) AS mean_temp,
    STDDEV(temperature) AS stddev_temp
  FROM demo.sensor_readings
  WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '7 days'
)
SELECT
  s.sensor_id,
  s.location,
  s.timestamp,
  ROUND(s.temperature, 2) AS actual_temp,
  ROUND(stats.mean_temp, 2) AS expected_temp,
  ROUND((s.temperature - stats.mean_temp), 2) AS difference,
  ROUND(ABS(s.temperature - stats.mean_temp) / stats.stddev_temp, 2) AS deviation_sigma,
  CASE
    WHEN s.temperature > stats.mean_temp THEN 'HIGH ⬆️'
    ELSE 'LOW ⬇️'
  END AS anomaly_type
FROM demo.sensor_readings s, stats
WHERE s.timestamp >= CURRENT_TIMESTAMP - INTERVAL '7 days'
  AND ABS(s.temperature - stats.mean_temp) > 2 * stats.stddev_temp
ORDER BY deviation_sigma DESC
LIMIT 20;

-- What to say:
-- "This is the algorithm behind our anomaly detection. We calculate the mean
--  and standard deviation, then flag values that are 2 standard deviations
--  away - meaning they're in the top/bottom 5% of unusual values. Each anomaly
--  shows how many 'sigma' away it is from normal."


-- QUERY 5: Sensor Health Dashboard
-- Summary of all sensors (good for overview)
-- =============================================================================
SELECT
  sensor_id,
  location,
  COUNT(*) AS total_readings,
  ROUND(AVG(temperature), 2) AS avg_temp,
  ROUND(STDDEV(temperature), 2) AS temp_variation,
  ROUND(AVG(humidity), 2) AS avg_humidity,
  ROUND(AVG(cpu_usage), 2) AS avg_cpu,
  ROUND(AVG(memory_usage), 2) AS avg_memory,
  MIN(timestamp) AS first_reading,
  MAX(timestamp) AS last_reading,
  -- Calculate data freshness
  EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - MAX(timestamp))) / 3600 AS hours_since_last_reading
FROM demo.sensor_readings
WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '7 days'
GROUP BY sensor_id, location
ORDER BY sensor_id;

-- What to say:
-- "This is our sensor health dashboard. We can quickly see which sensors
--  are active, their average readings, and when we last heard from them.
--  If 'hours_since_last_reading' is too high, we know there's a connectivity issue."


-- QUERY 6: Hour-over-Hour Comparison
-- Shows trends and changes
-- =============================================================================
SELECT
  DATE_TRUNC('hour', timestamp) AS time_bucket,
  location,
  ROUND(AVG(temperature), 2) AS current_temp,
  ROUND(LAG(AVG(temperature)) OVER (PARTITION BY location ORDER BY DATE_TRUNC('hour', timestamp)), 2) AS prev_hour_temp,
  ROUND(AVG(temperature) - LAG(AVG(temperature)) OVER (PARTITION BY location ORDER BY DATE_TRUNC('hour', timestamp)), 2) AS temp_change,
  CASE
    WHEN AVG(temperature) - LAG(AVG(temperature)) OVER (PARTITION BY location ORDER BY DATE_TRUNC('hour', timestamp)) > 5
      THEN '🔥 RAPID INCREASE'
    WHEN AVG(temperature) - LAG(AVG(temperature)) OVER (PARTITION BY location ORDER BY DATE_TRUNC('hour', timestamp)) < -5
      THEN '❄️ RAPID DECREASE'
    ELSE '✓ Normal'
  END AS trend_alert
FROM demo.sensor_readings
WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '48 hours'
GROUP BY time_bucket, location
ORDER BY time_bucket DESC, location
LIMIT 100;

-- What to say:
-- "This query uses window functions to compare each hour to the previous one.
--  We can instantly spot rapid temperature changes that might indicate problems
--  like AC failure, fires, or sensor malfunctions."


-- QUERY 7: Daily Aggregation with Different Buckets
-- Shows flexibility in time bucketing
-- =============================================================================
SELECT
  DATE_TRUNC('day', timestamp) AS day,
  ROUND(AVG(temperature), 2) AS avg_daily_temp,
  ROUND(MAX(temperature), 2) AS max_daily_temp,
  ROUND(MIN(temperature), 2) AS min_daily_temp,
  ROUND(MAX(temperature) - MIN(temperature), 2) AS daily_temp_range,
  COUNT(*) AS readings_per_day
FROM demo.sensor_readings
WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '7 days'
GROUP BY day
ORDER BY day DESC;

-- What to say:
-- "By changing the time bucket from hours to days, we get a higher-level view.
--  This is useful for spotting long-term trends. Notice the 'daily_temp_range'
--  column - this shows us how much temperature varied each day."


-- QUERY 8: Top Anomalies by Severity
-- Focus on most critical issues
-- =============================================================================
WITH stats AS (
  SELECT
    location,
    AVG(temperature) AS mean_temp,
    STDDEV(temperature) AS stddev_temp
  FROM demo.sensor_readings
  WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '7 days'
  GROUP BY location
)
SELECT
  s.sensor_id,
  s.location,
  s.timestamp,
  ROUND(s.temperature, 2) AS temperature,
  ROUND(stats.mean_temp, 2) AS location_normal,
  ROUND(ABS(s.temperature - stats.mean_temp) / stats.stddev_temp, 2) AS severity_score,
  CASE
    WHEN s.temperature > stats.mean_temp + (3 * stats.stddev_temp) THEN '🚨 CRITICAL HIGH'
    WHEN s.temperature > stats.mean_temp + (2 * stats.stddev_temp) THEN '⚠️ WARNING HIGH'
    WHEN s.temperature < stats.mean_temp - (3 * stats.stddev_temp) THEN '🚨 CRITICAL LOW'
    WHEN s.temperature < stats.mean_temp - (2 * stats.stddev_temp) THEN '⚠️ WARNING LOW'
    ELSE 'Normal'
  END AS severity_level
FROM demo.sensor_readings s
INNER JOIN stats ON s.location = stats.location
WHERE s.timestamp >= CURRENT_TIMESTAMP - INTERVAL '7 days'
  AND ABS(s.temperature - stats.mean_temp) > 2 * stats.stddev_temp
ORDER BY severity_score DESC
LIMIT 10;

-- What to say:
-- "This query prioritizes anomalies by severity. We compare each location
--  to its own normal range, so outdoor sensors aren't compared to indoor ones.
--  The severity score helps us triage - focus on the biggest deviations first."


-- QUERY 9: Correlation Analysis
-- Shows relationships between metrics
-- =============================================================================
SELECT
  ROUND(CORR(temperature, humidity), 3) AS temp_humidity_correlation,
  ROUND(CORR(temperature, pressure), 3) AS temp_pressure_correlation,
  ROUND(CORR(cpu_usage, memory_usage), 3) AS cpu_memory_correlation,
  ROUND(CORR(cpu_usage, response_time), 3) AS cpu_response_correlation
FROM demo.sensor_readings
WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '7 days';

-- What to say:
-- "Correlation analysis helps us understand relationships. A value close to 1
--  means strong positive correlation, -1 means inverse correlation, 0 means
--  no relationship. For example, high CPU-response correlation suggests CPU
--  is a bottleneck for performance."


-- QUERY 10: Time Bucket Comparison (Multiple Granularities)
-- Shows same data at different resolutions
-- =============================================================================
-- 1-hour buckets
SELECT '1 Hour' AS granularity, DATE_TRUNC('hour', timestamp) AS bucket,
       COUNT(*) AS readings, ROUND(AVG(temperature), 2) AS avg_temp
FROM demo.sensor_readings
WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
GROUP BY bucket ORDER BY bucket DESC LIMIT 5

UNION ALL

-- 6-hour buckets
SELECT '6 Hours' AS granularity, DATE_TRUNC('hour', timestamp - ((EXTRACT(HOUR FROM timestamp)::INTEGER % 6) * INTERVAL '1 hour')) AS bucket,
       COUNT(*) AS readings, ROUND(AVG(temperature), 2) AS avg_temp
FROM demo.sensor_readings
WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
GROUP BY bucket ORDER BY bucket DESC LIMIT 5

UNION ALL

-- Daily buckets
SELECT 'Daily' AS granularity, DATE_TRUNC('day', timestamp) AS bucket,
       COUNT(*) AS readings, ROUND(AVG(temperature), 2) AS avg_temp
FROM demo.sensor_readings
WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '7 days'
GROUP BY bucket ORDER BY bucket DESC LIMIT 5;

-- What to say:
-- "This shows how the same data looks at different time resolutions.
--  Choose hourly for detailed analysis, daily for trends. The system
--  makes it easy to switch between these in the UI."


-- =============================================================================
-- BONUS: Application Performance Metrics
-- =============================================================================

SELECT
  DATE_TRUNC('hour', timestamp) AS time_bucket,
  app_name,
  SUM(request_count) AS total_requests,
  SUM(error_count) AS total_errors,
  ROUND((SUM(error_count)::FLOAT / NULLIF(SUM(request_count), 0)) * 100, 2) AS error_rate_pct,
  ROUND(AVG(avg_response_ms), 2) AS avg_response,
  ROUND(AVG(p95_response_ms), 2) AS p95_response,
  ROUND(AVG(p99_response_ms), 2) AS p99_response,
  MAX(active_users) AS peak_users
FROM demo.app_metrics
WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '7 days'
GROUP BY time_bucket, app_name
ORDER BY time_bucket DESC
LIMIT 168;

-- What to say:
-- "For application monitoring, we track requests, errors, response times,
--  and active users. The error rate percentage helps us spot reliability
--  issues, while percentiles show actual user experience."


-- =============================================================================
-- VERIFICATION QUERIES
-- Use these to verify the demo data is loaded correctly
-- =============================================================================

-- Check total record count
SELECT 'Total Records' AS metric, COUNT(*) AS value FROM demo.sensor_readings
UNION ALL
SELECT 'Unique Sensors', COUNT(DISTINCT sensor_id) FROM demo.sensor_readings
UNION ALL
SELECT 'Unique Locations', COUNT(DISTINCT location) FROM demo.sensor_readings
UNION ALL
SELECT 'Date Range (Hours)', EXTRACT(EPOCH FROM (MAX(timestamp) - MIN(timestamp))) / 3600 FROM demo.sensor_readings;

-- Expected results:
-- Total Records: 672
-- Unique Sensors: 4
-- Unique Locations: 4
-- Date Range: ~168 hours (7 days)

-- =============================================================================
-- TIPS FOR DEMO
-- =============================================================================
-- 1. Start with Query 1 (simple aggregation)
-- 2. Show Query 4 (anomaly detection) to demonstrate intelligence
-- 3. Use Query 5 (health dashboard) to show practical monitoring
-- 4. End with Query 3 (percentiles) for advanced users
-- 5. Keep queries visible on screen while explaining results
-- 6. Point out specific anomalies in the data (pre-inserted in setup script)
-- 7. Encourage audience to modify queries and experiment
-- =============================================================================
