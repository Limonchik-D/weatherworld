import { wIcon } from '@/lib/utils';

interface WidgetCardProps { lat: number; lon: number; city: string; }

async function getWeather(lat: number, lon: number) {
  try {
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
    const res = await fetch(`${base}/api/weather?lat=${lat}&lon=${lon}&type=forecast`, {
      next: { revalidate: 600 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

export default async function WidgetCard({ lat, lon, city }: WidgetCardProps) {
  const data = await getWeather(lat, lon);
  const c = data?.w?.current;
  const loc = data?.w?.location;
  const owmIcon = data?.owm?.current?.weather?.[0]?.icon;
  const desc = c?.condition?.text ?? '—';
  const temp = c?.temp_c != null ? Math.round(c.temp_c) : '—';
  const feels = c?.feelslike_c != null ? Math.round(c.feelslike_c) : null;

  return (
    <div style={{
      padding: 16, borderRadius: 24, width: '100%', minHeight: 140,
      background: 'linear-gradient(135deg,rgba(168,85,247,.25),rgba(232,121,249,.12))',
      border: '1px solid rgba(168,85,247,.3)',
      color: '#f8f4ff', fontFamily: "'Inter',-apple-system,sans-serif",
      boxShadow: '0 8px 32px rgba(0,0,0,.45), 0 0 40px rgba(168,85,247,.25)',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ fontSize: '.75rem', color: 'rgba(248,244,255,.5)', marginBottom: 4 }}>
        📍 {loc?.name ?? city}, {loc?.country ?? ''}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {owmIcon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`https://openweathermap.org/img/wn/${owmIcon}@2x.png`} alt={desc} width={56} height={56}
            style={{ filter: 'drop-shadow(0 4px 12px rgba(168,85,247,.5))' }} />
        ) : c?.condition?.icon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`https:${c.condition.icon}`} alt={desc} width={56} height={56}
            style={{ filter: 'drop-shadow(0 4px 12px rgba(168,85,247,.4))' }} />
        ) : (
          <div style={{ fontSize: 48, lineHeight: 1 }}>{wIcon(c?.condition?.code, c?.is_day)}</div>
        )}
        <div>
          <div style={{ fontSize: '2.6rem', fontWeight: 200, lineHeight: 1, letterSpacing: '-2px' }}>
            {temp}<sup style={{ fontSize: '1rem', verticalAlign: 'super' }}>°C</sup>
          </div>
          <div style={{ fontSize: '.85rem', fontWeight: 500, textTransform: 'capitalize', marginTop: 2 }}>{desc}</div>
          {feels != null && <div style={{ fontSize: '.72rem', color: 'rgba(248,244,255,.5)', marginTop: 2 }}>Ощущается {feels}°C</div>}
        </div>
      </div>
      {c && (
        <div style={{ display: 'flex', gap: 12, marginTop: 10, fontSize: '.7rem', color: 'rgba(248,244,255,.55)' }}>
          <span>💧 {c.humidity}%</span>
          <span>💨 {(c.wind_kph / 3.6).toFixed(1)} м/с</span>
          <span>☁️ {c.cloud}%</span>
          <span>☀️ УФ {c.uv}</span>
        </div>
      )}
    </div>
  );
}
