import { beforeEach, describe, expect, it } from 'vitest';
import type { Course } from '@/schema/course';
import { useCoursesStore } from '@/store/courses';
import { usePlanStore } from '@/store/plan';
import { coursesIn, makeBackup, readBackup, restoreBackup, RESTORED_KEY } from './backup';

const course = { schema_version: '1.0', metadata: { title: 'T' }, sections: [] } as unknown as Course;

describe('backup', () => {
  beforeEach(() => {
    localStorage.clear();
    useCoursesStore.setState({ courses: {} });
    usePlanStore.setState({ byCourse: {} });
  });

  it('carries every key the app owns, and nothing else', () => {
    useCoursesStore.setState({ courses: { a: course, b: course } });
    localStorage.setItem('arborous:migrated', '1');
    localStorage.setItem('someone-else', 'x');
    const b = makeBackup();
    expect(b.data['arborous:migrated']).toBe('1');
    expect(b.data['someone-else']).toBeUndefined();
    expect(Object.keys(b.data).every((k) => k.startsWith('arborous:'))).toBe(true);
    expect(coursesIn(b)).toBe(2);
  });

  it('takes the state in memory, even when storage has fallen behind it', () => {
    useCoursesStore.setState({ courses: { a: course } });
    // As if the latest write had failed with storage full.
    localStorage.setItem('arborous:courses', JSON.stringify({ state: { courses: {} }, version: 0 }));
    expect(coursesIn(makeBackup())).toBe(1);
  });

  it('restores exactly, replacing what was there, and tells other tabs', () => {
    localStorage.setItem('arborous:courses', 'old');
    localStorage.setItem('arborous:plan', 'old plan');
    const text = JSON.stringify({ kind: 'arborous-backup', version: 1, createdAt: '2026-09-27T00:00:00Z', data: { 'arborous:courses': 'new' } });
    const read = readBackup(text);
    if (!read.ok) throw new Error(read.error);
    expect(restoreBackup(read.backup)).toBe(true);
    expect(localStorage.getItem('arborous:courses')).toBe('new');
    expect(localStorage.getItem('arborous:plan')).toBeNull();
    // The old app's one-time import must not run over a restore.
    expect(localStorage.getItem('arborous:migrated')).toBe('1');
    expect(localStorage.getItem(RESTORED_KEY)).not.toBeNull();
  });

  it('round-trips through its own file', () => {
    usePlanStore.setState({ byCourse: { c: { minutes: 45 } } });
    const text = JSON.stringify(makeBackup());
    localStorage.clear();
    const read = readBackup(text);
    if (!read.ok) throw new Error(read.error);
    restoreBackup(read.backup);
    expect(JSON.parse(localStorage.getItem('arborous:plan')!).state.byCourse.c.minutes).toBe(45);
  });

  it('refuses a backup made by a newer version of the app', () => {
    const newer = { kind: 'arborous-backup', version: 1, data: { 'arborous:courses': JSON.stringify({ state: { courses: {} }, version: 99 }) } };
    const read = readBackup(JSON.stringify(newer));
    expect(read.ok).toBe(false);
    if (!read.ok) expect(read.error).toMatch(/newer version/);
  });

  it('says so when handed a course file or anything else', () => {
    const asCourse = readBackup(JSON.stringify({ schema_version: '1.0', metadata: { title: 'T' }, sections: [] }));
    expect(asCourse.ok).toBe(false);
    if (!asCourse.ok) expect(asCourse.error).toMatch(/course file/);
    expect(readBackup('not json').ok).toBe(false);
    expect(readBackup('{"kind":"other"}').ok).toBe(false);
  });

  it('ignores keys in a file that the app does not own', () => {
    const read = readBackup(JSON.stringify({ kind: 'arborous-backup', version: 1, data: { 'arborous:plan': 'p', evil: 'x' } }));
    if (!read.ok) throw new Error(read.error);
    expect(Object.keys(read.backup.data)).toEqual(['arborous:plan']);
  });
});
