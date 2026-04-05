import { type NextRequest, NextResponse } from 'next/server';

/** Unified weather endpoint
 *
 * Query params:
 *   lat, lon   — required, coordinates
 *   type       — forecast | current | history
 *   dt         — ISO date string (required for type=history)
 */
export async function GET(req: NextRequest) {
  const WK = process.env.WEATHERAPI_KEY;
  const OK = process.env.OWM_KEY;

  if (!WK || !OK) {
    return NextResponse.json({ error: 'Missing WEATHERAPI_KEY or OWM_KEY' }, { status: 500 });
  }

  const { searchParams } = req.nextUrl;
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');
  const type = searchParams.get('type') ?? 'forecast';
  const dt = searchParams.get('dt');

  if (!lat || !lon) {
    return NextResponse.json({ error: 'lat and lon are required' }, { status: 400 });
  }

  const q = `${lat},${lon}`;

  try {
    if (type === 'forecast') {
      // Fetch WeatherAPI forecast + OWM current & 5-day in parallel
      const [wRes, owmCurrRes, owmFcRes] = await Promise.allSettled([
        fetch(
          `https://api.weatherapi.com/v1/forecast.json?key=${WK}&q=${q}&days=7&aqi=yes&alerts=yes&lang=ru`,
          { next: { revalidate: 600 } },
        ),
        fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OK}&units=metric&lang=ru`,
          { next: { revalidate: 600 } },
        ),
        fetch(
          `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${OK}&units=metric&lang=ru`,
          { next: { revalidate: 600 } },
        ),
      ]);

      const w = wRes.status === 'fulfilled' && wRes.value.ok ? await wRes.value.json() : null;
      const owmCurr =
        owmCurrRes.status === 'fulfilled' && owmCurrRes.value.ok
          ? await owmCurrRes.value.json()
          : null;
      const owmFcRaw =
        owmFcRes.status === 'fulfilled' && owmFcRes.value.ok
          ? await owmFcRes.value.json()
          : null;

      if (!w && !owmCurr) {
        return NextResponse.json({ error: 'Both APIs unavailable' }, { status: 502 });
      }

      // Normalise OWM 2.5 into a shape the client already understands
      let owm: NormalisedOWM | null = null;
      if (owmCurr || owmFcRaw) {
        owm = { current: null, hourly: [], daily: [], alerts: [] };
        if (owmCurr) {
          owm.current = {
            temp: owmCurr.main?.temp,
            feels_like: owmCurr.main?.feels_like,
            humidity: owmCurr.main?.humidity,
            pressure: owmCurr.main?.pressure,
            visibility: owmCurr.visibility,
            clouds: owmCurr.clouds?.all,
            wind_speed: owmCurr.wind?.speed,
            wind_gust: owmCurr.wind?.gust,
            wind_deg: owmCurr.wind?.deg,
            weather: owmCurr.weather,
            sunrise: owmCurr.sys?.sunrise,
            sunset: owmCurr.sys?.sunset,
            uvi: null,
            dew_point: null,
          };
        }
        if (owmFcRaw?.list) {
          owm.hourly = owmFcRaw.list.map((h: OWMHour) => ({
            dt: h.dt,
            temp: h.main?.temp,
            weather: h.weather,
            pop: h.pop ?? 0,
            wind_speed: h.wind?.speed,
            clouds: h.clouds?.all,
          }));

          const dayMap: Record<string, DayAccumulator> = {};
          for (const h of owmFcRaw.list as OWMHour[]) {
            const day = new Date(h.dt * 1000).toISOString().split('T')[0];
            if (!dayMap[day])
              dayMap[day] = { temps: [], pops: [], weather: h.weather, rain: 0 };
            dayMap[day].temps.push(h.main?.temp ?? 0);
            dayMap[day].pops.push(h.pop ?? 0);
            dayMap[day].rain += h.rain?.['3h'] ?? 0;
          }
          owm.daily = Object.entries(dayMap).map(([date, d]) => ({
            dt: new Date(date).getTime() / 1000,
            temp: { max: Math.max(...d.temps), min: Math.min(...d.temps) },
            weather: d.weather,
            pop: Math.max(...d.pops),
            rain: d.rain,
          }));
        }
      }

      return NextResponse.json({ w, owm });
    }

    if (type === 'current') {
      const res = await fetch(
        `https://api.weatherapi.com/v1/current.json?key=${WK}&q=${q}&lang=ru`,
        { next: { revalidate: 120 } },
      );
      if (!res.ok) return NextResponse.json({ error: 'WeatherAPI error' }, { status: res.status });
      return NextResponse.json(await res.json());
    }

    if (type === 'history') {
      if (!dt) return NextResponse.json({ error: 'dt is required for history' }, { status: 400 });
      const res = await fetch(
        `https://api.weatherapi.com/v1/history.json?key=${WK}&q=${q}&dt=${dt}&aqi=no`,
        { next: { revalidate: 86400 } },
      );
      if (!res.ok) return NextResponse.json({ error: 'WeatherAPI history error' }, { status: res.status });
      return NextResponse.json(await res.json());
    }

    return NextResponse.json({ error: 'Unknown type' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/* ─── Local types ─── */
interface NormalisedOWM {
  current: NormOWMCurrent | null;
  hourly: NormOWMHour[];
  daily: NormOWMDay[];
  alerts: unknown[];
}
interface NormOWMCurrent {
  temp: number | undefined;
  feels_like: number | undefined;
  humidity: number | undefined;
  pressure: number | undefined;
  visibility: number | undefined;
  clouds: number | undefined;
  wind_speed: number | undefined;
  wind_gust: number | undefined;
  wind_deg: number | undefined;
  weather: OWMWeather[] | undefined;
  sunrise: number | undefined;
  sunset: number | undefined;
  uvi: null;
  dew_point: null;
}
interface NormOWMHour {
  dt: number;
  temp: number | undefined;
  weather: OWMWeather[] | undefined;
  pop: number;
  wind_speed: number | undefined;
  clouds: number | undefined;
}
interface NormOWMDay {
  dt: number;
  temp: { max: number; min: number };
  weather: OWMWeather[] | undefined;
  pop: number;
  rain: number;
}
interface OWMWeather { id: number; main: string; description: string; icon: string }
interface OWMHour {
  dt: number;
  main?: { temp: number };
  weather: OWMWeather[];
  pop?: number;
  wind?: { speed: number };
  clouds?: { all: number };
  rain?: { '3h': number };
}
interface DayAccumulator {
  temps: number[];
  pops: number[];
  weather: OWMWeather[];
  rain: number;
}
