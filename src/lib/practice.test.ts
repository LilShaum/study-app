import { describe, expect, it } from 'vitest';
import type { Course } from '@/schema/course';
import { CARDS, KINDS, choiceOf, countBasis, practiceCount, practiceLink, sessionFor } from './practice';

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
});
