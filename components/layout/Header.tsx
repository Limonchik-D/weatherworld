'use client';
import { useRef, useState, useEffect } from 'react';
import { fetchSearch, type SearchResult } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import InstallButton from '@/components/ui/InstallButton';

interface HeaderProps {
  updTime: string;
  onSearch: (lat: number, lon: number, name: string) => void;
  onGeo: () => void;
  onExport: (fmt: 'pdf' | 'jpg' | 'png') => void;
}

export default function Header({ updTime, onSearch, onGeo, onExport }: HeaderProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
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

  // Close export dropdown on outside click
  useEffect(() => {
    if (!exportOpen) return;
    const onOutside = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [exportOpen]);

  function hideAC() { setResults([]); }

  async function doSearch() {
    if (!query.trim()) return;
    hideAC();
    const coordMatch = /^(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)$/.exec(query.trim());
    if (coordMatch) {
      onSearch(+coordMatch[1], +coordMatch[2], query);
      return;
    }
    try {
      const data = await fetchSearch(query);
      if (data.length) {
        onSearch(data[0].lat, data[0].lon, data[0].name);
      } else {
        toast('Место не найдено', 'err');
      }
    } catch {
      toast('Ошибка поиска', 'err');
    }
  }

  return (
    <header role="banner">
      <div className="logo" aria-label="WeatherWorld Pro">
        <div className="logo-icon" aria-hidden="true">🌐</div>
        <span>WeatherWorld</span>
      </div>

      <div className="search-wrap" role="search">
        <input
          className="search-input"
          type="search"
          placeholder="Город, страна, координаты…"
          aria-label="Поиск города"
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); doSearch(); } }}
        />
        <button className="search-btn" aria-label="Искать" onClick={doSearch}>
          <i className="fas fa-search" aria-hidden="true" />
        </button>
        {results.length > 0 && (
          <div className="ac-list" role="listbox" aria-label="Подсказки">
            {results.map(it => (
              <div
                key={it.id}
                className="ac-item"
                role="option"
                tabIndex={0}
                onClick={() => { setQuery(it.name); hideAC(); onSearch(it.lat, it.lon, it.name); }}
                onKeyDown={e => { if (e.key === 'Enter') { setQuery(it.name); hideAC(); onSearch(it.lat, it.lon, it.name); } }}
              >
                <i className="fas fa-location-dot" aria-hidden="true" style={{ color: 'var(--purple2)', fontSize: '.75rem', flexShrink: 0 }} />
                {it.name}, {it.region}, {it.country}
              </div>
            ))}
          </div>
        )}
      </div>

      <button className="hbtn accent" id="geoBtn" aria-label="Моё местоположение" onClick={onGeo}>
        <i className="fas fa-location-crosshairs" aria-hidden="true" />
        <span className="hbtn-txt">Моё место</span>
      </button>

      <InstallButton />

      {/* Export dropdown */}
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
    </header>
  );
}
