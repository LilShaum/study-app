import { describe, expect, it } from 'vitest';
import type { Course, StudyItem } from '@/schema/course';
import { examAfterAdding, examRule, PROTECT_FROM_DAYS } from './exam';
import { recallId } from './scored';

const DAY = 86_400_000;
const def = (id: string): StudyItem => ({ id, type: 'definition', term: id, definition: 'x' }) as StudyItem;
const course = (examDate?: string, sections?: string[]): Course =>
  ({
    schema_version: '1.0',
    metadata: { title: 'T', exam_date: examDate, exam_sections: sections },
    sections: [
      { id: 'a', title: 'A', items: [def('a1')] },
      { id: 'b', title: 'B', items: [def('b1')] },
    ],
  }) as Course;
const seen = { got: 1, missed: 0, lastSeen: 0 };
const exam = new Date(2026, 9, 27, 9).getTime();
const date = '2026-10-27';

describe('examRule', () => {
  it('does nothing without a date', () => {
    const rule = examRule(course(), {}, exam - 20 * DAY);
    expect(rule.at).toBeNull();
    expect(rule.forItem(recallId('a1'))).toBeNull();
  });

  it('holds back while the exam still covers something never studied', () => {
    const rule = examRule(course(date), { [recallId('a1')]: seen }, exam - 20 * DAY);
    expect(rule.unseen).toBe(1);
    expect(rule.protecting).toBe(false);
    expect(rule.forItem(recallId('a1'))).toBeNull();
  });

  it('protects once everything on it has been studied', () => {
    const all = { [recallId('a1')]: seen, [recallId('b1')]: seen };
    expect(examRule(course(date), all, exam - 20 * DAY).forItem(recallId('a1'))).toBe(exam);
  });

  it(`protects in the last ${PROTECT_FROM_DAYS} days regardless`, () => {
    expect(examRule(course(date), {}, exam - 3 * DAY).forItem(recallId('a1'))).toBe(exam);
  });

  it('applies only to the sections the exam covers', () => {
    // b is not on the exam, so its never-studied item does not hold anything back.
    const rule = examRule(course(date, ['a']), { [recallId('a1')]: seen }, exam - 20 * DAY);
    expect(rule.unseen).toBe(0);
    expect(rule.forItem(recallId('a1'))).toBe(exam);
    expect(rule.forItem(recallId('b1'))).toBeNull();
    expect(rule.forSection('b')).toBeNull();
  });

  it('ignores an exam that has passed', () => {
    expect(examRule(course(date), {}, exam + DAY).at).toBeNull();
  });
});

describe('examAfterAdding', () => {
  const withNew = (sections?: string[]) => {
    const c = course(date, sections);
    return { ...c, sections: [...c.sections, { id: 'n', title: 'New', items: [def('n1')] }] } as Course;
  };

  it('counts a section added weeks before the exam', () => {
    expect(examAfterAdding(withNew(['a']), ['n'], exam - 20 * DAY)).toEqual({ examSections: ['a', 'n'], included: true });
  });

  it('leaves out a section added in the last week', () => {
    expect(examAfterAdding(withNew(['a']), ['n'], exam - 3 * DAY)).toEqual({ examSections: ['a'], included: false });
  });

  it('turns an implicit "every section" into the list it meant', () => {
    expect(examAfterAdding(withNew(), ['n'], exam - 3 * DAY)?.examSections).toEqual(['a', 'b']);
  });

  it('does nothing without an upcoming exam', () => {
    expect(examAfterAdding(withNew(), ['n'], exam + DAY)).toBeNull();
  });
});
