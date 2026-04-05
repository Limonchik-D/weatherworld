'use client';
import type { WeatherAPIForecast } from '@/lib/api';

export default function AQITab({ w, dayIdx = 0 }: { w: WeatherAPIForecast | null; dayIdx?: number }) {
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
    </div>
  );
}
