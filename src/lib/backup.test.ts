import { beforeEach, describe, expect, it } from 'vitest';
import { coursesIn, makeBackup, readBackup, restoreBackup } from './backup';

describe('backup', () => {
  beforeEach(() => localStorage.clear());

  it('carries every key the app owns, and nothing else', () => {
    localStorage.setItem('arborous:courses', JSON.stringify({ state: { courses: { a: {}, b: {} } }, version: 0 }));
    localStorage.setItem('arborous:progress', '{"state":{}}');
    localStorage.setItem('someone-else', 'x');
    const b = makeBackup();
    expect(Object.keys(b.data).sort()).toEqual(['arborous:courses', 'arborous:progress']);
    expect(coursesIn(b)).toBe(2);
  });

  it('restores exactly, replacing what was there', () => {
    localStorage.setItem('arborous:courses', 'old');
    localStorage.setItem('arborous:plan', 'old plan');
    const text = JSON.stringify({ kind: 'arborous-backup', version: 1, createdAt: '2026-09-27T00:00:00Z', data: { 'arborous:courses': 'new' } });
    const read = readBackup(text);
    expect(read.ok).toBe(true);
    if (!read.ok) return;
    expect(restoreBackup(read.backup)).toBe(true);
    expect(localStorage.getItem('arborous:courses')).toBe('new');
    expect(localStorage.getItem('arborous:plan')).toBeNull();
    // The old app's one-time import must not run over a restore.
    expect(localStorage.getItem('arborous:migrated')).toBe('1');
  });

  it('round-trips through its own file', () => {
    localStorage.setItem('arborous:progress', '{"state":{"byCourse":{"c":{}}}}');
    const text = JSON.stringify(makeBackup());
    localStorage.clear();
    const read = readBackup(text);
    if (!read.ok) throw new Error(read.error);
    restoreBackup(read.backup);
    expect(localStorage.getItem('arborous:progress')).toBe('{"state":{"byCourse":{"c":{}}}}');
  });

  it('says so when handed a course file or anything else', () => {
    const course = readBackup(JSON.stringify({ schema_version: '1.0', metadata: { title: 'T' }, sections: [] }));
    expect(course.ok).toBe(false);
    if (!course.ok) expect(course.error).toMatch(/course file/);
    expect(readBackup('not json').ok).toBe(false);
    expect(readBackup('{"kind":"other"}').ok).toBe(false);
  });

  it('ignores keys in a file that the app does not own', () => {
    const read = readBackup(JSON.stringify({ kind: 'arborous-backup', version: 1, data: { 'arborous:plan': 'p', evil: 'x' } }));
    if (!read.ok) throw new Error(read.error);
    expect(Object.keys(read.backup.data)).toEqual(['arborous:plan']);
  });
});
