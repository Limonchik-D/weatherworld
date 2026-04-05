import { type NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
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
