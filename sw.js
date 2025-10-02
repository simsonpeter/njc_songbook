// Service Worker for NJC Song Book
const CACHE_NAME = 'njc-songbook-v3-2025-10-02';
const urlsToCache = [
  '/',
  '/index.html',
  'https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js',
  'https://www.gstatic.com/firebasejs/8.10.0/firebase-firestore.js',
  'https://www.gstatic.com/firebasejs/8.10.0/firebase-auth.js',
  'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/sql-wasm.js'
];

// Install event - cache resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', event => {
  const request = event.request;

  // Network-first for navigations (HTML) to avoid stale deployments
  if (request.mode === 'navigate' || (request.method === 'GET' && request.headers.get('accept') && request.headers.get('accept').includes('text/html'))) {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(request, { cache: 'no-store' });
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, networkResponse.clone());
          return networkResponse;
        } catch (err) {
          const cached = await caches.match(request);
          if (cached) return cached;
          // Fallback to cached index.html if available
          return caches.match('/index.html');
        }
      })()
    );
    return;
  }

  // Cache-first for other requests (assets)
  event.respondWith(
    caches.match(request).then(response => response || fetch(request))
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
      await self.clients.claim();
    })()
  );
});

// Allow the page to trigger skipWaiting on updated SW
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
