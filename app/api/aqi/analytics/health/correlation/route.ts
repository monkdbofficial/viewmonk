import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// ============================================================================
// HEALTH CORRELATION API
// ============================================================================
// Purpose: Correlate AQI with health outcomes (respiratory cases, hospital admissions)
// Statistical Analysis: Pearson correlation, p-value, risk multipliers
// ============================================================================

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/monkdb',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

interface HealthCorrelation {
  metric: string;
  correlation_coefficient: number;
  p_value: number;
  significance_level: 'high' | 'medium' | 'low' | 'not_significant';
  data_points: number;
  interpretation: string;
}

interface RiskMultiplier {
  aqi_category: string;
  aqi_range: string;
  baseline_risk: number;
  increased_risk: number;
  risk_multiplier: number;
  affected_population_estimate: number;
}

interface HealthImpactData {
  date: string;
  avg_aqi: number;
  respiratory_cases: number;
  hospital_admissions: number;
  er_visits: number;
}

/**
 * GET /api/aqi/analytics/health/correlation
 *
 * Query Parameters:
 * - station_id: Station identifier (optional, for station-specific analysis)
 * - time_range: Time range for analysis (e.g., '90d', '180d', '1y') (default: '180d')
 * - age_group: Filter by age group (children/adults/elderly/all) (default: 'all')
 * - include_risk_multipliers: Include AQI category risk multipliers (default: true)
 *
 * Returns: Correlation analysis between AQI and health outcomes
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stationId = searchParams.get('station_id');
    const timeRange = searchParams.get('time_range') || '180d';
    const ageGroup = searchParams.get('age_group') || 'all';
    const includeRiskMultipliers = searchParams.get('include_risk_multipliers') !== 'false';

    const interval = parseTimeRange(timeRange);

    // Build WHERE clause
    let whereClause = `hm.date >= CURRENT_DATE - INTERVAL '${interval}'`;
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (stationId) {
      queryParams.push(stationId);
      whereClause += ` AND hm.station_id = $${paramIndex}`;
      paramIndex++;
    }

    if (ageGroup !== 'all') {
      queryParams.push(ageGroup);
      whereClause += ` AND hm.age_group = $${paramIndex}`;
      paramIndex++;
    }

    // Get combined health and AQI data
    const dataQuery = `
      SELECT
        hm.date,
        hm.station_id,
        hm.respiratory_cases,
        hm.hospital_admissions,
        hm.er_visits,
        hm.asthma_attacks,
        hm.copd_exacerbations,
        hm.cardiovascular_events,
        AVG(r.aqi) as avg_aqi,
        AVG(r.pm25) as avg_pm25,
        AVG(r.pm10) as avg_pm10,
        AVG(r.o3) as avg_o3,
        AVG(r.no2) as avg_no2
      FROM aqi_platform.health_metrics hm
      INNER JOIN aqi_platform.readings r
        ON hm.station_id = r.station_id
        AND hm.date = DATE(r.timestamp)
      WHERE ${whereClause}
      GROUP BY hm.date, hm.station_id, hm.respiratory_cases, hm.hospital_admissions,
               hm.er_visits, hm.asthma_attacks, hm.copd_exacerbations, hm.cardiovascular_events
      ORDER BY hm.date ASC
    `;

    const dataResult = await pool.query(dataQuery, queryParams);
    const data = dataResult.rows;

    if (data.length < 30) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient data',
        message: 'At least 30 days of data required for meaningful correlation analysis',
        data_points: data.length,
      }, { status: 400 });
    }

    // Calculate correlations for different health metrics
    const correlations: HealthCorrelation[] = [];

    // Respiratory cases vs AQI
    const respiratoryCorr = calculateCorrelation(
      data.map(d => d.avg_aqi),
      data.map(d => d.respiratory_cases)
    );
    correlations.push({
      metric: 'Respiratory Cases',
      correlation_coefficient: respiratoryCorr.coefficient,
      p_value: respiratoryCorr.pValue,
      significance_level: determineSignificance(respiratoryCorr.pValue),
      data_points: data.length,
      interpretation: interpretCorrelation(respiratoryCorr.coefficient, respiratoryCorr.pValue, 'respiratory cases'),
    });

    // Hospital admissions vs AQI
    const hospitalCorr = calculateCorrelation(
      data.map(d => d.avg_aqi),
      data.map(d => d.hospital_admissions)
    );
    correlations.push({
      metric: 'Hospital Admissions',
      correlation_coefficient: hospitalCorr.coefficient,
      p_value: hospitalCorr.pValue,
      significance_level: determineSignificance(hospitalCorr.pValue),
      data_points: data.length,
      interpretation: interpretCorrelation(hospitalCorr.coefficient, hospitalCorr.pValue, 'hospital admissions'),
    });

    // ER visits vs AQI
    const erCorr = calculateCorrelation(
      data.map(d => d.avg_aqi),
      data.map(d => d.er_visits)
    );
    correlations.push({
      metric: 'Emergency Room Visits',
      correlation_coefficient: erCorr.coefficient,
      p_value: erCorr.pValue,
      significance_level: determineSignificance(erCorr.pValue),
      data_points: data.length,
      interpretation: interpretCorrelation(erCorr.coefficient, erCorr.pValue, 'ER visits'),
    });

    // Asthma attacks vs AQI
    const asthmaCorr = calculateCorrelation(
      data.map(d => d.avg_aqi),
      data.map(d => d.asthma_attacks || 0)
    );
    correlations.push({
      metric: 'Asthma Attacks',
      correlation_coefficient: asthmaCorr.coefficient,
      p_value: asthmaCorr.pValue,
      significance_level: determineSignificance(asthmaCorr.pValue),
      data_points: data.length,
      interpretation: interpretCorrelation(asthmaCorr.coefficient, asthmaCorr.pValue, 'asthma attacks'),
    });

    // Calculate risk multipliers by AQI category
    let riskMultipliers: RiskMultiplier[] | null = null;
    if (includeRiskMultipliers) {
      riskMultipliers = await calculateRiskMultipliers(data, stationId);
    }

    // Transform data for response
    const healthImpactData: HealthImpactData[] = data.map(d => ({
      date: d.date,
      avg_aqi: Math.round(d.avg_aqi),
      respiratory_cases: d.respiratory_cases,
      hospital_admissions: d.hospital_admissions,
      er_visits: d.er_visits,
    }));

    // Calculate summary statistics
    const summary = calculateHealthSummary(data, correlations);

    return NextResponse.json({
      success: true,
      station_id: stationId || 'all',
      time_range: timeRange,
      age_group: ageGroup,
      correlations,
      risk_multipliers: riskMultipliers,
      health_impact_data: healthImpactData,
      summary,
      recommendations: generateHealthRecommendations(correlations, riskMultipliers),
      generated_at: new Date().toISOString(),
    });

  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to calculate health correlation',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Calculate Pearson correlation coefficient and p-value
 */
function calculateCorrelation(x: number[], y: number[]): { coefficient: number; pValue: number } {
  const n = x.length;

  // Calculate means
  const meanX = x.reduce((sum, val) => sum + val, 0) / n;
  const meanY = y.reduce((sum, val) => sum + val, 0) / n;

  // Calculate correlation coefficient
  let numerator = 0;
  let sumXSquared = 0;
  let sumYSquared = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    numerator += dx * dy;
    sumXSquared += dx * dx;
    sumYSquared += dy * dy;
  }

  const denominator = Math.sqrt(sumXSquared * sumYSquared);
  const coefficient = denominator === 0 ? 0 : numerator / denominator;

  // Calculate t-statistic for p-value
  const t = coefficient * Math.sqrt((n - 2) / (1 - coefficient * coefficient));

  // Approximate p-value using t-distribution (two-tailed test)
  // For simplicity, using a rough approximation
  const pValue = calculatePValue(Math.abs(t), n - 2);

  return {
    coefficient: Math.round(coefficient * 1000) / 1000,
    pValue: Math.round(pValue * 1000) / 1000,
  };
}

/**
 * Approximate p-value from t-statistic
 */
function calculatePValue(t: number, df: number): number {
  // Rough approximation for p-value
  // For more accuracy, would use a proper t-distribution library
  if (t < 1.96) return 0.05; // Not significant
  if (t < 2.58) return 0.01;
  if (t < 3.29) return 0.001;
  return 0.0001; // Highly significant
}

/**
 * Determine significance level from p-value
 */
function determineSignificance(pValue: number): 'high' | 'medium' | 'low' | 'not_significant' {
  if (pValue < 0.001) return 'high';
  if (pValue < 0.01) return 'medium';
  if (pValue < 0.05) return 'low';
  return 'not_significant';
}

/**
 * Interpret correlation results
 */
function interpretCorrelation(coefficient: number, pValue: number, metric: string): string {
  const absCoeff = Math.abs(coefficient);
  const direction = coefficient > 0 ? 'positive' : 'negative';

  if (pValue >= 0.05) {
    return `No statistically significant correlation found between AQI and ${metric}`;
  }

  let strength = '';
  if (absCoeff >= 0.7) strength = 'strong';
  else if (absCoeff >= 0.4) strength = 'moderate';
  else strength = 'weak';

  return `${strength.charAt(0).toUpperCase() + strength.slice(1)} ${direction} correlation: ` +
         `Higher AQI levels are ${direction === 'positive' ? 'associated with' : 'not associated with'} ` +
         `increased ${metric} (p < ${pValue.toFixed(3)})`;
}

/**
 * Calculate risk multipliers by AQI category
 */
async function calculateRiskMultipliers(
  data: any[],
  stationId: string | null
): Promise<RiskMultiplier[]> {
  // Categorize data by AQI levels
  const categories = [
    { name: 'Good', range: '0-50', min: 0, max: 50 },
    { name: 'Moderate', range: '51-100', min: 51, max: 100 },
    { name: 'Unhealthy for Sensitive', range: '101-150', min: 101, max: 150 },
    { name: 'Unhealthy', range: '151-200', min: 151, max: 200 },
    { name: 'Very Unhealthy', range: '201-300', min: 201, max: 300 },
    { name: 'Hazardous', range: '300+', min: 300, max: 999 },
  ];

  const riskMultipliers: RiskMultiplier[] = [];

  // Calculate baseline (Good AQI)
  const baseline = data.filter(d => d.avg_aqi >= 0 && d.avg_aqi <= 50);
  if (baseline.length === 0) {
    // No baseline data, use overall average as baseline
    const avgRespiratory = data.reduce((sum, d) => sum + d.respiratory_cases, 0) / data.length;
    const baselineRisk = avgRespiratory;

    for (const category of categories) {
      const categoryData = data.filter(d => d.avg_aqi >= category.min && d.avg_aqi <= category.max);
      if (categoryData.length === 0) continue;

      const avgCategoryRespiratory = categoryData.reduce((sum, d) => sum + d.respiratory_cases, 0) / categoryData.length;
      const multiplier = avgCategoryRespiratory / baselineRisk;

      riskMultipliers.push({
        aqi_category: category.name,
        aqi_range: category.range,
        baseline_risk: Math.round(baselineRisk * 10) / 10,
        increased_risk: Math.round(avgCategoryRespiratory * 10) / 10,
        risk_multiplier: Math.round(multiplier * 100) / 100,
        affected_population_estimate: Math.round(categoryData.reduce((sum, d) => sum + d.respiratory_cases, 0)),
      });
    }
  } else {
    const baselineRespiratory = baseline.reduce((sum, d) => sum + d.respiratory_cases, 0) / baseline.length;

    for (const category of categories) {
      const categoryData = data.filter(d => d.avg_aqi >= category.min && d.avg_aqi <= category.max);
      if (categoryData.length === 0) continue;

      const avgCategoryRespiratory = categoryData.reduce((sum, d) => sum + d.respiratory_cases, 0) / categoryData.length;
      const multiplier = avgCategoryRespiratory / baselineRespiratory;

      riskMultipliers.push({
        aqi_category: category.name,
        aqi_range: category.range,
        baseline_risk: Math.round(baselineRespiratory * 10) / 10,
        increased_risk: Math.round(avgCategoryRespiratory * 10) / 10,
        risk_multiplier: Math.round(multiplier * 100) / 100,
        affected_population_estimate: Math.round(categoryData.reduce((sum, d) => sum + d.respiratory_cases, 0)),
      });
    }
  }

  return riskMultipliers;
}

/**
 * Calculate summary statistics
 */
function calculateHealthSummary(data: any[], correlations: HealthCorrelation[]) {
  const totalRespiratory = data.reduce((sum, d) => sum + d.respiratory_cases, 0);
  const totalHospital = data.reduce((sum, d) => sum + d.hospital_admissions, 0);
  const totalER = data.reduce((sum, d) => sum + d.er_visits, 0);
  const avgAQI = data.reduce((sum, d) => sum + d.avg_aqi, 0) / data.length;

  // Find days with high AQI (>150) and health impact
  const highAQIDays = data.filter(d => d.avg_aqi > 150);
  const highAQIHealthImpact = highAQIDays.reduce((sum, d) =>
    sum + d.respiratory_cases + d.hospital_admissions + d.er_visits, 0
  );

  // Find strongest correlation
  const strongestCorr = correlations.reduce((strongest, current) =>
    Math.abs(current.correlation_coefficient) > Math.abs(strongest.correlation_coefficient) ? current : strongest
  );

  return {
    data_points: data.length,
    total_respiratory_cases: totalRespiratory,
    total_hospital_admissions: totalHospital,
    total_er_visits: totalER,
    total_health_events: totalRespiratory + totalHospital + totalER,
    avg_aqi: Math.round(avgAQI),
    high_aqi_days: highAQIDays.length,
    high_aqi_health_impact: highAQIHealthImpact,
    strongest_correlation: {
      metric: strongestCorr.metric,
      coefficient: strongestCorr.correlation_coefficient,
    },
    significant_correlations: correlations.filter(c => c.significance_level !== 'not_significant').length,
  };
}

/**
 * Generate health-based recommendations
 */
function generateHealthRecommendations(
  correlations: HealthCorrelation[],
  riskMultipliers: RiskMultiplier[] | null
): string[] {
  const recommendations: string[] = [];

  // Check for significant correlations
  const significantCorrs = correlations.filter(c => c.significance_level !== 'not_significant');

  if (significantCorrs.length > 0) {
    recommendations.push(
      `Significant health impacts detected for: ${significantCorrs.map(c => c.metric).join(', ')}. ` +
      `Prioritize pollution reduction to minimize health burden.`
    );
  }

  // Check risk multipliers
  if (riskMultipliers) {
    const highRisk = riskMultipliers.filter(rm => rm.risk_multiplier > 2);
    if (highRisk.length > 0) {
      recommendations.push(
        `Health risks more than double during ${highRisk.map(r => r.aqi_category).join(', ')} AQI levels. ` +
        `Issue public health advisories when AQI exceeds 100.`
      );
    }
  }

  // Vulnerable populations
  recommendations.push(
    'Establish early warning system for vulnerable populations (children, elderly, respiratory patients) ' +
    'when AQI forecasts predict unhealthy levels.'
  );

  // Healthcare preparedness
  const strongCorrs = correlations.filter(c => Math.abs(c.correlation_coefficient) > 0.5);
  if (strongCorrs.length > 0) {
    recommendations.push(
      'Healthcare facilities should prepare for increased patient volume during high pollution episodes. ' +
      'Ensure adequate staffing and supplies for respiratory treatments.'
    );
  }

  return recommendations;
}

/**
 * Parse time range string to PostgreSQL interval
 */
function parseTimeRange(timeRange: string): string {
  const match = timeRange.match(/^(\d+)([hdwmy])$/);
  if (!match) return '180 days';

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
