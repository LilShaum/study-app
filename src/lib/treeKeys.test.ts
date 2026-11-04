import { describe, expect, it } from 'vitest';
import { growTree } from './growTree';
import { placeTreeKeys } from './treeKeys';

const sections = (n: number, mastery = 0) =>
  Array.from({ length: n }, (_, i) => ({ id: `s${i}`, weight: 6 + ((i * 7) % 11), mastery }));
const ids = (n: number) => sections(n).map((s) => s.id);
const plate = (n: number, mastery = 0) => placeTreeKeys(growTree('lecture-a', sections(n, mastery)), ids(n));

describe('placeTreeKeys', () => {
  it('gives every section its number, in the lecture order', () => {
    expect(plate(11).map((k) => [k.sectionId, k.n])).toEqual(ids(11).map((id, i) => [id, i + 1]));
  });

  it('is the same plate however much has been learned: the wood never moves', () => {
    expect(plate(11, 1)).toEqual(plate(11, 0));
  });

  it.each([3, 6, 11])('keeps %i numbers far enough apart to tell and tap', (n) => {
    const keys = plate(n);
    for (const a of keys) {
      for (const b of keys) {
        if (a !== b) expect(Math.hypot(a.at.x - b.at.x, a.at.y - b.at.y)).toBeGreaterThanOrEqual(19.5);
      }
    }
  });

  it('keeps the numbers on the sheet and off the ground', () => {
    const tree = growTree('lecture-a', sections(11));
    for (const k of placeTreeKeys(tree, ids(11))) {
      expect(k.at.x).toBeGreaterThanOrEqual(-16);
      expect(k.at.x).toBeLessThanOrEqual(tree.width + 16);
      expect(k.at.y).toBeGreaterThanOrEqual(8);
      expect(k.at.y).toBeLessThanOrEqual(tree.height - 62);
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
