import { type NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, rateLimitResponse } from '@/lib/rateLimit';

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
    || req.headers.get('x-real-ip')
    || 'unknown';
  // Search is lightweight; allow more requests than weather endpoint
  const rl = checkRateLimit(`search_${ip}`, 60);
  if (!rl.ok) return rateLimitResponse(rl.resetIn);

  const WK = process.env.WEATHERAPI_KEY;
  const q = req.nextUrl.searchParams.get('q');
  if (!q || q.length < 2) {
    return NextResponse.json([], { status: 200 });
  }
  if (!WK) return NextResponse.json([], { status: 200 });
  try {
    const res = await fetch(
      `https://api.weatherapi.com/v1/search.json?key=${WK}&q=${encodeURIComponent(q)}`,
      { next: { revalidate: 30 } },
    );
    if (!res.ok) return NextResponse.json([], { status: 200 });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
