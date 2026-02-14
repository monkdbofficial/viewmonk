# MonkDB AQI Platform - Enterprise API Guide

Complete documentation for all enterprise-grade API endpoints supporting 24×7 automated AI operations, pollution source attribution, geo-temporal correlation, and automated mitigation.

---

## Table of Contents

1. [Agent Activity Monitoring](#1-agent-activity-monitoring)
2. [Mitigation Actions Tracking](#2-mitigation-actions-tracking)
3. [Enhanced Source Classification](#3-enhanced-source-classification)
4. [Geo-Temporal Correlation](#4-geo-temporal-correlation)
5. [Vector Similarity Search](#5-vector-similarity-search)
6. [Multi-Signal Enriched Data](#6-multi-signal-enriched-data)

---

## 1. Agent Activity Monitoring

### `GET /api/aqi/agents/activity`

Monitor 24×7 AI agent operations across 8 agent types.

**Agent Types:**
- **Ingestion** - Sensor & feed normalization
- **Correlation** - Geo-temporal root cause discovery
- **Classification** - Pollution pointer tagging
- **Forecasting** - Predict upcoming spikes
- **Mitigation** - Trigger actions & APIs
- **Compliance** - Track violations
- **Learning** - Improve model accuracy
- **Alert** - 24×7 notifications

**Query Parameters:**
```
?agent_type=correlation     # Filter by specific agent (optional)
?status=completed           # Filter by status: running, completed, failed
?hours_back=24             # Time window in hours (default 24)
?limit=100                 # Max results (default 100)
```

**Example Request:**
```bash
curl http://localhost:3000/api/aqi/agents/activity?agent_type=classification&hours_back=12
```

**Example Response:**
```json
{
  "success": true,
  "activities": [
    {
      "id": 1,
      "agent_type": "classification",
      "agent_name": "Pollution Source Classification Agent",
      "execution_id": "class-001-20260213-1430",
      "status": "completed",
      "started_at": "2026-02-13T14:30:00Z",
      "completed_at": "2026-02-13T14:30:10Z",
      "duration_ms": 10000,
      "input_data": {"station_id": "DEMO001", "aqi": 165},
      "output_data": {"source": "TRAFFIC", "confidence": 0.88},
      "metrics": {"classification_accuracy": 0.88}
    }
  ],
  "summary": {
    "total_count": 45,
    "by_agent": {"classification": 12, "correlation": 8},
    "by_status": {"completed": 42, "failed": 3},
    "avg_duration_ms": 8500,
    "success_rate": 93
  }
}
```

### `POST /api/aqi/agents/activity`

Record a new agent execution.

**Request Body:**
```json
{
  "agent_type": "forecasting",
  "agent_name": "AQI Forecasting Agent (LSTM)",
  "execution_id": "fore-001-20260213-1500",
  "status": "completed",
  "duration_ms": 30000,
  "input_data": {"station_id": "DEMO001", "hours_ahead": 24},
  "output_data": {"predictions_generated": 24},
  "metrics": {"model_accuracy": 0.87, "rmse": 12.5}
}
```

---

## 2. Mitigation Actions Tracking

### `GET /api/aqi/mitigation/actions`

Track automated mitigation actions taken by the system.

**Action Types:**
- `traffic_rerouting` - Adaptive traffic signal changes
- `route_diversion` - API calls to divert traffic
- `bus_optimization` - Bus stop dwell-time adjustments
- `enforcement_alert` - Alerts to enforcement teams
- `anpr_identification` - ANPR-based vehicle detection
- `citizen_alert` - SMS/App alerts to vehicle owners
- `industrial_throttle` - Industrial emissions throttling
- `construction_stopwork` - Dust control enforcement
- `public_advisory` - Health advisories

**Query Parameters:**
```
?station_id=DEMO001        # Filter by station
?action_type=traffic_rerouting  # Filter by action type
?status=completed          # Filter by status
?hours_back=24            # Time window
?effectiveness_min=0.5    # Min effectiveness score (0-1)
```

**Example Request:**
```bash
curl http://localhost:3000/api/aqi/mitigation/actions?station_id=DEMO001&hours_back=24
```

**Example Response:**
```json
{
  "success": true,
  "actions": [
    {
      "id": 1,
      "action_id": "mit-traffic-001",
      "station_id": "DEMO001",
      "action_type": "traffic_rerouting",
      "action_details": {"signal_adjustments": ["intersection_1", "intersection_2"]},
      "target_system": "Traffic Management System",
      "status": "completed",
      "triggered_at": "2026-02-13T14:00:00Z",
      "executed_at": "2026-02-13T14:01:00Z",
      "effectiveness_score": 0.75,
      "aqi_before": 165,
      "aqi_after": 145,
      "aqi_reduction": 20,
      "outcome_notes": "Traffic rerouted successfully, AQI reduced by 20 points"
    }
  ],
  "summary": {
    "total_count": 8,
    "by_type": {"traffic_rerouting": 3, "citizen_alert": 2},
    "by_status": {"completed": 7, "failed": 1},
    "avg_effectiveness": 0.72,
    "total_aqi_reduction": 65,
    "successful_count": 7
  }
}
```

---

## 3. Enhanced Source Classification

### `GET /api/aqi/classification`

Enterprise-grade pollution source classification with evidence and correlation.

**Source Types:**
- `TRAFFIC` - Vehicle emissions
- `INDUSTRIAL` - Factory/power plant emissions
- `CONSTRUCTION` - Dust and construction activity
- `REGIONAL_DRIFT` - Regional atmospheric conditions
- `BIOMASS_BURNING` - Crop/waste burning
- `MIXED` - Multiple contributing sources

**Query Parameters:**
```
?station_id=DEMO001    # Specific station (optional)
?hours_back=24         # Time window
?min_confidence=0.7    # Minimum confidence score
```

**Example Request:**
```bash
curl http://localhost:3000/api/aqi/classification?station_id=DEMO001
```

**Example Response:**
```json
{
  "success": true,
  "station_id": "DEMO001",
  "station_name": "ViewMonk Demo Station",
  "city": "San Francisco",
  "classification": {
    "timestamp": "2026-02-13T14:30:00Z",
    "source_type": "TRAFFIC",
    "confidence_score": 0.88,
    "classification_method": "geo_temporal",

    "evidence": {
      "traffic_density": 85,
      "avg_speed": 15,
      "congestion_level": "heavy",
      "idling_time": 120
    },

    "pollutant_fingerprint": {
      "pm25": 75,
      "pm10": 95,
      "no2": 125,
      "co": 8.5,
      "so2": 15,
      "o3": 45
    },

    "source_location": {"lon": -122.4194, "lat": 37.7749},
    "affected_radius_meters": 2000,

    "correlation": {
      "time_before_spike_minutes": 15,
      "spatial_factors": {"road_segments": ["I-101", "Highway-280"]},
      "weather_factors": {"wind_speed": 2.5, "wind_direction": 135},
      "traffic_factors": {"congestion": "heavy", "idling": "high"},
      "correlation_strength": "strong"
    }
  },

  "recommendations": {
    "immediate": [
      "Implement adaptive traffic signal timing",
      "Activate route diversion protocols",
      "Alert enforcement to reduce congestion"
    ],
    "long_term": [
      "Evaluate odd-even vehicle scheme",
      "Create low-emission zones"
    ],
    "confidence_level": "high",
    "priority": "urgent"
  }
}
```

---

## 4. Geo-Temporal Correlation

### `GET /api/aqi/correlation/geo-temporal`

Root cause discovery through geo-temporal analysis.

**Answers:**
1. **Time alignment** - "What changed 5-30 minutes before the spike?"
2. **Spatial narrowing** - "Which sources lie upwind?"
3. **Factor analysis** - Weather + traffic + industrial correlation

**Query Parameters:**
```
?station_id=DEMO001         # Required
?spike_timestamp=...        # Specific spike time (optional, defaults to latest)
?time_window_minutes=30     # Look-back window (default 30)
?radius_km=5                # Spatial search radius (default 5)
```

**Example Request:**
```bash
curl http://localhost:3000/api/aqi/correlation/geo-temporal?station_id=DEMO001&time_window_minutes=30
```

**Example Response:**
```json
{
  "success": true,
  "station_id": "DEMO001",
  "spike": {
    "timestamp": "2026-02-13T14:30:00Z",
    "aqi": 165,
    "baseline_aqi": 95,
    "spike_magnitude": 70,
    "pollutants": {"pm25": 75, "no2": 125, "co": 8.5}
  },

  "time_window": {
    "start": "2026-02-13T14:00:00Z",
    "end": "2026-02-13T14:30:00Z",
    "duration_minutes": 30
  },

  "correlation": {
    "weather_factors": {
      "wind_speed_ms": 2.5,
      "wind_direction_deg": 135,
      "humidity_pct": 65,
      "inversion_layer_m": 180,
      "atmospheric_condition": "highly_stable_stagnant"
    },

    "traffic_factors": {
      "vehicle_density": 85,
      "avg_speed_kmh": 15,
      "congestion_level": "heavy",
      "idling_time_sec": 120,
      "traffic_impact_score": 85
    },

    "industrial_factors": {
      "active_facilities": 2,
      "avg_operational_load_pct": 75,
      "violations": 0,
      "industrial_impact_score": 60
    },

    "construction_factors": {
      "active_sites": 1,
      "uncontrolled_sites": 1,
      "construction_impact_score": 70
    }
  },

  "analysis": {
    "likely_primary_source": "TRAFFIC",
    "contributing_factors": ["CONSTRUCTION", "REGIONAL_DRIFT"],
    "correlation_strength": "strong",
    "confidence_score": 0.85,
    "explanation": "High traffic impact detected (score: 85). Contributing factors: heavy congestion, low traffic speed, significant vehicle idling, elevated NO₂ levels indicating vehicle emissions"
  }
}
```

---

## 5. Vector Similarity Search

### `GET /api/aqi/similarity/historical`

Find similar historical pollution patterns using vector embeddings.

**Use Case:** "Have we seen this before? What caused it then?"

**Query Parameters:**
```
?station_id=DEMO001      # Required
?timestamp=...           # Specific time (optional)
?top_k=5                 # Number of similar patterns (default 5)
?min_similarity=0.7      # Minimum similarity score 0-1
?time_filter_days=90     # Only search last N days (optional)
```

**Example Request:**
```bash
curl http://localhost:3000/api/aqi/similarity/historical?station_id=DEMO001&top_k=5
```

**Example Response:**
```json
{
  "success": true,
  "current_snapshot": {
    "snapshot_id": "snap-20260213-1430",
    "timestamp": "2026-02-13T14:30:00Z",
    "aqi": 165,
    "source_attribution": "TRAFFIC"
  },

  "similar_patterns": [
    {
      "snapshot_id": "snap-20260205-0900",
      "timestamp": "2026-02-05T09:00:00Z",
      "aqi": 158,
      "source_attribution": "TRAFFIC",
      "similarity_score": 0.92,
      "time_difference": "8 days 5 hours ago",
      "context": {
        "weather": {"wind_speed": 2.8, "humidity": 68},
        "traffic": {"congestion": "heavy", "density": 82}
      }
    }
  ],

  "insights": {
    "pattern_found": true,
    "pattern_consistency": "88%",
    "dominant_source": "TRAFFIC",
    "occurrences": 5,
    "avg_aqi_of_similar_events": 162,

    "common_weather_factors": {
      "avg_wind_speed_ms": 2.7,
      "conditions": "calm_winds"
    },

    "common_traffic_factors": {
      "avg_vehicle_density": 83,
      "congestion_frequency": "100%",
      "pattern": "heavy_traffic"
    },

    "recommendations": [
      "Historical data shows traffic rerouting reduced AQI by 15-20% in similar events",
      "Similar patterns occurred 5 times in history"
    ],

    "learning": {
      "message": "Found 5 similar pollution events in history. Strong pattern detected: TRAFFIC was the cause in 88% of cases.",
      "confidence": "high"
    }
  }
}
```

---

## 6. Multi-Signal Enriched Data

### `GET /api/aqi/multi-signal/enriched`

Unified intelligence across all data streams.

**Data Streams:**
1. AQI sensors (PM2.5, PM10, NO₂, CO, SO₂, O₃)
2. Weather context (wind, humidity, temperature, inversion layers)
3. Traffic feeds (density, speed, congestion, idling)
4. Industrial telemetry (emissions, operational load)
5. Construction activity (permits, dust control)

**Query Parameters:**
```
?station_id=DEMO001    # Required
?timestamp=...         # Specific time (optional)
?include_history=1     # Include last N hours (default 1)
```

**Example Request:**
```bash
curl http://localhost:3000/api/aqi/multi-signal/enriched?station_id=DEMO001&include_history=3
```

**Example Response:**
```json
{
  "success": true,
  "station_id": "DEMO001",

  "time_range": {
    "latest": "2026-02-13T14:30:00Z",
    "oldest": "2026-02-13T11:30:00Z",
    "snapshots_count": 3
  },

  "enriched_snapshots": [
    {
      "timestamp": "2026-02-13T14:30:00Z",

      "aqi_data": {
        "aqi": 165,
        "pollutants": {"pm25": 75, "pm10": 95, "no2": 125},
        "category": "Unhealthy"
      },

      "weather_context": {
        "temperature_c": 22.5,
        "humidity_pct": 65,
        "wind_speed_ms": 2.5,
        "wind_direction_deg": 135,
        "inversion_layer_m": 180,
        "atmospheric_stability": "stable"
      },

      "traffic_context": {
        "vehicle_density": 85,
        "avg_speed_kmh": 15,
        "congestion_level": "heavy",
        "idling_time_sec": 120,
        "heavy_vehicle_pct": 25
      },

      "industrial_context": {
        "active_facilities": 2,
        "facilities": [
          {
            "facility_id": "IND-001",
            "facility_type": "power_plant",
            "operational_load_pct": 85,
            "compliance_status": "compliant"
          }
        ],
        "total_load": 155
      },

      "construction_context": {
        "active_sites": 1,
        "sites": [
          {
            "project_id": "CONST-001",
            "project_type": "building",
            "activity_level": "high",
            "dust_control_measures": false
          }
        ],
        "uncontrolled_sites": 1
      },

      "enrichment_quality": "excellent"
    }
  ],

  "summary_statistics": {
    "aqi": {"current": 165, "min": 95, "max": 165, "avg": 135, "trend": "increasing"},
    "pm25": {"current": 75, "avg": 58},
    "industrial_activity": {"avg_active_facilities": 2},
    "construction_activity": {"avg_active_sites": 1}
  },

  "data_completeness": {
    "aqi_readings": 3,
    "weather_readings": 3,
    "traffic_readings": 3,
    "industrial_readings": 6,
    "construction_readings": 3,
    "completeness_score": 95
  }
}
```

---

## Quick Start Guide

### 1. Setup Enterprise Schema
```bash
# Run base schema
monkdb -h localhost -p 4200 < schema/aqi-platform-schema.sql

# Run enterprise extension
monkdb -h localhost -p 4200 < schema/aqi-enterprise-extension.sql

# Load sample data
monkdb -h localhost -p 4200 < schema/sample-enterprise-data.sql
```

### 2. Test APIs
```bash
# Check agent activities
curl http://localhost:3000/api/aqi/agents/activity

# Check mitigation actions
curl http://localhost:3000/api/aqi/mitigation/actions?hours_back=24

# Get source classification
curl http://localhost:3000/api/aqi/classification?station_id=DEMO001

# Analyze geo-temporal correlation
curl http://localhost:3000/api/aqi/correlation/geo-temporal?station_id=DEMO001
```

### 3. View Dashboard
Navigate to: `http://localhost:3000/aqi-dashboard`

---

## Integration Examples

### Python
```python
import requests

# Get agent activities
response = requests.get('http://localhost:3000/api/aqi/agents/activity',
    params={'agent_type': 'forecasting', 'hours_back': 12})
data = response.json()

print(f"Success Rate: {data['summary']['success_rate']}%")
print(f"Total Executions: {data['summary']['total_count']}")
```

### JavaScript/TypeScript
```typescript
async function getClassification(stationId: string) {
  const response = await fetch(
    `/api/aqi/classification?station_id=${stationId}&min_confidence=0.7`
  );
  const data = await response.json();

  console.log(`Source: ${data.classification.source_type}`);
  console.log(`Confidence: ${data.classification.confidence_score}`);
  console.log(`Recommendations:`, data.recommendations.immediate);
}
```

---

## Support

For questions or issues:
- GitHub: https://github.com/anthropics/monkdb-aqi-platform
- Documentation: /docs
- API Reference: /docs/ENTERPRISE_API_GUIDE.md

---

*Enterprise AQI Platform powered by MonkDB • Version 1.0*
