/**
 * Whether the library should say something about keeping the student's work
 * safe, and what.
 *
 * Lectures and progress live only in this browser unless sync is on, and on
 * an iPhone deleting the home-screen app deletes them too. The audit of
 * 2026-10-17 found the owner's whole semester on one phone, never backed up,
 * with nothing in the app pointing at the backup button in Help. So the
 * library says so, quietly, when there is something to lose, and says first
 * when storage is filling up, before a save fails.
 */

export const BACKED_UP_KEY = 'arborous:backed-up';

/** What the last backup held, to tell whether anything has changed since. */
export interface BackedUp {
  at: number;
  lectures: number;
  answers: number;
  /** Which lectures it held: a lecture swapped for another is a change the counts miss. */
  lectureIds?: string[];
  /** "Not now" pressed at this time: quiet for a few days. */
  dismissedAt?: number;
}

export type KeepSafe =
  | { kind: 'storage'; pct: number }
  | { kind: 'backup'; lectures: number; answers: number; lastAt: number | null; answersSince: number };

const DAY = 86_400_000;
/** A backup this recent is enough, whatever changed since. */
export const BACKUP_FRESH_DAYS = 7;
/** "Not now" keeps it quiet this long. */
export const SNOOZE_DAYS = 3;
/** Storage this full is worth a word before it is completely full. */
export const STORAGE_WARN_PCT = 75;

export function keepSafe(input: {
  lectures: number;
  answers: number;
  lectureIds?: string[];
  syncOn: boolean;
  backedUp: BackedUp | null;
  storagePct: number | null;
  now: number;
}): KeepSafe | null {
  const { lectures, answers, lectureIds, syncOn, backedUp, storagePct, now } = input;
  if (lectures === 0) return null;
  if (storagePct != null && storagePct >= STORAGE_WARN_PCT) return { kind: 'storage', pct: storagePct };
  // Sync keeps a copy already; and nothing studied is little to lose.
  if (syncOn || answers === 0) return null;
  if (backedUp?.dismissedAt && now - backedUp.dismissedAt < SNOOZE_DAYS * DAY) return null;
  if (backedUp?.at) {
    const known = backedUp.lectureIds ? new Set(backedUp.lectureIds) : null;
    const newLecture = known ? (lectureIds ?? []).some((id) => !known.has(id)) : lectures > backedUp.lectures;
    const changed = newLecture || answers > backedUp.answers;
    if (!changed || now - backedUp.at < BACKUP_FRESH_DAYS * DAY) return null;
  }
  return {
    kind: 'backup',
    lectures,
    answers,
    lastAt: backedUp?.at || null,
    answersSince: backedUp?.at ? Math.max(0, answers - backedUp.answers) : answers,
  };
}

/** The last backup as recorded on this device; `at` is 0 if there has been none (only a "Not now"). */
export function readBackedUp(): BackedUp | null {
  try {
    const raw = localStorage.getItem(BACKED_UP_KEY);
    const v = raw ? (JSON.parse(raw) as Partial<BackedUp>) : null;
    if (!v || typeof v !== 'object') return null;
    return {
      at: Number(v.at) || 0,
      lectures: Number(v.lectures) || 0,
      answers: Number(v.answers) || 0,
      lectureIds: Array.isArray(v.lectureIds) ? v.lectureIds.filter((x): x is string => typeof x === 'string') : undefined,
      dismissedAt: Number(v.dismissedAt) || undefined,
    };
  } catch {
    return null;
  }
}

/** Every answer recorded, across lectures: what a lost device would lose. */
export function countAnswers(byCourse: Record<string, Record<string, { got?: number; missed?: number }>>): number {
  let n = 0;
  for (const items of Object.values(byCourse ?? {})) for (const r of Object.values(items ?? {})) n += (r?.got ?? 0) + (r?.missed ?? 0);
  return n;
}

export function writeBackedUp(v: BackedUp): void {
  try {
    localStorage.setItem(BACKED_UP_KEY, JSON.stringify(v));
  } catch {
    // Storage blocked: the reminder may show again, which is harmless.
  }
}
