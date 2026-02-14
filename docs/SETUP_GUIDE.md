# ViewMonk AQI Platform - Setup Guide

## Overview

This guide will help you set up the complete ViewMonk AQI Platform with all enterprise features including 24×7 AI agent monitoring, automated mitigation actions, and pollution source classification.

## Prerequisites

- Docker containers running (MonkDB/CrateDB and Next.js app)
- PostgreSQL client tools (`psql`) installed
- Terminal access

## Quick Setup (Recommended)

The fastest way to get everything running:

### Step 1: Navigate to Schema Directory

```bash
cd schema
```

### Step 2: Run Automated Setup Script

```bash
./setup-all.sh
```

This script will:
1. ✓ Create base AQI platform schema (stations, readings, predictions, anomalies, classifications)
2. ✓ Add enterprise extensions (11 tables for 24/7 operations)
3. ✓ Load sample data for testing
4. ✓ Verify the setup

### Step 3: Verify Setup

After the script completes, you should see:

```
========================================
Setup Complete!
========================================
Database is now ready with:
  ✓ Base AQI platform schema
  ✓ Enterprise features (11 tables)
  ✓ Sample data for testing
```

### Step 4: Test the Dashboard

1. Open your browser to http://localhost:3000/aqi-dashboard
2. You should now see:
   - **Agent Activity Monitor** - Showing 8 agent types with execution history
   - **Mitigation Actions Tracker** - Displaying automated actions with AQI impact
   - **Pollution Source Panel** - Classification data with evidence
   - No more error messages!

## What Gets Created

### Base Schema (5 Tables)

1. **stations** - Air quality monitoring station metadata
2. **readings** - Historical AQI measurements
3. **predictions** - AI model forecast results
4. **anomalies** - Detected AQI anomalies
5. **classifications** - AQI categorization and health recommendations

### Enterprise Extension (11 Tables)

1. **agent_activities** - Track 8 AI agent types running 24/7
   - Ingestion, Correlation, Classification, Forecasting, Mitigation, Compliance, Learning, Alert

2. **pollution_events** - Source classification with evidence
   - Traffic, Industrial, Construction, Regional Drift, Biomass Burning, Mixed
   - Pollutant fingerprints (PM2.5, PM10, NO₂, SO₂, CO, O₃)
   - Geo-temporal correlation data

3. **correlation_events** - Geo-temporal root cause analysis
   - Time alignment (5-30 min before spike)
   - Spatial narrowing (upwind sources)
   - Multi-factor correlation (weather, traffic, industrial)

4. **mitigation_actions** - Automated action tracking
   - Traffic rerouting, industrial throttling, construction stopwork
   - Effectiveness scores and AQI impact measurement
   - API call logs and response tracking

5. **traffic_data** - Real-time traffic monitoring
6. **industrial_telemetry** - Facility emissions tracking
7. **weather_context** - Meteorological conditions
8. **construction_activity** - Construction site monitoring
9. **vector_snapshots** - Historical pattern matching
10. **compliance_tracking** - Violations and enforcement
11. **learning_outcomes** - Agent improvement metrics

### Sample Data

The setup includes realistic test data:

- **8 Agent Activities** - One execution per agent type
- **3 Pollution Events** - With evidence and source classification
- **4 Mitigation Actions** - Showing AQI reductions and effectiveness
- **Multi-signal Data** - Traffic, weather, industrial, construction data
- **2 Compliance Violations** - For testing enforcement features

## Manual Setup (Alternative)

If you prefer to run SQL files manually:

### Using psql

```bash
# Step 1: Base schema
psql -h localhost -p 5432 -U crate -d monkdb -f schema/aqi-platform-schema.sql

# Step 2: Enterprise extension
psql -h localhost -p 5432 -U crate -d monkdb -f schema/aqi-enterprise-extension.sql

# Step 3: Sample data
psql -h localhost -p 5432 -U crate -d monkdb -f schema/sample-enterprise-data.sql
```

### Using MonkDB CLI

```bash
monkdb -h localhost -p 4200 < schema/aqi-platform-schema.sql
monkdb -h localhost -p 4200 < schema/aqi-enterprise-extension.sql
monkdb -h localhost -p 4200 < schema/sample-enterprise-data.sql
```

### Using curl (HTTP API)

```bash
# Base schema
curl -X POST http://localhost:4200/_sql \
  -H "Content-Type: application/json" \
  -d "{\"stmt\": \"$(cat schema/aqi-platform-schema.sql)\"}"

# Enterprise extension
curl -X POST http://localhost:4200/_sql \
  -H "Content-Type: application/json" \
  -d "{\"stmt\": \"$(cat schema/aqi-enterprise-extension.sql)\"}"

# Sample data
curl -X POST http://localhost:4200/_sql \
  -H "Content-Type: application/json" \
  -d "{\"stmt\": \"$(cat schema/sample-enterprise-data.sql)\"}"
```

## Testing Your Setup

After setup, verify everything is working:

### 1. Check Tables Created

```sql
-- List all tables in aqi_platform schema
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'aqi_platform'
ORDER BY table_name;
```

You should see 16 tables total (5 base + 11 enterprise).

### 2. Check Sample Data

```sql
-- Check agent activities
SELECT agent_type, COUNT(*)
FROM aqi_platform.agent_activities
GROUP BY agent_type;

-- Check mitigation actions
SELECT action_type, status, aqi_before, aqi_after
FROM aqi_platform.mitigation_actions
ORDER BY triggered_at DESC;

-- Check pollution events
SELECT source_type, confidence_score, timestamp
FROM aqi_platform.pollution_events
ORDER BY timestamp DESC;
```

### 3. Test Dashboard Features

Open http://localhost:3000/aqi-dashboard and verify:

- ✓ **24×7 Agent Activity Monitor** shows 8 agent types
- ✓ **Automated Mitigation Actions** shows AQI reductions
- ✓ **Pollution Source Panel** shows source classification
- ✓ No error messages about missing tables

## Environment Configuration

Ensure these environment variables are set in your `.env`:

```bash
# MonkDB Connection
MONKDB_URL=http://localhost:4200
MONKDB_HOST=localhost
MONKDB_PORT=5432
MONKDB_DATABASE=monkdb
MONKDB_USER=crate
MONKDB_PASSWORD=

# Next.js Public Variables
NEXT_PUBLIC_DEFAULT_MONKDB_HOST=localhost
NEXT_PUBLIC_DEFAULT_MONKDB_PORT=4200
```

## Troubleshooting

### Error: "Database setup required"

If you see amber warning boxes in the dashboard:

1. Make sure Docker containers are running
2. Run the setup script: `cd schema && ./setup-all.sh`
3. Check that all SQL files executed successfully
4. Refresh the dashboard

### Error: "psql: command not found"

Install PostgreSQL client tools:

```bash
# macOS
brew install postgresql

# Ubuntu/Debian
sudo apt-get install postgresql-client

# Windows
# Download from https://www.postgresql.org/download/windows/
```

### Error: "Connection refused"

1. Check Docker containers are running: `docker ps`
2. Verify MonkDB port: `docker logs <monkdb-container-id>`
3. Test connection: `psql -h localhost -p 5432 -U crate -d monkdb -c "SELECT 1"`

### Tables Already Exist

If you need to reset:

```sql
-- WARNING: This will delete all data!
DROP SCHEMA aqi_platform CASCADE;
```

Then run the setup script again.

## Next Steps

After successful setup:

1. **Explore the Dashboard** - http://localhost:3000/aqi-dashboard
   - View real-time agent activities
   - Monitor automated mitigation actions
   - Analyze pollution source classifications

2. **Read API Documentation** - `docs/ENTERPRISE_API_GUIDE.md`
   - Learn about all 6 enterprise API endpoints
   - See request/response examples
   - Try integration examples

3. **Customize Sample Data** - `schema/sample-enterprise-data.sql`
   - Modify station locations
   - Adjust AQI values
   - Add your own scenarios

4. **Build MonkAgents** - Set up 24/7 automated agents
   - Ingestion Agent - Normalize sensor data
   - Correlation Agent - Find root causes
   - Classification Agent - Identify pollution sources
   - Forecasting Agent - Predict AQI spikes
   - Mitigation Agent - Trigger automated actions
   - Compliance Agent - Track violations
   - Learning Agent - Improve models
   - Alert Agent - Notify stakeholders

## Production Deployment

For production use:

1. Remove demo data from SQL files
2. Add real station data
3. Configure external data sources (traffic, weather, industrial)
4. Set up scheduled jobs for agent executions
5. Configure alert notifications (SMS, email, app push)
6. Enable authentication and authorization
7. Set up monitoring and logging
8. Configure backup and disaster recovery

## Support

For issues or questions:

- Check `schema/README.md` for schema documentation
- Review `docs/ENTERPRISE_API_GUIDE.md` for API details
- Submit issues at: https://github.com/anthropics/claude-code/issues

---

**Setup Complete!** Your ViewMonk AQI Platform is now ready with enterprise-grade 24/7 AI agent monitoring and automated mitigation capabilities.
