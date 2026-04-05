'use client';
import { useCallback, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import WeatherPanel from '@/components/weather/WeatherPanel';
import Loader from '@/components/ui/Loader';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import { fetchForecast, fetchHistory, cacheBust } from '@/lib/api';
import { exportPDF, exportImage } from '@/lib/utils';
import type { WeatherAPIForecast, NormalisedOWM } from '@/lib/api';

// Leaflet uses window — must be loaded only on client, never SSR
const MapBoard = dynamic(() => import('@/components/map/MapBoard'), { ssr: false });

const REFRESH_INTERVAL = 300_000;

function App() {
  const [loading, setLoading] = useState(false);
  const [loadTxt, setLoadTxt] = useState('Загрузка…');
  const [updTime, setUpdTime] = useState('');
  const [markerPos, setMarkerPos] = useState<{ lat: number; lon: number } | null>(null);
  const [weatherData, setWeatherData] = useState<{
    w: WeatherAPIForecast | null;
    owm: NormalisedOWM | null;
    hist: unknown[];
    lat: number;
    lon: number;
  } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const refreshTimer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const { toast } = useToast();

  const loadWeather = useCallback(async (lat: number, lon: number, hint = '') => {
    setLoading(true);
    setLoadTxt('Загружаем погоду…');
    clearInterval(refreshTimer.current);
    try {
      setMarkerPos({ lat, lon });
      const { w, owm } = await fetchForecast(lat, lon);
      if (!w && !owm) { toast('Оба API недоступны', 'err'); return; }

      // History: last 3 days (graceful – paid plan only)
      const hist: unknown[] = [];
      for (let i = 1; i <= 3; i++) {
        const dt = new Date();
        dt.setDate(dt.getDate() - i);
        const ds = dt.toISOString().split('T')[0];
        const h = await fetchHistory(lat, lon, ds);
        if (h) hist.push(h);
      }

      setWeatherData({ w, owm, hist, lat, lon });
      setUpdTime(new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }));

      refreshTimer.current = setInterval(() => {
        cacheBust(lat, lon);
        loadWeather(lat, lon, hint);
      }, REFRESH_INTERVAL);
    } catch (e: unknown) {
      toast('Ошибка: ' + (e instanceof Error ? e.message : 'неизвестно'), 'err');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  async function handleGeo() {
    if (!navigator.geolocation) { toast('Геолокация недоступна в вашем браузере', 'err'); return; }

    // Check current permission state without triggering a prompt
    try {
      const perm = await navigator.permissions.query({ name: 'geolocation' });
      if (perm.state === 'denied') {
        toast('Геолокация заблокирована. Разрешите доступ в настройках браузера (🔒 в адресной строке)', 'err');
        return;
      }
    } catch { /* permissions API not available — proceed normally */ }

    setLoading(true);
    setLoadTxt('Определяем местоположение…');

    // Two-stage geolocation: GPS first (high accuracy), then IP fallback
    const tryIpFallback = async () => {
      try {
        setLoadTxt('Определяем по IP…');
        // Use server-side proxy to avoid mixed content and get real client IP
        const res = await fetch('/api/geoip');
        if (res.ok) {
          const ip = await res.json();
          if (ip.status === 'success' && ip.lat && ip.lon) {
            const hint = [ip.city, ip.regionName, ip.country].filter(Boolean).join(', ');
            loadWeather(ip.lat, ip.lon, hint);
            return;
          }
        }
      } catch { /* try next */ }
      // Fallback: ipapi.co (HTTPS, free tier)
      try {
        const ip2 = await fetch('https://ipapi.co/json/').then(r => r.json());
        if (ip2.latitude && ip2.longitude) {
          loadWeather(ip2.latitude, ip2.longitude, ip2.city ?? 'Ваш город');
          return;
        }
      } catch { /* */ }
      toast('Не удалось определить местоположение', 'err');
      setLoading(false);
    };

    navigator.geolocation.getCurrentPosition(
      p => {
        setLoadTxt('Загружаем погоду…');
        loadWeather(p.coords.latitude, p.coords.longitude, 'Ваше место');
      },
      async (err) => {
        const msg = err.code === 1
          ? 'Доступ к геолокации запрещён. Разрешите в настройках браузера (🔒)'
          : err.code === 2
          ? 'GPS недоступен (возможно, отключены службы геолокации Windows). Определяем по IP…'
          : 'Таймаут GPS. Определяем по IP…';
        toast(msg);
        await tryIpFallback();
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  }

  async function handleExport(fmt: 'pdf' | 'jpg' | 'png') {
    if (!weatherData) { toast('Сначала выберите город', 'err'); return; }
    // For images: only HeroCard; for PDF: full panel
    const target = fmt === 'pdf' ? panelRef.current : heroRef.current;
    if (!target) { toast('Нет блока для экспорта', 'err'); return; }
    toast(`Готовим ${fmt.toUpperCase()}…`);
    try {
      const city = (weatherData.w?.location?.name ?? 'weather')
        .replace(/[^a-zA-Zа-яА-Я0-9]/g, '_').slice(0, 30);
      const base = `weather_${city}_${new Date().toISOString().slice(0, 10)}`;
      if (fmt === 'pdf') {
        await exportPDF(target, `${base}.pdf`);
      } else {
        await exportImage(target, `${base}.${fmt}`, fmt);
      }
      toast(`${fmt.toUpperCase()} сохранён ✅`);
    } catch (e: unknown) {
      toast('Ошибка экспорта: ' + (e instanceof Error ? e.message : ''), 'err');
    }
  }

  function handleWidgetEmbed() {
    if (!weatherData) { toast('Сначала выберите город', 'err'); return; }
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? window.location.origin;
    const { lat, lon, w } = weatherData;
    const city = encodeURIComponent(w?.location?.name ?? '');
    const code = `<iframe src="${base}/widget?lat=${lat}&lon=${lon}&city=${city}" width="320" height="160" frameborder="0" style="border-radius:24px;overflow:hidden"></iframe>`;
    navigator.clipboard.writeText(code).then(() => toast('Код виджета скопирован ✅'));
  }

  return (
    <div id="app">
      {loading && <Loader text={loadTxt} />}
      <Header updTime={updTime} onSearch={loadWeather} onGeo={handleGeo} onExport={handleExport} />

      <div id="main" role="main">
        <MapBoard
          onLocationPick={loadWeather}
          markerPos={markerPos}
          currentWeather={weatherData?.w?.current ? {
            precip_mm: weatherData.w.current.precip_mm,
            condition_code: weatherData.w.current.condition.code,
            wind_kph: weatherData.w.current.wind_kph,
            wind_deg: weatherData.w.current.wind_degree,
            is_day: weatherData.w.current.is_day,
          } : null}
        />

        <div className="panel" role="complementary" aria-label="Данные о погоде">
          <div className="panel-inner" ref={panelRef}>
            {!weatherData ? (
              <div className="empty-state">
                <div className="empty-globe" aria-hidden="true">🌍</div>
                <h2>Выберите место</h2>
                <p>Кликните на карту, введите город или нажмите «Моё место» для автоопределения.</p>
                <Footer />
              </div>
            ) : (
              <>
                <WeatherPanel
                  w={weatherData.w}
                  owm={weatherData.owm}
                  hist={weatherData.hist}
                  lat={weatherData.lat}
                  lon={weatherData.lon}
                  heroRef={heroRef}
                />
                <button
                  className="hbtn"
                  data-no-export
                  style={{ marginTop: 8, width: '100%', justifyContent: 'center' }}
                  onClick={handleWidgetEmbed}
                >
                  <i className="fas fa-code" aria-hidden="true" />
                  <span>Получить код виджета</span>
                </button>
                <Footer />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <ToastProvider>
      <App />
    </ToastProvider>
  );
}

