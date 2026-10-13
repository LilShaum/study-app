import { describe, expect, it } from 'vitest';
import type { Course, StudyItem } from '@/schema/course';
import { sameTerm, twinsOf } from './linkedTerms';

const def = (id: string, term: string, definition: string) => ({ id, type: 'definition', term, definition }) as Extract<StudyItem, { type: 'definition' }>;
const course = (items: StudyItem[]) => ({ schema_version: '1.0', metadata: { title: 'T' }, sections: [{ id: 's', title: 'S', items }] }) as Course;

describe('one term in two lectures', () => {
  const a = def('a1', 'Effector', 'The component of a feedback loop that acts on the regulated variable.');
  const b = def('b1', 'Effectors', 'The component of a regulatory circuit that acts on the regulated variable, receiving feedback.');
  const c = def('c1', 'Effector', 'In exercise science, the muscle that carries out a movement.');

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
