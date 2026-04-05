'use client';
import { useState, useEffect } from 'react';
import type { WeatherAPIForecast } from '@/lib/api';

interface WaqiStation {
  station: string;
  aqi: number;
  lat: number;
  lon: number;
}

function useWaqiStations(lat: number | undefined, lon: number | undefined) {
  const [stations, setStations] = useState<WaqiStation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (lat == null || lon == null) return;
    let cancelled = false;
    setLoading(true);
    const d = 1.2;
    const bbox = `${lat - d},${lon - d},${lat + d},${lon + d}`;
    fetch(`/api/waqi?bounds=${encodeURIComponent(bbox)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (cancelled || !data || data.status !== 'ok') return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const list: WaqiStation[] = (data.data as any[])
          .filter(s => typeof s.aqi === 'number' && s.aqi >= 0)
          .map(s => ({ station: s.station?.name ?? 'AQI Station', aqi: s.aqi, lat: s.lat, lon: s.lon }))
          .sort((a, b) => {
            const da = Math.hypot(a.lat - lat!, a.lon - lon!);
            const db = Math.hypot(b.lat - lat!, b.lon - lon!);
            return da - db;
          })
          .slice(0, 8);
        setStations(list);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [lat, lon]);

  return { stations, loading };
}

const aqiColor = (aqi: number) => {
  if (aqi <= 50)  return '#34d399';
  if (aqi <= 100) return '#fbbf24';
  if (aqi <= 150) return '#fb923c';
  if (aqi <= 200) return '#f87171';
  if (aqi <= 300) return '#c084fc';
  return '#f43f5e';
};

const aqiLabel = (aqi: number) => {
  if (aqi <= 50)  return 'Хорошо';
  if (aqi <= 100) return 'Умеренно';
  if (aqi <= 150) return 'Вредно*';
  if (aqi <= 200) return 'Вредно';
  if (aqi <= 300) return 'Оч. вредно';
  return 'Опасно';
};

export default function AQITab({ w, dayIdx = 0 }: { w: WeatherAPIForecast | null; dayIdx?: number }) {
  const lat = w?.location?.lat;
  const lon = w?.location?.lon;
  const { stations, loading } = useWaqiStations(dayIdx === 0 ? lat : undefined, dayIdx === 0 ? lon : undefined);

  // AQI is only in current (day 0). For future days show a notice.
  const aq = dayIdx === 0 ? w?.current?.air_quality : null;
  if (!aq) return <div className="no-data"><i className="fas fa-leaf" />{dayIdx === 0 ? 'Нет данных AQI' : 'AQI доступен только для текущего дня'}</div>;

  const epa = (aq['us-epa-index'] as number) || 1;
  const LABELS = ['', 'Отлично', 'Хорошо', 'Умеренно', 'Нездорово*', 'Нездорово', 'Оч. нездорово'];
  const COLORS = ['', '#34d399', '#a3e635', '#fbbf24', '#fb923c', '#f87171', '#e879f9'];
  const pct = ((epa - 1) / 5) * 100;

  const polls = [
    { n: 'CO', v: aq.co as number, u: 'µg/m³', c: '#fbbf24' },
    { n: 'NO₂', v: aq.no2 as number, u: 'µg/m³', c: '#fb923c' },
    { n: 'O₃', v: aq.o3 as number, u: 'µg/m³', c: '#60a5fa' },
    { n: 'SO₂', v: aq.so2 as number, u: 'µg/m³', c: '#a78bfa' },
    { n: 'PM2.5', v: aq.pm2_5 as number, u: 'µg/m³', c: '#f87171' },
    { n: 'PM10', v: aq.pm10 as number, u: 'µg/m³', c: '#c084fc' },
  ];

  return (
    <div>
      <div className="aqi-hero">
        <div className="aqi-circle" style={{ color: COLORS[epa], borderColor: COLORS[epa], ['--aqi-c' as string]: COLORS[epa] }}>
          {epa}<small style={{ fontSize: '.6rem' }}>/6</small>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '1.05rem', color: COLORS[epa] }}>{LABELS[epa] ?? '—'}</div>
          <div style={{ fontSize: '.72rem', color: 'var(--text2)', marginTop: 2 }}>
            US EPA · Defra: <b>{(aq['gb-defra-index'] as number) ?? '—'}</b>
          </div>
          <div className="aqi-track"><div className="aqi-fill" style={{ width: `${pct}%`, background: COLORS[epa] }} /></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.62rem', color: 'var(--text2)' }}>
            {COLORS.slice(1).map((c, i) => <span key={i} style={{ color: c }}>●</span>)}
          </div>
        </div>
      </div>
      <div className="poll-grid">
        {polls.map(p => (
          <div key={p.n} className="poll">
            <div className="pv" style={{ color: p.c }}>{p.v != null ? p.v.toFixed(1) : '—'}</div>
            <div className="pn">{p.n}<br /><span style={{ opacity: .6 }}>{p.u}</span></div>
          </div>
        ))}
      </div>

      {/* Nearby WAQI stations */}
      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: '.7rem', fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>
          🌿 Ближайшие станции
        </div>
        {loading && (
          <div className="no-data" style={{ padding: '12px 0', fontSize: '.78rem' }}>
            <span style={{ display: 'inline-block', animation: 'spin .7s linear infinite' }}>⌛</span> Загрузка…
          </div>
        )}
        {!loading && stations.length === 0 && (
          <div className="no-data" style={{ padding: '10px 0', fontSize: '.75rem' }}>Нет данных в радиусе</div>
        )}
        {!loading && stations.map((s, i) => (
          <div key={i} className="pol-row" style={{ alignItems: 'center' }}>
            <div className="pol-name" style={{ width: 'auto', flex: 1, fontSize: '.74rem', paddingRight: 8 }}>{s.station}</div>
            <div style={{
              flexShrink: 0,
              minWidth: 42,
              height: 28,
              borderRadius: 14,
              background: aqiColor(s.aqi) + '22',
              border: `1px solid ${aqiColor(s.aqi)}66`,
              color: aqiColor(s.aqi),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              fontSize: '.7rem',
              fontWeight: 700,
              paddingInline: 8,
            }}>
              {s.aqi} <span style={{ fontWeight: 400, fontSize: '.62rem', opacity: .8 }}>{aqiLabel(s.aqi)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
