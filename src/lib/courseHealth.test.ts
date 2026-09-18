import { describe, it, expect } from 'vitest';
import type { Course, StudyItem } from '@/schema/course';
import { analyseCourseHealth } from './courseHealth';

const mcq = (id: string, question: string, extra: Record<string, unknown> = {}): StudyItem =>
  ({
    id,
    type: 'mcq',
    question,
    options: ['a', 'b', 'c', 'd'],
    correct_index: 0,
    explanation: 'because',
    distractor_rationale: ['', 'x', 'y', 'z'],
    ...extra,
  }) as StudyItem;

const def = (id: string, term: string): StudyItem =>
  ({ id, type: 'definition', term, definition: 'd' }) as StudyItem;

function course(items: StudyItem[], metadata: Record<string, unknown> = {}): Course {
  return {
    schema_version: '1.0',
    metadata: { title: 'T', ...metadata },
    sections: [{ id: 's1', title: 'S', items }],
  } as Course;
}

const find = (h: ReturnType<typeof analyseCourseHealth>, id: string) =>
  h.findings.find((f) => f.id === id);

describe('analyseCourseHealth — structural problems', () => {
  it('flags duplicate item ids as a problem', () => {
    const h = analyseCourseHealth(course([mcq('q1', 'A?'), mcq('q1', 'B?')]));
    expect(find(h, 'duplicate-ids')).toMatchObject({ severity: 'problem' });
    expect(find(h, 'duplicate-ids')?.items).toEqual(['q1']);
  });

  it('flags an out-of-range correct_index as a problem', () => {
    const h = analyseCourseHealth(course([mcq('q1', 'A?', { correct_index: 9 })]));
    expect(find(h, 'correct-index-out-of-range')).toMatchObject({ severity: 'problem' });
  });

  it('flags a misaligned rationale array as a problem', () => {
    // 3 rationales for 4 options shows the wrong reason under the wrong option.
    const h = analyseCourseHealth(course([mcq('q1', 'A?', { distractor_rationale: ['', 'x', 'y'] })]));
    expect(find(h, 'rationale-misaligned')).toMatchObject({ severity: 'problem' });
  });

  it('flags filler options and missing explanations as warnings', () => {
    const h = analyseCourseHealth(
      course([mcq('q1', 'A?', { options: ['a', 'b', 'c', 'All of the above'], explanation: '' })]),
    );
    expect(find(h, 'filler-options')).toMatchObject({ severity: 'warning' });
    expect(find(h, 'no-explanation')).toMatchObject({ severity: 'warning' });
  });

  it('flags two items of one type asking the same thing', () => {
    const h = analyseCourseHealth(course([mcq('q1', 'What is ATP?'), mcq('q2', 'what  IS atp?!')]));
    expect(find(h, 'duplicate-prompts')?.items).toEqual(['q2']);
  });

  it('does not treat the same prompt in different types as a duplicate', () => {
    const h = analyseCourseHealth(
      course([mcq('q1', 'ATP'), { id: 'f1', type: 'flashcard', front: 'ATP', back: 'x' } as StudyItem]),
    );
    expect(find(h, 'duplicate-prompts')).toBeUndefined();
  });

  it('flags a stale total_items claim', () => {
    const h = analyseCourseHealth(course([mcq('q1', 'A?')], { total_items: 99 }));
    expect(find(h, 'stale-total')?.message).toContain('99');
  });

  it('flags a diagram carrying script', () => {
    const h = analyseCourseHealth(
      course([{ id: 'g1', type: 'graphic', title: 'G', svg: '<svg onload="x()"></svg>' } as StudyItem]),
    );
    expect(find(h, 'unsafe-svg')).toMatchObject({ severity: 'warning' });
  });

  it('reports a clean course as clean', () => {
    const h = analyseCourseHealth(course([mcq('q1', 'A?'), mcq('q2', 'B?')]));
    expect(h.findings).toHaveLength(0);
    expect(h.problems).toBe(0);
  });
});

describe('analyseCourseHealth — coverage against the declared inventory', () => {
  const withInventory = (items: StudyItem[], terms: string[]) =>
    course(items, { inventory: { terms } });

  it('holds the generator to the term list it declared', () => {
    const h = analyseCourseHealth(
      withInventory([def('d1', 'Michaelis constant'), mcq('q1', 'What is the Michaelis constant?')], [
        'Michaelis constant',
        'turnover number',
        'catalytic efficiency',
      ]),
    );
    expect(h.declaredTermCoverage).toMatchObject({ covered: 1, total: 3 });
    expect(h.declaredTermCoverage?.missing).toEqual(['turnover number', 'catalytic efficiency']);
    expect(find(h, 'declared-terms-missing')).toMatchObject({ severity: 'problem' });
  });

  it('matches a declared term against a longer definition title', () => {
    const h = analyseCourseHealth(withInventory([def('d1', 'Km (Michaelis constant)')], ['Km']));
    expect(h.declaredTermCoverage).toMatchObject({ covered: 1, total: 1 });
  });

  it('matches a declared singular against a plural definition title', () => {
    // Real case: generator declared "isozyme", titled the definition "Isozymes".
    const h = analyseCourseHealth(withInventory([def('d1', 'Isozymes')], ['isozyme']));
    expect(h.declaredTermCoverage?.missing).toEqual([]);
  });

  it('matches through a parenthetical inserted into the definition title', () => {
    // Real case: declared "concerted model", titled "Concerted (MWC) model".
    const h = analyseCourseHealth(withInventory([def('d1', 'Concerted (MWC) model')], ['concerted model']));
    expect(h.declaredTermCoverage?.missing).toEqual([]);
  });

  it('folds subscripts so a term is not reduced to one letter', () => {
    const h = analyseCourseHealth(withInventory([def('d1', 'v\u2080 (initial velocity)')], ['v\u2080']));
    expect(h.declaredTermCoverage?.missing).toEqual([]);
  });

  it('does not count a substring collision as coverage', () => {
    // "Ki" must not be satisfied by a definition of "kinase" — a false pass
    // here would report coverage the course does not have.
    const h = analyseCourseHealth(withInventory([def('d1', 'kinase')], ['Ki']));
    expect(h.declaredTermCoverage?.missing).toEqual(['Ki']);
  });

  it('reports no coverage figure when the generator declared nothing', () => {
    const h = analyseCourseHealth(course([mcq('q1', 'A?')]));
    expect(h.declaredTermCoverage).toBeNull();
    expect(find(h, 'declared-terms-missing')).toBeUndefined();
  });

  it('flags terms that are defined but never tested', () => {
    const h = analyseCourseHealth(course([def('d1', 'osmosis'), def('d2', 'tonicity'), mcq('q1', 'Define osmosis?')]));
    const f = find(h, 'untested-terms');
    expect(f?.message).toContain('tonicity');
    expect(f?.message).not.toContain('osmosis,');
  });

  it('flags a course where almost nothing can be scored', () => {
    const h = analyseCourseHealth(course([def('d1', 'a'), def('d2', 'b'), def('d3', 'c'), mcq('q1', 'Q?')]));
    expect(find(h, 'low-gradable')?.message).toContain('25%');
  });
});
