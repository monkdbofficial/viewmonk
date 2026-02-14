-- AQI Platform Schema for ViewMonk
-- This schema supports AI-powered AQI forecasting and analysis

-- Note: CrateDB creates schemas automatically when tables are created
-- No explicit CREATE SCHEMA needed

-- Stations table - stores air quality monitoring station information
CREATE TABLE IF NOT EXISTS aqi_platform.stations (
    station_id VARCHAR(50) PRIMARY KEY,
    station_name VARCHAR(200) NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Historical AQI readings - actual measured values
CREATE TABLE IF NOT EXISTS aqi_platform.readings (
    id BIGSERIAL PRIMARY KEY,
    station_id VARCHAR(50) NOT NULL,
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
    wind_speed DOUBLE PRECISION,
    FOREIGN KEY (station_id) REFERENCES aqi_platform.stations(station_id)
);

-- AI model predictions - forecasted AQI values
CREATE TABLE IF NOT EXISTS aqi_platform.predictions (
    id BIGSERIAL PRIMARY KEY,
    station_id VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    predicted_aqi DOUBLE PRECISION NOT NULL,
    model_type VARCHAR(50) DEFAULT 'lstm',
    confidence_score DOUBLE PRECISION DEFAULT 0.85,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (station_id) REFERENCES aqi_platform.stations(station_id)
);

-- Anomaly detection results
CREATE TABLE IF NOT EXISTS aqi_platform.anomalies (
    id BIGSERIAL PRIMARY KEY,
    station_id VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    aqi_value DOUBLE PRECISION NOT NULL,
    anomaly_score DOUBLE PRECISION NOT NULL,
    is_anomaly BOOLEAN DEFAULT FALSE,
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (station_id) REFERENCES aqi_platform.stations(station_id)
);

-- AQI classification logs
CREATE TABLE IF NOT EXISTS aqi_platform.classifications (
    id BIGSERIAL PRIMARY KEY,
    station_id VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    aqi INTEGER NOT NULL,
    category VARCHAR(50),
    health_impact VARCHAR(500),
    precautions TEXT,
    classified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (station_id) REFERENCES aqi_platform.stations(station_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_readings_station_time ON aqi_platform.readings(station_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_predictions_station_time ON aqi_platform.predictions(station_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_anomalies_station_time ON aqi_platform.anomalies(station_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_classifications_station_time ON aqi_platform.classifications(station_id, timestamp DESC);

-- Insert sample station
INSERT INTO aqi_platform.stations (station_id, station_name, latitude, longitude, city, state, country)
VALUES
    ('DEMO001', 'ViewMonk Demo Station', 37.7749, -122.4194, 'San Francisco', 'CA', 'USA')
ON CONFLICT (station_id) DO NOTHING;

-- Insert sample predictions (for demo purposes)
-- This generates 24 hours of forecast data
INSERT INTO aqi_platform.predictions (station_id, timestamp, predicted_aqi, model_type, confidence_score)
SELECT
    'DEMO001',
    NOW() + (INTERVAL '1 hour' * gs.n),
    50 + FLOOR(RANDOM() * 100),  -- Random AQI between 50-150
    'lstm',
    0.75 + (RANDOM() * 0.2)      -- Random confidence between 0.75-0.95
FROM generate_series(1, 24) AS gs(n)
ON CONFLICT DO NOTHING;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'AQI Platform schema created successfully!';
    RAISE NOTICE 'Sample data inserted for DEMO001 station';
    RAISE NOTICE 'You can now use the AQI Forecast feature in ViewMonk';
END $$;
