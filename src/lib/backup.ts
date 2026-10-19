/**
 * Everything this device has saved, as one file, and the way back in.
 *
 * Export covers one course and none of the progress on it. That left no way
 * to move to another device, to the installed app on an iPhone (it keeps its
 * own storage, separate from Safari), or to a new address if the app moves
 * (docs/rename-plan.md) without starting over.
 *
 * The backup is every localStorage key the app owns, copied as-is. Copying
 * keys rather than store fields means a store added later is backed up
 * without anyone remembering to add it here, and restoring is exact: the
 * stores read the same strings they wrote.
 */

import { useCoursesStore } from '@/store/courses';
import { useProgressStore } from '@/store/progress';
import { useThemeStore } from '@/store/theme';
import { useOnboardingStore } from '@/store/onboarding';
import { useResumeStore } from '@/store/resume';
import { useStudyLogStore } from '@/store/studyLog';
import { usePlanStore } from '@/store/plan';
import { useFallenStore } from '@/store/fallen';
import { pack, unpack, writePackedCourses } from './packedStorage';
import { countAnswers, writeBackedUp } from './keepSafe';
import { hasSavedSignIn } from './cloud';
import { toast, useToastStore } from '@/store/toast';

const PREFIX = 'arborous:';
/** Set by a restore, so any other open tab reloads instead of writing its old state back. */
export const RESTORED_KEY = `${PREFIX}restored-at`;
const SYNC_META_KEY = `${PREFIX}sync-meta`;

/** The persisted stores, whose in-memory state is the truth when storage has fallen behind. */
const STORES = [
  useCoursesStore,
  useProgressStore,
  useThemeStore,
  useOnboardingStore,
  useResumeStore,
  useStudyLogStore,
  usePlanStore,
  useFallenStore,
];

interface PersistApi {
  persist: { getOptions: () => { name?: string; version?: number; partialize?: (s: unknown) => unknown } };
  getState: () => unknown;
}

/** Each persisted store's key, its current state as persist would write it, and its version. */
function storeSnapshots(): { name: string; value: string; version: number }[] {
  return (STORES as unknown as PersistApi[]).flatMap((store) => {
    const { name, version = 0, partialize } = store.persist.getOptions();
    if (!name) return [];
    const state = partialize ? partialize(store.getState()) : store.getState();
    return [{ name, value: JSON.stringify({ state, version }), version }];
  });
}
const KIND = 'arborous-backup';

/** The courses store's state as plain JSON, `{ state, version }`, as every backup holds it. */
function isStoreSnapshot(v: string): boolean {
  try {
    const parsed = JSON.parse(v);
    return !!parsed && typeof parsed === 'object' && !!parsed.state && typeof parsed.state === 'object';
  } catch {
    return false;
  }
}
const COURSES_KEY = 'arborous:courses';

export interface Backup {
  kind: typeof KIND;
  version: 1;
  createdAt: string;
  data: Record<string, string>;
}

function ownKeys(): string[] {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(PREFIX)) keys.push(k);
  }
  return keys;
}

export function makeBackup(now = new Date()): Backup {
  const data: Record<string, string> = {};
  // Sync's own bookkeeping stays behind: it describes this device's last
  // sync, and carried to another device it would make that one skip a
  // download it needs. A restored device starts sync afresh.
  // Each lecture's own compressed key is left out too: the courses store's
  // snapshot below carries every lecture, as plain JSON any version reads.
  for (const k of ownKeys()) {
    if (k !== RESTORED_KEY && k !== SYNC_META_KEY && !k.startsWith(`${COURSES_KEY}/`)) data[k] = localStorage.getItem(k) ?? '';
  }
  // The stores' state in memory, not what last reached storage: when storage
  // is full, recent changes live only in memory, and a backup is exactly when
  // they must not be lost.
  for (const { name, value } of storeSnapshots()) data[name] = value;
  return { kind: KIND, version: 1, createdAt: now.toISOString(), data };
}

/**
 * Whether the backup was made by a newer app than this one. A store given a
 * newer format than it knows would load empty and then write that emptiness
 * back over the restored data, so such a backup is refused instead.
 */
function fromNewerApp(backup: Backup): boolean {
  return storeSnapshots().some(({ name, version }) => {
    try {
      const saved = JSON.parse(backup.data[name] ?? 'null')?.version;
      return typeof saved === 'number' && saved > version;
    } catch {
      return false;
    }
  });
}

export function backupFileName(now = new Date()): string {
  const d = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return `arborous-backup-${d}.json`;
}

/**
 * Reads a backup file, or says in plain words why it isn't one. A course file
 * is the likely mistake, and it has its own way in.
 */
export function readBackup(text: string): { ok: true; backup: Backup } | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: "That file isn't a backup: it couldn't be read." };
  }
  const b = parsed as Partial<Backup> & { schema_version?: unknown; sections?: unknown };
  if (b && typeof b === 'object' && 'sections' in b && 'schema_version' in b) {
    return { ok: false, error: "That's a lecture file, not a backup. Add it from the library with Upload." };
  }
  if (!b || b.kind !== KIND || !b.data || typeof b.data !== 'object') {
    return { ok: false, error: "That file isn't an Arborous backup." };
  }
  const data: Record<string, string> = {};
  for (const [k, v] of Object.entries(b.data)) {
    if (k.startsWith(PREFIX) && typeof v === 'string') data[k] = v;
  }
  const backup: Backup = { kind: KIND, version: 1, createdAt: String(b.createdAt ?? ''), data };
  if (fromNewerApp(backup)) {
    return { ok: false, error: 'This backup is from a newer version of Arborous. Close the app, open it again to update, then restore.' };
  }
  return { ok: true, backup };
}

/** What a backup, or this device, holds: the restore sheet's comparison. */
export interface Holdings {
  /** Lecture id → title. */
  lectures: Record<string, string>;
  /** Cards answered, every time counted. */
  answers: number;
}

const titles = (courses: unknown): Record<string, string> =>
  Object.fromEntries(
    Object.entries(courses && typeof courses === 'object' ? (courses as Record<string, { metadata?: { title?: unknown } }>) : {}).map(
      ([id, c]) => [id, typeof c?.metadata?.title === 'string' ? c.metadata.title : id],
    ),
  );

/** Answers on the lectures there are: progress left by a removed lecture is not anything a student would miss. */
function holdings(courses: unknown, byCourse: unknown): Holdings {
  const lectures = titles(courses);
  const progress = byCourse && typeof byCourse === 'object' ? (byCourse as Parameters<typeof countAnswers>[0]) : {};
  return { lectures, answers: countAnswers(Object.fromEntries(Object.entries(progress).filter(([id]) => id in lectures))) };
}

export function holdingsOf(backup: Backup): Holdings {
  try {
    return holdings(
      JSON.parse(backup.data[COURSES_KEY] ?? '{}')?.state?.courses,
      JSON.parse(backup.data[`${PREFIX}progress`] ?? '{}')?.state?.byCourse,
    );
  } catch {
    return { lectures: {}, answers: 0 };
  }
}

export function holdingsHere(): Holdings {
  return holdings(useCoursesStore.getState().courses, useProgressStore.getState().byCourse);
}

/** Nothing here to lose (no lecture, no answer, no study time): a new device restores without asking. */
export function nothingHere(): boolean {
  return (
    !Object.keys(useCoursesStore.getState().courses).length &&
    !countAnswers(useProgressStore.getState().byCourse) &&
    !Object.keys(useStudyLogStore.getState().byCourse ?? {}).length
  );
}

/**
 * Replaces everything saved on this device with the backup. The caller
 * reloads the page afterwards, so every store starts from what was restored.
 * Returns false if the browser would not take it (storage full or blocked);
 * what was there before is put back.
 */
export function restoreBackup(backup: Backup): boolean {
  const before = makeBackup().data;
  const replace = (data: Record<string, string>) => {
    for (const k of ownKeys()) localStorage.removeItem(k);
    for (const [k, v] of Object.entries(data)) {
      // Lectures go in compressed, so a backup that fits stored that way is
      // never refused for its plain size.
      if (k === COURSES_KEY && isStoreSnapshot(v)) writePackedCourses(k, v);
      else localStorage.setItem(k, v);
    }
  };
  try {
    replace(backup.data);
    // Never run the one-time import from the pre-rebuild app over a restore.
    localStorage.setItem(`${PREFIX}migrated`, '1');
    // Tells any other open tab to reload (see watchForRestore).
    localStorage.setItem(RESTORED_KEY, String(Date.now()));
    return true;
  } catch {
    try {
      replace(before);
    } catch {
      /* nothing more to be done */
    }
    return false;
  }
}

/** sessionStorage: a restore in this tab, to be said once the page has reloaded. */
const RESTORE_NOTE_KEY = `${PREFIX}restore-note`;
/** sessionStorage: what this device held before that restore, packed, for Undo. */
const RESTORE_UNDO_KEY = `${PREFIX}restore-undo`;
/** sessionStorage: that restore was undone. */
const RESTORE_UNDONE_KEY = `${PREFIX}restore-undone`;

const session = {
  get: (k: string) => {
    try {
      return sessionStorage.getItem(k);
    } catch {
      return null;
    }
  },
  remove: (...keys: string[]) => {
    try {
      for (const k of keys) sessionStorage.removeItem(k);
    } catch {
      /* blocked: nothing was kept */
    }
  },
};

/**
 * Whether a restore here can be undone. Not with sync on: the sync that runs
 * as the app opens carries the restore to the saved copy, and the next one
 * would bring it back over an Undo.
 */
export function restoreUndoable(): boolean {
  return !hasSavedSignIn();
}

/**
 * Keeps what this device holds for the Undo after a restore, packed, in this
 * tab's sessionStorage: it outlives the reload, takes no room from the
 * storage the restore is about to fill, and goes with the tab. False when
 * the browser will not keep it, so no Undo is promised that cannot be given.
 */
export function keepForUndo(): boolean {
  try {
    const before = makeBackup();
    // Put back exactly: sync's bookkeeping too, which a backup file leaves out.
    const meta = localStorage.getItem(SYNC_META_KEY);
    if (meta != null) before.data[SYNC_META_KEY] = meta;
    sessionStorage.setItem(RESTORE_UNDO_KEY, pack(JSON.stringify(before)));
    return true;
  } catch {
    session.remove(RESTORE_UNDO_KEY);
    return false;
  }
}

/**
 * Restores, and leaves word for the page after the reload (announceRestore)
 * to say so, with Undo when `keepForUndo` has just kept what was here.
 */
export function restoreAndTell(backup: Backup, said: string, undo: boolean): boolean {
  if (!undo) session.remove(RESTORE_UNDO_KEY);
  if (!restoreBackup(backup)) {
    session.remove(RESTORE_UNDO_KEY);
    return false;
  }
  try {
    sessionStorage.setItem(RESTORE_NOTE_KEY, said);
  } catch {
    // Blocked: the restore stands, unannounced.
  }
  return true;
}

/**
 * At start: a restore (or its undo) in this tab, said once; a restore's with
 * Undo. The Undo goes as soon as anything is studied or changed, since
 * putting back what was here would throw that away.
 */
export function announceRestore(): void {
  const said = session.get(RESTORE_NOTE_KEY);
  const packed = session.get(RESTORE_UNDO_KEY);
  const undone = session.get(RESTORE_UNDONE_KEY) === '1';
  session.remove(RESTORE_NOTE_KEY, RESTORE_UNDO_KEY, RESTORE_UNDONE_KEY);
  if (undone) toast('Put back what this device had before the restore.', { type: 'success' });
  if (said == null) return;
  if (!packed) {
    toast(said, { type: 'success' });
    return;
  }
  let watching: (() => void)[] = [];
  const stop = () => watching.forEach((unsubscribe) => unsubscribe());
  const id = toast(said, {
    type: 'success',
    duration: 20000,
    actionLabel: 'Undo',
    onAction: () => {
      stop();
      let before: Backup | null = null;
      try {
        before = JSON.parse(unpack(packed)) as Backup;
      } catch {
        /* unreadable: said below */
      }
      if (!before?.data || !restoreBackup(before)) {
        toast("Couldn't put back what was here before: this browser's storage is full or blocked.", { type: 'error' });
        return;
      }
      try {
        sessionStorage.setItem(RESTORE_UNDONE_KEY, '1');
      } catch {
        /* reloads unannounced */
      }
      window.location.reload();
    },
  });
  watching = [useProgressStore.subscribe, useCoursesStore.subscribe, useStudyLogStore.subscribe].map((subscribe) =>
    subscribe(() => {
      stop();
      useToastStore.getState().dismiss(id);
    }),
  );
}

/**
 * Hands a file to the student. On a phone the share sheet is the way to put
 * a file somewhere (Save to Files, AirDrop, Messages); a download there lands
 * in a preview. On a computer, a plain download.
 */
export async function saveFile(name: string, text: string): Promise<boolean> {
  const file = new File([text], name, { type: 'application/json' });
  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  if (coarse && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return true;
    } catch (e) {
      // Dismissing the share sheet is a choice, not a failure: nothing was saved.
      if ((e as Error)?.name === 'AbortError') return false;
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return true;
}

/**
 * Reloads this tab when a restore happens in another one. Without it, a tab
 * left open would write its old state back over the restored data the next
 * time anything in it changed.
 */
export function watchForRestore(): void {
  window.addEventListener('storage', (e) => {
    if (e.key === RESTORED_KEY) window.location.reload();
  });
}

/**
 * Saves every lecture, all progress and settings as one file, and notes what
 * it held, so the library's reminder knows when there is something new to
 * lose. Resolves true when a file went somewhere.
 */
export async function backUpNow(): Promise<boolean> {
  const now = new Date();
  const saved = await saveFile(backupFileName(now), JSON.stringify(makeBackup(now)));
  if (saved) {
    const ids = Object.keys(useCoursesStore.getState().courses);
    writeBackedUp({ at: now.getTime(), lectures: ids.length, lectureIds: ids, answers: countAnswers(useProgressStore.getState().byCourse) });
  }
  return saved;
}
