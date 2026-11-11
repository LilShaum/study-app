import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { safeJSONStorage } from '@/lib/safeStorage';

interface ProfileState {
  /** What the student calls themself; empty until they say. Names their page and its link. */
  name: string;
  setName: (name: string) => void;
}

/** Kept on this device (not synced yet). */
export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      name: '',
      setName: (name) => set({ name: name.trim().slice(0, 40) }),
    }),
    { name: 'arborous:profile', storage: safeJSONStorage },
  ),
);

/** The page's title and the footer's link: the student's name, or "Account" until they give one. */
export const pageName = (name: string) => name || 'Account';
