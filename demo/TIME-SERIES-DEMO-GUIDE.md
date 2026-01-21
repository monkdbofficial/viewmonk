# Time-Series Analytics Demo Guide

## 🎯 Overview
The Time-Series Analytics feature provides powerful tools for analyzing time-based data with automatic aggregations, interactive visualizations, and intelligent anomaly detection.

**Perfect for:** IoT monitoring, server metrics, application performance, sensor data, business analytics

---

## 📋 Pre-Demo Setup (5 minutes)

### Step 1: Run the Sample Data Script

1. Open **Query Editor** in MonkDB Workbench
2. Load the file: `demo/timeseries-demo-setup.sql`
3. Execute the entire script (Cmd/Ctrl + Enter)
4. Wait for completion (creates 840 records)

### Step 2: Verify Data

Run this quick verification:

```sql
SELECT COUNT(*) as total_records FROM demo.sensor_readings;
-- Should return: 672 records

SELECT * FROM demo.sensor_readings
ORDER BY timestamp DESC
LIMIT 10;
-- Should show recent sensor readings
```

---

## 🎬 Demo Script (7-10 minutes)

### **Introduction (1 minute)**

> "Today I'll show you our Time-Series Analytics feature, which helps you analyze time-based data with automatic aggregations and anomaly detection. This is particularly useful for monitoring sensors, servers, applications, or any time-stamped data."

**Navigate to:** Time-Series Analytics page

**Point out the 4 main components:**
1. 📅 Date Range Picker (top)
2. 📊 Aggregation Builder (left panel)
3. 📈 Time-Series Chart (main visualization)
4. 🚨 Anomaly Detector (right panel)

---

### **Demo Part 1: Basic Aggregation (2 minutes)**

#### Configure Time Bucket

> "First, let's choose how we want to aggregate our data over time."

1. In **Aggregation Builder**, click **"1 Hour"** time bucket
2. Explain: *"This groups our sensor readings into 1-hour intervals"*

#### Add Metrics

> "Now let's define what we want to measure."

1. Click **"Add Metric"**
2. Configure:
   - **Column:** `temperature`
   - **Function:** `AVG`
   - **Alias:** `avg_temp`
3. Explain: *"This calculates the average temperature per hour"*

4. Click **"Add Metric"** again
5. Configure:
   - **Column:** `temperature`
   - **Function:** `MAX`
   - **Alias:** `max_temp`
6. Explain: *"Now we're tracking both average and peak temperature"*

---

### **Demo Part 2: SQL Generation (2 minutes)**

> "Here's the powerful part - the system automatically generates optimized SQL based on your configuration."

1. Click **"Generate SQL"** button
2. Show the generated query:

```sql
SELECT
  DATE_TRUNC('hour', timestamp) AS time_bucket,
  AVG(temperature) AS avg_temp,
  MAX(temperature) AS max_temp
FROM your_schema.your_table
WHERE timestamp >= TIMESTAMP '...'
  AND timestamp <= TIMESTAMP '...'
GROUP BY time_bucket
ORDER BY time_bucket DESC
LIMIT 1000;
```

3. Explain: *"You can see it's using DATE_TRUNC for time bucketing, proper aggregation functions, and includes the date range automatically"*

4. Click **"Copy"**

5. **Now modify the SQL** in the display to show the real table:
   - Replace `your_schema.your_table` with `demo.sensor_readings`

6. Explain: *"For production use, you'd paste this into Query Editor, update the table name, and execute. Let me show you the actual query we'll use..."*

---

### **Demo Part 3: Run Real Query (1 minute)**

> "Let's run a query on our sample data to see real results."

**Copy and run this in Query Editor:**

```sql
-- Hourly temperature statistics by sensor location
SELECT
  DATE_TRUNC('hour', timestamp) AS time_bucket,
  location,
  AVG(temperature) AS avg_temp,
  MAX(temperature) AS max_temp,
  MIN(temperature) AS min_temp,
  COUNT(*) AS readings
FROM demo.sensor_readings
WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '7 days'
GROUP BY time_bucket, location
ORDER BY time_bucket DESC, location
LIMIT 100;
```

**Show the results:**
- Multiple locations (Office, Warehouse, Data Center, Outdoor)
- Temperature variations over time
- Readings count per bucket

---

### **Demo Part 4: Anomaly Detection (3 minutes)**

> "Now let's look at automatic anomaly detection using statistical analysis."

#### Enable Anomaly Detection

1. In **Anomaly Detector** panel, click **"Show Details"**
2. Show the statistics:
   - **Mean:** Average temperature across all readings
   - **Std Dev:** Measure of variability
   - **Min/Max:** Temperature range

3. Explain: *"The system calculates these statistics automatically and uses them to detect unusual patterns"*

#### Adjust Sensitivity

1. Click **"2σ (95%)"** sensitivity level
2. Explain: *"This means we'll flag values that are 2 standard deviations from the mean - capturing about 5% of outliers"*

3. Show the anomaly count:
   - **Detected Anomalies:** Shows total count
   - **Breakdown:** "X high, Y low"

4. Click **"3σ (99.7%)"** for comparison
5. Explain: *"Higher sigma means more conservative - only extreme outliers. You can adjust based on your needs"*

#### Review Detected Anomalies

1. Scroll through the **Anomaly Timeline**
2. Point out key information:
   - 🔴 **High anomalies** (red) - Temperature spikes
   - 🔵 **Low anomalies** (blue) - Temperature drops
   - **Timestamp** when it occurred
   - **Actual value** vs **expected value**
   - **Deviation** in standard deviations (σ)

3. Click on a specific anomaly and explain:
   > "Here we see on January 3rd at 2:00 PM, the temperature was 45°C when we expected around 22°C. That's 2.8 standard deviations above normal - clearly an anomaly that needs investigation!"

---

### **Demo Part 5: Advanced Features (2 minutes)**

#### Group By Multiple Dimensions

> "Let's analyze data by location to see patterns across different sensors."

1. In **Aggregation Builder**, click **"Add Group"**
2. Select: `location`
3. Explain: *"This creates separate time-series for each location"*

4. Click **"Generate SQL"** to show the updated query:

```sql
SELECT
  DATE_TRUNC('hour', timestamp) AS time_bucket,
  location,  -- Added to SELECT
  AVG(temperature) AS avg_temp,
  MAX(temperature) AS max_temp
FROM demo.sensor_readings
WHERE timestamp >= TIMESTAMP '...'
GROUP BY time_bucket, location  -- Added to GROUP BY
ORDER BY time_bucket DESC
LIMIT 1000;
```

#### Date Range Selection

1. In **Date Range Picker**, show the presets:
   - Last 24 Hours
   - Last 7 Days *(currently selected)*
   - Last 30 Days
   - Custom Range

2. Click **"Custom Range"** to show the date pickers
3. Explain: *"You can select any time window for analysis"*

4. Toggle **"Real-Time"** switch
5. Explain: *"In real-time mode, the data refreshes automatically - perfect for monitoring dashboards"*

#### Export Data

1. Click **"Export"** button
2. Show the downloaded `timeseries-data.csv` file
3. Explain: *"All time-series data can be exported to CSV for further analysis in Excel, Python, R, or other tools"*

---

## 📊 Sample Queries for Live Demo

### Query 1: Temperature Analysis by Location

```sql
-- Show temperature patterns across different locations
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
ORDER BY time_bucket DESC, location;
```

**What to highlight:**
- Office maintains 20-24°C
- Warehouse is warmer (25-30°C)
- Data Center is cooler (18-22°C)
- Outdoor has widest variation

---

### Query 2: Performance Metrics with Percentiles

```sql
-- Application performance metrics with percentiles
SELECT
  DATE_TRUNC('hour', timestamp) AS time_bucket,
  AVG(response_time) AS avg_response,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time) AS p95_response,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY response_time) AS p99_response,
  MAX(response_time) AS max_response,
  COUNT(*) AS total_requests
FROM demo.sensor_readings
WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '7 days'
  AND response_time IS NOT NULL
GROUP BY time_bucket
ORDER BY time_bucket DESC
LIMIT 168;
```

**What to highlight:**
- Shows 95th and 99th percentile response times
- Useful for SLA monitoring
- Identifies performance degradation

---

### Query 3: Find All Anomalies

```sql
-- Detect temperature anomalies using statistical analysis
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
  ROUND(s.temperature, 2) AS temperature,
  ROUND(stats.mean_temp, 2) AS expected_temp,
  ROUND(ABS(s.temperature - stats.mean_temp) / stats.stddev_temp, 2) AS deviation_sigma,
  CASE
    WHEN s.temperature > stats.mean_temp THEN 'HIGH'
    ELSE 'LOW'
  END AS anomaly_type
FROM demo.sensor_readings s, stats
WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '7 days'
  AND ABS(s.temperature - stats.mean_temp) > 2 * stats.stddev_temp  -- 2σ threshold
ORDER BY deviation_sigma DESC;
```

**What to highlight:**
- Shows all anomalies with deviation scores
- Can adjust threshold (2σ = 95% confidence)
- Includes anomaly type (HIGH/LOW)

---

### Query 4: Sensor Health Dashboard

```sql
-- Overall sensor health and statistics
SELECT
  sensor_id,
  location,
  COUNT(*) AS total_readings,
  ROUND(AVG(temperature), 2) AS avg_temp,
  ROUND(AVG(humidity), 2) AS avg_humidity,
  ROUND(AVG(cpu_usage), 2) AS avg_cpu,
  ROUND(AVG(memory_usage), 2) AS avg_memory,
  MIN(timestamp) AS first_reading,
  MAX(timestamp) AS last_reading
FROM demo.sensor_readings
WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '7 days'
GROUP BY sensor_id, location
ORDER BY sensor_id;
```

**What to highlight:**
- Quick health overview of all sensors
- Identifies sensors with issues
- Shows data completeness

---

### Query 5: Hourly Trend Comparison

```sql
-- Compare current hour to same hour yesterday
WITH current_hour AS (
  SELECT
    AVG(temperature) AS current_temp,
    AVG(humidity) AS current_humidity
  FROM demo.sensor_readings
  WHERE timestamp >= DATE_TRUNC('hour', CURRENT_TIMESTAMP)
),
yesterday_hour AS (
  SELECT
    AVG(temperature) AS yesterday_temp,
    AVG(humidity) AS yesterday_humidity
  FROM demo.sensor_readings
  WHERE timestamp >= DATE_TRUNC('hour', CURRENT_TIMESTAMP - INTERVAL '1 day')
    AND timestamp < DATE_TRUNC('hour', CURRENT_TIMESTAMP - INTERVAL '1 day') + INTERVAL '1 hour'
)
SELECT
  ROUND(c.current_temp, 2) AS current_temp,
  ROUND(y.yesterday_temp, 2) AS yesterday_temp,
  ROUND(c.current_temp - y.yesterday_temp, 2) AS temp_change,
  ROUND(c.current_humidity, 2) AS current_humidity,
  ROUND(y.yesterday_humidity, 2) AS yesterday_humidity,
  ROUND(c.current_humidity - y.yesterday_humidity, 2) AS humidity_change
FROM current_hour c, yesterday_hour y;
```

**What to highlight:**
- Shows trends over time
- Identifies unusual changes
- Good for daily monitoring

---

## 🎨 Visual Demo Tips

### Chart Interactions

1. **Hover over data points** - Shows exact values and timestamps
2. **Zoom in/out** - Use mouse wheel or zoom controls
3. **Anomaly markers** - Red/blue dots on chart indicate detected anomalies
4. **Multiple series** - Different colors for each metric/group

### Color Coding

- 🔵 **Blue** - Primary metrics, low anomalies
- 🟢 **Green** - Secondary metrics, success states
- 🔴 **Red** - High anomalies, alerts
- 🟠 **Orange** - Warnings, moderate issues
- 🟣 **Purple** - Grouping, categorical data

---

## 💡 Key Selling Points

### 1. **No SQL Required for End Users**
- Visual configuration interface
- SQL generated automatically
- Copy-paste workflow

### 2. **Production-Ready Queries**
- Optimized for CrateDB
- Handles complex aggregations
- Proper time-zone handling

### 3. **Intelligent Anomaly Detection**
- Statistical methods (Z-score)
- Configurable sensitivity
- Visual timeline and markers

### 4. **Multiple Use Cases**
- **IoT Monitoring:** Sensor data, device metrics
- **Application Performance:** Response times, error rates
- **Server Metrics:** CPU, memory, disk usage
- **Business Analytics:** Sales trends, user activity
- **Environmental Data:** Temperature, humidity, air quality

### 5. **Export & Integration**
- CSV export for external analysis
- Real-time mode for dashboards
- API-ready SQL queries

---

## ❓ Demo Q&A Preparation

### Q: Can it handle real-time data?
**A:** Yes, toggle the "Real-Time" switch in the Date Range Picker. Data refreshes automatically every 30 seconds.

### Q: What if I have thousands of sensors?
**A:** Use the "Group By" feature to aggregate by sensor groups, locations, or types. The system handles millions of records efficiently.

### Q: How accurate is anomaly detection?
**A:** It uses statistical Z-score method. With 2σ threshold, you get 95% confidence. Adjust sensitivity based on your data patterns - more sensitive for critical systems.

### Q: Can I customize the SQL?
**A:** Absolutely! The generated SQL is a starting point. Copy it to Query Editor, modify as needed, and save as custom queries.

### Q: Does it work with existing tables?
**A:** Yes! Just update the table/column names in the generated SQL. Works with any table that has a timestamp column.

### Q: What aggregation functions are supported?
**A:** AVG, SUM, MIN, MAX, COUNT, PERCENTILE_95, PERCENTILE_99 - all standard SQL aggregations.

### Q: Can I analyze multiple metrics simultaneously?
**A:** Yes! Add multiple metrics in the Aggregation Builder. Each appears as a separate line on the chart.

### Q: How do I investigate an anomaly?
**A:** Click the anomaly in the timeline to see details, then run a drill-down query in Query Editor to see surrounding data points and context.

---

## 🚀 Post-Demo Follow-Up

### Next Steps for Prospects

1. **Try with their data:**
   - Provide template SQL for their schema
   - Help identify key columns for monitoring

2. **Setup monitoring:**
   - Configure real-time dashboards
   - Set up anomaly alerts (future feature)

3. **Integration:**
   - Export data to BI tools
   - Integrate with existing monitoring systems

### Additional Resources

- Full documentation: `/docs/time-series-analytics.md`
- API reference: `/docs/api/query-endpoints.md`
- Video tutorial: [Link to recording]
- Sample datasets: `demo/` folder

---

## 📝 Demo Checklist

### Before Demo
- [ ] Run `timeseries-demo-setup.sql` script
- [ ] Verify data: `SELECT COUNT(*) FROM demo.sensor_readings;`
- [ ] Test Query Editor connectivity
- [ ] Review this guide
- [ ] Prepare laptop/screen sharing

### During Demo
- [ ] Navigate to Time-Series Analytics page
- [ ] Show 4 main components
- [ ] Configure aggregation (time bucket + metrics)
- [ ] Generate and explain SQL
- [ ] Run sample queries
- [ ] Demonstrate anomaly detection
- [ ] Show group by feature
- [ ] Export data to CSV
- [ ] Answer questions

### After Demo
- [ ] Share this guide with prospect
- [ ] Provide sample SQL scripts
- [ ] Schedule follow-up for custom setup
- [ ] Gather feedback

---

## 🎯 Success Metrics

**Demo is successful if audience can:**
1. Understand how to configure time-series aggregations
2. Read and modify generated SQL queries
3. Identify anomalies visually and statistically
4. See clear use cases for their data
5. Feel confident using the feature independently

---

**Last Updated:** January 6, 2026
**Version:** 1.1.0
**Demo Duration:** 7-10 minutes
**Skill Level Required:** Beginner to Intermediate
