-- AQI Platform Enterprise Extension Schema
-- Extends the base schema with 24/7 AI Agent monitoring, multi-signal ingestion,
-- geo-temporal correlation, and automated mitigation tracking

-- ============================================================================
-- 1. AGENT ACTIVITY TRACKING (24/7 Automated Operations)
-- ============================================================================

-- Track 8 agent types: Ingestion, Correlation, Classification, Forecasting,
-- Mitigation, Compliance, Learning, Alert
CREATE TABLE IF NOT EXISTS aqi_platform.agent_activities (
    id BIGSERIAL PRIMARY KEY,
    agent_type VARCHAR(50) NOT NULL, -- 'ingestion', 'correlation', 'classification', etc.
    agent_name VARCHAR(100) NOT NULL,
    execution_id VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL, -- 'running', 'completed', 'failed'
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    duration_ms INTEGER,
    input_data OBJECT, -- JSON object with input parameters
    output_data OBJECT, -- JSON object with results
    error_message TEXT,
    metrics OBJECT -- Performance metrics (records_processed, accuracy, etc.)
);

CREATE INDEX IF NOT EXISTS idx_agent_activities_type_time
ON aqi_platform.agent_activities(agent_type, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_activities_status
ON aqi_platform.agent_activities(status, started_at DESC);

-- ============================================================================
-- 2. POLLUTION SOURCE CLASSIFICATION (With Evidence)
-- ============================================================================

-- Pollution events with source attribution and evidence
CREATE TABLE IF NOT EXISTS aqi_platform.pollution_events (
    id BIGSERIAL PRIMARY KEY,
    station_id VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    source_type VARCHAR(50) NOT NULL, -- 'TRAFFIC', 'INDUSTRIAL', 'CONSTRUCTION', etc.
    confidence_score DOUBLE PRECISION NOT NULL,
    evidence OBJECT, -- Traffic density, industrial activity, etc.
    pollutant_fingerprint OBJECT, -- PM2.5, PM10, NO2, SO2, CO, O3 levels
    geo_location ARRAY(DOUBLE PRECISION), -- [lon, lat] of source
    spatial_radius_m DOUBLE PRECISION, -- Affected radius in meters
    classification_method VARCHAR(50), -- 'geo_temporal', 'pollutant_signature', 'ml_model'
    agent_id VARCHAR(100), -- Reference to classification agent
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (station_id) REFERENCES aqi_platform.stations(station_id)
);

CREATE INDEX IF NOT EXISTS idx_pollution_events_station_time
ON aqi_platform.pollution_events(station_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_pollution_events_source
ON aqi_platform.pollution_events(source_type, timestamp DESC);

-- ============================================================================
-- 3. GEO-TEMPORAL CORRELATION (Root Cause Discovery)
-- ============================================================================

-- Geo-temporal correlation events linking AQI spikes to upstream factors
CREATE TABLE IF NOT EXISTS aqi_platform.correlation_events (
    id BIGSERIAL PRIMARY KEY,
    station_id VARCHAR(50) NOT NULL,
    spike_timestamp TIMESTAMP NOT NULL,
    spike_aqi DOUBLE PRECISION NOT NULL,
    baseline_aqi DOUBLE PRECISION,
    time_delta_minutes INTEGER, -- Time before spike when causative event occurred
    spatial_factors OBJECT, -- Road segments, industrial polygons, construction sites upwind
    temporal_factors OBJECT, -- Traffic changes, industrial runtime, weather shifts
    weather_correlation OBJECT, -- Wind direction, speed, humidity, inversion layers
    traffic_correlation OBJECT, -- Congestion level, idling time, vehicle density
    industrial_correlation OBJECT, -- Stack emissions, operational changes
    confidence_score DOUBLE PRECISION,
    correlation_strength VARCHAR(20), -- 'strong', 'moderate', 'weak'
    agent_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (station_id) REFERENCES aqi_platform.stations(station_id)
);

CREATE INDEX IF NOT EXISTS idx_correlation_station_time
ON aqi_platform.correlation_events(station_id, spike_timestamp DESC);

-- ============================================================================
-- 4. AUTOMATED MITIGATION ACTIONS (Closed-Loop Control)
-- ============================================================================

-- Log automated actions triggered by mitigation agents
CREATE TABLE IF NOT EXISTS aqi_platform.mitigation_actions (
    id BIGSERIAL PRIMARY KEY,
    action_id VARCHAR(100) NOT NULL UNIQUE,
    station_id VARCHAR(50) NOT NULL,
    trigger_event_id BIGINT, -- Reference to pollution_event or anomaly
    action_type VARCHAR(100) NOT NULL, -- 'traffic_rerouting', 'signal_adjustment', 'industrial_alert', etc.
    action_details OBJECT, -- Specific parameters (route changes, signal timings, etc.)
    target_system VARCHAR(100), -- 'traffic_api', 'enforcement_system', 'citizen_app', etc.
    api_endpoint VARCHAR(500),
    request_payload OBJECT,
    response_payload OBJECT,
    status VARCHAR(20) NOT NULL, -- 'initiated', 'executed', 'completed', 'failed'
    triggered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    executed_at TIMESTAMP,
    effectiveness_score DOUBLE PRECISION, -- Measured AQI improvement (0-1)
    aqi_before DOUBLE PRECISION,
    aqi_after DOUBLE PRECISION,
    outcome_notes TEXT,
    agent_id VARCHAR(100),
    FOREIGN KEY (station_id) REFERENCES aqi_platform.stations(station_id)
);

CREATE INDEX IF NOT EXISTS idx_mitigation_station_time
ON aqi_platform.mitigation_actions(station_id, triggered_at DESC);

CREATE INDEX IF NOT EXISTS idx_mitigation_type_status
ON aqi_platform.mitigation_actions(action_type, status);

-- ============================================================================
-- 5. MULTI-SIGNAL ENRICHED DATA
-- ============================================================================

-- Traffic data streams
CREATE TABLE IF NOT EXISTS aqi_platform.traffic_data (
    id BIGSERIAL PRIMARY KEY,
    station_id VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    location ARRAY(DOUBLE PRECISION), -- [lon, lat]
    vehicle_density DOUBLE PRECISION, -- Vehicles per km
    avg_speed DOUBLE PRECISION, -- km/h
    congestion_level VARCHAR(20), -- 'free_flow', 'moderate', 'heavy', 'standstill'
    idling_time_seconds DOUBLE PRECISION,
    heavy_vehicle_percentage DOUBLE PRECISION,
    traffic_volume INTEGER, -- Total vehicle count
    source VARCHAR(50), -- 'google_maps', 'traffic_api', 'sensor'
    FOREIGN KEY (station_id) REFERENCES aqi_platform.stations(station_id)
);

CREATE INDEX IF NOT EXISTS idx_traffic_station_time
ON aqi_platform.traffic_data(station_id, timestamp DESC);

-- Industrial telemetry data
CREATE TABLE IF NOT EXISTS aqi_platform.industrial_telemetry (
    id BIGSERIAL PRIMARY KEY,
    facility_id VARCHAR(50) NOT NULL,
    station_id VARCHAR(50), -- Nearest monitoring station
    timestamp TIMESTAMP NOT NULL,
    location ARRAY(DOUBLE PRECISION), -- [lon, lat]
    facility_type VARCHAR(100), -- 'power_plant', 'factory', 'refinery', etc.
    stack_emissions OBJECT, -- SO2, NOx, PM emissions
    operational_load DOUBLE PRECISION, -- 0-100%
    runtime_hours DOUBLE PRECISION,
    fuel_type VARCHAR(50),
    compliance_status VARCHAR(20), -- 'compliant', 'violation', 'warning'
    FOREIGN KEY (station_id) REFERENCES aqi_platform.stations(station_id)
);

CREATE INDEX IF NOT EXISTS idx_industrial_station_time
ON aqi_platform.industrial_telemetry(station_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_industrial_facility_time
ON aqi_platform.industrial_telemetry(facility_id, timestamp DESC);

-- Weather context data
CREATE TABLE IF NOT EXISTS aqi_platform.weather_context (
    id BIGSERIAL PRIMARY KEY,
    station_id VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    temperature DOUBLE PRECISION, -- Celsius
    humidity DOUBLE PRECISION, -- Percentage
    wind_speed DOUBLE PRECISION, -- m/s
    wind_direction DOUBLE PRECISION, -- Degrees (0-360)
    pressure DOUBLE PRECISION, -- hPa
    precipitation DOUBLE PRECISION, -- mm
    inversion_layer_height DOUBLE PRECISION, -- meters
    atmospheric_stability VARCHAR(20), -- 'stable', 'neutral', 'unstable'
    source VARCHAR(50), -- 'openweather', 'noaa', 'sensor'
    FOREIGN KEY (station_id) REFERENCES aqi_platform.stations(station_id)
);

CREATE INDEX IF NOT EXISTS idx_weather_station_time
ON aqi_platform.weather_context(station_id, timestamp DESC);

-- Construction activity tracking
CREATE TABLE IF NOT EXISTS aqi_platform.construction_activity (
    id BIGSERIAL PRIMARY KEY,
    project_id VARCHAR(50) NOT NULL,
    station_id VARCHAR(50), -- Nearest station
    timestamp TIMESTAMP NOT NULL,
    location ARRAY(DOUBLE PRECISION), -- [lon, lat]
    project_type VARCHAR(100), -- 'building', 'road', 'demolition', etc.
    activity_level VARCHAR(20), -- 'low', 'moderate', 'high'
    dust_control_measures BOOLEAN,
    site_covered BOOLEAN,
    permit_status VARCHAR(20),
    area_sqm DOUBLE PRECISION,
    FOREIGN KEY (station_id) REFERENCES aqi_platform.stations(station_id)
);

CREATE INDEX IF NOT EXISTS idx_construction_station_time
ON aqi_platform.construction_activity(station_id, timestamp DESC);

-- ============================================================================
-- 6. VECTOR SIMILARITY SEARCH (Historical Pattern Matching)
-- ============================================================================

-- Pollution snapshots with vector embeddings for similarity search
CREATE TABLE IF NOT EXISTS aqi_platform.vector_snapshots (
    id BIGSERIAL PRIMARY KEY,
    snapshot_id VARCHAR(100) NOT NULL UNIQUE,
    station_id VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    aqi DOUBLE PRECISION NOT NULL,
    pollutants OBJECT, -- PM2.5, PM10, NO2, etc.
    weather_data OBJECT, -- Wind, temp, humidity snapshot
    traffic_data OBJECT, -- Density, speed, congestion
    industrial_data OBJECT, -- Nearby facility activity
    source_attribution VARCHAR(50), -- Root cause identified
    embedding_vector FLOAT_VECTOR(768), -- Vector embedding for similarity search
    snapshot_context OBJECT, -- Full context for RAG
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (station_id) REFERENCES aqi_platform.stations(station_id)
);

CREATE INDEX IF NOT EXISTS idx_snapshots_station_time
ON aqi_platform.vector_snapshots(station_id, timestamp DESC);

-- Vector similarity index (if MonkDB supports)
-- CREATE INDEX IF NOT EXISTS idx_snapshots_vector
-- ON aqi_platform.vector_snapshots USING HNSW(embedding_vector);

-- ============================================================================
-- 7. COMPLIANCE & ENFORCEMENT TRACKING
-- ============================================================================

-- Track compliance violations and enforcement actions
CREATE TABLE IF NOT EXISTS aqi_platform.compliance_tracking (
    id BIGSERIAL PRIMARY KEY,
    violation_id VARCHAR(100) NOT NULL UNIQUE,
    entity_id VARCHAR(100) NOT NULL, -- Facility, vehicle, construction site ID
    entity_type VARCHAR(50) NOT NULL, -- 'industrial', 'vehicle', 'construction'
    station_id VARCHAR(50),
    violation_timestamp TIMESTAMP NOT NULL,
    violation_type VARCHAR(100), -- 'emission_exceedance', 'dust_control', 'illegal_burning', etc.
    severity VARCHAR(20), -- 'minor', 'moderate', 'major', 'critical'
    evidence_data OBJECT, -- Sensor readings, ANPR data, drone imagery
    enforcement_action VARCHAR(100), -- 'warning', 'fine', 'shutdown_order', etc.
    enforcement_status VARCHAR(20), -- 'pending', 'issued', 'resolved'
    issued_by VARCHAR(100),
    issued_at TIMESTAMP,
    resolved_at TIMESTAMP,
    fine_amount DOUBLE PRECISION,
    notes TEXT,
    agent_id VARCHAR(100),
    FOREIGN KEY (station_id) REFERENCES aqi_platform.stations(station_id)
);

CREATE INDEX IF NOT EXISTS idx_compliance_entity_time
ON aqi_platform.compliance_tracking(entity_id, violation_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_compliance_status
ON aqi_platform.compliance_tracking(enforcement_status, violation_timestamp DESC);

-- ============================================================================
-- 8. LEARNING OUTCOMES (Agent Improvement Tracking)
-- ============================================================================

-- Track learning and improvement metrics for agents
CREATE TABLE IF NOT EXISTS aqi_platform.learning_outcomes (
    id BIGSERIAL PRIMARY KEY,
    agent_type VARCHAR(50) NOT NULL,
    evaluation_timestamp TIMESTAMP NOT NULL,
    evaluation_period VARCHAR(50), -- 'daily', 'weekly', 'monthly'
    accuracy_score DOUBLE PRECISION,
    precision_score DOUBLE PRECISION,
    recall_score DOUBLE PRECISION,
    f1_score DOUBLE PRECISION,
    improvement_percentage DOUBLE PRECISION,
    training_iterations INTEGER,
    model_version VARCHAR(50),
    feedback_incorporated INTEGER, -- Count of feedback items used
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_learning_agent_time
ON aqi_platform.learning_outcomes(agent_type, evaluation_timestamp DESC);

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'AQI Enterprise Extension Created!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Added Tables:';
    RAISE NOTICE '  - agent_activities (24/7 agent monitoring)';
    RAISE NOTICE '  - pollution_events (source classification with evidence)';
    RAISE NOTICE '  - correlation_events (geo-temporal root cause)';
    RAISE NOTICE '  - mitigation_actions (automated action tracking)';
    RAISE NOTICE '  - traffic_data (multi-signal ingestion)';
    RAISE NOTICE '  - industrial_telemetry (facility emissions)';
    RAISE NOTICE '  - weather_context (atmospheric conditions)';
    RAISE NOTICE '  - construction_activity (dust sources)';
    RAISE NOTICE '  - vector_snapshots (historical pattern matching)';
    RAISE NOTICE '  - compliance_tracking (violations & enforcement)';
    RAISE NOTICE '  - learning_outcomes (agent improvement)';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Your MonkDB AQI platform is now enterprise-ready!';
    RAISE NOTICE '========================================';
END $$;
