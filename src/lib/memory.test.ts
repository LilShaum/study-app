import { describe, expect, it } from 'vitest';
import {
  DUE_BELOW,
  examTime,
  isDue,
  isDueFor,
  memoryBefore,
  nextDueAt,
  whenLabel,
  nextStability,
  retrievability,
  stabilityOf,
} from './memory';
import type { ItemResult } from '@/store/progress';

const DAY = 86_400_000;
const T0 = 1_000 * DAY;

describe('retrievability', () => {
  it('is null for an item never answered — unseen is not forgotten', () => {
    expect(retrievability(undefined, T0)).toBeNull();
    expect(isDue(undefined, T0)).toBe(false);
  });

  it('starts at 1 and falls to about 37% after one stability', () => {
    const r: ItemResult = { got: 1, missed: 0, lastSeen: T0, stability: 2 };
    expect(retrievability(r, T0)).toBe(1);
    expect(retrievability(r, T0 + 2 * DAY)).toBeCloseTo(Math.exp(-1));
  });

  it('becomes due once it drops below the threshold', () => {
    const r: ItemResult = { got: 1, missed: 0, lastSeen: T0, stability: 1 };
    const dueAfter = -Math.log(DUE_BELOW); // days
    expect(isDue(r, T0 + (dueAfter - 0.01) * DAY)).toBe(false);
    expect(isDue(r, T0 + (dueAfter + 0.01) * DAY)).toBe(true);
  });
});

describe('nextStability', () => {
  it('grows more when more had been forgotten', () => {
    const before = { stability: 2, lastSeen: T0 };
    const soon = nextStability(before, true, T0 + 0.1 * DAY);
    const later = nextStability(before, true, T0 + 3 * DAY);
    expect(later).toBeGreaterThan(soon);
  });

  it('makes answering the same item again at once worth almost nothing', () => {
    // Cramming: five right answers in a minute are one answer.
    let s = nextStability(null, true, T0);
    for (let i = 1; i <= 5; i++) s = nextStability({ stability: s, lastSeen: T0 }, true, T0 + i * 1000);
    expect(s).toBeCloseTo(nextStability(null, true, T0), 1);
  });

  it('expands the gap across well-spaced right answers', () => {
    let at = T0;
    let before: { stability: number; lastSeen: number } | null = null;
    const gaps: number[] = [];
    for (let i = 0; i < 4; i++) {
      const s = nextStability(before, true, at);
      before = { stability: s, lastSeen: at };
      const gap = -Math.log(DUE_BELOW) * s; // days until due
      gaps.push(gap);
      at += gap * DAY;
    }
    for (let i = 1; i < gaps.length; i++) expect(gaps[i]).toBeGreaterThan(gaps[i - 1]);
  });

  it('shrinks on a miss, but never below the floor', () => {
    expect(nextStability({ stability: 10, lastSeen: T0 }, false, T0 + DAY)).toBeLessThan(10);
    expect(nextStability({ stability: 1, lastSeen: T0 }, false, T0 + DAY)).toBeCloseTo(1);
  });
});

describe('records from before the model', () => {
  it('derives a stability from the counts', () => {
    expect(stabilityOf({ got: 4, missed: 1, lastSeen: T0 })).toBe(8);
    expect(stabilityOf({ got: 1, missed: 3, lastSeen: T0 })).toBeCloseTo(1);
    expect(memoryBefore({ got: 0, missed: 0, lastSeen: null })).toBeNull();
  });
});

describe('with an exam date', () => {
  const r: ItemResult = { got: 1, missed: 0, lastSeen: T0, stability: 4 };

  it('is not due early just because the exam is far off', () => {
    expect(isDueFor(r, T0 + DAY / 2, T0 + 60 * DAY)).toBe(false);
  });

  it('brings an item back before the exam, as late as still leaves it strong on the day', () => {
    // S = 4 days: on the exam, two days out, recall would be ~0.61. The
    // review has to land within 4·ln(1/0.9) ≈ 0.42 days of it, less a day's
    // slack: from about T0 + 0.58 days.
    const exam = T0 + 2 * DAY;
    expect(isDueFor(r, T0 + 0.5 * DAY, exam)).toBe(false);
    expect(isDue(r, T0 + 0.7 * DAY)).toBe(false);
    expect(isDueFor(r, T0 + 0.7 * DAY, exam)).toBe(true);
  });

  it('leaves an item alone that will still be strong on the day', () => {
    const solid: ItemResult = { got: 5, missed: 0, lastSeen: T0, stability: 200 };
    expect(isDueFor(solid, T0 + DAY, T0 + 3 * DAY)).toBe(false);
  });

  it('ignores an exam that has passed', () => {
    expect(isDueFor(r, T0 + DAY / 2, T0)).toBe(false);
  });

  it('reads a date as the morning of that day, local time', () => {
    const t = new Date(examTime('2026-11-12')!);
    expect([t.getFullYear(), t.getMonth(), t.getDate(), t.getHours()]).toEqual([2026, 10, 12, 9]);
    expect(examTime('12/11/2026')).toBeNull();
    expect(examTime(undefined)).toBeNull();
  });
});

describe('nextDueAt', () => {
  it('is when isDueFor turns true', () => {
    const r: ItemResult = { got: 1, missed: 0, lastSeen: T0, stability: 3 };
    for (const examAt of [null, T0 + 2 * DAY, T0 + 40 * DAY]) {
      const at = nextDueAt(r, T0, examAt)!;
      expect(isDueFor(r, at - 60_000, examAt)).toBe(false);
      expect(isDueFor(r, at + 60_000, examAt)).toBe(true);
    }
  });

  it('is null for an item never answered', () => {
    expect(nextDueAt(undefined, T0, null)).toBeNull();
  });
});

describe('whenLabel', () => {
  const at = (y: number, m: number, d: number, h: number) => new Date(y, m, d, h).getTime();
  it('speaks in calendar days', () => {
    const now = at(2026, 8, 24, 22); // Thursday 10pm
    expect(whenLabel(at(2026, 8, 24, 23), now)).toBe('later today');
    expect(whenLabel(at(2026, 8, 25, 9), now)).toBe('tomorrow');
    expect(whenLabel(at(2026, 8, 28, 9), now)).toMatch(/^on \w+/);
    expect(whenLabel(at(2026, 9, 20, 9), now)).toMatch(/^on /);
  });
});
