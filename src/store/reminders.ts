import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { safeJSONStorage } from '@/lib/safeStorage';

/**
 * What the student wants to be reminded of (docs/proposals/notifications.md).
 * Kept on the device: whether a phone may buzz is that phone's business, and
 * a computer that never had notifications allowed should not start because a
 * phone did.
 */
export interface ReminderSettings {
  /** Notifications allowed and this device subscribed. */
  on: boolean;
  /** Each day at `time`, when there is something to study. */
  daily: boolean;
  /** "HH:MM", local time. */
  time: string;
  /** A few hours after a sitting with misses, once. */
  secondLook: boolean;
  /** Three days and one day before an exam with a date. */
  exam: boolean;
}

interface RemindersState extends ReminderSettings {
  set: (patch: Partial<ReminderSettings>) => void;
}

export const DEFAULT_TIME = '18:00';

export const useRemindersStore = create<RemindersState>()(
  persist(
    (set) => ({
      on: false,
      daily: true,
      time: DEFAULT_TIME,
      secondLook: true,
      exam: true,
      set: (patch) => set(patch),
    }),
    { name: 'arborous:reminders', storage: safeJSONStorage },
  ),
);
