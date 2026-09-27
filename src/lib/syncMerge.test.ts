import { describe, expect, it } from 'vitest';
import type { Course } from '@/schema/course';
import { EMPTY_SNAPSHOT, mergeSnapshots, type Snapshot } from './syncMerge';

const course = (title: string) => ({ schema_version: '1.0', metadata: { title }, sections: [] }) as unknown as Course;
const snap = (s: Partial<Snapshot>): Snapshot => ({ ...EMPTY_SNAPSHOT, ...s });

describe('mergeSnapshots', () => {
  it('keeps courses that exist on only one side', () => {
    const out = mergeSnapshots(snap({ courses: { a: course('A') } }), snap({ courses: { b: course('B') } }));
    expect(Object.keys(out.courses).sort()).toEqual(['a', 'b']);
  });

  it('takes the version of a course changed last', () => {
    const local = snap({ courses: { a: course('old') }, editedAt: { a: 100 } });
    const remote = snap({ courses: { a: course('new') }, editedAt: { a: 200 } });
    expect(mergeSnapshots(local, remote).courses.a.metadata.title).toBe('new');
    expect(mergeSnapshots(remote, local).courses.a.metadata.title).toBe('new');
  });

  it('keeps a deletion made after the last edit elsewhere', () => {
    const local = snap({ deletedAt: { a: 300 } });
    const remote = snap({ courses: { a: course('A') }, editedAt: { a: 200 }, progress: { a: { q: { got: 1, missed: 0, lastSeen: 1 } } } });
    const out = mergeSnapshots(local, remote);
    expect(out.courses.a).toBeUndefined();
    expect(out.progress.a).toBeUndefined();
    expect(out.deletedAt.a).toBe(300);
  });

  it('brings back a course edited after it was deleted elsewhere', () => {
    const local = snap({ courses: { a: course('A') }, editedAt: { a: 400 } });
    const remote = snap({ deletedAt: { a: 300 } });
    expect(mergeSnapshots(local, remote).courses.a).toBeDefined();
  });

  it('keeps the most recent answer for each item', () => {
    const local = snap({ courses: { a: course('A') }, progress: { a: { q1: { got: 1, missed: 0, lastSeen: 50 }, q2: { got: 0, missed: 1, lastSeen: 10 } } } });
    const remote = snap({ courses: { a: course('A') }, progress: { a: { q1: { got: 2, missed: 0, lastSeen: 40 }, q2: { got: 1, missed: 1, lastSeen: 90 }, q3: { got: 1, missed: 0, lastSeen: 5 } } } });
    const p = mergeSnapshots(local, remote).progress.a;
    expect(p.q1.lastSeen).toBe(50);
    expect(p.q2.lastSeen).toBe(90);
    expect(p.q3).toBeDefined();
  });

  it("fills this device's per-course settings from the other, but never overrides them", () => {
    const local = snap({ courses: { a: course('A'), b: course('B') }, perCourse: { plan: { a: { minutes: 45 } } } });
    const remote = snap({ courses: { a: course('A'), b: course('B') }, perCourse: { plan: { a: { minutes: 20 }, b: { minutes: 60 }, gone: { minutes: 5 } } } });
    const plan = mergeSnapshots(local, remote).perCourse.plan;
    expect(plan).toEqual({ a: { minutes: 45 }, b: { minutes: 60 } });
  });
});
