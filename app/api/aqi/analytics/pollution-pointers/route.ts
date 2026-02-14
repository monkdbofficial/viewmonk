import { NextRequest, NextResponse } from 'next/server';
// import { Pool } from 'pg'; // Commented out for demo mode

// ============================================================================
// POLLUTION POINTER API - THE MOST CRITICAL INTELLIGENCE API
// ============================================================================
// Purpose: Answer What, Where, Why, How, Solutions with full evidence chains
// This is the core API that makes the platform enterprise-grade
// ============================================================================

// Database connection (disabled in demo mode)
// TODO: Uncomment when PostgreSQL database is configured
// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/monkdb',
//   max: 20,
//   idleTimeoutMillis: 30000,
//   connectionTimeoutMillis: 10000,
// });

interface PollutionPointer {
  pointer_id: string;
  timestamp: string;
  aqi_impact: number;
  what: {
    primary_pollutants: Record<string, number>;
    pollutant_ratios: Record<string, number>;
    signature_match: string;
    fingerprint_confidence: number;
  };
  where: {
    coordinates: [number, number];
    spatial_radius_m: number;
    affected_area_sqkm: number;
    nearby_assets: any[];
    upwind_direction_deg: number;
    distance_to_source_m: number;
  };
  why: {
    primary_cause: string;
    contributing_factors: string[];
    atmospheric_conditions: any;
    temporal_patterns: any;
    weather_correlation: any;
  };
  how: {
    emission_mechanism: string;
    transport_pathway: string;
    accumulation_factors: string[];
    time_to_impact_minutes: number;
    dispersion_model: any;
  };
  solutions: Solution[];
  confidence_score: number;
  evidence_count: number;
  evidence_chain: any;
}

interface Solution {
  action_type: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  estimated_cost_usd: number;
  estimated_aqi_reduction: number;
  cost_per_aqi_point: number;
  implementation_time_days: number;
  effectiveness_confidence: number;
  historical_success_rate: number;
  requirements: string[];
  responsible_entity: string;
  location: string;
}

/**
 * GET /api/aqi/analytics/pollution-pointers
 *
 * Query Parameters:
 * - station_id: Station identifier (required)
 * - time_range: Time range for analysis (e.g., '24h', '7d', '30d') (default: '24h')
 * - min_confidence: Minimum confidence score (0-1) (default: 0.6)
 * - include_evidence: Include detailed evidence chain (default: true)
 *
 * Returns: Comprehensive pollution pointer analysis with What/Where/Why/How/Solutions
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stationId = searchParams.get('station_id');
    const timeRange = searchParams.get('time_range') || '24h';
    const minConfidence = parseFloat(searchParams.get('min_confidence') || '0.6');
    const includeEvidence = searchParams.get('include_evidence') !== 'false';

    // Validate required parameters
    if (!stationId) {
      return NextResponse.json(
        { success: false, error: 'station_id parameter is required' },
        { status: 400 }
      );
    }

    // ========================================================================
    // DEMO MODE: Return mock data until database is configured
    // ========================================================================
    // TODO: Replace with actual database queries when PostgreSQL is set up
    const pollutionPointers = getMockPollutionPointers(stationId, timeRange);

    // Calculate summary statistics
    const summary = calculateSummary(pollutionPointers);

    return NextResponse.json({
      success: true,
      station_id: stationId,
      time_range: timeRange,
      pollution_pointers: pollutionPointers,
      count: pollutionPointers.length,
      summary,
      generated_at: new Date().toISOString(),
      demo_mode: true, // Indicator that this is mock data
    });

  } catch (error: any) {
    console.error('Pollution Pointer API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch pollution pointers',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Generate mock pollution pointers for demo purposes
 */
function getMockPollutionPointers(stationId: string, timeRange: string): PollutionPointer[] {
  const now = new Date();

  return [
    {
      pointer_id: 'DEMO-001',
      timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      aqi_impact: 45,
      what: {
        primary_pollutants: { PM2_5: 78, PM10: 125, NO2: 42 },
        pollutant_ratios: { PM2_5: 0.45, PM10: 0.35, NO2: 0.20 },
        signature_match: 'Traffic-Industrial Mix',
        fingerprint_confidence: 0.87,
      },
      where: {
        coordinates: [77.2090, 28.6139],
        spatial_radius_m: 1500,
        affected_area_sqkm: 7.07,
        nearby_assets: [
          { name: 'Industrial Zone A', type: 'industrial', distance_m: 800 },
          { name: 'Highway Junction', type: 'traffic', distance_m: 500 },
        ],
        upwind_direction_deg: 245,
        distance_to_source_m: 450,
      },
      why: {
        primary_cause: 'Evening rush hour traffic combined with industrial emissions',
        contributing_factors: [
          'Low wind speed (2.3 m/s)',
          'Temperature inversion at 150m',
          'Peak industrial activity period',
        ],
        atmospheric_conditions: { stability: 'stable', mixing_height: 150 },
        temporal_patterns: { peak_hour: true, weekend: false },
        weather_correlation: {
          wind_speed: 2.3,
          wind_direction: 245,
          temperature: 28,
          humidity: 65,
          atmospheric_stability: 'stable',
        },
      },
      how: {
        emission_mechanism: 'Vehicular exhaust + industrial stack emissions',
        transport_pathway: 'Ground-level accumulation with limited dispersion',
        accumulation_factors: ['Urban canyon effect', 'Low mixing height', 'Weak winds'],
        time_to_impact_minutes: 25,
        dispersion_model: { type: 'gaussian_plume', certainty: 0.82 },
      },
      solutions: [
        {
          action_type: 'traffic_restriction',
          priority: 'high',
          description: 'Implement odd-even vehicle restriction during peak hours',
          estimated_cost_usd: 45000,
          estimated_aqi_reduction: 18,
          cost_per_aqi_point: 2500,
          implementation_time_days: 1,
          effectiveness_confidence: 0.78,
          historical_success_rate: 0.82,
          requirements: ['Traffic police coordination', 'Public announcement', 'Signage setup'],
          responsible_entity: 'Traffic Management Authority',
          location: 'Zone A - Highway Junction',
        },
        {
          action_type: 'industrial_reduction',
          priority: 'medium',
          description: 'Request 30% emission reduction from nearby industrial units',
          estimated_cost_usd: 85000,
          estimated_aqi_reduction: 12,
          cost_per_aqi_point: 7083,
          implementation_time_days: 2,
          effectiveness_confidence: 0.65,
          historical_success_rate: 0.71,
          requirements: ['Industrial compliance', 'Emission monitoring', 'Coordination meeting'],
          responsible_entity: 'Pollution Control Board',
          location: 'Industrial Zone A',
        },
      ],
      confidence_score: 0.87,
      evidence_count: 8,
      evidence_chain: {
        temporal_evidence: { spike_timing: '18:30', correlation: 0.92 },
        spatial_evidence: { source_proximity: 450, confidence: 0.85 },
        chemical_evidence: { fingerprint_match: 'traffic-industrial', score: 0.87 },
      },
    },
    {
      pointer_id: 'DEMO-002',
      timestamp: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString(),
      aqi_impact: 32,
      what: {
        primary_pollutants: { PM10: 95, NO2: 38, SO2: 18 },
        pollutant_ratios: { PM10: 0.63, NO2: 0.25, SO2: 0.12 },
        signature_match: 'Construction Activity',
        fingerprint_confidence: 0.76,
      },
      where: {
        coordinates: [77.2195, 28.6205],
        spatial_radius_m: 800,
        affected_area_sqkm: 2.01,
        nearby_assets: [
          { name: 'Metro Construction Site', type: 'construction', distance_m: 200 },
        ],
        upwind_direction_deg: 180,
        distance_to_source_m: 180,
      },
      why: {
        primary_cause: 'Excavation and material handling at construction site',
        contributing_factors: [
          'Dry soil conditions',
          'Moderate wind speeds (4.5 m/s)',
          'Daytime heating enhancing dust suspension',
        ],
        atmospheric_conditions: { stability: 'unstable', mixing_height: 850 },
        temporal_patterns: { peak_hour: false, weekend: false },
        weather_correlation: {
          wind_speed: 4.5,
          wind_direction: 180,
          temperature: 32,
          humidity: 42,
          atmospheric_stability: 'unstable',
        },
      },
      how: {
        emission_mechanism: 'Mechanical disturbance of soil and material handling',
        transport_pathway: 'Wind-driven surface layer transport',
        accumulation_factors: ['Dry conditions', 'Active excavation'],
        time_to_impact_minutes: 15,
        dispersion_model: { type: 'area_source', certainty: 0.74 },
      },
      solutions: [
        {
          action_type: 'water_spraying',
          priority: 'high',
          description: 'Deploy water spraying at construction site perimeter',
          estimated_cost_usd: 12000,
          estimated_aqi_reduction: 15,
          cost_per_aqi_point: 800,
          implementation_time_days: 0,
          effectiveness_confidence: 0.85,
          historical_success_rate: 0.88,
          requirements: ['Water tanker', 'Spraying equipment', 'Site access'],
          responsible_entity: 'Construction Authority',
          location: 'Metro Construction Site',
        },
        {
          action_type: 'construction_controls',
          priority: 'medium',
          description: 'Enforce dust suppression and material covering protocols',
          estimated_cost_usd: 8000,
          estimated_aqi_reduction: 10,
          cost_per_aqi_point: 800,
          implementation_time_days: 1,
          effectiveness_confidence: 0.72,
          historical_success_rate: 0.75,
          requirements: ['Inspection', 'Contractor compliance', 'Monitoring'],
          responsible_entity: 'Site Supervisor',
          location: 'Metro Construction Site',
        },
      ],
      confidence_score: 0.76,
      evidence_count: 6,
      evidence_chain: {
        temporal_evidence: { spike_timing: '14:15', correlation: 0.78 },
        spatial_evidence: { source_proximity: 180, confidence: 0.82 },
        chemical_evidence: { fingerprint_match: 'construction', score: 0.76 },
      },
    },
  ];
}

/**
 * Build comprehensive pollution pointer from database row
 */
async function buildPollutionPointer(row: any, includeEvidence: boolean): Promise<PollutionPointer> {
  // Calculate pollutant ratios
  const pollutantRatios = calculatePollutantRatios(row.pollutant_fingerprint);

  // Get nearby assets (industrial facilities, traffic sources, etc.)
  const nearbyAssets = await getNearbyAssets(
    row.source_location,
    row.affected_radius_meters
  );

  // Generate solutions based on source type and historical data
  const solutions = await generateSolutions(row);

  // Build evidence chain if requested
  const evidenceChain = includeEvidence ? buildEvidenceChain(row) : null;

  return {
    pointer_id: row.event_id,
    timestamp: row.detected_at,
    aqi_impact: row.aqi_spike_magnitude,

    what: {
      primary_pollutants: row.pollutant_fingerprint || {},
      pollutant_ratios: pollutantRatios,
      signature_match: row.source_type || 'unknown',
      fingerprint_confidence: row.confidence_score || 0,
    },

    where: {
      coordinates: row.source_location || [0, 0],
      spatial_radius_m: row.affected_radius_meters || 0,
      affected_area_sqkm: calculateAffectedArea(row.affected_radius_meters),
      nearby_assets: nearbyAssets,
      upwind_direction_deg: row.wind_direction || 0,
      distance_to_source_m: row.spatial_factors?.distance_to_source || 0,
    },

    why: {
      primary_cause: row.identified_cause || 'Unknown',
      contributing_factors: row.contributing_factors || [],
      atmospheric_conditions: row.weather_factors || {},
      temporal_patterns: row.temporal_factors || {},
      weather_correlation: {
        wind_speed: row.weather_factors?.wind_speed,
        wind_direction: row.weather_factors?.wind_direction,
        temperature: row.weather_factors?.temperature,
        humidity: row.weather_factors?.humidity,
        atmospheric_stability: row.weather_factors?.atmospheric_stability,
      },
    },

    how: {
      emission_mechanism: row.emission_mechanism || 'Unknown',
      transport_pathway: row.spatial_factors?.transport_pathway || 'Unknown',
      accumulation_factors: row.spatial_factors?.accumulation_factors || [],
      time_to_impact_minutes: row.time_before_spike_minutes || 0,
      dispersion_model: row.spatial_factors?.dispersion_model || null,
    },

    solutions: solutions,
    confidence_score: row.confidence_score || 0,
    evidence_count: Object.keys(row.evidence || {}).length,
    evidence_chain: evidenceChain,
  };
}

/**
 * Calculate pollutant ratios for fingerprint analysis
 */
function calculatePollutantRatios(fingerprint: Record<string, number>): Record<string, number> {
  if (!fingerprint || Object.keys(fingerprint).length === 0) {
    return {};
  }

  const total = Object.values(fingerprint).reduce((sum, val) => sum + val, 0);
  const ratios: Record<string, number> = {};

  for (const [pollutant, value] of Object.entries(fingerprint)) {
    ratios[pollutant] = total > 0 ? value / total : 0;
  }

  return ratios;
}

/**
 * Calculate affected area in square kilometers
 */
function calculateAffectedArea(radiusMeters: number): number {
  if (!radiusMeters || radiusMeters <= 0) return 0;
  return Math.PI * Math.pow(radiusMeters / 1000, 2);
}

/**
 * Get nearby industrial/traffic assets within affected radius
 */
async function getNearbyAssets(
  location: [number, number],
  radiusMeters: number
): Promise<any[]> {
  if (!location || !radiusMeters) return [];

  // DEMO MODE: Database query commented out
  return [];

  // try {
  //   const query = `
  //     SELECT
  //       id,
  //       name,
  //       type,
  //       location,
  //       properties
  //     FROM aqi_platform.industrial_sources
  //     WHERE earth_distance(
  //       ll_to_earth($1, $2),
  //       ll_to_earth(location[1], location[2])
  //     ) <= $3
  //     LIMIT 20
  //   `;

  //   const result = await pool.query(query, [location[0], location[1], radiusMeters]);
  //   return result.rows.map(row => ({
  //     id: row.id,
  //     name: row.name,
  //     type: row.type,
  //     location: row.location,
  //     distance_m: 0, // Calculate actual distance if needed
  //     properties: row.properties,
  //   }));
  // } catch (error) {
  //   console.error('Error fetching nearby assets:', error);
  //   return [];
  // }
}

/**
 * Generate actionable solutions based on source type and historical effectiveness
 */
async function generateSolutions(row: any): Promise<Solution[]> {
  const sourceType = row.source_type;
  const solutions: Solution[] = [];

  // DEMO MODE: Database query commented out, using default solutions
  // try {
  //   const query = `
  //     SELECT
  //       action_type,
  //       AVG(effectiveness_score) as avg_effectiveness,
  //       AVG(aqi_reduction) as avg_aqi_reduction,
  //       AVG(cost_usd) as avg_cost,
  //       AVG(implementation_time_days) as avg_implementation_time,
  //       COUNT(*) as action_count,
  //       SUM(CASE WHEN effectiveness_score > 0.7 THEN 1 ELSE 0 END) as success_count
  //     FROM aqi_platform.mitigation_actions
  //     WHERE source_type = $1
  //       AND effectiveness_score IS NOT NULL
  //       AND action_taken_at >= NOW() - INTERVAL '1 year'
  //     GROUP BY action_type
  //     HAVING COUNT(*) >= 3
  //     ORDER BY avg_effectiveness DESC
  //     LIMIT 5
  //   `;

  //   const result = await pool.query(query, [sourceType]);

  //   for (const action of result.rows) {
  //     const costPerAqiPoint = action.avg_cost / (action.avg_aqi_reduction || 1);
  //     const successRate = action.success_count / action.action_count;

  //     solutions.push({
  //       action_type: action.action_type,
  //       priority: determinePriority(action.avg_effectiveness, costPerAqiPoint),
  //       description: getActionDescription(action.action_type, sourceType),
  //       estimated_cost_usd: Math.round(action.avg_cost),
  //       estimated_aqi_reduction: Math.round(action.avg_aqi_reduction),
  //       cost_per_aqi_point: Math.round(costPerAqiPoint),
  //       implementation_time_days: Math.round(action.avg_implementation_time),
  //       effectiveness_confidence: action.avg_effectiveness,
  //       historical_success_rate: successRate,
  //       requirements: getActionRequirements(action.action_type),
  //       responsible_entity: getResponsibleEntity(action.action_type, sourceType),
  //       location: row.identified_cause || 'Target area',
  //     });
  //   }
  // } catch (error) {
  //   console.error('Error generating solutions:', error);
  // }

  // If no historical data, provide generic solutions based on source type
  if (solutions.length === 0) {
    solutions.push(...getDefaultSolutions(sourceType, row));
  }

  return solutions;
}

/**
 * Determine solution priority based on effectiveness and cost
 */
function determinePriority(effectiveness: number, costPerAqiPoint: number): 'low' | 'medium' | 'high' | 'critical' {
  if (effectiveness > 0.8 && costPerAqiPoint < 5000) return 'critical';
  if (effectiveness > 0.6 && costPerAqiPoint < 10000) return 'high';
  if (effectiveness > 0.4) return 'medium';
  return 'low';
}

/**
 * Get human-readable action description
 */
function getActionDescription(actionType: string, sourceType: string): string {
  const descriptions: Record<string, string> = {
    'traffic_restriction': `Implement temporary traffic restrictions in ${sourceType} zones to reduce vehicular emissions`,
    'industrial_reduction': `Request temporary emission reduction from identified industrial facilities`,
    'construction_halt': 'Suspend non-essential construction activities during high pollution episodes',
    'public_advisory': 'Issue public health advisories for vulnerable populations',
    'water_spraying': 'Deploy water spraying systems to settle particulate matter',
    'green_barrier': 'Install vegetation barriers to absorb pollutants',
    'emission_monitoring': 'Increase monitoring and enforcement of emission standards',
  };

  return descriptions[actionType] || `Implement ${actionType} mitigation strategy`;
}

/**
 * Get action requirements
 */
function getActionRequirements(actionType: string): string[] {
  const requirements: Record<string, string[]> = {
    'traffic_restriction': ['City authority approval', 'Traffic management plan', 'Public notification'],
    'industrial_reduction': ['Industrial compliance', 'Emission permits review', 'Coordination with facilities'],
    'construction_halt': ['Construction authority approval', 'Contractor notification', 'Alternative scheduling'],
    'public_advisory': ['Health department coordination', 'Communication channels', 'Advisory content'],
    'water_spraying': ['Water tankers', 'Spraying equipment', 'Water supply'],
    'green_barrier': ['Land availability', 'Plantation resources', 'Long-term maintenance'],
  };

  return requirements[actionType] || ['Assessment', 'Approval', 'Implementation'];
}

/**
 * Get responsible entity
 */
function getResponsibleEntity(actionType: string, sourceType: string): string {
  const entities: Record<string, string> = {
    'traffic_restriction': 'Traffic Management Authority',
    'industrial_reduction': 'Environmental Protection Agency',
    'construction_halt': 'Construction Authority',
    'public_advisory': 'Health Department',
    'water_spraying': 'Municipal Corporation',
    'green_barrier': 'Forest Department',
  };

  return entities[actionType] || 'City Administration';
}

/**
 * Get default solutions when no historical data available
 */
function getDefaultSolutions(sourceType: string, row: any): Solution[] {
  const solutions: Solution[] = [];

  if (sourceType === 'traffic' || sourceType === 'vehicular') {
    solutions.push({
      action_type: 'traffic_restriction',
      priority: 'high',
      description: 'Implement temporary traffic restrictions to reduce vehicular emissions',
      estimated_cost_usd: 50000,
      estimated_aqi_reduction: 15,
      cost_per_aqi_point: 3333,
      implementation_time_days: 1,
      effectiveness_confidence: 0.7,
      historical_success_rate: 0.75,
      requirements: ['City authority approval', 'Traffic management plan'],
      responsible_entity: 'Traffic Management Authority',
      location: row.identified_cause || 'Target area',
    });
  }

  if (sourceType === 'industrial') {
    solutions.push({
      action_type: 'industrial_reduction',
      priority: 'critical',
      description: 'Request temporary emission reduction from identified industrial facilities',
      estimated_cost_usd: 100000,
      estimated_aqi_reduction: 25,
      cost_per_aqi_point: 4000,
      implementation_time_days: 2,
      effectiveness_confidence: 0.8,
      historical_success_rate: 0.8,
      requirements: ['Industrial compliance', 'Emission permits review'],
      responsible_entity: 'Environmental Protection Agency',
      location: row.identified_cause || 'Target area',
    });
  }

  return solutions;
}

/**
 * Build detailed evidence chain
 */
function buildEvidenceChain(row: any): any {
  return {
    temporal_evidence: {
      spike_timing: row.detected_at,
      time_before_spike_minutes: row.time_before_spike_minutes,
      temporal_patterns: row.temporal_factors,
    },
    spatial_evidence: {
      source_location: row.source_location,
      affected_radius: row.affected_radius_meters,
      spatial_factors: row.spatial_factors,
    },
    chemical_evidence: {
      pollutant_fingerprint: row.pollutant_fingerprint,
      signature_match: row.source_type,
      confidence: row.confidence_score,
    },
    meteorological_evidence: {
      wind_direction: row.wind_direction,
      weather_factors: row.weather_factors,
    },
    corroborating_evidence: row.evidence || {},
  };
}

/**
 * Calculate summary statistics
 */
function calculateSummary(pointers: PollutionPointer[]) {
  if (pointers.length === 0) {
    return {
      total_pointers: 0,
      by_source_type: {},
      total_aqi_impact: 0,
      high_priority_count: 0,
      avg_confidence: 0,
    };
  }

  const bySourceType: Record<string, number> = {};
  let totalAqiImpact = 0;
  let highPriorityCount = 0;
  let totalConfidence = 0;

  for (const pointer of pointers) {
    // Group by source type
    const sourceType = pointer.what.signature_match;
    bySourceType[sourceType] = (bySourceType[sourceType] || 0) + 1;

    // Sum AQI impact
    totalAqiImpact += pointer.aqi_impact;

    // Count high priority solutions
    if (pointer.solutions.some(s => s.priority === 'high' || s.priority === 'critical')) {
      highPriorityCount++;
    }

    // Sum confidence
    totalConfidence += pointer.confidence_score;
  }

  return {
    total_pointers: pointers.length,
    by_source_type: bySourceType,
    total_aqi_impact: Math.round(totalAqiImpact),
    high_priority_count: highPriorityCount,
    avg_confidence: totalConfidence / pointers.length,
    avg_aqi_impact: Math.round(totalAqiImpact / pointers.length),
  };
}

/**
 * Parse time range string to PostgreSQL interval
 */
function parseTimeRange(timeRange: string): string {
  const match = timeRange.match(/^(\d+)([hdwmy])$/);
  if (!match) return '1 day';

  const value = match[1];
  const unit = match[2];

  const units: Record<string, string> = {
    'h': 'hours',
    'd': 'days',
    'w': 'weeks',
    'm': 'months',
    'y': 'years',
  };

  return `${value} ${units[unit] || 'days'}`;
}
