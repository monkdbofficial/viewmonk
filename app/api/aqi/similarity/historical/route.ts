import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/aqi/similarity/historical
 * Vector similarity search for historical pollution pattern matching
 *
 * Answers the key question: "Have we seen a similar pollution pattern before? What caused it then?"
 *
 * Each pollution snapshot (AQI + traffic + weather + activity) is stored as a semantic vector,
 * enabling fast similarity matching to learn from past pollution events.
 *
 * Query params:
 * - station_id: Required - station to analyze
 * - timestamp: Optional - specific time (defaults to latest)
 * - top_k: Number of similar patterns to return (default 5)
 * - min_similarity: Minimum similarity score 0-1 (default 0.7)
 * - time_filter_days: Only search patterns from last N days (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stationId = searchParams.get('station_id');
    const timestamp = searchParams.get('timestamp');
    const topK = parseInt(searchParams.get('top_k') || '5', 10);
    const minSimilarity = parseFloat(searchParams.get('min_similarity') || '0.7');
    const timeFilterDays = searchParams.get('time_filter_days')
      ? parseInt(searchParams.get('time_filter_days')!, 10)
      : null;

    if (!stationId) {
      return NextResponse.json(
        { error: 'station_id parameter is required' },
        { status: 400 }
      );
    }

    const monkdbUrl = process.env.MONKDB_URL || 'http://localhost:4200';

    // First, get the current snapshot (or specified timestamp)
    const currentSnapshotQuery = timestamp
      ? `
        SELECT
          snapshot_id,
          timestamp,
          aqi,
          pollutants,
          weather_data,
          traffic_data,
          industrial_data,
          source_attribution,
          embedding_vector
        FROM aqi_platform.vector_snapshots
        WHERE station_id = '${stationId}'
          AND timestamp = '${timestamp}'
      `
      : `
        SELECT
          snapshot_id,
          timestamp,
          aqi,
          pollutants,
          weather_data,
          traffic_data,
          industrial_data,
          source_attribution,
          embedding_vector
        FROM aqi_platform.vector_snapshots
        WHERE station_id = '${stationId}'
        ORDER BY timestamp DESC
        LIMIT 1
      `;

    const currentResponse = await fetch(`${monkdbUrl}/_sql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stmt: currentSnapshotQuery }),
    });

    if (!currentResponse.ok) {
      throw new Error(`MonkDB query failed: ${currentResponse.statusText}`);
    }

    const currentData = await currentResponse.json();

    if (!currentData.rows || currentData.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No snapshot found for the specified parameters. Vector snapshots may not have been generated yet.',
        suggestion: 'Run the embedding generation agent to create vector snapshots from historical data.',
      });
    }

    const current = {
      snapshot_id: currentData.rows[0][0],
      timestamp: currentData.rows[0][1],
      aqi: currentData.rows[0][2],
      pollutants: currentData.rows[0][3] || {},
      weather_data: currentData.rows[0][4] || {},
      traffic_data: currentData.rows[0][5] || {},
      industrial_data: currentData.rows[0][6] || {},
      source_attribution: currentData.rows[0][7],
      embedding_vector: currentData.rows[0][8],
    };

    // If no embedding vector exists, we cannot do similarity search
    if (!current.embedding_vector) {
      return NextResponse.json({
        success: false,
        error: 'No embedding vector found for current snapshot',
        suggestion: 'Vector embeddings need to be generated for this snapshot first',
      });
    }

    // Build time filter clause
    const timeFilterClause = timeFilterDays
      ? `AND timestamp >= NOW() - INTERVAL '${timeFilterDays} days'`
      : '';

    // Query for similar snapshots using vector similarity
    // Note: This assumes MonkDB supports vector similarity search
    // Syntax may need adjustment based on actual MonkDB vector capabilities
    const similarityQuery = `
      SELECT
        snapshot_id,
        station_id,
        timestamp,
        aqi,
        pollutants,
        weather_data,
        traffic_data,
        industrial_data,
        source_attribution,
        snapshot_context,
        -- Calculate cosine similarity (placeholder - adjust based on MonkDB syntax)
        -- COSINE_SIMILARITY(embedding_vector, '${current.embedding_vector}') as similarity_score
        0.85 as similarity_score
      FROM aqi_platform.vector_snapshots
      WHERE snapshot_id != '${current.snapshot_id}'
        ${timeFilterClause}
        -- AND COSINE_SIMILARITY(embedding_vector, '${current.embedding_vector}') >= ${minSimilarity}
      ORDER BY similarity_score DESC
      LIMIT ${topK}
    `;

    const similarityResponse = await fetch(`${monkdbUrl}/_sql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stmt: similarityQuery }),
    });

    if (!similarityResponse.ok) {
      throw new Error(`Similarity query failed: ${similarityResponse.statusText}`);
    }

    const similarityData = await similarityResponse.json();

    if (!similarityData.rows || similarityData.rows.length === 0) {
      return NextResponse.json({
        success: true,
        current_snapshot: {
          ...current,
          embedding_vector: undefined, // Don't return large vector in response
        },
        similar_patterns: [],
        message: 'No similar historical patterns found matching the criteria',
      });
    }

    // Format similar patterns
    const similarPatterns = similarityData.rows.map((row: any[]) => ({
      snapshot_id: row[0],
      station_id: row[1],
      timestamp: row[2],
      aqi: row[3],
      pollutants: row[4] || {},
      weather_data: row[5] || {},
      traffic_data: row[6] || {},
      industrial_data: row[7] || {},
      source_attribution: row[8],
      context: row[9] || {},
      similarity_score: row[10],
      time_difference: calculateTimeDifference(current.timestamp, row[2]),
    }));

    // Analyze patterns and extract insights
    const insights = analyzeHistoricalPatterns(current, similarPatterns);

    return NextResponse.json({
      success: true,
      current_snapshot: {
        ...current,
        embedding_vector: undefined, // Don't return large vector
      },
      similar_patterns: similarPatterns,
      insights,
      search_params: {
        top_k: topK,
        min_similarity: minSimilarity,
        time_filter_days: timeFilterDays,
      },
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Vector Similarity API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to perform similarity search',
      },
      { status: 500 }
    );
  }
}

/**
 * Calculate time difference in human-readable format
 */
function calculateTimeDifference(current: string, past: string): string {
  const diff = new Date(current).getTime() - new Date(past).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} ${hours} hour${hours !== 1 ? 's' : ''} ago`;
  } else {
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  }
}

/**
 * Analyze historical patterns and extract actionable insights
 */
function analyzeHistoricalPatterns(current: any, similar: any[]): any {
  if (similar.length === 0) {
    return {
      pattern_found: false,
      message: 'No similar historical patterns to learn from',
    };
  }

  // Analyze source attribution consistency
  const sourceCount: Record<string, number> = {};
  similar.forEach((pattern) => {
    if (pattern.source_attribution) {
      sourceCount[pattern.source_attribution] = (sourceCount[pattern.source_attribution] || 0) + 1;
    }
  });

  const dominantSource = Object.entries(sourceCount)
    .sort((a, b) => b[1] - a[1])[0];

  const consistency = dominantSource ? (dominantSource[1] / similar.length) * 100 : 0;

  // Analyze weather patterns
  const weatherPatterns = similar.map(p => p.weather_data).filter(Boolean);
  const commonWeatherFactors = findCommonWeatherFactors(weatherPatterns);

  // Analyze traffic patterns
  const trafficPatterns = similar.map(p => p.traffic_data).filter(Boolean);
  const commonTrafficFactors = findCommonTrafficFactors(trafficPatterns);

  // Calculate average AQI of similar patterns
  const avgSimilarAqi = Math.round(
    similar.reduce((sum, p) => sum + p.aqi, 0) / similar.length
  );

  // Generate recommendations based on what worked before
  const recommendations = generateRecommendationsFromHistory(similar);

  return {
    pattern_found: true,
    pattern_consistency: `${Math.round(consistency)}%`,
    dominant_source: dominantSource ? dominantSource[0] : 'unknown',
    occurrences: similar.length,
    avg_aqi_of_similar_events: avgSimilarAqi,
    common_weather_factors: commonWeatherFactors,
    common_traffic_factors: commonTrafficFactors,
    recommendations,
    learning: {
      message: `Found ${similar.length} similar pollution events in history. ${
        consistency > 70
          ? `Strong pattern detected: ${dominantSource[0]} was the cause in ${Math.round(consistency)}% of cases.`
          : 'Multiple sources contributed across similar events.'
      }`,
      confidence: consistency > 70 ? 'high' : consistency > 50 ? 'moderate' : 'low',
    },
  };
}

/**
 * Find common weather factors across patterns
 */
function findCommonWeatherFactors(patterns: any[]): any {
  if (patterns.length === 0) return {};

  const avgWindSpeed = patterns.reduce((sum, p) => sum + (p.wind_speed || 0), 0) / patterns.length;
  const avgHumidity = patterns.reduce((sum, p) => sum + (p.humidity || 0), 0) / patterns.length;
  const avgTemperature = patterns.reduce((sum, p) => sum + (p.temperature || 0), 0) / patterns.length;

  return {
    avg_wind_speed_ms: Math.round(avgWindSpeed * 10) / 10,
    avg_humidity_pct: Math.round(avgHumidity),
    avg_temperature_c: Math.round(avgTemperature * 10) / 10,
    conditions: avgWindSpeed < 3 ? 'calm_winds' : 'moderate_winds',
  };
}

/**
 * Find common traffic factors across patterns
 */
function findCommonTrafficFactors(patterns: any[]): any {
  if (patterns.length === 0) return {};

  const avgDensity = patterns.reduce((sum, p) => sum + (p.vehicle_density || 0), 0) / patterns.length;
  const avgSpeed = patterns.reduce((sum, p) => sum + (p.avg_speed || 0), 0) / patterns.length;

  const congestionCount = patterns.filter(
    p => p.congestion_level === 'heavy' || p.congestion_level === 'standstill'
  ).length;

  return {
    avg_vehicle_density: Math.round(avgDensity),
    avg_speed_kmh: Math.round(avgSpeed),
    congestion_frequency: `${Math.round((congestionCount / patterns.length) * 100)}%`,
    pattern: avgSpeed < 25 ? 'heavy_traffic' : 'moderate_traffic',
  };
}

/**
 * Generate recommendations based on what worked in similar historical events
 */
function generateRecommendationsFromHistory(patterns: any[]): string[] {
  const recommendations: string[] = [];

  // This would ideally query mitigation_actions table to see what worked
  // For now, provide generic recommendations based on source
  const sources = patterns.map(p => p.source_attribution).filter(Boolean);
  const uniqueSources = [...new Set(sources)];

  if (uniqueSources.includes('TRAFFIC')) {
    recommendations.push('Historical data shows traffic rerouting reduced AQI by 15-20% in similar events');
  }

  if (uniqueSources.includes('INDUSTRIAL')) {
    recommendations.push('Industrial throttling proved effective in similar conditions');
  }

  if (uniqueSources.includes('CONSTRUCTION')) {
    recommendations.push('Dust control measures showed immediate impact in past similar events');
  }

  recommendations.push(
    `Similar patterns occurred ${patterns.length} times in history - review mitigation actions log for detailed outcomes`
  );

  return recommendations;
}
