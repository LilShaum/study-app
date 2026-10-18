import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { courseKey, pack, packedCourseStorage, unpack, writePackedCourses } from './packedStorage';

const NAME = 'arborous:courses';
const fixture = JSON.parse(fs.readFileSync('scripts/__fixtures__/biochem.study.json', 'utf8'));
type S = { courses: Record<string, unknown> };
const realSet = Storage.prototype.setItem;

beforeEach(() => localStorage.clear());
afterEach(() => {
  Storage.prototype.setItem = realSet;
});

describe('pack', () => {
  it('gives back exactly what it was given, at any length and in any script', () => {
    const texts = ['', 'a', 'ab', '{"x":1}', 'Na⁺ → K⁺ · ½ · 🌿 · 漢字', 'x'.repeat(1000), JSON.stringify(fixture)];
    for (let n = 0; n < 40; n++) texts.push(Array.from({ length: n }, (_, i) => String.fromCharCode(32 + ((i * 7919) % 90))).join(''));
    for (const t of texts) expect(unpack(pack(t))).toBe(t);
  });
  it('leaves text that was never packed alone', () => {
    expect(unpack('{"state":{}}')).toBe('{"state":{}}');
  });
  it('stores a lecture in a fraction of the characters', () => {
    const json = JSON.stringify(fixture);
    expect(pack(json).length).toBeLessThan(json.length / 4);
  });
  it('never writes a lone surrogate or a null character', () => {
    const packed = pack(JSON.stringify(fixture));
    const bad = [...packed].filter((ch) => {
      const c = ch.charCodeAt(0);
      return c === 0 || (c >= 0xd800 && c <= 0xdfff);
    });
    expect(bad).toEqual([]);
  });
});

describe('packedCourseStorage', () => {
  const value = (courses: Record<string, unknown>) => ({ state: { courses }, version: 0 });

  it('stores each lecture under its own key and reads them all back', () => {
    const s = packedCourseStorage<S>();
    s.setItem(NAME, value({ a: fixture, b: { ...fixture, metadata: { title: 'B' } } }));
    expect(JSON.parse(localStorage.getItem(NAME)!)).toEqual({ version: 0, ids: ['a', 'b'] });
    expect(localStorage.getItem(courseKey(NAME, 'a'))!.startsWith('~z1:')).toBe(true);
    const back = packedCourseStorage<S>().getItem(NAME) as { state: S };
    expect(back.state.courses).toEqual({ a: fixture, b: { ...fixture, metadata: { title: 'B' } } });
  });

  it('compresses again only the lecture that changed, even when changed in place', () => {
    const s = packedCourseStorage<S>();
    const a = structuredClone(fixture);
    const b = structuredClone(fixture);
    s.setItem(NAME, value({ a, b }));
    const writes: string[] = [];
    Storage.prototype.setItem = function (this: Storage, k: string, v: string) {
      writes.push(k);
      realSet.call(this, k, v);
    };
    b.metadata.title = 'Changed in place';
    s.setItem(NAME, value({ a, b }));
    expect(writes).toEqual([courseKey(NAME, 'b'), NAME]);
  });

  it('removes the key of a lecture that is gone', () => {
    const s = packedCourseStorage<S>();
    s.setItem(NAME, value({ a: fixture, b: fixture }));
    s.setItem(NAME, value({ a: fixture }));
    expect(localStorage.getItem(courseKey(NAME, 'b'))).toBeNull();
    expect(JSON.parse(localStorage.getItem(NAME)!).ids).toEqual(['a']);
  });

  it('reads the old plain form and stores it the new way', () => {
    localStorage.setItem(NAME, JSON.stringify(value({ a: fixture })));
    const back = packedCourseStorage<S>().getItem(NAME) as { state: S };
    expect(back.state.courses.a).toEqual(fixture);
    expect(JSON.parse(localStorage.getItem(NAME)!).ids).toEqual(['a']);
    expect((packedCourseStorage<S>().getItem(NAME) as { state: S }).state.courses.a).toEqual(fixture);
  });

  it('keeps the old form when the new one does not fit', () => {
    const old = JSON.stringify(value({ a: fixture, b: fixture }));
    localStorage.setItem(NAME, old);
    let n = 0;
    Storage.prototype.setItem = function (this: Storage, k: string, v: string) {
      if (k.startsWith(`${NAME}/`) && ++n > 1) throw new DOMException('full', 'QuotaExceededError');
      realSet.call(this, k, v);
    };
    const back = packedCourseStorage<S>().getItem(NAME) as { state: S };
    expect(Object.keys(back.state.courses)).toEqual(['a', 'b']);
    expect(localStorage.getItem(NAME)).toBe(old);
    expect(localStorage.getItem(courseKey(NAME, 'a'))).toBeNull();
  });

  it('keeps an older copy of a lecture whose new version did not fit, and leaves out one never stored', () => {
    const s = packedCourseStorage<S>();
    s.setItem(NAME, value({ a: fixture }));
    Storage.prototype.setItem = function (this: Storage, k: string, v: string) {
      if (k.startsWith(`${NAME}/`)) throw new DOMException('full', 'QuotaExceededError');
      realSet.call(this, k, v);
    };
    s.setItem(NAME, value({ a: { ...fixture, metadata: { title: 'new' } }, c: fixture }));
    expect(JSON.parse(localStorage.getItem(NAME)!).ids).toEqual(['a']);
    Storage.prototype.setItem = realSet;
    expect((packedCourseStorage<S>().getItem(NAME) as { state: S }).state.courses).toEqual({ a: fixture });
  });

  it('loads the other lectures when one key is unreadable', () => {
    const s = packedCourseStorage<S>();
    s.setItem(NAME, value({ a: fixture, b: fixture }));
    localStorage.setItem(courseKey(NAME, 'b'), '~z1:zz:garbage');
    expect(Object.keys((packedCourseStorage<S>().getItem(NAME) as { state: S }).state.courses)).toEqual(['a']);
  });

  it('restores a backup’s plain lectures in the new form, or says it could not', () => {
    writePackedCourses(NAME, JSON.stringify(value({ a: fixture })));
    expect(JSON.parse(localStorage.getItem(NAME)!).ids).toEqual(['a']);
    localStorage.clear();
    Storage.prototype.setItem = () => {
      throw new DOMException('full', 'QuotaExceededError');
    };
    expect(() => writePackedCourses(NAME, JSON.stringify(value({ a: fixture })))).toThrow();
  });

  it('never replaces the old form with a partial index when its conversion did not fit', () => {
    const old = JSON.stringify(value({ a: fixture, b: fixture }));
    localStorage.setItem(NAME, old);
    // Full for lecture keys: the conversion on load fails, and so does the next save's.
    Storage.prototype.setItem = function (this: Storage, k: string, v: string) {
      if (k.startsWith(`${NAME}/b`)) throw new DOMException('full', 'QuotaExceededError');
      realSet.call(this, k, v);
    };
    const s = packedCourseStorage<S>();
    s.getItem(NAME);
    const saved = s.setItem(NAME, value({ a: fixture, b: { ...fixture, metadata: { title: 'edited' } } }));
    expect(saved).toBe(true);
    Storage.prototype.setItem = realSet;
    const back = packedCourseStorage<S>().getItem(NAME) as { state: S };
    expect(Object.keys(back.state.courses)).toEqual(['a', 'b']);
    expect((back.state.courses.b as { metadata: { title: string } }).metadata.title).toBe('edited');
  });

  it('recovers the lectures when a tab on an older version writes the old form over the new', () => {
    packedCourseStorage<S>().setItem(NAME, value({ a: fixture, b: fixture }));
    // The old version hydrates nothing from the index and saves what it has.
    localStorage.setItem(NAME, JSON.stringify(value({ c: fixture })));
    const back = packedCourseStorage<S>().getItem(NAME) as { state: S };
    expect(Object.keys(back.state.courses).sort()).toEqual(['a', 'b', 'c']);
    expect(JSON.parse(localStorage.getItem(NAME)!).ids.sort()).toEqual(['a', 'b', 'c']);
  });

  it('keeps an unreadable lecture through the next save instead of deleting it', () => {
    packedCourseStorage<S>().setItem(NAME, value({ a: fixture, b: fixture }));
    localStorage.setItem(courseKey(NAME, 'b'), '~z1:zz:garbage');
    const s = packedCourseStorage<S>();
    s.getItem(NAME);
    s.setItem(NAME, value({ a: { ...fixture, metadata: { title: 'x' } } }));
    expect(localStorage.getItem(courseKey(NAME, 'b'))).toBe('~z1:zz:garbage');
    expect(JSON.parse(localStorage.getItem(NAME)!).ids).toEqual(['a', 'b']);
  });

  it('clears lecture keys no index lists', () => {
    packedCourseStorage<S>().setItem(NAME, value({ a: fixture }));
    localStorage.setItem(courseKey(NAME, 'stray'), pack('{}'));
    packedCourseStorage<S>().getItem(NAME);
    expect(localStorage.getItem(courseKey(NAME, 'stray'))).toBeNull();
  });

  it('restores lectures that fit compressed even when their plain form would not', () => {
    const plain = JSON.stringify(value({ a: fixture, b: fixture, c: fixture }));
    const limit = plain.length / 2;
    Storage.prototype.setItem = function (this: Storage, k: string, v: string) {
      if (v.length > limit) throw new DOMException('full', 'QuotaExceededError');
      realSet.call(this, k, v);
    };
    writePackedCourses(NAME, plain);
    Storage.prototype.setItem = realSet;
    expect(Object.keys((packedCourseStorage<S>().getItem(NAME) as { state: S }).state.courses)).toEqual(['a', 'b', 'c']);
  });

  it('keeps a lecture that saved in the index when another in the same save did not fit', () => {
    const s = packedCourseStorage<S>();
    s.setItem(NAME, value({ b: fixture }));
    Storage.prototype.setItem = function (this: Storage, k: string, v: string) {
      if (k === courseKey(NAME, 'b')) throw new DOMException('full', 'QuotaExceededError');
      realSet.call(this, k, v);
    };
    expect(s.setItem(NAME, value({ a: fixture, b: { ...fixture, metadata: { title: 'edit' } } }))).toBe(false);
    Storage.prototype.setItem = realSet;
    const back = packedCourseStorage<S>().getItem(NAME) as { state: S };
    expect(Object.keys(back.state.courses).sort()).toEqual(['a', 'b']);
  });

  it('puts back keys it overwrote when a conversion fails', () => {
    packedCourseStorage<S>().setItem(NAME, value({ a: fixture }));
    const before = localStorage.getItem(courseKey(NAME, 'a'));
    // An older tab wrote the old form holding a changed copy of a and a new c.
    localStorage.setItem(NAME, JSON.stringify(value({ a: { ...fixture, metadata: { title: 'old tab' } }, c: fixture })));
    Storage.prototype.setItem = function (this: Storage, k: string, v: string) {
      if (k === courseKey(NAME, 'c')) throw new DOMException('full', 'QuotaExceededError');
      realSet.call(this, k, v);
    };
    packedCourseStorage<S>().getItem(NAME);
    expect(localStorage.getItem(courseKey(NAME, 'a'))).toBe(before);
    expect(JSON.parse(localStorage.getItem(NAME)!).state).toBeDefined();
  });
});

