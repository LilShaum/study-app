import { describe, expect, it } from 'vitest';
import type { Course, StudyItem } from '@/schema/course';
import { buildSessionItems, recallId, type SessionItem } from './buildSessionItems';
import { phaseOf, STEP_CARDS, STEP_TERMS, TERM_BUDGET } from './learnSteps';

const TERMS = ['Adenylyl cyclase', 'Gs protein', 'Protein kinase A', 'Phosphodiesterase', 'Calmodulin', 'Inositol trisphosphate', 'Diacylglycerol', 'Protein kinase C'];

const def = (n: number): StudyItem =>
  ({ id: `d${n}`, type: 'definition', term: TERMS[n], definition: `meaning of the thing number ${n}` }) as StudyItem;
const mcq = (id: string, question: string): StudyItem =>
  ({ id, type: 'mcq', question, options: [`Choice ${id.toUpperCase()}`, 'x', 'y', 'z'], correct_index: 0, explanation: 'because' }) as StudyItem;
const card = (id: string, front: string): StudyItem => ({ id, type: 'flashcard', front, back: `${id} answer` }) as StudyItem;

function course(items: StudyItem[]): Course {
  return { schema_version: '1.0', metadata: { title: 'T' }, sections: [{ id: 's', title: 'S', items }] } as Course;
}

const defs = TERMS.map((_, n) => def(n));
const learn = (items: StudyItem[], progress = {}) => buildSessionItems(course(items), 'learn', { progress });
const stepOf = (items: SessionItem[], id: string) => items.find((i) => i.id === id)?._step;
/** Learn over two sittings: the first, then the second look it held back (SessionItem._second). */
const whole = (items: StudyItem[]) => {
  const first = learn(items);
  const answered = Object.fromEntries(first.filter((i) => phaseOf(i.type) !== 'read').map((i) => [i.id, { got: 1, missed: 0, lastSeen: 1 }]));
  return [...first, ...learn(items, answered).filter((i) => i._second)];
};

describe('Learn in steps', () => {
  it(`teaches ${STEP_TERMS} terms a step`, () => {
    const items = learn(defs);
    expect(items[0]._steps).toBe(2);
    expect(items.filter((i) => i.type === 'definition' && i._step === 0)).toHaveLength(4);
  });

  it('reads, then recalls, then applies, inside every step', () => {
    const items = learn([...defs, mcq('q1', 'What does Calmodulin bind?'), card('f1', 'Where is Gs protein?')]);
    for (const step of [0, 1]) {
      const phases = items.filter((i) => i._step === step).map((i) => phaseOf(i.type));
      const rank = { read: 0, recall: 1, apply: 2 } as const;
      expect(phases.map((p) => rank[p!])).toEqual([...phases.map((p) => rank[p!])].sort());
    }
  });

  it('puts a question in the step whose terms it uses', () => {
    const items = learn([...defs, mcq('early', 'What does Gs protein switch on?'), mcq('late', 'What does Calmodulin bind?')]);
    expect(stepOf(items, 'early')).toBe(0);
    expect(stepOf(items, 'late')).toBe(1);
  });

  it('holds a question back until every term it uses has been taught', () => {
    const items = learn([...defs, mcq('both', 'How does Gs protein differ from Diacylglycerol?')]);
    expect(stepOf(items, 'both')).toBe(1);
  });

  it('knows a term by its abbreviation', () => {
    const withAbbr = [...defs.slice(0, 7), { ...def(7), term: 'Protein kinase C (PKC)' } as StudyItem];
    const items = learn([...withAbbr, mcq('abbr', 'What activates PKC?')]);
    expect(stepOf(items, 'abbr')).toBe(1);
  });

  it('does not let the section’s own subject pull every question into one step', () => {
    // "Protein" is in three terms and every question; "Protein kinase C" is in
    // step 2. Without the generic rule all four questions would land there.
    const qs = [
      mcq('a', 'Which protein does Gs protein activate?'),
      mcq('b', 'Which protein does Adenylyl cyclase make cAMP for?'),
      mcq('c', 'Which protein is Phosphodiesterase?'),
      mcq('e', 'Which protein is Protein kinase A?'),
      mcq('f', 'Which protein binds Calmodulin?'),
    ];
    const items = learn([...defs.slice(0, 7), { ...def(7), term: 'Protein' } as StudyItem, ...qs]);
    expect(stepOf(items, 'a')).toBe(0);
    expect(stepOf(items, 'b')).toBe(0);
  });

  it('asks for a term a few cards after reading it, not straight after', () => {
    const items = learn(defs.slice(0, 4));
    const lastRead = items.filter((i) => i.type === 'definition').at(-1)!;
    const firstRecall = items.find((i) => i.type === 'recall')!;
    expect(firstRecall.id).not.toBe(recallId(lastRead.id));
    // Every term is asked in the step it was taught in.
    for (const d of defs.slice(0, 4)) expect(stepOf(items, recallId(d.id))).toBe(stepOf(items, d.id));
  });

  it('asks in the order it read, so no term is asked straight after its reading', () => {
    const items = learn(defs.slice(0, 4));
    const read = items.filter((i) => i.type === 'definition').map((i) => i.id);
    const asked = items.filter((i) => i.type === 'recall').map((i) => (i as { target: { id: string } }).target.id);
    expect(asked).toEqual(read);
  });

  it('never re-teaches or re-asks a term already answered: that is Review\'s, on its schedule', () => {
    // The owner, 2026-10-13: 12 of 12 on feedback loops in Review, then
    // "new" material that asked negative feedback again.
    const progress = { [recallId('d0')]: { got: 1, missed: 0, lastSeen: 0 } };
    const items = learn(defs, progress);
    expect(items.some((i) => i.id === 'd0')).toBe(false);
    expect(items.some((i) => i.id === recallId('d0'))).toBe(false);
    // The step's other terms are still taught.
    expect(items.some((i) => i.id === recallId('d1'))).toBe(true);
  });

  it('places an item that names no term by the passage it quotes', () => {
    const passage = 'Diacylglycerol stays in the membrane while its partner diffuses away, recruiting the kinase there.';
    const withExcerpts = defs.map((d, n) => ({ ...d, source_excerpt: n === 6 ? passage : `A passage about thing number ${n} alone.` }) as StudyItem);
    const quoting = { ...card('f', 'What does the alpha subunit do after the exchange?'), source_excerpt: passage } as StudyItem;
    const items = learn([...withExcerpts, quoting]);
    expect(stepOf(items, 'f')).toBe(stepOf(items, 'd6'));
  });

  it('puts what matches no term and no passage in a last step of its own, never an earlier one', () => {
    const qs = Array.from({ length: 6 }, (_, n) => mcq(`u${n}`, `Unrelated question ${n}?`));
    const items = learn([...defs, ...qs]);
    const last = items[0]._steps! - 1;
    expect(last).toBe(2);
    expect(qs.map((q) => stepOf(items, q.id))).toEqual(qs.map(() => last));
    expect(items.filter((i) => i._step === last).every((i) => i.type === 'mcq')).toBe(true);
  });

  it('cuts a section with no terms by count', () => {
    const qs = Array.from({ length: 25 }, (_, n) => mcq(`u${n}`, `Question ${n}?`));
    const items = learn(qs);
    expect(items[0]._steps).toBe(3);
  });

  it('marks each card with the step it sits in', () => {
    const items = learn(defs);
    expect(new Set(items.map((i) => i._block))).toEqual(new Set(['s#0', 's#1']));
  });

  it(`keeps a step to ${STEP_CARDS} cards, with fewer terms a step when there is a lot to ask`, () => {
    // Four questions on each term: 8 terms would be 2 steps of 4 terms and
    // 4 + 4 + 16 = 24 cards each.
    const qs = TERMS.flatMap((t, n) => [0, 1, 2, 3].map((k) => mcq(`q${n}-${k}`, `Question ${k} about ${t}?`)));
    const items = whole([...defs, ...qs]);
    const steps = items[0]._steps!;
    expect(steps).toBeGreaterThan(2);
    for (let s = 0; s < steps; s++) expect(items.filter((i) => i._step === s).length).toBeLessThanOrEqual(STEP_CARDS);
    // Still nothing asked before it is taught.
    for (const [n, t] of TERMS.entries()) {
      const read = stepOf(items, `d${n}`)!;
      for (const k of [0, 1, 2, 3]) expect(stepOf(items, `q${n}-${k}`)!, t).toBeGreaterThanOrEqual(read);
    }
  });

  it('asks the rest of a long step in the next step, after the reading', () => {
    // One term and fifteen questions on it: nothing smaller to cut it into.
    const qs = Array.from({ length: 15 }, (_, k) => mcq(`q${k}`, `Question ${k} about ${TERMS[0]}?`));
    const items = whole([defs[0], ...qs]);
    expect(items[0]._steps).toBeGreaterThanOrEqual(2);
    for (let s = 0; s < items[0]._steps!; s++) expect(items.filter((i) => i._step === s).length).toBeLessThanOrEqual(STEP_CARDS);
    expect(items.filter((i) => i._step! > 0).every((i) => i.type === 'mcq')).toBe(true);
    expect(items.filter((i) => i.type === 'mcq')).toHaveLength(15);
  });

  it('asks a new flashcard without showing it open first', () => {
    // A reading card with the answer, then the same card asked, read as being
    // handed the answer and asked for it (docs/proposals/content-quality.md).
    const items = learn([...defs, card('f1', 'Where is Gs protein?')]);
    expect(items.some((i) => i.type === 'preview')).toBe(false);
    expect(items.some((i) => i.id === 'f1')).toBe(true);
  });

  it('never asks one fact twice in a step: the second waits for the next step', () => {
    const km = (id: string, question: string): StudyItem => ({ id, type: 'flashcard', front: question, back: '10⁻⁶ to 10⁻¹ M' }) as StudyItem;
    const items = whole([
      ...defs.slice(0, 4),
      km('a', 'What range do typical Gs protein Km values fall in?'),
      mcq('b', 'Typical Gs protein Km values fall in which range?'),
    ]);
    expect(stepOf(items, 'a')).toBe(0);
    expect(stepOf(items, 'b')).toBe(1);
  });

  it('never asks a term straight after a card that printed it', () => {
    const items = whole([
      { id: 'cs', type: 'definition', term: 'Leaf gas exchange', definition: 'How a leaf trades gases: each pore is opened and closed by a guard cell beside it.' } as StudyItem,
      { id: 'sc', type: 'definition', term: 'Guard cell', definition: 'The one that opens and shuts a pore.' } as StudyItem,
    ]);
    expect(stepOf(items, recallId('sc'))).toBeGreaterThan(stepOf(items, recallId('cs'))!);
  });

  it('picks up where you stopped: a step whose every question is answered is skipped', () => {
    const items = learn(defs);
    const first = items.filter((i) => i._step === 0 && (i.type === 'recall' || i.type === 'mcq' || i.type === 'flashcard'));
    const progress = Object.fromEntries(first.map((i) => [i.id, { got: 1, missed: 0, lastSeen: 1 }]));
    const again = learn(defs, progress);
    expect(again.every((i) => i._step !== 0)).toBe(true);
    expect(again[0]._step).toBe(1);
  });

  it('is the whole section again once every step is done', () => {
    const items = learn(defs);
    const progress = Object.fromEntries(items.filter((i) => i.type === 'recall').map((i) => [i.id, { got: 1, missed: 1, lastSeen: 1 }]));
    expect(learn(defs, progress).length).toBeGreaterThan(0);
  });

  it(`asks at most ${TERM_BUDGET} cards on one term at its first meeting; the rest open the next sitting`, () => {
    // The owner's feedback loops: every card on a basic idea in one go.
    const qs = Array.from({ length: 5 }, (_, k) => card(`f${k}`, `Angle ${k} on ${TERMS[0]}: ${['why', 'when', 'where', 'how', 'unlike'][k]}?`));
    const items = learn([...defs.slice(0, 4), ...qs]);
    const onTerm = items.filter((i) => i.id === recallId('d0') || i.id.startsWith('f'));
    expect(onTerm.filter((i) => !i._second)).toHaveLength(TERM_BUDGET);
    // Learn leaves the second look out of a sitting that teaches the section.
    expect(items.some((i) => i._second)).toBe(false);
    // Once the rest is answered, it is what Learn opens with.
    const progress = Object.fromEntries(items.filter((i) => phaseOf(i.type) !== 'read').map((i) => [i.id, { got: 1, missed: 0, lastSeen: 1 }]));
    const next = learn([...defs.slice(0, 4), ...qs], progress);
    expect(next.length).toBeGreaterThan(0);
    expect(next.every((i) => i._second)).toBe(true);
  });

  it('keeps every part of a long step to the cap', () => {
    // One term and thirty flashcards on it: 1 + 30 asked + 1 typed.
    const cards = Array.from({ length: 30 }, (_, k) => card(`f${k}`, `Card ${k} about ${TERMS[0]}?`));
    const items = whole([defs[0], ...cards]);
    for (let s = 0; s < items[0]._steps!; s++) expect(items.filter((i) => i._step === s).length).toBeLessThanOrEqual(STEP_CARDS);
    expect(items.filter((i) => i.type === 'flashcard')).toHaveLength(30);
  });
});

describe('Learn on a section with only its second look left', () => {
  // Five cards on one term: three at the first meeting, two held back.
  const qs = Array.from({ length: 5 }, (_, k) => card(`f${k}`, `Angle ${k} on ${TERMS[0]}: ${['why', 'when', 'where', 'how', 'unlike'][k]}?`));
  const two = {
    schema_version: '1.0',
    metadata: { title: 'T' },
    sections: [
      { id: 's', title: 'S', order: 1, items: [...defs.slice(0, 4), ...qs] },
      { id: 't', title: 'T', order: 2, items: [{ id: 'e0', type: 'definition', term: 'Xylem', definition: 'Tissue that carries water up from the roots' }, card('g0', 'What carries water up a stem?')] },
    ],
  } as Course;
  const firstMeeting = (at: number) => {
    const asked = buildSessionItems(two, 'learn', { sectionId: 's' }).filter((i) => phaseOf(i.type) !== 'read');
    return Object.fromEntries(asked.map((i) => [i.id, { got: 1, missed: 0, lastSeen: at }]));
  };
  const DAY = 86_400_000;

  it('asks it and carries on into the next section, the next day', () => {
    const now = 10 * DAY;
    const items = buildSessionItems(two, 'learn', { sectionId: 's', progress: firstMeeting(now - DAY), now });
    expect(items.filter((i) => i._second).length).toBeGreaterThan(0);
    expect(items.some((i) => i._sectionId === 't')).toBe(true);
  });

  it('moves straight on when it was just studied: the second look waits a few hours', () => {
    const now = 10 * DAY;
    const items = buildSessionItems(two, 'learn', { sectionId: 's', progress: firstMeeting(now - 10 * 60_000), now });
    expect(items.some((i) => i._second)).toBe(false);
    expect(items.some((i) => i._sectionId === 't')).toBe(true);
  });
});
