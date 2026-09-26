import { describe, expect, it } from 'vitest';
import type { Course, StudyItem } from '@/schema/course';
import { recallId } from './scored';
import { CAP_WITHIN_DAYS, REVIEW_CAP, REVIEW_SECONDS, splitSitting } from './today';

const DAY = 86_400_000;
const exam = new Date(2026, 9, 27, 9).getTime();
const def = (id: string): StudyItem => ({ id, type: 'definition', term: id, definition: 'x' }) as StudyItem;
const course = (withDate: boolean): Course =>
  ({
    schema_version: '1.0',
    metadata: { title: 'T', ...(withDate ? { exam_date: '2026-10-27' } : {}) },
    sections: [{ id: 'a', title: 'A', items: Array.from({ length: 200 }, (_, i) => def(`d${i}`)) }],
  }) as Course;
// 150 studied long ago (all due), 50 never studied.
const progress = Object.fromEntries(
  Array.from({ length: 150 }, (_, i) => [recallId(`d${i}`), { got: 1, missed: 0, lastSeen: exam - 60 * DAY, stability: 2 }]),
);

describe('splitSitting', () => {
  it('reviews first, whatever is due, when the exam is weeks away', () => {
    const plan = splitSitting(course(true), progress, exam - 20 * DAY, 30);
    expect(plan.due).toBe(150);
    expect(plan.reviewMinutes).toBe(30);
  });

  it(`holds Review to ${REVIEW_CAP * 100}% in the last ${CAP_WITHIN_DAYS} days while something is unstudied`, () => {
    const plan = splitSitting(course(true), progress, exam - 2 * DAY, 30);
    expect(plan.unseen).toBe(50);
    expect(plan.reviewMinutes).toBeCloseTo(30 * REVIEW_CAP);
    expect(plan.learnMinutes).toBeCloseTo(30 * (1 - REVIEW_CAP));
  });

  it('never caps without an exam date', () => {
    expect(splitSitting(course(false), progress, exam - 2 * DAY, 30).reviewMinutes).toBe(30);
  });

  it('gives Review only the time its due cards need', () => {
    const few = Object.fromEntries(Object.entries(progress).slice(0, 12));
    const plan = splitSitting(course(false), few, exam - 20 * DAY, 30);
    expect(plan.reviewMinutes).toBeCloseTo((12 * REVIEW_SECONDS) / 60);
    expect(plan.learnMinutes).toBeCloseTo(30 - (12 * REVIEW_SECONDS) / 60);
  });
});
