import { createJSONStorage } from 'zustand/middleware';

/**
 * localStorage wrapper that never throws.
 *
 * zustand's persist middleware calls storage.setItem() synchronously inside
 * set(), with no error handling of its own — so a QuotaExceededError (or
 * Safari private mode, or blocked site data) propagates straight out of a
 * store action and blows up the React tree mid-study-session. The vanilla app
 * guarded this explicitly; losing one recorded answer is fine, crashing is not.
 *
 * Quota is a realistic failure here, not a theoretical one: `graphic` items
 * embed inline SVG, so a library of diagram-heavy courses can genuinely fill
 * the ~5MB budget.
 */

let quotaWarned = false;

/** Set by the app at startup so this module doesn't import UI code directly. */
let onWriteFailure: ((message: string) => void) | null = null;

export function setStorageFailureHandler(handler: (message: string) => void): void {
  onWriteFailure = handler;
}

const safeLocalStorage: Storage = {
  get length() {
    try {
      return localStorage.length;
    } catch {
      return 0;
    }
  },
  key(index) {
    try {
      return localStorage.key(index);
    } catch {
      return null;
    }
  },
  getItem(name) {
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem(name, value) {
    try {
      localStorage.setItem(name, value);
    } catch {
      // Warn once per session — a failing write usually keeps failing, and a
      // toast per keystroke would be worse than the problem.
      if (!quotaWarned) {
        quotaWarned = true;
        onWriteFailure?.(
          "Couldn't save — browser storage is full. Export a course and remove it to free up space.",
        );
      }
    }
  },
  removeItem(name) {
    try {
      localStorage.removeItem(name);
    } catch {
      /* nothing useful to do */
    }
  },
  clear() {
    try {
      localStorage.clear();
    } catch {
      /* nothing useful to do */
    }
  },
};

/** Drop-in replacement for persist's default storage. */
export const safeJSONStorage = createJSONStorage(() => safeLocalStorage);
