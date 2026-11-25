import { describe, expect, it } from 'vitest';
import type { Course } from '@/schema/course';
import { forecastDue } from './forecast';

const course = {
  schema_version: '1.0',
  metadata: { title: 'T' },
  sections: [
    {
      id: 's1',
      title: 'S',
      items: [
        { id: 'a', type: 'flashcard', front: 'f', back: 'b' },
        { id: 'b', type: 'flashcard', front: 'f', back: 'b' },
        { id: 'c', type: 'flashcard', front: 'f', back: 'b' },
      ],
    },
  ],
} as unknown as Course;

describe('forecastDue', () => {
  it('counts studied cards by when they fade, and leaves new ones out', () => {
    const now = Date.now();
    // Seen long ago and badly: due already. Seen just now and well: due later.
    const progress = {
      a: { got: 1, missed: 0, lastSeen: now - 90 * 86_400_000 },
      b: { got: 3, missed: 0, lastSeen: now },
    };
    const out = forecastDue(course, progress, now);
    expect(out[0]!.count).toBe(1);
    expect(out.reduce((n, f) => n + f.count, 0)).toBe(2);
  });
});
