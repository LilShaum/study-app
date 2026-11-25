import { describe, expect, it } from 'vitest';
import type { CourseLog } from '@/store/studyLog';
import { timeLabel, usualStartTime } from './usualTime';

const now = new Date(2026, 10, 20, 12).getTime();
const at = (daysAgo: number, h: number, m = 0) => {
  const d = new Date(now);
  d.setDate(d.getDate() - daysAgo);
  d.setHours(h, m, 0, 0);
  return d.getTime();
};
const log = (times: number[]): Record<string, CourseLog> => ({
  a: { times: [], days: {}, answers: times.map((t) => ({ at: t, type: 'mcq', got: true, sinceHours: null, afterMiss: false, predicted: null })) },
});

describe('usualStartTime', () => {
  it('is the middle of each day’s first answer, to the quarter hour', () => {
    const times = [at(1, 21, 10), at(1, 22, 0), at(2, 20, 50), at(3, 21, 20), at(5, 21, 5), at(6, 9, 0), at(6, 21, 30)];
    expect(usualStartTime(log(times), now)).toBe('21:00');
  });

  it('waits for four days of study', () => {
    expect(usualStartTime(log([at(1, 21), at(2, 21), at(3, 21)]), now)).toBeNull();
  });

  it('leaves out answers older than a month', () => {
    expect(usualStartTime(log([at(40, 8), at(41, 8), at(42, 8), at(43, 8)]), now)).toBeNull();
  });
});

describe('timeLabel', () => {
  it('reads as a student says it', () => {
    expect(timeLabel('21:15')).toBe('9:15 pm');
    expect(timeLabel('08:00')).toBe('8 am');
    expect(timeLabel('12:00')).toBe('noon');
    expect(timeLabel('00:30')).toBe('12:30 am');
  });
});
