import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { safeJSONStorage } from '@/lib/safeStorage';
import type { StudyMode } from '@/lib/buildSessionItems';

export interface Bookmark {
  mode: StudyMode;
  /** The section the session was scoped to, or null for the whole course. */
  sectionId: string | null;
  /**
   * Where to pick up, as an item id rather than a position.
   *
   * Position would be wrong for half the modes: Mixed and Review Missed
   * reshuffle on every start, and Weakest First reorders as your accuracy
   * changes, so index 47 means a different item next time. An id survives all
   * of that, and survives the course being edited around it.
   */
  itemId: string;
  /** Position at the time of saving — display only ("item 47 of 151"). */
  index: number;
  total: number;
  updatedAt: number;
}

interface ResumeState {
  /** One bookmark per course: the last place you actually were. */
  byCourse: Record<string, Bookmark>;

  getBookmark: (courseId: string) => Bookmark | null;
  save: (courseId: string, bookmark: Bookmark) => void;
  clear: (courseId: string) => void;
  /** Used by the library's delete-with-undo, to put one back. */
  restore: (courseId: string, bookmark: Bookmark | null) => void;
}

export const useResumeStore = create<ResumeState>()(
  persist(
    (set, get) => ({
      byCourse: {},

      getBookmark: (courseId) => get().byCourse[courseId] ?? null,

      save: (courseId, bookmark) => {
        set((state) => ({ byCourse: { ...state.byCourse, [courseId]: bookmark } }));
      },

      clear: (courseId) => {
        set((state) => {
          if (!state.byCourse[courseId]) return state;
          const byCourse = { ...state.byCourse };
          delete byCourse[courseId];
          return { byCourse };
        });
      },

      restore: (courseId, bookmark) => {
        if (!bookmark) return;
        set((state) => ({ byCourse: { ...state.byCourse, [courseId]: bookmark } }));
      },
    }),
    {
      name: 'arborous:resume',
      storage: safeJSONStorage,
      partialize: (state) => ({ byCourse: state.byCourse }),
    },
  ),
);
