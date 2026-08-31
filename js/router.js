'use strict';

/* ============================================================
   ROUTER — hash-based
   Routes: #home | #course/{id} | #study/{id}/{mode}
   ============================================================ */

const Router = {
  handle() {
    const hash  = window.location.hash.replace(/^#\/?/, '') || 'home';
    const parts = hash.split('/');
    const [view, ...params] = parts;

    switch (view) {
      case 'home':      Views.home();                          break;
      case 'course':    Views.course(params[0]);               break;
      case 'dashboard': Views.dashboard(params[0]);             break;
      case 'study':     Views.study(params[0], params[1]);     break;
      default:          Views.home();
    }
  },

  go(hash) {
    window.location.hash = hash;
  },
};
