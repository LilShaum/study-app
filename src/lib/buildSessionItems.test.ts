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
    const items = buildSessionItems(course, 'missed', { missedIds: new Set(['f2', 'q1']) });
    expect(items.map((i) => i.id).sort()).toEqual(['f2', 'q1']);
  });

  it('returns nothing for missed mode when nothing has been missed', () => {
    expect(buildSessionItems(course, 'missed', { missedIds: new Set() })).toHaveLength(0);
  });

  it('attaches section metadata each item needs for navigation', () => {
    const [first] = buildSessionItems(course, 'browse');
    expect(first._sectionId).toBe('s1');
    expect(first._sectionTitle).toBe('One');
    expect(first._sectionOrder).toBe(1);
  });
});

const mixedCourse = {
  schema_version: '1.0',
  metadata: { title: 'T' },
  sections: [
    {
      id: 'sa',
      title: 'A',
      order: 1,
      items: [
        { id: 'a_mcq', type: 'mcq', question: 'q', options: ['a', 'b'], correct_index: 0 },
        { id: 'a_card', type: 'flashcard', front: 'f', back: 'b' },
        { id: 'a_gfx', type: 'graphic', title: 'g', svg: '<svg viewBox="0 0 1 1"/>' },
        { id: 'a_def', type: 'definition', term: 't', definition: 'd' },
        { id: 'a_eg', type: 'example', title: 'e' },
      ],
    },
    {
      id: 'sb',
      title: 'B',
      order: 2,
      items: [
        { id: 'b_mcq', type: 'mcq', question: 'q', options: ['a', 'b'], correct_index: 0 },
        { id: 'b_def', type: 'definition', term: 't', definition: 'd' },
      ],
    },
  ],
} as unknown as Course;

describe('buildSessionItems — learn mode', () => {
  it('orders a section definition → example/diagram → flashcard → mcq', () => {
    const items = buildSessionItems(mixedCourse, 'learn', { sectionId: 'sa' });
    expect(items.map((i) => i.id)).toEqual(['a_def', 'a_eg', 'a_gfx', 'a_card', 'a_mcq']);
  });

  it('finishes one section before starting the next', () => {
    // The failure this pins: sorting across the whole course would put every
    // definition in front of every question, so you would read the entire
    // course before answering anything.
    const items = buildSessionItems(mixedCourse, 'learn');
    expect(items.map((i) => i.id)).toEqual(['a_def', 'a_eg', 'a_gfx', 'a_card', 'a_mcq', 'b_def', 'b_mcq']);
  });

  it('drops nothing — it reorders rather than filters', () => {
    expect(buildSessionItems(mixedCourse, 'learn')).toHaveLength(7);
  });
});

describe('buildSessionItems — weakest first', () => {
  const at = (got: number, missed: number, lastSeen = 1) => ({ got, missed, lastSeen });

  it('ranks by accuracy, worst first', () => {
    const items = buildSessionItems(mixedCourse, 'weakest', {
      progress: { a_mcq: at(1, 3), b_mcq: at(4, 0), a_card: at(2, 2) },
    });
    expect(items.map((i) => i.id)).toEqual(['a_mcq', 'a_card', 'b_mcq']);
  });

  it('keeps an item you get right more often than wrong, unlike Review Missed', () => {
    // 3/5 never appears in Review Missed (missed is not > got) but is exactly
    // the item most likely to cost marks.
    const progress = { a_mcq: at(3, 2), b_mcq: at(5, 0), a_card: at(5, 0) };
    expect(buildSessionItems(mixedCourse, 'weakest', { progress })[0].id).toBe('a_mcq');
    expect(buildSessionItems(mixedCourse, 'missed', { missedIds: new Set() })).toHaveLength(0);
  });

  it('sorts never-seen items between what you fail and what you have nailed', () => {
    const items = buildSessionItems(mixedCourse, 'weakest', {
      progress: { a_mcq: at(0, 2), b_mcq: at(3, 0) },
    });
    // a_card has no history at all.
    expect(items.map((i) => i.id)).toEqual(['a_mcq', 'a_card', 'b_mcq']);
  });

  it('serves only gradable items', () => {
    const ids = buildSessionItems(mixedCourse, 'weakest').map((i) => i.id);
    expect(ids.sort()).toEqual(['a_card', 'a_mcq', 'b_mcq']);
  });

  it('is not empty on a course with no history yet', () => {
    expect(buildSessionItems(mixedCourse, 'weakest')).toHaveLength(3);
  });

  it('breaks an accuracy tie with the item missed more times', () => {
    const items = buildSessionItems(mixedCourse, 'weakest', {
      progress: { a_mcq: at(1, 1), b_mcq: at(4, 4), a_card: at(9, 0) },
    });
    expect(items.map((i) => i.id)).toEqual(['b_mcq', 'a_mcq', 'a_card']);
  });
});
