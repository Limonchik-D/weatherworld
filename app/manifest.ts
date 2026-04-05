import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'WeatherWorld — Погода онлайн',
    short_name: 'WeatherWorld',
    description: 'Бесплатный прогноз погоды в любом городе мира. Интерактивная карта осадков, температуры и ветра.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0015',
    theme_color: '#1a0a2e',
    orientation: 'portrait-primary',
    categories: ['weather', 'utilities'],
    lang: 'ru',
    icons: [
      {
        src: '/icons/logo.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/logo.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icons/icon-192x192-maskable.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-512x512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
