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

describe('mergeSnapshots — study log and shared daily time', () => {
  const ans = (at: number, got = true) => ({ at, type: 'mcq', got, sinceHours: null, afterMiss: false, predicted: null });
  const withLog = (log: object, planTotal?: Snapshot['planTotal']) =>
    snap({ courses: { a: course('A') }, perCourse: { studyLog: { a: log } }, ...(planTotal ? { planTotal } : {}) });

  it('keeps answers from both devices once each, in time order', () => {
    const local = withLog({ times: [{ type: 'mcq', seconds: 9 }], answers: [ans(1), ans(3)], days: { '2026-10-15': 600 } });
    const remote = withLog({ times: [{ type: 'mcq', seconds: 40 }], answers: [ans(2, false), ans(3)], days: { '2026-10-15': 300, '2026-10-14': 900 } });
    const log = mergeSnapshots(local, remote).perCourse.studyLog.a as { times: unknown[]; answers: { at: number }[]; days: Record<string, number> };
    expect(log.answers.map((a) => a.at)).toEqual([1, 2, 3]);
    expect(log.days).toEqual({ '2026-10-15': 600, '2026-10-14': 900 });
    expect(log.times).toEqual([{ type: 'mcq', seconds: 9 }]);
    // Syncing the merged copy again changes nothing.
    const again = mergeSnapshots(mergeSnapshots(local, remote), remote).perCourse.studyLog.a;
    expect(again).toEqual(log);
  });

  it('keeps the shared daily time set last, and copes with a copy saved before it synced', () => {
    expect(mergeSnapshots(withLog({}, { minutes: 60, at: 5 }), withLog({}, { minutes: 90, at: 9 })).planTotal).toEqual({ minutes: 90, at: 9 });
    expect(mergeSnapshots(withLog({}, { minutes: 60, at: 5 }), withLog({})).planTotal).toEqual({ minutes: 60, at: 5 });
    expect(mergeSnapshots(withLog({}), withLog({})).planTotal).toBeUndefined();
  });
});
