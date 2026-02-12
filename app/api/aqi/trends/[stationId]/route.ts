import { NextRequest, NextResponse } from 'next/server';

interface RouteContext {
  params: Promise<{ stationId: string }>;
}

/**
 * GET /api/aqi/trends/[stationId]
 * Returns 7-day hourly AQI trends for a specific station
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { stationId } = await context.params;
    const monkdbUrl = 'http://localhost:4200/_sql';

    // Query: Hourly aggregated AQI data for last 7 days
    const query = `
      SELECT
        DATE_TRUNC('hour', timestamp) AS hour,
        AVG(aqi) AS avg_aqi,
        MIN(aqi) AS min_aqi,
        MAX(aqi) AS max_aqi,
        AVG(pm25) AS avg_pm25,
        AVG(pm10) AS avg_pm10,
        AVG(no2) AS avg_no2,
        AVG(so2) AS avg_so2,
        AVG(co) AS avg_co,
        AVG(o3) AS avg_o3,
        AVG(temperature) AS avg_temp,
        AVG(humidity) AS avg_humidity,
        AVG(pressure) AS avg_pressure
      FROM aqi_readings
      WHERE station_id = '${stationId}'
        AND timestamp >= NOW() - INTERVAL '7 days'
        AND timestamp <= NOW()
      GROUP BY DATE_TRUNC('hour', timestamp)
      ORDER BY hour ASC
    `;

    console.log('[AQI Trends API] Querying MonkDB for station:', stationId);
    console.log('[AQI Trends API] Query:', query.substring(0, 100) + '...');

    const response = await fetch(monkdbUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stmt: query }),
      cache: 'no-store', // Disable caching for real-time data
    });

    console.log('[AQI Trends API] Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('[AQI Trends API] Error response:', errorText);
      throw new Error(`MonkDB query failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    // Transform to chart-friendly format
    const trends = data.rows.map((row: any[]) => ({
      timestamp: row[0], // ISO timestamp from DATE_TRUNC
      aqi: {
        avg: row[1] !== null ? Math.round(row[1]) : null,
        min: row[2] !== null ? Math.round(row[2]) : null,
        max: row[3] !== null ? Math.round(row[3]) : null,
      },
      pollutants: {
        pm25: row[4] !== null ? Number(row[4].toFixed(2)) : null,
        pm10: row[5] !== null ? Number(row[5].toFixed(2)) : null,
        no2: row[6] !== null ? Number(row[6].toFixed(2)) : null,
        so2: row[7] !== null ? Number(row[7].toFixed(2)) : null,
        co: row[8] !== null ? Number(row[8].toFixed(2)) : null,
        o3: row[9] !== null ? Number(row[9].toFixed(2)) : null,
      },
      weather: {
        temperature: row[10] !== null ? Number(row[10].toFixed(1)) : null,
        humidity: row[11] !== null ? Number(row[11].toFixed(1)) : null,
        pressure: row[12] !== null ? Number(row[12].toFixed(1)) : null,
      },
    }));

    return NextResponse.json({
      success: true,
      station_id: stationId,
      data_points: trends.length,
      period: '7 days',
      trends,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('AQI Trends API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch trends',
      },
      { status: 500 }
    );
  }
}
