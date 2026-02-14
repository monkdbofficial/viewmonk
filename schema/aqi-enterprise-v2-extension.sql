-- ============================================================================
-- MonkDB AQI Platform - Enterprise V2 Schema Extensions
-- ============================================================================
-- Purpose: Add enterprise-grade analytics, health tracking, alerts, reporting,
--          and policy simulation capabilities to the AQI platform
-- ============================================================================

-- Create schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS aqi_platform;

-- ============================================================================
-- Health Impact Tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS aqi_platform.health_metrics (
  id BIGINT PRIMARY KEY,
  station_id VARCHAR(50) NOT NULL,
  date DATE NOT NULL,
  respiratory_cases INTEGER DEFAULT 0,
  hospital_admissions INTEGER DEFAULT 0,
  er_visits INTEGER DEFAULT 0,
  age_group VARCHAR(20), -- 'children', 'adults', 'elderly', 'all'
  vulnerable_population_affected INTEGER DEFAULT 0,
  asthma_attacks INTEGER DEFAULT 0,
  copd_exacerbations INTEGER DEFAULT 0,
  cardiovascular_events INTEGER DEFAULT 0,
  data_source VARCHAR(100),
  confidence_score DOUBLE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_health_station_date (station_id, date),
  INDEX idx_health_date (date)
);

-- ============================================================================
-- Real-Time Alert Management
-- ============================================================================

CREATE TABLE IF NOT EXISTS aqi_platform.alerts (
  id BIGINT PRIMARY KEY,
  alert_id VARCHAR(100) UNIQUE NOT NULL,
  alert_type VARCHAR(50) NOT NULL, -- 'aqi_spike', 'pollution_event', 'health_risk', 'compliance_violation'
  severity VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high', 'critical'
  station_id VARCHAR(50),
  location ARRAY(DOUBLE), -- [latitude, longitude]
  triggered_at TIMESTAMP NOT NULL,
  resolved_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'acknowledged', 'resolved', 'dismissed'
  message TEXT NOT NULL,
  details OBJECT, -- Additional alert details
  affected_population INTEGER,
  affected_area_sqkm DOUBLE,
  current_aqi INTEGER,
  pollutants OBJECT, -- Current pollutant levels
  recommended_actions OBJECT, -- Array of recommended mitigation actions
  auto_resolved BOOLEAN DEFAULT false,
  acknowledged_by VARCHAR(100),
  acknowledged_at TIMESTAMP,
  resolution_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_alerts_status (status),
  INDEX idx_alerts_severity (severity),
  INDEX idx_alerts_station (station_id),
  INDEX idx_alerts_triggered (triggered_at)
);

-- ============================================================================
-- Report Generation & Tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS aqi_platform.generated_reports (
  id BIGINT PRIMARY KEY,
  report_id VARCHAR(100) UNIQUE NOT NULL,
  report_type VARCHAR(50) NOT NULL, -- 'daily_summary', 'pollution_analysis', 'mitigation_effectiveness', 'compliance', 'custom'
  report_name VARCHAR(200),
  parameters OBJECT, -- Report generation parameters (date range, stations, etc.)
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'generating', 'completed', 'failed'
  file_path VARCHAR(500),
  file_format VARCHAR(20), -- 'pdf', 'csv', 'excel', 'json'
  file_size_bytes BIGINT,
  generated_at TIMESTAMP,
  generated_by VARCHAR(100),
  expires_at TIMESTAMP,
  download_count INTEGER DEFAULT 0,
  last_downloaded_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_reports_status (status),
  INDEX idx_reports_type (report_type),
  INDEX idx_reports_generated (generated_at)
);

-- ============================================================================
-- Scheduled Report Configuration
-- ============================================================================

CREATE TABLE IF NOT EXISTS aqi_platform.report_schedules (
  id BIGINT PRIMARY KEY,
  schedule_id VARCHAR(100) UNIQUE NOT NULL,
  schedule_name VARCHAR(200) NOT NULL,
  report_config OBJECT NOT NULL, -- Report type and parameters
  schedule_config OBJECT NOT NULL, -- Cron expression, timezone, frequency
  delivery_config OBJECT, -- Email recipients, webhook URLs, storage location
  active BOOLEAN DEFAULT true,
  created_by VARCHAR(100),
  last_execution TIMESTAMP,
  next_execution TIMESTAMP,
  execution_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_schedules_active (active),
  INDEX idx_schedules_next_execution (next_execution)
);

-- ============================================================================
-- Policy Simulation & Scenario Analysis
-- ============================================================================

CREATE TABLE IF NOT EXISTS aqi_platform.policy_simulations (
  id BIGINT PRIMARY KEY,
  simulation_id VARCHAR(100) UNIQUE NOT NULL,
  simulation_name VARCHAR(200) NOT NULL,
  description TEXT,
  station_id VARCHAR(50),
  region VARCHAR(100),
  baseline_period_start TIMESTAMP NOT NULL,
  baseline_period_end TIMESTAMP NOT NULL,
  simulation_duration_days INTEGER NOT NULL,
  policies OBJECT NOT NULL, -- Policy configurations (emission_cap, traffic_restrictions, etc.)
  baseline_metrics OBJECT, -- Historical AQI, emissions, health metrics
  simulated_metrics OBJECT, -- Projected improvements
  results OBJECT, -- Detailed simulation results
  assumptions OBJECT, -- Modeling assumptions
  confidence_score DOUBLE,
  cost_estimate_usd DOUBLE,
  health_benefits OBJECT, -- Estimated health impact reduction
  economic_impact OBJECT, -- Economic costs and benefits
  feasibility_score DOUBLE,
  created_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_simulations_station (station_id),
  INDEX idx_simulations_created (created_at)
);

-- ============================================================================
-- Custom Metrics Configuration
-- ============================================================================

CREATE TABLE IF NOT EXISTS aqi_platform.custom_metrics (
  id BIGINT PRIMARY KEY,
  metric_id VARCHAR(100) UNIQUE NOT NULL,
  metric_name VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(50), -- 'air_quality', 'health', 'environmental', 'economic'
  formula TEXT NOT NULL, -- SQL expression or calculation formula
  unit VARCHAR(50),
  aggregation_method VARCHAR(50), -- 'sum', 'avg', 'max', 'min', 'count'
  data_sources ARRAY(VARCHAR), -- Tables/APIs used
  refresh_interval_minutes INTEGER DEFAULT 60,
  active BOOLEAN DEFAULT true,
  created_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_calculated TIMESTAMP,
  INDEX idx_custom_metrics_active (active),
  INDEX idx_custom_metrics_category (category)
);

-- ============================================================================
-- API Authentication & Key Management
-- ============================================================================

CREATE TABLE IF NOT EXISTS aqi_platform.api_keys (
  id BIGINT PRIMARY KEY,
  key_id VARCHAR(100) UNIQUE NOT NULL,
  key_hash VARCHAR(256) NOT NULL, -- Hashed API key
  key_name VARCHAR(200) NOT NULL,
  key_prefix VARCHAR(20), -- First few chars of key for identification
  description TEXT,
  permissions OBJECT NOT NULL, -- Allowed endpoints, methods, rate limits
  rate_limit OBJECT, -- { requests_per_minute, requests_per_hour, requests_per_day }
  organization VARCHAR(200),
  created_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  last_used_at TIMESTAMP,
  active BOOLEAN DEFAULT true,
  revoked_at TIMESTAMP,
  revoked_by VARCHAR(100),
  revocation_reason TEXT,
  INDEX idx_api_keys_active (active),
  INDEX idx_api_keys_prefix (key_prefix)
);

-- ============================================================================
-- API Usage Tracking & Analytics
-- ============================================================================

CREATE TABLE IF NOT EXISTS aqi_platform.api_usage_logs (
  id BIGINT PRIMARY KEY,
  key_id VARCHAR(100),
  endpoint VARCHAR(500) NOT NULL,
  method VARCHAR(10) NOT NULL, -- 'GET', 'POST', 'PUT', 'DELETE'
  status_code INTEGER NOT NULL,
  response_time_ms INTEGER,
  request_size_bytes INTEGER,
  response_size_bytes INTEGER,
  ip_address VARCHAR(50),
  user_agent VARCHAR(500),
  query_params OBJECT,
  error_message TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_api_logs_key (key_id),
  INDEX idx_api_logs_endpoint (endpoint),
  INDEX idx_api_logs_timestamp (timestamp),
  INDEX idx_api_logs_status (status_code)
);

-- ============================================================================
-- Pollutant Standards & Guidelines Reference
-- ============================================================================

CREATE TABLE IF NOT EXISTS aqi_platform.pollutant_standards (
  pollutant VARCHAR(20) PRIMARY KEY,
  pollutant_name VARCHAR(100) NOT NULL,
  cas_number VARCHAR(50),
  national_standard DOUBLE, -- National air quality standard
  who_guideline DOUBLE, -- WHO guideline value
  epa_standard DOUBLE, -- EPA standard (if applicable)
  unit VARCHAR(20) NOT NULL,
  averaging_period VARCHAR(50), -- '1-hour', '8-hour', '24-hour', 'annual'
  health_threshold DOUBLE, -- Level at which health effects begin
  hazardous_threshold DOUBLE, -- Hazardous level
  health_effects TEXT, -- Description of health impacts
  sources TEXT, -- Common emission sources
  measurement_method VARCHAR(100),
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reference_url VARCHAR(500)
);

-- ============================================================================
-- Population Distribution & Demographics
-- ============================================================================

CREATE TABLE IF NOT EXISTS aqi_platform.population_data (
  id BIGINT PRIMARY KEY,
  area_id VARCHAR(100) UNIQUE NOT NULL,
  area_name VARCHAR(200) NOT NULL,
  area_type VARCHAR(50), -- 'city', 'district', 'neighborhood', 'grid_cell'
  location ARRAY(DOUBLE), -- [latitude, longitude] - centroid
  boundary_polygon OBJECT, -- GeoJSON polygon
  total_population INTEGER NOT NULL,
  population_density DOUBLE, -- per square km
  age_distribution OBJECT, -- { '0-5': count, '6-17': count, '18-64': count, '65+': count }
  vulnerable_population OBJECT, -- { 'children': count, 'elderly': count, 'respiratory_conditions': count }
  socioeconomic_index DOUBLE, -- Composite index (0-1)
  data_source VARCHAR(100),
  data_year INTEGER,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_population_area_type (area_type)
);

-- ============================================================================
-- Initial Data: Pollutant Standards
-- ============================================================================

INSERT INTO aqi_platform.pollutant_standards (pollutant, pollutant_name, national_standard, who_guideline, unit, averaging_period, health_threshold, hazardous_threshold, health_effects, sources) VALUES
('PM2.5', 'Fine Particulate Matter', 35.0, 15.0, 'μg/m³', '24-hour', 12.0, 250.0, 'Respiratory and cardiovascular effects, premature mortality', 'Vehicle emissions, industrial processes, combustion'),
('PM10', 'Particulate Matter', 150.0, 45.0, 'μg/m³', '24-hour', 50.0, 420.0, 'Respiratory irritation, reduced lung function', 'Dust, construction, industrial processes'),
('O3', 'Ozone', 0.070, 0.060, 'ppm', '8-hour', 0.054, 0.404, 'Respiratory irritation, asthma attacks', 'Photochemical reactions of NOx and VOCs'),
('NO2', 'Nitrogen Dioxide', 0.053, 0.021, 'ppm', 'annual', 0.030, 2.049, 'Respiratory inflammation, reduced immunity', 'Vehicle emissions, power plants'),
('SO2', 'Sulfur Dioxide', 0.075, 0.020, 'ppm', '1-hour', 0.035, 1.004, 'Respiratory effects, aggravates asthma', 'Coal combustion, industrial processes'),
('CO', 'Carbon Monoxide', 9.0, 9.0, 'ppm', '8-hour', 4.4, 50.4, 'Reduced oxygen delivery, cardiovascular effects', 'Vehicle emissions, incomplete combustion')
ON CONFLICT (pollutant) DO NOTHING;

-- ============================================================================
-- Views for Common Queries
-- ============================================================================

-- Active Alerts View
CREATE OR REPLACE VIEW aqi_platform.active_alerts AS
SELECT
  a.*,
  s.station_name,
  s.city,
  s.state
FROM aqi_platform.alerts a
LEFT JOIN aqi_platform.stations s ON a.station_id = s.station_id
WHERE a.status IN ('active', 'acknowledged')
ORDER BY a.severity DESC, a.triggered_at DESC;

-- Health Impact Summary View
CREATE OR REPLACE VIEW aqi_platform.health_impact_summary AS
SELECT
  DATE_TRUNC('day', date) as day,
  station_id,
  SUM(respiratory_cases) as total_respiratory_cases,
  SUM(hospital_admissions) as total_hospital_admissions,
  SUM(er_visits) as total_er_visits,
  SUM(asthma_attacks) as total_asthma_attacks,
  AVG(confidence_score) as avg_confidence
FROM aqi_platform.health_metrics
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', date), station_id
ORDER BY day DESC;

-- API Usage Summary View
CREATE OR REPLACE VIEW aqi_platform.api_usage_summary AS
SELECT
  key_id,
  DATE_TRUNC('hour', timestamp) as hour,
  COUNT(*) as request_count,
  AVG(response_time_ms) as avg_response_time_ms,
  SUM(CASE WHEN status_code >= 200 AND status_code < 300 THEN 1 ELSE 0 END) as success_count,
  SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as error_count
FROM aqi_platform.api_usage_logs
WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
GROUP BY key_id, DATE_TRUNC('hour', timestamp)
ORDER BY hour DESC;

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- Additional indexes for complex queries
CREATE INDEX IF NOT EXISTS idx_health_metrics_compound ON aqi_platform.health_metrics(station_id, date, age_group);
CREATE INDEX IF NOT EXISTS idx_alerts_compound ON aqi_platform.alerts(status, severity, triggered_at);
CREATE INDEX IF NOT EXISTS idx_simulations_compound ON aqi_platform.policy_simulations(station_id, created_at);

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

COMMENT ON TABLE aqi_platform.health_metrics IS 'Tracks correlation between air quality and health outcomes';
COMMENT ON TABLE aqi_platform.alerts IS 'Real-time alert management for pollution events and health risks';
COMMENT ON TABLE aqi_platform.generated_reports IS 'Tracks generated reports and their lifecycle';
COMMENT ON TABLE aqi_platform.report_schedules IS 'Configuration for automated report generation';
COMMENT ON TABLE aqi_platform.policy_simulations IS 'What-if scenarios for pollution control policies';
COMMENT ON TABLE aqi_platform.custom_metrics IS 'User-defined custom metrics and KPIs';
COMMENT ON TABLE aqi_platform.api_keys IS 'API authentication and authorization management';
COMMENT ON TABLE aqi_platform.api_usage_logs IS 'API usage tracking and analytics';
COMMENT ON TABLE aqi_platform.pollutant_standards IS 'Reference data for air quality standards';
COMMENT ON TABLE aqi_platform.population_data IS 'Population distribution for exposure analysis';

-- ============================================================================
-- Success Message
-- ============================================================================

SELECT 'Enterprise V2 schema extensions created successfully! 🎉' as status,
       '10 new tables added for advanced analytics, health tracking, alerts, and reporting' as message;
