import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ItemResult {
  got: number;
  missed: number;
  lastSeen: number | null;
}

type CourseProgress = Record<string, ItemResult>;

interface ProgressState {
  byCourse: Record<string, CourseProgress>;

  getProgress: (courseId: string) => CourseProgress;
  missedIds: (courseId: string) => Set<string>;
  recordResult: (courseId: string, itemId: string, got: boolean) => void;
  removeCourseProgress: (courseId: string) => void;

  /** Bulk-replace, used only by the one-time legacy-data migration. */
  _hydrateFromLegacy: (byCourse: Record<string, CourseProgress>) => void;
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      byCourse: {},

      getProgress: (courseId) => get().byCourse[courseId] ?? {},

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
          const next: ItemResult = {
            got: prev.got + (got ? 1 : 0),
            missed: prev.missed + (got ? 0 : 1),
            lastSeen: Date.now(),
          };
          return {
            byCourse: {
              ...state.byCourse,
              [courseId]: { ...course, [itemId]: next },
            },
          };
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
      partialize: (state) => ({ byCourse: state.byCourse }),
    },
  ),
);
