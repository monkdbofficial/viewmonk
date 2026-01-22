import { NextRequest, NextResponse } from 'next/server';
import {
  isValidHostname,
  isValidPort,
  apiRateLimiter,
  sanitizeErrorMessage
} from '@/app/lib/validation';

// Force route to be dynamic (not cached)
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Proxy for SQL queries to avoid CORS issues
export async function POST(request: NextRequest) {
  try {
    console.log('[SQL Proxy] Received POST request');

    // Get MonkDB connection info from headers
    const host = request.headers.get('x-monkdb-host') || 'localhost';
    const portStr = request.headers.get('x-monkdb-port') || '4200';

    // SECURITY: Validate hostname to prevent SSRF attacks
    if (!isValidHostname(host)) {
      console.error('[SQL Proxy] Invalid hostname:', host);
      return NextResponse.json(
        { error: 'Invalid hostname.' },
        { status: 400 }
      );
    }

    // SECURITY: Validate port number
    if (!isValidPort(portStr)) {
      console.error('[SQL Proxy] Invalid port:', portStr);
      return NextResponse.json(
        { error: 'Invalid port number.' },
        { status: 400 }
      );
    }

    // SECURITY: Rate limiting (100 requests per minute per IP)
    const clientId = request.headers.get('x-forwarded-for') ||
                     request.headers.get('x-real-ip') ||
                     'unknown';
    if (!apiRateLimiter.check(`sql:${clientId}`)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    console.log('[SQL Proxy] Headers (validated):', {
      host,
      port: portStr,
      contentType: request.headers.get('content-type'),
    });

    // Get SQL statement from body
    let body;
    try {
      body = await request.json();
      console.log('[SQL Proxy] Request body:', body);
    } catch (jsonError: any) {
      console.error('[SQL Proxy] Failed to parse JSON:', jsonError.message);
      return NextResponse.json(
        { error: 'Invalid JSON in request body', details: jsonError.message },
        { status: 400 }
      );
    }

    // Forward to MonkDB
    const monkdbUrl = `http://${host}:${portStr}/_sql`;
    console.log('[SQL Proxy] Forwarding to:', monkdbUrl);

    const response = await fetch(monkdbUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    console.log('[SQL Proxy] MonkDB response status:', response.status);
    const data = await response.json();
    console.log('[SQL Proxy] MonkDB response data:', data);

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || 'Query failed' },
        { status: response.status }
      );
    }

    const jsonResponse = NextResponse.json(data);
    // Prevent browser caching
    jsonResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    jsonResponse.headers.set('Pragma', 'no-cache');
    jsonResponse.headers.set('Expires', '0');
    return jsonResponse;
  } catch (error: any) {
    console.error('[SQL Proxy] Query error:', error);
    return NextResponse.json(
      { error: sanitizeErrorMessage(error) },
      { status: 500 }
    );
  }
}

// Add OPTIONS handler for CORS preflight
export async function OPTIONS(request: NextRequest) {
  console.log('[SQL Proxy] Received OPTIONS request (CORS preflight)');

  // SECURITY: Use environment variable for allowed origins instead of wildcard
  // In production, this should be a whitelist of specific domains
  const allowedOrigin = process.env.NEXT_PUBLIC_ALLOWED_ORIGIN ||
                        process.env.NEXTAUTH_URL ||
                        request.headers.get('origin') ||
                        '*';

  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-monkdb-host, x-monkdb-port',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}

// Add GET handler to help with debugging
export async function GET(request: NextRequest) {
  console.log('[SQL Proxy] Received GET request (should be POST)');
  return NextResponse.json({
    error: 'This endpoint only accepts POST requests',
    usage: 'POST /api/sql with body: { stmt: "SELECT ..." }',
    headers: {
      'x-monkdb-host': 'required',
      'x-monkdb-port': 'required',
    },
  }, { status: 405 });
}
