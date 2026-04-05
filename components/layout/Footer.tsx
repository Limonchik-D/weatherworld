import Link from 'next/link';

const LEGAL_LINKS = [
  { href: '/legal/terms',        icon: '📋', label: 'Соглашение' },
  { href: '/legal/privacy',      icon: '🔒', label: 'Конфиденциальность' },
  { href: '/legal/advertising',  icon: '📢', label: 'Реклама' },
  { href: '/legal/contacts',     icon: '✉️', label: 'Контакты' },
] as const;

export default function Footer() {
  return (
    <footer className="site-footer" data-no-export>
      {/* Ad banner slot — replace with your Google AdSense / ad network code */}
      <div className="ad-slot" aria-label="Реклама">
        <span className="ad-label">Реклама</span>
        {/* INSERT AD CODE HERE — e.g. Google AdSense <ins className="adsbygoogle" .../> */}
      </div>

      <nav className="footer-links" aria-label="Правовая информация">
        {LEGAL_LINKS.map(({ href, icon, label }) => (
          <Link key={href} href={href} className="footer-link">
            <span className="footer-link-icon">{icon}</span>
            <span className="footer-link-label">{label}</span>
          </Link>
        ))}
      </nav>

      <p className="footer-copy">
        © {new Date().getFullYear()} WeatherWorld Pro &nbsp;·&nbsp; WeatherAPI.com, OpenWeatherMap
      </p>
    </footer>
  );
}
