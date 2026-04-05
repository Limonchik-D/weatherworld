'use client';
import Image from 'next/image';
import type { WeatherAPIForecast, NormalisedOWM } from '@/lib/api';
import { wIcon, windDir } from '@/lib/utils';

interface HeroCardProps {
  w: WeatherAPIForecast | null;
  owm: NormalisedOWM | null;
}

export default function HeroCard({ w, owm }: HeroCardProps) {
  const loc  = w?.location;
  const c    = w?.current;
  const oc   = owm?.current;
  const day0 = w?.forecast?.forecastday?.[0]?.day;

  const temp  = c?.temp_c ?? oc?.temp;
  const feels = c?.feelslike_c ?? oc?.feels_like;
  const desc  = c?.condition?.text ?? oc?.weather?.[0]?.description ?? '—';
  const owmIcon  = oc?.weather?.[0]?.icon;
  const wApiIcon = c?.condition?.icon;
  const isDay    = c?.is_day ?? 1;
  const hiTemp   = day0?.maxtemp_c;
  const loTemp   = day0?.mintemp_c;

  const stats = [
    { e: '💨', v: `${c?.wind_kph != null ? (c.wind_kph / 3.6).toFixed(1) : oc?.wind_speed != null ? oc.wind_speed.toFixed(1) : '—'} м/с`, l: `Ветер ${c?.wind_dir ?? windDir(oc?.wind_deg) ?? ''}`.trim() },
    { e: '💦', v: `${c?.humidity ?? oc?.humidity ?? '—'}%`,  l: 'Влажность' },
    { e: '⏱',  v: `${c?.pressure_mb ?? oc?.pressure ?? '—'}`, l: 'Давл. гПа' },
    { e: '👁',  v: `${c?.vis_km ?? (oc?.visibility != null ? (oc.visibility / 1000).toFixed(0) : '—')} км`, l: 'Видимость' },
    { e: '☁️', v: `${c?.cloud ?? oc?.clouds ?? '—'}%`, l: 'Облачность' },
    { e: '🌧',  v: `${c?.precip_mm ?? '—'} мм`,  l: 'Осадки' },
    { e: '☀️', v: `${c?.uv ?? '—'}`,              l: 'УФ-индекс' },
    { e: '🌊',  v: `${c?.gust_kph != null ? (c.gust_kph / 3.6).toFixed(1) : oc?.wind_gust != null ? oc.wind_gust.toFixed(1) : '—'} м/с`, l: 'Порыв' },
    { e: '🌡',  v: oc?.dew_point != null ? `${Math.round(oc.dew_point)}°C` : '—', l: 'Точка росы' },
  ];

  return (
    <div className={`hero-card hero-${isDay ? 'day' : 'night'}`} aria-label="Текущая погода">
      {/* Location */}
      <div className="hero-loc">
        <div className="city-name">{loc ? `${loc.name}` : '—'}</div>
        {loc && <div className="city-meta">{loc.country}{loc.region ? ` · ${loc.region}` : ''} · {loc.localtime?.split(' ')[1] ?? ''}</div>}
      </div>

      {/* Temperature + icon */}
      <div className="hero-body">
        <div className="hero-temp-side">
          <div className="curr-temp">
            {temp != null ? Math.round(temp) : '—'}<sup>°</sup>
          </div>
          <div className="hero-sub">
            <div className="curr-desc">{desc}</div>
            {feels != null && (
              <div className="curr-feels">
                Ощ. {Math.round(feels)}°
                {hiTemp != null && loTemp != null && (
                  <> &nbsp;<span className="hero-hi">▲{Math.round(hiTemp)}°</span> <span className="hero-lo">▼{Math.round(loTemp)}°</span></>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="hero-icon-side" aria-hidden="true">
          {owmIcon ? (
            <Image className="curr-icon-img" src={`https://openweathermap.org/img/wn/${owmIcon}@2x.png`} alt={desc} width={80} height={80} />
          ) : wApiIcon ? (
            <Image className="curr-icon-img" src={`https:${wApiIcon}`} alt={desc} width={80} height={80} />
          ) : (
            <div className="curr-icon-emoji">{wIcon(c?.condition?.code, c?.is_day)}</div>
          )}
        </div>
      </div>

      {/* Stats modules */}
      <div className="stats-grid">
        {stats.map((s, i) => (
          <div key={i} className="stat" title={s.l}>
            <div className="stat-head">
              <span className="si">{s.e}</span>
              <span className="sl">{s.l}</span>
            </div>
            <div className="sv">{s.v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
