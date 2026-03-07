import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/aqi/anomalies
 * Fetch detected AQI anomalies
 * Query params: hours_back (optional, default 24)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hoursBack = parseInt(searchParams.get('hours_back') || '24', 10);

    const monkdbUrl = process.env.MONKDB_URL || 'http://localhost:4200';
    const query = `
      SELECT
        a.station_id,
        a.timestamp,
        a.current_aqi,
        a.expected_aqi,
        a.severity,
        a.zscore,
        a.alert_message,
        s.name as station_name,
        s.location
      FROM aqi_platform.anomalies a
      LEFT JOIN aqi_platform.stations s ON a.station_id = s.station_id
      WHERE a.timestamp >= NOW() - INTERVAL '${hoursBack} hours'
      ORDER BY a.severity DESC, a.timestamp DESC
      LIMIT 50
    `;

    const response = await fetch(`${monkdbUrl}/_sql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stmt: query }),
    });

    if (!response.ok) {
      throw new Error(`MonkDB query failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.rows || data.rows.length === 0) {
      return NextResponse.json({
        anomalies: [],
        count: 0,
        message: 'No anomalies detected',
      });
    }

    // Format anomalies
    const anomalies = data.rows.map((row: any[]) => ({
      station_id: row[0],
      timestamp: row[1],
      current_aqi: row[2],
      expected_aqi: row[3],
      severity: row[4],
      zscore: row[5],
      alert_message: row[6],
      station_name: row[7],
      location: row[8] ? JSON.parse(row[8]) : null,
    }));

    return NextResponse.json({
      anomalies,
      count: anomalies.length,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch anomaly data', details: String(error) },
      { status: 500 }
    );
  }
}
