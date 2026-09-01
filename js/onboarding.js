'use strict';

/* ============================================================
   ONBOARDING — first-launch PWA install guide + theme picker
   ============================================================ */

const Onboarding = {
  KEY: 'arborous_onboarded',

  isOnboarded() {
    return !!localStorage.getItem(this.KEY);
  },

  markDone() {
    localStorage.setItem(this.KEY, '1');
  },

  /** Returns 'ios' | 'android' | 'desktop' */
  platform() {
    const ua = navigator.userAgent;
    if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
    if (/android/i.test(ua)) return 'android';
    return 'desktop';
  },

  /** True if already installed as a PWA (standalone mode) */
  isInstalled() {
    return window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true;
  },

  maybeShow() {
    if (this.isOnboarded()) return;
    // Small delay so the main UI renders first
    setTimeout(() => this.show(), 300);
  },

  show() {
    const platform = this.platform();
    const installed = this.isInstalled();

    const overlay = el('div', { className: 'onboarding-overlay', id: 'onboarding' });

    const installHtml = installed
      ? `<div class="ob-install ob-install--done">
           <span class="ob-install-icon">✓</span>
           <span>You're already using Arborous as an app!</span>
         </div>`
      : platform === 'ios'
        ? `<div class="ob-install">
             <div class="ob-install-title">Add to your Home Screen</div>
             <ol class="ob-steps">
               <li>Tap the <strong>Share</strong> button <span class="ob-share-icon">⎋</span> at the bottom of Safari</li>
               <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
               <li>Tap <strong>Add</strong> in the top-right corner</li>
             </ol>
             <p class="ob-note">Once installed, Arborous opens fullscreen like a native app — no browser chrome.</p>
           </div>`
        : platform === 'android'
          ? `<div class="ob-install">
               <div class="ob-install-title">Add to your Home Screen</div>
               <ol class="ob-steps">
                 <li>Tap the <strong>⋮ menu</strong> in the top-right of Chrome</li>
                 <li>Tap <strong>"Add to Home Screen"</strong> or <strong>"Install app"</strong></li>
                 <li>Tap <strong>Add</strong> to confirm</li>
               </ol>
               <p class="ob-note">You'll get a native app icon and fullscreen experience.</p>
             </div>`
          : `<div class="ob-install">
               <div class="ob-install-title">Install as a desktop app</div>
               <p class="ob-steps-text">In Chrome or Edge, look for the <strong>install icon ⊕</strong> in the address bar, then click <strong>Install</strong>.</p>
             </div>`;

    overlay.innerHTML = `
      <div class="ob-card">
        <img src="icons/default.svg" class="ob-logo-icon" alt="Arborous">
        <h1 class="ob-title">Welcome to Arborous</h1>
        <p class="ob-subtitle">Your study companion — grow your knowledge one card at a time.</p>

        <div class="ob-section">
          <div class="ob-section-label">Choose your tree</div>
          <div class="ob-theme-grid">
            <button class="ob-theme-btn ob-theme-btn--active" data-tree="" aria-label="Default indigo theme">
              <img src="icons/default.svg" class="ob-theme-icon" alt="Default">
              <span class="ob-theme-name">Default</span>
            </button>
            <button class="ob-theme-btn" data-tree="winter" aria-label="Winter slate theme">
              <img src="icons/winter.svg" class="ob-theme-icon" alt="Winter">
              <span class="ob-theme-name">Winter</span>
            </button>
            <button class="ob-theme-btn" data-tree="banyan" aria-label="Banyan forest theme">
              <img src="icons/banyan.svg" class="ob-theme-icon" alt="Banyan">
              <span class="ob-theme-name">Banyan</span>
            </button>
            <button class="ob-theme-btn" data-tree="fig" aria-label="Fig tree theme">
              <img src="icons/fig.svg" class="ob-theme-icon" alt="Fig">
              <span class="ob-theme-name">Fig</span>
            </button>
          </div>
        </div>

        ${installHtml}

        <button class="btn btn--primary ob-cta" id="ob-done">Get started</button>
        <button class="btn btn--ghost ob-skip" id="ob-skip">Skip</button>
      </div>
    `;

    document.body.appendChild(overlay);

    // Theme selection
    const themeBtns = overlay.querySelectorAll('.ob-theme-btn');
    themeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        themeBtns.forEach(b => b.classList.remove('ob-theme-btn--active'));
        btn.classList.add('ob-theme-btn--active');
        TreeTheme.set(btn.dataset.tree || null);
        // Update tree picker button in header if present
        const picker = document.querySelector('.tree-picker');
        if (picker) {
          const t = TreeTheme.get();
          const info = TreeTheme.LABELS[t] || TreeTheme.LABELS[null];
          picker.innerHTML = `<img src="${info.icon}" alt="${info.name}" class="tree-picker-icon">`;
          picker.title = `Theme: ${info.name} — click to switch`;
        }
      });
    });

    // Highlight current theme
    const current = TreeTheme.get() || '';
    const activeBtn = overlay.querySelector(`[data-tree="${current}"]`);
    if (activeBtn) {
      themeBtns.forEach(b => b.classList.remove('ob-theme-btn--active'));
      activeBtn.classList.add('ob-theme-btn--active');
    }

    const close = () => {
      overlay.classList.add('ob-fade-out');
      setTimeout(() => overlay.remove(), 300);
      Onboarding.markDone();
    };

    overlay.querySelector('#ob-done').addEventListener('click', close);
    overlay.querySelector('#ob-skip').addEventListener('click', close);

    // Animate in
    requestAnimationFrame(() => overlay.classList.add('ob-visible'));
  },
};
