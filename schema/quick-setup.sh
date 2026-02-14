#!/bin/bash

# Quick setup - insert sample data and create enterprise tables
MONK_URL="http://localhost:4200"

echo "Quick MonkDB Setup"
echo "=================="
echo ""

# Function to execute SQL
sql() {
    curl -s -X POST "$MONK_URL/_sql" \
        -H "Content-Type: application/json" \
        -d "{\"stmt\": $(echo "$1" | jq -Rs .)}" | jq -r 'if .error then "ERROR: " + .error.message else "OK" end'
}

# Insert demo station
echo "Inserting demo station..."
sql "INSERT INTO aqi_platform.stations (station_id, name, location, city, country) VALUES ('DEMO001', 'San Francisco Demo', [37.7749, -122.4194], 'San Francisco', 'USA') ON CONFLICT DO NOTHING"

sql "REFRESH TABLE aqi_platform.stations"

# Insert sample predictions
echo "Inserting sample predictions..."
NOW=$(date -u +"%Y-%m-%dT%H:%M:%S")
for i in {1..24}; do
    TS=$(date -u -v+${i}H +"%Y-%m-%dT%H:%M:%S" 2>/dev/null || date -u -d "+${i} hours" +"%Y-%m-%dT%H:%M:%S")
    AQI=$((50 + RANDOM % 100))
    sql "INSERT INTO aqi_platform.predictions (station_id, timestamp, predicted_aqi, model_type, confidence_score) VALUES ('DEMO001', '$TS', $AQI, 'lstm', 0.85) ON CONFLICT DO NOTHING" > /dev/null
done
sql "REFRESH TABLE aqi_platform.predictions"
echo "✓ Inserted 24 predictions"

echo ""
echo "Creating enterprise tables..."

# Agent activities table
echo "- agent_activities..."
sql "CREATE TABLE IF NOT EXISTS aqi_platform.agent_activities (
    id TEXT PRIMARY KEY,
    agent_type TEXT NOT NULL,
    agent_name TEXT,
    execution_id TEXT,
    status TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    duration_ms BIGINT,
    input_data OBJECT(DYNAMIC),
    output_data OBJECT(DYNAMIC),
    error_message TEXT,
    metrics OBJECT(DYNAMIC)
) WITH (number_of_replicas = 0)"

# Pollution events table
echo "- pollution_events..."
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
) WITH (number_of_replicas = 0)"

# Mitigation actions table
echo "- mitigation_actions..."
sql "CREATE TABLE IF NOT EXISTS aqi_platform.mitigation_actions (
    id BIGINT PRIMARY KEY,
    action_id TEXT NOT NULL,
    station_id TEXT NOT NULL,
    trigger_event_id BIGINT,
    action_type TEXT,
    action_details OBJECT(DYNAMIC),
    target_system TEXT,
    api_endpoint TEXT,
    request_payload OBJECT(DYNAMIC),
    response_payload OBJECT(DYNAMIC),
    status TEXT,
    triggered_at TIMESTAMP,
    executed_at TIMESTAMP,
    effectiveness_score DOUBLE PRECISION,
    aqi_before INTEGER,
    aqi_after INTEGER,
    outcome_notes TEXT,
    agent_id TEXT
) WITH (number_of_replicas = 0)"

echo ""
echo "Inserting sample enterprise data..."

# Sample agent activity
sql "INSERT INTO aqi_platform.agent_activities VALUES (
    'act-001',
    'ingestion',
    'AQI Data Ingestion Agent',
    'ing-001-$(date +%Y%m%d)',
    'completed',
    CURRENT_TIMESTAMP - INTERVAL '5' MINUTE,
    CURRENT_TIMESTAMP - INTERVAL '4' MINUTE,
    60000,
    {source='IoT sensors', stations=5},
    {records_processed=150, errors=0},
    NULL,
    {throughput=30, success_rate=1.0}
) ON CONFLICT DO NOTHING"

# Sample pollution event
sql "INSERT INTO aqi_platform.pollution_events VALUES (
    1,
    'DEMO001',
    CURRENT_TIMESTAMP - INTERVAL '30' MINUTE,
    'TRAFFIC',
    0.88,
    {traffic_density=85, avg_speed=15, congestion='heavy'},
    {pm25=75, pm10=95, no2=125},
    [-122.4194, 37.7749],
    2000,
    'geo_temporal',
    'class-001'
) ON CONFLICT DO NOTHING"

# Sample mitigation action
sql "INSERT INTO aqi_platform.mitigation_actions VALUES (
    1,
    'mit-traffic-001',
    'DEMO001',
    1,
    'traffic_rerouting',
    {signal_adjustments=['intersection_1', 'intersection_2']},
    'Traffic Management System',
    'https://traffic-api.example.com/adjust',
    {action='reroute', junctions=[1,2]},
    {status='success', changes_applied=true},
    'completed',
    CURRENT_TIMESTAMP - INTERVAL '25' MINUTE,
    CURRENT_TIMESTAMP - INTERVAL '24' MINUTE,
    0.75,
    165,
    145,
    'Traffic rerouted successfully',
    'mit-001'
) ON CONFLICT DO NOTHING"

sql "REFRESH TABLE aqi_platform.agent_activities"
sql "REFRESH TABLE aqi_platform.pollution_events"
sql "REFRESH TABLE aqi_platform.mitigation_actions"

echo ""
echo "✓ Setup Complete!"
echo ""
echo "Tables created:"
echo "  ✓ agent_activities"
echo "  ✓ pollution_events"  
echo "  ✓ mitigation_actions"
echo "  ✓ Sample data inserted"
echo ""
echo "Next: Refresh http://localhost:3000/aqi-dashboard"
echo ""
