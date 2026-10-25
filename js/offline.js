/**
 * Registers the service worker, warms the cache, and explains when
 * offline Home Screen cannot work (insecure http://LAN origins).
 */
(function () {
  const CACHE = 'nextup-v4';
  const ASSETS = [
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

  function showBanner(message, tone) {
    if (document.getElementById('offlineBanner')) return;
    const el = document.createElement('div');
    el.id = 'offlineBanner';
    el.setAttribute('role', 'status');
    el.style.cssText = [
      'position:sticky',
      'top:0',
      'z-index:100',
      'padding:0.75rem 1rem',
      'font:600 0.88rem/1.35 Figtree,system-ui,sans-serif',
      tone === 'bad'
        ? 'background:#3b1414;color:#ffe8e8'
        : 'background:#0c3b2e;color:#d4ff4a',
    ].join(';');
    el.textContent = message;
    const mount = () => {
      if (document.body) document.body.prepend(el);
      else document.addEventListener('DOMContentLoaded', () => document.body.prepend(el));
    };
    mount();
  }

  async function warmCache() {
    if (!('caches' in window)) return false;
    const cache = await caches.open(CACHE);
    let ok = 0;
    await Promise.all(
      ASSETS.map(async (path) => {
        const url = new URL(path, document.baseURI).href;
        try {
          const res = await fetch(url, { cache: 'reload' });
          if (!res.ok) return;
          await cache.put(url, res.clone());
          ok += 1;
        } catch {
          /* ignore */
        }
      })
    );

    const indexUrl = new URL('index.html', document.baseURI).href;
    const indexRes = await cache.match(indexUrl);
    if (indexRes) {
      const base = new URL('./', document.baseURI).href;
      await cache.put(base, indexRes.clone());
      await cache.put(document.baseURI, indexRes.clone());
    }
    return ok > 0;
  }

  function insecureLanHttp() {
    if (window.isSecureContext) return false;
    const host = location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') return false;
    return location.protocol === 'http:';
  }

  if (insecureLanHttp()) {
    showBanner(
      'Offline Home Screen needs HTTPS (or localhost on this device). http://192.168… cannot cache the app — use GitHub Pages or an HTTPS tunnel before Add to Home Screen.',
      'bad'
    );
    return;
  }

  if (!('serviceWorker' in navigator)) {
    showBanner('This browser cannot install a service worker, so offline Home Screen will not work.', 'bad');
    return;
  }

  navigator.serviceWorker
    .register('./sw.js', { scope: './', updateViaCache: 'none' })
    .then(async (reg) => {
      await navigator.serviceWorker.ready;
      await warmCache();
      if (reg.active) reg.active.postMessage({ type: 'WARM_CACHE' });

      // First visit installs the SW but may not control this page yet.
      // Reload once so Add to Home Screen captures a controlled page.
      if (!navigator.serviceWorker.controller && !sessionStorage.getItem('nextup-sw-reloaded')) {
        sessionStorage.setItem('nextup-sw-reloaded', '1');
        location.reload();
        return;
      }

      if (navigator.serviceWorker.controller) {
        document.documentElement.dataset.offlineReady = '1';
      }
    })
    .catch(() => {
      showBanner('Could not register offline support. Check that you are on HTTPS.', 'bad');
    });
})();
