'use client';
import { type RefObject, useState } from 'react';
import type { WeatherAPIForecast, NormalisedOWM } from '@/lib/api';
import HeroCard from './HeroCard';
import ForecastTab from './ForecastTab';
import HourlyTab from './HourlyTab';
import AQITab from './AQITab';
import AstroTab from './AstroTab';
import AlertsTab from './AlertsTab';
import HistoryTab from './HistoryTab';

interface WeatherPanelProps {
  w: WeatherAPIForecast | null;
  owm: NormalisedOWM | null;
  hist: unknown[];
  lat: number;
  lon: number;
  heroRef?: RefObject<HTMLDivElement | null>;
}

const TABS = [
  { id: 'forecast', label: '📅 Прогноз' },
  { id: 'hourly',   label: '🕐 Часовой' },
  { id: 'history',  label: '📈 История' },
  { id: 'aqi',      label: '🌿 AQI' },
  { id: 'pollen',   label: '🌸 Пыльца' },
  { id: 'astro',    label: '🌙 Астро' },
  { id: 'alerts',   label: '⚠️ Алерты' },
] as const;
type TabId = (typeof TABS)[number]['id'];

export default function WeatherPanel({ w, owm, hist, lat, lon, heroRef }: WeatherPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('forecast');
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);

  // Day labels for picker (use WeatherAPI days or OWM daily)
  const days = w?.forecast?.forecastday ?? [];
  const owmDays = owm?.daily ?? [];
  const dayCount = days.length || Math.min(owmDays.length, 7);

  function getDayLabel(i: number): string {
    if (days[i]) {
      return new Date(days[i].date).toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric' });
    }
    if (owmDays[i]) {
      return new Date(owmDays[i].dt * 1000).toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric' });
    }
    return `День ${i + 1}`;
  }

  // Day picker — shown on tabs other than Forecast
  const showPicker = activeTab !== 'forecast' && dayCount > 1;

  return (
    <div className="weather-content">
      <div ref={heroRef}>
        <HeroCard w={w} owm={owm} />
      </div>

      <div className="glass glass-sm" style={{ padding: '12px' }}>
        <div className="tabs-wrap" role="tablist" aria-label="Разделы">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`tab${activeTab === t.id ? ' on' : ''}`}
              role="tab"
              aria-selected={activeTab === t.id}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Day picker */}
        {showPicker && (
          <div className="day-picker" role="group" aria-label="Выбор дня">
            {Array.from({ length: dayCount }, (_, i) => (
              <button
                key={i}
                className={`day-btn${selectedDayIdx === i ? ' on' : ''}`}
                onClick={() => setSelectedDayIdx(i)}
                aria-pressed={selectedDayIdx === i}
              >
                {getDayLabel(i)}
              </button>
            ))}
          </div>
        )}

        <div className={`tab-pane${activeTab === 'forecast' ? ' on' : ''}`} role="tabpanel">
          <ForecastTab w={w} owm={owm} onDayClick={(i) => { setSelectedDayIdx(i); setActiveTab('hourly'); }} />
        </div>
        <div className={`tab-pane${activeTab === 'hourly' ? ' on' : ''}`} role="tabpanel">
          <HourlyTab w={w} owm={owm} dayIdx={selectedDayIdx} />
        </div>
        <div className={`tab-pane${activeTab === 'history' ? ' on' : ''}`} role="tabpanel">
          <HistoryTab hist={hist} dayIdx={selectedDayIdx} />
        </div>
        <div className={`tab-pane${activeTab === 'aqi' ? ' on' : ''}`} role="tabpanel">
          <AQITab w={w} dayIdx={selectedDayIdx} />
        </div>
        <div className={`tab-pane${activeTab === 'pollen' ? ' on' : ''}`} role="tabpanel">
          <PollenTab w={w} dayIdx={selectedDayIdx} />
        </div>
        <div className={`tab-pane${activeTab === 'astro' ? ' on' : ''}`} role="tabpanel">
          <AstroTab w={w} owm={owm} dayIdx={selectedDayIdx} />
        </div>
        <div className={`tab-pane${activeTab === 'alerts' ? ' on' : ''}`} role="tabpanel">
          <AlertsTab w={w} owm={owm} />
        </div>
      </div>
    </div>
  );
}

/* Inline Pollen (simple – no chart) */
function PollenTab({ w, dayIdx = 0 }: { w: WeatherAPIForecast | null; dayIdx?: number }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pol = (w?.forecast?.forecastday?.[dayIdx]?.day as any)?.pollen ?? null;
  if (!pol) return <div className="no-data"><i className="fas fa-seedling" />Данные о пыльце недоступны</div>;

  const TYPES = [
    { k: 'Hazel_and_Alder_Pollen', n: 'Лещина/Ольха' },
    { k: 'Birch_Pollen', n: 'Берёза' },
    { k: 'Grass_Pollen', n: 'Трава' },
    { k: 'Oak_Pollen', n: 'Дуб' },
    { k: 'Weed_Pollen', n: 'Сорняки' },
    { k: 'Mugwort_Pollen', n: 'Полынь' },
    { k: 'Ragweed_Pollen', n: 'Амброзия' },
  ];
  const RISK = ['', 'Низкий', 'Средний', 'Высокий', 'Очень высок.'];
  const RC = ['', '#34d399', '#fbbf24', '#fb923c', '#f87171'];

  const rows = TYPES.filter(t => pol[t.k] != null).map(({ k, n }) => {
    const v = pol[k];
    const i = Math.min(v, 4);
    return (
      <div key={k} className="pol-row">
        <div className="pol-name">{n}</div>
        <div className="pol-bar-bg"><div className="pol-bar" style={{ width: `${(v / 4) * 100}%`, background: RC[i] }} /></div>
        <div className="pol-lvl" style={{ color: RC[i] }}>{RISK[i] ?? v}</div>
      </div>
    );
  });
  return <div>{rows.length ? rows : <div className="no-data">Нет данных</div>}</div>;
}
