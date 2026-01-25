# Advanced Aggregation & Analytics Features

## Overview

The **Advanced Aggregation Panel** provides enterprise-level data aggregation capabilities with statistical functions, window operations, and time-series analysis for your MonkDB time-series data.

## Features

### 1. **Basic Aggregations** 📊
Standard SQL aggregation functions for everyday analytics:
- **AVG** - Calculate average values
- **SUM** - Sum of all values
- **MIN** - Minimum value
- **MAX** - Maximum value
- **COUNT** - Count of records
- **COUNT_DISTINCT** - Count unique values

### 2. **Statistical Functions** 📈
Advanced statistical analysis for data quality and insights:
- **STDDEV** - Standard Deviation (measure of variability)
- **VARIANCE** - Statistical variance
- **MEDIAN** - Middle value (50th percentile)
- **MODE** - Most frequently occurring value
- **PERCENTILE_25** - 25th percentile (Q1)
- **PERCENTILE_50** - 50th percentile (median)
- **PERCENTILE_75** - 75th percentile (Q3)
- **PERCENTILE_95** - 95th percentile (p95 latency)
- **PERCENTILE_99** - 99th percentile (p99 latency)

### 3. **Window Functions** 🪟
Advanced analytics with window operations:
- **LAG** - Access previous row value (time-shift backward)
- **LEAD** - Access next row value (time-shift forward)
- **RANK** - Ranking with gaps
- **DENSE_RANK** - Ranking without gaps
- **ROW_NUMBER** - Sequential row numbering
- **NTILE** - Divide data into N buckets
- **FIRST_VALUE** - First value in window
- **LAST_VALUE** - Last value in window

### 4. **Time-Series Functions** ⏱️
Specialized functions for time-series analysis:
- **MOVING_AVG** - Moving average (configurable window size)
- **CUMULATIVE_SUM** - Running total over time
- **RATE_OF_CHANGE** - Percentage change between periods
- **DELTA** - Absolute difference between periods
- **YEAR_OVER_YEAR** - YoY growth comparison
- **MONTH_OVER_MONTH** - MoM growth comparison

### 5. **Advanced Capabilities**

#### Time Bucket Intervals
Configure data aggregation intervals:
- **1m** - 1 minute
- **5m** - 5 minutes
- **15m** - 15 minutes
- **30m** - 30 minutes
- **1h** - 1 hour
- **6h** - 6 hours
- **12h** - 12 hours
- **1d** - 1 day
- **7d** - 7 days

#### Conditional Aggregations
Add WHERE clauses to filter data during aggregation:
```sql
AVG(cpu_usage) FILTER (WHERE status = 'active' AND value > 50)
```

#### Window Configurations
- **Window Size**: Configure lookback/lookahead periods
- **Partition By**: Group window operations by specific columns
- **Order By**: Define ordering within windows

#### Group By Support
Multi-dimensional grouping:
- Group by sensor_id, location, status, etc.
- Multiple group-by columns supported
- Dynamic column selection

## Pre-built Templates

### 1. **Web Analytics Dashboard** 🌐
Perfect for monitoring website traffic:
- Total page views (SUM)
- Unique visitors (COUNT_DISTINCT)
- Average session duration (AVG)
- Bounce rate calculation (AVG)

**Use Case**: E-commerce sites, content platforms, marketing analytics

### 2. **Financial KPIs** 💰
Comprehensive financial metrics:
- Total revenue (SUM)
- 7-day moving average
- Cumulative revenue tracking
- Year-over-year growth rate

**Use Case**: Finance teams, revenue tracking, trend analysis

### 3. **System Performance** ⚡
Monitor infrastructure health:
- Average CPU usage (AVG)
- 95th percentile CPU (P95)
- Peak memory usage (MAX)
- 99th percentile latency (P99)

**Use Case**: DevOps, SRE teams, infrastructure monitoring

### 4. **Statistical Analysis** 📊
Data quality and distribution analysis:
- Mean (AVG)
- Median (PERCENTILE_50)
- Standard deviation (STDDEV)
- Variance (VARIANCE)
- Min/Max range

**Use Case**: Data science, quality assurance, research

## How to Use

### Step 1: Open Advanced Aggregations
Click the **Calculator** icon (🧮) in the enterprise toolbar.

### Step 2: Select Time Bucket
Choose your aggregation interval (1m, 5m, 1h, 1d, etc.)

### Step 3: Add Metrics
1. Click **"Add Metric"**
2. Select column to aggregate
3. Choose aggregation function
4. Optionally add an alias
5. Configure filters if needed

### Step 4: Configure Grouping (Optional)
Click columns to group by (sensor_id, location, etc.)

### Step 5: Generate SQL
Click **"Generate SQL"** to see the resulting query:
```sql
SELECT
  TIME_BUCKET('1h', timestamp) AS time_bucket,
  AVG(temperature) AS avg_temp,
  PERCENTILE_CONT(0.95)(temperature) AS p95_temp,
  MAX(temperature) AS peak_temp
FROM timeseries_data
GROUP BY time_bucket
ORDER BY time_bucket DESC;
```

### Step 6: Apply or Export
- **Apply Aggregations**: Execute the aggregations
- **Copy SQL**: Copy query to clipboard
- **Export SQL**: Save query for later use

## Real-World Examples

### Example 1: Server Monitoring
**Goal**: Monitor server CPU usage with alerts on high percentiles

**Configuration**:
- Column: `cpu_usage`
- Functions: AVG, PERCENTILE_95, MAX
- Time Bucket: 5m
- Group By: server_id
- Filter: `status = 'active'`

**Generated SQL**:
```sql
SELECT
  TIME_BUCKET('5m', timestamp) AS time_bucket,
  AVG(cpu_usage) FILTER (WHERE status = 'active') AS avg_cpu,
  PERCENTILE_CONT(0.95)(cpu_usage) AS p95_cpu,
  MAX(cpu_usage) AS peak_cpu,
  server_id
FROM timeseries_data
GROUP BY time_bucket, server_id
ORDER BY time_bucket DESC;
```

### Example 2: Sales Trend Analysis
**Goal**: Track daily revenue with moving averages

**Configuration**:
- Column: `revenue`
- Functions: SUM, MOVING_AVG (7-day), YEAR_OVER_YEAR
- Time Bucket: 1d
- Group By: product_category

**Generated SQL**:
```sql
SELECT
  TIME_BUCKET('1d', timestamp) AS time_bucket,
  SUM(revenue) AS daily_revenue,
  AVG(revenue) OVER (ORDER BY timestamp ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS ma_7day,
  product_category
FROM timeseries_data
GROUP BY time_bucket, product_category
ORDER BY time_bucket DESC;
```

### Example 3: IoT Sensor Analysis
**Goal**: Analyze temperature sensor data with statistical measures

**Configuration**:
- Column: `temperature`
- Functions: AVG, MEDIAN, STDDEV, MIN, MAX
- Time Bucket: 15m
- Group By: sensor_id, location

**Generated SQL**:
```sql
SELECT
  TIME_BUCKET('15m', timestamp) AS time_bucket,
  AVG(temperature) AS mean_temp,
  PERCENTILE_CONT(0.50)(temperature) AS median_temp,
  STDDEV_SAMP(temperature) AS std_dev,
  MIN(temperature) AS min_temp,
  MAX(temperature) AS max_temp,
  sensor_id,
  location
FROM timeseries_data
GROUP BY time_bucket, sensor_id, location
ORDER BY time_bucket DESC;
```

## Best Practices

### 1. **Choose Appropriate Time Buckets**
- **Real-time dashboards**: 1m, 5m
- **Hourly analysis**: 1h, 6h
- **Daily reports**: 1d
- **Weekly trends**: 7d

### 2. **Use Percentiles for SLA Monitoring**
- P50 (median) - typical user experience
- P95 - catch outliers
- P99 - critical performance issues
- P99.9 - extreme edge cases

### 3. **Optimize with Filters**
Add WHERE clauses to:
- Reduce data volume
- Focus on specific conditions
- Improve query performance

### 4. **Window Functions for Trends**
- Use MOVING_AVG for smoothing noisy data
- Use LAG/LEAD for period-over-period comparisons
- Use CUMULATIVE_SUM for running totals

### 5. **Statistical Functions for Quality**
- STDDEV and VARIANCE for data consistency
- MEDIAN for central tendency (robust to outliers)
- MODE for most common values

## Performance Tips

### 1. **Limit Time Ranges**
Use smaller date ranges for complex aggregations:
- Last 24 hours for minute-level buckets
- Last 7 days for hourly buckets
- Last 30 days for daily buckets

### 2. **Index Strategy**
Ensure indexes on:
- Timestamp column (primary)
- Group-by columns (secondary)
- Filter columns (conditional)

### 3. **Materialized Views**
For frequently-used aggregations, consider:
- Pre-computing aggregations
- Refreshing on schedule
- Storing in separate tables

### 4. **Partition Large Tables**
Partition by time for better performance:
```sql
PARTITION BY RANGE (timestamp)
```

## Integration Points

### Dashboard Integration
- Results can be visualized in charts
- Combine with dashboard filters
- Save as dashboard widgets

### Alert Integration
- Set thresholds on aggregated metrics
- Alert on P95/P99 violations
- Monitor moving averages

### Export Integration
- Export aggregation results as CSV
- Schedule recurring reports
- API access for programmatic use

## Troubleshooting

### Common Issues

**Issue**: "Function not supported"
- **Solution**: Check database compatibility for window functions

**Issue**: "Query timeout"
- **Solution**: Reduce time range or increase time bucket size

**Issue**: "NULL values in results"
- **Solution**: Add COALESCE or filter NULL values

**Issue**: "Incorrect percentile calculation"
- **Solution**: Ensure sufficient data points (>100 recommended)

## Future Enhancements

Planned features:
- ✅ Custom formula builder with expressions
- ✅ ROLLUP and CUBE operations
- ✅ Pivot table transformations
- ✅ Correlation analysis between metrics
- ✅ Anomaly detection integration
- ✅ Query optimization hints
- ✅ Saved aggregation libraries
- ✅ Collaborative annotations

## Technical Details

### Supported Databases
- PostgreSQL 12+ (full support)
- TimescaleDB (optimized time-series)
- MonkDB (native support)

### SQL Standards
- SQL:2016 window functions
- ANSI SQL aggregations
- PostgreSQL extensions (percentile_cont)

### Browser Compatibility
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Support

For questions or issues:
- Check the documentation
- Review example templates
- Contact support team

---

**Version**: 1.0.0
**Last Updated**: 2026-01-24
**Component**: AdvancedAggregationPanel.tsx
