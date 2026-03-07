import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/aqi/forecast
 * Fetch AQI forecasts for a station
 * Query params: station_id (required), hours (optional, default 24)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stationId = searchParams.get('station_id');
    const hours = parseInt(searchParams.get('hours') || '24', 10);

    if (!stationId) {
      return NextResponse.json(
        { error: 'station_id parameter is required' },
        { status: 400 }
      );
    }

    // Query MonkDB for predictions
    const monkdbUrl = process.env.MONKDB_URL || 'http://localhost:4200';
    const query = `
      SELECT
        timestamp,
        predicted_aqi,
        model_type,
        confidence_score
      FROM aqi_platform.predictions
      WHERE station_id = '${stationId}'
        AND timestamp >= NOW()
        AND timestamp <= NOW() + INTERVAL '${hours} hours'
      ORDER BY timestamp ASC
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
        station_id: stationId,
        predictions: [],
        message: 'No forecast data available. AI models may not have run yet.',
      });
    }

    // Format predictions
    const predictions = data.rows.map((row: any[], index: number) => ({
      hour: index + 1,
      timestamp: row[0],
      aqi: Math.round(row[1]),
      model: row[2],
      confidence: row[3],
    }));

    return NextResponse.json({
      station_id: stationId,
      generated_at: new Date().toISOString(),
      predictions,
      hours_ahead: predictions.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch forecast data', details: String(error) },
      { status: 500 }
    );
  }
}
