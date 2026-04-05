'use client';
import { useEffect, useRef } from 'react';

export default function HistoryTab({ hist, dayIdx = 0 }: { hist: unknown[]; dayIdx?: number }) {
  const tRef = useRef<HTMLCanvasElement>(null);
  const pRef = useRef<HTMLCanvasElement>(null);
  const ch = useRef<{ t?: { destroy?: () => void }; p?: { destroy?: () => void } }>({});

  useEffect(() => {
    if (!hist?.length) return;
    (async () => {
      const { Chart } = await import('chart.js/auto');
      // Show selected day from history (hist[0] = yesterday, hist[1] = 2 days ago etc.)
      // dayIdx 0 = today (no history), so offset: histDay = hist[dayIdx - 1] or all
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const histDay = dayIdx > 0 ? (hist[dayIdx - 1] as any) : null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const all = histDay
        ? histDay.forecast?.forecastday?.[0]?.hour ?? []
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        : hist.flatMap((d: any) => d.forecast?.forecastday?.[0]?.hour ?? []);
      if (!all.length) return;
      const stride = Math.max(1, Math.floor(all.length / 18));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const labels = all.map((h: any, i: number) => (i % stride === 0 ? h.time.slice(11, 16) : ''));
      const base = { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: 'rgba(248,244,255,.6)', font: { size: 10 }, boxWidth: 10 } } }, scales: { x: { ticks: { color: 'rgba(248,244,255,.45)', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,.04)' } }, y: { ticks: { color: 'rgba(248,244,255,.45)', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,.06)' } } } };
      ch.current.t?.destroy?.();
      if (tRef.current) ch.current.t = new Chart(tRef.current, { type: 'line', data: { labels, datasets: [{ label: 'Темп °C', data: all.map((h: any) => h.temp_c), borderColor: '#34d399', backgroundColor: 'rgba(52,211,153,.1)', tension: 0.3, fill: true, pointRadius: 0 }] }, options: base }) as { destroy?: () => void };
      ch.current.p?.destroy?.();
      if (pRef.current) ch.current.p = new Chart(pRef.current, { type: 'bar', data: { labels, datasets: [{ label: 'Осадки мм', data: all.map((h: any) => h.precip_mm), backgroundColor: 'rgba(96,165,250,.4)', borderColor: '#60a5fa', borderWidth: 0, borderRadius: 2 }] }, options: base }) as { destroy?: () => void };
    })();
    return () => { ch.current.t?.destroy?.(); ch.current.p?.destroy?.(); };
  }, [hist]);

  if (!hist?.length) return <div className="no-data"><i className="fas fa-clock-rotate-left" />Нет исторических данных (нужен платный план WeatherAPI)</div>;
  return (
    <div>
      <div className="chart-wrap"><canvas ref={tRef} aria-label="Исторические температуры" /></div>
      <div className="chart-wrap" style={{ marginTop: 8 }}><canvas ref={pRef} aria-label="Исторические осадки" /></div>
    </div>
  );
}
