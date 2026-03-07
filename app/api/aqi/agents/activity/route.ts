import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/aqi/agents/activity
 * Monitor 24/7 AI agent activities
 *
 * Tracks 8 agent types:
 * - Ingestion Agent: Sensor & feed normalization
 * - Correlation Agent: Geo-temporal root cause discovery
 * - Classification Agent: Pollution pointer tagging (Traffic/Industrial/Construction)
 * - Forecasting Agent: Predict upcoming AQI spikes
 * - Mitigation Agent: Trigger automated actions & APIs
 * - Compliance Agent: Track violations and enforcement
 * - Learning Agent: Continuous model improvement
 * - Alert Agent: 24×7 notifications
 *
 * Query params:
 * - agent_type: Filter by specific agent (optional)
 * - status: Filter by status ('running', 'completed', 'failed')
 * - hours_back: Time window in hours (default 24)
 * - limit: Max results (default 100)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentType = searchParams.get('agent_type');
    const status = searchParams.get('status');
    const hoursBack = parseInt(searchParams.get('hours_back') || '24', 10);
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    const monkdbUrl = process.env.MONKDB_URL || 'http://localhost:4200';

    // Build WHERE clause based on filters
    const whereConditions = [
      `started_at >= NOW() - INTERVAL '${hoursBack} hours'`
    ];

    if (agentType) {
      whereConditions.push(`agent_type = '${agentType}'`);
    }

    if (status) {
      whereConditions.push(`status = '${status}'`);
    }

    const whereClause = whereConditions.join(' AND ');

    // Query for agent activities
    const query = `
      SELECT
        id,
        agent_type,
        agent_name,
        execution_id,
        status,
        started_at,
        completed_at,
        duration_ms,
        input_data,
        output_data,
        error_message,
        metrics
      FROM aqi_platform.agent_activities
      WHERE ${whereClause}
      ORDER BY started_at DESC
      LIMIT ${limit}
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
      if (errorMsg.includes('RelationUnknown') || errorMsg.includes('agent_activities')) {
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
        activities: [],
        summary: {
          total_count: 0,
          by_agent: {},
          by_status: {},
        },
        message: 'No agent activities found in the specified time window',
      });
    }

    // Transform rows to objects
    const activities = data.rows.map((row: any[]) => ({
      id: row[0],
      agent_type: row[1],
      agent_name: row[2],
      execution_id: row[3],
      status: row[4],
      started_at: row[5],
      completed_at: row[6],
      duration_ms: row[7],
      input_data: row[8],
      output_data: row[9],
      error_message: row[10],
      metrics: row[11],
    }));

    // Calculate summary statistics
    const summary = {
      total_count: activities.length,
      by_agent: {} as Record<string, number>,
      by_status: {} as Record<string, number>,
      avg_duration_ms: 0,
      success_rate: 0,
    };

    let totalDuration = 0;
    let successCount = 0;

    activities.forEach((activity: any) => {
      // Count by agent type
      summary.by_agent[activity.agent_type] = (summary.by_agent[activity.agent_type] || 0) + 1;

      // Count by status
      summary.by_status[activity.status] = (summary.by_status[activity.status] || 0) + 1;

      // Calculate duration
      if (activity.duration_ms) {
        totalDuration += activity.duration_ms;
      }

      // Count successes
      if (activity.status === 'completed') {
        successCount++;
      }
    });

    summary.avg_duration_ms = Math.round(totalDuration / activities.length);
    summary.success_rate = Math.round((successCount / activities.length) * 100);

    return NextResponse.json({
      success: true,
      activities,
      summary,
      filters: {
        agent_type: agentType || 'all',
        status: status || 'all',
        hours_back: hoursBack,
        limit,
      },
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch agent activities',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/aqi/agents/activity
 * Record a new agent activity execution
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      agent_type,
      agent_name,
      execution_id,
      status,
      started_at,
      completed_at,
      duration_ms,
      input_data,
      output_data,
      error_message,
      metrics,
    } = body;

    // Validate required fields
    if (!agent_type || !agent_name || !execution_id || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: agent_type, agent_name, execution_id, status' },
        { status: 400 }
      );
    }

    const monkdbUrl = process.env.MONKDB_URL || 'http://localhost:4200';

    const query = `
      INSERT INTO aqi_platform.agent_activities (
        agent_type,
        agent_name,
        execution_id,
        status,
        started_at,
        completed_at,
        duration_ms,
        input_data,
        output_data,
        error_message,
        metrics
      ) VALUES (
        '${agent_type}',
        '${agent_name}',
        '${execution_id}',
        '${status}',
        ${started_at ? `'${started_at}'` : 'CURRENT_TIMESTAMP'},
        ${completed_at ? `'${completed_at}'` : 'NULL'},
        ${duration_ms || 'NULL'},
        ${input_data ? `'${JSON.stringify(input_data)}'` : 'NULL'},
        ${output_data ? `'${JSON.stringify(output_data)}'` : 'NULL'},
        ${error_message ? `'${error_message.replace(/'/g, "''")}'` : 'NULL'},
        ${metrics ? `'${JSON.stringify(metrics)}'` : 'NULL'}
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
      message: 'Agent activity recorded successfully',
      activity_id: data.rows[0][0],
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to record agent activity',
      },
      { status: 500 }
    );
  }
}
