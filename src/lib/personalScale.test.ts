import { describe, expect, it } from 'vitest';
import type { AnswerEvent } from '@/store/studyLog';
import { fitPersonalScale } from './personalScale';

const review = (predicted: number, got: boolean, extra: Partial<AnswerEvent> = {}): AnswerEvent => ({
  at: 0,
  type: 'recall',
  got,
  sinceHours: 24 * 7,
  afterMiss: false,
  predicted,
  ...extra,
});

describe('the student’s own forgetting rate', () => {
  it('is the model’s with no reviews yet', () => {
    expect(fitPersonalScale([])).toBe(1);
    expect(fitPersonalScale([{ ...review(0.5, true), predicted: null, sinceHours: null }])).toBe(1);
  });

  it('stays near the model’s when answers match it', () => {
    const answers = Array.from({ length: 40 }, (_, k) => review(0.8, k % 5 !== 0));
    expect(fitPersonalScale(answers)).toBeGreaterThan(0.8);
    expect(fitPersonalScale(answers)).toBeLessThan(1.25);
  });

  it('moves a little on a few answers, and far on a clear pattern', () => {
    // A week later the model expected about 8%: got 11 of 12 (the owner's
    // first backup, 2026-10-13), against 2 of 2.
    const few = fitPersonalScale([review(0.08, true), review(0.08, true)]);
    const many = fitPersonalScale(Array.from({ length: 12 }, (_, k) => review(0.08, k !== 0)));
    expect(few).toBeGreaterThan(1);
    expect(many).toBeGreaterThan(few);
    expect(many).toBeGreaterThan(2.5);
  });

  it('goes below 1 for a student who forgets faster than the model', () => {
    expect(fitPersonalScale(Array.from({ length: 30 }, (_, k) => review(0.85, k % 3 === 0)))).toBeLessThan(0.7);
  });

  it('ignores a miss asked again within the hour: that is not forgetting', () => {
    const soon = Array.from({ length: 20 }, () => review(0.99, false, { sinceHours: 0.1 }));
    expect(fitPersonalScale(soon)).toBe(1);
  });

  it('reads a prediction made under an earlier scale back to the model’s', () => {
    // Recall 0.5 read with scale 2 is recall 0.25 at the model's scale.
    const atTwo = Array.from({ length: 30 }, (_, k) => review(0.5, k % 2 === 0, { scale: 2 }));
    const atOne = Array.from({ length: 30 }, (_, k) => review(0.25, k % 2 === 0));
    expect(fitPersonalScale(atTwo)).toBeCloseTo(fitPersonalScale(atOne), 5);
  });
});
