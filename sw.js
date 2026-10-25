/* Next Up — offline-first SW (Home Screen / GitHub Pages HTTPS) */
const CACHE = 'nextup-v4';

const SHELL = [
  'index.html',
  'css/fonts.css',
  'css/styles.css',
  'js/app.js',
  'js/scheduler.js',
  'js/storage.js',
  'js/offline.js',
  'manifest.webmanifest',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
  'assets/icons/apple-touch-icon.png',
  'assets/icons/icon.svg',
  'assets/fonts/figtree-latin-400-normal.woff2',
  'assets/fonts/figtree-latin-500-normal.woff2',
  'assets/fonts/figtree-latin-600-normal.woff2',
  'assets/fonts/figtree-latin-700-normal.woff2',
  'assets/fonts/syne-latin-600-normal.woff2',
  'assets/fonts/syne-latin-700-normal.woff2',
  'assets/fonts/syne-latin-800-normal.woff2',
];

function toUrl(path) {
  return new URL(path, self.registration.scope).href;
}

async function putIndexAliases(cache, indexResponse) {
  if (!indexResponse) return;
  const targets = [toUrl('index.html'), toUrl('./'), toUrl(''), self.registration.scope];
  await Promise.all(targets.map((u) => cache.put(u, indexResponse.clone())));
}

async function precache() {
  const cache = await caches.open(CACHE);
  for (const path of SHELL) {
    const url = toUrl(path);
    try {
      const res = await fetch(url, { cache: 'reload' });
      if (res.ok) await cache.put(url, res);
    } catch {
      /* continue — don't fail the whole install */
    }
  }
  const index = await cache.match(toUrl('index.html'));
  await putIndexAliases(cache, index);
}

async function cachedShell() {
  const cache = await caches.open(CACHE);
  return (
    (await cache.match(toUrl('index.html'), { ignoreSearch: true })) ||
    (await cache.match(toUrl('./'), { ignoreSearch: true })) ||
    (await cache.match(self.registration.scope, { ignoreSearch: true }))
  );
}

async function matchAsset(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request, { ignoreSearch: true });
  if (hit) return hit;

  try {
    const url = new URL(request.url);
    const scope = new URL(self.registration.scope);
    if (url.origin !== scope.origin) return undefined;
    if (!url.pathname.startsWith(scope.pathname)) return undefined;
    let rel = url.pathname.slice(scope.pathname.length);
    if (rel.startsWith('/')) rel = rel.slice(1);
    if (!rel || rel.endsWith('/')) rel = `${rel}index.html`.replace(/^\//, '');
    return cache.match(toUrl(rel), { ignoreSearch: true });
  } catch {
    return undefined;
  }
}

function isNavigation(request) {
  if (request.mode === 'navigate') return true;
  const accept = request.headers.get('accept') || '';
  return request.destination === 'document' || accept.includes('text/html');
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'WARM_CACHE') {
    event.waitUntil(precache());
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      if (isNavigation(request)) {
        // Never wait on the network for navigations — offline cold start must be instant
        const shell = (await matchAsset(request)) || (await cachedShell());
        if (shell) return shell;

        try {
          const fresh = await fetch(request);
          if (fresh && fresh.ok) {
            const cache = await caches.open(CACHE);
            await cache.put(request, fresh.clone());
            await putIndexAliases(cache, fresh.clone());
          }
          return fresh;
        } catch {
          return new Response(
            `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Next Up</title>
<style>body{margin:0;min-height:100vh;font-family:system-ui;background:#e7f1ea;color:#10231c;padding:2rem;line-height:1.4}</style>
<h1>Next Up</h1>
<p>This install has no offline copy yet.</p>
<p>Open the site once over <strong>HTTPS</strong> (or localhost on this device), wait a moment, reload, then Add to Home Screen again.</p>
<p>Phone + <code>http://192.168…</code> cannot install a service worker, so offline Home Screen will stay blank.</p>`,
            { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        }
      }

      const cached = await matchAsset(request);
      if (cached) return cached;

      try {
        const fresh = await fetch(request);
        if (fresh && fresh.ok) {
          const cache = await caches.open(CACHE);
          await cache.put(request, fresh.clone());
        }
        return fresh;
      } catch {
        return new Response('', { status: 503, statusText: 'Offline' });
      }
    })()
  );
});
