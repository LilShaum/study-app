import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Course } from '@/schema/course';
import { useCoursesStore } from '@/store/courses';
import { usePlanStore } from '@/store/plan';
import { useProgressStore } from '@/store/progress';
import { useToastStore } from '@/store/toast';
import { useStudyLogStore } from '@/store/studyLog';
import { announceRestore, holdingsHere, holdingsOf, keepForUndo, makeBackup, nothingHere, readBackup, restoreAndTell, restoreBackup, restoreUndoable, RESTORED_KEY } from './backup';

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
    expect(Object.keys(holdingsOf(b).lectures)).toEqual(['a', 'b']);
  });

  it('takes the state in memory, even when storage has fallen behind it', () => {
    useCoursesStore.setState({ courses: { a: course } });
    // As if the latest write had failed with storage full.
    localStorage.setItem('arborous:courses', JSON.stringify({ state: { courses: {} }, version: 0 }));
    expect(Object.keys(holdingsOf(makeBackup()).lectures)).toEqual(['a']);
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
    if (!asCourse.ok) expect(asCourse.error).toMatch(/lecture file/);
    expect(readBackup('not json').ok).toBe(false);
    expect(readBackup('{"kind":"other"}').ok).toBe(false);
  });

  it('ignores keys in a file that the app does not own', () => {
    const read = readBackup(JSON.stringify({ kind: 'arborous-backup', version: 1, data: { 'arborous:plan': 'p', evil: 'x' } }));
    if (!read.ok) throw new Error(read.error);
    expect(Object.keys(read.backup.data)).toEqual(['arborous:plan']);
  });
});

describe('backup and sync', () => {
  it("leaves sync's own bookkeeping out of a backup", async () => {
    localStorage.setItem('arborous:sync-meta', '{"state":{"remoteSeenAt":"x"},"version":0}');
    const { makeBackup } = await import('./backup');
    expect(makeBackup().data['arborous:sync-meta']).toBeUndefined();
  });
});

describe('restore sheet and Undo', () => {
  const reload = vi.fn();
  const original = window.location;
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    useCoursesStore.setState({ courses: {} });
    useProgressStore.setState({ byCourse: {} });
    useToastStore.setState({ toasts: [] });
    useStudyLogStore.setState({ byCourse: {} });
    reload.mockReset();
    Object.defineProperty(window, 'location', { configurable: true, value: { ...original, reload } });
  });
  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: original });
  });

  const titled = (title: string) => ({ ...course, metadata: { title } }) as unknown as Course;
  const file = (courses: Record<string, Course>, byCourse: object) =>
    ({
      kind: 'arborous-backup',
      version: 1,
      createdAt: '2026-10-15T23:00:00Z',
      data: {
        'arborous:courses': JSON.stringify({ state: { courses }, version: 0 }),
        'arborous:progress': JSON.stringify({ state: { byCourse }, version: 0 }),
      },
    }) as const;

  it('counts lectures and answers, and only answers on lectures that are there', () => {
    const b = file({ a: titled('Vision') }, { a: { q1: { got: 2, missed: 1 } }, gone: { q2: { got: 5 } } });
    expect(holdingsOf(b)).toEqual({ lectures: { a: 'Vision' }, answers: 3 });
    useCoursesStore.setState({ courses: { a: titled('Vision'), b: titled('Motor') } });
    useProgressStore.setState({ byCourse: { b: { q: { got: 4, missed: 0 } } } as never });
    expect(holdingsHere()).toEqual({ lectures: { a: 'Vision', b: 'Motor' }, answers: 4 });
  });

  it('says what was restored after the reload, and Undo puts back exactly what was here', () => {
    useCoursesStore.setState({ courses: { mine: titled('Mine') } });
    localStorage.setItem('arborous:practice:x', 'my choice');
    localStorage.setItem('arborous:sync-meta', 'my sync');
    expect(keepForUndo()).toBe(true);
    expect(restoreAndTell(file({ theirs: titled('Theirs') }, {}), 'Restored the backup.', true)).toBe(true);
    expect(localStorage.getItem('arborous:practice:x')).toBeNull();

    announceRestore();
    const [t] = useToastStore.getState().toasts;
    expect(t.message).toBe('Restored the backup.');
    expect(t.actionLabel).toBe('Undo');
    // Said once: a later reload of the tab does not say it again.
    expect(sessionStorage.length).toBe(0);

    t.onAction!();
    expect(reload).toHaveBeenCalled();
    expect(localStorage.getItem('arborous:practice:x')).toBe('my choice');
    expect(localStorage.getItem('arborous:sync-meta')).toBe('my sync');
    expect(JSON.parse(localStorage.getItem('arborous:courses')!).ids).toEqual(['mine']);

    useToastStore.setState({ toasts: [] });
    announceRestore();
    expect(useToastStore.getState().toasts.map((x) => x.message)).toEqual(['Put back what this device had before the restore.']);
  });

  it('a restore onto an empty device is said without Undo', () => {
    restoreAndTell(file({ theirs: titled('Theirs') }, {}), 'Restored.', false);
    announceRestore();
    const [t] = useToastStore.getState().toasts;
    expect(t.message).toBe('Restored.');
    expect(t.onAction).toBeUndefined();
  });

  it('withdraws Undo once anything is studied, which Undo would throw away', () => {
    useCoursesStore.setState({ courses: { mine: titled('Mine') } });
    keepForUndo();
    restoreAndTell(file({ theirs: titled('Theirs') }, {}), 'Restored.', true);
    announceRestore();
    expect(useToastStore.getState().toasts).toHaveLength(1);
    useProgressStore.setState({ byCourse: { theirs: { q: { got: 1, missed: 0 } } } as never });
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('no Undo with sync on, and no question on a new device', () => {
    expect(restoreUndoable()).toBe(true);
    localStorage.setItem('sb-arborous-auth', '{}');
    expect(restoreUndoable()).toBe(false);
    expect(nothingHere()).toBe(true);
    useStudyLogStore.setState({ byCourse: { gone: [] } } as never);
    expect(nothingHere()).toBe(false);
  });

  it('nothing to say when no restore happened', () => {
    announceRestore();
    expect(useToastStore.getState().toasts).toEqual([]);
  });
});
