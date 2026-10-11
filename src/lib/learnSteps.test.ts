import { describe, expect, it } from 'vitest';
import type { Course, StudyItem } from '@/schema/course';
import { buildSessionItems, recallId, type SessionItem } from './buildSessionItems';
import { phaseOf, STEP_CARDS, STEP_TERMS } from './learnSteps';

const TERMS = ['Adenylyl cyclase', 'Gs protein', 'Protein kinase A', 'Phosphodiesterase', 'Calmodulin', 'Inositol trisphosphate', 'Diacylglycerol', 'Protein kinase C'];

const def = (n: number): StudyItem =>
  ({ id: `d${n}`, type: 'definition', term: TERMS[n], definition: `meaning of the thing number ${n}` }) as StudyItem;
const mcq = (id: string, question: string): StudyItem =>
  ({ id, type: 'mcq', question, options: ['w', 'x', 'y', 'z'], correct_index: 0, explanation: 'because' }) as StudyItem;
const card = (id: string, front: string): StudyItem => ({ id, type: 'flashcard', front, back: 'answer' }) as StudyItem;

function course(items: StudyItem[]): Course {
  return { schema_version: '1.0', metadata: { title: 'T' }, sections: [{ id: 's', title: 'S', items }] } as Course;
}

const defs = TERMS.map((_, n) => def(n));
const learn = (items: StudyItem[], progress = {}) => buildSessionItems(course(items), 'learn', { progress });
const stepOf = (items: SessionItem[], id: string) => items.find((i) => i.id === id)?._step;

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

  it('skips reading a term already answered right, and still asks for it', () => {
    const progress = { [recallId('d0')]: { got: 1, missed: 0, lastSeen: 0 } };
    const items = learn(defs, progress);
    expect(items.some((i) => i.id === 'd0')).toBe(false);
    expect(items.some((i) => i.id === recallId('d0'))).toBe(true);
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
    const items = learn([...defs, ...qs]);
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
    const items = learn([defs[0], ...qs]);
    expect(items[0]._steps).toBe(2);
    expect(items.filter((i) => i._step === 0).length).toBeLessThanOrEqual(STEP_CARDS);
    expect(items.filter((i) => i._step === 1).every((i) => i.type === 'mcq')).toBe(true);
  });

  it('shows a new flashcard open before asking it, in the same step', () => {
    const items = learn([...defs, card('f1', 'Where is Gs protein?')]);
    const shown = items.findIndex((i) => i.id === 'f1~preview');
    const asked = items.findIndex((i) => i.id === 'f1');
    expect(shown).toBeGreaterThanOrEqual(0);
    expect(shown).toBeLessThan(asked);
    expect(items[shown]._step).toBe(items[asked]._step);
    expect(phaseOf(items[shown].type)).toBe('read');
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
});
