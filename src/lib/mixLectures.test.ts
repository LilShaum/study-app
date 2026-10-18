import { describe, expect, it } from 'vitest';
import type { SessionItem } from './buildSessionItems';
import { mixLectures } from './mixLectures';

/** A seeded generator, so a failure can be run again. */
function rng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Made-up cards: no course material in the repo.
const card = (id: string, extra: Partial<SessionItem> = {}): SessionItem =>
  ({ id, type: 'flashcard', front: `${id}?`, back: 'x', _sectionId: 's', _sectionTitle: 'S', _sectionOrder: 0, ...extra }) as SessionItem;
const list = (prefix: string, n: number) => Array.from({ length: n }, (_, i) => card(`${prefix}${i}`));

describe('mixLectures', () => {
  it('keeps every card once, each marked with its own lecture, even when two lectures share an id', () => {
    const out = mixLectures([
      { courseId: 'A', items: [card('x'), card('a1')] },
      { courseId: 'B', items: [card('x'), card('b1'), card('b2')] },
    ]);
    expect(out).toHaveLength(5);
    expect(out.filter((i) => i.id === 'x').map((i) => i._courseId).sort()).toEqual(['A', 'B']);
    expect(out.every((i) => (i.id.startsWith('a') ? i._courseId === 'A' : i.id.startsWith('b') ? i._courseId === 'B' : true))).toBe(true);
  });

  it("keeps each lecture's own order", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const out = mixLectures(
        [
          { courseId: 'A', items: list('a', 7) },
          { courseId: 'B', items: list('b', 30) },
          { courseId: 'C', items: list('c', 3) },
        ],
        rng(seed),
      );
      for (const p of ['a', 'b', 'c']) {
        const ids = out.filter((i) => i.id.startsWith(p)).map((i) => Number(i.id.slice(1)));
        expect(ids).toEqual([...ids].sort((x, y) => x - y));
      }
    }
  });

  it('spreads each lecture over the whole sitting, so a sitting cut short has reached all of them', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const out = mixLectures(
        [
          { courseId: 'A', items: list('a', 10) },
          { courseId: 'B', items: list('b', 40) },
          { courseId: 'C', items: list('c', 5) },
        ],
        rng(seed),
      );
      // In any first share of the sitting, each lecture has about that share of its cards.
      const firstQuarter = out.slice(0, Math.round(out.length / 4));
      const share = (p: string, n: number) => firstQuarter.filter((i) => i.id.startsWith(p)).length / n;
      for (const [p, n] of [['a', 10], ['b', 40], ['c', 5]] as const) expect(Math.abs(share(p, n) - 0.25)).toBeLessThanOrEqual(0.21);
      // And no long runs of one lecture where the others still have cards.
      let run = 1;
      let longest = 1;
      for (let i = 1; i < out.length; i++) {
        run = out[i]._courseId === out[i - 1]._courseId ? run + 1 : 1;
        longest = Math.max(longest, run);
      }
      expect(longest).toBeLessThanOrEqual(12);
    }
  });

  it('is not a fixed rotation: two equal lectures do not simply alternate', () => {
    const orders = new Set(
      Array.from({ length: 10 }, (_, s) =>
        mixLectures([{ courseId: 'A', items: list('a', 6) }, { courseId: 'B', items: list('b', 6) }], rng(s + 1))
          .map((i) => i._courseId)
          .join(''),
      ),
    );
    expect(orders.size).toBeGreaterThan(1);
  });

  it('keeps a typed term with the card it was mistaken for', () => {
    const def = { id: 'd2', type: 'definition', term: 'Two', definition: 'x' } as unknown as SessionItem;
    const partner = card('d2~recall', { type: 'recall', target: def, pool: [] } as Partial<SessionItem>);
    const head = card('d1~recall', { type: 'recall', target: { ...def, id: 'd1' }, pool: [] } as Partial<SessionItem>);
    const progress = { 'd1~recall': { got: 0, missed: 1, lastSeen: 1, confusedWith: ['d2'] } };
    for (let seed = 1; seed <= 20; seed++) {
      const out = mixLectures(
        [
          { courseId: 'A', items: [card('a0'), head, partner, card('a3')], progress },
          { courseId: 'B', items: list('b', 12) },
        ],
        rng(seed),
      );
      const at = out.findIndex((i) => i.id === 'd1~recall');
      expect(out[at + 1].id).toBe('d2~recall');
    }
  });

  it('gives nothing for nothing', () => {
    expect(mixLectures([])).toEqual([]);
    expect(mixLectures([{ courseId: 'A', items: [] }])).toEqual([]);
  });
});
