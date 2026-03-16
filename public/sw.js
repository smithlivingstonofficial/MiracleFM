// public/sw.js

const ARTWORK_CACHE = 'artwork-cache-v1';
const AUDIO_CACHE = 'audio-cache-v1';

// We want to activate the new service worker immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Clean up old caches when a new service worker takes over
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== ARTWORK_CACHE && cacheName !== AUDIO_CACHE) {
            console.log('Clearing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Intercept network requests
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // ---------------------------------------------------------
  // 1. CACHE ARTWORK (Images for Lock Screen Media Session)
  // Strategy: Cache-First, fallback to Network
  // ---------------------------------------------------------
  if (event.request.destination === 'image' || url.pathname.match(/\.(jpg|jpeg|png|webp|gif)$/i)) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        // Return cached image if it exists
        if (cachedResponse) return cachedResponse;

        // Otherwise, fetch from network, cache it, and return it
        return fetch(event.request).then((networkResponse) => {
          // Only cache successful HTTP responses
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(ARTWORK_CACHE).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return networkResponse;
        }).catch(() => {
          // Optional: Return a default fallback placeholder image if completely offline
          // return caches.match('/placeholder-artwork.jpg');
        });
      })
    );
    return;
  }

  // ---------------------------------------------------------
  // 2. CACHE HLS AUDIO SEGMENTS (.ts files)
  // Strategy: Cache-First, fallback to Network
  // ---------------------------------------------------------
  // Since you use hls.js, audio is downloaded in small .ts segments.
  if (url.pathname.match(/\.(ts|mp4|m4a|mp3)$/i)) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;

        return fetch(event.request).then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(AUDIO_CACHE).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return networkResponse;
        });
      })
    );
    return;
  }

  // ---------------------------------------------------------
  // 3. HLS MANIFESTS (.m3u8 files)
  // Strategy: Network-First, fallback to Cache
  // ---------------------------------------------------------
  // Manifests tell hls.js what segments to play. For live streams, 
  // these change constantly. For VOD, they are static.
  if (url.pathname.match(/\.(m3u8)$/i)) {
    event.respondWith(
      fetch(event.request).then((networkResponse) => {
        const responseToCache = networkResponse.clone();
        caches.open(AUDIO_CACHE).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      }).catch(() => {
        // If offline, serve the last known manifest
        return caches.match(event.request);
      })
    );
    return;
  }
});