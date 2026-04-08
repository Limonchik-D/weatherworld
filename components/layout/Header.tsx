'use client';
import { useRef, useState, useEffect, useCallback } from 'react';
import { fetchSearch, type SearchResult } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import InstallButton from '@/components/ui/InstallButton';

interface HeaderProps {
  updTime: string;
  onSearch: (lat: number, lon: number, name: string) => void;
  onGeo: () => void;
  onExport: (fmt: 'pdf' | 'jpg' | 'png') => void;
  selectedCity: { lat: number; lon: number; name: string } | null;
}

export default function Header({ updTime, onSearch, onGeo, onExport, selectedCity }: HeaderProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [exportOpen, setExportOpen] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [notifySubscribed, setNotifySubscribed] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const acTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const { toast } = useToast();

  useEffect(() => {
    clearTimeout(acTimer.current);
    if (query.length < 2) { setResults([]); return; }
    acTimer.current = setTimeout(async () => {
      const data = await fetchSearch(query);
      setResults(data.slice(0, 6));
    }, 320);
  }, [query]);

  // Restore subscribed state for the currently selected city
  useEffect(() => {
    if (!selectedCity) { setNotifySubscribed(false); return; }
    try {
      const stored = localStorage.getItem('ww-notify-city');
      if (stored) {
        const saved = JSON.parse(stored) as { lat: number; lon: number };
        setNotifySubscribed(
          Math.abs(saved.lat - selectedCity.lat) < 0.01 &&
          Math.abs(saved.lon - selectedCity.lon) < 0.01
        );
      } else {
        setNotifySubscribed(false);
      }
    } catch { setNotifySubscribed(false); }
  }, [selectedCity]);

  useEffect(() => {
    if (!exportOpen) return;
    const onOutside = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [exportOpen]);

  useEffect(() => {
    if (searchExpanded && inputRef.current) inputRef.current.focus();
  }, [searchExpanded]);

  // Close search on outside click
  useEffect(() => {
    if (!searchExpanded) return;
    const onOutside = (e: MouseEvent) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) {
        collapseSearch();
      }
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [searchExpanded]);

  function collapseSearch() {
    setSearchExpanded(false);
    setQuery('');
    setResults([]);
  }

  function hideAC() { setResults([]); }

  function selectResult(it: SearchResult) {
    setQuery(it.name);
    hideAC();
    collapseSearch();
    onSearch(it.lat, it.lon, it.name);
  }

  const handleNotify = useCallback(async () => {
    if (!selectedCity) return;
    if (!('Notification' in window)) {
      toast('Браузер не поддерживает уведомления', 'err');
      return;
    }

    // Unsubscribe if already subscribed
    if (notifySubscribed) {
      localStorage.removeItem('ww-notify-city');
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'UNSUBSCRIBE_WEATHER' });
      }
      setNotifySubscribed(false);
      toast('Уведомления отключены');
      return;
    }

    const perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      toast('Доступ к уведомлениям запрещён. Разрешите в настройках браузера', 'err');
      return;
    }

    const cityData = { lat: selectedCity.lat, lon: selectedCity.lon, name: selectedCity.name };
    localStorage.setItem('ww-notify-city', JSON.stringify(cityData));

    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg.active) {
        reg.active.postMessage({ type: 'SUBSCRIBE_WEATHER', city: cityData });
      }
      // Register periodic background sync if supported
      if ('periodicSync' in reg) {
        try {
          await (reg as ServiceWorkerRegistration & {
            periodicSync: { register: (tag: string, opts: object) => Promise<void> };
          }).periodicSync.register('weather-morning', { minInterval: 60 * 60 * 1000 });
        } catch { /* periodicSync not permitted – SW will still show notifications when app is open */ }
      }
    }

    setNotifySubscribed(true);
    toast(`Уведомления для ${selectedCity.name} настроены на 8:00 🔔`);
  }, [selectedCity, notifySubscribed, toast]);

  return (
    <header role="banner">
      <div className="logo" aria-label="WeatherWorld">
        <div className="logo-icon" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/logo_left.png" alt="" />
        </div>
        <span>WeatherWorld</span>
      </div>

      <div className={`search-wrap${searchExpanded ? ' search-expanded' : ''}`} role="search" ref={searchWrapRef}>
        {selectedCity && !searchExpanded && (
          <button
            className={`notify-pill${notifySubscribed ? ' notify-pill--on' : ''}`}
            aria-label={notifySubscribed ? 'Отключить уведомления' : 'Уведомлять в 8:00'}
            onClick={handleNotify}
            title={notifySubscribed ? `Уведомления для ${selectedCity.name} включены` : `Подписаться на уведомления для ${selectedCity.name}`}
          >
            <i className={`fas ${notifySubscribed ? 'fa-bell-slash' : 'fa-bell'}`} aria-hidden="true" />
          </button>
        )}
        <div className="search-inner">
          {!searchExpanded ? (
            <button
              className="search-pill-btn"
              aria-label="Открыть поиск"
              onClick={() => setSearchExpanded(true)}
            >
              <i className="fas fa-magnifying-glass" aria-hidden="true" />
              <span className="search-pill-ph">Поиск города…</span>
            </button>
          ) : (
            <div className="search-field">
              <i className="fas fa-magnifying-glass search-field-icon" aria-hidden="true" />
              <input
                ref={inputRef}
                className="search-input"
                type="search"
                placeholder="Город, страна, координаты…"
                aria-label="Поиск города"
                autoComplete="off"
                spellCheck={false}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (results.length) selectResult(results[0]);
                    else {
                      const coordMatch = /^(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)$/.exec(query.trim());
                      if (coordMatch) { collapseSearch(); onSearch(+coordMatch[1], +coordMatch[2], query); }
                      else toast('Место не найдено', 'err');
                    }
                  }
                  if (e.key === 'Escape') collapseSearch();
                  if (e.key === 'Tab' && results.length) { e.preventDefault(); selectResult(results[0]); }
                }}
              />
              <button className="search-clear-btn" aria-label="Закрыть поиск" onClick={collapseSearch}>
                <i className="fas fa-xmark" aria-hidden="true" />
              </button>
            </div>
          )}
          {/* Single inline suggestion — only show first result */}
          {results.length > 0 && searchExpanded && (
            <button
              className="ac-suggestion"
              role="option"
              aria-selected="false"
              onClick={() => selectResult(results[0])}
            >
              <i className="fas fa-location-dot" aria-hidden="true" />
              <span className="ac-suggestion-text">
                {results[0].name}
                {results[0].region ? `, ${results[0].region}` : ''}
                {results[0].country ? `, ${results[0].country}` : ''}
              </span>
              <span className="ac-suggestion-hint">
                {results.length > 1 ? `+${results.length - 1}` : '↵'}
              </span>
            </button>
          )}
        </div>
      </div>

      <div className="header-actions">
        <button className="hbtn accent" id="geoBtn" aria-label="Моё местоположение" onClick={onGeo}>
          <i className="fas fa-location-crosshairs" aria-hidden="true" />
          <span className="hbtn-txt">Моё место</span>
        </button>

        <InstallButton />

        <div className="export-wrap" ref={exportRef}>
          <button className="hbtn" aria-label="Скачать" onClick={() => setExportOpen(v => !v)}>
            <i className="fas fa-download" aria-hidden="true" />
            <span className="hbtn-txt">Скачать</span>
            <i className="fas fa-chevron-down" aria-hidden="true" style={{ fontSize: '.6rem', marginLeft: 2, opacity: .6 }} />
          </button>
          {exportOpen && (
            <div className="export-menu" role="menu">
              {([
                { fmt: 'pdf', icon: 'fa-file-pdf',   label: 'PDF документ' },
                { fmt: 'jpg', icon: 'fa-file-image',  label: 'JPG изображение' },
                { fmt: 'png', icon: 'fa-file-image',  label: 'PNG изображение' },
              ] as const).map(({ fmt, icon, label }) => (
                <button
                  key={fmt}
                  className="export-item"
                  role="menuitem"
                  onClick={() => { setExportOpen(false); onExport(fmt); }}
                >
                  <i className={`fas ${icon}`} aria-hidden="true" />
                  <span>{label}</span>
                  <span className="export-badge">{fmt.toUpperCase()}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="refresh-badge" aria-live="polite">
          <div className="refresh-dot" />
          <span>{updTime || '—'}</span>
        </div>
      </div>
    </header>
  );
}
