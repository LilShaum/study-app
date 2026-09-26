import { describe, expect, it } from 'vitest';
import type { Course } from '@/schema/course';
import { buildSessionItems } from './buildSessionItems';
import type { ExamRule } from './exam';

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

  it('asks for each definition’s term in definitions (Terms) mode', () => {
    const items = buildSessionItems(course, 'definitions');
    expect(items.map((i) => i.id)).toEqual(['d1~recall']);
    expect(items[0]).toMatchObject({ type: 'recall', target: { id: 'd1' } });
  });

  it('gives every recall item the whole course’s definitions, as the original objects', () => {
    const [item] = buildSessionItems(course, 'definitions', { sectionId: 's2' });
    if (item.type !== 'recall') throw new Error('expected recall');
    expect(item.target).toBe(course.sections[1].items[0]);
    expect(item.pool).toHaveLength(1);
  });

  it('keeps every item unfiltered for browse', () => {
    expect(buildSessionItems(course, 'browse')).toHaveLength(4);
  });

  it('keeps every item for mixed, a definition asked rather than shown (shuffled, so compare as a set)', () => {
    const items = buildSessionItems(course, 'mixed');
    expect(items.map((i) => i.id).sort()).toEqual(['d1~recall', 'f1', 'f2', 'q1']);
  });

  it('brings a missed recall question back in Review Missed', () => {
    const items = buildSessionItems(course, 'missed', { missedIds: new Set(['d1~recall']) });
    expect(items.map((i) => i.id)).toEqual(['d1~recall']);
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
  it('orders a section definition → example/diagram → flashcard → typed recall → mcq', () => {
    // The typed recall comes after the flashcards so it is not asked the
    // moment the definition has been read.
    const items = buildSessionItems(mixedCourse, 'learn', { sectionId: 'sa' });
    expect(items.map((i) => i.id)).toEqual(['a_def', 'a_eg', 'a_gfx', 'a_card', 'a_def~recall', 'a_mcq']);
  });

  it('finishes one section before starting the next', () => {
    // The failure this pins: sorting across the whole course would put every
    // definition in front of every question, so you would read the entire
    // course before answering anything.
    const items = buildSessionItems(mixedCourse, 'learn');
    expect(items.map((i) => i.id)).toEqual([
      'a_def', 'a_eg', 'a_gfx', 'a_card', 'a_def~recall', 'a_mcq',
      'b_def', 'b_def~recall', 'b_mcq',
    ]);
  });

  it('drops nothing — it reorders, and adds a recall question per definition', () => {
    expect(buildSessionItems(mixedCourse, 'learn')).toHaveLength(9);
  });
});

describe('buildSessionItems — weakest first', () => {
  const at = (got: number, missed: number, lastSeen = 1) => ({ got, missed, lastSeen });

  it('ranks by accuracy, worst first', () => {
    const items = buildSessionItems(mixedCourse, 'weakest', {
      progress: { a_mcq: at(1, 3), b_mcq: at(4, 0), a_card: at(2, 2), 'a_def~recall': at(3, 1), 'b_def~recall': at(0, 1) },
    });
    expect(items.map((i) => i.id)).toEqual(['b_def~recall', 'a_mcq', 'a_card', 'a_def~recall', 'b_mcq']);
  });

  it('keeps an item you get right more often than wrong, unlike Review Missed', () => {
    // 3/5 never appears in Review Missed (missed is not > got) but is exactly
    // the item most likely to cost marks.
    const progress = { a_mcq: at(3, 2), b_mcq: at(5, 0), a_card: at(5, 0), 'a_def~recall': at(5, 0), 'b_def~recall': at(5, 0) };
    expect(buildSessionItems(mixedCourse, 'weakest', { progress })[0].id).toBe('a_mcq');
    expect(buildSessionItems(mixedCourse, 'missed', { missedIds: new Set() })).toHaveLength(0);
  });

  it('sorts never-seen items between what you fail and what you have nailed', () => {
    const items = buildSessionItems(mixedCourse, 'weakest', {
      progress: { a_mcq: at(0, 2), b_mcq: at(3, 0) },
    });
    // a_card and both recall questions have no history at all.
    expect(items.map((i) => i.id)).toEqual(['a_mcq', 'a_card', 'a_def~recall', 'b_def~recall', 'b_mcq']);
  });

  it('serves only gradable items, a definition as its recall question', () => {
    const ids = buildSessionItems(mixedCourse, 'weakest').map((i) => i.id);
    expect(ids.sort()).toEqual(['a_card', 'a_def~recall', 'a_mcq', 'b_def~recall', 'b_mcq']);
  });

  it('is not empty on a course with no history yet', () => {
    expect(buildSessionItems(mixedCourse, 'weakest')).toHaveLength(5);
  });

  it('breaks an accuracy tie with the item missed more times', () => {
    const items = buildSessionItems(mixedCourse, 'weakest', {
      progress: { a_mcq: at(1, 1), b_mcq: at(4, 4), a_card: at(9, 0) },
    });
    // The unseen recall questions also sit at 0.5, but have missed nothing.
    expect(items.map((i) => i.id)).toEqual(['b_mcq', 'a_mcq', 'a_def~recall', 'b_def~recall', 'a_card']);
  });
});

describe('buildSessionItems — review', () => {
  const DAY = 86_400_000;
  const now = 100 * DAY;
  const seen = (daysAgo: number, stability: number) => ({ got: 1, missed: 0, lastSeen: now - daysAgo * DAY, stability });

  it('serves only studied items that have faded, faintest first', () => {
    const items = buildSessionItems(mixedCourse, 'review', {
      now,
      progress: {
        a_mcq: seen(2, 2), // R ≈ 0.37
        a_card: seen(0.1, 5), // fresh
        'b_def~recall': seen(3, 1), // R ≈ 0.05
      },
    });
    expect(items.map((i) => i.id)).toEqual(['b_def~recall', 'a_mcq']);
  });

  it('is empty on a course never studied — new material is Learn’s job', () => {
    expect(buildSessionItems(mixedCourse, 'review', { now, progress: {} })).toHaveLength(0);
  });

  it('brings an item forward for an exam it would be faint at', () => {
    const progress = { a_mcq: seen(0.2, 4) };
    expect(buildSessionItems(mixedCourse, 'review', { now, progress })).toHaveLength(0);
    const exam = { forItem: () => now + 1.3 * DAY } as unknown as ExamRule;
    expect(buildSessionItems(mixedCourse, 'review', { now, progress, exam })).toHaveLength(1);
  });
});

describe('buildSessionItems — terms that were mixed up come back together', () => {
  const terms = {
    schema_version: '1.0',
    metadata: { title: 'T' },
    sections: [
      {
        id: 's1',
        title: 'One',
        order: 1,
        items: [
          { id: 'exo', type: 'definition', term: 'Exocytosis', definition: 'out' },
          { id: 'x', type: 'definition', term: 'X', definition: 'x' },
          { id: 'y', type: 'definition', term: 'Y', definition: 'y' },
        ],
      },
      { id: 's2', title: 'Two', order: 2, items: [{ id: 'endo', type: 'definition', term: 'Endocytosis', definition: 'in' }] },
    ],
  } as unknown as Course;
  const DAY = 86_400_000;
  const now = 50 * DAY;

  it('puts a term straight after the one it was mistaken for, in Terms', () => {
    const progress = { 'exo~recall': { got: 0, missed: 1, lastSeen: now, confusedWith: ['endo'] } };
    const ids = buildSessionItems(terms, 'definitions', { progress }).map((i) => i.id);
    expect(ids).toEqual(['exo~recall', 'endo~recall', 'x~recall', 'y~recall']);
  });

  it('brings the partner into Review even when it is not due itself', () => {
    const progress = {
      'exo~recall': { got: 0, missed: 1, lastSeen: now - 3 * DAY, stability: 0.5, confusedWith: ['endo'] },
    };
    const ids = buildSessionItems(terms, 'review', { progress, now }).map((i) => i.id);
    expect(ids).toEqual(['exo~recall', 'endo~recall']);
  });
});

describe('buildSessionItems — a question answered right comes back typed', () => {
  const qc = {
    schema_version: '1.0',
    metadata: { title: 'T' },
    sections: [
      {
        id: 's1',
        title: 'One',
        order: 1,
        items: [
          { id: 'pla2', type: 'definition', term: 'Phospholipase A2', definition: 'releases arachidonic acid' },
          { id: 'q1', type: 'mcq', question: 'Which enzyme releases arachidonic acid?', options: ['Phospholipase C', 'Phospholipase A2', 'COX', 'PKC'], correct_index: 1, explanation: 'PLA2 does.' },
          { id: 'q2', type: 'mcq', question: 'Which of these is an enzyme?', options: ['Phospholipase A2', 'b', 'c', 'd'], correct_index: 0 },
          { id: 'q3', type: 'mcq', question: 'Which enzyme is it?', options: ['Not a term', 'b', 'c', 'd'], correct_index: 0 },
        ],
      },
    ],
  } as unknown as Course;
  const right = { got: 1, missed: 0, lastSeen: 1 };

  it('asks it without its options once it has been answered right', () => {
    const [q1] = buildSessionItems(qc, 'quiz', { progress: { q1: right } });
    expect(q1).toMatchObject({ id: 'q1', type: 'recall', question: 'Which enzyme releases arachidonic acid?', answer: 'Phospholipase A2' });
  });

  it('keeps it multiple choice until then', () => {
    expect(buildSessionItems(qc, 'quiz', { progress: {} })[0].type).toBe('mcq');
  });

  it('leaves questions that need their options, or whose answer is not a course term', () => {
    const items = buildSessionItems(qc, 'quiz', { progress: { q1: right, q2: right, q3: right } });
    expect(items.map((i) => i.type)).toEqual(['recall', 'mcq', 'mcq']);
  });
});

describe('buildSessionItems — a review sitting has a size', () => {
  it('serves the most urgent, up to one sitting', async () => {
    const { REVIEW_SITTING } = await import('./buildSessionItems');
    const items = Array.from({ length: REVIEW_SITTING + 20 }, (_, i) => ({ id: `q${i}`, type: 'flashcard', front: 'f', back: 'b' }));
    const big = { schema_version: '1.0', metadata: { title: 'T' }, sections: [{ id: 's', title: 'S', order: 1, items }] } as unknown as Course;
    const DAY = 86_400_000;
    const now = 100 * DAY;
    const progress = Object.fromEntries(items.map((it, i) => [it.id, { got: 1, missed: 0, lastSeen: now - (1 + i / 10) * DAY, stability: 1 }]));
    const served = buildSessionItems(big, 'review', { progress, now });
    expect(served).toHaveLength(REVIEW_SITTING);
    // Faintest first: the longest-unseen items lead.
    expect(served[0].id).toBe(`q${REVIEW_SITTING + 19}`);
  });
});
