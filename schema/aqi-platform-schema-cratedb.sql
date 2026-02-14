-- AQI Platform Schema for ViewMonk (CrateDB-compatible)
-- This schema supports AI-powered AQI forecasting and analysis

-- Stations table - stores air quality monitoring station information
CREATE TABLE IF NOT EXISTS aqi_platform.stations (
    station_id TEXT PRIMARY KEY,
    station_name TEXT NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    city TEXT,
    state TEXT,
    country TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP,
    updated_at TIMESTAMP
) WITH (number_of_replicas = 0);

-- Historical AQI readings - actual measured values
CREATE TABLE IF NOT EXISTS aqi_platform.readings (
    id BIGINT PRIMARY KEY,
    station_id TEXT NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    aqi INTEGER NOT NULL,
    pm25 DOUBLE PRECISION,
    pm10 DOUBLE PRECISION,
    no2 DOUBLE PRECISION,
    so2 DOUBLE PRECISION,
    co DOUBLE PRECISION,
    o3 DOUBLE PRECISION,
    temperature DOUBLE PRECISION,
    humidity DOUBLE PRECISION,
    wind_speed DOUBLE PRECISION
) WITH (number_of_replicas = 0);

-- AI model predictions - forecasted AQI values
CREATE TABLE IF NOT EXISTS aqi_platform.predictions (
    id BIGINT PRIMARY KEY,
    station_id TEXT NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    predicted_aqi DOUBLE PRECISION NOT NULL,
    model_type TEXT DEFAULT 'lstm',
    confidence_score DOUBLE PRECISION DEFAULT 0.85,
    created_at TIMESTAMP
) WITH (number_of_replicas = 0);

-- Anomaly detection - flagged unusual AQI patterns
CREATE TABLE IF NOT EXISTS aqi_platform.anomalies (
    id BIGINT PRIMARY KEY,
    station_id TEXT NOT NULL,
    detected_at TIMESTAMP NOT NULL,
    severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    anomaly_score DOUBLE PRECISION,
    aqi_value INTEGER,
    expected_aqi DOUBLE PRECISION,
    deviation DOUBLE PRECISION,
    description TEXT
) WITH (number_of_replicas = 0);

-- AQI classifications - categorize air quality with health recommendations
CREATE TABLE IF NOT EXISTS aqi_platform.classifications (
    id BIGINT PRIMARY KEY,
    station_id TEXT NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    aqi INTEGER NOT NULL,
    category TEXT NOT NULL,
    health_message TEXT,
    recommendations OBJECT
) WITH (number_of_replicas = 0);

-- Insert demo station
INSERT INTO aqi_platform.stations (station_id, station_name, latitude, longitude, city, state, country, created_at, updated_at)
VALUES ('DEMO001', 'San Francisco Demo Station', 37.7749, -122.4194, 'San Francisco', 'California', 'USA', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

REFRESH TABLE aqi_platform.stations;
