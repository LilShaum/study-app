import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { safeJSONStorage } from '@/lib/safeStorage';
import { memoryBefore, nextStability } from '@/lib/memory';

export interface ItemResult {
  got: number;
  missed: number;
  lastSeen: number | null;
  /** Days for recall to fade to ~37% (see lib/memory.ts). Absent on records older than the model. */
  stability?: number;
  /**
   * The memory state just before the latest answer — null if it was the
   * first. Kept so an override can recompute stability from where it was,
   * rather than stacking a second update on the first.
   */
  before?: { stability: number; lastSeen: number } | null;
  /**
   * Definitions this item's term has been mistaken for, most recent first —
   * a typed answer that named one of them. Sessions put the two side by side
   * until the difference sticks.
   */
  confusedWith?: string[];
  /** Whether the latest answer was right. Absent on records from before it was kept. */
  lastGot?: boolean;
  /**
   * When it was last answered in a practice test: a new test asks first
   * what has not been on one yet (lib/practiceTest drawTest).
   */
  testedAt?: number;
  /**
   * When it was last answered wrong. A miss put right by a retry minutes
   * later in the same sitting is still worth the catch-up a few hours on
   * (lib/memory.ts, missedThisSitting).
   */
  missedAt?: number;
}

/**
 * Whether an item counts as missed: its latest answer was wrong. Records from
 * before the latest answer was kept fall back to the counts, which is what
 * "missed" used to mean everywhere — and was wrong for an item missed three
 * times and then got right twice, which still counted as missed.
 */
/** Two moments on the same local calendar day. */
function sameDay(a: number, b: number): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

export function isMissed(r: ItemResult | undefined): boolean {
  if (!r || r.got + r.missed === 0) return false;
  return r.lastGot != null ? !r.lastGot : r.missed > r.got;
}

/**
 * Practice's Mistakes: missed, and not yet got right on a later day than the
 * miss. A right answer minutes after a miss is the answer just seen, and
 * held nothing on a later day in the simulator (sim/FINDINGS.md,
 * 2026-10-12); it used to take the card off the list. The same rule keeps a
 * mix-up (confusedWith).
 */
export function isMistake(r: ItemResult | undefined): boolean {
  if (isMissed(r)) return true;
  return r?.lastGot === true && r.missedAt != null && r.lastSeen != null && sameDay(r.missedAt, r.lastSeen);
}

type CourseProgress = Record<string, ItemResult>;

/**
 * Shared empty result for courses with no recorded progress.
 *
 * This MUST be a stable reference. Returning a fresh `{}` makes zustand's
 * useSyncExternalStore see a changed snapshot on every check, which sends any
 * subscribed component into an infinite render loop (it crashed the whole
 * progress dashboard). Frozen so a caller can't mutate the shared instance.
 */
export const EMPTY_PROGRESS: CourseProgress = Object.freeze({});

interface ProgressState {
  byCourse: Record<string, CourseProgress>;

  getProgress: (courseId: string) => CourseProgress;
  missedIds: (courseId: string) => Set<string>;
  recordResult: (courseId: string, itemId: string, got: boolean) => void;
  /** Several answers in one write (a practice test's whole batch), each as recordResult would. */
  recordResults: (courseId: string, results: { itemId: string; got: boolean }[]) => void;
  /**
   * Correct an attempt already recorded, rather than record another one.
   *
   * The override after a typed answer — "I was right, count it" — must MOVE
   * one attempt from missed to got (or back). Recording a fresh result
   * instead would log two attempts for one answer, and a student overruling a
   * grader that marked them wrong would still carry the miss.
   */
  reviseResult: (courseId: string, itemId: string, got: boolean) => void;
  /** Note that the answer to `itemId` was mistaken for definition `otherId`. */
  noteConfusion: (courseId: string, itemId: string, otherId: string) => void;
  /** Marks cards as answered in a practice test at `at` (ItemResult.testedAt). */
  noteTested: (courseId: string, itemIds: string[], at: number) => void;
  removeCourseProgress: (courseId: string) => void;

  /** Bulk-replace, used only by the one-time legacy-data migration. */
  _hydrateFromLegacy: (byCourse: Record<string, CourseProgress>) => void;
}

/** A card's record after one more answer. */
function answered(was: ItemResult | undefined, got: boolean, now: number): ItemResult {
  const prev = was ?? { got: 0, missed: 0, lastSeen: null };
  const before = memoryBefore(prev);
  return {
    got: prev.got + (got ? 1 : 0),
    missed: prev.missed + (got ? 0 : 1),
    lastSeen: now,
    stability: nextStability(before, got, now),
    before,
    lastGot: got,
    ...(got ? (prev.missedAt != null ? { missedAt: prev.missedAt } : {}) : { missedAt: now }),
    // A mix-up is kept until the term is got right on a later day.
    // It used to be dropped by the next answer of any kind, so a pair
    // was put side by side in one session at most.
    ...(prev.confusedWith?.length && !(got && prev.lastSeen != null && !sameDay(prev.lastSeen, now))
      ? { confusedWith: prev.confusedWith }
      : {}),
    ...(prev.testedAt != null ? { testedAt: prev.testedAt } : {}),
  };
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      byCourse: {},

      getProgress: (courseId) => get().byCourse[courseId] ?? EMPTY_PROGRESS,

      missedIds: (courseId) => {
        const progress = get().getProgress(courseId);
        return new Set(
          Object.keys(progress).filter((itemId) => {
            const r = progress[itemId];
            return isMistake(r);
          }),
        );
      },

      recordResult: (courseId, itemId, got) => get().recordResults(courseId, [{ itemId, got }]),

      recordResults: (courseId, results) => {
        if (!results.length) return;
        set((state) => {
          const course = { ...(state.byCourse[courseId] ?? {}) };
          const now = Date.now();
          for (const { itemId, got } of results) course[itemId] = answered(course[itemId], got, now);
          return { byCourse: { ...state.byCourse, [courseId]: course } };
        });
      },

      reviseResult: (courseId, itemId, got) => {
        set((state) => {
          const course = state.byCourse[courseId];
          const prev = course?.[itemId];
          // Nothing to revise: the caller should have recorded instead.
          if (!prev) return state;
          const from = got ? prev.missed : prev.got;
          if (from <= 0) return state;
          // The latest answer is the one revised: an overruled miss did not
          // happen, and a miss recorded on review did.
          const { missedAt: _wasMissedAt, ...rest } = prev;
          void _wasMissedAt;
          const next: ItemResult = {
            ...rest,
            ...(got ? (prev.missedAt != null && prev.missedAt !== prev.lastSeen ? { missedAt: prev.missedAt } : {}) : prev.lastSeen != null ? { missedAt: prev.lastSeen } : {}),
            got: prev.got + (got ? 1 : -1),
            missed: prev.missed + (got ? -1 : 1),
            lastGot: got,
            // Redo the latest update the other way. A record from before the
            // model has no snapshot to redo it from, and keeps what it has.
            ...(prev.before !== undefined && prev.lastSeen != null
              ? { stability: nextStability(prev.before, got, prev.lastSeen) }
              : {}),
          };
          return { byCourse: { ...state.byCourse, [courseId]: { ...course, [itemId]: next } } };
        });
      },

      noteConfusion: (courseId, itemId, otherId) => {
        set((state) => {
          const course = state.byCourse[courseId];
          const prev = course?.[itemId];
          // Recorded straight after the answer that revealed it; without that
          // record there is nothing to attach it to.
          if (!prev) return state;
          // Three is plenty: a term confused with more than that is not
          // confused with anything in particular.
          const confusedWith = [otherId, ...(prev.confusedWith ?? []).filter((id) => id !== otherId)].slice(0, 3);
          return { byCourse: { ...state.byCourse, [courseId]: { ...course, [itemId]: { ...prev, confusedWith } } } };
        });
      },

      noteTested: (courseId, itemIds, at) => {
        set((state) => {
          const course = state.byCourse[courseId];
          if (!course || !itemIds.length) return state;
          const next = { ...course };
          for (const id of itemIds) if (next[id]) next[id] = { ...next[id], testedAt: Math.max(at, next[id].testedAt ?? 0) };
          return { byCourse: { ...state.byCourse, [courseId]: next } };
        });
      },

      removeCourseProgress: (courseId) => {
        set((state) => {
          const byCourse = { ...state.byCourse };
          delete byCourse[courseId];
          return { byCourse };
        });
      },

      _hydrateFromLegacy: (byCourse) => {
        set((state) => ({ byCourse: { ...byCourse, ...state.byCourse } }));
      },
    }),
    {
      name: 'arborous:progress',
      storage: safeJSONStorage,
      partialize: (state) => ({ byCourse: state.byCourse }),
    },
  ),
);

/**
 * Move a course's whole study history back in time, as if `days` had passed
 * since every answer. For testing only (Help, with ?devtools): forgetting takes
 * real days, and without this the falling and regrowing leaves cannot be
 * seen on the day they are built. Nothing but the timestamps changes.
 */
export function agedProgress(progress: Record<string, ItemResult>, days: number): Record<string, ItemResult> {
  const ms = days * 86_400_000;
  const out: Record<string, ItemResult> = {};
  for (const [id, r] of Object.entries(progress)) {
    out[id] = {
      ...r,
      lastSeen: r.lastSeen == null ? null : r.lastSeen - ms,
      ...(r.before ? { before: { ...r.before, lastSeen: r.before.lastSeen - ms } } : {}),
    };
  }
  return out;
}

/**
 * Progress for a test copy of a course: every one of `ids` answered right
 * once, `daysAgo` days ago. For the testing tools only (Help, ?devtools).
 */
export function studiedProgress(ids: string[], daysAgo: number): Record<string, ItemResult> {
  const at = Date.now() - daysAgo * 86_400_000;
  return Object.fromEntries(ids.map((id) => [id, { got: 1, missed: 0, lastSeen: at, stability: 2, before: null }]));
}
