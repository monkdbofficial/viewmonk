# ViewMonk AQI Platform Schema

## Overview

This schema supports AI-powered AQI (Air Quality Index) forecasting and analysis features in ViewMonk.

## Tables

- **stations** - Air quality monitoring station metadata
- **readings** - Historical AQI measurements
- **predictions** - AI model forecast results
- **anomalies** - Detected AQI anomalies
- **classifications** - AQI categorization and health recommendations

## Quick Setup

### Recommended: Automated Setup Script

The easiest way to set up the complete AQI platform with all enterprise features:

```bash
# Navigate to schema directory
cd schema

# Run the automated setup script
./setup-all.sh
```

This script will:
1. Create the base AQI platform schema
2. Add enterprise extensions (11 tables for 24/7 operations)
3. Load sample data for testing
4. Verify the setup

**Environment Variables** (optional - script uses defaults if not set):
```bash
export MONKDB_HOST=localhost      # Default: localhost
export MONKDB_PORT=5432           # Default: 5432
export MONKDB_DATABASE=monkdb     # Default: monkdb
export MONKDB_USER=crate          # Default: crate
export MONKDB_PASSWORD=           # Default: empty
```

### Manual Setup Options

If you prefer manual setup or need to run individual scripts:

#### Option 1: Using psql (PostgreSQL/CrateDB compatible)

```bash
# Step 1: Base schema
psql -h localhost -p 5432 -U crate -d monkdb -f aqi-platform-schema.sql

# Step 2: Enterprise extension
psql -h localhost -p 5432 -U crate -d monkdb -f aqi-enterprise-extension.sql

# Step 3: Sample data
psql -h localhost -p 5432 -U crate -d monkdb -f sample-enterprise-data.sql
```

#### Option 2: Using MonkDB CLI

```bash
monkdb -h localhost -p 4200 < aqi-platform-schema.sql
monkdb -h localhost -p 4200 < aqi-enterprise-extension.sql
monkdb -h localhost -p 4200 < sample-enterprise-data.sql
```

#### Option 3: Using ViewMonk Query Interface

1. Open ViewMonk in your browser
2. Go to the Query page
3. Copy and execute each SQL file in order:
   - `aqi-platform-schema.sql`
   - `aqi-enterprise-extension.sql`
   - `sample-enterprise-data.sql`

#### Option 4: Using curl with MonkDB HTTP API

```bash
# Base schema
curl -X POST http://localhost:4200/_sql \
  -H "Content-Type: application/json" \
  -d "{\"stmt\": \"$(cat aqi-platform-schema.sql)\"}"

# Enterprise extension
curl -X POST http://localhost:4200/_sql \
  -H "Content-Type: application/json" \
  -d "{\"stmt\": \"$(cat aqi-enterprise-extension.sql)\"}"

# Sample data
curl -X POST http://localhost:4200/_sql \
  -H "Content-Type: application/json" \
  -d "{\"stmt\": \"$(cat sample-enterprise-data.sql)\"}"
```

## Demo Data

When using the automated setup script or running `sample-enterprise-data.sql`, you get:

**Base Platform:**
- 1 sample station (`DEMO001` in San Francisco)
- 24 hours of forecast predictions
- Random AQI values for demonstration

**Enterprise Features:**
- 8 agent activity records (one per agent type)
- 3 pollution events with evidence and source classification
- 4 automated mitigation actions with effectiveness tracking
- Multi-signal data (traffic, weather, industrial, construction)
- 2 compliance violations for testing

## Testing

After setup, verify everything is working:

```sql
-- Check stations
SELECT * FROM aqi_platform.stations;

-- Check predictions
SELECT * FROM aqi_platform.predictions ORDER BY timestamp;

-- Check agent activities (24/7 operations)
SELECT agent_type, COUNT(*)
FROM aqi_platform.agent_activities
GROUP BY agent_type;

-- Check mitigation actions
SELECT action_type, status, aqi_before, aqi_after
FROM aqi_platform.mitigation_actions
ORDER BY triggered_at DESC;

-- Check pollution events with source classification
SELECT source_type, confidence_score, timestamp
FROM aqi_platform.pollution_events
ORDER BY timestamp DESC;
```

## Enterprise Extension Tables

The enterprise extension adds 11 production-ready tables:

1. **agent_activities** - Track 8 agent types running 24/7
   - Ingestion, Correlation, Classification, Forecasting, Mitigation, Compliance, Learning, Alert

2. **pollution_events** - Source classification with evidence
   - Traffic, Industrial, Construction, Regional Drift, Biomass Burning, Mixed

3. **correlation_events** - Geo-temporal root cause analysis
   - Time alignment (5-30 min before spike)
   - Spatial narrowing (upwind sources)
   - Impact scoring

4. **mitigation_actions** - Automated action tracking
   - Traffic rerouting, industrial throttling, construction stopwork, citizen alerts
   - Effectiveness scores and AQI impact measurement

5. **traffic_data** - Real-time traffic monitoring
6. **industrial_telemetry** - Facility emissions tracking
7. **weather_context** - Meteorological conditions
8. **construction_activity** - Construction site monitoring
9. **vector_snapshots** - Historical pattern matching via vector similarity
10. **compliance_tracking** - Violations and enforcement
11. **learning_outcomes** - Agent improvement metrics

## Production Setup

For production:
1. Remove demo data inserts
2. Add your real station data
3. Run the enterprise extension schema
4. Connect your AI models to populate predictions
5. Set up 24/7 MonkAgents for automated operations
6. Configure multi-signal data ingestion (traffic, weather, industrial)
7. Set up scheduled jobs for model updates

## Environment Variables

Make sure these are set in your `.env`:

```bash
MONKDB_URL=http://localhost:4200
NEXT_PUBLIC_DEFAULT_MONKDB_HOST=localhost
NEXT_PUBLIC_DEFAULT_MONKDB_PORT=4200
```
