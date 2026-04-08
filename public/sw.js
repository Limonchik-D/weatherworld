/// <reference lib="webworker" />

const CACHE_NAME = 'ww-v4';
const OFFLINE_URL = '/offline';
const SUBSCRIPTION_CACHE = 'ww-subscriptions';
const SUBSCRIPTION_KEY = '/sw/weather-subscription';

const PRECACHE_URLS = [
  '/',
  '/offline',
  '/icons/logo.png',
  '/icons/icon-192x192-maskable.png',
  '/icons/icon-512x512-maskable.png',
];

// Install — precache critical assets
// NOTE: skipWaiting is NOT called here to prevent auto-reload when user is actively using the app.
// The main thread sends a SKIP_WAITING message when the user confirms the update.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME && k !== SUBSCRIPTION_CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Messages from main thread
self.addEventListener('message', (event) => {
  if (!event.data) return;

  switch (event.data.type) {
    // User confirmed update — activate the new SW and let main thread reload
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    // User subscribed to morning notifications for a city
    case 'SUBSCRIBE_WEATHER': {
      const city = event.data.city;
      if (!city) break;
      caches.open(SUBSCRIPTION_CACHE).then((cache) => {
        cache.put(
          SUBSCRIPTION_KEY,
          new Response(JSON.stringify(city), { headers: { 'Content-Type': 'application/json' } }),
        );
      });
      break;
    }

    // User unsubscribed
    case 'UNSUBSCRIBE_WEATHER':
      caches.open(SUBSCRIPTION_CACHE).then((cache) => cache.delete(SUBSCRIPTION_KEY));
      break;
  }
});

// Fetch strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin GET requests
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // API requests — Network First
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Static assets (icons, images, fonts, CSS, JS) — Cache First
  if (
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/_next/static/') ||
    /\.(svg|png|jpg|jpeg|webp|woff2?|css|js)$/.test(url.pathname)
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            return res;
          })
      )
    );
    return;
  }

  // HTML pages — Network First with offline fallback
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return res;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match(OFFLINE_URL)))
    );
    return;
  }
});

// ── Morning weather notifications ────────────────────────────────────────────

async function sendMorningWeather() {
  try {
    const subCache = await caches.open(SUBSCRIPTION_CACHE);
    const stored = await subCache.match(SUBSCRIPTION_KEY);
    if (!stored) return;

    const city = await stored.json();
    const now = new Date();
    const hour = now.getHours();

    // Only fire between 07:45 – 08:30 local device time
    if (hour < 7 || hour > 8 || (hour === 8 && now.getMinutes() > 30)) return;

    // Prevent duplicate notification for the same morning
    const lastKey = '/sw/last-notify-date';
    const todayStr = now.toISOString().slice(0, 10);
    const lastCache = await caches.open(SUBSCRIPTION_CACHE);
    const lastResp = await lastCache.match(lastKey);
    if (lastResp) {
      const lastDate = await lastResp.text();
      if (lastDate === todayStr) return; // Already sent today
    }

    // Fetch current weather
    const weatherResp = await fetch(`/api/weather?lat=${city.lat}&lon=${city.lon}&type=forecast`);
    if (!weatherResp.ok) return;

    const data = await weatherResp.json();
    const w = data.w;
    if (!w?.current) return;

    const temp = Math.round(w.current.temp_c);
    const day = w.forecast?.forecastday?.[0]?.day;
    const tempMin = day?.mintemp_c != null ? Math.round(day.mintemp_c) : null;
    const tempMax = day?.maxtemp_c != null ? Math.round(day.maxtemp_c) : null;
    const condition = w.current.condition?.text ?? '';

    const rangeStr = tempMin !== null && tempMax !== null
      ? `↓${tempMin}° · ↑${tempMax}°`
      : '';
    const body = [rangeStr, condition].filter(Boolean).join('\n');

    await self.registration.showNotification(`${city.name}: ${temp}°C`, {
      body,
      icon: '/icons/logo.png',
      badge: '/icons/logo.png',
      tag: 'weather-morning',
      renotify: false,
      silent: false,
    });

    // Mark today as done
    await lastCache.put(lastKey, new Response(todayStr, { headers: { 'Content-Type': 'text/plain' } }));
  } catch (e) {
    console.error('[SW] Morning weather notification failed:', e);
  }
}

// Periodic Background Sync (Chrome/Android, when granted)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'weather-morning') {
    event.waitUntil(sendMorningWeather());
  }
});

// Web Push (future VAPID support)
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.title || 'WeatherWorld', {
        body: data.body || '',
        icon: '/icons/logo.png',
        badge: '/icons/logo.png',
        data: data.url ? { url: data.url } : undefined,
      }),
    );
  } catch { /* malformed push payload */ }
});

// Open app when notification is tapped
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    }),
  );
});

