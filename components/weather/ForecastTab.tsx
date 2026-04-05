'use client';
import Image from 'next/image';
import { useEffect, useRef } from 'react';
import type { WeatherAPIForecast, NormalisedOWM } from '@/lib/api';
import { wIcon } from '@/lib/utils';

interface ForecastTabProps { w: WeatherAPIForecast | null; owm: NormalisedOWM | null; onDayClick?: (i: number) => void; }

export default function ForecastTab({ w, owm, onDayClick }: ForecastTabProps) {
  const tempRef = useRef<HTMLCanvasElement>(null);
  const precipRef = useRef<HTMLCanvasElement>(null);
  const chartsRef = useRef<{ temp?: unknown; precip?: unknown }>({});

  const wDays = w?.forecast?.forecastday ?? [];
  const owmDays = owm?.daily ?? [];

  type SrcDay = {
    date: string;
    day: { maxtemp_c: number; mintemp_c: number; condition?: { text: string; icon?: string; code?: number }; totalprecip_mm?: number; daily_chance_of_rain?: number };
    owmIcon?: string;
  };

  const src: SrcDay[] = wDays.length
    ? wDays
    : owmDays.slice(0, 7).map(d => ({
        date: new Date(d.dt * 1000).toISOString().split('T')[0],
        day: {
          maxtemp_c: d.temp.max, mintemp_c: d.temp.min,
          condition: { text: d.weather?.[0]?.description ?? '', code: 800, icon: undefined },
          totalprecip_mm: d.rain ?? 0,
          daily_chance_of_rain: Math.round(d.pop * 100),
        },
        owmIcon: d.weather?.[0]?.icon,
      }));

  useEffect(() => {
    (async () => {
      const { Chart } = await import('chart.js/auto');
      const defaults = {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color: 'rgba(248,244,255,.6)', font: { size: 10 }, boxWidth: 10 } } },
        scales: {
          x: { ticks: { color: 'rgba(248,244,255,.45)', maxRotation: 40, font: { size: 9 } }, grid: { color: 'rgba(255,255,255,.04)' } },
          y: { ticks: { color: 'rgba(248,244,255,.45)', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,.06)' } },
        },
      };
      const labels = src.map(d => new Date(d.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }));

      if (tempRef.current) {
        (chartsRef.current.temp as { destroy?: () => void })?.destroy?.();
        chartsRef.current.temp = new Chart(tempRef.current, {
          type: 'line', data: { labels, datasets: [
            { label: 'Макс °C', data: src.map(d => Math.round(d.day.maxtemp_c)), borderColor: '#fca5a5', backgroundColor: 'rgba(252,165,165,.12)', tension: 0.4, fill: false, pointRadius: 4, pointHoverRadius: 6 },
            { label: 'Мин °C', data: src.map(d => Math.round(d.day.mintemp_c)), borderColor: '#93c5fd', backgroundColor: 'rgba(147,197,253,.12)', tension: 0.4, fill: false, pointRadius: 4, pointHoverRadius: 6 },
          ] }, options: defaults,
        });
      }
      if (precipRef.current) {
        (chartsRef.current.precip as { destroy?: () => void })?.destroy?.();
        chartsRef.current.precip = new Chart(precipRef.current, {
          type: 'bar', data: { labels, datasets: [
            { label: 'Осадки мм', data: src.map(d => d.day.totalprecip_mm ?? 0), backgroundColor: 'rgba(96,165,250,.5)', borderColor: '#60a5fa', borderWidth: 1, borderRadius: 5 },
          ] }, options: defaults,
        });
      }
    })();
    return () => {
      (chartsRef.current.temp as { destroy?: () => void })?.destroy?.();
      (chartsRef.current.precip as { destroy?: () => void })?.destroy?.();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w, owm]);

  return (
    <div>
      {src.map((d, i) => {
        const dd = d.day;
        const dn = new Date(d.date).toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' });
        const pop = dd.daily_chance_of_rain ?? 0;
        return (
          <div
            key={i}
            className={`fc-row${onDayClick ? ' fc-row--clickable' : ''}`}
            onClick={() => onDayClick?.(i)}
            role={onDayClick ? 'button' : undefined}
            tabIndex={onDayClick ? 0 : undefined}
            onKeyDown={e => { if (onDayClick && (e.key === 'Enter' || e.key === ' ')) onDayClick(i); }}
            title={onDayClick ? 'Нажмите для просмотра деталей' : undefined}
          >
            <div className="fc-day">{dn}</div>
            <div className="fc-icon-wrap">
              {d.owmIcon ? (
                <Image src={`https://openweathermap.org/img/wn/${d.owmIcon}@2x.png`} alt={dd.condition?.text ?? ''} width={40} height={40}
                  onError={e => { (e.target as HTMLImageElement).style.display='none'; }} />
              ) : dd.condition?.icon ? (
                <Image src={`https:${dd.condition.icon}`} alt={dd.condition.text} width={40} height={40}
                  onError={e => { (e.target as HTMLImageElement).style.display='none'; }} />
              ) : (
                <span className="emoji">{wIcon(dd.condition?.code, 1)}</span>
              )}
            </div>
            <div className="fc-desc">{dd.condition?.text ?? '—'}</div>
            <div className="fc-temps">
              <div className="fc-hi">{Math.round(dd.maxtemp_c)}°</div>
              <div className="fc-lo">{Math.round(dd.mintemp_c)}°</div>
            </div>
            <div className="fc-pop">{pop}%</div>
          </div>
        );
      })}
      <div className="chart-wrap"><canvas ref={tempRef} aria-label="Температура за неделю" /></div>
      <div className="chart-wrap" style={{ marginTop: 8 }}><canvas ref={precipRef} aria-label="Осадки за неделю" /></div>
    </div>
  );
}
