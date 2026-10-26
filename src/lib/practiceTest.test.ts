import { describe, it, expect } from 'vitest';
import type { Course, StudyItem } from '@/schema/course';
import { DONT_KNOW, drawTest, lecturesIn, scoreTest, testPool } from './practiceTest';

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

describe('a test over several lectures', () => {
  const big = course([{ id: 's1', items: Array.from({ length: 30 }, (_, i) => mcq(`b${i}`)) }], 'Big');
  const small = course([{ id: 's1', items: Array.from({ length: 4 }, (_, i) => mcq(`s${i}`)) }], 'Small');
  const mid = course([{ id: 's1', items: Array.from({ length: 10 }, (_, i) => mcq(`m${i}`)) }], 'Mid');
  const pool = testPool([
    { courseId: 'big', course: big, covers: 'all' },
    { courseId: 'small', course: small, covers: 'all' },
    { courseId: 'mid', course: mid, covers: 'all' },
  ]);
  const share = (test: ReturnType<typeof drawTest>) =>
    Object.fromEntries(['big', 'small', 'mid'].map((id) => [id, test.filter((q) => q.courseId === id).length]));

  it('shares an even draw equally, and a short lecture gives what it lacks to the others', () => {
    expect(lecturesIn(pool)).toBe(3);
    const even = drawTest(pool, 12, true);
    expect(even).toHaveLength(12);
    expect(share(even)).toEqual({ big: 4, small: 4, mid: 4 });
    const more = drawTest(pool, 20, true);
    expect(share(more)).toEqual({ big: 8, small: 4, mid: 8 });
    expect(new Set(more.map((q) => q.item.id)).size).toBe(20);
  });

  it('keeps only the cards a studies choice names', () => {
    const only = new Set(['b1', 'b2']);
    expect(testPool([{ courseId: 'big', course: big, covers: 'all', only }]).map((q) => q.item.id)).toEqual(['b1', 'b2']);
  });
});

describe('written questions', () => {
  const written = (id: string, extra: Record<string, unknown> = {}): StudyItem =>
    ({ id, type: 'flashcard', front: `${id}?`, back: '(1) One. (2) Two. (3) Three.', ...extra }) as StudyItem;

  it('asks medium and hard short answers, never a plain or an easy flashcard', () => {
    const c = course([
      {
        id: 's1',
        items: [
          written('sa'),
          written('tagged', { back: 'Plate tectonics.', tags: ['short-answer'], difficulty: 'hard' }),
          written('easy', { difficulty: 'easy' }),
          { id: 'plain', type: 'flashcard', front: 'f', back: 'b' } as StudyItem,
          mcq('m'),
        ],
      },
    ]);
    expect(testPool([{ courseId: 'c', course: c, covers: 'all' }]).map((q) => q.item.id)).toEqual(['sa', 'tagged', 'm']);
  });

  it('counts a written answer right only with every point ticked', () => {
    const c = course([{ id: 's1', items: [written('a'), written('b'), written('c')] }]);
    const pool = testPool([{ courseId: 'c', course: c, covers: 'all' }]);
    const r = scoreTest(pool, ['all three', 'two of them', 'not marked'], [[true, true, true], [true, false, true], null]);
    expect(r.got).toBe(1);
    expect(r.missed.map((m) => [m.q.item.id, m.ticks])).toEqual([
      ['b', [true, false, true]],
      ['c', []],
    ]);
  });
});

describe('I don’t know in a test', () => {
  it('is a miss, unlike a blank', () => {
    const c = course([{ id: 's1', items: [mcq('a'), mcq('b')] }]);
    const pool = testPool([{ courseId: 'c', course: c, covers: 'all' }]);
    const r = scoreTest(pool, [DONT_KNOW, null]);
    expect(r.got).toBe(0);
    expect(r.missed.map((m) => m.chose)).toEqual([DONT_KNOW, null]);
  });
});

describe('drawTest: what has not been on a test first', () => {
  const pool = testPool([{ courseId: 'c', course: course([{ id: 's1', items: Array.from({ length: 30 }, (_, n) => mcq(`q${n}`)) }]), covers: 'all' }]);
  const ids = (t: { item: { id: string } }[]) => t.map((q) => q.item.id);

  it('asks first the questions never on a test, then those on one longest ago', () => {
    // Twenty of thirty on a test, at times 1 to 20.
    const at = new Map(Array.from({ length: 20 }, (_, n) => [`q${n}`, n + 1]));
    const test = drawTest(pool, 20, false, (q) => at.get(q.item.id));
    const untested = pool.filter((q) => !at.has(q.item.id)).map((q) => q.item.id);
    expect(ids(test)).toEqual(expect.arrayContaining(untested));
    // The other ten are those tested longest ago, q0 to q9.
    expect(ids(test).filter((id) => at.has(id)).sort()).toEqual(['q0', 'q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9'].sort());
  });

  it('mixes the fresh questions in rather than asking them all first', () => {
    const at = new Map(Array.from({ length: 20 }, (_, n) => [`q${n}`, n + 1]));
    const orders = new Set(Array.from({ length: 5 }, () => ids(drawTest(pool, 20, false, (q) => at.get(q.item.id))).slice(0, 10).join()));
    expect(orders.size).toBeGreaterThan(1);
    const first = ids(drawTest(pool, 20, false, (q) => at.get(q.item.id))).slice(0, 10);
    expect(first.some((id) => at.has(id))).toBe(true);
  });
});
