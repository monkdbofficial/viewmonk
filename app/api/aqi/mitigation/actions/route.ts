import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/aqi/mitigation/actions
 * Track automated mitigation actions triggered by MonkAgents
 *
 * Action types include:
 * - traffic_rerouting: Adaptive traffic signal changes
 * - route_diversion: API calls to divert traffic
 * - bus_optimization: Bus stop dwell-time adjustments
 * - enforcement_alert: Alerts to enforcement teams
 * - anpr_identification: ANPR-based high-polluting vehicle detection
 * - citizen_alert: SMS/App alerts to vehicle owners
 * - industrial_throttle: Industrial emissions throttling
 * - construction_stopwork: Dust control enforcement
 * - public_advisory: Health advisories to citizens
 *
 * Query params:
 * - station_id: Filter by station (optional)
 * - action_type: Filter by action type (optional)
 * - status: Filter by status ('initiated', 'executed', 'completed', 'failed')
 * - hours_back: Time window (default 24)
 * - effectiveness_min: Minimum effectiveness score (0-1)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stationId = searchParams.get('station_id');
    const actionType = searchParams.get('action_type');
    const status = searchParams.get('status');
    const hoursBack = parseInt(searchParams.get('hours_back') || '24', 10);
    const effectivenessMin = parseFloat(searchParams.get('effectiveness_min') || '0');

    const monkdbUrl = process.env.MONKDB_URL || 'http://localhost:4200';

    // Build WHERE clause
    const whereConditions = [
      `triggered_at >= NOW() - INTERVAL '${hoursBack} hours'`
    ];

    if (stationId) {
      whereConditions.push(`station_id = '${stationId}'`);
    }

    if (actionType) {
      whereConditions.push(`action_type = '${actionType}'`);
    }

    if (status) {
      whereConditions.push(`status = '${status}'`);
    }

    if (effectivenessMin > 0) {
      whereConditions.push(`effectiveness_score >= ${effectivenessMin}`);
    }

    const whereClause = whereConditions.join(' AND ');

    const query = `
      SELECT
        id,
        action_id,
        station_id,
        trigger_event_id,
        action_type,
        action_details,
        target_system,
        api_endpoint,
        status,
        triggered_at,
        executed_at,
        effectiveness_score,
        aqi_before,
        aqi_after,
        outcome_notes,
        agent_id
      FROM aqi_platform.mitigation_actions
      WHERE ${whereClause}
      ORDER BY triggered_at DESC
      LIMIT 100
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
      if (errorMsg.includes('RelationUnknown') || errorMsg.includes('mitigation_actions')) {
        return NextResponse.json({
          success: false,
          setup_required: true,
          error: 'Enterprise tables not initialized',
          message: 'Please run the database setup script: schema/setup-all.sh',
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
        actions: [],
        summary: {
          total_count: 0,
          by_type: {},
          by_status: {},
          avg_effectiveness: 0,
          total_aqi_reduction: 0,
        },
        message: 'No mitigation actions found',
      });
    }

    // Transform rows
    const actions = data.rows.map((row: any[]) => ({
      id: row[0],
      action_id: row[1],
      station_id: row[2],
      trigger_event_id: row[3],
      action_type: row[4],
      action_details: row[5],
      target_system: row[6],
      api_endpoint: row[7],
      status: row[8],
      triggered_at: row[9],
      executed_at: row[10],
      effectiveness_score: row[11],
      aqi_before: row[12],
      aqi_after: row[13],
      aqi_reduction: row[12] && row[13] ? row[12] - row[13] : null,
      outcome_notes: row[14],
      agent_id: row[15],
    }));

    // Calculate summary
    const summary = {
      total_count: actions.length,
      by_type: {} as Record<string, number>,
      by_status: {} as Record<string, number>,
      avg_effectiveness: 0,
      total_aqi_reduction: 0,
      successful_count: 0,
    };

    let effectivenessSum = 0;
    let effectivenessCount = 0;
    let aqiReductionSum = 0;

    actions.forEach((action: any) => {
      summary.by_type[action.action_type] = (summary.by_type[action.action_type] || 0) + 1;
      summary.by_status[action.status] = (summary.by_status[action.status] || 0) + 1;

      if (action.effectiveness_score !== null) {
        effectivenessSum += action.effectiveness_score;
        effectivenessCount++;
      }

      if (action.aqi_reduction !== null && action.aqi_reduction > 0) {
        aqiReductionSum += action.aqi_reduction;
      }

      if (action.status === 'completed') {
        summary.successful_count++;
      }
    });

    summary.avg_effectiveness = effectivenessCount > 0
      ? Math.round((effectivenessSum / effectivenessCount) * 100) / 100
      : 0;
    summary.total_aqi_reduction = Math.round(aqiReductionSum);

    return NextResponse.json({
      success: true,
      actions,
      summary,
      filters: {
        station_id: stationId || 'all',
        action_type: actionType || 'all',
        status: status || 'all',
        hours_back: hoursBack,
      },
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch mitigation actions',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/aqi/mitigation/actions
 * Record a new mitigation action
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      action_id,
      station_id,
      trigger_event_id,
      action_type,
      action_details,
      target_system,
      api_endpoint,
      request_payload,
      response_payload,
      status,
      agent_id,
    } = body;

    // Validate required fields
    if (!action_id || !station_id || !action_type || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: action_id, station_id, action_type, status' },
        { status: 400 }
      );
    }

    const monkdbUrl = process.env.MONKDB_URL || 'http://localhost:4200';

    const query = `
      INSERT INTO aqi_platform.mitigation_actions (
        action_id,
        station_id,
        trigger_event_id,
        action_type,
        action_details,
        target_system,
        api_endpoint,
        request_payload,
        response_payload,
        status,
        agent_id,
        triggered_at
      ) VALUES (
        '${action_id}',
        '${station_id}',
        ${trigger_event_id || 'NULL'},
        '${action_type}',
        ${action_details ? `'${JSON.stringify(action_details)}'` : 'NULL'},
        ${target_system ? `'${target_system}'` : 'NULL'},
        ${api_endpoint ? `'${api_endpoint}'` : 'NULL'},
        ${request_payload ? `'${JSON.stringify(request_payload)}'` : 'NULL'},
        ${response_payload ? `'${JSON.stringify(response_payload)}'` : 'NULL'},
        '${status}',
        ${agent_id ? `'${agent_id}'` : 'NULL'},
        CURRENT_TIMESTAMP
      )
      RETURNING id
    `;

    const response = await fetch(`${monkdbUrl}/_sql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stmt: query }),
    });

    if (!response.ok) {
      throw new Error(`MonkDB insert failed: ${response.statusText}`);
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      message: 'Mitigation action recorded successfully',
      mitigation_id: data.rows[0][0],
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to record mitigation action',
      },
      { status: 500 }
    );
  }
}
