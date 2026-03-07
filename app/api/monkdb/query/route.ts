import { NextRequest, NextResponse } from 'next/server';

// Note: This API route is not used in Tauri builds (uses Rust backend instead)
// Commented out for static export compatibility
// export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { host, port, protocol = 'http', username, password, stmt, args = [] } = body;

    // Validate required fields
    if (!host || !port || !stmt) {
      return NextResponse.json(
        { error: { message: 'Missing required fields: host, port, stmt' } },
        { status: 400 }
      );
    }

    // Build the MonkDB URL
    const monkdbUrl = `${protocol}://${host}:${port}/_sql`;

    // Prepare headers
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Add basic auth if credentials provided
    if (username && password) {
      const credentials = Buffer.from(`${username}:${password}`).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
    }

    // Forward the request to MonkDB
    const response = await fetch(monkdbUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ stmt, args }),
    });

    const data = await response.json();

    // Return the MonkDB response
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          message: error instanceof Error ? error.message : 'Internal server error',
          code: 500,
        },
      },
      { status: 500 }
    );
  }
}
