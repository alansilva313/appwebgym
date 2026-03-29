/**
 * GymBro Service Worker — Cache-First PWA Strategy
 * 
 * - Cache estático: assets, JS, CSS → cache-first
 * - API calls: network-first com fallback
 * - Offline: página de fallback se rede indisponível
 */

const CACHE_NAME = 'gymbro-v1';
const OFFLINE_URL = '/';

const STATIC_ASSETS = [
  '/',
  '/favicon.ico',
];

// Install: pre-cache shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: cache-first for static, network-first for API
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and browser-extensions
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) return;

  // API calls → network-first
  if (url.hostname !== self.location.hostname) {
    event.respondWith(
      fetch(request)
        .then((response) => response)
        .catch(() => caches.match(request))
    );
    return;
  }

  // Static assets → cache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((response) => {
        // Only cache successful responses
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }

        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });

        return response;
      }).catch(() => {
        // Fallback to root for navigation requests
        if (request.mode === 'navigate') {
          return caches.match(OFFLINE_URL);
        }
      });
    })
  );
});
