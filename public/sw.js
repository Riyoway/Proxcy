/**
 * Proxcy service worker.
 * Strategy:
 *  - precache the dashboard shell on install
 *  - cache-first for same-origin static images and icons
 *  - network-first with cache fallback for HTML navigations
 */
const VERSION = "v2";
const SHELL_CACHE = `proxcy-shell-${VERSION}`;
const RUNTIME_CACHE = `proxcy-runtime-${VERSION}`;

const SHELL_URLS = ["/", "/manifest.webmanifest", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_URLS)).catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== SHELL_CACHE && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Let Next.js manage its own build and dev assets. Caching these can serve
  // stale module chunks after an edit or deploy.
  if (url.pathname.startsWith("/_next/")) return;

  // HTML navigation: network-first with cache fallback
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          const cache = await caches.open(RUNTIME_CACHE);
          cache.put(request, fresh.clone()).catch(() => undefined);
          return fresh;
        } catch {
          const cached = await caches.match(request);
          if (cached) return cached;
          const shell = await caches.match("/");
          if (shell) return shell;
          return new Response("Offline", { status: 503, statusText: "Offline" });
        }
      })(),
    );
    return;
  }

  // Static assets: cache-first
  if (
    url.pathname.startsWith("/icon") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".png")
  ) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        try {
          const fresh = await fetch(request);
          const cache = await caches.open(RUNTIME_CACHE);
          cache.put(request, fresh.clone()).catch(() => undefined);
          return fresh;
        } catch {
          return new Response("", { status: 504 });
        }
      })(),
    );
  }
});
