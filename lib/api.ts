/* ══════════════════════════════════════
   WeatherWorld – client-side API layer
   All requests go to our own server routes —
   API keys are NEVER exposed on the client.
   ══════════════════════════════════════ */

const CACHE_TTL = 600_000; // 10 min
const CACHE_VER = 'v3';

/* ── In-memory + localStorage cache ── */
const memCache = new Map<string, { v: unknown; ts: number }>();

function cacheGet<T>(key: string): T | null {
  const mem = memCache.get(key);
  if (mem && Date.now() - mem.ts < CACHE_TTL) return mem.v as T;
  try {
    const raw = localStorage.getItem(`ww_${CACHE_VER}_${key}`);
    if (raw) {
      const d = JSON.parse(raw) as { v: T; ts: number };
      if (Date.now() - d.ts < CACHE_TTL) {
        memCache.set(key, { v: d.v, ts: d.ts });
        return d.v;
      }
    }
  } catch { /* ignore */ }
  return null;
}

function cacheSet(key: string, value: unknown): void {
  const entry = { v: value, ts: Date.now() };
  memCache.set(key, entry);
  try {
    localStorage.setItem(`ww_${CACHE_VER}_${key}`, JSON.stringify(entry));
  } catch { /* ignore quota */ }
}

export function cacheBust(lat: number, lon: number): void {
  const key = `forecast_${lat}_${lon}`;
  memCache.delete(key);
  try { localStorage.removeItem(`ww_${CACHE_VER}_${key}`); } catch { /* */ }
}

/** Fetch weather forecast (WeatherAPI + OWM, merged server-side) */
export async function fetchForecast(lat: number, lon: number) {
  const key = `forecast_${lat}_${lon}`;
  const hit = cacheGet<ForecastResponse>(key);
  if (hit) return hit;
  const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}&type=forecast`);
  if (!res.ok) throw new Error(`Weather API ${res.status}`);
  const data = await res.json() as ForecastResponse;
  cacheSet(key, data);
  return data;
}

/** Quick current weather (for map popup) */
export async function fetchCurrent(lat: number, lon: number) {
  const key = `current_${lat}_${lon}`;
  const hit = cacheGet(key);
  if (hit) return hit;
  const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}&type=current`);
  if (!res.ok) throw new Error(`Current API ${res.status}`);
  const data = await res.json();
  cacheSet(key, data);
  return data;
}

/** Historical data (1 day, WeatherAPI paid plan) */
export async function fetchHistory(lat: number, lon: number, dt: string) {
  const key = `history_${lat}_${lon}_${dt}`;
  const hit = cacheGet(key);
  if (hit) return hit;
  const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}&type=history&dt=${dt}`);
  if (!res.ok) return null; // graceful – paid plan only
  const data = await res.json();
  cacheSet(key, data);
  return data;
}

/** Open-Meteo: UV index, dew point, snow depth, radiation (no API key needed) */
export async function fetchOpenMeteo(lat: number, lon: number) {
  const key = `openmeteo_${lat}_${lon}`;
  const hit = cacheGet<OpenMeteoResponse>(key);
  if (hit) return hit;
  const res = await fetch(`/api/openmeteo?lat=${lat}&lon=${lon}`);
  if (!res.ok) return null;
  const data = await res.json() as OpenMeteoResponse;
  cacheSet(key, data);
  return data;
}

/** City autocomplete */
export async function fetchSearch(q: string) {
  if (q.length < 2) return [];
  const key = `search_${q.toLowerCase()}`;
  const hit = cacheGet<SearchResult[]>(key);
  if (hit) return hit;
  const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
  if (!res.ok) return [];
  const data = await res.json() as SearchResult[];
  cacheSet(key, data);
  return data;
}

/* ─── Public types ─── */
export interface ForecastResponse {
  w: WeatherAPIForecast | null;
  owm: NormalisedOWM | null;
}

export interface SearchResult {
  id: number;
  name: string;
  region: string;
  country: string;
  lat: number;
  lon: number;
}

// WeatherAPI shapes (minimal – extend as needed)
export interface WeatherAPIForecast {
  location: { name: string; country: string; region: string; tz_id: string; localtime: string; lat: number; lon: number };
  current: {
    temp_c: number; feelslike_c: number; humidity: number; pressure_mb: number;
    wind_kph: number; wind_dir: string; wind_degree: number; gust_kph: number; vis_km: number;
    cloud: number; precip_mm: number; uv: number; is_day: 0 | 1;
    condition: { text: string; icon: string; code: number };
    air_quality?: Record<string, number>;
  };
  forecast: {
    forecastday: ForecastDay[];
  };
  alerts?: { alert: WeatherAlert[] };
}

export interface ForecastDay {
  date: string;
  day: {
    maxtemp_c: number; mintemp_c: number; totalprecip_mm: number;
    daily_chance_of_rain: number;
    condition: { text: string; icon: string; code: number };
  };
  astro: {
    sunrise: string; sunset: string; moonrise: string; moonset: string;
    moon_phase: string; moon_illumination: number;
  };
  hour: HourData[];
}

export interface HourData {
  time: string; temp_c: number; is_day: 0 | 1; chance_of_rain: number;
  condition: { text: string; icon: string; code: number };
}

export interface WeatherAlert {
  headline: string; event: string; severity: string;
  desc: string; instruction: string; effective: string; expires: string;
}

export interface NormalisedOWM {
  current: OWMCurrent | null;
  hourly: OWMHour[];
  daily: OWMDay[];
  alerts: unknown[];
}

export interface OWMCurrent {
  temp?: number; feels_like?: number; humidity?: number; pressure?: number;
  visibility?: number; clouds?: number; wind_speed?: number; wind_gust?: number;
  wind_deg?: number; weather?: OWMWeather[]; sunrise?: number; sunset?: number;
  uvi: null; dew_point: null;
}

export interface OWMHour {
  dt: number; temp?: number; weather?: OWMWeather[]; pop: number;
  wind_speed?: number; clouds?: number;
}

export interface OWMDay {
  dt: number; temp: { max: number; min: number };
  weather?: OWMWeather[]; pop: number; rain: number;
}

export interface OWMWeather {
  id: number; main: string; description: string; icon: string;
}

export interface OpenMeteoResponse {
  hourly: {
    time: string[];
    uv_index: number[];
    dew_point_2m: number[];
    snow_depth: number[];
    shortwave_radiation: number[];
    precipitation_probability: number[];
    freezing_level_height: number[];
  };
  daily: {
    time: string[];
    uv_index_max: number[];
    sunrise: string[];
    sunset: string[];
    precipitation_sum: number[];
    snowfall_sum: number[];
    wind_speed_10m_max: number[];
    wind_gusts_10m_max: number[];
  };
}
