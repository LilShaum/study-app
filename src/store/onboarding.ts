import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { safeJSONStorage } from '@/lib/safeStorage';

interface OnboardingState {
  onboarded: boolean;
  complete: () => void;
  /**
   * Shows the welcome again.
   *
   * Without this, `complete()` was one-way and the screen was unreachable for
   * the rest of the app's life — including for anyone migrated from the
   * vanilla app, who was marked onboarded by the migration and so never saw
   * this version's welcome at all.
   */
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      onboarded: false,
      complete: () => set({ onboarded: true }),
      reset: () => set({ onboarded: false }),
    }),
    { name: 'arborous:onboarding', storage: safeJSONStorage },
  ),
);
