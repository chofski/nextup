/* Next Up offline shell — cache app assets for home-screen / Capacitor use */
const CACHE = 'nextup-v2';
const ASSETS = [
  './',
  './index.html',
  './css/fonts.css',
  './css/styles.css',
  './js/app.js',
  './js/scheduler.js',
  './js/storage.js',
  './manifest.webmanifest',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/apple-touch-icon.png',
  './assets/icons/icon.svg',
  './assets/fonts/figtree-latin-400-normal.woff2',
  './assets/fonts/figtree-latin-500-normal.woff2',
  './assets/fonts/figtree-latin-600-normal.woff2',
  './assets/fonts/figtree-latin-700-normal.woff2',
  './assets/fonts/syne-latin-600-normal.woff2',
  './assets/fonts/syne-latin-700-normal.woff2',
  './assets/fonts/syne-latin-800-normal.woff2',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.ok && new URL(request.url).origin === self.location.origin) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
