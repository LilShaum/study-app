import { describe, expect, it } from 'vitest';
import type { Course } from '@/schema/course';
import { buildSessionItems } from './buildSessionItems';
import { scoredEntries } from './scored';
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
  it('orders a section definition → example/diagram → typed recall → flashcard → mcq', () => {
    // Everything is read first, then asked in the order it was read, so each
    // ask is as far from its reading as the step allows. A flashcard never
    // answered is shown open first, then asked.
    const items = buildSessionItems(mixedCourse, 'learn', { sectionId: 'sa' });
    expect(items.map((i) => i.id)).toEqual(['a_def', 'a_eg', 'a_gfx', 'a_def~recall', 'a_card', 'a_mcq']);
  });

  it('never shows a flashcard open before asking it', () => {
    expect(buildSessionItems(mixedCourse, 'learn').some((i) => i.type === 'preview')).toBe(false);
  });

  it('finishes one section before starting the next', () => {
    // The failure this pins: sorting across the whole course would put every
    // definition in front of every question, so you would read the entire
    // course before answering anything.
    const items = buildSessionItems(mixedCourse, 'learn');
    expect(items.map((i) => i.id)).toEqual([
      'a_def', 'a_eg', 'a_gfx', 'a_def~recall', 'a_card', 'a_mcq',
      'b_def', 'b_def~recall', 'b_mcq',
    ]);
  });

  it('drops nothing — it reorders, and adds a recall question per definition', () => {
    expect(buildSessionItems(mixedCourse, 'learn')).toHaveLength(9);
  });
});

describe('buildSessionItems — weakest first', () => {
  const DAY = 86_400_000;
  const now = 100 * DAY;
  // An item last answered `daysAgo` days ago, holding for `stability` days.
  const at = (daysAgo: number, stability: number, got = 1, missed = 0) => ({ got, missed, lastSeen: now - daysAgo * DAY, stability });

  it('ranks by how likely you are to recall it now, faintest first', () => {
    const items = buildSessionItems(mixedCourse, 'weakest', {
      now,
      progress: { a_mcq: at(10, 2), b_mcq: at(1, 30), a_card: at(3, 3), 'a_def~recall': at(1, 5), 'b_def~recall': at(20, 2) },
    });
    expect(items.map((i) => i.id)).toEqual(['b_def~recall', 'a_mcq', 'a_card', 'a_def~recall', 'b_mcq']);
  });

  it('puts a faded item ahead of a fresh one, whatever their records', () => {
    // Right five times, but a month ago on a short memory: mostly forgotten.
    const progress = { a_mcq: at(30, 4, 5, 0), b_mcq: at(0.1, 1, 1, 3) };
    const ids = buildSessionItems(mixedCourse, 'weakest', { now, progress }).map((i) => i.id);
    expect(ids.indexOf('a_mcq')).toBeLessThan(ids.indexOf('b_mcq'));
  });

  it('sorts never-seen items between what you have forgotten and what you know', () => {
    const items = buildSessionItems(mixedCourse, 'weakest', {
      now,
      progress: { a_mcq: at(20, 2), b_mcq: at(0.5, 30) },
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

  it('breaks a tie with the item missed more times', () => {
    const items = buildSessionItems(mixedCourse, 'weakest', {
      now,
      progress: { a_mcq: at(2, 2, 1, 1), b_mcq: at(2, 2, 4, 4), a_card: at(0.1, 50) },
    });
    expect(items.map((i) => i.id).slice(0, 2)).toEqual(['b_mcq', 'a_mcq']);
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
          { id: 'pla2', type: 'definition', term: 'Phospholipase A2', definition: 'The lipase that starts eicosanoid synthesis at the membrane.' },
          { id: 'q1', type: 'mcq', question: 'Which tissue moves water from the roots to the leaves?', options: ['Phloem', 'Phospholipase A2', 'Cortex', 'Epidermis'], correct_index: 1, explanation: 'It does.' },
          { id: 'q2', type: 'mcq', question: 'Which of these is an enzyme?', options: ['Phospholipase A2', 'b', 'c', 'd'], correct_index: 0 },
          { id: 'q3', type: 'mcq', question: 'Which enzyme is it?', options: ['Not a term', 'b', 'c', 'd'], correct_index: 0 },
        ],
      },
    ],
  } as unknown as Course;
  const right = { got: 1, missed: 0, lastSeen: 1 };

  it('asks it without its options once it has been answered right', () => {
    const [q1] = buildSessionItems(qc, 'quiz', { progress: { q1: right } });
    expect(q1).toMatchObject({ id: 'q1', type: 'recall', question: 'Which tissue moves water from the roots to the leaves?', answer: 'Phospholipase A2' });
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
  const DAY = 86_400_000;
  const now = 100 * DAY;
  const items = Array.from({ length: 200 }, (_, i) => ({ id: `q${i}`, type: 'flashcard', front: 'f', back: 'b' }));
  const big = { schema_version: '1.0', metadata: { title: 'T' }, sections: [{ id: 's', title: 'S', order: 1, items }] } as unknown as Course;
  const progress = Object.fromEntries(items.map((it, i) => [it.id, { got: 1, missed: 0, lastSeen: now - (1 + i / 10) * DAY, stability: 1 }]));

  it('fits the minutes a day, most urgent first', () => {
    // Flashcards take 12 s by default: 10 minutes is 50 of them.
    const served = buildSessionItems(big, 'review', { progress, now, minutes: 10 });
    expect(served).toHaveLength(50);
    expect(served[0].id).toBe('q199');
  });

  it('uses the pace measured on this device', () => {
    expect(buildSessionItems(big, 'review', { progress, now, minutes: 10, pace: { flashcard: 30 } })).toHaveLength(20);
  });

  it('serves at least one card however short the sitting', () => {
    expect(buildSessionItems(big, 'review', { progress, now, minutes: 0.01 })).toHaveLength(1);
  });
});

describe('buildSessionItems — today', () => {
  const DAY_MS = 86_400_000;
  const now = new Date(2026, 9, 1, 19).getTime();
  const def = (s: string, n: number) => ({ id: `${s}d${n}`, type: 'definition', term: `Term ${s} ${n}`, definition: `meaning ${n}` });
  const q = (s: string, n: number) => ({
    id: `${s}q${n}`,
    type: 'mcq',
    question: `About Term ${s} ${n}?`,
    options: ['a', 'b', 'c', 'd'],
    correct_index: 0,
    explanation: 'x',
  });
  const course = {
    schema_version: '1.0',
    metadata: { title: 'T' },
    sections: ['a', 'b'].map((s) => ({
      id: s,
      title: s.toUpperCase(),
      items: [...[0, 1, 2, 3, 4, 5, 6, 7].map((n) => def(s, n)), ...[0, 1, 2, 3, 4, 5, 6, 7].map((n) => q(s, n))],
    })),
  } as unknown as Course;
  const old = { got: 1, missed: 0, lastSeen: now - 30 * DAY_MS, stability: 2 };

  it('opens with what is due, then teaches, in whole steps', () => {
    const progress = { aq0: old, aq1: old };
    const items = buildSessionItems(course, 'today', { now, progress, minutes: 30 });
    expect(items.slice(0, 2).map((i) => i._block)).toEqual(['review', 'review']);
    const learn = items.slice(2);
    expect(learn.length).toBeGreaterThan(0);
    // Ends where a step ends.
    const last = learn.at(-1)!;
    expect(learn.filter((i) => i._block === last._block).length).toBe(
      buildSessionItems(course, 'learn', { progress, sectionId: last._sectionId }).filter((i) => i._block === last._block).length,
    );
  });

  it('carries on after the steps already done', () => {
    const done = Object.fromEntries(['a0', 'a1', 'a2', 'a3'].flatMap((k) => [[`${k.replace(/(\d)/, 'd$1')}~recall`, { ...old, lastSeen: now }], [k.replace(/(\d)/, 'q$1'), { ...old, lastSeen: now }]]));
    const items = buildSessionItems(course, 'today', { now, progress: done, minutes: 10 });
    expect(items[0]._step).toBe(1);
    expect(items[0]._sectionId).toBe('a');
  });

  it('fits roughly the minutes asked for', () => {
    const short = buildSessionItems(course, 'today', { now, progress: {}, minutes: 5 });
    const long = buildSessionItems(course, 'today', { now, progress: {}, minutes: 60 });
    expect(long.length).toBeGreaterThan(short.length);
  });
});

describe('buildSessionItems — today, when the next step does not fit', () => {
  const DAY_MS = 86_400_000;
  const now = new Date(2026, 9, 1, 19).getTime();
  const course = {
    schema_version: '1.0',
    metadata: { title: 'T' },
    sections: [
      {
        id: 'a',
        title: 'A',
        items: [
          ...[0, 1, 2, 3].map((n) => ({ id: `ad${n}`, type: 'definition', term: `Term A ${n}`, definition: `meaning ${n}` })),
          ...[0, 1, 2, 3].map((n) => ({ id: `aq${n}`, type: 'mcq', question: `About Term A ${n}?`, options: ['a', 'b', 'c', 'd'], correct_index: 0, explanation: 'x' })),
        ],
      },
      { id: 'b', title: 'B', items: [{ id: 'bf0', type: 'flashcard', front: 'f', back: 'b' }] },
    ],
  } as unknown as Course;

  it('stops rather than jumping ahead to a later section', () => {
    // One card due from A, and a sitting too short for A's next step.
    const progress = { aq0: { got: 1, missed: 0, lastSeen: now - 30 * DAY_MS, stability: 2 } };
    const items = buildSessionItems(course, 'today', { now, progress, minutes: 3 });
    expect(items[0]).toMatchObject({ id: 'aq0', _block: 'review' });
    expect(items.filter((i) => i._sectionId === 'b')).toEqual([]);
  });
});

describe('buildSessionItems — today, a mixed-up partner joins the review', () => {
  const DAY_MS = 86_400_000;
  const now = new Date(2026, 9, 1, 19).getTime();
  const course = {
    schema_version: '1.0',
    metadata: { title: 'T' },
    sections: [
      {
        id: 'a',
        title: 'A',
        items: [
          { id: 'exo', type: 'definition', term: 'Exocytosis', definition: 'out' },
          { id: 'endo', type: 'definition', term: 'Endocytosis', definition: 'in' },
        ],
      },
    ],
  } as unknown as Course;

  it('is marked as part of the review, like the card it follows', () => {
    const progress = { 'exo~recall': { got: 0, missed: 1, lastSeen: now - 3 * DAY_MS, stability: 0.5, confusedWith: ['endo'] } };
    const items = buildSessionItems(course, 'today', { now, progress, minutes: 30 });
    expect(items.slice(0, 2).map((i) => [i.id, i._block])).toEqual([
      ['exo~recall', 'review'],
      ['endo~recall', 'review'],
    ]);
  });
});

describe('fitMinutes', () => {
  it('keeps a card that fits exactly, despite float rounding', async () => {
    const { fitMinutes } = await import('./buildSessionItems');
    const cards = Array.from({ length: 10 }, () => ({ type: 'x' }));
    // 123 s at 41 s a card: three fit exactly.
    expect(fitMinutes(cards, 123 / 60, { x: 41 })).toHaveLength(3);
  });
});

describe('buildSessionItems — a review sitting has a ceiling', () => {
  const DAY = 86_400_000;
  const now = 100 * DAY;
  const items = Array.from({ length: 300 }, (_, i) => ({ id: `q${i}`, type: 'flashcard', front: 'f', back: 'b' }));
  const big = { schema_version: '1.0', metadata: { title: 'T' }, sections: [{ id: 's', title: 'S', order: 1, items }] } as unknown as Course;
  const progress = Object.fromEntries(items.map((it) => [it.id, { got: 1, missed: 0, lastSeen: now - 3 * DAY, stability: 1 }]));

  it('holds at most REVIEW_MAX however long the minutes', async () => {
    const { REVIEW_MAX } = await import('./buildSessionItems');
    expect(buildSessionItems(big, 'review', { progress, now, minutes: 90 })).toHaveLength(REVIEW_MAX);
  });

  it('counts everything due when asked with unlimited minutes', () => {
    expect(buildSessionItems(big, 'review', { progress, now, minutes: Infinity })).toHaveLength(300);
  });
});

describe('buildSessionItems — kind', () => {
  const DAY = 86_400_000;
  const now = 100 * DAY;
  const at = (daysAgo: number) => ({ got: 1, missed: 0, lastSeen: now - daysAgo * DAY, stability: 2 });
  const progress = { a_mcq: at(10), b_mcq: at(10), a_card: at(10), 'a_def~recall': at(10), 'b_def~recall': at(10) };
  const ids = (mode: 'weakest' | 'review' | 'missed', kind?: 'questions' | 'flashcards' | 'terms') =>
    buildSessionItems(mixedCourse, mode, {
      now,
      progress,
      minutes: Infinity,
      kind,
      missedIds: new Set(['a_mcq', 'a_card', 'a_def~recall', 'b_mcq']),
    })
      .map((i) => i.id)
      .sort();

  it('keeps only questions in weakest, review and missed', () => {
    expect(ids('weakest', 'questions')).toEqual(['a_mcq', 'b_mcq']);
    expect(ids('review', 'questions')).toEqual(['a_mcq', 'b_mcq']);
    expect(ids('missed', 'questions')).toEqual(['a_mcq', 'b_mcq']);
  });

  it('keeps only flashcards', () => {
    expect(ids('weakest', 'flashcards')).toEqual(['a_card']);
    expect(ids('review', 'flashcards')).toEqual(['a_card']);
    expect(ids('missed', 'flashcards')).toEqual(['a_card']);
  });

  it('keeps only terms, asked as typed recall', () => {
    expect(ids('weakest', 'terms')).toEqual(['a_def~recall', 'b_def~recall']);
    expect(ids('review', 'terms')).toEqual(['a_def~recall', 'b_def~recall']);
    expect(ids('missed', 'terms')).toEqual(['a_def~recall']);
  });

  it('serves every kind when none is chosen', () => {
    expect(ids('weakest')).toHaveLength(5);
    expect(ids('review')).toHaveLength(5);
  });

  it('ignores the kind in the modes that are already one kind', () => {
    const quiz = buildSessionItems(mixedCourse, 'quiz', { kind: 'flashcards' });
    expect(quiz.map((i) => i.id)).toEqual(['a_mcq', 'b_mcq']);
  });
});

describe('Learn with the student\'s own slides', () => {
  const withRange = {
    ...mixedCourse,
    sections: mixedCourse.sections.map((s) => (s.id === 'sa' ? { ...s, source_range: 'slides 12–18' } : s)),
  } as Course;

  it('opens a section that says where it is in the slides with that, in its first step', () => {
    const items = buildSessionItems(withRange, 'learn', { sectionId: 'sa' });
    expect(items[0]).toMatchObject({ id: 'sa~slides', type: 'slides', range: 'slides 12–18', _step: 0 });
    expect(items[0]._block).toBe(items[1]._block);
  });

  it('leaves it out of sections without a range, and once the first step is done', () => {
    expect(buildSessionItems(withRange, 'learn', { sectionId: 'sb' }).some((i) => i.type === 'slides')).toBe(false);
    const asks = buildSessionItems(withRange, 'learn', { sectionId: 'sa' }).filter((i) => i.type === 'mcq' || i.type === 'flashcard' || i.type === 'recall');
    const progress = Object.fromEntries(asks.map((i) => [i.id, { got: 1, missed: 0, lastSeen: 1 }]));
    const again = buildSessionItems(withRange, 'learn', { sectionId: 'sa', progress: progress as never });
    // Every step done: Learn is the whole section again, slides card first.
    expect(again[0].type).toBe('slides');
  });

  it('starts Today\'s new material with it too', () => {
    const items = buildSessionItems(withRange, 'today', { minutes: 60 });
    expect(items.find((i) => i._block !== 'review')?.type).toBe('slides');
  });
});

describe('Learn, questions first', () => {
  it('drops the cards that give answers, and keeps what is asked and the worked material', () => {
    const items = buildSessionItems(mixedCourse, 'learn', { sectionId: 'sa', questionsFirst: true });
    expect(items.map((i) => i.id)).toEqual(['a_eg', 'a_gfx', 'a_def~recall', 'a_card', 'a_mcq']);
  });

  it('leaves out the slides card too: there is no reading to ask for', () => {
    const withRange = {
      ...mixedCourse,
      sections: mixedCourse.sections.map((s) => ({ ...s, source_range: 'slides 1–3' })),
    } as Course;
    expect(buildSessionItems(withRange, 'learn', { questionsFirst: true }).some((i) => i.type === 'slides')).toBe(false);
  });

  it('applies to the new material in Today as well', () => {
    const items = buildSessionItems(mixedCourse, 'today', { minutes: 60, questionsFirst: true });
    expect(items.some((i) => i.type === 'definition' || i.type === 'preview')).toBe(false);
    expect(items.some((i) => i.type === 'recall')).toBe(true);
  });
});

describe('set aside', () => {
  const aside = {
    ...mixedCourse,
    sections: mixedCourse.sections.map((s) => ({
      ...s,
      items: s.items.map((i) => (i.id === 'a_mcq' || i.id === 'a_def' ? { ...i, set_aside: { reason: 'not-needed', at: 1 } } : i)),
    })),
  } as Course;

  it('leaves every session but Browse', () => {
    for (const mode of ['learn', 'quiz', 'mixed', 'definitions', 'weakest'] as const) {
      const ids = buildSessionItems(aside, mode).map((i) => i.id);
      expect(ids).not.toContain('a_mcq');
      expect(ids).not.toContain('a_def');
      expect(ids).not.toContain('a_def~recall');
    }
    expect(buildSessionItems(aside, 'browse').map((i) => i.id)).toContain('a_mcq');
  });

  it('leaves every count', () => {
    const ids = aside.sections.flatMap((s) => scoredEntries(s.items).map((e) => e.id));
    expect(ids).not.toContain('a_mcq');
    expect(ids).not.toContain('a_def~recall');
    expect(ids).toContain('a_card');
  });
});

describe('buildSessionItems — an MCQ asked again typed', () => {
  const c = {
    schema_version: '1.0',
    metadata: { title: 'T' },
    sections: [
      {
        id: 's',
        title: 'S',
        items: [
          { id: 'd', type: 'definition', term: 'Transpiration pull', definition: 'The upward pull on water created as it evaporates from the leaves.' },
          { id: 'g', type: 'definition', term: 'Gluconeogenesis', definition: 'Making new glucose in the liver from non-carbohydrate sources.' },
          { id: 'q1', type: 'mcq', question: 'Water evaporating from the leaves creates an upward pull on it. What is this called?', options: ['Transpiration pull', 'b', 'c', 'd'], correct_index: 0 },
          { id: 'q2', type: 'mcq', question: 'A liver cell runs glycolysis in reverse to make new glucose. What is this process?', options: ['Gluconeogenesis', 'b', 'c', 'd'], correct_index: 0 },
          { id: 'q3', type: 'mcq', question: 'Which process does glucagon switch on in the liver during a fast?', options: ['Gluconeogenesis', 'b', 'c', 'd'], correct_index: 0 },
        ],
      },
    ],
  } as unknown as Course;
  const progress = { q1: { got: 1, missed: 0, lastSeen: 1 }, q2: { got: 1, missed: 0, lastSeen: 1 }, q3: { got: 1, missed: 0, lastSeen: 1 } };

  it('stays multiple choice when typed it would be the definition again or would spell its answer', () => {
    const items = buildSessionItems(c, 'quiz', { progress });
    expect(items.find((i) => i.id === 'q1')?.type).toBe('mcq');
    expect(items.find((i) => i.id === 'q2')?.type).toBe('mcq');
    expect(items.find((i) => i.id === 'q3')?.type).toBe('recall');
  });
});

describe('buildSessionItems — Today never asks a reviewed card again as new', () => {
  const DAY = 86_400_000;
  const terms = ['Homeostasis', 'Feedback loop', 'Effector', 'Sensor', 'Negative feedback', 'Positive feedback'];
  const c = {
    schema_version: '1.0',
    metadata: { title: 'T' },
    sections: [
      {
        id: 's',
        title: 'Regulation',
        items: [
          ...terms.map((t, k) => ({ id: `d${k}`, type: 'definition', term: t, definition: `meaning number ${k} of the thing` })),
          { id: 'q', type: 'mcq', question: 'What does Negative feedback do to a disturbance?', options: ['Opposes it', 'b', 'c', 'd'], correct_index: 0 },
        ],
      },
    ],
  } as unknown as Course;

  it('leaves answered cards to the review part, and serves only what is new', () => {
    const now = 40 * DAY;
    // Every typed term answered days ago (now due); the question never.
    const progress = Object.fromEntries(terms.map((_, k) => [`d${k}~recall`, { got: 1, missed: 0, lastSeen: now - 5 * DAY, stability: 1 }]));
    const items = buildSessionItems(c, 'today', { now, minutes: 30, progress });
    const learn = items.filter((i) => i._block !== 'review');
    expect(items.filter((i) => i._block === 'review').length).toBeGreaterThan(0);
    expect(learn.filter((i) => i.type === 'recall' || i.type === 'definition')).toEqual([]);
    expect(learn.map((i) => i.id)).toContain('q');
  });
});
