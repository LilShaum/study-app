'use strict';

/* ============================================================
   THEME — light/dark mode, manual override persisted to localStorage
   ============================================================ */

const Theme = {
  KEY: 'study_theme',

  /** 'light' | 'dark' | null (follow system) */
  get() {
    return localStorage.getItem(this.KEY);
  },

  isDark() {
    return this.get() === 'dark'
      || (!this.get() && window.matchMedia('(prefers-color-scheme: dark)').matches);
  },

  apply(theme) {
    if (theme === 'light' || theme === 'dark') {
      document.documentElement.setAttribute('data-theme', theme);
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  },

  init() {
    this.apply(this.get());
  },

  toggle(btn) {
    const next = this.isDark() ? 'light' : 'dark';
    localStorage.setItem(this.KEY, next);
    this.apply(next);
    if (btn) {
      btn.innerHTML = icon(this.isDark() ? 'sun' : 'moon');
      btn.setAttribute('aria-label', this.isDark() ? 'Switch to light mode' : 'Switch to dark mode');
    }
  },

  toggleButton() {
    const btn = el('button', {
      className: 'btn btn--ghost theme-toggle',
      title: 'Toggle dark mode',
      'aria-label': this.isDark() ? 'Switch to light mode' : 'Switch to dark mode',
      html: icon(this.isDark() ? 'sun' : 'moon'),
    });
    btn.addEventListener('click', () => this.toggle(btn));
    return btn;
  },
};
