'use strict';

/* ============================================================
   INIT — must load last: everything below runs immediately
   ============================================================ */

Theme.init();
TreeTheme.init();

window.addEventListener('hashchange', () => Router.handle());
document.addEventListener('DOMContentLoaded', () => {
  Router.handle();
  Onboarding.maybeShow();
});
document.addEventListener('keydown', handleGlobalKeydown);

/* --- Service Worker --- */
// Skip SW registration on localhost to avoid dev cache friction.
// Add ?sw to the URL to force-register during local testing.
const isDev = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
const forceSW = location.search.includes('sw');
if ('serviceWorker' in navigator && location.protocol !== 'file:' && (!isDev || forceSW)) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(err => {
      console.warn('Service worker registration failed:', err);
    });
  });
}

/* --- Two-tab conflict detection ---
   If another tab writes to the same storage keys, warn the current tab.
   The 'storage' event only fires in tabs that did NOT make the change. */
window.addEventListener('storage', e => {
  if (e.key === Store.COURSES_KEY || e.key === Store.PROGRESS_KEY) {
    Toast.show(
      'Data was changed in another tab — reload to sync.',
      { type: 'info', duration: 8000 }
    );
  }
});
