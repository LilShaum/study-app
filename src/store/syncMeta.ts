import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { safeJSONStorage } from '@/lib/safeStorage';
import { useCoursesStore } from './courses';

/**
 * When each course was last changed or deleted on this device, for sync.
 *
 * Sync merges two devices' libraries, and a course present on one and not
 * the other is either new there or deleted here; only a time tells which.
 * The courses themselves carry no timestamps (they are the student's file),
 * so the times live here, stamped by watching the courses store.
 */
interface SyncMetaState {
  editedAt: Record<string, number>;
  deletedAt: Record<string, number>;
  /** When this device last synced, or null. */
  lastSyncAt: number | null;
  /** The saved copy's updated_at when this device last read or wrote it: unchanged means no download. */
  remoteSeenAt: string | null;
  /** Fingerprint of what this device last uploaded: unchanged means no upload. */
  pushedHash: number | null;
  setLastSync: (at: number, remoteSeenAt: string, pushedHash: number) => void;
}

export const useSyncMetaStore = create<SyncMetaState>()(
  persist(
    (set) => ({
      editedAt: {},
      deletedAt: {},
      lastSyncAt: null,
      remoteSeenAt: null,
      pushedHash: null,
      setLastSync: (at, remoteSeenAt, pushedHash) => set({ lastSyncAt: at, remoteSeenAt, pushedHash }),
    }),
    { name: 'arborous:sync-meta', storage: safeJSONStorage },
  ),
);

let applying = false;

/** Runs a write that came from sync, without stamping it as a local edit. */
export function applyingSync(fn: () => void): void {
  applying = true;
  try {
    fn();
  } finally {
    applying = false;
  }
}

useCoursesStore.subscribe((state, prev) => {
  if (applying || state.courses === prev.courses) return;
  const now = Date.now();
  const editedAt = { ...useSyncMetaStore.getState().editedAt };
  const deletedAt = { ...useSyncMetaStore.getState().deletedAt };
  let changed = false;
  for (const [id, course] of Object.entries(state.courses)) {
    if (prev.courses[id] !== course) {
      editedAt[id] = now;
      changed = true;
    }
  }
  for (const id of Object.keys(prev.courses)) {
    if (!(id in state.courses)) {
      deletedAt[id] = now;
      changed = true;
    }
  }
  if (changed) useSyncMetaStore.setState({ editedAt, deletedAt });
});
