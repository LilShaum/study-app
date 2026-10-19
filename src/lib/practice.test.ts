import { describe, expect, it } from 'vitest';
import type { Course } from '@/schema/course';
import fixture from '../../scripts/__fixtures__/biochem.study.json';
import { CARDS, KINDS, choiceOf, countBasis, examSoon, lecturesFor, practiceCount, practiceLink, sessionFor, sittingSize } from './practice';

// Made-up content: no course material in the repo.
const course = {
  schema_version: '1.0',
  metadata: { title: 'T' },
  sections: [
    {
      id: 's1',
      title: 'S',
      items: [
        { id: 'f1', type: 'flashcard', front: 'Hollis (1981): what was the question?', back: 'x', source_excerpt: 'x' },
        { id: 'f2', type: 'flashcard', front: 'What is a stoma?', back: 'x', source_excerpt: 'x' },
        { id: 'q1', type: 'mcq', question: 'In Hollis (1981), what did the cue do?', options: ['a', 'b'], correct_index: 0, explanation: 'x', source_excerpt: 'x' },
      ],
    },
  ],
} as unknown as Course;

describe('practice choices', () => {
  it('reads back every choice from the session it opens', () => {
    for (const { value: cards } of CARDS)
      for (const { value: kind } of KINDS) {
        const s = sessionFor(cards, kind);
        expect(choiceOf(s.mode, s.kind ?? null)).toEqual({ cards, kind });
      }
    expect(choiceOf('today', null)).toBeNull();
  });

  it('counts only the study cards when studies are picked, and none for a study the lecture lacks', () => {
    const count = (study?: string) => practiceCount(countBasis(course, {}, new Set(), { study }, 0), 'everything', 'all');
    expect(count()).toBe(3);
    expect(count('all')).toBe(2);
    expect(count('nobody 1900')).toBe(0);
  });

  it('builds the link with the section, studies, kind and class', () => {
    expect(practiceLink('c1', 'due', 'flashcards', { study: 'hollis 1981' }, 'BIOL 1')).toBe(
      '/session/c1/review?study=hollis+1981&kind=flashcards&class=BIOL+1',
    );
    expect(practiceLink('c1', 'everything', 'all', {})).toBe('/session/c1/mixed');
    expect(practiceLink('c1', 'everything', 'all', {}, 'BIOL 1', true)).toBe('/session/c1/mixed?class=BIOL+1&single=1');
  });

  it("marks a class's lectures mixed in one sitting, only from a class and only over several lectures", () => {
    expect(practiceLink('c1', 'due', 'all', {}, 'BIOL 1', false, true)).toBe('/session/c1/review?class=BIOL+1&mix=1');
    expect(practiceLink('c1', 'due', 'all', { study: 'all' }, 'BIOL 1', false, true)).toBe('/session/c1/review?study=all&class=BIOL+1&mix=1');
    // One lecture has the cards: nothing to mix.
    expect(practiceLink('c1', 'due', 'all', {}, 'BIOL 1', true, true)).toBe('/session/c1/review?class=BIOL+1&single=1');
    expect(practiceLink('c1', 'due', 'all', {}, undefined, false, true)).toBe('/session/c1/review');
  });

  it('says what the sitting holds: its cards to read, and Due now fitted to the daily time', () => {
    const lecture = fixture as unknown as Course;
    const day = 86_400_000;
    const now = 400 * day;
    // Every card answered right once, long ago: all of them due.
    const progress = Object.fromEntries(lecture.sections.flatMap((s) => s.items).map((i) => [i.id, { got: 1, missed: 0, lastSeen: day, streak: 1 }]));
    const basis = countBasis(lecture, progress as never, new Set(), {}, now);
    const everything = sittingSize(basis, 'everything', 'all', Infinity);
    expect(everything.answer).toBe(practiceCount(basis, 'everything', 'all'));
    expect(everything.read).toBeGreaterThan(0);
    const due = practiceCount(basis, 'due', 'all');
    expect(due).toBeGreaterThan(5);
    expect(sittingSize(basis, 'due', 'all', 2).answer).toBeLessThan(due);
    expect(sittingSize(basis, 'due', 'all', Infinity).answer).toBe(due);
  });

  it("mixes a class's lectures by default in the last week before an exam; a pick holds only in the situation it was made in", () => {
    expect(lecturesFor(null, false)).toBe('in-turn');
    expect(lecturesFor(null, true)).toBe('mixed');
    // One at a time, picked weeks ago, does not keep exam week unmixed...
    expect(lecturesFor({ value: 'in-turn', nearExam: false }, true)).toBe('mixed');
    // ...but picked in exam week, it holds there.
    expect(lecturesFor({ value: 'in-turn', nearExam: true }, true)).toBe('in-turn');
    expect(lecturesFor({ value: 'mixed', nearExam: false }, false)).toBe('mixed');
    // Mixed by choice in exam week does not outlast the exam.
    expect(lecturesFor({ value: 'mixed', nearExam: true }, false)).toBe('in-turn');
  });

  it("finds the class's next exam only in its last week", () => {
    const now = new Date(2026, 9, 19, 12).getTime();
    const withExam = (date: string) => ({ ...course, metadata: { title: 'T', course_code: 'C', exams: [{ id: 'm', name: 'Midterm 2', date }] } }) as unknown as Course;
    expect(examSoon([['a', withExam('2026-10-22')]], now)).toEqual({ name: 'Midterm 2', days: 3 });
    expect(examSoon([['a', withExam('2026-10-26')]], now)).toEqual({ name: 'Midterm 2', days: 7 });
    expect(examSoon([['a', withExam('2026-10-27')]], now)).toBeNull();
    expect(examSoon([['a', withExam('2026-10-10')]], now)).toBeNull();
    expect(examSoon([['a', course]], now)).toBeNull();
  });
});

