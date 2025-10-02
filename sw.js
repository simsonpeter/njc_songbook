// Service Worker for NJC Song Book
const CACHE_NAME = 'njc-songbook-v4';
const urlsToCache = [
  '/',
  '/index.html',
  '/db.js',
  '/sw.js',
  'https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js',
  'https://www.gstatic.com/firebasejs/8.10.0/firebase-firestore.js',
  'https://www.gstatic.com/firebasejs/8.10.0/firebase-auth.js',
  'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/sql-wasm.js',
  'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/sql-wasm.wasm'
];

// Install event - cache resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') {
    return; // Only handle GET requests
  }

  event.respondWith(
    caches.match(request)
      .then(response => response || fetch(request))
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(name => name !== CACHE_NAME ? caches.delete(name) : Promise.resolve())
      );
      await self.clients.claim();
    })()
  );
});
