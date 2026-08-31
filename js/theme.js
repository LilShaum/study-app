'use strict';

/* ============================================================
   THEME — light/dark mode + tree theme, both persisted to localStorage
   ============================================================ */

const Theme = {
  KEY: 'arborous_theme',

  /** 'light' | 'dark' | null (follow system) */
  get() {
    return localStorage.getItem(this.KEY);
  },

  isDark() {
    return this.get() === 'dark'
      || (!this.get() && window.matchMedia('(prefers-color-scheme: dark)').matches);
  },

  apply(theme) {
    const root = document.documentElement;
    // Preserve existing data-tree attribute
    const tree = root.getAttribute('data-tree');
    if (theme === 'light' || theme === 'dark') {
      root.setAttribute('data-theme', theme);
    } else {
      root.removeAttribute('data-theme');
    }
    // Re-apply tree (setAttribute clears nothing, but be safe)
    if (tree) root.setAttribute('data-tree', tree);
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

/* ============================================================
   TREE THEME — winter | banyan | fig (or null = default indigo)
   ============================================================ */

const TreeTheme = {
  KEY: 'arborous_tree',
  THEMES: [null, 'winter', 'banyan', 'fig'],
  LABELS: {
    null:   { name: 'Default', emoji: '📘', desc: 'Classic indigo' },
    winter: { name: 'Winter',  emoji: '❄️',  desc: 'Icy slate blue' },
    banyan: { name: 'Banyan',  emoji: '🌳',  desc: 'Forest green' },
    fig:    { name: 'Fig',     emoji: '🌿',  desc: 'Deep purple' },
  },

  get() {
    return localStorage.getItem(this.KEY) || null;
  },

  apply(tree) {
    const root = document.documentElement;
    if (tree) {
      root.setAttribute('data-tree', tree);
    } else {
      root.removeAttribute('data-tree');
    }
  },

  set(tree) {
    if (tree) {
      localStorage.setItem(this.KEY, tree);
    } else {
      localStorage.removeItem(this.KEY);
    }
    this.apply(tree);
  },

  init() {
    this.apply(this.get());
  },

  /** Cycle to next theme and return it */
  cycle() {
    const current = this.get();
    const idx = this.THEMES.indexOf(current);
    const next = this.THEMES[(idx + 1) % this.THEMES.length];
    this.set(next);
    return next;
  },

  /** Returns a button that cycles through tree themes */
  pickerButton() {
    const update = (btn) => {
      const t = this.get();
      const info = this.LABELS[t] || this.LABELS[null];
      btn.textContent = info.emoji;
      btn.title = `Theme: ${info.name} — click to switch`;
      btn.setAttribute('aria-label', `Current theme: ${info.name}. Click to switch.`);
    };

    const btn = el('button', {
      className: 'btn btn--ghost tree-picker',
    });
    update(btn);

    btn.addEventListener('click', () => {
      this.cycle();
      update(btn);
    });

    return btn;
  },
};
