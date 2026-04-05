'use client';
import { useEffect, useState } from 'react';

export default function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [out, setOut] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setOut(true), 1400);
    const t2 = setTimeout(() => setVisible(false), 1950);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (!visible) return null;

  return (
    <div className={`splash${out ? ' splash-out' : ''}`} role="status" aria-label="Загрузка приложения" aria-live="polite">
      <div className="splash-rings" aria-hidden="true">
        <div className="splash-ring r1" />
        <div className="splash-ring r2" />
        <div className="splash-ring r3" />
      </div>
      <div className="splash-logo" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/logo.png" alt="" width={80} height={80} />
      </div>
      <p className="splash-name">WeatherWorld</p>
      <p className="splash-sub">Погода онлайн</p>
    </div>
  );
}
