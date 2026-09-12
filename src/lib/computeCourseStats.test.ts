import { describe, expect, it } from 'vitest';
import type { Course } from '@/schema/course';
import type { ItemResult } from '@/store/progress';
import { computeCourseStats } from './computeCourseStats';

const course = {
  schema_version: '1.0',
  metadata: { title: 'T' },
  sections: [
    {
      id: 's1',
      title: 'Strong',
      items: [
        { id: 'q1', type: 'mcq', question: 'q', options: ['a', 'b'], correct_index: 0, tags: ['easy-topic'] },
        // Definitions are not gradable and must not dilute the denominator.
        { id: 'd1', type: 'definition', term: 't', definition: 'd' },
      ],
    },
    {
      id: 's2',
      title: 'Weak',
      items: [{ id: 'f1', type: 'flashcard', front: 'f', back: 'b', tags: ['hard-topic'] }],
    },
  ],
} as unknown as Course;

const r = (got: number, missed: number): ItemResult => ({ got, missed, lastSeen: 1000 });

describe('computeCourseStats', () => {
  it('counts only gradable items and reports zero progress cleanly', () => {
    const stats = computeCourseStats(course, {});
    expect(stats.gradableCount).toBe(2); // mcq + flashcard, not the definition
    expect(stats.studiedCount).toBe(0);
    expect(stats.accuracyPct).toBeNull();
    expect(stats.weakestSections).toHaveLength(0);
  });

  it('computes overall accuracy across attempts', () => {
    const stats = computeCourseStats(course, { q1: r(3, 1), f1: r(0, 2) });
    expect(stats.totalGot).toBe(3);
    expect(stats.totalMissed).toBe(3);
    expect(stats.accuracyPct).toBe(50);
    expect(stats.studiedCount).toBe(2);
  });

  it('ranks weakest sections and tags worst-first', () => {
    const stats = computeCourseStats(course, { q1: r(4, 0), f1: r(0, 4) });
    expect(stats.weakestSections.map((s) => s.label)).toEqual(['Weak', 'Strong']);
    expect(stats.weakestSections[0].acc).toBe(0);
    expect(stats.weakestTags.map((t) => t.label)).toEqual(['hard-topic', 'easy-topic']);
  });

  it('ignores items recorded with no attempts', () => {
    const stats = computeCourseStats(course, { q1: r(0, 0) });
    expect(stats.studiedCount).toBe(0);
  });

  it('tracks the most recent lastSeen', () => {
    const stats = computeCourseStats(course, {
      q1: { got: 1, missed: 0, lastSeen: 500 },
      f1: { got: 1, missed: 0, lastSeen: 900 },
    });
    expect(stats.lastSeen).toBe(900);
  });
});
