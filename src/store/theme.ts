import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { safeJSONStorage } from '@/lib/safeStorage';

export type ThemeMode = 'light' | 'dark' | null;

interface ThemeState {
  /** null follows the operating system. */
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

/**
 * Light or dark, and nothing else.
 *
 * This used to carry a `tree` as well — Winter, Banyan, Fig or the default —
 * four palettes named after four trees the app could not actually draw
 * differently. Choosing between them was a decision asked of the student for
 * no gain. The one palette that replaced them gets the care those four were
 * splitting, and the variety moved somewhere it means something: every course
 * grows its own tree.
 *
 * A stored `tree` from the old build is simply ignored rather than migrated.
 * It only ever selected a palette that no longer exists, and nothing a
 * student made is lost by dropping it.
 */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: null,
      setMode: (mode) => set({ mode }),
    }),
    {
      name: 'arborous:theme',
      storage: safeJSONStorage,
      partialize: (state) => ({ mode: state.mode }),
    },
  ),
);
