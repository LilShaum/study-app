import { describe, expect, it } from 'vitest';
import type { Course } from '@/schema/course';
import { sortedSections } from './sortedSections';
import { buildSessionItems } from './buildSessionItems';

const make = (sections: Array<{ id: string; order?: number }>): Course =>
  ({
    schema_version: '1.0',
    metadata: { title: 'T' },
    sections: sections.map((s) => ({
      id: s.id,
      title: s.id.toUpperCase(),
      ...(s.order === undefined ? {} : { order: s.order }),
      items: [{ id: `${s.id}_i`, type: 'flashcard', front: 'f', back: 'b' }],
    })),
  }) as unknown as Course;

describe('sortedSections', () => {
  // section.order was read into display metadata but never sorted on, so a
  // course whose sections were written out of sequence silently ignored it.
  it('orders sections by their order field, not array position', () => {
    const course = make([
      { id: 'third', order: 3 },
      { id: 'first', order: 1 },
      { id: 'second', order: 2 },
    ]);
    expect(sortedSections(course).map((s) => s.id)).toEqual(['first', 'second', 'third']);
  });

  it('keeps authored order when the field is absent', () => {
    const course = make([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
    expect(sortedSections(course).map((s) => s.id)).toEqual(['a', 'b', 'c']);
  });

  it('is stable for equal order values', () => {
    const course = make([
      { id: 'a', order: 1 },
      { id: 'b', order: 1 },
      { id: 'c', order: 0 },
    ]);
    expect(sortedSections(course).map((s) => s.id)).toEqual(['c', 'a', 'b']);
  });

  it('feeds study sessions in sorted order too', () => {
    const course = make([
      { id: 'later', order: 2 },
      { id: 'earlier', order: 1 },
    ]);
    expect(buildSessionItems(course, 'browse').map((i) => i._sectionId)).toEqual(['earlier', 'later']);
  });
});
