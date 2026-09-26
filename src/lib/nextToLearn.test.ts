import { describe, expect, it } from 'vitest';
import type { Course, StudyItem } from '@/schema/course';
import { nextSectionToLearn } from './nextToLearn';

const course = {
  schema_version: '1.0',
  metadata: { title: 'T' },
  sections: [
    { id: 'b', title: 'B', order: 2, items: [{ id: 'b1', type: 'mcq', question: 'q', options: ['a', 'b'], correct_index: 0 }] },
    { id: 'a', title: 'A', order: 1, items: [{ id: 'a1', type: 'flashcard', front: 'f', back: 'b' }] },
    { id: 'x', title: 'X', order: 3, items: [{ id: 'x1', type: 'example', title: 'e' }] },
    { id: 'c', title: 'C', order: 4, items: [{ id: 'c1', type: 'definition', term: 't', definition: 'd' }] },
  ],
} as unknown as Course;
const seen = { got: 1, missed: 0, lastSeen: 1 };

describe('nextSectionToLearn', () => {
  it('starts at the first section in course order', () => {
    expect(nextSectionToLearn(course, {})?.section.id).toBe('a');
  });

  it('moves past sections already worked through, and past ones with nothing to score', () => {
    expect(nextSectionToLearn(course, { a1: seen, b1: seen })?.section.id).toBe('c');
  });

  it('counts a definition as learned once its term has been asked for', () => {
    expect(nextSectionToLearn(course, { a1: seen, b1: seen, 'c1~recall': seen })).toBeNull();
  });

  it('reports where the section sits in the course', () => {
    expect(nextSectionToLearn(course, { a1: seen })).toMatchObject({ index: 1 });
  });
});

describe('nextSectionToLearn — an exam with a scope', () => {
  const item = (id: string) => ({ id, type: 'flashcard', front: 'f', back: 'b' }) as StudyItem;
  const scoped = {
    schema_version: '1.0',
    metadata: { title: 'T', exam_date: '2026-10-27', exam_sections: ['c'] },
    sections: [
      { id: 'a', title: 'A', items: [item('a1')] },
      { id: 'b', title: 'B', items: [item('b1')] },
      { id: 'c', title: 'C', items: [item('c1')] },
    ],
  } as Course;
  const before = new Date(2026, 9, 1).getTime();

  it('teaches what the exam covers first', () => {
    expect(nextSectionToLearn(scoped, {}, before)?.section.id).toBe('c');
  });

  it('goes back to course order once the exam has passed', () => {
    expect(nextSectionToLearn(scoped, {}, new Date(2026, 10, 1).getTime())?.section.id).toBe('a');
  });
});
