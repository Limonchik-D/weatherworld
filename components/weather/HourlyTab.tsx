'use client';
import Image from 'next/image';
import { useEffect, useRef } from 'react';
import type { WeatherAPIForecast, NormalisedOWM } from '@/lib/api';
import { wIcon } from '@/lib/utils';

interface HourlyTabProps { w: WeatherAPIForecast | null; owm: NormalisedOWM | null; dayIdx?: number; }

export default function HourlyTab({ w, owm, dayIdx = 0 }: HourlyTabProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInst = useRef<{ destroy?: () => void } | undefined>(undefined);
  const scrollRef = useRef<HTMLDivElement>(null);

  const wHours = w?.forecast?.forecastday?.[dayIdx]?.hour ?? [];
  const owmH = owm?.hourly ?? [];
  // For OWM: slice to 24h per day based on dayIdx
  const owmDayHours = owmH.slice(dayIdx * 24, dayIdx * 24 + 48);
  type SrcHour = { time: string; temp_c: number; is_day: 0|1; chance_of_rain: number; condition?: { text: string; icon?: string; code?: number }; owmIcon?: string };
  const src: SrcHour[] = wHours.length
    ? wHours.slice(0, 48)
    : owmDayHours.slice(0, 48).map(h => ({
        time: new Date(h.dt * 1000).toISOString().replace('T', ' ').slice(0, 16),
        temp_c: h.temp ?? 0, is_day: 1, chance_of_rain: Math.round(h.pop * 100),
        condition: { text: h.weather?.[0]?.description ?? '', code: 800 },
        owmIcon: h.weather?.[0]?.icon,
      }));

  // Determine current hour index (only meaningful when dayIdx === 0)
  const nowHourIdx = (() => {
    if (dayIdx !== 0 || src.length === 0) return -1;
    const nowH = new Date().getHours();
    let best = 0;
    let minDiff = Infinity;
    src.forEach((h, i) => {
      const hh = parseInt(h.time?.split(' ')[1]?.slice(0, 2) ?? '0', 10);
      const diff = Math.abs(hh - nowH);
      if (diff < minDiff) { minDiff = diff; best = i; }
    });
    return best;
  })();

  // Auto-scroll to current hour when today is selected
  useEffect(() => {
    if (nowHourIdx < 0 || !scrollRef.current) return;
    const container = scrollRef.current;
    // Wait one frame for layout to settle
    requestAnimationFrame(() => {
      const items = container.children;
      const target = items[nowHourIdx] as HTMLElement | undefined;
      if (target) {
        container.scrollLeft = target.offsetLeft - container.clientWidth / 2 + target.offsetWidth / 2;
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayIdx, src.length]);

  // Drag-to-scroll (mouse)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;

    const onDown = (e: MouseEvent) => {
      isDown = true;
      el.style.cursor = 'grabbing';
      startX = e.pageX - el.offsetLeft;
      scrollLeft = el.scrollLeft;
    };
    const onUp = () => { isDown = false; el.style.cursor = 'grab'; };
    const onMove = (e: MouseEvent) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - el.offsetLeft;
      el.scrollLeft = scrollLeft - (x - startX);
    };
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; // native horizontal scroll
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };

    el.style.cursor = 'grab';
    el.addEventListener('mousedown', onDown);
    el.addEventListener('mouseup', onUp);
    el.addEventListener('mouseleave', onUp);
    el.addEventListener('mousemove', onMove);
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('mousedown', onDown);
      el.removeEventListener('mouseup', onUp);
      el.removeEventListener('mouseleave', onUp);
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('wheel', onWheel);
    };
  }, []);

  useEffect(() => {
    (async () => {
      const { Chart } = await import('chart.js/auto');
      chartInst.current?.destroy?.();
      if (!chartRef.current) return;
      const sl = src.slice(0, 24);
      chartInst.current = new Chart(chartRef.current, {
        type: 'line',
        data: {
          labels: sl.map(h => h.time?.split(' ')[1]?.slice(0, 5) ?? '—'),
          datasets: [{ label: '°C', data: sl.map(h => Math.round(h.temp_c)), borderColor: '#c084fc', backgroundColor: 'rgba(192,132,252,.12)', tension: 0.4, fill: true, pointRadius: 3, pointHoverRadius: 5 }],
        },
        options: { responsive: true, maintainAspectRatio: false,
          plugins: { legend: { labels: { color: 'rgba(248,244,255,.6)', font: { size: 10 }, boxWidth: 10 } } },
          scales: {
            x: { ticks: { color: 'rgba(248,244,255,.45)', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,.04)' } },
            y: { ticks: { color: 'rgba(248,244,255,.45)', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,.06)' } },
          },
        },
      });
    })();
    return () => chartInst.current?.destroy?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w, owm]);

  return (
    <div>
      <div ref={scrollRef} className="hourly-scroll" style={{ marginBottom: 10 }}>
        {src.map((h, i) => {
          const t = h.time?.split(' ')[1]?.slice(0, 5) ?? '—';
          const isNow = i === nowHourIdx;
          return (
            <div key={i} className={`h-item${isNow ? ' h-now' : ''}`} role="listitem" aria-label={isNow ? `Сейчас ${t}` : t}>
              <div className="ht">{t}</div>
              {h.owmIcon ? (
                <Image src={`https://openweathermap.org/img/wn/${h.owmIcon}@2x.png`} alt={h.condition?.text ?? ''} width={36} height={36} />
              ) : h.condition?.icon ? (
                <Image src={`https:${h.condition.icon}`} alt="" width={36} height={36} />
              ) : (
                <span className="emoji">{wIcon(h.condition?.code, h.is_day)}</span>
              )}
              <div className="hv">{Math.round(h.temp_c)}°</div>
              <div className="hp">{h.chance_of_rain}%💧</div>
            </div>
          );
        })}
      </div>
      <div className="chart-wrap"><canvas ref={chartRef} aria-label="Почасовая температура" /></div>
    </div>
  );
}
