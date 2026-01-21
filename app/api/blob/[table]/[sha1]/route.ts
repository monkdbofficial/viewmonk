import { NextRequest, NextResponse } from 'next/server';

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
    console.log('[Blob Proxy] PUT request:', { table, sha1 });

    // Get MonkDB connection info from headers
    const host = request.headers.get('x-monkdb-host') || 'localhost';
    const port = request.headers.get('x-monkdb-port') || '4200';
    const contentType = request.headers.get('content-type') || 'application/octet-stream';
    console.log('[Blob Proxy] Headers:', { host, port, contentType });

    // Read request body
    const body = await request.arrayBuffer();
    console.log('[Blob Proxy] Body size:', body.byteLength, 'bytes');

    // Forward to MonkDB
    const monkdbUrl = `http://${host}:${port}/_blobs/${table}/${sha1}`;
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
      { error: error.message || 'Upload failed' },
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

    // Get connection info from headers (for download), query params (for img tags), or use defaults
    const host = request.headers.get('x-monkdb-host') ||
                 request.nextUrl.searchParams.get('host') ||
                 'localhost';
    const port = request.headers.get('x-monkdb-port') ||
                 request.nextUrl.searchParams.get('port') ||
                 '4200';

    console.log('[Blob Proxy] GET request:', { table, sha1, host, port });

    // Forward to MonkDB
    const monkdbUrl = `http://${host}:${port}/_blobs/${table}/${sha1}`;
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
      { error: error.message || 'Download failed' },
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

    const host = request.headers.get('x-monkdb-host') || 'localhost';
    const port = request.headers.get('x-monkdb-port') || '4200';

    // Forward to MonkDB
    const monkdbUrl = `http://${host}:${port}/_blobs/${table}/${sha1}`;
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
      { error: error.message || 'Delete failed' },
      { status: 500 }
    );
  }
}
