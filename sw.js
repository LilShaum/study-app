'use strict';

/* ============================================================
   SERVICE WORKER — offline-first shell, network-first document
   ============================================================
   Strategy:
     HTML document   → network-first  (deploys land on next load)
     All other assets → cache-first   (CSS, JS, icons are stable)

   CACHE_NAME contains a commit SHA injected by the GitHub Actions
   deploy workflow (see .github/workflows/deploy.yml). The workflow
   runs:  sed -i "s/COMMIT_SHA/${{ github.sha }}/g" sw.js
   before uploading the Pages artifact, so every deploy gets a fresh
   cache name and old caches are purged on activate automatically.
   If you need to bust the cache manually (e.g. local testing),
   replace "COMMIT_SHA" below with any new string and re-deploy.
   ============================================================ */

const CACHE_NAME = 'study-COMMIT_SHA';

/* Base path for GitHub Pages subdirectory deployment.
   All precache URLs must be absolute paths from the origin. */
const BASE = '/study-app';

const PRECACHE_URLS = [
  BASE + '/',
  BASE + '/index.html',
  BASE + '/styles.css',
  BASE + '/manifest.json',
  BASE + '/js/dom-utils.js',
  BASE + '/js/icons.js',
  BASE + '/js/theme.js',
  BASE + '/js/toast.js',
  BASE + '/js/store.js',
  BASE + '/js/router.js',
  BASE + '/js/session.js',
  BASE + '/js/renderers.js',
  BASE + '/js/views.js',
  BASE + '/js/keyboard.js',
  BASE + '/js/main.js',
  BASE + '/icons/icon.svg',
];

/* --- Install: precache all shell assets --- */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())  // activate immediately
  );
});

/* --- Activate: remove old caches --- */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* --- Fetch --- */
self.addEventListener('fetch', event => {
  const { request } = event;

  // Only handle same-origin GETs
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Network-first for navigation (HTML documents)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match(BASE + '/index.html'))
    );
    return;
  }

  // Cache-first for everything else (CSS, JS, icons)
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, clone));
        }
        return response;
      });
    })
  );
});
