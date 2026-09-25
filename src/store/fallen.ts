import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { safeJSONStorage } from '@/lib/safeStorage';

/**
 * Which of a section's lost leaves have already been seen to fall.
 *
 * A leaf falls once. Letting a branch shed the same leaves every time it was
 * chosen made the fall a hover effect, not an event — it stopped saying that
 * something had been lost since you last looked.
 *
 * A section's clumps are lost from the end: clumps from `shown` onwards are
 * on the ground. So one number per section is enough — the clump index from
 * which the leaves have already fallen. A ghost below it is a new loss.
 */
interface FallenState {
  byCourse: Record<string, Record<string, number>>;
  /** Record that everything from clump `from` onwards has now been seen falling. */
  fell: (courseId: string, sectionId: string, from: number) => void;
  /**
   * Bring the record up to what the tree now shows. Regrowth puts clumps back
   * on the branch; if they are lost again, that is a new fall. With nothing
   * lost at all the record goes.
   */
  sync: (courseId: string, shownBySection: Record<string, number | null>) => void;
  clear: (courseId?: string) => void;
}

export const useFallenStore = create<FallenState>()(
  persist(
    (set, get) => ({
      byCourse: {},
      fell: (courseId, sectionId, from) =>
        set((s) => ({
          byCourse: { ...s.byCourse, [courseId]: { ...s.byCourse[courseId], [sectionId]: from } },
        })),
      sync: (courseId, shownBySection) => {
        const was = get().byCourse[courseId];
        if (!was) return;
        let next: Record<string, number> | undefined;
        for (const [sid, from] of Object.entries(was)) {
          const shown = shownBySection[sid];
          if (shown === undefined) continue;
          if (shown === null) {
            next ??= { ...was };
            delete next[sid];
          } else if (shown > from) {
            next ??= { ...was };
            next[sid] = shown;
          }
        }
        if (next) set((s) => ({ byCourse: { ...s.byCourse, [courseId]: next } }));
      },
      clear: (courseId) =>
        set((s) => {
          if (!courseId) return { byCourse: {} };
          const rest = { ...s.byCourse };
          delete rest[courseId];
          return { byCourse: rest };
        }),
    }),
    { name: 'arborous:fallen', storage: safeJSONStorage },
  ),
);

