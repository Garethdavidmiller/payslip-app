const CACHE_NAME = 'myb-pay-calc-v1';
// ⚠️ Increment CACHE_NAME string on each deployment to bust old caches

const URLS_TO_CACHE = [
  './',
  './pay-calculator.html',
  './pay-manifest.json',
  './icon-120.png',
  './icon-152.png',
  './icon-167.png',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png'
];

// Install — cache assets but do NOT call skipWaiting here.
// skipWaiting is triggered by the "Update now" button via postMessage.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(URLS_TO_CACHE))
  );
});

// Activate — clean up old caches, claim clients
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch — cache first, fall back to network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const toCache = response.clone();
        caches.open(CACHE_NAME).then(c => c.put(event.request, toCache));
        return response;
      });
    })
  );
});

// SKIP_WAITING: sent by the lightbox "Update now" button.
// Activates the waiting SW immediately, triggering controllerchange,
// which causes the page to reload with the new version.
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
