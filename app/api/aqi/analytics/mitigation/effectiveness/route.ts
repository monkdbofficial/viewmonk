import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// ============================================================================
// MITIGATION EFFECTIVENESS API
// ============================================================================
// Purpose: Track ROI and cost-benefit analysis of mitigation actions
// Returns: Success rates, AQI reduction, cost per AQI point, trends
// ============================================================================

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/monkdb',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

interface MitigationEffectiveness {
  action_type: string;
  total_actions: number;
  successful_actions: number;
  success_rate: number;
  avg_effectiveness_score: number;
  avg_aqi_reduction: number;
  total_aqi_reduction: number;
  avg_cost_usd: number;
  total_cost_usd: number;
  cost_per_aqi_point: number;
  avg_implementation_time_days: number;
  roi_score: number;
  recommendation: string;
}

interface TrendDataPoint {
  period: string;
  avg_effectiveness: number;
  total_actions: number;
  total_cost: number;
  total_aqi_reduction: number;
}

/**
 * GET /api/aqi/analytics/mitigation/effectiveness
 *
 * Query Parameters:
 * - station_id: Station identifier (optional, for station-specific analysis)
 * - time_range: Time range for analysis (e.g., '30d', '90d', '1y') (default: '90d')
 * - action_type: Filter by specific action type (optional)
 * - min_actions: Minimum number of actions for inclusion (default: 3)
 * - include_trends: Include temporal trend analysis (default: true)
 *
 * Returns: Comprehensive effectiveness analysis with ROI metrics
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stationId = searchParams.get('station_id');
    const timeRange = searchParams.get('time_range') || '90d';
    const actionType = searchParams.get('action_type');
    const minActions = parseInt(searchParams.get('min_actions') || '3');
    const includeTrends = searchParams.get('include_trends') !== 'false';

    const interval = parseTimeRange(timeRange);

    // Build WHERE clause
    let whereClause = `ma.action_taken_at >= NOW() - INTERVAL '${interval}'`;
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (stationId) {
      queryParams.push(stationId);
      whereClause += ` AND ma.station_id = $${paramIndex}`;
      paramIndex++;
    }

    if (actionType) {
      queryParams.push(actionType);
      whereClause += ` AND ma.action_type = $${paramIndex}`;
      paramIndex++;
    }

    // Main effectiveness query
    const effectivenessQuery = `
      SELECT
        ma.action_type,
        COUNT(*) as total_actions,
        SUM(CASE WHEN ma.effectiveness_score > 0.7 THEN 1 ELSE 0 END) as successful_actions,
        AVG(ma.effectiveness_score) as avg_effectiveness_score,
        AVG(ma.aqi_reduction) as avg_aqi_reduction,
        SUM(ma.aqi_reduction) as total_aqi_reduction,
        AVG(ma.cost_usd) as avg_cost_usd,
        SUM(ma.cost_usd) as total_cost_usd,
        AVG(ma.implementation_time_days) as avg_implementation_time_days,
        AVG(ma.cost_usd / NULLIF(ma.aqi_reduction, 0)) as cost_per_aqi_point
      FROM aqi_platform.mitigation_actions ma
      WHERE ${whereClause}
        AND ma.effectiveness_score IS NOT NULL
        AND ma.aqi_reduction IS NOT NULL
        AND ma.aqi_reduction > 0
      GROUP BY ma.action_type
      HAVING COUNT(*) >= $${paramIndex}
      ORDER BY avg_effectiveness_score DESC, cost_per_aqi_point ASC
    `;

    queryParams.push(minActions);
    const result = await pool.query(effectivenessQuery, queryParams);

    // Transform results with ROI calculations
    const effectiveness: MitigationEffectiveness[] = result.rows.map(row => {
      const successRate = row.successful_actions / row.total_actions;
      const roiScore = calculateROI(
        row.avg_effectiveness_score,
        row.cost_per_aqi_point,
        row.avg_implementation_time_days
      );

      return {
        action_type: row.action_type,
        total_actions: parseInt(row.total_actions),
        successful_actions: parseInt(row.successful_actions),
        success_rate: Math.round(successRate * 100) / 100,
        avg_effectiveness_score: Math.round(row.avg_effectiveness_score * 100) / 100,
        avg_aqi_reduction: Math.round(row.avg_aqi_reduction * 10) / 10,
        total_aqi_reduction: Math.round(row.total_aqi_reduction * 10) / 10,
        avg_cost_usd: Math.round(row.avg_cost_usd),
        total_cost_usd: Math.round(row.total_cost_usd),
        cost_per_aqi_point: Math.round(row.cost_per_aqi_point),
        avg_implementation_time_days: Math.round(row.avg_implementation_time_days * 10) / 10,
        roi_score: roiScore,
        recommendation: generateRecommendation(
          successRate,
          row.avg_effectiveness_score,
          row.cost_per_aqi_point,
          roiScore
        ),
      };
    });

    // Get trend data if requested
    let trends: TrendDataPoint[] | null = null;
    if (includeTrends) {
      trends = await getTrendAnalysis(stationId, actionType, interval, queryParams);
    }

    // Calculate overall statistics
    const summary = calculateSummary(effectiveness);

    // Get top performers and underperformers
    const topPerformers = effectiveness.slice(0, 3);
    const underperformers = effectiveness
      .filter(e => e.success_rate < 0.5 || e.roi_score < 0.3)
      .slice(0, 3);

    return NextResponse.json({
      success: true,
      station_id: stationId || 'all',
      time_range: timeRange,
      effectiveness_by_action: effectiveness,
      summary,
      top_performers: topPerformers,
      underperformers,
      trends: trends,
      recommendations: generateOverallRecommendations(effectiveness),
      generated_at: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('Mitigation Effectiveness API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to calculate mitigation effectiveness',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Calculate ROI score (0-1) based on effectiveness, cost, and implementation time
 */
function calculateROI(
  effectiveness: number,
  costPerAqiPoint: number,
  implementationDays: number
): number {
  // Normalize cost (lower is better, cap at $20,000 per AQI point)
  const normalizedCost = Math.max(0, 1 - (costPerAqiPoint / 20000));

  // Normalize implementation time (faster is better, cap at 30 days)
  const normalizedTime = Math.max(0, 1 - (implementationDays / 30));

  // Weighted ROI score: effectiveness (50%), cost (30%), time (20%)
  const roiScore = (effectiveness * 0.5) + (normalizedCost * 0.3) + (normalizedTime * 0.2);

  return Math.round(roiScore * 100) / 100;
}

/**
 * Generate action-specific recommendation
 */
function generateRecommendation(
  successRate: number,
  effectiveness: number,
  costPerAqiPoint: number,
  roiScore: number
): string {
  if (roiScore >= 0.8 && successRate >= 0.75) {
    return 'Highly recommended - Excellent ROI and proven effectiveness';
  } else if (roiScore >= 0.6 && successRate >= 0.6) {
    return 'Recommended - Good balance of effectiveness and cost';
  } else if (costPerAqiPoint > 15000) {
    return 'Use with caution - High cost, consider alternatives';
  } else if (successRate < 0.5) {
    return 'Not recommended - Low success rate, needs improvement';
  } else if (effectiveness < 0.5) {
    return 'Limited effectiveness - Consider combining with other actions';
  } else {
    return 'Moderate effectiveness - Suitable for specific scenarios';
  }
}

/**
 * Get trend analysis over time
 */
async function getTrendAnalysis(
  stationId: string | null,
  actionType: string | null,
  interval: string,
  baseParams: any[]
): Promise<TrendDataPoint[]> {
  try {
    let whereClause = `ma.action_taken_at >= NOW() - INTERVAL '${interval}'`;
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (stationId) {
      queryParams.push(stationId);
      whereClause += ` AND ma.station_id = $${paramIndex}`;
      paramIndex++;
    }

    if (actionType) {
      queryParams.push(actionType);
      whereClause += ` AND ma.action_type = $${paramIndex}`;
      paramIndex++;
    }

    // Determine grouping interval based on time range
    const groupInterval = interval.includes('year') ? 'month' : 'week';

    const trendQuery = `
      SELECT
        DATE_TRUNC('${groupInterval}', ma.action_taken_at) as period,
        AVG(ma.effectiveness_score) as avg_effectiveness,
        COUNT(*) as total_actions,
        SUM(ma.cost_usd) as total_cost,
        SUM(ma.aqi_reduction) as total_aqi_reduction
      FROM aqi_platform.mitigation_actions ma
      WHERE ${whereClause}
        AND ma.effectiveness_score IS NOT NULL
      GROUP BY DATE_TRUNC('${groupInterval}', ma.action_taken_at)
      ORDER BY period ASC
    `;

    const result = await pool.query(trendQuery, queryParams);

    return result.rows.map(row => ({
      period: row.period,
      avg_effectiveness: Math.round(row.avg_effectiveness * 100) / 100,
      total_actions: parseInt(row.total_actions),
      total_cost: Math.round(row.total_cost),
      total_aqi_reduction: Math.round(row.total_aqi_reduction * 10) / 10,
    }));
  } catch (error) {
    console.error('Error fetching trend analysis:', error);
    return [];
  }
}

/**
 * Calculate overall summary statistics
 */
function calculateSummary(effectiveness: MitigationEffectiveness[]) {
  if (effectiveness.length === 0) {
    return {
      total_action_types: 0,
      total_actions: 0,
      overall_success_rate: 0,
      overall_avg_effectiveness: 0,
      total_aqi_reduction: 0,
      total_cost: 0,
      overall_cost_per_aqi_point: 0,
      best_roi_action: null,
      most_effective_action: null,
      most_cost_efficient_action: null,
    };
  }

  const totalActions = effectiveness.reduce((sum, e) => sum + e.total_actions, 0);
  const totalSuccessful = effectiveness.reduce((sum, e) => sum + e.successful_actions, 0);
  const totalAqiReduction = effectiveness.reduce((sum, e) => sum + e.total_aqi_reduction, 0);
  const totalCost = effectiveness.reduce((sum, e) => sum + e.total_cost_usd, 0);
  const avgEffectiveness = effectiveness.reduce((sum, e) => sum + e.avg_effectiveness_score, 0) / effectiveness.length;

  // Find best performers
  const bestRoi = effectiveness.reduce((best, current) =>
    current.roi_score > best.roi_score ? current : best
  );

  const mostEffective = effectiveness.reduce((best, current) =>
    current.avg_effectiveness_score > best.avg_effectiveness_score ? current : best
  );

  const mostCostEfficient = effectiveness.reduce((best, current) =>
    current.cost_per_aqi_point < best.cost_per_aqi_point ? current : best
  );

  return {
    total_action_types: effectiveness.length,
    total_actions: totalActions,
    overall_success_rate: Math.round((totalSuccessful / totalActions) * 100) / 100,
    overall_avg_effectiveness: Math.round(avgEffectiveness * 100) / 100,
    total_aqi_reduction: Math.round(totalAqiReduction * 10) / 10,
    total_cost: Math.round(totalCost),
    overall_cost_per_aqi_point: Math.round(totalCost / totalAqiReduction),
    best_roi_action: bestRoi.action_type,
    most_effective_action: mostEffective.action_type,
    most_cost_efficient_action: mostCostEfficient.action_type,
  };
}

/**
 * Generate overall recommendations
 */
function generateOverallRecommendations(effectiveness: MitigationEffectiveness[]): string[] {
  const recommendations: string[] = [];

  if (effectiveness.length === 0) {
    recommendations.push('Insufficient data for recommendations - Continue collecting mitigation action data');
    return recommendations;
  }

  // Identify high ROI actions
  const highRoiActions = effectiveness.filter(e => e.roi_score >= 0.7);
  if (highRoiActions.length > 0) {
    recommendations.push(
      `Prioritize high-ROI actions: ${highRoiActions.map(e => e.action_type).join(', ')}`
    );
  }

  // Identify underperforming actions
  const underperforming = effectiveness.filter(e => e.success_rate < 0.5);
  if (underperforming.length > 0) {
    recommendations.push(
      `Review and improve: ${underperforming.map(e => e.action_type).join(', ')} - Currently showing low success rates`
    );
  }

  // Cost optimization
  const highCostActions = effectiveness.filter(e => e.cost_per_aqi_point > 10000);
  if (highCostActions.length > 0) {
    recommendations.push(
      `Consider cost optimization for: ${highCostActions.map(e => e.action_type).join(', ')} - High cost per AQI point`
    );
  }

  // Quick wins
  const quickWins = effectiveness.filter(
    e => e.avg_implementation_time_days <= 3 && e.avg_effectiveness_score >= 0.6
  );
  if (quickWins.length > 0) {
    recommendations.push(
      `Quick wins available: ${quickWins.map(e => e.action_type).join(', ')} - Fast implementation with good effectiveness`
    );
  }

  // Data collection
  const lowSampleSize = effectiveness.filter(e => e.total_actions < 10);
  if (lowSampleSize.length > 0) {
    recommendations.push(
      `Collect more data for: ${lowSampleSize.map(e => e.action_type).join(', ')} - Limited sample size`
    );
  }

  return recommendations;
}

/**
 * Parse time range string to PostgreSQL interval
 */
function parseTimeRange(timeRange: string): string {
  const match = timeRange.match(/^(\d+)([hdwmy])$/);
  if (!match) return '90 days';

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
