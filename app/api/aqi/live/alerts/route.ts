import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// ALERT MANAGEMENT API
// ============================================================================
// Purpose: Active alert management and real-time notifications
// CRUD operations on alerts table
// ============================================================================

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/monkdb',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

/**
 * GET /api/aqi/live/alerts
 *
 * Query active alerts
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'active';
    const severity = searchParams.get('severity');
    const stationId = searchParams.get('station_id');
    const limit = parseInt(searchParams.get('limit') || '50');

    let whereClause = 'a.status = $1';
    const queryParams: any[] = [status];
    let paramIndex = 2;

    if (severity) {
      queryParams.push(severity);
      whereClause += ` AND a.severity = $${paramIndex}`;
      paramIndex++;
    }

    if (stationId) {
      queryParams.push(stationId);
      whereClause += ` AND a.station_id = $${paramIndex}`;
      paramIndex++;
    }

    queryParams.push(limit);

    const query = `
      SELECT
        a.*,
        s.station_name,
        s.city,
        s.state
      FROM aqi_platform.alerts a
      LEFT JOIN aqi_platform.stations s ON a.station_id = s.station_id
      WHERE ${whereClause}
      ORDER BY a.severity DESC, a.triggered_at DESC
      LIMIT $${paramIndex}
    `;

    const result = await pool.query(query, queryParams);

    return NextResponse.json({
      success: true,
      alerts: result.rows,
      count: result.rows.length,
    });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch alerts', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/aqi/live/alerts
 *
 * Create new alert
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const alertId = uuidv4();
    const query = `
      INSERT INTO aqi_platform.alerts (
        id, alert_id, alert_type, severity, station_id, location,
        triggered_at, message, details, affected_population,
        affected_area_sqkm, current_aqi, pollutants, recommended_actions,
        status, created_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'active', NOW()
      )
      RETURNING *
    `;

    const result = await pool.query(query, [
      alertId,
      body.alert_type,
      body.severity,
      body.station_id,
      body.location,
      body.triggered_at || new Date(),
      body.message,
      JSON.stringify(body.details || {}),
      body.affected_population,
      body.affected_area_sqkm,
      body.current_aqi,
      JSON.stringify(body.pollutants || {}),
      JSON.stringify(body.recommended_actions || []),
    ]);

    return NextResponse.json({
      success: true,
      alert: result.rows[0],
    });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Failed to create alert', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/aqi/live/alerts/:alert_id
 *
 * Update alert status (acknowledge, resolve, dismiss)
 */
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const alertId = searchParams.get('alert_id');
    const body = await request.json();

    if (!alertId) {
      return NextResponse.json(
        { success: false, error: 'alert_id is required' },
        { status: 400 }
      );
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (body.status) {
      updates.push(`status = $${paramIndex}`);
      values.push(body.status);
      paramIndex++;

      if (body.status === 'acknowledged') {
        updates.push(`acknowledged_at = NOW(), acknowledged_by = $${paramIndex}`);
        values.push(body.acknowledged_by || 'system');
        paramIndex++;
      } else if (body.status === 'resolved') {
        updates.push(`resolved_at = NOW(), resolution_notes = $${paramIndex}`);
        values.push(body.resolution_notes || '');
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid updates provided' },
        { status: 400 }
      );
    }

    values.push(alertId);

    const query = `
      UPDATE aqi_platform.alerts
      SET ${updates.join(', ')}
      WHERE alert_id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Alert not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      alert: result.rows[0],
    });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Failed to update alert', message: error.message },
      { status: 500 }
    );
  }
}
