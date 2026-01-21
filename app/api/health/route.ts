import { NextResponse } from 'next/server';

// Simple health check endpoint to verify API routes are working
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'API routes are working!',
    timestamp: new Date().toISOString(),
    routes: {
      sql: '/api/sql',
      blob: '/api/blob/[table]/[sha1]',
    }
  });
}
