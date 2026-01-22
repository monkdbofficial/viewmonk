import { NextRequest, NextResponse } from 'next/server';
import {
  isValidSQLIdentifier,
  isValidSHA1,
  isValidHostname,
  isValidPort,
  apiRateLimiter,
  sanitizeErrorMessage
} from '@/app/lib/validation';

// Force route to be dynamic (not cached)
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Proxy for blob uploads to avoid CORS issues
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ table: string; sha1: string }> }
) {
  try {
    const { table, sha1 } = await params;

    // SECURITY: Validate table name to prevent SQL injection and path traversal
    if (!isValidSQLIdentifier(table)) {
      console.error('[Blob Proxy] Invalid table name:', table);
      return NextResponse.json(
        { error: 'Invalid table name. Only alphanumeric characters, underscores, and dots are allowed.' },
        { status: 400 }
      );
    }

    // SECURITY: Validate SHA1 hash format
    if (!isValidSHA1(sha1)) {
      console.error('[Blob Proxy] Invalid SHA1 hash:', sha1);
      return NextResponse.json(
        { error: 'Invalid SHA1 hash format. Must be 40 hexadecimal characters.' },
        { status: 400 }
      );
    }

    // Get MonkDB connection info from headers
    const host = request.headers.get('x-monkdb-host') || 'localhost';
    const portStr = request.headers.get('x-monkdb-port') || '4200';
    const contentType = request.headers.get('content-type') || 'application/octet-stream';

    // SECURITY: Validate hostname to prevent SSRF attacks
    if (!isValidHostname(host)) {
      console.error('[Blob Proxy] Invalid hostname:', host);
      return NextResponse.json(
        { error: 'Invalid hostname.' },
        { status: 400 }
      );
    }

    // SECURITY: Validate port number
    if (!isValidPort(portStr)) {
      console.error('[Blob Proxy] Invalid port:', portStr);
      return NextResponse.json(
        { error: 'Invalid port number.' },
        { status: 400 }
      );
    }

    // SECURITY: Rate limiting
    const clientId = request.headers.get('x-forwarded-for') ||
                     request.headers.get('x-real-ip') ||
                     'unknown';
    if (!apiRateLimiter.check(`blob-put:${clientId}`)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    console.log('[Blob Proxy] PUT request (validated):', { table, sha1, host, port: portStr });

    // Read request body
    const body = await request.arrayBuffer();
    console.log('[Blob Proxy] Body size:', body.byteLength, 'bytes');

    // Forward to MonkDB
    const monkdbUrl = `http://${host}:${portStr}/_blobs/${table}/${sha1}`;
    console.log('[Blob Proxy] Forwarding to:', monkdbUrl);

    const response = await fetch(monkdbUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
      },
      body: body,
    });

    console.log('[Blob Proxy] MonkDB response status:', response.status);

    // 201 = Created (new blob), 409 = Conflict (blob already exists)
    // Both are success cases
    if (response.status === 201 || response.status === 409) {
      const jsonResponse = NextResponse.json({
        success: true,
        status: response.status,
        message: response.status === 409 ? 'Blob already exists' : 'Blob uploaded successfully'
      });
      // Prevent browser caching
      jsonResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      jsonResponse.headers.set('Pragma', 'no-cache');
      jsonResponse.headers.set('Expires', '0');
      return jsonResponse;
    }

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { error: `Upload failed: ${response.status} ${text}` },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true, status: response.status });
  } catch (error: any) {
    console.error('[Blob Proxy] Upload error:', error);
    return NextResponse.json(
      { error: sanitizeErrorMessage(error) },
      { status: 500 }
    );
  }
}

// Proxy for blob downloads
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ table: string; sha1: string }> }
) {
  try {
    const { table, sha1 } = await params;

    // SECURITY: Validate table name
    if (!isValidSQLIdentifier(table)) {
      console.error('[Blob Proxy] Invalid table name:', table);
      return NextResponse.json(
        { error: 'Invalid table name.' },
        { status: 400 }
      );
    }

    // SECURITY: Validate SHA1 hash
    if (!isValidSHA1(sha1)) {
      console.error('[Blob Proxy] Invalid SHA1 hash:', sha1);
      return NextResponse.json(
        { error: 'Invalid SHA1 hash format.' },
        { status: 400 }
      );
    }

    // Get connection info from headers (for download), query params (for img tags), or use defaults
    const host = request.headers.get('x-monkdb-host') ||
                 request.nextUrl.searchParams.get('host') ||
                 'localhost';
    const portStr = request.headers.get('x-monkdb-port') ||
                    request.nextUrl.searchParams.get('port') ||
                    '4200';

    // SECURITY: Validate hostname and port
    if (!isValidHostname(host)) {
      return NextResponse.json({ error: 'Invalid hostname.' }, { status: 400 });
    }
    if (!isValidPort(portStr)) {
      return NextResponse.json({ error: 'Invalid port.' }, { status: 400 });
    }

    // SECURITY: Rate limiting
    const clientId = request.headers.get('x-forwarded-for') ||
                     request.headers.get('x-real-ip') ||
                     'unknown';
    if (!apiRateLimiter.check(`blob-get:${clientId}`)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded.' },
        { status: 429 }
      );
    }

    console.log('[Blob Proxy] GET request (validated):', { table, sha1, host, port: portStr });

    // Forward to MonkDB
    const monkdbUrl = `http://${host}:${portStr}/_blobs/${table}/${sha1}`;
    const response = await fetch(monkdbUrl);

    if (!response.ok) {
      return NextResponse.json(
        { error: `Download failed: ${response.status}` },
        { status: response.status }
      );
    }

    // Return blob data with proper content type
    const blob = await response.blob();
    const contentType = response.headers.get('content-type') || 'application/octet-stream';

    // Use inline for images/videos (display in browser), attachment for others (download)
    const disposition = contentType.startsWith('image/') || contentType.startsWith('video/')
      ? 'inline'
      : `attachment; filename="${sha1}"`;

    return new NextResponse(blob, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': disposition,
        'Cache-Control': 'public, max-age=31536000, immutable', // Cache images for 1 year (blobs are immutable by SHA)
      },
    });
  } catch (error: any) {
    console.error('[Blob Proxy] Download error:', error);
    return NextResponse.json(
      { error: sanitizeErrorMessage(error) },
      { status: 500 }
    );
  }
}

// Proxy for blob deletion
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ table: string; sha1: string }> }
) {
  try {
    const { table, sha1 } = await params;

    // SECURITY: Validate table name
    if (!isValidSQLIdentifier(table)) {
      console.error('[Blob Proxy] Invalid table name:', table);
      return NextResponse.json(
        { error: 'Invalid table name.' },
        { status: 400 }
      );
    }

    // SECURITY: Validate SHA1 hash
    if (!isValidSHA1(sha1)) {
      console.error('[Blob Proxy] Invalid SHA1 hash:', sha1);
      return NextResponse.json(
        { error: 'Invalid SHA1 hash format.' },
        { status: 400 }
      );
    }

    const host = request.headers.get('x-monkdb-host') || 'localhost';
    const portStr = request.headers.get('x-monkdb-port') || '4200';

    // SECURITY: Validate hostname and port
    if (!isValidHostname(host)) {
      return NextResponse.json({ error: 'Invalid hostname.' }, { status: 400 });
    }
    if (!isValidPort(portStr)) {
      return NextResponse.json({ error: 'Invalid port.' }, { status: 400 });
    }

    // SECURITY: Rate limiting
    const clientId = request.headers.get('x-forwarded-for') ||
                     request.headers.get('x-real-ip') ||
                     'unknown';
    if (!apiRateLimiter.check(`blob-delete:${clientId}`)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded.' },
        { status: 429 }
      );
    }

    // Forward to MonkDB
    const monkdbUrl = `http://${host}:${portStr}/_blobs/${table}/${sha1}`;
    const response = await fetch(monkdbUrl, {
      method: 'DELETE',
    });

    // Don't fail on 404 (already deleted)
    if (!response.ok && response.status !== 404) {
      return NextResponse.json(
        { error: `Delete failed: ${response.status}` },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true, status: response.status });
  } catch (error: any) {
    console.error('[Blob Proxy] Delete error:', error);
    return NextResponse.json(
      { error: sanitizeErrorMessage(error) },
      { status: 500 }
    );
  }
}
