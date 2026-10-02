import { describe, expect, it } from 'vitest';
import { NO_EXAM_DAYS, shareMinutes } from './dailyShare';

describe('shareMinutes', () => {
  it('gives the nearest exam the most, in proportion to 1 / days left', () => {
    const s = shareMinutes(60, [
      { id: 'a', examDays: 3, active: true },
      { id: 'b', examDays: 12, active: true },
    ]);
    expect(s.a).toBeCloseTo(48);
    expect(s.b).toBeCloseTo(12);
  });

  it('splits evenly when no course has a date', () => {
    const s = shareMinutes(60, [
      { id: 'a', examDays: null, active: true },
      { id: 'b', examDays: null, active: true },
    ]);
    expect(s.a).toBeCloseTo(30);
    expect(s.b).toBeCloseTo(30);
  });

  it('counts a course without a date as one far off', () => {
    const s = shareMinutes(60, [
      { id: 'a', examDays: NO_EXAM_DAYS, active: true },
      { id: 'b', examDays: null, active: true },
    ]);
    expect(s.a).toBeCloseTo(s.b);
  });

  it('gives nothing to a course with nothing to do, and its time to the rest', () => {
    const s = shareMinutes(60, [
      { id: 'a', examDays: 3, active: false },
      { id: 'b', examDays: 12, active: true },
    ]);
    expect(s.a).toBe(0);
    expect(s.b).toBeCloseTo(60);
  });

  it('treats an exam today as a day away rather than dividing by zero', () => {
    const s = shareMinutes(60, [{ id: 'a', examDays: 0, active: true }]);
    expect(s.a).toBeCloseTo(60);
  });
});
