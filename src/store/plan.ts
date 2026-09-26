import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { safeJSONStorage } from '@/lib/safeStorage';
import { DEFAULT_MINUTES } from '@/lib/today';

/**
 * How long the student means to study each course a day.
 *
 * Kept here rather than in the course file: the exam date and its sections
 * belong to the course and travel with it to a classmate; how much time you
 * have does not.
 */
interface PlanState {
  byCourse: Record<string, { minutes: number }>;
  minutesFor: (courseId: string) => number;
  /** Whether the student has chosen, rather than getting the default. */
  hasChosen: (courseId: string) => boolean;
  setMinutes: (courseId: string, minutes: number) => void;
}

export const usePlanStore = create<PlanState>()(
  persist(
    (set, get) => ({
      byCourse: {},
      minutesFor: (courseId) => get().byCourse[courseId]?.minutes ?? DEFAULT_MINUTES,
      hasChosen: (courseId) => courseId in get().byCourse,
      setMinutes: (courseId, minutes) =>
        set((s) => ({ byCourse: { ...s.byCourse, [courseId]: { minutes } } })),
    }),
    { name: 'arborous:plan', storage: safeJSONStorage },
  ),
);
