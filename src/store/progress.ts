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
  removeCourseProgress: (courseId: string) => void;

  /** Bulk-replace, used only by the one-time legacy-data migration. */
  _hydrateFromLegacy: (byCourse: Record<string, CourseProgress>) => void;
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
            return r && r.missed > r.got;
          }),
        );
      },

      recordResult: (courseId, itemId, got) => {
        set((state) => {
          const course = state.byCourse[courseId] ?? {};
          const prev = course[itemId] ?? { got: 0, missed: 0, lastSeen: null };
          const now = Date.now();
          const before = memoryBefore(prev);
          const next: ItemResult = {
            got: prev.got + (got ? 1 : 0),
            missed: prev.missed + (got ? 0 : 1),
            lastSeen: now,
            stability: nextStability(before, got, now),
            before,
          };
          return {
            byCourse: {
              ...state.byCourse,
              [courseId]: { ...course, [itemId]: next },
            },
          };
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
          const next: ItemResult = {
            ...prev,
            got: prev.got + (got ? 1 : -1),
            missed: prev.missed + (got ? -1 : 1),
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
