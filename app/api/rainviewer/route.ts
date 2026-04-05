import { type NextRequest, NextResponse } from 'next/server';

/**
 * Proxy RainViewer API calls to avoid CORS issues
 * GET /api/rainviewer — returns frame timestamps list
 * GET /api/rainviewer/tile?path=...&z=...&x=...&y=... — proxies tile
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const action = searchParams.get('action');

  // Return available frames from RainViewer nowcast API
  if (action === 'frames' || !action) {
    try {
      const res = await fetch('https://api.rainviewer.com/public/weather-maps.json', {
        next: { revalidate: 300 }, // cache 5 min
      });
      if (!res.ok) return new NextResponse('RainViewer unavailable', { status: 502 });
      const data = await res.json();
      return NextResponse.json(data, {
        headers: { 'Cache-Control': 'public, max-age=300' },
      });
    } catch {
      return new NextResponse('RainViewer error', { status: 502 });
    }
  }

  // Proxy a tile: /api/rainviewer?action=tile&path=/v2/...&z=...&x=...&y=...
  if (action === 'tile') {
    const path = searchParams.get('path');
    const z = searchParams.get('z');
    const x = searchParams.get('x');
    const y = searchParams.get('y');
    const color = searchParams.get('color') ?? '3';
    const smooth = searchParams.get('smooth') ?? '1';
    const snow = searchParams.get('snow') ?? '1';

    if (!path || !z || !x || !y) {
      return new NextResponse('Missing params', { status: 400 });
    }

    // Validate path to prevent SSRF — must start with /v2/
    if (!path.startsWith('/v2/')) {
      return new NextResponse('Invalid path', { status: 400 });
    }

    const tileUrl = `https://tilecache.rainviewer.com${path}/${z}/${x}/${y}/256/${color}/${smooth}_${snow}.png`;
    try {
      const res = await fetch(tileUrl, { next: { revalidate: 300 } });
      if (!res.ok) return new NextResponse('Tile error', { status: res.status });
      const buf = await res.arrayBuffer();
      return new NextResponse(buf, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=300',
        },
      });
    } catch {
      return new NextResponse('Tile proxy error', { status: 502 });
    }
  }

  return new NextResponse('Unknown action', { status: 400 });
}
