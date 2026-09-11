import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | null;
export type TreeName = 'winter' | 'banyan' | 'fig' | null;

export interface TreeInfo {
  value: TreeName;
  name: string;
  desc: string;
}

/** Cycle order + display copy, ported from the vanilla TreeTheme.LABELS. */
export const TREE_THEMES: readonly TreeInfo[] = [
  { value: null, name: 'Default', desc: 'Classic indigo' },
  { value: 'winter', name: 'Winter', desc: 'Icy slate blue' },
  { value: 'banyan', name: 'Banyan', desc: 'Forest green' },
  { value: 'fig', name: 'Fig', desc: 'Deep purple' },
];

interface ThemeState {
  mode: ThemeMode;
  tree: TreeName;
  setMode: (mode: ThemeMode) => void;
  setTree: (tree: TreeName) => void;
  cycleTree: () => TreeName;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: null,
      tree: null,

      setMode: (mode) => set({ mode }),
      setTree: (tree) => set({ tree }),

      cycleTree: () => {
        const idx = TREE_THEMES.findIndex((t) => t.value === get().tree);
        const next = TREE_THEMES[(idx + 1) % TREE_THEMES.length].value;
        set({ tree: next });
        return next;
      },
    }),
    { name: 'arborous:theme' },
  ),
);

/** True if dark mode is currently in effect (explicit choice, or system default). */
export function isDarkNow(mode: ThemeMode): boolean {
  return mode === 'dark' || (mode === null && window.matchMedia('(prefers-color-scheme: dark)').matches);
}
