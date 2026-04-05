import { type NextRequest, NextResponse } from 'next/server';

/**
 * Proxy Open-Meteo API to get enriched hourly data:
 * UV index, dew point, snow depth, soil moisture, solar radiation
 * No API key required.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');

  if (!lat || !lon) {
    return NextResponse.json({ error: 'lat and lon required' }, { status: 400 });
  }

  const latN = parseFloat(lat);
  const lonN = parseFloat(lon);
  if (isNaN(latN) || isNaN(lonN) || latN < -90 || latN > 90 || lonN < -180 || lonN > 180) {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
  }

  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', lat);
  url.searchParams.set('longitude', lon);
  url.searchParams.set('hourly', [
    'uv_index',
    'dew_point_2m',
    'snow_depth',
    'shortwave_radiation',
    'precipitation_probability',
    'freezing_level_height',
    'soil_moisture_0_to_1cm',
  ].join(','));
  url.searchParams.set('daily', [
    'uv_index_max',
    'sunrise',
    'sunset',
    'precipitation_sum',
    'snowfall_sum',
    'wind_speed_10m_max',
    'wind_gusts_10m_max',
  ].join(','));
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('forecast_days', '7');

  try {
    const res = await fetch(url.toString(), { next: { revalidate: 1800 } }); // 30 min cache
    if (!res.ok) {
      return NextResponse.json({ error: 'Open-Meteo error' }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, max-age=1800' },
    });
  } catch {
    return NextResponse.json({ error: 'Open-Meteo unavailable' }, { status: 502 });
  }
}
