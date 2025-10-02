// Service Worker for NJC Song Book - Network Only
self.addEventListener('install', event => {
  // Skip waiting to activate the new SW immediately
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  // Take control of uncontrolled clients and clear all caches
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

// Always hit the network; do not use cache
self.addEventListener('fetch', event => {
  event.respondWith(fetch(event.request));
});
