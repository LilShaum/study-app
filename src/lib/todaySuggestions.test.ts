import { describe, expect, it } from 'vitest';
import type { Course } from '@/schema/course';
import { todaySuggestions, type LectureState } from './todaySuggestions';

const NOW = new Date('2026-11-24T10:00:00').getTime();
const lecture = (id: string, code: string | undefined, title: string, extra: Partial<LectureState> = {}, exam?: string, exams?: { id: string; name: string; date: string }[]): LectureState => ({
  id,
  course: {
    schema_version: '1.0',
    metadata: { title, ...(code ? { course_code: code } : {}), ...(exam ? { exam_date: exam } : {}), ...(exams ? { exams } : {}) },
    sections: [],
  } as unknown as Course,
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
    expect(out[0]).toMatchObject({ action: 'Review', what: '5 questions to review', to: '/session/a/adaptive?class=BIOL%20365&mix=1' });
    expect(out[1]).toMatchObject({ action: 'Carry on in Learn', what: 'Nerves', to: '/session/a/learn?resume=1' });
  });

  it('says nothing about a class with nothing fading, nothing under way and nothing new', () => {
    expect(todaySuggestions([lecture('a', 'BIOL 365', 'BIOL 365: Nerves')], NOW)).toEqual([]);
  });
});

// The situations a student is in, one by one (the owner, 2026-11-24: "how it
// handles different scenarios").
describe('Today suggestions, situation by situation', () => {
  it('a brand-new student with one lecture: Learn it', () => {
    expect(todaySuggestions([lecture('a', undefined, 'Cells', { started: false })], NOW)).toEqual([
      expect.objectContaining({ who: 'Cells', action: 'Learn', to: '/session/a/learn' }),
    ]);
  });

  it('a class with ten lectures not started: only the first is suggested', () => {
    const ls = Array.from({ length: 10 }, (_, i) => lecture(`l${i}`, 'BIOL 365', `BIOL 365: Lecture ${i + 1}`, { started: false }));
    const out = todaySuggestions(ls, NOW);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ what: 'Lecture 1, not started' });
  });

  it('Learn under way comes before a new lecture in the same class', () => {
    const out = todaySuggestions(
      [lecture('a', 'BIOL 365', 'BIOL 365: One', { learnUnderWay: true }), lecture('b', 'BIOL 365', 'BIOL 365: Two', { started: false })],
      NOW,
    );
    expect(out.map((s) => s.action)).toEqual(['Carry on in Learn', 'Learn']);
  });

  it('a class whose exams are all behind it is finished: nothing, however much is fading', () => {
    const past = [{ id: 'f', name: 'Final', date: '2026-11-10' }];
    expect(todaySuggestions([lecture('a', 'BIOL 365', 'BIOL 365: One', { due: 40 }, undefined, past)], NOW)).toEqual([]);
  });

  it('a midterm behind and a final ahead: still studied', () => {
    const exams = [
      { id: 'm', name: 'Midterm', date: '2026-11-10' },
      { id: 'f', name: 'Final', date: '2026-12-15' },
    ];
    const out = todaySuggestions([lecture('a', 'BIOL 365', 'BIOL 365: One', { due: 4 }, undefined, exams)], NOW);
    expect(out[0]).toMatchObject({ action: 'Review' });
  });

  it('the exam today: the practice test first, then review', () => {
    const out = todaySuggestions([lecture('a', 'BIOL 365', 'BIOL 365: One', { due: 9 }, '2026-11-24')], NOW);
    expect(out.map((s) => s.action)).toEqual(['Practice test', 'Review']);
    expect(out[0].what).toBe('exam today');
  });

  it('one question to review reads in the singular', () => {
    expect(todaySuggestions([lecture('a', undefined, 'Cells', { due: 1 })], NOW)[0].what).toBe('1 question to review');
  });

  it('six classes with something to do: four lines, the most to review first', () => {
    const ls = [3, 30, 8, 12, 1, 20].map((due, i) => lecture(`l${i}`, `CLS ${100 + i}`, `CLS ${100 + i}: L`, { due }));
    const out = todaySuggestions(ls, NOW);
    expect(out.map((s) => s.who)).toEqual(['CLS 101', 'CLS 105', 'CLS 103', 'CLS 102']);
  });
});
