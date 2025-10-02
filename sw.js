// Service Worker for NJC Song Book
const CACHE_NAME = 'njc-songbook-v3';
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
  // Take control immediately after install
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event
// - Network-first for navigations/HTML to avoid stale pages
// - Cache-first for other assets with background fill
self.addEventListener('fetch', event => {
  const request = event.request;

  const acceptsHtml = (request.headers.get('accept') || '').includes('text/html');
  if (request.mode === 'navigate' || acceptsHtml) {
    event.respondWith(
      fetch(request)
        .then(networkResponse => {
          // Optionally refresh the cached HTML
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put('/index.html', responseClone).catch(() => {});
          });
          return networkResponse;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // For non-HTML requests: try cache first, then network; fill cache when possible
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(networkResponse => {
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(request, responseClone).catch(() => {});
        });
        return networkResponse;
      });
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});
