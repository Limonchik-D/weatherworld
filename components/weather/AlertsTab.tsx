'use client';
import type { WeatherAPIForecast, NormalisedOWM } from '@/lib/api';

interface AlertsTabProps { w: WeatherAPIForecast | null; owm: NormalisedOWM | null; }

export default function AlertsTab({ w, owm }: AlertsTabProps) {
  const wa = w?.alerts?.alert ?? [];
  const oa = owm?.alerts ?? [];

  const all = [
    ...wa.map(a => ({
      title: a.headline || a.event, sev: a.severity,
      desc: a.desc || a.instruction || '', from: a.effective || '', to: a.expires || '',
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...oa.map((a: any) => ({
      title: a.event, sev: 'Alert', desc: a.description,
      from: new Date(a.start * 1000).toLocaleString('ru-RU'),
      to: new Date(a.end * 1000).toLocaleString('ru-RU'),
    })),
  ];

  if (!all.length) return (
    <div className="no-data"><i className="fas fa-circle-check" />Нет активных предупреждений ✅</div>
  );

  return (
    <div>
      {all.map((a, i) => {
        const cls = a.sev?.toLowerCase().includes('warn') ? 'warn'
          : a.sev?.toLowerCase().includes('info') ? 'info' : 'danger';
        const ico = { danger: '🚨', warn: '⚠️', info: 'ℹ️' }[cls];
        return (
          <div key={i} className={`alert ${cls}`} role="alert">
            <div className="alert-head">
              {ico} {a.title ?? 'Предупреждение'}
              {a.sev && <span style={{ fontSize: '.65rem', background: 'rgba(255,255,255,.1)', padding: '2px 7px', borderRadius: '50px' }}>{a.sev}</span>}
            </div>
            <div className="alert-body">{(a.desc ?? '').slice(0, 350)}{a.desc?.length > 350 ? '…' : ''}</div>
            {a.from && <div className="alert-time">📅 {a.from} — {a.to}</div>}
          </div>
        );
      })}
    </div>
  );
}
