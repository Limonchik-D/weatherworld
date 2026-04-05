import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'WeatherWorld Pro — Правовая информация',
};

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="legal-page">
      <header className="legal-header">
        <Link href="/" className="legal-back">
          ← WeatherWorld Pro
        </Link>
      </header>
      <main className="legal-content">{children}</main>
    </div>
  );
}
