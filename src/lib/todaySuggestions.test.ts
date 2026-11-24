import { describe, expect, it } from 'vitest';
import type { Course } from '@/schema/course';
import { todaySuggestions, type LectureState } from './todaySuggestions';

const NOW = new Date('2026-11-24T10:00:00').getTime();
const lecture = (id: string, code: string | undefined, title: string, extra: Partial<LectureState> = {}, exam?: string): LectureState => ({
  id,
  course: { schema_version: '1.0', metadata: { title, ...(code ? { course_code: code } : {}), ...(exam ? { exam_date: exam } : {}) }, sections: [] } as unknown as Course,
  due: 0,
  started: true,
  learnUnderWay: false,
  ...extra,
});

describe('Today on the library, as suggestions (the owner, 2026-11-22)', () => {
  it('puts the nearest exam first, and never more than four lines', () => {
    const out = todaySuggestions(
      [
        lecture('a', 'PSYC 351', 'PSYC 351: Memory', { due: 12 }),
        lecture('b', 'BIOL 365', 'BIOL 365: Nerves', { due: 23 }, '2026-11-27'),
        lecture('c', 'BIOL 365', 'BIOL 365: Muscle', { started: false }),
        lecture('d', 'EPHE 155', 'EPHE 155: Energy', { learnUnderWay: true }),
        lecture('e', 'CHEM 101', 'CHEM 101: Atoms', { due: 3 }),
      ],
      NOW,
    );
    expect(out.length).toBeLessThanOrEqual(4);
    expect(out[0]).toMatchObject({ who: 'BIOL 365', action: 'Practice test', what: 'exam in 3 days' });
    // Each class's first line before any class's second.
    expect(out.map((s) => s.who).slice(0, 4)).toEqual(['BIOL 365', 'PSYC 351', 'CHEM 101', 'EPHE 155']);
  });

  it('suggests review with the count fading, Learn where it was left, and a lecture not started', () => {
    const out = todaySuggestions(
      [lecture('a', 'BIOL 365', 'BIOL 365: Nerves', { due: 5, learnUnderWay: true }), lecture('b', 'BIOL 365', 'BIOL 365: Muscle', { started: false })],
      NOW,
    );
    expect(out[0]).toMatchObject({ action: 'Review', what: '5 fading', to: '/session/a/today?class=BIOL%20365' });
    expect(out[1]).toMatchObject({ action: 'Carry on in Learn', what: 'Nerves', to: '/session/a/learn?resume=1' });
  });

  it('says nothing about a class with nothing fading, nothing under way and nothing new', () => {
    expect(todaySuggestions([lecture('a', 'BIOL 365', 'BIOL 365: Nerves')], NOW)).toEqual([]);
  });
});
