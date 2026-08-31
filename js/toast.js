'use strict';

/* ============================================================
   TOAST — in-app notifications, replaces native alert()
   Options:
     type     — 'info' | 'success' | 'error' | 'warning'
     duration — ms before auto-dismiss (default 5000)
     undo     — function to call if the user taps "Undo"
                When provided, a small "Undo" button is appended
                to the toast; clicking it cancels the timer,
                dismisses the toast, and calls undo().
   ============================================================ */

const Toast = {
  _container: null,

  _ensureContainer() {
    if (!this._container || !document.body.contains(this._container)) {
      this._container = el('div', { className: 'toast-container', role: 'status', 'aria-live': 'polite' });
      document.body.appendChild(this._container);
    }
    return this._container;
  },

  show(message, { type = 'info', duration = 5000, undo = null } = {}) {
    const container = this._ensureContainer();
    const t = el('div', { className: `toast toast--${type}` });

    // Icon + text
    t.innerHTML = `${icon(type === 'error' ? 'x' : 'check-circle', { size: 16, className: 'toast-icon' })}<span class="toast-text"></span>`;
    q('.toast-text', t).textContent = message;

    // Undo button (if requested)
    if (typeof undo === 'function') {
      const undoBtn = el('button', {
        className: 'toast-undo',
        text: 'Undo',
        'aria-label': 'Undo last action',
      });
      t.appendChild(undoBtn);
      undoBtn.addEventListener('click', e => {
        e.stopPropagation();
        clearTimeout(timer);
        dismiss();
        undo();
      });
    }

    container.appendChild(t);
    requestAnimationFrame(() => t.classList.add('toast--show'));

    const dismiss = () => {
      t.classList.remove('toast--show');
      t.addEventListener('transitionend', () => t.remove(), { once: true });
    };
    const timer = setTimeout(dismiss, duration);
    t.addEventListener('click', () => { clearTimeout(timer); dismiss(); });
  },
};
