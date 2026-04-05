import { type NextRequest, NextResponse } from 'next/server';

const WAQI_TOKEN = process.env.WAQI_TOKEN ?? 'demo';

/**
 * Proxy World Air Quality Index (WAQI) API
 * Free demo token works for basic queries
 * GET /api/waqi?lat=...&lon=...  — nearest station AQI
 * GET /api/waqi?bounds=lat1,lon1,lat2,lon2 — stations in bounding box (for map)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');
  const bounds = searchParams.get('bounds');

  try {
    let url: string;

    if (bounds) {
      // Validate: 4 comma-separated numbers
      const parts = bounds.split(',').map(Number);
      if (parts.length !== 4 || parts.some(isNaN)) {
        return NextResponse.json({ error: 'Invalid bounds' }, { status: 400 });
      }
      url = `https://api.waqi.info/map/bounds/?token=${WAQI_TOKEN}&latlng=${bounds}`;
    } else if (lat && lon) {
      const latN = parseFloat(lat);
      const lonN = parseFloat(lon);
      if (isNaN(latN) || isNaN(lonN) || latN < -90 || latN > 90 || lonN < -180 || lonN > 180) {
        return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
      }
      url = `https://api.waqi.info/feed/geo:${lat};${lon}/?token=${WAQI_TOKEN}`;
    } else {
      return NextResponse.json({ error: 'lat/lon or bounds required' }, { status: 400 });
    }

    const res = await fetch(url, { next: { revalidate: 900 } }); // 15 min cache
    if (!res.ok) return NextResponse.json({ error: 'WAQI error' }, { status: res.status });
    const data = await res.json();

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, max-age=900' },
    });
  } catch {
    return NextResponse.json({ error: 'WAQI unavailable' }, { status: 502 });
  }
}
