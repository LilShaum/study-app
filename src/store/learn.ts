import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { safeJSONStorage } from '@/lib/safeStorage';

/**
 * How Learn starts a step: with the reading, or with the questions.
 *
 * Questions first drops the reading cards (definitions, and flashcards
 * shown open) so every card is asked before its answer is shown, with the
 * passage after. For a student who has met the material already, in the
 * lecture or their slides, trying first helps even when it fails (Kornell,
 * Hays & Bjork 2009, docs/evidence.md). One setting for every lecture, as
 * it is about how the student studies, not about one course.
 */
interface LearnState {
  questionsFirst: boolean;
  setQuestionsFirst: (on: boolean) => void;
}

export const useLearnStore = create<LearnState>()(
  persist(
    (set) => ({
      questionsFirst: false,
      setQuestionsFirst: (questionsFirst) => set({ questionsFirst }),
    }),
    { name: 'arborous:learn', storage: safeJSONStorage },
  ),
);
