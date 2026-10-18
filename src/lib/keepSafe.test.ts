import { describe, expect, it } from 'vitest';
import { countAnswers, keepSafe } from './keepSafe';

const DAY = 86_400_000;
const now = 100 * DAY;
const base = { lectures: 11, answers: 1200, syncOn: false, backedUp: null, storagePct: 40, now };

describe('keepSafe', () => {
  it('asks for a first backup once there is something to lose', () => {
    expect(keepSafe(base)).toEqual({ kind: 'backup', lectures: 11, answers: 1200, lastAt: null, answersSince: 1200 });
    expect(keepSafe({ ...base, answers: 0 })).toBeNull();
    expect(keepSafe({ ...base, lectures: 0 })).toBeNull();
  });
  it('stays quiet with sync on, after a recent backup, or a "Not now"', () => {
    expect(keepSafe({ ...base, syncOn: true })).toBeNull();
    expect(keepSafe({ ...base, backedUp: { at: now - 2 * DAY, lectures: 9, answers: 800 } })).toBeNull();
    expect(keepSafe({ ...base, backedUp: { at: 0, lectures: 0, answers: 0, dismissedAt: now - DAY } })).toBeNull();
    expect(keepSafe({ ...base, backedUp: { at: 0, lectures: 0, answers: 0, dismissedAt: now - 4 * DAY } })?.kind).toBe('backup');
  });
  it('asks again after a week, but only if something changed', () => {
    expect(keepSafe({ ...base, backedUp: { at: now - 9 * DAY, lectures: 11, answers: 1200 } })).toBeNull();
    expect(keepSafe({ ...base, backedUp: { at: now - 9 * DAY, lectures: 11, answers: 1080 } })).toMatchObject({ answersSince: 120, lastAt: now - 9 * DAY });
  });
  it('counts a lecture swapped for another as a change', () => {
    const backedUp = { at: now - 9 * DAY, lectures: 2, answers: 50, lectureIds: ['a', 'b'] };
    expect(keepSafe({ ...base, lectures: 2, answers: 50, lectureIds: ['a', 'c'], backedUp })?.kind).toBe('backup');
    expect(keepSafe({ ...base, lectures: 2, answers: 50, lectureIds: ['a', 'b'], backedUp })).toBeNull();
  });
  it('warns about storage first, sync or not', () => {
    expect(keepSafe({ ...base, storagePct: 80, syncOn: true })).toEqual({ kind: 'storage', pct: 80 });
  });
  it('counts every answer', () => {
    expect(countAnswers({ a: { x: { got: 2, missed: 1 }, y: { got: 1 } }, b: {} })).toBe(4);
  });
});
