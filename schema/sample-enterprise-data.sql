-- Sample Enterprise Data for MonkDB AQI Platform
-- This script populates all enterprise tables with realistic test data
-- for demonstrating 24/7 automated AI agent operations

-- ============================================================================
-- 1. SAMPLE AGENT ACTIVITIES (24/7 Operations)
-- ============================================================================

-- Ingestion Agent activities
INSERT INTO aqi_platform.agent_activities (
  agent_type, agent_name, execution_id, status, started_at, completed_at, duration_ms, input_data, output_data, metrics
) VALUES
  ('ingestion', 'AQI Data Ingestion Agent', 'ing-001-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MI'), 'completed',
   NOW() - INTERVAL '5 minutes', NOW() - INTERVAL '4 minutes 55 seconds', 5000,
   '{"source": "IoT sensors", "stations": 5}', '{"records_processed": 150, "errors": 0}',
   '{"throughput": 30, "success_rate": 1.0}'),

  ('ingestion', 'Weather Data Ingestion Agent', 'ing-002-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MI'), 'completed',
   NOW() - INTERVAL '10 minutes', NOW() - INTERVAL '9 minutes 50 seconds', 10000,
   '{"source": "OpenWeather API", "stations": 5}', '{"records_processed": 50, "errors": 0}',
   '{"api_calls": 5, "success_rate": 1.0}');

-- Correlation Agent activities
INSERT INTO aqi_platform.agent_activities (
  agent_type, agent_name, execution_id, status, started_at, completed_at, duration_ms, input_data, output_data, metrics
) VALUES
  ('correlation', 'Geo-Temporal Correlation Agent', 'corr-001-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MI'), 'completed',
   NOW() - INTERVAL '3 minutes', NOW() - INTERVAL '2 minutes 45 seconds', 15000,
   '{"station_id": "DEMO001", "spike_detected": true}', '{"correlations_found": 3, "primary_source": "TRAFFIC"}',
   '{"correlation_strength": 0.85, "confidence": 0.92}');

-- Classification Agent activities
INSERT INTO aqi_platform.agent_activities (
  agent_type, agent_name, execution_id, status, started_at, completed_at, duration_ms, input_data, output_data, metrics
) VALUES
  ('classification', 'Pollution Source Classification Agent', 'class-001-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MI'), 'completed',
   NOW() - INTERVAL '2 minutes', NOW() - INTERVAL '1 minute 50 seconds', 10000,
   '{"station_id": "DEMO001", "aqi": 165}', '{"source": "TRAFFIC", "confidence": 0.88}',
   '{"classification_accuracy": 0.88}');

-- Forecasting Agent activities
INSERT INTO aqi_platform.agent_activities (
  agent_type, agent_name, execution_id, status, started_at, completed_at, duration_ms, input_data, output_data, metrics
) VALUES
  ('forecasting', 'AQI Forecasting Agent (LSTM)', 'fore-001-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MI'), 'completed',
   NOW() - INTERVAL '15 minutes', NOW() - INTERVAL '14 minutes 30 seconds', 30000,
   '{"station_id": "DEMO001", "hours_ahead": 24}', '{"predictions_generated": 24, "avg_confidence": 0.85}',
   '{"model_accuracy": 0.87, "rmse": 12.5}');

-- Mitigation Agent activities
INSERT INTO aqi_platform.agent_activities (
  agent_type, agent_name, execution_id, status, started_at, completed_at, duration_ms, input_data, output_data, metrics
) VALUES
  ('mitigation', 'Automated Mitigation Agent', 'mit-001-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MI'), 'completed',
   NOW() - INTERVAL '8 minutes', NOW() - INTERVAL '7 minutes 55 seconds', 5000,
   '{"trigger": "aqi_spike", "station_id": "DEMO001"}', '{"actions_triggered": 2, "apis_called": 2}',
   '{"actions_successful": 2, "estimated_impact": 15}');

-- Compliance Agent activities
INSERT INTO aqi_platform.agent_activities (
  agent_type, agent_name, execution_id, status, started_at, completed_at, duration_ms, input_data, output_data, metrics
) VALUES
  ('compliance', 'Compliance Monitoring Agent', 'comp-001-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MI'), 'completed',
   NOW() - INTERVAL '20 minutes', NOW() - INTERVAL '19 minutes 45 seconds', 15000,
   '{"facilities_monitored": 10}', '{"violations_detected": 1, "alerts_sent": 1}',
   '{"compliance_rate": 0.90}');

-- Learning Agent activities
INSERT INTO aqi_platform.agent_activities (
  agent_type, agent_name, execution_id, status, started_at, completed_at, duration_ms, input_data, output_data, metrics
) VALUES
  ('learning', 'Model Learning & Improvement Agent', 'learn-001-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MI'), 'completed',
   NOW() - INTERVAL '1 hour', NOW() - INTERVAL '58 minutes', 120000,
   '{"model_type": "classification", "training_samples": 1000}', '{"accuracy_improvement": 0.03}',
   '{"previous_accuracy": 0.85, "new_accuracy": 0.88}');

-- Alert Agent activities
INSERT INTO aqi_platform.agent_activities (
  agent_type, agent_name, execution_id, status, started_at, completed_at, duration_ms, input_data, output_data, metrics
) VALUES
  ('alert', 'Real-time Alert Agent', 'alert-001-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MI'), 'completed',
   NOW() - INTERVAL '1 minute', NOW() - INTERVAL '58 seconds', 2000,
   '{"alert_type": "high_aqi", "station_id": "DEMO001"}', '{"citizens_notified": 150, "authorities_alerted": 3}',
   '{"delivery_rate": 0.98}');

-- ============================================================================
-- 2. SAMPLE POLLUTION EVENTS (Source Classification with Evidence)
-- ============================================================================

INSERT INTO aqi_platform.pollution_events (
  station_id, timestamp, source_type, confidence_score, evidence, pollutant_fingerprint,
  geo_location, spatial_radius_m, classification_method, agent_id
) VALUES
  ('DEMO001', NOW() - INTERVAL '30 minutes', 'TRAFFIC', 0.88,
   '{"traffic_density": 85, "avg_speed": 15, "congestion_level": "heavy", "idling_time": 120}',
   '{"pm25": 75, "pm10": 95, "no2": 125, "co": 8.5, "so2": 15, "o3": 45}',
   ARRAY[-122.4194, 37.7749], 2000, 'geo_temporal', 'class-001'),

  ('DEMO001', NOW() - INTERVAL '2 hours', 'INDUSTRIAL', 0.75,
   '{"active_facilities": 2, "operational_load": 85, "stack_emissions": "elevated"}',
   '{"pm25": 60, "pm10": 80, "no2": 145, "co": 6.2, "so2": 85, "o3": 35}',
   ARRAY[-122.4294, 37.7849], 5000, 'pollutant_signature', 'class-002'),

  ('DEMO001', NOW() - INTERVAL '4 hours', 'CONSTRUCTION', 0.82,
   '{"active_sites": 3, "dust_control": false, "activity_level": "high"}',
   '{"pm25": 45, "pm10": 150, "no2": 55, "co": 4.1, "so2": 12, "o3": 40}',
   ARRAY[-122.4094, 37.7649], 1500, 'geo_temporal', 'class-003');

-- ============================================================================
-- 3. SAMPLE MITIGATION ACTIONS (Automated Interventions)
-- ============================================================================

INSERT INTO aqi_platform.mitigation_actions (
  action_id, station_id, trigger_event_id, action_type, action_details, target_system,
  api_endpoint, request_payload, response_payload, status, triggered_at, executed_at,
  effectiveness_score, aqi_before, aqi_after, outcome_notes, agent_id
) VALUES
  ('mit-traffic-001', 'DEMO001', 1, 'traffic_rerouting',
   '{"signal_adjustments": ["intersection_1", "intersection_2"], "duration_minutes": 30}',
   'Traffic Management System', 'https://traffic-api.example.com/adjust',
   '{"action": "reroute", "junctions": [1, 2]}', '{"status": "success", "changes_applied": true}',
   'completed', NOW() - INTERVAL '25 minutes', NOW() - INTERVAL '24 minutes',
   0.75, 165, 145, 'Traffic rerouted successfully, AQI reduced by 20 points', 'mit-001'),

  ('mit-alert-001', 'DEMO001', 1, 'citizen_alert',
   '{"message": "High pollution detected. Avoid outdoor activity.", "recipients": 150}',
   'Citizen Notification System', 'https://notify-api.example.com/send',
   '{"alert_type": "aqi_high", "count": 150}', '{"delivered": 147, "failed": 3}',
   'completed', NOW() - INTERVAL '25 minutes', NOW() - INTERVAL '24 minutes 30 seconds',
   0.95, 165, 165, 'Citizens notified successfully, 98% delivery rate', 'mit-001'),

  ('mit-industrial-001', 'DEMO001', 2, 'industrial_throttle',
   '{"facility_id": "IND-001", "load_reduction": 20, "duration_hours": 2}',
   'Industrial Monitoring System', 'https://industrial-api.example.com/throttle',
   '{"facility": "IND-001", "reduce_by": 20}', '{"acknowledged": true, "compliance": true}',
   'completed', NOW() - INTERVAL '1 hour 55 minutes', NOW() - INTERVAL '1 hour 54 minutes',
   0.68, 155, 132, 'Industrial load reduced, emissions decreased', 'mit-002'),

  ('mit-construction-001', 'DEMO001', 3, 'construction_stopwork',
   '{"project_id": "CONST-003", "reason": "dust_control_violation", "duration_hours": 4}',
   'Construction Compliance System', 'https://construction-api.example.com/stopwork',
   '{"project": "CONST-003", "immediate": true}', '{"work_stopped": true, "inspectors_dispatched": true}',
   'completed', NOW() - INTERVAL '3 hours 55 minutes', NOW() - INTERVAL '3 hours 54 minutes',
   0.85, 145, 108, 'Construction halted, dust control measures enforced', 'mit-003');

-- ============================================================================
-- 4. SAMPLE MULTI-SIGNAL DATA
-- ============================================================================

-- Traffic Data
INSERT INTO aqi_platform.traffic_data (
  station_id, timestamp, location, vehicle_density, avg_speed, congestion_level,
  idling_time_seconds, heavy_vehicle_percentage, traffic_volume, source
) VALUES
  ('DEMO001', NOW() - INTERVAL '30 minutes', ARRAY[-122.4194, 37.7749],
   85, 15, 'heavy', 120, 25, 450, 'google_maps'),

  ('DEMO001', NOW() - INTERVAL '1 hour', ARRAY[-122.4194, 37.7749],
   65, 35, 'moderate', 60, 20, 380, 'google_maps'),

  ('DEMO001', NOW() - INTERVAL '2 hours', ARRAY[-122.4194, 37.7749],
   45, 50, 'free_flow', 20, 15, 320, 'google_maps');

-- Weather Context
INSERT INTO aqi_platform.weather_context (
  station_id, timestamp, temperature, humidity, wind_speed, wind_direction,
  pressure, precipitation, inversion_layer_height, atmospheric_stability, source
) VALUES
  ('DEMO001', NOW() - INTERVAL '30 minutes', 22.5, 65, 2.5, 135, 1013, 0, 180, 'stable', 'openweather'),
  ('DEMO001', NOW() - INTERVAL '1 hour', 23.0, 62, 3.2, 145, 1013, 0, 220, 'neutral', 'openweather'),
  ('DEMO001', NOW() - INTERVAL '2 hours', 23.5, 60, 4.0, 150, 1014, 0, 350, 'unstable', 'openweather');

-- Industrial Telemetry
INSERT INTO aqi_platform.industrial_telemetry (
  facility_id, station_id, timestamp, location, facility_type, stack_emissions,
  operational_load, runtime_hours, fuel_type, compliance_status
) VALUES
  ('IND-001', 'DEMO001', NOW() - INTERVAL '2 hours', ARRAY[-122.4294, 37.7849],
   'power_plant', '{"so2": 85, "nox": 145, "pm": 60}', 85, 24.0, 'natural_gas', 'compliant'),

  ('IND-002', 'DEMO001', NOW() - INTERVAL '2 hours', ARRAY[-122.4394, 37.7949],
   'factory', '{"so2": 45, "nox": 95, "pm": 40}', 70, 16.0, 'natural_gas', 'compliant');

-- Construction Activity
INSERT INTO aqi_platform.construction_activity (
  project_id, station_id, timestamp, location, project_type, activity_level,
  dust_control_measures, site_covered, permit_status, area_sqm
) VALUES
  ('CONST-001', 'DEMO001', NOW() - INTERVAL '4 hours', ARRAY[-122.4094, 37.7649],
   'building', 'high', false, false, 'active', 5000),

  ('CONST-002', 'DEMO001', NOW() - INTERVAL '4 hours', ARRAY[-122.4154, 37.7709],
   'road', 'moderate', true, true, 'active', 8000),

  ('CONST-003', 'DEMO001', NOW() - INTERVAL '4 hours', ARRAY[-122.4214, 37.7769],
   'demolition', 'high', false, false, 'active', 3000);

-- ============================================================================
-- 5. SAMPLE COMPLIANCE TRACKING
-- ============================================================================

INSERT INTO aqi_platform.compliance_tracking (
  violation_id, entity_id, entity_type, station_id, violation_timestamp, violation_type,
  severity, evidence_data, enforcement_action, enforcement_status, issued_by, issued_at, fine_amount, notes
) VALUES
  ('VIO-001', 'CONST-003', 'construction', 'DEMO001', NOW() - INTERVAL '4 hours',
   'dust_control_violation', 'major',
   '{"pm10_spike": 150, "no_water_spraying": true, "site_uncovered": true}',
   'stop_work_order', 'issued', 'Environmental Inspector #42', NOW() - INTERVAL '3 hours 50 minutes',
   50000, 'Immediate halt issued due to severe dust emissions without control measures'),

  ('VIO-002', 'IND-001', 'industrial', 'DEMO001', NOW() - INTERVAL '1 week',
   'emission_exceedance', 'moderate',
   '{"so2_level": 95, "limit": 80, "duration_hours": 3}',
   'warning', 'resolved', 'Air Quality Inspector #15', NOW() - INTERVAL '6 days',
   25000, 'Warning issued, facility corrected emissions within 24 hours');

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Sample Enterprise Data Loaded!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Created:';
    RAISE NOTICE '  - 8 Agent Activities (24/7 operations)';
    RAISE NOTICE '  - 3 Pollution Events (with evidence)';
    RAISE NOTICE '  - 4 Mitigation Actions (automated)';
    RAISE NOTICE '  - 9 Multi-signal data points';
    RAISE NOTICE '  - 2 Compliance violations';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Your dashboard is now ready to test!';
    RAISE NOTICE 'Visit /aqi-dashboard to see the enterprise features in action.';
    RAISE NOTICE '========================================';
END $$;
