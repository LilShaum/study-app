/// <reference lib="webworker" />

// injectManifest source — see tsconfig.sw.json for this file's (WebWorker,
// not DOM) type scope. vite-plugin-pwa replaces self.__WB_MANIFEST below
// with the real precache list (content-hashed Vite output) at build time.
//
// Strategy, carried over from the vanilla app's sw.js:
//   HTML navigations → network-first  (a deploy lands on the next load)
//   Everything else  → precached by Workbox, cache-first
//
// An earlier version of this file hand-rolled the fetch handling in a
// `self.addEventListener('fetch', ...)` placed after precacheAndRoute(). That
// did not work: precacheAndRoute() installs Workbox's own fetch listener
// first, and its PrecacheRoute matches navigations too (it maps "/study-app/"
// to the precached "index.html" via directoryIndex). Workbox therefore
// answered every navigation cache-first, the hand-written network-first branch
// never ran, and it then called respondWith() on an already-answered event —
// throwing on every navigation. Route order below is load-bearing.

import { cleanupOutdatedCaches, matchPrecache, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

// Derived from the registration rather than hardcoded, so it stays correct if
// the app is ever served from a different path.
const BASE = new URL(self.registration.scope).pathname;
const SHELL = `${BASE}index.html`;

const pages = new NetworkFirst({
  cacheName: 'arborous-pages',
  networkTimeoutSeconds: 3,
});

// Registered BEFORE precacheAndRoute so it wins the match for navigations.
registerRoute(
  new NavigationRoute(async (options) => {
    try {
      const response = await pages.handle(options);
      if (response) return response;
    } catch {
      /* offline or timed out — fall through to the precached shell */
    }
    return (await matchPrecache(SHELL)) ?? Response.error();
  }),
);

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
