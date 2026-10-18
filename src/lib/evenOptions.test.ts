import { describe, expect, it } from 'vitest';
import type { Course, McqItem } from '@/schema/course';
import { buildEvenOptionsPrompt, longestShare, optionsToRework, readEvenOptions, withCorrections } from './evenOptions';

// Made-up questions: no course content in the repo.
const mcq = (id: string, options: string[], correct_index = 0): McqItem =>
  ({ id, type: 'mcq', question: `${id}?`, options, correct_index, explanation: 'x', distractor_rationale: ['', 'a', 'b', 'c'], source_excerpt: 'x' }) as McqItem;
const longRight = (id: string) => mcq(id, ['the root hairs take water up by osmosis from soil', 'the leaves take it in', 'the stem pulls it up', 'the bark soaks it in']);
const fair = (id: string) => mcq(id, ['xylem carries water', 'phloem carries sugars from the leaves down', 'roots anchor the plant', 'stomata let gas through'], 0);
const course = (items: McqItem[]): Course => ({ schema_version: '1.0', metadata: { title: 'Plants' }, sections: [{ id: 's', title: 'S', items }] }) as unknown as Course;

describe('evenOptions', () => {
  const c = course([...Array.from({ length: 12 }, (_, i) => longRight(`l${i}`)), ...Array.from({ length: 8 }, (_, i) => fair(`f${i}`)), mcq('short', ['Contralateral', 'Ipsilateral', 'Bilateral', 'Medial'])]);

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
