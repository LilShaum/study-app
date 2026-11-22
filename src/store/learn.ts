import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { safeJSONStorage } from '@/lib/safeStorage';

/**
 * Which sections were started questions first, so a sitting left partway
 * and opened again carries on the way the section began.
 *
 * The choice is made at the start of each section, every time (the owner,
 * 2026-11-22: Skip the reading "should be asked every time at the start";
 * it was one setting for every lecture, which was "really dumb"). Questions
 * first suits material already met in the lecture or the student's notes:
 * trying first helps even when it fails (Kornell, Hays & Bjork 2009,
 * docs/evidence.md).
 */
interface LearnState {
  /** "lecture id + NUL + section id" to when it was started questions first. */
  questionsFirstIn: Record<string, number>;
  setQuestionsFirst: (courseId: string, sectionId: string, on: boolean) => void;
  /** Started questions first, within the last day: a sitting carrying on, not a new start. */
  startedQuestionsFirst: (courseId: string, sectionId: string, now?: number) => boolean;
  /**
   * Every section questions first, as a student choosing it at every start
   * would. The simulator's policy only (sim/): never saved, never set by the app.
   */
  everySection: boolean;
}

const DAY = 86_400_000;
const keyOf = (courseId: string, sectionId: string) => `${courseId}\u0000${sectionId}`;

export const useLearnStore = create<LearnState>()(
  persist(
    (set, get) => ({
      questionsFirstIn: {},
      everySection: false,
      setQuestionsFirst: (courseId, sectionId, on) =>
        set((s) => {
          const next = { ...s.questionsFirstIn };
          const now = Date.now();
          // Old choices go: only a sitting carried on reads them.
          for (const [k, at] of Object.entries(next)) if (now - at > DAY) delete next[k];
          if (on) next[keyOf(courseId, sectionId)] = now;
          else delete next[keyOf(courseId, sectionId)];
          return { questionsFirstIn: next };
        }),
      startedQuestionsFirst: (courseId, sectionId, now = Date.now()) => {
        const at = get().questionsFirstIn[keyOf(courseId, sectionId)];
        return at != null && now - at <= DAY;
      },
    }),
    {
      name: 'arborous:learn',
      storage: safeJSONStorage,
      // The old one setting for every lecture is dropped.
      version: 1,
      migrate: () => ({ questionsFirstIn: {}, everySection: false }),
      partialize: (s) => ({ questionsFirstIn: s.questionsFirstIn }),
    },
  ),
);
