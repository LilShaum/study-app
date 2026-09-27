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

const PREFIX = 'arborous:';
const KIND = 'arborous-backup';

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
  for (const k of ownKeys()) data[k] = localStorage.getItem(k) ?? '';
  return { kind: KIND, version: 1, createdAt: now.toISOString(), data };
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
    return { ok: false, error: "That's a course file, not a backup. Add it from the library with Upload." };
  }
  if (!b || b.kind !== KIND || !b.data || typeof b.data !== 'object') {
    return { ok: false, error: "That file isn't an Arborous backup." };
  }
  const data: Record<string, string> = {};
  for (const [k, v] of Object.entries(b.data)) {
    if (k.startsWith(PREFIX) && typeof v === 'string') data[k] = v;
  }
  return { ok: true, backup: { kind: KIND, version: 1, createdAt: String(b.createdAt ?? ''), data } };
}

/** Courses in a backup, for the confirmation message. */
export function coursesIn(backup: Backup): number {
  try {
    const courses = JSON.parse(backup.data[`${PREFIX}courses`] ?? '{}')?.state?.courses;
    return courses && typeof courses === 'object' ? Object.keys(courses).length : 0;
  } catch {
    return 0;
  }
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
    for (const [k, v] of Object.entries(data)) localStorage.setItem(k, v);
  };
  try {
    replace(backup.data);
    // Never run the one-time import from the pre-rebuild app over a restore.
    localStorage.setItem(`${PREFIX}migrated`, '1');
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

/**
 * Hands a file to the student. On a phone the share sheet is the way to put
 * a file somewhere (Save to Files, AirDrop, Messages); a download there lands
 * in a preview. On a computer, a plain download.
 */
export async function saveFile(name: string, text: string): Promise<void> {
  const file = new File([text], name, { type: 'application/json' });
  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  if (coarse && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return;
    } catch (e) {
      // Dismissing the share sheet is a choice, not a failure.
      if ((e as Error)?.name === 'AbortError') return;
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
}
