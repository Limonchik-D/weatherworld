import { type NextRequest, NextResponse } from 'next/server';

const OK = process.env.OWM_KEY!;

/** Proxy OWM weather map tiles to hide the API key from the client */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const type = searchParams.get('type');
  const z = searchParams.get('z');
  const x = searchParams.get('x');
  const y = searchParams.get('y');

  if (!type || !z || !x || !y) {
    return new NextResponse('Bad request', { status: 400 });
  }

  const url = `https://tile.openweathermap.org/map/${type}/${z}/${x}/${y}.png?appid=${OK}`;
  try {
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return new NextResponse('Tile error', { status: res.status });
    const buf = await res.arrayBuffer();
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch {
    return new NextResponse('Proxy error', { status: 502 });
  }
}
