// public/sw.js
// ─── Miracle FM Service Worker ───────────────────────────────────────────────

const CACHE_VERSION = "mfm-v2";
const ARTWORK_CACHE = `${CACHE_VERSION}-artwork`;
const AUDIO_CACHE   = `${CACHE_VERSION}-audio`;
const STATIC_CACHE  = `${CACHE_VERSION}-static`;

// App shell — these are cached on install so the player UI works offline
const SHELL_ASSETS = [
  "/",
  "/miraclefm.jpg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// ── Install ──────────────────────────────────────────────────────────────────
// skipWaiting() makes the new SW active immediately without waiting for all
// tabs to close — critical for audio continuity during SW updates.

self.addEventListener("install", (event) => {
  self.skipWaiting();

  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .catch(() => {}) // don't let a missing icon block the install
  );
});

// ── Activate ─────────────────────────────────────────────────────────────────
// Delete every cache that doesn't belong to this version so stale audio
// segments from old deploys don't occupy storage.

self.addEventListener("activate", (event) => {
  const CURRENT_CACHES = [ARTWORK_CACHE, AUDIO_CACHE, STATIC_CACHE];

  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (!CURRENT_CACHES.includes(key)) {
              console.log("[SW] Deleting old cache:", key);
              return caches.delete(key);
            }
          })
        )
      )
      .then(() => self.clients.claim()) // take control of all open tabs immediately
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle GET — POST/PUT/DELETE pass through untouched
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // ── 1. HLS MANIFESTS (.m3u8) — Network-first, 10 s stale cache ──────────
  //
  // Playlists must always be fresh (they contain the latest segment list).
  // We try the network first; on failure we serve the last cached copy so
  // hls.js can at least continue with what it already knows.
  if (url.pathname.match(/\.m3u8$/i)) {
    event.respondWith(networkFirst(request, AUDIO_CACHE, 10));
    return;
  }

  // ── 2. HLS SEGMENTS (.ts / fmp4 / .aac) — Cache-first ──────────────────
  //
  // Segments are content-addressed (the URL never changes for the same
  // audio data), so it's safe to serve them from cache indefinitely.
  // This is also what enables gapless background playback when the network
  // drops briefly — already-buffered segments are served instantly from SW.
  if (url.pathname.match(/\.(ts|m4s|mp4|aac|mp3|m4a)$/i)) {
    event.respondWith(cacheFirst(request, AUDIO_CACHE));
    return;
  }

  // ── 3. ARTWORK & IMAGES — Cache-first ───────────────────────────────────
  //
  // Album art / artist photos are used by MediaMetadata for the lock-screen
  // player card. They must load even when the network is gone.
  // We cache every image regardless of origin (R2 CDN, Google, etc.)
  if (
    request.destination === "image" ||
    url.pathname.match(/\.(jpg|jpeg|png|webp|gif|svg|ico)$/i)
  ) {
    event.respondWith(cacheFirst(request, ARTWORK_CACHE));
    return;
  }

  // ── 4. NEXT.JS STATIC ASSETS — Stale-while-revalidate ───────────────────
  //
  // JS/CSS chunks are content-hashed by Next.js so they're safe to cache.
  // Serve the cached version instantly, revalidate in the background.
  if (
    url.origin === self.location.origin &&
    (url.pathname.startsWith("/_next/static/") ||
      url.pathname.startsWith("/icons/") ||
      url.pathname.startsWith("/fonts/"))
  ) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
    return;
  }

  // ── 5. HTML DOCUMENTS — Network-first, offline shell fallback ───────────
  if (request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(request).catch(() => caches.match("/"))
    );
    return;
  }

  // All other requests (API calls, analytics, ads) pass straight through
});

// ── Caching strategies ───────────────────────────────────────────────────────

/**
 * Network-first with timed stale fallback.
 * @param {Request} request
 * @param {string}  cacheName
 * @param {number}  maxAgeSeconds  – how old a cached response can be before
 *                                   we consider it too stale to serve
 */
async function networkFirst(request, cacheName, maxAgeSeconds) {
  const cache = await caches.open(cacheName);

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      // Stamp the response with a fetch timestamp so we can check staleness
      const stamped = stampResponse(networkResponse.clone());
      cache.put(request, stamped);
    }
    return networkResponse;
  } catch (_) {
    const cached = await cache.match(request);
    if (cached) {
      const age = Date.now() - Number(cached.headers.get("x-sw-fetched-at") || 0);
      if (age < maxAgeSeconds * 1000) return cached;
    }
    return new Response("Network error — no cached fallback available", { status: 503 });
  }
}

/**
 * Cache-first. If not in cache, fetch, store, and return.
 */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const cache = await caches.open(cacheName);
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (_) {
    return new Response("Network error — asset not in cache", { status: 503 });
  }
}

/**
 * Serve from cache immediately, refresh in background.
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);

  const revalidate = fetch(request).then((res) => {
    if (res.ok) cache.put(request, res.clone());
    return res;
  });

  return cached ?? revalidate;
}

/**
 * Clone a response and inject a timestamp header so networkFirst()
 * can check how old it is without a separate metadata store.
 */
function stampResponse(response) {
  const headers = new Headers(response.headers);
  headers.set("x-sw-fetched-at", Date.now().toString());
  return new Response(response.body, {
    status:     response.status,
    statusText: response.statusText,
    headers,
  });
}

// ── Background keepalive ──────────────────────────────────────────────────────
// AudioPlayer.tsx can ping the SW periodically via postMessage({ type: 'KEEPALIVE' }).
// The SW replies with an ACK — this round-trip prevents Chrome from discarding
// the SW process while audio is playing in a background tab.

self.addEventListener("message", (event) => {
  if (event.data?.type === "KEEPALIVE") {
    event.source?.postMessage({ type: "KEEPALIVE_ACK", ts: Date.now() });
  }
});