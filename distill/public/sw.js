/**
 * Distill PWA service worker — minimal offline shell cache.
 *
 * Strategy:
 *  - At install: precache the index/HTML
 *  - At runtime: cache static assets (CSS/JS/icons) on first request
 *  - Network-first for API calls (OpenRouter / Kimi) so SW never serves stale AI
 *  - Cache-first for static assets so the app shell loads offline
 *
 * Bumping CACHE_NAME triggers a cache rebuild.
 */
const CACHE_NAME = "distill-v1";
const SHELL = ["/", "/index.html", "/manifest.webmanifest", "/apple-touch-icon.png", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        SHELL.map((url) =>
          fetch(url)
            .then((resp) => (resp.ok ? cache.put(url, resp) : null))
            .catch(() => null),
        ),
      ),
    ),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Never intercept POST or non-GET (AI requests are POST)
  if (req.method !== "GET") return;

  // Network-first for cross-origin (OpenRouter / Kimi / fonts)
  if (url.origin !== location.origin) {
    event.respondWith(
      fetch(req).catch(() => caches.match(req).then((r) => r ?? Response.error())),
    );
    return;
  }

  // Cache-first for same-origin assets
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((resp) => {
          if (resp.ok && resp.type === "basic") {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return resp;
        })
        .catch(() => caches.match("/index.html").then((r) => r ?? Response.error()));
    }),
  );
});
