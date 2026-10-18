import { deflateSync, inflateSync, strFromU8, strToU8 } from 'fflate';
import type { PersistStorage, StorageValue } from 'zustand/middleware';
import { safeLocalStorage, trySetItem } from './safeStorage';

/**
 * Lectures kept compressed, one storage key each.
 *
 * Browsers give a site about 5 MB of localStorage, iOS included. Lectures are
 * text, and stored plainly 11 of the owner's took 3.4 MB five weeks into a
 * semester, so storage would have filled within weeks
 * (docs/audits/2026-10-17-weak-points.md). Deflated and packed 15 bits to a
 * character they take about an eighth of that.
 *
 * Each lecture has its own key, `arborous:courses/<id>`, and only a lecture
 * that changed is compressed again: one lecture is a few milliseconds, the
 * whole library at once was 50 to 80 on a laptop and grows with every
 * lecture. The store's own key holds an index: `{ version, ids }`.
 *
 * The old form, the whole store as plain JSON under its own key, is still
 * read (a device that has not loaded since, a restored backup, a test), and
 * is rewritten in the new form as it is loaded.
 */

const MARK = '~z1:';

/** Bytes to characters, 15 bits each, kept clear of 0 and of the surrogate range. */
function bytesToChars(bytes: Uint8Array): string {
  const codes: number[] = [];
  let acc = 0;
  let bits = 0;
  for (let i = 0; i < bytes.length; i++) {
    acc = (acc << 8) | bytes[i];
    bits += 8;
    if (bits >= 15) {
      bits -= 15;
      codes.push(((acc >> bits) & 0x7fff) + 32);
      acc &= (1 << bits) - 1;
    }
  }
  if (bits > 0) codes.push(((acc << (15 - bits)) & 0x7fff) + 32);
  let out = '';
  for (let i = 0; i < codes.length; i += 8192) out += String.fromCharCode(...codes.slice(i, i + 8192));
  return out;
}

function charsToBytes(chars: string, length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  let acc = 0;
  let bits = 0;
  let j = 0;
  for (let i = 0; i < chars.length && j < length; i++) {
    acc = (acc << 15) | ((chars.charCodeAt(i) - 32) & 0x7fff);
    bits += 15;
    while (bits >= 8 && j < length) {
      bits -= 8;
      bytes[j++] = (acc >> bits) & 0xff;
    }
    acc &= (1 << bits) - 1;
  }
  if (j < length) throw new Error('Packed text is shorter than it says');
  return bytes;
}

/** Text compressed into a string localStorage can hold. */
export function pack(text: string): string {
  const bytes = deflateSync(strToU8(text), { level: 6 });
  return `${MARK}${bytes.length.toString(36)}:${bytesToChars(bytes)}`;
}

/** The text `pack` was given; anything not packed comes back as it is. */
export function unpack(stored: string): string {
  if (!stored.startsWith(MARK)) return stored;
  const colon = stored.indexOf(':', MARK.length);
  const length = parseInt(stored.slice(MARK.length, colon), 36);
  return strFromU8(inflateSync(charsToBytes(stored.slice(colon + 1), length)));
}

export const courseKey = (name: string, id: string) => `${name}/${id}`;

interface Index {
  version?: number;
  ids?: string[];
}

type Courses = { courses: Record<string, unknown> };

/** A write with no making of room: for a conversion or a restore, which undo themselves if anything fails. */
function setPlain(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/** Every key under the store's prefix, by lecture id. */
function storedIds(name: string): string[] {
  const ids: string[] = [];
  const prefix = `${name}/`;
  for (let i = 0; i < safeLocalStorage.length; i++) {
    const k = safeLocalStorage.key(i);
    if (k?.startsWith(prefix)) ids.push(k.slice(prefix.length));
  }
  return ids;
}

/**
 * The persist storage for the courses store. `written` remembers what each
 * lecture's key last held (as JSON), so a write compresses only the lectures
 * that changed; comparing text rather than object identity means a lecture
 * changed in place is still written. A lecture whose key cannot be read is
 * kept, key and place in the index, rather than dropped by the next save.
 */
export function packedCourseStorage<S extends Courses>(): PersistStorage<S, boolean> {
  return createPacked<S>().storage;
}

function createPacked<S extends Courses>(): { storage: PersistStorage<S, boolean>; writeWhole: (name: string, value: StorageValue<S>) => boolean } {
  const written = new Map<string, string>();
  const unreadable = new Set<string>();

  const readIndex = (name: string): (Index & { state?: unknown }) | null => {
    const raw = safeLocalStorage.getItem(name);
    if (raw == null) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  /**
   * Writes every changed lecture, then the index, then drops the keys of
   * lectures that are gone; true if all of it landed.
   *
   * In a normal save, a lecture whose key could not be written stays in the
   * index only if an older copy is there to load. A conversion (`whole`)
   * lands completely or not at all: on any failure the new keys are taken
   * back and the old form stays. A normal save that finds the old form
   * still stored (its conversion did not fit) is a conversion too, and if
   * that fails it saves in the old form, as the app did before, rather than
   * replace the only copy of every lecture with a partial index.
   */
  const write = (name: string, value: StorageValue<S>, whole = false): boolean => {
    const before = readIndex(name);
    const oldForm = !!before?.state;
    const allOrNothing = whole || oldForm;
    const set = allOrNothing ? setPlain : trySetItem;
    const had = new Set(oldForm ? [] : (before?.ids ?? []));
    const courses = value.state.courses ?? {};
    const ids: string[] = [];
    // What each key held before this write touched it (null: it had none),
    // so an all-or-nothing write that fails can put every key back.
    const prior = new Map<string, string | null>();
    let ok = true;
    for (const [id, course] of Object.entries(courses)) {
      const json = JSON.stringify(course);
      const key = courseKey(name, id);
      const stored = safeLocalStorage.getItem(key);
      if (written.get(id) === json && stored != null) {
        ids.push(id);
        continue;
      }
      prior.set(id, stored);
      if (set(key, pack(json))) {
        written.set(id, json);
        unreadable.delete(id);
        ids.push(id);
      } else {
        ok = false;
        if (allOrNothing) break;
        // An older copy of it is still there to load.
        if (stored != null && had.has(id)) ids.push(id);
      }
    }
    for (const id of unreadable) if (had.has(id) && !(id in courses)) ids.push(id);
    const index = JSON.stringify({ version: value.version ?? 0, ids } satisfies Index);
    if (allOrNothing && (!ok || !setPlain(name, index))) {
      for (const [id, stored] of prior) {
        if (stored == null) safeLocalStorage.removeItem(courseKey(name, id));
        else setPlain(courseKey(name, id), stored);
      }
      written.clear();
      return whole ? false : trySetItem(name, JSON.stringify(value));
    }
    // A normal save writes the index even when a lecture did not fit, so
    // the lectures that did are not left out of it (and cleared as strays).
    if (!allOrNothing && !trySetItem(name, index)) return false;
    for (const id of had) {
      if (!(id in courses) && !unreadable.has(id)) {
        safeLocalStorage.removeItem(courseKey(name, id));
        written.delete(id);
      }
    }
    return ok;
  };

  const load = (name: string, id: string): unknown | undefined => {
    const stored = safeLocalStorage.getItem(courseKey(name, id));
    if (stored == null) return undefined;
    try {
      const json = unpack(stored);
      const course = JSON.parse(json);
      written.set(id, json);
      return course;
    } catch {
      unreadable.add(id);
      return undefined;
    }
  };

  const storage: PersistStorage<S, boolean> = {
    getItem(name) {
      const index = readIndex(name);
      if (!index) return null;
      if (index.state) {
        // The old form: load it, and store it the new way; if that does not
        // fit, it stays as it was and is tried again next load. Lecture keys
        // already here are kept too: they mean a tab still running an older
        // version of the app wrote the old form over the new one. (A lecture
        // removed in that tab comes back; deleting it again is a small price
        // against losing the library.)
        const value = index as unknown as StorageValue<S>;
        const courses = { ...((value.state as Courses | undefined)?.courses ?? {}) };
        for (const id of storedIds(name)) {
          if (id in courses) continue;
          const course = load(name, id);
          if (course !== undefined) courses[id] = course;
        }
        const merged = { ...value, state: { ...value.state, courses } as S };
        write(name, merged, true);
        return merged;
      }
      const courses: Record<string, unknown> = {};
      const listed = new Set(index.ids ?? []);
      for (const id of listed) {
        const course = load(name, id);
        if (course !== undefined) courses[id] = course;
      }
      // Keys no index lists: left by a save whose index did not fit. Clear
      // them, or they hold space the student can neither see nor free.
      for (const id of storedIds(name)) if (!listed.has(id)) safeLocalStorage.removeItem(courseKey(name, id));
      return { state: { courses } as unknown as S, version: index.version ?? 0 };
    },
    setItem(name, value) {
      return write(name, value);
    },
    removeItem(name) {
      for (const id of storedIds(name)) safeLocalStorage.removeItem(courseKey(name, id));
      safeLocalStorage.removeItem(name);
      written.clear();
      unreadable.clear();
      return true;
    },
  };
  return { storage, writeWhole: (name, value) => write(name, value, true) };
}

/**
 * Stores a backup's lectures (the store's state as plain JSON) in the new
 * form, for a restore. Lands whole or not at all, never making room by
 * trimming what was just restored; throws if it does not fit, so the
 * restore can put back what was there.
 */
export function writePackedCourses(name: string, plainJson: string): void {
  const value = JSON.parse(plainJson) as StorageValue<Courses>;
  if (!value?.state || typeof value.state !== 'object') throw new Error('Not a courses store');
  const { storage, writeWhole } = createPacked<Courses>();
  storage.removeItem(name);
  if (!writeWhole(name, value)) throw new Error('Storage is full');
}
