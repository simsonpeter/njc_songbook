// Service Worker for NJC Song Book - Offline First PWA
const CACHE_NAME = 'njc-songbook-v3';
const CACHE_DYNAMIC = 'njc-songbook-dynamic-v3';
const CACHE_STATIC = 'njc-songbook-static-v3';

const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js',
  'https://www.gstatic.com/firebasejs/8.10.0/firebase-firestore.js',
  'https://www.gstatic.com/firebasejs/8.10.0/firebase-auth.js',
  'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/sql-wasm.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Install event - cache resources
self.addEventListener('install', event => {
  console.log('Service Worker installing...');
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_STATIC).then(cache => {
        console.log('Caching static resources...');
        return cache.addAll(urlsToCache);
      }),
      caches.open(CACHE_DYNAMIC).then(cache => {
        console.log('Dynamic cache ready');
        return cache;
      })
    ])
  );
  
  // Skip waiting to activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker activating...');
  event.waitUntil(
    Promise.all([
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (!cacheName.includes('v3')) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all clients immediately
      self.clients.claim()
    ])
  );
});

// Fetch event - offline-first strategy with network fallback
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  
  // Skip Firebase requests and allow them to go to network
  if (url.hostname.includes('firebase') || url.hostname.includes('googleapis')) {
    event.respondWith(fetch(request));
    return;
  }
  
  // Static assets - Cache First
  if (request.destination === 'image' || 
      request.destination === 'style' || 
      request.destination === 'script' ||
      request.destination === 'font') {
    event.respondWith(
      caches.match(request)
        .then(response => {
          if (response) {
            return response;
          }
          return fetch(request).then(response => {
            if (response && response.status === 200) {
              const responseClone = response.clone();
              caches.open(CACHE_STATIC).then(cache => {
                cache.put(request, responseClone);
              });
            }
            return response;
          });
        })
    );
    return;
  }
  
  // HTML and main documents - Network First with cache fallback
  if (request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_DYNAMIC).then(cache => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request)
            .then(response => {
              // Fallback to index.html for SPA routing
              if (!response && request.url === self.location.origin + '/' + request.url.split('/').pop()) {
                return caches.match('/index.html');
              }
              return response;
            });
        })
    );
    return;
  }
  
  // Default: Try cache first, then network
  event.respondWith(
    caches.match(request)
      .then(response => {
        if (response) {
          return response;
        }
        
        return fetch(request)
          .then(response => {
            if (response && response.status === 200) {
              const responseClone = response.clone();
              caches.open(CACHE_DYNAMIC).then(cache => {
                cache.put(request, responseClone);
              });
            }
            return response;
          })
          .catch(error => {
            console.log('Network request failed:', error);
            // Return offline page for navigation requests
            if (request.destination === 'document') {
              return caches.match('/index.html');
            }
            throw error;
          });
      })
  );
});

// Background Sync
self.addEventListener('sync', event => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-songs') {
    event.waitUntil(syncSongs());
  }
  
  if (event.tag === 'sync-offline-changes') {
    event.waitUntil(syncOfflineChanges());
  }
});

// Background sync functions
async function syncSongs() {
  try {
    // This will be called when the app comes online
    // Send message to main thread to trigger sync
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'BACKGROUND_SYNC',
        action: 'sync-songs'
      });
    });
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

async function syncOfflineChanges() {
  try {
    // Send message to main thread to sync any offline changes
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'BACKGROUND_SYNC',
        action: 'sync-changes'
      });
    });
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Push notifications
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : 'New content available',
    icon: '/android-chrome-192x192.png',
    badge: '/android-chrome-192x192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Songs',
        icon: '/notifications/songs-icon.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/notifications/close-icon.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('NJC Song Book', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  } else if (event.action === 'close') {
    // Do nothing, notification is closed
  } else {
    // Default action
    event.waitUntil(
      clients.matchAll().then(clientList => {
        for (const client of clientList) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
    );
  }
});

// Handle messages from main thread
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(CACHE_DYNAMIC).then(cache => {
        return cache.addAll(event.data.urls);
      })
    );
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            return caches.delete(cacheName);
          })
        );
      })
    );
  }
});

// Periodic background sync (if supported)
self.addEventListener('periodicsync', event => {
  if (event.tag === 'content-sync') {
    event.waitUntil(
      syncSongs().catch(error => {
        console.error('Periodic sync failed:', error);
      })
    );
  }
});

// Handle offline/online status changes
self.addEventListener('online', event => {
  console.log('App is back online');
  // Trigger immediate sync when coming online
  syncSongs();
});

self.addEventListener('offline', event => {
  console.log('App is now offline');
});

// Cache cleanup (run periodically)
async function cleanupCache() {
  const cacheNames = await caches.keys();
  const staticCache = await caches.open(CACHE_STATIC);
  const currentTime = Date.now();
  
  // Clean up old dynamic cache entries (keep last 100)
  const dynamicCache = await caches.open(CACHE_DYNAMIC);
  const requests = await dynamicCache.keys();
  
  if (requests.length > 100) {
    // Sort by access time and remove oldest
    const sortedRequests = requests.slice(0, requests.length - 100);
    await Promise.all(
      sortedRequests.map(request => dynamicCache.delete(request))
    );
  }
}

// Run cleanup periodically (every 24 hours)
setInterval(cleanupCache, 24 * 60 * 60 * 1000);
