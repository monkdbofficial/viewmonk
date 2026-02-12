import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/aqi/classification
 * Fetch pollution source classification for a station or all stations
 * Query params: station_id (optional, defaults to all)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stationId = searchParams.get('station_id');

    const monkdbUrl = process.env.MONKDB_URL || 'http://localhost:4200';

    const query = stationId
      ? `
        SELECT
          station_id,
          timestamp,
          source_type,
          confidence_score,
          evidence,
          pollutants
        FROM aqi_platform.pollution_events
        WHERE station_id = '${stationId}'
        ORDER BY timestamp DESC
        LIMIT 1
      `
      : `
        SELECT
          station_id,
          source_type,
          confidence_score,
          COUNT(*) as occurrence_count
        FROM aqi_platform.pollution_events
        WHERE timestamp >= NOW() - INTERVAL '24 hours'
        GROUP BY station_id, source_type, confidence_score
        ORDER BY confidence_score DESC
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
        station_id: stationId || 'all',
        classifications: [],
        message: 'No classification data available',
      });
    }

    // Format response
    if (stationId) {
      const row = data.rows[0];
      return NextResponse.json({
        station_id: row[0],
        timestamp: row[1],
        source: row[2],
        confidence: row[3],
        evidence: JSON.parse(row[4] || '{}'),
        pollutants: JSON.parse(row[5] || '{}'),
      });
    } else {
      // Aggregate by source type
      const sourceBreakdown: any = {};
      data.rows.forEach((row: any[]) => {
        const source = row[1];
        if (!sourceBreakdown[source]) {
          sourceBreakdown[source] = {
            count: 0,
            avg_confidence: 0,
            stations: [],
          };
        }
        sourceBreakdown[source].count += row[3];
        sourceBreakdown[source].avg_confidence += row[2] * row[3];
        sourceBreakdown[source].stations.push(row[0]);
      });

      // Calculate averages
      Object.keys(sourceBreakdown).forEach((source) => {
        const data = sourceBreakdown[source];
        data.avg_confidence = data.avg_confidence / data.count;
        data.percentage = (data.count / data.rows.length) * 100;
      });

      return NextResponse.json({
        timestamp: new Date().toISOString(),
        source_breakdown: sourceBreakdown,
      });
    }
  } catch (error) {
    console.error('Classification API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch classification data', details: String(error) },
      { status: 500 }
    );
  }
}
