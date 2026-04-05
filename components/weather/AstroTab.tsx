'use client';
import type { WeatherAPIForecast, NormalisedOWM } from '@/lib/api';
import { unixTime, moonEmoji } from '@/lib/utils';

interface AstroTabProps { w: WeatherAPIForecast | null; owm: NormalisedOWM | null; dayIdx?: number; }

export default function AstroTab({ w, owm, dayIdx = 0 }: AstroTabProps) {
  const a = w?.forecast?.forecastday?.[dayIdx]?.astro;
  const oc = owm?.current;
  const od = owm?.daily?.[dayIdx];

  const sr = a?.sunrise ?? (dayIdx === 0 && oc?.sunrise ? unixTime(oc.sunrise) : '—');
  const ss = a?.sunset  ?? (dayIdx === 0 && oc?.sunset  ? unixTime(oc.sunset)  : '—');
  const mr = a?.moonrise ?? '—';
  const ms = a?.moonset  ?? '—';
  const phase = a?.moon_phase ?? '—';
  const ill = a?.moon_illumination != null ? `${a.moon_illumination}%` : '—';

  const items = [
    { ai: '🌅', al: 'Восход солнца', av: sr },
    { ai: '🌇', al: 'Закат солнца',  av: ss },
    { ai: '🌛', al: 'Восход луны',   av: mr },
    { ai: '🌜', al: 'Заход луны',    av: ms },
  ];

  return (
    <div>
      <div className="astro-grid">
        {items.map(it => (
          <div key={it.al} className="astro-item">
            <div className="ai">{it.ai}</div>
            <div className="al">{it.al}</div>
            <div className="av">{it.av}</div>
          </div>
        ))}
      </div>
      <div className="moon-hero">
        <span className="moon-emoji" aria-hidden="true">{moonEmoji(phase)}</span>
        <div style={{ fontWeight: 700, fontSize: '1rem' }}>{phase}</div>
        <div style={{ fontSize: '.75rem', color: 'var(--text2)', marginTop: 4 }}>Освещённость: {ill}</div>
      </div>
    </div>
  );
}
