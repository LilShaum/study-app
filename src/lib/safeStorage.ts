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

/** Flipped by every failed write; read and cleared by `persisted()`. */
let writeFailedSinceCheck = false;

/**
 * Runs an action and reports whether everything it wrote actually landed.
 *
 * This exists because of what a silent failure looked like: with storage
 * full, uploading a course showed the course in the library, showed a
 * SUCCESS toast, and lost it on the next reload. The store had updated in
 * memory and the write underneath it had thrown — and the one-per-session
 * warning had already been spent on something else, so nothing said a word.
 *
 * zustand's persist middleware writes synchronously inside `set()`, so an
 * action's writes have all been attempted by the time it returns and this
 * flag is accurate for the action just run.
 */
export function persisted<T>(action: () => T): { result: T; ok: boolean } {
  beginWriteCheck();
  const result = action();
  return { result, ok: writesLanded() };
}

/**
 * The same check around an `await`.
 *
 * `persisted()` cannot wrap an async action: the function returns its promise
 * immediately and the write happens later, so the flag would be read before
 * the write was even attempted. Callers that await must bracket the awaited
 * call with these two instead.
 */
export function beginWriteCheck(): void {
  writeFailedSinceCheck = false;
}

/** True when nothing failed to write since `beginWriteCheck()`. Clears the flag. */
export function writesLanded(): boolean {
  const ok = !writeFailedSinceCheck;
  writeFailedSinceCheck = false;
  return ok;
}

/** Bytes currently held in localStorage, and the usual browser ceiling. */
export function storageUsage(): { used: number; limit: number } | null {
  try {
    let used = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key === null) continue;
      used += key.length + (localStorage.getItem(key)?.length ?? 0);
    }
    // Browsers don't expose the localStorage cap; 5MB is the near-universal
    // value and is only ever used here to give the number a scale.
    return { used: used * 2, limit: 5 * 1024 * 1024 };
  } catch {
    return null;
  }
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
      writeFailedSinceCheck = true;
      // The ambient warning stays once-per-session — a failing write usually
      // keeps failing and a toast per keystroke would be worse than the
      // problem. Callers that need to know about THEIR write use persisted().
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
