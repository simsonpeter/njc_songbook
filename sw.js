// Service Worker for NJC Song Book
const CACHE_VERSION = 'v3';
const APP_SHELL_CACHE = `njc-songbook-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `njc-songbook-runtime-${CACHE_VERSION}`;

const APP_SHELL = [
  '/',
  '/index.html',
  '/db.js',
  '/sw.js',
  '/manifest.webmanifest',
  // External libraries needed for offline operation after first install
  'https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js',
  'https://www.gstatic.com/firebasejs/8.10.0/firebase-firestore.js',
  'https://www.gstatic.com/firebasejs/8.10.0/firebase-auth.js',
  'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/sql-wasm.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          if (key !== APP_SHELL_CACHE && key !== RUNTIME_CACHE) {
            return caches.delete(key);
          }
        })
      );
      await self.clients.claim();
    })()
  );
});

function staleWhileRevalidate(request, cacheName) {
  return caches.open(cacheName).then(async (cache) => {
    const cached = await cache.match(request);
    const networkFetch = fetch(request)
      .then((response) => {
        if (response && response.status === 200) {
          cache.put(request, response.clone());
        }
        return response;
      })
      .catch(() => cached);
    return cached || networkFetch;
  });
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const acceptHeader = request.headers.get('accept') || '';
  const isHTMLRequest = request.mode === 'navigate' || acceptHeader.includes('text/html');

  if (isHTMLRequest) {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(request);
          const cache = await caches.open(APP_SHELL_CACHE);
          // Always update the cached index so UI stays fresh when online
          cache.put('/index.html', networkResponse.clone());
          return networkResponse;
        } catch (err) {
          const cached = await caches.match('/index.html');
          return cached || new Response('You are offline.', { status: 503, statusText: 'Offline' });
        }
      })()
    );
    return;
  }

  const url = new URL(request.url);
  // Same-origin assets: stale-while-revalidate
  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
    return;
  }

  // Third-party assets: stale-while-revalidate as well
  event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
});

// Optional: allow page to trigger immediate activation
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
