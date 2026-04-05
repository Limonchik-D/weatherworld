import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // Prefer real client IP from proxy headers
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0].trim() || realIp || '';

  // Skip loopback — ip-api.com returns bad data for 127.0.0.1 / ::1
  const isLoopback = !ip || ip === '::1' || ip === '127.0.0.1' || ip.startsWith('::ffff:127.');

  try {
    const apiUrl = isLoopback
      ? 'https://ip-api.com/json?fields=status,lat,lon,city,country,regionName'
      : `https://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,lat,lon,city,country,regionName`;

    const res = await fetch(apiUrl, { next: { revalidate: 0 } });
    if (!res.ok) throw new Error(`ip-api status ${res.status}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ status: 'fail' }, { status: 502 });
  }
}
