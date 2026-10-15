import { describe, it, expect } from 'vitest';
import type { Course, StudyItem } from '@/schema/course';
import { drawTest, scoreTest, testPool } from './practiceTest';

const mcq = (id: string, extra: Record<string, unknown> = {}): StudyItem =>
  ({
    id,
    type: 'mcq',
    question: `${id}?`,
    options: ['a', 'b', 'c', 'd'],
    correct_index: 1,
    explanation: 'because',
    distractor_rationale: ['no a', '', 'no c', 'no d'],
    ...extra,
  }) as StudyItem;

const course = (sections: { id: string; items: StudyItem[] }[], title = 'Lecture'): Course =>
  ({ schema_version: '1.0', metadata: { title }, sections: sections.map((s) => ({ ...s, title: s.id.toUpperCase() })) }) as Course;

describe('testPool', () => {
  it('asks only medium and hard MCQs, counting one with no difficulty as medium', () => {
    const c = course([
      {
        id: 's1',
        items: [
          mcq('easy', { difficulty: 'easy' }),
          mcq('med', { difficulty: 'medium' }),
          mcq('hard', { difficulty: 'hard' }),
          mcq('old'),
          { id: 'f', type: 'flashcard', front: 'f', back: 'b' } as StudyItem,
        ],
      },
    ]);
    expect(testPool([{ courseId: 'c', course: c, covers: 'all' }]).map((q) => q.item.id)).toEqual(['med', 'hard', 'old']);
  });

  it('leaves out set-aside questions and ones whose answer key is broken', () => {
    const c = course([{ id: 's1', items: [mcq('ok'), mcq('aside', { set_aside: true }), mcq('broken', { correct_index: 7 })] }]);
    expect(testPool([{ courseId: 'c', course: c, covers: 'all' }]).map((q) => q.item.id)).toEqual(['ok']);
  });

  it('keeps to the sections an exam covers, across lectures', () => {
    const a = course([{ id: 's1', items: [mcq('a1')] }, { id: 's2', items: [mcq('a2')] }], 'A');
    const b = course([{ id: 's1', items: [mcq('b1')] }], 'B');
    const pool = testPool([
      { courseId: 'a', course: a, covers: ['s2'] },
      { courseId: 'b', course: b, covers: 'all' },
    ]);
    expect(pool.map((q) => `${q.lecture}/${q.item.id}`)).toEqual(['A/a2', 'B/b1']);
  });
});

describe('drawTest and scoreTest', () => {
  const c = course([{ id: 's1', items: [mcq('q1'), mcq('q2')] }, { id: 's2', items: [mcq('q3')] }]);
  const pool = testPool([{ courseId: 'c', course: c, covers: 'all' }]);

  it('draws the asked number, or everything', () => {
    expect(drawTest(pool, 2)).toHaveLength(2);
    expect(drawTest(pool, 10)).toHaveLength(3);
    expect(new Set(drawTest(pool).map((q) => q.item.id))).toEqual(new Set(['q1', 'q2', 'q3']));
  });

  it('scores by section and lists each miss with what was chosen, a blank included', () => {
    const r = scoreTest(pool, [1, 0, null]);
    expect(r).toMatchObject({ got: 1, total: 3 });
    expect(r.bySection.map((s) => [s.section, s.got, s.total])).toEqual([
      ['S1', 1, 2],
      ['S2', 0, 1],
    ]);
    expect(r.missed.map((m) => [m.q.item.id, m.chose])).toEqual([
      ['q2', 0],
      ['q3', null],
    ]);
  });
});
