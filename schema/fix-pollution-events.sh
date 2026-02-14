#!/bin/bash

MONK_URL="http://localhost:4200"

sql() {
    curl -s -X POST "$MONK_URL/_sql" \
        -H "Content-Type: application/json" \
        -d "{\"stmt\": $(echo "$1" | jq -Rs .)}"
}

echo "Fixing pollution_events table..."
echo ""

# Drop existing table
echo "1. Dropping old table..."
sql "DROP TABLE IF EXISTS aqi_platform.pollution_events" | jq -r 'if .error then "ERROR: " + .error.message else "✓ Dropped" end'

# Create with correct schema
echo "2. Creating new table with full schema..."
sql "CREATE TABLE IF NOT EXISTS aqi_platform.pollution_events (
    id BIGINT PRIMARY KEY,
    station_id TEXT NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    source_type TEXT,
    confidence_score DOUBLE PRECISION,
    evidence OBJECT(DYNAMIC),
    pollutant_fingerprint OBJECT(DYNAMIC),
    geo_location ARRAY(DOUBLE PRECISION),
    spatial_radius_m INTEGER,
    classification_method TEXT,
    agent_id TEXT
) WITH (number_of_replicas = 0)" | jq -r 'if .error then "ERROR: " + .error.message else "✓ Created" end'

# Insert sample data
echo "3. Inserting sample pollution events..."

sql "INSERT INTO aqi_platform.pollution_events VALUES (
    1,
    'DEMO001',
    CURRENT_TIMESTAMP - INTERVAL '30' MINUTE,
    'TRAFFIC',
    0.88,
    {traffic_density=85, avg_speed=15, congestion_level='heavy', idling_time=120},
    {pm25=75, pm10=95, no2=125, co=8.5, so2=15, o3=45},
    [-122.4194, 37.7749],
    2000,
    'geo_temporal',
    'class-001'
)" | jq -r 'if .error then "ERROR: " + .error.message else "✓ Traffic event" end'

sql "INSERT INTO aqi_platform.pollution_events VALUES (
    2,
    'DEMO001',
    CURRENT_TIMESTAMP - INTERVAL '2' HOUR,
    'INDUSTRIAL',
    0.75,
    {active_facilities=2, operational_load=85, stack_emissions='elevated'},
    {pm25=60, pm10=80, no2=145, co=6.2, so2=85, o3=35},
    [-122.4294, 37.7849],
    5000,
    'pollutant_signature',
    'class-002'
)" | jq -r 'if .error then "ERROR: " + .error.message else "✓ Industrial event" end'

sql "INSERT INTO aqi_platform.pollution_events VALUES (
    3,
    'DEMO001',
    CURRENT_TIMESTAMP - INTERVAL '4' HOUR,
    'CONSTRUCTION',
    0.82,
    {active_sites=3, dust_control=false, activity_level='high'},
    {pm25=45, pm10=150, no2=55, co=4.1, so2=12, o3=40},
    [-122.4094, 37.7649],
    1500,
    'geo_temporal',
    'class-003'
)" | jq -r 'if .error then "ERROR: " + .error.message else "✓ Construction event" end'

sql "REFRESH TABLE aqi_platform.pollution_events" > /dev/null

echo ""
echo "✓ Done! pollution_events table recreated with 3 sample events"
echo ""
