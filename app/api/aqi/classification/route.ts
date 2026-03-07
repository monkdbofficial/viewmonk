import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/aqi/classification
 * Enterprise-grade pollution source classification with evidence and geo-temporal correlation
 *
 * Returns:
 * - Source type classification (Traffic, Industrial, Construction, Regional Drift, Biomass Burning, Mixed)
 * - Pollutant fingerprints (PM2.5, PM10, NO₂, SO₂, CO, O₃ signatures)
 * - Evidence data (traffic density, industrial activity, construction permits)
 * - Geo-temporal correlation (what changed 5-30 min before spike, upwind sources)
 * - Confidence scores and probabilistic classification
 *
 * Query params:
 * - station_id: Specific station (optional, defaults to all)
 * - hours_back: Time window (default 24)
 * - min_confidence: Minimum confidence score (0-1)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stationId = searchParams.get('station_id');
    const hoursBack = parseInt(searchParams.get('hours_back') || '24', 10);
    const minConfidence = parseFloat(searchParams.get('min_confidence') || '0');

    const monkdbUrl = process.env.MONKDB_URL || 'http://localhost:4200';

    if (stationId) {
      // Detailed classification for specific station with correlation data
      const query = `
        SELECT
          pe.id,
          pe.station_id,
          pe.timestamp,
          pe.source_type,
          pe.confidence_score,
          pe.evidence,
          pe.pollutant_fingerprint,
          pe.geo_location,
          pe.spatial_radius_m,
          pe.classification_method,
          pe.agent_id,
          s.name as station_name,
          s.city,
          -- Get correlation event if exists
          ce.time_delta_minutes,
          ce.spatial_factors,
          ce.temporal_factors,
          ce.weather_correlation,
          ce.traffic_correlation,
          ce.industrial_correlation,
          ce.correlation_strength
        FROM aqi_platform.pollution_events pe
        LEFT JOIN aqi_platform.stations s ON pe.station_id = s.station_id
        LEFT JOIN aqi_platform.correlation_events ce ON
          ce.station_id = pe.station_id
          AND ABS(EXTRACT(EPOCH FROM (ce.spike_timestamp - pe.timestamp))) < 300
        WHERE pe.station_id = '${stationId}'
          AND pe.timestamp >= NOW() - INTERVAL '${hoursBack} hours'
          AND pe.confidence_score >= ${minConfidence}
        ORDER BY pe.timestamp DESC
        LIMIT 1
      `;

      const response = await fetch(`${monkdbUrl}/_sql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stmt: query }),
      });

      const data = await response.json();

      // Check if table doesn't exist (CrateDB returns error in response body)
      if (data.error) {
        const errorMsg = data.error.message || '';
        if (errorMsg.includes('RelationUnknown') || errorMsg.includes('pollution_events')) {
          return NextResponse.json({
            success: false,
            setup_required: true,
            error: 'Enterprise tables not initialized',
            message: 'Please run the database setup script to enable source classification',
            instructions: [
              '1. Navigate to schema directory: cd schema',
              '2. Run setup script: ./setup-all.sh',
              '3. Refresh this page',
            ],
          }, { status: 503 });
        }
        throw new Error(`MonkDB query failed: ${errorMsg}`);
      }

      if (!response.ok) {
        throw new Error(`MonkDB query failed: ${response.statusText}`);
      }

      if (!data.rows || data.rows.length === 0) {
        return NextResponse.json({
          station_id: stationId,
          classification: null,
          message: 'No classification data available for this station',
        });
      }

      const row = data.rows[0];

      return NextResponse.json({
        success: true,
        station_id: row[1],
        station_name: row[11],
        city: row[12],
        classification: {
          timestamp: row[2],
          source_type: row[3],
          confidence_score: row[4],
          classification_method: row[9],

          // Evidence-based classification
          evidence: row[5] || {},

          // Pollutant fingerprint (signature that identifies the source)
          pollutant_fingerprint: row[6] || {},

          // Geospatial data
          source_location: row[7] ? { lon: row[7][0], lat: row[7][1] } : null,
          affected_radius_meters: row[8],

          // Geo-temporal correlation (if available)
          correlation: row[13] ? {
            time_before_spike_minutes: row[13],
            spatial_factors: row[14] || {},
            temporal_factors: row[15] || {},
            weather_factors: row[16] || {},
            traffic_factors: row[17] || {},
            industrial_factors: row[18] || {},
            correlation_strength: row[19],
          } : null,

          agent_id: row[10],
        },

        // Add recommended actions based on source type
        recommendations: getRecommendations(row[3], row[4]),

        generated_at: new Date().toISOString(),
      });

    } else {
      // Aggregate view across all stations
      const query = `
        SELECT
          pe.source_type,
          COUNT(*) as event_count,
          AVG(pe.confidence_score) as avg_confidence,
          COUNT(DISTINCT pe.station_id) as affected_stations,
          AVG(pe.spatial_radius_m) as avg_radius
        FROM aqi_platform.pollution_events pe
        WHERE pe.timestamp >= NOW() - INTERVAL '${hoursBack} hours'
          AND pe.confidence_score >= ${minConfidence}
        GROUP BY pe.source_type
        ORDER BY event_count DESC
      `;

      const response = await fetch(`${monkdbUrl}/_sql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stmt: query }),
      });

      const data = await response.json();

      // Check if table doesn't exist
      if (data.error) {
        const errorMsg = data.error.message || '';
        if (errorMsg.includes('RelationUnknown') || errorMsg.includes('pollution_events')) {
          return NextResponse.json({
            success: false,
            setup_required: true,
            error: 'Enterprise tables not initialized',
            message: 'Please run the database setup script to enable source classification',
            instructions: [
              '1. Navigate to schema directory: cd schema',
              '2. Run setup script: ./setup-all.sh',
              '3. Refresh this page',
            ],
          }, { status: 503 });
        }
        throw new Error(`MonkDB query failed: ${errorMsg}`);
      }

      if (!response.ok) {
        throw new Error(`MonkDB query failed: ${response.statusText}`);
      }

      if (!data.rows || data.rows.length === 0) {
        return NextResponse.json({
          success: true,
          source_breakdown: {},
          total_events: 0,
          message: 'No classification data available',
        });
      }

      // Format source breakdown
      const sourceBreakdown: any = {};
      let totalEvents = 0;

      data.rows.forEach((row: any[]) => {
        const sourceType = row[0];
        sourceBreakdown[sourceType] = {
          event_count: row[1],
          avg_confidence: Math.round(row[2] * 100) / 100,
          affected_stations: row[3],
          avg_radius_meters: Math.round(row[4]),
          percentage: 0, // Calculate after
        };
        totalEvents += row[1];
      });

      // Calculate percentages
      Object.keys(sourceBreakdown).forEach((source) => {
        sourceBreakdown[source].percentage = Math.round((sourceBreakdown[source].event_count / totalEvents) * 100);
      });

      return NextResponse.json({
        success: true,
        source_breakdown: sourceBreakdown,
        total_events: totalEvents,
        time_window_hours: hoursBack,
        generated_at: new Date().toISOString(),
      });
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch classification data',
      },
      { status: 500 }
    );
  }
}

/**
 * Get recommended mitigation actions based on pollution source type
 */
function getRecommendations(sourceType: string, confidence: number): any {
  const recommendations: Record<string, any> = {
    TRAFFIC: {
      immediate: [
        'Implement adaptive traffic signal timing',
        'Activate route diversion protocols',
        'Alert enforcement to reduce congestion',
        'Send citizen advisories to avoid area',
      ],
      long_term: [
        'Evaluate odd-even vehicle scheme',
        'Incentivize public transport usage',
        'Create low-emission zones',
        'Upgrade traffic infrastructure',
      ],
    },
    INDUSTRIAL: {
      immediate: [
        'Alert industrial facilities to reduce emissions',
        'Enforce compliance checks',
        'Throttle operational load if permitted',
        'Monitor stack emissions continuously',
      ],
      long_term: [
        'Mandate technology upgrades',
        'Implement stricter emission standards',
        'Schedule operations during low-impact hours',
        'Transition to cleaner fuels',
      ],
    },
    CONSTRUCTION: {
      immediate: [
        'Issue dust control measures',
        'Mandate water spraying',
        'Require covering exposed areas',
        'Verify permit compliance',
      ],
      long_term: [
        'Enforce green construction norms',
        'Implement dust suppression systems',
        'Schedule heavy activities appropriately',
        'Monitor air quality continuously on-site',
      ],
    },
    REGIONAL_DRIFT: {
      immediate: [
        'Issue public health advisories',
        'Recommend reduced outdoor activity',
        'Alert sensitive groups',
        'Monitor upwind sources',
      ],
      long_term: [
        'Coordinate regional pollution control',
        'Establish inter-state agreements',
        'Monitor transport patterns',
        'Develop regional mitigation strategies',
      ],
    },
    BIOMASS_BURNING: {
      immediate: [
        'Deploy drone detection',
        'Alert enforcement teams',
        'Issue fines for violations',
        'Public awareness campaigns',
      ],
      long_term: [
        'Enforce ban on crop burning',
        'Provide alternative waste management',
        'Educate farmers on alternatives',
        'Monitor satellite data',
      ],
    },
    MIXED: {
      immediate: [
        'Implement comprehensive monitoring',
        'Activate multi-pronged mitigation',
        'Coordinate across departments',
        'Issue broad public advisories',
      ],
      long_term: [
        'Develop integrated pollution control plan',
        'Address all identified sources',
        'Strengthen regulatory framework',
        'Enhance monitoring infrastructure',
      ],
    },
  };

  const baseRec = recommendations[sourceType] || recommendations.MIXED;

  return {
    ...baseRec,
    confidence_level: confidence >= 0.8 ? 'high' : confidence >= 0.6 ? 'moderate' : 'low',
    priority: confidence >= 0.8 ? 'urgent' : confidence >= 0.6 ? 'high' : 'medium',
  };
}
