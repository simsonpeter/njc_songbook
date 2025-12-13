// Service Worker for NJC Song Book
const CACHE_NAME = 'njc-songbook-v5';
const urlsToCache = [
  './',
  './index.html',
  './db.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './logo.png',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
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
        // Cache all URLs, but don't fail if some fail
        return Promise.allSettled(
          urlsToCache.map(url => {
            return cache.add(url).catch(err => {
              console.warn(`Failed to cache ${url}:`, err);
              return null;
            });
          })
        );
      })
      .then(() => self.skipWaiting())
  );
});

// Fetch event - Cache First with Network Fallback for offline support
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http(s) requests
  if (!event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Return cached version if available
        if (cachedResponse) {
          return cachedResponse;
        }

        // Try to fetch from network
        return fetch(event.request)
          .then(response => {
            // Don't cache if not a valid response
            if (!response || response.status !== 200 || response.type === 'error') {
              return response;
            }

            // Clone the response for caching
            const responseToCache = response.clone();

            // Cache the response
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });

            return response;
          })
          .catch(error => {
            // If network fails and we don't have cache, return a basic offline page
            console.log('Network request failed, no cache available:', event.request.url);
            
            // For navigation requests, return cached index.html
            if (event.request.mode === 'navigate') {
              return caches.match('./index.html');
            }
            
            // For other requests, return a basic error response
            return new Response('Offline - Resource not available', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(name => {
          if (name !== CACHE_NAME) {
            console.log('Deleting old cache:', name);
            return caches.delete(name);
          }
          return Promise.resolve();
        })
      );
      await self.clients.claim();
    })()
  );
});
