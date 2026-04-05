'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { fetchCurrent } from '@/lib/api';
import { wIcon, escHtml } from '@/lib/utils';
import WeatherParticles from './WeatherParticles';

interface MapBoardProps {
  onLocationPick: (lat: number, lon: number, name: string) => void;
  markerPos: { lat: number; lon: number } | null;
  /** Current weather data for particle effects */
  currentWeather?: {
    precip_mm: number;
    condition_code: number;
    wind_kph: number;
    wind_deg: number;
    is_day: 0 | 1;
  } | null;
}

export default function MapBoard({ onLocationPick, markerPos, currentWeather }: MapBoardProps) {
  const mapRef = useRef<import('leaflet').Map | null>(null);
  const markerRef = useRef<import('leaflet').Marker | null>(null);
  const activeLayerRef = useRef<import('leaflet').TileLayer | null>(null);
  const radarLayersRef = useRef<import('leaflet').TileLayer[]>([]);
  const radarTimerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const fallbackRef = useRef(false);
  const lightBaseRef = useRef(false); // true when using light OSM tiles
  const [activeLayer, setActiveLayer] = useState<string>('none');
  const [radarFrames, setRadarFrames] = useState<string[]>([]);
  const [radarIdx, setRadarIdx] = useState(0);
  const [radarPlaying, setRadarPlaying] = useState(false);
  const [waqiMarkers, setWaqiMarkers] = useState<import('leaflet').Marker[]>([]);
  const [waqiLoading, setWaqiLoading] = useState(false);
  const [waqiInfoVisible, setWaqiInfoVisible] = useState(false);
  const waqiInfoRef = useRef<HTMLDivElement>(null);
  // Weather at last clicked map point — drives particles before a full location is loaded
  const [liveWeather, setLiveWeather] = useState<{
    precip_mm: number; condition_code: number;
    wind_kph: number; wind_deg: number; is_day: 0 | 1;
  } | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;

    (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled) return;

      const map = L.map(containerRef.current!, {
        zoomControl: true,
        attributionControl: false,
      }).setView([30, 10], 2);

      mapRef.current = map;

      // Isolated pane for OWM overlay tiles — mix-blend-mode applied here, NOT on base tiles
      const owmPane = map.createPane('owmPane');
      owmPane.style.zIndex = '400';
      owmPane.style.pointerEvents = 'none';

      // Primary dark tiles with OSM fallback
      const primary = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_matter/{z}/{x}/{y}{r}.png',
        { maxZoom: 19 },
      );
      primary.on('tileerror', () => {
        if (!fallbackRef.current) {
          fallbackRef.current = true;
          lightBaseRef.current = true; // switched to light OSM
          map.removeLayer(primary);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap',
          }).addTo(map);
          // Update pane blend mode for existing OWM layer
          const paneEl = map.getPane('owmPane') as HTMLElement | undefined;
          if (paneEl) paneEl.style.mixBlendMode = 'multiply';
        }
      });
      primary.addTo(map);
      // Successful dark tile load — confirm dark mode
      primary.once('tileload', () => { lightBaseRef.current = false; });
      L.control.attribution({ prefix: false, position: 'bottomleft' }).addTo(map);

      // Fix: Leaflet may not know container size on mount
      setTimeout(() => map.invalidateSize(), 250);

      // Click handler
      map.on('click', async (e) => {
        const { lat, lng } = e.latlng;
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const d = await fetchCurrent(lat, lng) as any;
          const em = wIcon(d.current.condition.code, d.current.is_day);
          const hasPng = d.current.condition.icon;
          const iconHtml = hasPng
            ? `<img src="https:${hasPng}" width="40" height="40" alt="${escHtml(d.current.condition.text)}" loading="lazy">`
            : `<span style="font-size:2rem">${em}</span>`;

          const pLat: number = d.location.lat;
          const pLon: number = d.location.lon;
          const pName: string = d.location.name;

          const popup = L.popup({ className: 'wp' })
            .setLatLng(e.latlng)
            .setContent(`
              <div class="mp-title">${escHtml(d.location.name)}, ${escHtml(d.location.country)}</div>
              <div style="display:flex;align-items:center;gap:10px">
                ${iconHtml}
                <div>
                  <div class="mp-temp">${Math.round(d.current.temp_c)}°C</div>
                  <div class="mp-desc">${escHtml(d.current.condition.text)}</div>
                </div>
              </div>
              <button class="mp-btn" id="_popupBtn">Подробнее →</button>
            `);
          // Update live particles immediately from popup data
          setLiveWeather({
            precip_mm: d.current.precip_mm ?? 0,
            condition_code: d.current.condition.code,
            wind_kph: d.current.wind_kph ?? 0,
            wind_deg: d.current.wind_deg ?? 0,
            is_day: d.current.is_day,
          });

          popup.openOn(map);
          document.getElementById('_popupBtn')?.addEventListener('click', () => {
            onLocationPick(pLat, pLon, pName);
            map.closePopup();
          });
        } catch { /* silent */ }
      });
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update marker when location changes
  useEffect(() => {
    if (!markerPos || !mapRef.current) return;
    (async () => {
      const L = (await import('leaflet')).default;
      const map = mapRef.current!;
      if (markerRef.current) map.removeLayer(markerRef.current);
      markerRef.current = L.marker([markerPos.lat, markerPos.lon], {
        icon: L.divIcon({
          className: '',
          html: `<div style="width:28px;height:28px;background:linear-gradient(135deg,#a855f7,#e879f9);border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 0 16px rgba(168,85,247,.7);font-size:13px;border:2px solid rgba(255,255,255,.3)">📍</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        }),
      }).addTo(map);
      map.setView([markerPos.lat, markerPos.lon], 10, { animate: true, duration: 0.7 });
    })();
  }, [markerPos]);

  // ─── OWM / Radar layer toggle ───
  function toggleLayer(type: string) {
    (async () => {
      const L = (await import('leaflet')).default;
      const map = mapRef.current;
      if (!map) return;

      // Remove OWM tile layer
      if (activeLayerRef.current) { map.removeLayer(activeLayerRef.current); activeLayerRef.current = null; }

      // Clear radar when switching away from it
      if (type !== 'radar') clearRadar();

      setActiveLayer(type);
      if (type === 'none') return;
      if (type === 'radar') { loadRadar(); return; }

      const opacities: Record<string, number> = {
        precip: 0.88,
        temp:   0.82,
        wind:   0.80,
        clouds: 0.78,
      };
      const urls: Record<string, string> = {
        precip: `/api/owm?type=precipitation_new&z={z}&x={x}&y={y}`,
        temp:   `/api/owm?type=temp_new&z={z}&x={x}&y={y}`,
        wind:   `/api/owm?type=wind_new&z={z}&x={x}&y={y}`,
        clouds: `/api/owm?type=clouds_new&z={z}&x={x}&y={y}`,
      };
      if (urls[type]) {
        // Set per-layer filter directly on the pane (isolated from base tiles)
        const paneEl = map.getPane('owmPane') as HTMLElement | undefined;
        if (paneEl) {
          const isLight = lightBaseRef.current;
          // screen blends well on dark maps; multiply on light (OSM)
          paneEl.style.mixBlendMode = isLight ? 'multiply' : 'screen';
          const paneFilters: Record<string, string> = {
            precip: isLight
              ? 'saturate(4) brightness(0.85) contrast(1.4)'
              : 'saturate(3.5) brightness(1.7) contrast(1.3)',
            temp:   isLight
              ? 'saturate(3.5) brightness(0.9) contrast(1.35)'
              : 'saturate(3) brightness(1.65) contrast(1.25)',
            wind:   isLight
              ? 'saturate(4) brightness(0.85) contrast(1.4)'
              : 'saturate(3.5) brightness(1.7) contrast(1.3)',
            clouds: isLight
              ? 'saturate(2) brightness(0.75) contrast(1.2)'
              : 'saturate(2.5) brightness(1.6) contrast(1.15)',
          };
          paneEl.style.filter = paneFilters[type] ?? 'saturate(2.5) brightness(1.4)';
        }
        activeLayerRef.current = L.tileLayer(urls[type], {
          pane: 'owmPane',
          opacity: opacities[type] ?? 0.85,
          maxZoom: 19,
        }).addTo(map);
      }
    })();
  }

  // ─── RainViewer animated radar ───
  const loadRadar = useCallback(async () => {
    const L = (await import('leaflet')).default;
    const map = mapRef.current;
    if (!map) return;
    try {
      const res = await fetch('/api/rainviewer?action=frames');
      if (!res.ok) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = await res.json() as any;
      const past: string[] = data?.radar?.past?.map((f: { path: string }) => f.path) ?? [];
      const nowcast: string[] = data?.radar?.nowcast?.map((f: { path: string }) => f.path) ?? [];
      const frames = [...past, ...nowcast].slice(-8);
      if (!frames.length) return;

      setRadarFrames(frames);
      setRadarIdx(frames.length - 1);

      radarLayersRef.current.forEach(l => map.removeLayer(l));
      radarLayersRef.current = frames.map(path =>
        L.tileLayer(
          `/api/rainviewer?action=tile&path=${encodeURIComponent(path)}&z={z}&x={x}&y={y}&color=3&smooth=1&snow=1`,
          { opacity: 0, maxZoom: 19, className: 'radar-layer' },
        ).addTo(map)
      );
      // Show last frame
      radarLayersRef.current[frames.length - 1]?.setOpacity(0.78);
      setRadarPlaying(true);
    } catch { /* silent */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Animate radar frames
  useEffect(() => {
    if (!radarPlaying || radarFrames.length === 0) {
      clearInterval(radarTimerRef.current);
      return;
    }
    radarTimerRef.current = setInterval(() => {
      setRadarIdx(prev => {
        const next = (prev + 1) % radarFrames.length;
        radarLayersRef.current[prev]?.setOpacity(0);
        radarLayersRef.current[next]?.setOpacity(0.78);
        return next;
      });
    }, 600);
    return () => clearInterval(radarTimerRef.current);
  }, [radarPlaying, radarFrames]);

  function clearRadar() {
    setRadarPlaying(false);
    setRadarFrames([]);
    clearInterval(radarTimerRef.current);
    const map = mapRef.current;
    if (map) {
      radarLayersRef.current.forEach(l => map.removeLayer(l));
      radarLayersRef.current = [];
    }
  }

  // Close WAQI info popover on outside click
  useEffect(() => {
    if (!waqiInfoVisible) return;
    const onOutside = (e: MouseEvent) => {
      if (waqiInfoRef.current && !waqiInfoRef.current.contains(e.target as Node)) {
        setWaqiInfoVisible(false);
      }
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [waqiInfoVisible]);

  // ─── WAQI air quality station markers ───
  async function toggleWaqi() {
    if (waqiLoading) return;
    const L = (await import('leaflet')).default;
    const map = mapRef.current;
    if (!map) return;

    if (waqiMarkers.length > 0) {
      waqiMarkers.forEach(m => map.removeLayer(m));
      setWaqiMarkers([]);
      return;
    }

    setWaqiLoading(true);
    try {
      const b = map.getBounds();
      const bbox = `${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()}`;
      const res = await fetch(`/api/waqi?bounds=${encodeURIComponent(bbox)}`);
      if (!res.ok) { setWaqiLoading(false); return; }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = await res.json() as any;
      if (data.status !== 'ok') { setWaqiLoading(false); return; }

      const aqiColor = (aqi: number) => {
        if (aqi <= 50)  return '#34d399';
        if (aqi <= 100) return '#fbbf24';
        if (aqi <= 150) return '#fb923c';
        if (aqi <= 200) return '#f87171';
        if (aqi <= 300) return '#c084fc';
        return '#f43f5e';
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newMarkers: import('leaflet').Marker[] = (data.data as any[]).reduce<import('leaflet').Marker[]>((acc, s) => {
        const aqi = typeof s.aqi === 'number' ? s.aqi : parseInt(s.aqi);
        if (isNaN(aqi) || aqi < 0) return acc;
        const color = aqiColor(aqi);
        const m = L.marker([s.lat, s.lon], {
          icon: L.divIcon({
            className: '',
            html: `<div style="width:32px;height:32px;background:${color};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#000;border:2px solid rgba(255,255,255,.5);box-shadow:0 2px 8px rgba(0,0,0,.4)">${aqi}</div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          }),
        }).addTo(map).bindPopup(
          `<div class="mp-title">${escHtml(s.station?.name ?? 'AQI Station')}</div>
           <div style="font-size:1.4rem;font-weight:700;color:${color}">AQI: ${aqi}</div>`
        );
        acc.push(m);
        return acc;
      }, []);

      setWaqiMarkers(newMarkers);
    } catch { /* silent */ } finally {
      setWaqiLoading(false);
    }
  }

  const LAYER_META: Record<string, { badge: string; color: string }> = {
    precip: { badge: '🌧 Осадки',  color: '#60a5fa' },
    temp:   { badge: '🌡 Темп',    color: '#fb923c' },
    wind:   { badge: '💨 Ветер',   color: '#a3e635' },
    clouds: { badge: '☁️ Облака',  color: '#94a3b8' },
    radar:  { badge: '📡 Радар',   color: '#e879f9' },
  };

  return (
    <div className={`map-wrap${activeLayer !== 'none' ? ` map-layer-${activeLayer}` : ''}`}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} role="application" aria-label="Интерактивная карта погоды" />

      {/* Weather particle effects — currentWeather (loaded location) takes priority over liveWeather (last click) */}
      {(currentWeather ?? liveWeather) && (
        <WeatherParticles
          precipMm={(currentWeather ?? liveWeather)!.precip_mm}
          conditionCode={(currentWeather ?? liveWeather)!.condition_code}
          windKph={(currentWeather ?? liveWeather)!.wind_kph}
          windDeg={(currentWeather ?? liveWeather)!.wind_deg}
          isDay={(currentWeather ?? liveWeather)!.is_day}
        />
      )}

      {/* Active layer badge */}
      {activeLayer !== 'none' && LAYER_META[activeLayer] && (
        <div className="map-layer-badge" style={{ borderColor: LAYER_META[activeLayer].color, color: LAYER_META[activeLayer].color }}>
          {LAYER_META[activeLayer].badge}
        </div>
      )}

      {/* Radar frame counter + play/pause */}
      {activeLayer === 'radar' && radarFrames.length > 0 && (
        <div className="radar-counter">
          <button className="radar-play-btn" onClick={() => setRadarPlaying(v => !v)} aria-label={radarPlaying ? 'Пауза' : 'Воспроизвести'}>
            {radarPlaying ? '⏸' : '▶'}
          </button>
          <span>{radarIdx + 1}/{radarFrames.length}</span>
          <span className="radar-label">{radarIdx < radarFrames.length - 3 ? '🕐 прошлое' : '🔮 прогноз'}</span>
        </div>
      )}

      <div className="map-controls" role="group" aria-label="Слои карты">
        <div className="map-row">
          {[
            { k: 'precip', label: '🌧 Осадки' },
            { k: 'temp',   label: '🌡 Темп' },
            { k: 'wind',   label: '💨 Ветер' },
            { k: 'clouds', label: '☁️ Облака' },
            { k: 'radar',  label: '📡 Радар' },
            { k: 'none',   label: '✕' },
          ].map(({ k, label }) => (
            <button
              key={k}
              className={`mc-btn${activeLayer === k ? ' mc-btn--on' : ''}`}
              onClick={() => toggleLayer(k)}
              aria-label={label}
              aria-pressed={activeLayer === k}
            >
              {label}
            </button>
          ))}
        </div>
        {/* WAQI stations toggle + info popover */}
        <div className="map-row waqi-row" ref={waqiInfoRef}>
          <button
            className={`mc-btn mc-btn--wide${waqiMarkers.length > 0 ? ' mc-btn--on' : ''}${waqiLoading ? ' mc-btn--loading' : ''}`}
            onClick={toggleWaqi}
            disabled={waqiLoading}
            aria-label="Показать станции качества воздуха"
            aria-pressed={waqiMarkers.length > 0}
          >
            {waqiLoading ? <span className="waqi-spin">⌛</span> : '🌿'}
            {waqiLoading ? ' Загрузка…' : ' AQI станции'}
          </button>
          <button
            className="mc-btn waqi-info-btn"
            onClick={() => setWaqiInfoVisible(v => !v)}
            aria-label="Что такое AQI?"
            aria-expanded={waqiInfoVisible}
          >
            ⓘ
          </button>
          {waqiInfoVisible && (
            <div className="waqi-info-pop" role="tooltip">
              <div className="waqi-info-title">🌿 Индекс качества воздуха</div>
              <div className="waqi-info-desc">Кнопка показывает цветные маркеры станций измерения воздуха на карте.</div>
              {([
                { r: '0–50',   c: '#34d399', l: 'Хорошее' },
                { r: '51–100', c: '#fbbf24', l: 'Умеренное' },
                { r: '101–150', c: '#fb923c', l: 'Вредно (уязвимые)' },
                { r: '151–200', c: '#f87171', l: 'Вредно для всех' },
                { r: '201–300', c: '#c084fc', l: 'Очень вредное' },
                { r: '300+',   c: '#f43f5e', l: 'Опасное' },
              ] as const).map(({ r, c, l }) => (
                <div key={r} className="waqi-leg-row">
                  <span className="waqi-dot" style={{ background: c }} />
                  <span className="waqi-range">{r}</span>
                  <span className="waqi-lbl">{l}</span>
                </div>
              ))}
              <div className="waqi-tip">💡 Приблизьте карту для лучшего результата</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
