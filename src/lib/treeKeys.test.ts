import { describe, expect, it } from 'vitest';
import { growTree } from './growTree';
import { linesCross, placeTreeKeys, plateTop } from './treeKeys';

const sections = (n: number, mastery = 0) =>
  Array.from({ length: n }, (_, i) => ({ id: `s${i}`, weight: 6 + ((i * 7) % 11), mastery }));
const ids = (n: number) => sections(n).map((s) => s.id);
const plate = (n: number, mastery = 0, seed = 'lecture-a') => placeTreeKeys(growTree(seed, sections(n, mastery)), ids(n));

const SEEDS = ['lecture-a', 'lecture-b', 'enzymes', 'motion and loops', 'BIOC301'];
const COUNTS = [1, 2, 3, 6, 11, 16];
const everyPlate = SEEDS.flatMap((seed) => COUNTS.map((n) => [seed, n] as const));

describe('placeTreeKeys', () => {
  it('gives every section its number, in the lecture order', () => {
    expect(plate(11).map((k) => [k.sectionId, k.n])).toEqual(ids(11).map((id, i) => [id, i + 1]));
  });

  it('is the same plate however much has been learned: the wood never moves', () => {
    expect(plate(11, 1)).toEqual(plate(11, 0));
  });

  it.each(everyPlate)('%s with %i sections: numbers far enough apart to tell and tap', (seed, n) => {
    const keys = plate(n, 0, seed);
    for (const a of keys) {
      for (const b of keys) {
        if (a !== b) expect(Math.hypot(a.at.x - b.at.x, a.at.y - b.at.y)).toBeGreaterThanOrEqual(19.5);
      }
    }
  });

  it.each(everyPlate)('%s with %i sections: numbers on the sheet and off the ground', (seed, n) => {
    const tree = growTree(seed, sections(n));
    const top = plateTop(tree);
    for (const k of placeTreeKeys(tree, ids(n))) {
      expect(k.at.x).toBeGreaterThanOrEqual(-16);
      expect(k.at.x).toBeLessThanOrEqual(tree.width + 16);
      expect(k.at.y).toBeGreaterThanOrEqual(top + 6);
      expect(k.at.y).toBeLessThanOrEqual(tree.height - 62);
    }
  });

  it.each(everyPlate)('%s with %i sections: no two hairlines cross', (seed, n) => {
    const keys = plate(n, 0, seed);
    for (const a of keys) {
      for (const b of keys) {
        if (a !== b) expect(linesCross(a.tip, a.at, b.tip, b.at)).toBe(false);
      }
    }
  });

  it.each(everyPlate)('%s with %i sections: each number clear of the branch tips', (seed, n) => {
    const keys = plate(n, 0, seed);
    for (const k of keys) {
      for (const other of keys) expect(Math.hypot(k.at.x - other.tip.x, k.at.y - other.tip.y)).toBeGreaterThanOrEqual(6);
    }
  });

  it('skips a section with no branch rather than placing a number nowhere', () => {
    const tree = growTree('lecture-a', sections(2));
    expect(placeTreeKeys(tree, ['s0', 'missing', 's1']).map((k) => [k.sectionId, k.n])).toEqual([
      ['s0', 1],
      ['s1', 3],
    ]);
  });
});

describe('plateTop', () => {
  it('cuts the blank paper above a crown, and never the crown', () => {
    for (const [seed, n] of everyPlate) {
      const tree = growTree(seed, sections(n));
      const wood = tree.limbs.filter((l) => l.kind !== 'leaf').flatMap((l) => (l.d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number).filter((_, i) => i % 2));
      expect(plateTop(tree)).toBeLessThan(Math.min(...wood));
    }
  });

  it('is the same however much has been learned: the wood never moves', () => {
    expect(plateTop(growTree('lecture-a', sections(11, 1)))).toBe(plateTop(growTree('lecture-a', sections(11, 0))));
  });

  it('keeps enough of the sheet that a small tree is not blown up past its page', () => {
    for (const [seed, n] of everyPlate) {
      const tree = growTree(seed, sections(n));
      expect(tree.height - plateTop(tree)).toBeGreaterThanOrEqual(180);
    }
  });
});
