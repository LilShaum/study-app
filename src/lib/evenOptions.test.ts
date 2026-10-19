import { describe, expect, it } from 'vitest';
import type { Course, McqItem } from '@/schema/course';
import { buildClassEvenOptionsPrompt, buildEvenOptionsPrompt, classToRework, longestShare, optionsToRework, readClassEvenOptions, readEvenOptions, readEvenReply, withCorrections } from './evenOptions';

// Made-up questions: no course content in the repo.
const mcq = (id: string, options: string[], correct_index = 0): McqItem =>
  ({ id, type: 'mcq', question: `${id}?`, options, correct_index, explanation: 'x', distractor_rationale: ['', 'a', 'b', 'c'], source_excerpt: 'x' }) as McqItem;
const longRight = (id: string) => mcq(id, ['the root hairs take water up by osmosis from soil', 'the leaves take it in', 'the stem pulls it up', 'the bark soaks it in']);
const fair = (id: string) => mcq(id, ['xylem carries water', 'phloem carries sugars from the leaves down', 'roots anchor the plant', 'stomata let gas through'], 0);
const course = (items: McqItem[]): Course => ({ schema_version: '1.0', metadata: { title: 'Plants' }, sections: [{ id: 's', title: 'S', items }] }) as unknown as Course;

describe('evenOptions', () => {
  const c = course([...Array.from({ length: 12 }, (_, i) => longRight(`l${i}`)), ...Array.from({ length: 8 }, (_, i) => fair(`f${i}`)), mcq('short', ['Contralateral', 'Ipsilateral', 'Bilateral', 'Medial'])]);

  it('repairs ties too: a lecture whose right answers tie a wrong one for length is offered the fix, and a reply that leaves a tie is refused', () => {
    // 20 questions, the right answer tied with one wrong option for longest:
    // a guess at the longest scores 10, against 5 by chance.
    const tie = (id: string) => mcq(id, ['the root hairs take water up', 'the stem pulls water upwards', 'the bark soaks', 'leaves do it']);
    const tied = course(Array.from({ length: 20 }, (_, i) => tie(`t${i}`)));
    expect(longestShare(tied)).toBe(50);
    expect(classToRework([['p', tied]]).map((l) => l.count)).toEqual([10]);
    const still = readEvenOptions(tied, { t0: { wrong: ['the stem pulls water upwards', 'the bark soaks', 'leaves do it'], why: ['a', 'b', 'c'] } });
    expect('error' in still ? still.error : still.skipped.map((x) => x.why)).toEqual(['the right answer would still be the longest']);
    const fixed = readEvenOptions(tied, { t0: { wrong: ['the stem pulls the water up from the roots', 'the bark soaks it', 'the leaves do it'], why: ['a', 'b', 'c'] } });
    expect('error' in fixed ? fixed.error : fixed.corrections.map((x) => x.id)).toEqual(['t0']);
  });

  it('picks enough long-answer questions to bring the share to about a quarter, never one-word ones', () => {
    expect(longestShare(c)).toBe(Math.round((13 / 21) * 100));
    const ids = optionsToRework(c).map((q) => q.id);
    expect(ids).not.toContain('short');
    expect(ids.every((id) => id.startsWith('l'))).toBe(true);
    expect(ids.length).toBe(8);
  });

  it('asks only for the wrong options and shows the right answer to keep', () => {
    const p = buildEvenOptionsPrompt(c);
    expect(p).toContain('Right answer, keep exactly: "the root hairs take water up by osmosis from soil"');
    expect(p).toContain('"wrong"');
  });

  it('puts new wrong options round the untouched right answer', () => {
    const reply = { l0: { wrong: ['the leaves take water in through their open stomata', 'the stem draws it up by capillary action alone', 'the bark soaks it in from rain'], why: ['p', 'q', 'r'] } };
    expect(optionsToRework(c).some((q) => q.id === 'l0')).toBe(true);
    const r = readEvenOptions(c, reply);
    if ('error' in r) throw new Error(r.error);
    expect(r.corrections[0].options).toEqual(['the root hairs take water up by osmosis from soil', ...reply.l0.wrong]);
    expect(r.corrections[0].distractor_rationale).toEqual(['', 'p', 'q', 'r']);
    expect(r.corrections[0].question).toBe('l0?');
    expect(longestShare(withCorrections(c, r.corrections))).toBeLessThan(longestShare(c));
  });

  it('keeps the right answer in its place when it is not first', () => {
    const q = mcq('m', ['a b c', 'the right one, which is longer than all', 'd e f', 'g h i'], 1);
    const wrong = ['a wrong one, which is now longer than the right', 'two', 'three'];
    const r = readEvenOptions(course([q]), { m: { wrong, why: ['x', 'y', 'z'] } });
    if ('error' in r) throw new Error(r.error);
    expect(r.corrections[0].options).toEqual([wrong[0], 'the right one, which is longer than all', 'two', 'three']);
    expect(r.corrections[0].correct_index).toBe(1);
  });

  it('takes a new explanation when one is sent, and keeps the old one otherwise', () => {
    const wrong = ['the leaves take water in through their open stomata', 'the stem draws it up by capillary action alone', 'the bark soaks it in from rain'];
    const r = readEvenOptions(c, { l0: { wrong, why: ['p', 'q', 'r'], explanation: 'Root hairs, by osmosis.' }, l1: { wrong, why: ['p', 'q', 'r'] } });
    if ('error' in r) throw new Error(r.error);
    expect(r.corrections.map((q) => q.explanation)).toEqual(['Root hairs, by osmosis.', 'x']);
  });

  it('skips what it cannot use, and says why', () => {
    const why = ['p', 'q', 'r'];
    const r = readEvenOptions(c, {
      nope: { wrong: ['a', 'b', 'c'], why },
      f0: { wrong: ['a', 'b', 'c'], why },
      l1: { wrong: ['a', 'b'], why },
      l2: { wrong: ['the root hairs take water up by osmosis from soil', 'b', 'c'], why },
      l3: { wrong: ['same', 'same', 'c'], why },
      l4: { wrong: ['a', 'b', 'c'] },
      l5: { wrong: ['a', 'b', 'c'], why },
    });
    if ('error' in r) throw new Error(r.error);
    expect(r.corrections).toEqual([]);
    expect(r.skipped).toEqual([
      { id: 'nope', why: 'not one of the questions asked about' },
      { id: 'f0', why: 'not one of the questions asked about' },
      { id: 'l1', why: 'needs exactly 3 wrong options' },
      { id: 'l2', why: 'a wrong option repeats the right answer or another option' },
      { id: 'l3', why: 'a wrong option repeats the right answer or another option' },
      { id: 'l4', why: 'needs a reason for each wrong option' },
      { id: 'l5', why: 'the right answer would still be the longest' },
    ]);
    expect(readEvenOptions(c, [])).toHaveProperty('error');
  });
});

describe('evenOptions for a whole class', () => {
  const lecture = (prefix: string, long = 10, ok = 8) =>
    course([...Array.from({ length: long }, (_, i) => ({ ...longRight(`${prefix}${i}`), source_excerpt: `notes on ${prefix}${i}` })), ...Array.from({ length: ok }, (_, i) => fair(`${prefix}f${i}`))]);
  const a = lecture('a');
  const b = lecture('b');
  const fine = course(Array.from({ length: 8 }, (_, i) => fair(`ok${i}`)));
  // 6 of 20 longest (30%): over a quarter, but not what the lecture check reports.
  const borderline = lecture('m', 6, 14);
  const lectures: [string, Course][] = [['A', a], ['B', b], ['C', fine], ['D', borderline]];

  it('lists only the lectures their own check flags, each with the passage behind every question', () => {
    expect(optionsToRework(borderline).length).toBeGreaterThan(0);
    expect(classToRework(lectures).map((l) => l.id)).toEqual(['A', 'B']);
    const p = buildClassEvenOptionsPrompt('BIO 1', lectures);
    expect(p).toContain('(id: A)');
    expect(p).toContain('(id: B)');
    expect(p).not.toContain('(id: C)');
    expect(p).not.toContain('(id: D)');
    expect(p).toContain('From my notes: notes on a0');
  });

  it('reads the part for each lecture, and names lectures it does not know', () => {
    const wrong = ['the leaves take water in through their open stomata', 'the stem draws it up by capillary action alone', 'the bark soaks it in from rain'];
    const why = ['p', 'q', 'r'];
    const r = readClassEvenOptions(lectures, { A: { a0: { wrong, why } }, B: { b1: { wrong, why }, nope: { wrong, why } }, Z: {} });
    if ('error' in r) throw new Error(r.error);
    expect(r.unknown).toEqual(['Z']);
    expect(r.lectures.map((l) => [l.id, l.corrections.map((c) => c.id), l.skipped.map((x) => x.id)])).toEqual([
      ['A', ['a0'], []],
      ['B', ['b1'], ['nope']],
    ]);
    expect(r.lectures[0].after).toBeLessThan(r.lectures[0].before);
    expect(readClassEvenOptions(lectures, { Z: {} })).toHaveProperty('error');
  });
});

describe('readEvenReply', () => {
  const entry = (n: number) => `{"wrong": ["w${n}a", "w${n}b", "w${n}c"], "why": ["a", "b", "c"]}`;
  it('reads a whole reply as JSON', () => {
    const r = readEvenReply(`{\n"q1": ${entry(1)}\n}`);
    expect(r.ok && r.cut).toBe(null);
  });
  it('keeps every whole line of a reply that was cut off', () => {
    const r = readEvenReply(`Here:\n{\n"q1": ${entry(1)},\n"q2": ${entry(2)},\n"q3": {"wrong": ["w3a", "w3`);
    expect(r).toMatchObject({ ok: true, cut: 2 });
    if (r.ok) expect(Object.keys(r.json as object)).toEqual(['q1', 'q2']);
  });
  it('keeps the lecture each line belongs to in a cut class reply', () => {
    const r = readEvenReply(`{\n"A": {\n"q1": ${entry(1)},\n"q2": ${entry(2)}\n},\n"B": {\n"q9": ${entry(9)},\n"q10": {"wro`);
    expect(r).toMatchObject({ ok: true, cut: 3 });
    if (r.ok) expect(r.json).toEqual({ A: { q1: JSON.parse(entry(1)), q2: JSON.parse(entry(2)) }, B: { q9: JSON.parse(entry(9)) } });
  });
  it('reads a lecture opened on the same line as its first question', () => {
    const r = readEvenReply(`{"A": {"q1": ${entry(1)},\n"q2": ${entry(2)},\n"q3": {"wr`);
    expect(r).toMatchObject({ ok: true, cut: 2 });
    if (r.ok) expect(Object.keys((r.json as Record<string, object>).A)).toEqual(['q1', 'q2']);
  });
  it('says so when nothing can be read', () => {
    expect(readEvenReply('{ "q1": {"wro').ok).toBe(false);
  });
});

