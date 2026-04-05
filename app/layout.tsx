import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin', 'cyrillic'], display: 'swap' });

const BASE_URL = 'https://weatherworld.app';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'WeatherWorld — Погода онлайн',
    template: '%s | WeatherWorld',
  },
  description:
    'Бесплатный прогноз погоды в любом городе мира. Интерактивная карта осадков, температуры и ветра. Почасовой и 7-дневный прогноз, качество воздуха, астрономические данные.',
  keywords: [
    'погода', 'прогноз погоды', 'погода онлайн', 'погода сегодня',
    'карта погоды', 'осадки', 'температура', 'ветер', 'качество воздуха',
    'прогноз на неделю', 'weather', 'forecast', 'погода на завтра',
    'погода на неделю', 'погода в городе', 'точный прогноз',
  ],
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    url: BASE_URL,
    siteName: 'WeatherWorld',
    title: 'WeatherWorld — Погода онлайн',
    description: 'Бесплатный прогноз погоды в любом городе. Интерактивная карта осадков, ветра, температуры. Почасовой и 7-дневный прогноз, AQI, астрономические данные.',
    images: [{ url: `${BASE_URL}/icons/icon-512x512.png`, width: 512, height: 512, alt: 'WeatherWorld' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WeatherWorld — Погода онлайн',
    description: 'Бесплатный прогноз погоды в любом городе. Карта осадков, ветра и температуры.',
    images: [`${BASE_URL}/icons/icon-512x512.png`],
  },
  alternates: { canonical: BASE_URL },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large' } },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#1a0a2e',
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'WeatherWorld',
  url: BASE_URL,
  description: 'Бесплатный прогноз погоды в любом городе мира',
  applicationCategory: 'WeatherApplication',
  operatingSystem: 'Web',
  inLanguage: 'ru',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'RUB' },
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: `${BASE_URL}/?q={search_term_string}` },
    'query-input': 'required name=search_term_string',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"
        />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"
        />
        {/* PWA — Apple */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="WeatherWorld" />
        <link rel="apple-touch-icon" href="/icons/logo.png" />
        <link rel="icon" href="/icons/logo.png" type="image/png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={inter.className}>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js')})}`,
          }}
        />
      </body>
    </html>
  );
}

