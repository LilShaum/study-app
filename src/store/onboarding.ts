import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface OnboardingState {
  onboarded: boolean;
  complete: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      onboarded: false,
      complete: () => set({ onboarded: true }),
    }),
    { name: 'arborous:onboarding' },
  ),
);
