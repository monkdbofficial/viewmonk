import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// POLICY SIMULATION API
// ============================================================================
// Purpose: What-if scenarios for pollution control policies
// Input: Policy parameters, baseline period, simulation duration
// Output: Projected AQI reduction, costs, health benefits, feasibility
// ============================================================================

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/monkdb',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

interface PolicyConfig {
  policy_type: string;
  parameters: Record<string, any>;
  target_sources?: string[];
  implementation_schedule?: string;
}

interface SimulationRequest {
  simulation_name: string;
  station_id?: string;
  region?: string;
  baseline_period_days: number;
  simulation_duration_days: number;
  policies: PolicyConfig[];
  assumptions?: Record<string, any>;
}

interface SimulationResult {
  simulation_id: string;
  simulation_name: string;
  status: string;
  baseline_metrics: any;
  simulated_metrics: any;
  improvements: any;
  cost_analysis: any;
  health_benefits: any;
  feasibility_assessment: any;
  recommendations: string[];
}

/**
 * POST /api/aqi/analytics/policy/simulate
 *
 * Body: SimulationRequest
 *
 * Returns: Simulation results with projected outcomes
 */
export async function POST(request: NextRequest) {
  try {
    const body: SimulationRequest = await request.json();

    // Validate request
    if (!body.simulation_name || !body.policies || body.policies.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request',
          message: 'simulation_name and policies are required',
        },
        { status: 400 }
      );
    }

    const simulationId = uuidv4();
    const stationId = body.station_id;
    const region = body.region;
    const baselineDays = body.baseline_period_days || 90;
    const simulationDays = body.simulation_duration_days || 365;

    // Get baseline metrics
    const baselineMetrics = await getBaselineMetrics(stationId, region, baselineDays);

    if (!baselineMetrics) {
      return NextResponse.json(
        {
          success: false,
          error: 'Insufficient baseline data',
          message: `No data available for the specified location and baseline period`,
        },
        { status: 400 }
      );
    }

    // Simulate policy impacts
    const simulatedMetrics = await simulatePolicyImpacts(
      baselineMetrics,
      body.policies,
      simulationDays,
      body.assumptions
    );

    // Calculate improvements
    const improvements = calculateImprovements(baselineMetrics, simulatedMetrics);

    // Estimate costs
    const costAnalysis = await estimateCosts(body.policies, stationId, region, simulationDays);

    // Calculate health benefits
    const healthBenefits = await calculateHealthBenefits(
      improvements.aqi_reduction,
      stationId,
      region,
      simulationDays
    );

    // Assess feasibility
    const feasibilityAssessment = assessFeasibility(body.policies, costAnalysis, improvements);

    // Generate recommendations
    const recommendations = generatePolicyRecommendations(
      body.policies,
      improvements,
      costAnalysis,
      feasibilityAssessment
    );

    // Store simulation in database
    await storeSimulation({
      simulation_id: simulationId,
      simulation_name: body.simulation_name,
      station_id: stationId,
      region: region,
      baseline_period_start: new Date(Date.now() - baselineDays * 24 * 60 * 60 * 1000),
      baseline_period_end: new Date(),
      simulation_duration_days: simulationDays,
      policies: body.policies,
      baseline_metrics: baselineMetrics,
      simulated_metrics: simulatedMetrics,
      results: {
        improvements,
        cost_analysis: costAnalysis,
        health_benefits: healthBenefits,
        feasibility_assessment: feasibilityAssessment,
      },
      assumptions: body.assumptions || {},
    });

    const result: SimulationResult = {
      simulation_id: simulationId,
      simulation_name: body.simulation_name,
      status: 'completed',
      baseline_metrics: baselineMetrics,
      simulated_metrics: simulatedMetrics,
      improvements,
      cost_analysis: costAnalysis,
      health_benefits: healthBenefits,
      feasibility_assessment: feasibilityAssessment,
      recommendations,
    };

    return NextResponse.json({
      success: true,
      simulation: result,
      generated_at: new Date().toISOString(),
    });

  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to run policy simulation',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/aqi/analytics/policy/simulate/:simulation_id
 *
 * Retrieve saved simulation results
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const simulationId = searchParams.get('simulation_id');

    if (!simulationId) {
      // List recent simulations
      const query = `
        SELECT
          simulation_id,
          simulation_name,
          station_id,
          region,
          created_at,
          results
        FROM aqi_platform.policy_simulations
        ORDER BY created_at DESC
        LIMIT 20
      `;

      const result = await pool.query(query);

      return NextResponse.json({
        success: true,
        simulations: result.rows,
      });
    }

    // Get specific simulation
    const query = `
      SELECT * FROM aqi_platform.policy_simulations
      WHERE simulation_id = $1
    `;

    const result = await pool.query(query, [simulationId]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Simulation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      simulation: result.rows[0],
    });

  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve simulation',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Get baseline metrics from historical data
 */
async function getBaselineMetrics(
  stationId: string | undefined,
  region: string | undefined,
  baselineDays: number
): Promise<any | null> {
  try {
    let whereClause = `r.timestamp >= NOW() - INTERVAL '${baselineDays} days'`;
    const queryParams: any[] = [];

    if (stationId) {
      queryParams.push(stationId);
      whereClause += ` AND r.station_id = $1`;
    }

    const query = `
      SELECT
        AVG(r.aqi) as avg_aqi,
        MAX(r.aqi) as max_aqi,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY r.aqi) as median_aqi,
        AVG(r.pm25) as avg_pm25,
        AVG(r.pm10) as avg_pm10,
        AVG(r.o3) as avg_o3,
        AVG(r.no2) as avg_no2,
        AVG(r.so2) as avg_so2,
        AVG(r.co) as avg_co,
        COUNT(*) as data_points,
        SUM(CASE WHEN r.aqi > 100 THEN 1 ELSE 0 END) as unhealthy_days,
        SUM(CASE WHEN r.aqi > 150 THEN 1 ELSE 0 END) as very_unhealthy_days
      FROM aqi_platform.readings r
      WHERE ${whereClause}
    `;

    const result = await pool.query(query, queryParams);

    if (result.rows.length === 0 || result.rows[0].data_points === 0) {
      return null;
    }

    const row = result.rows[0];

    return {
      avg_aqi: Math.round(row.avg_aqi * 10) / 10,
      max_aqi: Math.round(row.max_aqi),
      median_aqi: Math.round(row.median_aqi),
      pollutants: {
        pm25: Math.round(row.avg_pm25 * 100) / 100,
        pm10: Math.round(row.avg_pm10 * 100) / 100,
        o3: Math.round(row.avg_o3 * 1000) / 1000,
        no2: Math.round(row.avg_no2 * 1000) / 1000,
        so2: Math.round(row.avg_so2 * 1000) / 1000,
        co: Math.round(row.avg_co * 100) / 100,
      },
      data_points: parseInt(row.data_points),
      unhealthy_days: parseInt(row.unhealthy_days),
      very_unhealthy_days: parseInt(row.very_unhealthy_days),
      unhealthy_percentage: (row.unhealthy_days / baselineDays) * 100,
    };
  } catch {
    return null;
  }
}

/**
 * Simulate policy impacts on air quality
 */
async function simulatePolicyImpacts(
  baseline: any,
  policies: PolicyConfig[],
  simulationDays: number,
  assumptions?: Record<string, any>
): Promise<any> {
  // Calculate combined impact of all policies
  let totalReduction = 0;
  const policyImpacts: any[] = [];

  for (const policy of policies) {
    const impact = calculatePolicyImpact(policy, baseline, assumptions);
    totalReduction += impact.aqi_reduction_percentage;
    policyImpacts.push(impact);
  }

  // Cap total reduction at 70% (realistic limit)
  totalReduction = Math.min(totalReduction, 70);

  // Calculate new AQI levels
  const newAvgAqi = baseline.avg_aqi * (1 - totalReduction / 100);
  const newMaxAqi = baseline.max_aqi * (1 - totalReduction * 0.8 / 100); // Max reduces less than average

  // Estimate new unhealthy days
  const reductionFactor = 1 - totalReduction / 100;
  const newUnhealthyDays = Math.round(baseline.unhealthy_days * reductionFactor * reductionFactor); // Squared for compounding effect
  const newVeryUnhealthyDays = Math.round(baseline.very_unhealthy_days * reductionFactor * reductionFactor * reductionFactor);

  return {
    avg_aqi: Math.round(newAvgAqi * 10) / 10,
    max_aqi: Math.round(newMaxAqi),
    median_aqi: Math.round(baseline.median_aqi * reductionFactor),
    pollutants: {
      pm25: Math.round(baseline.pollutants.pm25 * reductionFactor * 100) / 100,
      pm10: Math.round(baseline.pollutants.pm10 * reductionFactor * 100) / 100,
      o3: Math.round(baseline.pollutants.o3 * reductionFactor * 1000) / 1000,
      no2: Math.round(baseline.pollutants.no2 * reductionFactor * 1000) / 1000,
      so2: Math.round(baseline.pollutants.so2 * reductionFactor * 1000) / 1000,
      co: Math.round(baseline.pollutants.co * reductionFactor * 100) / 100,
    },
    unhealthy_days: newUnhealthyDays,
    very_unhealthy_days: newVeryUnhealthyDays,
    unhealthy_percentage: (newUnhealthyDays / simulationDays) * 100,
    total_reduction_percentage: Math.round(totalReduction * 10) / 10,
    policy_impacts: policyImpacts,
  };
}

/**
 * Calculate individual policy impact
 */
function calculatePolicyImpact(
  policy: PolicyConfig,
  baseline: any,
  assumptions?: Record<string, any>
): any {
  // Policy impact models (simplified - would use more complex models in production)
  const impactModels: Record<string, number> = {
    'emission_cap': 15, // 15% AQI reduction
    'traffic_restriction': 12, // 12% reduction
    'industrial_reduction': 20, // 20% reduction
    'construction_halt': 8, // 8% reduction
    'green_zone': 10, // 10% reduction
    'clean_fuel_mandate': 18, // 18% reduction
    'emission_standards': 25, // 25% reduction (long-term)
  };

  const baseImpact = impactModels[policy.policy_type] || 5;

  // Adjust based on policy parameters
  let adjustedImpact = baseImpact;

  if (policy.parameters.stringency === 'high') {
    adjustedImpact *= 1.3;
  } else if (policy.parameters.stringency === 'low') {
    adjustedImpact *= 0.7;
  }

  if (policy.parameters.coverage === 'city_wide') {
    adjustedImpact *= 1.2;
  } else if (policy.parameters.coverage === 'limited') {
    adjustedImpact *= 0.6;
  }

  return {
    policy_type: policy.policy_type,
    aqi_reduction_percentage: Math.round(adjustedImpact * 10) / 10,
    primary_pollutants_affected: getPrimaryPollutants(policy.policy_type),
    implementation_complexity: getImplementationComplexity(policy.policy_type),
  };
}

/**
 * Get primary pollutants affected by policy
 */
function getPrimaryPollutants(policyType: string): string[] {
  const pollutantMap: Record<string, string[]> = {
    'emission_cap': ['PM2.5', 'PM10', 'NO2', 'SO2'],
    'traffic_restriction': ['NO2', 'CO', 'PM2.5'],
    'industrial_reduction': ['PM2.5', 'PM10', 'SO2', 'NO2'],
    'construction_halt': ['PM10', 'PM2.5'],
    'green_zone': ['PM2.5', 'O3'],
    'clean_fuel_mandate': ['SO2', 'CO', 'PM2.5'],
    'emission_standards': ['All pollutants'],
  };

  return pollutantMap[policyType] || ['PM2.5', 'PM10'];
}

/**
 * Get implementation complexity
 */
function getImplementationComplexity(policyType: string): 'low' | 'medium' | 'high' {
  const complexityMap: Record<string, 'low' | 'medium' | 'high'> = {
    'emission_cap': 'high',
    'traffic_restriction': 'medium',
    'industrial_reduction': 'high',
    'construction_halt': 'low',
    'green_zone': 'medium',
    'clean_fuel_mandate': 'high',
    'emission_standards': 'high',
  };

  return complexityMap[policyType] || 'medium';
}

/**
 * Calculate improvements
 */
function calculateImprovements(baseline: any, simulated: any): any {
  return {
    aqi_reduction: Math.round((baseline.avg_aqi - simulated.avg_aqi) * 10) / 10,
    aqi_reduction_percentage: Math.round(((baseline.avg_aqi - simulated.avg_aqi) / baseline.avg_aqi) * 1000) / 10,
    unhealthy_days_reduction: baseline.unhealthy_days - simulated.unhealthy_days,
    very_unhealthy_days_reduction: baseline.very_unhealthy_days - simulated.very_unhealthy_days,
    pollutant_reductions: {
      pm25: Math.round((baseline.pollutants.pm25 - simulated.pollutants.pm25) * 100) / 100,
      pm10: Math.round((baseline.pollutants.pm10 - simulated.pollutants.pm10) * 100) / 100,
      o3: Math.round((baseline.pollutants.o3 - simulated.pollutants.o3) * 1000) / 1000,
      no2: Math.round((baseline.pollutants.no2 - simulated.pollutants.no2) * 1000) / 1000,
    },
  };
}

/**
 * Estimate policy costs
 */
async function estimateCosts(
  policies: PolicyConfig[],
  stationId: string | undefined,
  region: string | undefined,
  simulationDays: number
): Promise<any> {
  // Cost models (USD per year)
  const costModels: Record<string, number> = {
    'emission_cap': 5000000, // $5M/year
    'traffic_restriction': 2000000, // $2M/year
    'industrial_reduction': 10000000, // $10M/year
    'construction_halt': 1000000, // $1M/year
    'green_zone': 3000000, // $3M/year
    'clean_fuel_mandate': 8000000, // $8M/year
    'emission_standards': 15000000, // $15M/year
  };

  let totalCost = 0;
  const policyCosts: any[] = [];

  for (const policy of policies) {
    const annualCost = costModels[policy.policy_type] || 1000000;
    const simulationCost = (annualCost / 365) * simulationDays;

    totalCost += simulationCost;
    policyCosts.push({
      policy_type: policy.policy_type,
      annual_cost_usd: annualCost,
      simulation_period_cost_usd: Math.round(simulationCost),
    });
  }

  return {
    total_cost_usd: Math.round(totalCost),
    annual_cost_usd: Math.round((totalCost / simulationDays) * 365),
    policy_costs: policyCosts,
    cost_per_capita: null, // Would calculate if population data available
  };
}

/**
 * Calculate health benefits
 */
async function calculateHealthBenefits(
  aqiReduction: number,
  stationId: string | undefined,
  region: string | undefined,
  simulationDays: number
): Promise<any> {
  // Health impact coefficients (based on epidemiological studies)
  const respiratoryCasesPerAqiPoint = 5; // Per day
  const hospitalAdmissionsPerAqiPoint = 0.8;
  const erVisitsPerAqiPoint = 1.2;

  const dailyReduction = {
    respiratory_cases: Math.round(aqiReduction * respiratoryCasesPerAqiPoint),
    hospital_admissions: Math.round(aqiReduction * hospitalAdmissionsPerAqiPoint * 10) / 10,
    er_visits: Math.round(aqiReduction * erVisitsPerAqiPoint * 10) / 10,
  };

  const totalReduction = {
    respiratory_cases: Math.round(dailyReduction.respiratory_cases * simulationDays),
    hospital_admissions: Math.round(dailyReduction.hospital_admissions * simulationDays),
    er_visits: Math.round(dailyReduction.er_visits * simulationDays),
  };

  // Estimate monetary value (healthcare cost savings)
  const costPerRespiratory = 200; // $200 per case
  const costPerHospitalization = 5000; // $5000 per admission
  const costPerER = 800; // $800 per visit

  const monetaryBenefit =
    (totalReduction.respiratory_cases * costPerRespiratory) +
    (totalReduction.hospital_admissions * costPerHospitalization) +
    (totalReduction.er_visits * costPerER);

  return {
    daily_health_improvements: dailyReduction,
    total_health_improvements: totalReduction,
    healthcare_cost_savings_usd: Math.round(monetaryBenefit),
    lives_saved_estimate: Math.round(aqiReduction * 0.1), // Rough estimate
    quality_adjusted_life_years: Math.round(aqiReduction * 2.5), // QALYs gained
  };
}

/**
 * Assess policy feasibility
 */
function assessFeasibility(
  policies: PolicyConfig[],
  costAnalysis: any,
  improvements: any
): any {
  const feasibilityScores: Record<string, number> = {};
  let overallFeasibility = 0;

  for (const policy of policies) {
    let score = 0.5; // Start at 50%

    // Complexity factor
    const complexity = getImplementationComplexity(policy.policy_type);
    if (complexity === 'low') score += 0.2;
    else if (complexity === 'high') score -= 0.2;

    // Cost-benefit factor
    const costPerAqiPoint = costAnalysis.total_cost_usd / improvements.aqi_reduction;
    if (costPerAqiPoint < 100000) score += 0.2;
    else if (costPerAqiPoint > 500000) score -= 0.2;

    // Political feasibility (simplified)
    if (policy.policy_type === 'construction_halt' || policy.policy_type === 'green_zone') {
      score += 0.1; // Generally more acceptable
    }

    feasibilityScores[policy.policy_type] = Math.max(0, Math.min(1, score));
    overallFeasibility += feasibilityScores[policy.policy_type];
  }

  overallFeasibility = overallFeasibility / policies.length;

  return {
    overall_feasibility_score: Math.round(overallFeasibility * 100) / 100,
    policy_feasibility_scores: feasibilityScores,
    implementation_timeline_months: Math.round(policies.length * 6), // 6 months per policy
    key_challenges: identifyKeyChallenges(policies),
    success_factors: identifySuccessFactors(policies, improvements),
  };
}

/**
 * Identify key implementation challenges
 */
function identifyKeyChallenges(policies: PolicyConfig[]): string[] {
  const challenges: string[] = [];

  if (policies.some(p => p.policy_type === 'industrial_reduction')) {
    challenges.push('Resistance from industrial sector - requires strong regulatory enforcement');
  }

  if (policies.some(p => p.policy_type === 'traffic_restriction')) {
    challenges.push('Public acceptance and alternative transportation infrastructure needed');
  }

  if (policies.some(p => p.policy_type === 'emission_cap')) {
    challenges.push('Monitoring and compliance verification systems required');
  }

  if (policies.length > 3) {
    challenges.push('Coordinating multiple simultaneous policy implementations');
  }

  return challenges;
}

/**
 * Identify success factors
 */
function identifySuccessFactors(policies: PolicyConfig[], improvements: any): string[] {
  const factors: string[] = [];

  if (improvements.aqi_reduction_percentage > 20) {
    factors.push('Significant projected AQI improvements will build public support');
  }

  factors.push('Phased implementation can reduce disruption and build momentum');
  factors.push('Real-time monitoring will demonstrate policy effectiveness');

  if (policies.some(p => p.policy_type === 'green_zone')) {
    factors.push('Co-benefits like improved urban aesthetics enhance public acceptance');
  }

  return factors;
}

/**
 * Generate policy recommendations
 */
function generatePolicyRecommendations(
  policies: PolicyConfig[],
  improvements: any,
  costAnalysis: any,
  feasibility: any
): string[] {
  const recommendations: string[] = [];

  if (feasibility.overall_feasibility_score < 0.5) {
    recommendations.push(
      '⚠️ Overall feasibility is low - Consider phased implementation or reducing policy stringency'
    );
  }

  if (improvements.aqi_reduction_percentage > 30) {
    recommendations.push(
      '✅ Excellent projected improvements - Strong case for policy adoption'
    );
  }

  const costPerAqiPoint = costAnalysis.total_cost_usd / improvements.aqi_reduction;
  if (costPerAqiPoint > 300000) {
    recommendations.push(
      '💰 High cost per AQI point - Consider focusing on most cost-effective policies'
    );
  }

  recommendations.push(
    '📊 Establish baseline monitoring before implementation to measure actual impact'
  );

  recommendations.push(
    '👥 Engage stakeholders early - public consultation improves acceptance and outcomes'
  );

  return recommendations;
}

/**
 * Store simulation in database
 */
async function storeSimulation(data: any): Promise<void> {
  const query = `
    INSERT INTO aqi_platform.policy_simulations (
      id, simulation_id, simulation_name, station_id, region,
      baseline_period_start, baseline_period_end, simulation_duration_days,
      policies, baseline_metrics, simulated_metrics, results, assumptions, created_at
    ) VALUES (
      gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW()
    )
  `;

  await pool.query(query, [
    data.simulation_id,
    data.simulation_name,
    data.station_id,
    data.region,
    data.baseline_period_start,
    data.baseline_period_end,
    data.simulation_duration_days,
    JSON.stringify(data.policies),
    JSON.stringify(data.baseline_metrics),
    JSON.stringify(data.simulated_metrics),
    JSON.stringify(data.results),
    JSON.stringify(data.assumptions),
  ]);
}
