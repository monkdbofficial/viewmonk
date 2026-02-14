import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/aqi/multi-signal/enriched
 * Multi-signal enriched data API - Unified intelligence across all data streams
 *
 * Provides contextualized, enriched snapshots combining:
 * 1. AQI sensors (PM2.5, PM10, NO₂, CO, SO₂, O₃)
 * 2. Weather context (wind speed/direction, humidity, temperature, inversion layers)
 * 3. Traffic feeds (vehicle density, speed, idling time, congestion)
 * 4. Industrial telemetry (stack emissions, runtime, operational load)
 * 5. Construction activity (permits, schedules, dust control measures)
 * 6. Mobile & drone AQI sweeps (optional)
 *
 * Returns fully enriched, contextualized data for AI reasoning and decision-making.
 *
 * Query params:
 * - station_id: Required - station to query
 * - timestamp: Optional - specific time (defaults to latest)
 * - include_history: Optional - include last N hours of data (default 1)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stationId = searchParams.get('station_id');
    const timestamp = searchParams.get('timestamp');
    const includeHistory = parseInt(searchParams.get('include_history') || '1', 10);

    if (!stationId) {
      return NextResponse.json(
        { error: 'station_id parameter is required' },
        { status: 400 }
      );
    }

    const monkdbUrl = process.env.MONKDB_URL || 'http://localhost:4200';

    // Define time range
    const timeFilter = timestamp
      ? `= '${timestamp}'`
      : `>= NOW() - INTERVAL '${includeHistory} hours'`;

    // Query 1: AQI Readings
    const aqiQuery = `
      SELECT
        timestamp,
        aqi,
        pm25,
        pm10,
        no2,
        so2,
        co,
        o3,
        temperature,
        humidity,
        wind_speed
      FROM aqi_platform.readings
      WHERE station_id = '${stationId}'
        AND timestamp ${timeFilter}
      ORDER BY timestamp DESC
      LIMIT ${timestamp ? 1 : 24}
    `;

    // Query 2: Weather Context
    const weatherQuery = `
      SELECT
        timestamp,
        temperature,
        humidity,
        wind_speed,
        wind_direction,
        pressure,
        precipitation,
        inversion_layer_height,
        atmospheric_stability
      FROM aqi_platform.weather_context
      WHERE station_id = '${stationId}'
        AND timestamp ${timeFilter}
      ORDER BY timestamp DESC
      LIMIT ${timestamp ? 1 : 24}
    `;

    // Query 3: Traffic Data
    const trafficQuery = `
      SELECT
        timestamp,
        vehicle_density,
        avg_speed,
        congestion_level,
        idling_time_seconds,
        heavy_vehicle_percentage,
        traffic_volume
      FROM aqi_platform.traffic_data
      WHERE station_id = '${stationId}'
        AND timestamp ${timeFilter}
      ORDER BY timestamp DESC
      LIMIT ${timestamp ? 1 : 24}
    `;

    // Query 4: Industrial Telemetry
    const industrialQuery = `
      SELECT
        i.timestamp,
        i.facility_id,
        i.facility_type,
        i.stack_emissions,
        i.operational_load,
        i.runtime_hours,
        i.fuel_type,
        i.compliance_status
      FROM aqi_platform.industrial_telemetry i
      WHERE i.station_id = '${stationId}'
        AND i.timestamp ${timeFilter}
      ORDER BY i.timestamp DESC
      LIMIT 10
    `;

    // Query 5: Construction Activity
    const constructionQuery = `
      SELECT
        timestamp,
        project_id,
        project_type,
        activity_level,
        dust_control_measures,
        site_covered,
        permit_status,
        area_sqm
      FROM aqi_platform.construction_activity
      WHERE station_id = '${stationId}'
        AND timestamp ${timeFilter}
      ORDER BY timestamp DESC
      LIMIT 10
    `;

    // Execute all queries in parallel
    const [aqiResponse, weatherResponse, trafficResponse, industrialResponse, constructionResponse] = await Promise.all([
      fetch(`${monkdbUrl}/_sql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stmt: aqiQuery }),
      }),
      fetch(`${monkdbUrl}/_sql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stmt: weatherQuery }),
      }),
      fetch(`${monkdbUrl}/_sql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stmt: trafficQuery }),
      }),
      fetch(`${monkdbUrl}/_sql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stmt: industrialQuery }),
      }),
      fetch(`${monkdbUrl}/_sql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stmt: constructionQuery }),
      }),
    ]);

    // Parse all responses
    const aqiData = await aqiResponse.json();
    const weatherData = await weatherResponse.json();
    const trafficData = await trafficResponse.json();
    const industrialData = await industrialResponse.json();
    const constructionData = await constructionResponse.json();

    // Transform AQI data
    const aqiReadings = (aqiData.rows || []).map((row: any[]) => ({
      timestamp: row[0],
      aqi: row[1],
      pollutants: {
        pm25: row[2],
        pm10: row[3],
        no2: row[4],
        so2: row[5],
        co: row[6],
        o3: row[7],
      },
      basic_weather: {
        temperature: row[8],
        humidity: row[9],
        wind_speed: row[10],
      },
    }));

    // Transform Weather data
    const weatherReadings = (weatherData.rows || []).map((row: any[]) => ({
      timestamp: row[0],
      temperature_c: row[1],
      humidity_pct: row[2],
      wind_speed_ms: row[3],
      wind_direction_deg: row[4],
      pressure_hpa: row[5],
      precipitation_mm: row[6],
      inversion_layer_m: row[7],
      atmospheric_stability: row[8],
    }));

    // Transform Traffic data
    const trafficReadings = (trafficData.rows || []).map((row: any[]) => ({
      timestamp: row[0],
      vehicle_density: row[1],
      avg_speed_kmh: row[2],
      congestion_level: row[3],
      idling_time_sec: row[4],
      heavy_vehicle_pct: row[5],
      traffic_volume: row[6],
    }));

    // Transform Industrial data
    const industrialReadings = (industrialData.rows || []).map((row: any[]) => ({
      timestamp: row[0],
      facility_id: row[1],
      facility_type: row[2],
      stack_emissions: row[3],
      operational_load_pct: row[4],
      runtime_hours: row[5],
      fuel_type: row[6],
      compliance_status: row[7],
    }));

    // Transform Construction data
    const constructionReadings = (constructionData.rows || []).map((row: any[]) => ({
      timestamp: row[0],
      project_id: row[1],
      project_type: row[2],
      activity_level: row[3],
      dust_control_measures: row[4],
      site_covered: row[5],
      permit_status: row[6],
      area_sqm: row[7],
    }));

    // Create enriched snapshots by merging data from same time windows
    const enrichedSnapshots = mergeDataStreams(
      aqiReadings,
      weatherReadings,
      trafficReadings,
      industrialReadings,
      constructionReadings
    );

    // Calculate summary statistics
    const summary = calculateSummaryStatistics(enrichedSnapshots);

    return NextResponse.json({
      success: true,
      station_id: stationId,
      time_range: {
        latest: enrichedSnapshots[0]?.timestamp,
        oldest: enrichedSnapshots[enrichedSnapshots.length - 1]?.timestamp,
        snapshots_count: enrichedSnapshots.length,
      },
      enriched_snapshots: enrichedSnapshots,
      summary_statistics: summary,
      data_completeness: {
        aqi_readings: aqiReadings.length,
        weather_readings: weatherReadings.length,
        traffic_readings: trafficReadings.length,
        industrial_readings: industrialReadings.length,
        construction_readings: constructionReadings.length,
        completeness_score: calculateCompletenessScore(
          aqiReadings.length,
          weatherReadings.length,
          trafficReadings.length
        ),
      },
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Multi-Signal Enriched Data API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch enriched data',
      },
      { status: 500 }
    );
  }
}

/**
 * Merge data from multiple streams into enriched snapshots
 */
function mergeDataStreams(
  aqi: any[],
  weather: any[],
  traffic: any[],
  industrial: any[],
  construction: any[]
): any[] {
  const snapshots: any[] = [];

  // Use AQI readings as the baseline timeline
  aqi.forEach((aqiReading) => {
    const timestamp = aqiReading.timestamp;

    // Find closest matching data from other streams (within 5 minutes)
    const weatherMatch = findClosestMatch(weather, timestamp, 5);
    const trafficMatch = findClosestMatch(traffic, timestamp, 5);
    const industrialMatches = findAllMatches(industrial, timestamp, 15);
    const constructionMatches = findAllMatches(construction, timestamp, 30);

    snapshots.push({
      timestamp,
      aqi_data: {
        aqi: aqiReading.aqi,
        pollutants: aqiReading.pollutants,
        category: getAQICategory(aqiReading.aqi),
      },
      weather_context: weatherMatch || aqiReading.basic_weather,
      traffic_context: trafficMatch || null,
      industrial_context: {
        active_facilities: industrialMatches.length,
        facilities: industrialMatches,
        total_load: industrialMatches.reduce((sum, f) => sum + (f.operational_load_pct || 0), 0),
      },
      construction_context: {
        active_sites: constructionMatches.length,
        sites: constructionMatches,
        uncontrolled_sites: constructionMatches.filter(s => !s.dust_control_measures).length,
      },
      enrichment_quality: calculateEnrichmentQuality(weatherMatch, trafficMatch, industrialMatches, constructionMatches),
    });
  });

  return snapshots;
}

/**
 * Find closest matching data point within time window
 */
function findClosestMatch(dataArray: any[], targetTime: string, windowMinutes: number): any | null {
  const targetMs = new Date(targetTime).getTime();
  const windowMs = windowMinutes * 60 * 1000;

  let closest = null;
  let closestDiff = Infinity;

  dataArray.forEach((item) => {
    const itemMs = new Date(item.timestamp).getTime();
    const diff = Math.abs(targetMs - itemMs);

    if (diff < windowMs && diff < closestDiff) {
      closest = item;
      closestDiff = diff;
    }
  });

  return closest;
}

/**
 * Find all matching data points within time window
 */
function findAllMatches(dataArray: any[], targetTime: string, windowMinutes: number): any[] {
  const targetMs = new Date(targetTime).getTime();
  const windowMs = windowMinutes * 60 * 1000;

  return dataArray.filter((item) => {
    const itemMs = new Date(item.timestamp).getTime();
    return Math.abs(targetMs - itemMs) < windowMs;
  });
}

/**
 * Calculate enrichment quality score
 */
function calculateEnrichmentQuality(weather: any, traffic: any, industrial: any[], construction: any[]): string {
  let score = 0;

  if (weather) score += 35;
  if (traffic) score += 35;
  if (industrial.length > 0) score += 15;
  if (construction.length > 0) score += 15;

  if (score >= 85) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'fair';
  return 'poor';
}

/**
 * Calculate summary statistics across all snapshots
 */
function calculateSummaryStatistics(snapshots: any[]): any {
  if (snapshots.length === 0) return {};

  const aqiValues = snapshots.map(s => s.aqi_data.aqi);
  const pm25Values = snapshots.map(s => s.aqi_data.pollutants.pm25).filter(Boolean);

  return {
    aqi: {
      current: aqiValues[0],
      min: Math.min(...aqiValues),
      max: Math.max(...aqiValues),
      avg: Math.round(aqiValues.reduce((sum, v) => sum + v, 0) / aqiValues.length),
      trend: aqiValues[0] > aqiValues[aqiValues.length - 1] ? 'increasing' : 'decreasing',
    },
    pm25: {
      current: pm25Values[0],
      avg: pm25Values.length > 0 ? Math.round(pm25Values.reduce((sum, v) => sum + v, 0) / pm25Values.length) : null,
    },
    industrial_activity: {
      avg_active_facilities: Math.round(
        snapshots.reduce((sum, s) => sum + s.industrial_context.active_facilities, 0) / snapshots.length
      ),
    },
    construction_activity: {
      avg_active_sites: Math.round(
        snapshots.reduce((sum, s) => sum + s.construction_context.active_sites, 0) / snapshots.length
      ),
    },
  };
}

/**
 * Calculate data completeness score
 */
function calculateCompletenessScore(aqi: number, weather: number, traffic: number): number {
  const total = aqi + weather + traffic;
  const max = aqi * 3; // Maximum if all streams had same count as AQI

  return max > 0 ? Math.round((total / max) * 100) : 0;
}

/**
 * Get AQI category
 */
function getAQICategory(aqi: number): string {
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
  if (aqi <= 200) return 'Unhealthy';
  if (aqi <= 300) return 'Very Unhealthy';
  return 'Hazardous';
}
