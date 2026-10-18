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
let trimWarned = false;

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

/**
 * Bytes held in localStorage, counted the strict way, and the ceiling.
 *
 * Browsers count differently. Chromium allows 5,242,880 characters of any
 * kind (measured 2026-10-18). WebKit, the iPhone's engine, is thought to
 * count bytes: one per character for text that is all Latin-1 (plain
 * JSON), two for any other (the packed lectures, lib/packedStorage.ts).
 * The figure here takes the stricter of the two, so a warning built on it
 * comes early rather than late.
 */
/** Any character past Latin-1, which takes two bytes where it is counted in bytes. */
const WIDE = /[\u0100-\uffff]/;

export function storageUsage(): { used: number; limit: number } | null {
  try {
    let used = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key === null) continue;
      const value = localStorage.getItem(key) ?? '';
      const wide = WIDE.test(value) || WIDE.test(key);
      used += (key.length + value.length) * (wide ? 2 : 1);
    }
    return { used, limit: 5 * 1024 * 1024 };
  } catch {
    return null;
  }
}

const STUDY_LOG_KEY = 'arborous:study-log';

/**
 * The study log with only the newer part of each lecture's history kept
 * (`keep` of its answers and card times), or null if it cannot be read.
 */
export function trimStudyLog(raw: string, keep: number): string | null {
  try {
    const log = JSON.parse(raw) as { state?: { byCourse?: Record<string, { answers?: unknown[]; times?: unknown[] }> } };
    for (const c of Object.values(log.state?.byCourse ?? {})) {
      if (Array.isArray(c.answers)) c.answers = c.answers.slice(Math.floor(c.answers.length * (1 - keep)));
      if (Array.isArray(c.times)) c.times = c.times.slice(Math.floor(c.times.length * (1 - keep)));
    }
    return JSON.stringify(log);
  } catch {
    return null;
  }
}

/**
 * Writes one value; false if the browser would not take it.
 *
 * When storage is full, room is made from the study log, the one thing here
 * that only tunes timing: first its older half, then its older three
 * quarters. It is never deleted outright any more. It used to be, silently,
 * and it is the record the forgetting-rate fit and the owner's calibration
 * depend on (docs/audits/2026-10-17-weak-points.md). Trimming is said out
 * loud, once.
 */
export function trySetItem(name: string, value: string): boolean {
  try {
    localStorage.setItem(name, value);
    return true;
  } catch {
    if (name === STUDY_LOG_KEY) {
      // The log itself does not fit: save its newer part, so what is stored
      // stays in step with what is kept (the full log is still in memory and
      // in any backup until the app reloads).
      for (const keep of [0.5, 0.25]) {
        const trimmed = trimStudyLog(value, keep);
        if (trimmed == null) break;
        try {
          localStorage.setItem(name, trimmed);
          if (!trimWarned) {
            trimWarned = true;
            onWriteFailure?.(
              'Storage is almost full, so the oldest part of your study history was trimmed to make room. Back up (Help), then remove a lecture you no longer need.',
            );
          }
          return true;
        } catch {
          /* still full */
        }
      }
    } else {
      let original: string | null = null;
      try {
        original = localStorage.getItem(STUDY_LOG_KEY);
      } catch {
        /* unreadable: nothing to trim */
      }
      let trimmedAny = false;
      for (const keep of original == null ? [] : [0.5, 0.25]) {
        const trimmed = trimStudyLog(original!, keep);
        if (trimmed == null || trimmed.length >= original!.length) break;
        try {
          localStorage.setItem(STUDY_LOG_KEY, trimmed);
          trimmedAny = true;
          localStorage.setItem(name, value);
          if (!trimWarned) {
            trimWarned = true;
            onWriteFailure?.(
              'Storage is almost full, so the oldest part of your study history was trimmed to make room. Back up (Help), then remove a lecture you no longer need.',
            );
          }
          return true;
        } catch {
          /* still full: trim further, or give up */
        }
      }
      // Trimming did not make room: put the history back as it was, rather
      // than lose it for a save that failed anyway.
      if (trimmedAny) {
        try {
          localStorage.setItem(STUDY_LOG_KEY, original!);
        } catch {
          /* it no longer fits either; the trimmed copy stays */
        }
      }
    }
    writeFailedSinceCheck = true;
    // The ambient warning stays once-per-session — a failing write usually
    // keeps failing and a toast per keystroke would be worse than the
    // problem. Callers that need to know about THEIR write use persisted().
    if (!quotaWarned) {
      quotaWarned = true;
      onWriteFailure?.("Couldn't save because browser storage is full. Back up (Help), then remove a lecture you no longer need.");
    }
    return false;
  }
}

export const safeLocalStorage: Storage = {
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
    trySetItem(name, value);
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
