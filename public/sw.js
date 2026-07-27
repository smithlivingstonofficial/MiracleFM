// public/sw.js
// Miracle FM service worker: bounded media warm cache plus app shell fallback.

const CACHE_VERSION = "mfm-v3";
const ARTWORK_CACHE = `${CACHE_VERSION}-artwork`;
const AUDIO_CACHE = `${CACHE_VERSION}-audio`;
const STATIC_CACHE = `${CACHE_VERSION}-static`;

const MAX_AUDIO_ENTRIES = 120;
const MAX_ARTWORK_ENTRIES = 160;
const MAX_STATIC_ENTRIES = 80;

const SHELL_ASSETS = ["/", "/miraclefm.jpg", "/manifest.json"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .catch(() => undefined)
  );
});

self.addEventListener("activate", (event) => {
  const current = [ARTWORK_CACHE, AUDIO_CACHE, STATIC_CACHE];
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.map((key) => (current.includes(key) ? undefined : caches.delete(key))))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Audio & media assets (HLS segments, progressive M4A, MP3, AAC)
  if (url.pathname.match(/\.(m4s|mp4|aac|m4a|mp3|ts|m3u8)$/i)) {
    if (request.headers.has("range")) {
      // Range requests: pass through to network with cache fallback
      event.respondWith(
        fetch(request).catch(async () => {
          const cache = await caches.open(AUDIO_CACHE);
          const cached = await cache.match(request.url);
          if (cached) return cached;
          return new Response("Media stream unavailable", { status: 503 });
        })
      );
      return;
    }

    if (url.pathname.match(/\.m3u8$/i)) {
      event.respondWith(networkFirst(request, AUDIO_CACHE, 30, MAX_AUDIO_ENTRIES));
      return;
    }

    event.respondWith(cacheFirstLimited(request, AUDIO_CACHE, MAX_AUDIO_ENTRIES));
    return;
  }

  if (
    request.destination === "image" ||
    url.pathname.match(/\.(jpg|jpeg|png|webp|gif|svg|ico)$/i)
  ) {
    event.respondWith(cacheFirstLimited(request, ARTWORK_CACHE, MAX_ARTWORK_ENTRIES));
    return;
  }

  if (
    url.origin === self.location.origin &&
    (url.pathname.startsWith("/_next/static/") ||
      url.pathname.startsWith("/fonts/") ||
      url.pathname === "/manifest.json")
  ) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE, MAX_STATIC_ENTRIES));
    return;
  }

  if (request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(fetch(request).catch(() => caches.match("/")));
  }
});

async function networkFirst(request, cacheName, maxAgeSeconds, maxEntries) {
  const cache = await caches.open(cacheName);

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      await cache.put(request, stampResponse(networkResponse.clone()));
      trimCache(cache, maxEntries);
    }
    return networkResponse;
  } catch {
    const cached = await cache.match(request);
    if (cached) {
      const age = Date.now() - Number(cached.headers.get("x-sw-fetched-at") || 0);
      if (age < maxAgeSeconds * 1000) return cached;
    }
    return new Response("Network error: no fresh cached media manifest", { status: 503 });
  }
}

async function cacheFirstLimited(request, cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      await cache.put(request, stampResponse(networkResponse.clone()));
      trimCache(cache, maxEntries);
    }
    return networkResponse;
  } catch {
    return new Response("Network error: media asset is not cached", { status: 503 });
  }
}

async function staleWhileRevalidate(request, cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const revalidate = fetch(request)
    .then(async (response) => {
      if (response.ok) {
        await cache.put(request, stampResponse(response.clone()));
        trimCache(cache, maxEntries);
      }
      return response;
    })
    .catch(() => cached);

  return cached || revalidate;
}

function stampResponse(response) {
  const headers = new Headers(response.headers);
  headers.set("x-sw-fetched-at", Date.now().toString());
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function trimCache(cache, maxEntries) {
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;

  await Promise.all(keys.slice(0, keys.length - maxEntries).map((key) => cache.delete(key)));
}

self.addEventListener("message", (event) => {
  if (event.data?.type === "KEEPALIVE") {
    event.source?.postMessage({ type: "KEEPALIVE_ACK", ts: Date.now() });
  }
});
