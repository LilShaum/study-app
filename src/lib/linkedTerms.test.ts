import { describe, expect, it } from 'vitest';
import type { Course, StudyItem } from '@/schema/course';
import { sameTerm, twinsOf } from './linkedTerms';

const def = (id: string, term: string, definition: string) => ({ id, type: 'definition', term, definition }) as Extract<StudyItem, { type: 'definition' }>;
const course = (items: StudyItem[]) => ({ schema_version: '1.0', metadata: { title: 'T' }, sections: [{ id: 's', title: 'S', items }] }) as Course;

describe('one term in two lectures', () => {
  const a = def('a1', 'Stoma', 'A pore in the leaf surface, opened and closed by guard cells, through which gases pass.');
  const b = def('b1', 'Stomas', 'A pore in the surface of a leaf through which gases pass, opened and closed by its guard cells.');
  const c = def('c1', 'Stoma', 'In surgery, an opening made in the abdominal wall.');

  it('is the same name and much the same meaning', () => {
    expect(sameTerm(a, b)).toBe(true);
    expect(sameTerm(a, c)).toBe(false);
  });

  it('links the typed term across lectures, both ways', () => {
    const courses = { x: course([a]), y: course([b]), z: course([c]) };
    expect(twinsOf(courses, 'x', 'a1~recall')).toEqual([{ courseId: 'y', id: 'b1~recall' }]);
    expect(twinsOf(courses, 'y', 'b1~recall')).toEqual([{ courseId: 'x', id: 'a1~recall' }]);
    expect(twinsOf(courses, 'z', 'c1~recall')).toEqual([]);
  });
});
