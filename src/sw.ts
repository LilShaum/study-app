/// <reference lib="webworker" />

// injectManifest source — see tsconfig.sw.json for this file's (WebWorker,
// not DOM) type scope. vite-plugin-pwa replaces self.__WB_MANIFEST below
// with the real precache list (content-hashed Vite output) at build time.
//
// Strategy, ported from the vanilla app's sw.js:
//   HTML navigations → network-first  (deploys land on next load)
//   Everything else  → precached by Workbox, else cache-first at runtime

import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

const RUNTIME_CACHE = 'arborous-runtime';
const BASE = '/study-app/';

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Network-first for navigations, falling back to the precached shell offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cached = await caches.match(BASE + 'index.html');
        return cached ?? Response.error();
      }),
    );
    return;
  }

  // Precached (hashed) build assets are already handled by precacheAndRoute
  // above; this is a cache-first fallback for anything else same-origin.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
        }
        return response;
      });
    }),
  );
});
