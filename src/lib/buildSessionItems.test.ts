import { describe, expect, it } from 'vitest';
import type { Course } from '@/schema/course';
import { buildSessionItems } from './buildSessionItems';

const course = {
  schema_version: '1.0',
  metadata: { title: 'T' },
  sections: [
    {
      id: 's1',
      title: 'One',
      order: 1,
      items: [
        { id: 'q1', type: 'mcq', question: 'q', options: ['a', 'b'], correct_index: 0 },
        { id: 'f1', type: 'flashcard', front: 'f', back: 'b' },
      ],
    },
    {
      id: 's2',
      title: 'Two',
      order: 2,
      items: [
        { id: 'd1', type: 'definition', term: 't', definition: 'd' },
        { id: 'f2', type: 'flashcard', front: 'f2', back: 'b2' },
      ],
    },
  ],
} as unknown as Course;

describe('buildSessionItems', () => {
  it('filters to MCQs for quiz mode', () => {
    const items = buildSessionItems(course, 'quiz');
    expect(items.map((i) => i.id)).toEqual(['q1']);
  });

  it('filters to flashcards, across sections', () => {
    const items = buildSessionItems(course, 'flashcards');
    expect(items.map((i) => i.id)).toEqual(['f1', 'f2']);
  });

  it('filters to definitions', () => {
    expect(buildSessionItems(course, 'definitions').map((i) => i.id)).toEqual(['d1']);
  });

  it('keeps every item unfiltered for browse', () => {
    expect(buildSessionItems(course, 'browse')).toHaveLength(4);
  });

  it('keeps every item for mixed (shuffled, so compare as a set)', () => {
    const items = buildSessionItems(course, 'mixed');
    expect(items.map((i) => i.id).sort()).toEqual(['d1', 'f1', 'f2', 'q1']);
  });

  it('returns only previously-missed items for missed mode', () => {
    const items = buildSessionItems(course, 'missed', new Set(['f2', 'q1']));
    expect(items.map((i) => i.id).sort()).toEqual(['f2', 'q1']);
  });

  it('returns nothing for missed mode when nothing has been missed', () => {
    expect(buildSessionItems(course, 'missed', new Set())).toHaveLength(0);
  });

  it('attaches section metadata each item needs for navigation', () => {
    const [first] = buildSessionItems(course, 'browse');
    expect(first._sectionId).toBe('s1');
    expect(first._sectionTitle).toBe('One');
    expect(first._sectionOrder).toBe(1);
  });
});
