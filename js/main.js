'use strict';

/* ============================================================
   INIT — must load last: everything below runs immediately
   ============================================================ */

Theme.init();
window.addEventListener('hashchange', () => Router.handle());
document.addEventListener('DOMContentLoaded', () => Router.handle());
document.addEventListener('keydown', handleGlobalKeydown);

/* --- Service Worker --- */
// Only register when served over HTTP/HTTPS (file:// doesn't support SW).
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(err => {
      console.warn('Service worker registration failed:', err);
    });
  });
}

/* --- Two-tab conflict detection ---
   If another tab writes to the same storage keys, warn the current tab.
   This doesn't prevent the conflict but makes it visible rather than silent.
   The 'storage' event only fires in tabs that did NOT make the change. */
window.addEventListener('storage', e => {
  if (e.key === Store.COURSES_KEY || e.key === Store.PROGRESS_KEY) {
    Toast.show(
      'Data was changed in another tab — reload to sync.',
      { type: 'info', duration: 8000 }
    );
  }
});
