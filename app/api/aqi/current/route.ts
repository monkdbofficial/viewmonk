import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/aqi/current
 * Returns latest AQI readings for all active stations
 */
export async function GET(request: NextRequest) {
  try {
    const monkdbUrl = 'http://localhost:4200/_sql';

    // Query to get latest AQI readings with station info
    const query = `
      SELECT
        s.station_id,
        s.station_name,
        s.location,
        s.city,
        s.country,
        r.aqi,
        r.aqi_category,
        r.pm25,
        r.pm10,
        r.no2,
        r.so2,
        r.co,
        r.o3,
        r.temperature,
        r.humidity,
        r.timestamp,
        r.source
      FROM stations s
      INNER JOIN aqi_readings r ON s.station_id = r.station_id
      WHERE s.is_active = true
      AND r.timestamp = (
        SELECT MAX(timestamp)
        FROM aqi_readings
        WHERE station_id = s.station_id
      )
      ORDER BY r.timestamp DESC
    `;

    const response = await fetch(monkdbUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stmt: query }),
    });

    if (!response.ok) {
      throw new Error(`MonkDB query failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    // Transform rows to objects
    const stations = data.rows.map((row: any[]) => ({
      station_id: row[0],
      station_name: row[1],
      location: row[2], // [lon, lat]
      city: row[3],
      country: row[4],
      aqi: row[5],
      aqi_category: row[6] || getAQICategory(row[5]),
      pollutants: {
        pm25: row[7],
        pm10: row[8],
        no2: row[9],
        so2: row[10],
        co: row[11],
        o3: row[12],
      },
      weather: {
        temperature: row[13],
        humidity: row[14],
      },
      timestamp: row[15],
      source: row[16],
    }));

    return NextResponse.json({
      success: true,
      count: stations.length,
      stations,
      updated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('AQI API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch AQI data',
      },
      { status: 500 }
    );
  }
}

/**
 * Helper function to categorize AQI values
 */
function getAQICategory(aqi: number): string {
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
  if (aqi <= 200) return 'Unhealthy';
  if (aqi <= 300) return 'Very Unhealthy';
  return 'Hazardous';
}

/**
 * Helper function to get AQI color for map markers
 */
export function getAQIColor(aqi: number): string {
  if (aqi <= 50) return '#00e400'; // Green
  if (aqi <= 100) return '#ffff00'; // Yellow
  if (aqi <= 150) return '#ff7e00'; // Orange
  if (aqi <= 200) return '#ff0000'; // Red
  if (aqi <= 300) return '#8f3f97'; // Purple
  return '#7e0023'; // Maroon
}
