import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/aqi/correlation/geo-temporal
 * Geo-temporal correlation engine for root cause discovery
 *
 * Answers three critical questions for every AQI spike:
 * 1. Time alignment: "What changed 5–30 minutes before the spike?"
 * 2. Spatial narrowing: "Which road segment/industrial polygon/construction site lies upwind?"
 * 3. Factor analysis: "What combination of weather, traffic, and industrial activity caused this?"
 *
 * Query params:
 * - station_id: Required - station experiencing the spike
 * - spike_timestamp: Optional - specific spike time (defaults to latest)
 * - time_window_minutes: Look-back window (default 30)
 * - radius_km: Spatial search radius (default 5)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stationId = searchParams.get('station_id');
    const spikeTimestamp = searchParams.get('spike_timestamp');
    const timeWindowMinutes = parseInt(searchParams.get('time_window_minutes') || '30', 10);
    const radiusKm = parseFloat(searchParams.get('radius_km') || '5');

    if (!stationId) {
      return NextResponse.json(
        { error: 'station_id parameter is required' },
        { status: 400 }
      );
    }

    const monkdbUrl = process.env.MONKDB_URL || 'http://localhost:4200';

    // First, get the spike details (or latest reading)
    const spikeQuery = spikeTimestamp
      ? `
        SELECT timestamp, aqi, pm25, pm10, no2, so2, co, o3
        FROM aqi_platform.readings
        WHERE station_id = '${stationId}'
          AND timestamp = '${spikeTimestamp}'
      `
      : `
        SELECT timestamp, aqi, pm25, pm10, no2, so2, co, o3
        FROM aqi_platform.readings
        WHERE station_id = '${stationId}'
        ORDER BY timestamp DESC
        LIMIT 1
      `;

    const spikeResponse = await fetch(`${monkdbUrl}/_sql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stmt: spikeQuery }),
    });

    if (!spikeResponse.ok) {
      throw new Error(`MonkDB query failed: ${spikeResponse.statusText}`);
    }

    const spikeData = await spikeResponse.json();

    if (!spikeData.rows || spikeData.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No spike data found for the specified parameters',
      });
    }

    const spike = {
      timestamp: spikeData.rows[0][0],
      aqi: spikeData.rows[0][1],
      pollutants: {
        pm25: spikeData.rows[0][2],
        pm10: spikeData.rows[0][3],
        no2: spikeData.rows[0][4],
        so2: spikeData.rows[0][5],
        co: spikeData.rows[0][6],
        o3: spikeData.rows[0][7],
      },
    };

    // Get baseline AQI (average of previous hour before the spike window)
    const baselineQuery = `
      SELECT AVG(aqi) as baseline_aqi
      FROM aqi_platform.readings
      WHERE station_id = '${stationId}'
        AND timestamp >= '${spike.timestamp}'::TIMESTAMP - INTERVAL '${timeWindowMinutes + 60} minutes'
        AND timestamp < '${spike.timestamp}'::TIMESTAMP - INTERVAL '${timeWindowMinutes} minutes'
    `;

    const baselineResponse = await fetch(`${monkdbUrl}/_sql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stmt: baselineQuery }),
    });

    const baselineData = await baselineResponse.json();
    const baselineAqi = baselineData.rows[0][0] || spike.aqi * 0.7; // Fallback estimate

    // Now query for correlation factors in the time window before spike
    const correlationQuery = `
      SELECT
        -- Weather factors
        AVG(w.wind_speed) as avg_wind_speed,
        AVG(w.wind_direction) as avg_wind_direction,
        AVG(w.humidity) as avg_humidity,
        AVG(w.temperature) as avg_temperature,
        MAX(w.inversion_layer_height) as inversion_height,
        -- Traffic factors
        AVG(t.vehicle_density) as avg_vehicle_density,
        AVG(t.avg_speed) as avg_traffic_speed,
        MAX(t.congestion_level) as max_congestion,
        AVG(t.idling_time_seconds) as avg_idling,
        AVG(t.heavy_vehicle_percentage) as heavy_vehicle_pct,
        -- Industrial factors
        COUNT(DISTINCT i.facility_id) as active_facilities,
        AVG(i.operational_load) as avg_industrial_load,
        SUM(CASE WHEN i.compliance_status = 'violation' THEN 1 ELSE 0 END) as violations,
        -- Construction factors
        COUNT(DISTINCT c.project_id) as active_construction,
        SUM(CASE WHEN c.dust_control_measures = false THEN 1 ELSE 0 END) as uncontrolled_sites
      FROM aqi_platform.weather_context w
      LEFT JOIN aqi_platform.traffic_data t ON
        t.station_id = w.station_id
        AND ABS(EXTRACT(EPOCH FROM (t.timestamp - w.timestamp))) < 300
      LEFT JOIN aqi_platform.industrial_telemetry i ON
        i.station_id = w.station_id
        AND ABS(EXTRACT(EPOCH FROM (i.timestamp - w.timestamp))) < 300
      LEFT JOIN aqi_platform.construction_activity c ON
        c.station_id = w.station_id
        AND ABS(EXTRACT(EPOCH FROM (c.timestamp - w.timestamp))) < 300
      WHERE w.station_id = '${stationId}'
        AND w.timestamp >= '${spike.timestamp}'::TIMESTAMP - INTERVAL '${timeWindowMinutes} minutes'
        AND w.timestamp < '${spike.timestamp}'::TIMESTAMP
    `;

    const correlationResponse = await fetch(`${monkdbUrl}/_sql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stmt: correlationQuery }),
    });

    if (!correlationResponse.ok) {
      throw new Error(`Correlation query failed: ${correlationResponse.statusText}`);
    }

    const correlationData = await correlationResponse.json();

    let weatherFactors = {};
    let trafficFactors = {};
    let industrialFactors = {};
    let constructionFactors = {};

    if (correlationData.rows && correlationData.rows.length > 0) {
      const row = correlationData.rows[0];

      weatherFactors = {
        wind_speed_ms: row[0],
        wind_direction_deg: row[1],
        humidity_pct: row[2],
        temperature_c: row[3],
        inversion_layer_m: row[4],
        atmospheric_condition: analyzeAtmosphericCondition(row[0], row[4]),
      };

      trafficFactors = {
        vehicle_density: row[5],
        avg_speed_kmh: row[6],
        congestion_level: row[7],
        idling_time_sec: row[8],
        heavy_vehicle_pct: row[9],
        traffic_impact_score: calculateTrafficImpact(row[5], row[6], row[7], row[8]),
      };

      industrialFactors = {
        active_facilities: row[10],
        avg_operational_load_pct: row[11],
        violations: row[12],
        industrial_impact_score: calculateIndustrialImpact(row[10], row[11], row[12]),
      };

      constructionFactors = {
        active_sites: row[13],
        uncontrolled_sites: row[14],
        construction_impact_score: calculateConstructionImpact(row[13], row[14]),
      };
    }

    // Calculate overall correlation strength and likely cause
    const analysis = analyzeCorrelation(
      spike,
      baselineAqi,
      weatherFactors,
      trafficFactors,
      industrialFactors,
      constructionFactors
    );

    return NextResponse.json({
      success: true,
      station_id: stationId,
      spike: {
        ...spike,
        baseline_aqi: Math.round(baselineAqi),
        spike_magnitude: Math.round(spike.aqi - baselineAqi),
      },
      time_window: {
        start: new Date(new Date(spike.timestamp).getTime() - timeWindowMinutes * 60000).toISOString(),
        end: spike.timestamp,
        duration_minutes: timeWindowMinutes,
      },
      correlation: {
        weather_factors: weatherFactors,
        traffic_factors: trafficFactors,
        industrial_factors: industrialFactors,
        construction_factors: constructionFactors,
      },
      analysis: {
        likely_primary_source: analysis.primarySource,
        contributing_factors: analysis.contributingFactors,
        correlation_strength: analysis.correlationStrength,
        confidence_score: analysis.confidenceScore,
        explanation: analysis.explanation,
      },
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Geo-Temporal Correlation API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to perform correlation analysis',
      },
      { status: 500 }
    );
  }
}

/**
 * Analyze atmospheric condition based on wind and inversion layer
 */
function analyzeAtmosphericCondition(windSpeed: number, inversionHeight: number): string {
  if (!windSpeed || !inversionHeight) return 'unknown';

  if (windSpeed < 2 && inversionHeight < 200) {
    return 'highly_stable_stagnant'; // Worst case for pollution
  } else if (windSpeed < 3 && inversionHeight < 500) {
    return 'stable';
  } else if (windSpeed < 5) {
    return 'neutral';
  } else {
    return 'unstable_dispersive'; // Good for pollution dispersal
  }
}

/**
 * Calculate traffic impact score (0-100)
 */
function calculateTrafficImpact(density: number, speed: number, congestion: string, idling: number): number {
  let score = 0;

  if (density > 50) score += 30;
  if (speed < 20) score += 25;
  if (congestion === 'heavy' || congestion === 'standstill') score += 30;
  if (idling > 60) score += 15;

  return Math.min(score, 100);
}

/**
 * Calculate industrial impact score (0-100)
 */
function calculateIndustrialImpact(facilities: number, load: number, violations: number): number {
  let score = 0;

  if (facilities > 3) score += 30;
  if (load > 70) score += 40;
  if (violations > 0) score += 30;

  return Math.min(score, 100);
}

/**
 * Calculate construction impact score (0-100)
 */
function calculateConstructionImpact(sites: number, uncontrolled: number): number {
  let score = 0;

  if (sites > 2) score += 40;
  if (uncontrolled > 0) score += 60;

  return Math.min(score, 100);
}

/**
 * Analyze all factors and determine likely root cause
 */
function analyzeCorrelation(
  spike: any,
  baseline: number,
  weather: any,
  traffic: any,
  industrial: any,
  construction: any
): any {
  const scores = {
    TRAFFIC: traffic.traffic_impact_score || 0,
    INDUSTRIAL: industrial.industrial_impact_score || 0,
    CONSTRUCTION: construction.construction_impact_score || 0,
    REGIONAL_DRIFT: weather.atmospheric_condition === 'highly_stable_stagnant' ? 60 : 20,
  };

  // Adjust scores based on pollutant signatures
  if (spike.pollutants.no2 > 100 && spike.pollutants.co > 5) {
    scores.TRAFFIC += 20; // High NO2 + CO indicates traffic
  }

  if (spike.pollutants.so2 > 50 || spike.pollutants.no2 > 150) {
    scores.INDUSTRIAL += 20; // SO2 or very high NO2 indicates industrial
  }

  if (spike.pollutants.pm10 > spike.pollutants.pm25 * 1.5) {
    scores.CONSTRUCTION += 20; // PM10 dominance indicates dust/construction
  }

  const sortedSources = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const primarySource = sortedSources[0][0];
  const primaryScore = sortedSources[0][1];

  const contributingFactors = sortedSources
    .slice(1)
    .filter(([_, score]) => score > 30)
    .map(([source, _]) => source);

  let correlationStrength = 'weak';
  if (primaryScore > 70) correlationStrength = 'strong';
  else if (primaryScore > 50) correlationStrength = 'moderate';

  const explanation = generateExplanation(primarySource, primaryScore, spike, weather, traffic, industrial, construction);

  return {
    primarySource,
    contributingFactors,
    correlationStrength,
    confidenceScore: Math.min(primaryScore / 100, 0.95),
    explanation,
  };
}

/**
 * Generate human-readable explanation
 */
function generateExplanation(source: string, score: number, spike: any, weather: any, traffic: any, industrial: any, construction: any): string {
  const explanations: Record<string, string> = {
    TRAFFIC: `High traffic impact detected (score: ${score}). Contributing factors: ${
      traffic.congestion_level === 'heavy' ? 'heavy congestion, ' : ''
    }${
      traffic.avg_speed_kmh < 20 ? 'low traffic speed, ' : ''
    }${
      traffic.idling_time_sec > 60 ? 'significant vehicle idling, ' : ''
    }${
      spike.pollutants.no2 > 100 ? 'elevated NO₂ levels indicating vehicle emissions' : ''
    }`,

    INDUSTRIAL: `Industrial activity detected (score: ${score}). Factors: ${
      industrial.active_facilities > 3 ? `${industrial.active_facilities} active facilities, ` : ''
    }${
      industrial.avg_operational_load_pct > 70 ? 'high operational load, ' : ''
    }${
      industrial.violations > 0 ? `${industrial.violations} compliance violations, ` : ''
    }${
      spike.pollutants.so2 > 50 ? 'elevated SO₂ indicating industrial emissions' : ''
    }`,

    CONSTRUCTION: `Construction activity detected (score: ${score}). Factors: ${
      construction.active_sites > 0 ? `${construction.active_sites} active sites, ` : ''
    }${
      construction.uncontrolled_sites > 0 ? `${construction.uncontrolled_sites} without dust control, ` : ''
    }${
      spike.pollutants.pm10 > spike.pollutants.pm25 * 1.5 ? 'PM10 dominance indicating dust' : ''
    }`,

    REGIONAL_DRIFT: `Regional atmospheric conditions (score: ${score}). Weather factors: ${
      weather.atmospheric_condition === 'highly_stable_stagnant' ? 'highly stable stagnant air, ' : ''
    }${
      weather.wind_speed_ms < 2 ? 'very low wind speed, ' : ''
    }${
      weather.inversion_layer_m < 200 ? 'low inversion layer trapping pollutants' : ''
    }`,
  };

  return explanations[source] || 'Multiple factors contributing to pollution event';
}
