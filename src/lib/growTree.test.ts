import { describe, expect, it } from 'vitest';
import { growTree, type TreeSection } from './growTree';

const sections = (n: number, mastery = 0): TreeSection[] =>
  Array.from({ length: n }, (_, i) => ({ id: `s${i}`, weight: 8 + i, mastery }));

const allPaths = (t: ReturnType<typeof growTree>) => t.limbs.map((l) => l.d).join(' ');

describe('growTree — the construction contract', () => {
  /**
   * These are the rules the file states at the top. A stated rule without a
   * test is a wish, and every one of these is a rule whose violation is
   * exactly what makes generated illustration look generated.
   */
  it('draws with curves only — no primitives anywhere', () => {
    const t = growTree('bioc301', sections(9, 1));
    // Every limb is a path; the renderer emits <path> and nothing else.
    expect(t.limbs.every((l) => /^M[-\d.]/.test(l.d))).toBe(true);
    // Curve commands present, and no primitive-shape markup could exist here.
    expect(allPaths(t)).toMatch(/[CQ]/);
    expect(allPaths(t)).not.toMatch(/circle|rect|ellipse/i);
  });

  it('uses three distinct weights, not one', () => {
    const t = growTree('bioc301', sections(9, 1));
    const kinds = new Set(t.limbs.map((l) => l.kind));
    expect(kinds.has('trunk')).toBe(true);
    expect(kinds.has('branch')).toBe(true);
    expect(new Set(t.limbs.map((l) => l.weight)).size).toBeGreaterThan(4);
  });

  it('tapers: the trunk is heavier than anything in the crown', () => {
    const t = growTree('bioc301', sections(9, 1));
    const heaviestTrunk = Math.max(...t.limbs.filter((l) => l.kind === 'trunk').map((l) => l.weight));
    const heaviestLeaf = Math.max(...t.limbs.filter((l) => l.kind === 'leaf').map((l) => l.weight));
    expect(heaviestTrunk).toBeGreaterThan(heaviestLeaf * 3);
  });

  it('grows the same tree for the same course, every time', () => {
    const a = growTree('bioc301', sections(9, 0.5));
    const b = growTree('bioc301', sections(9, 0.5));
    expect(allPaths(a)).toEqual(allPaths(b));
  });

  it('grows a different tree for a different course', () => {
    const a = growTree('bioc301', sections(9, 0.5));
    const b = growTree('phys101', sections(9, 0.5));
    expect(allPaths(a)).not.toEqual(allPaths(b));
  });

  it('is not mirror-symmetric', () => {
    // A tree whose left and right halves carry equal ink is machinery.
    const t = growTree('bioc301', sections(9, 1));
    const xs = allPaths(t).match(/M([-\d.]+) /g)!.map((m) => parseFloat(m.slice(1)));
    const left = xs.filter((x) => x < 100).length;
    const right = xs.filter((x) => x >= 100).length;
    expect(Math.abs(left - right)).toBeGreaterThan(0);
  });
});

describe('growTree — what study changes', () => {
  it('bears no leaves on a course never opened', () => {
    const t = growTree('bioc301', sections(9, 0));
    expect(t.limbs.filter((l) => l.kind === 'leaf')).toHaveLength(0);
  });

  it('bears more leaves the better the course is known', () => {
    const counts = [0, 0.3, 0.7, 1].map(
      (m) => growTree('bioc301', sections(9, m)).limbs.filter((l) => l.kind === 'leaf').length,
    );
    expect(counts[0]).toBeLessThan(counts[1]);
    expect(counts[1]).toBeLessThan(counts[2]);
    expect(counts[2]).toBeLessThan(counts[3]);
  });

  it('leaves an unstudied section bare while its neighbours are in leaf', () => {
    // The honest signal the picture exists to give.
    const mixed: TreeSection[] = [
      { id: 'known', weight: 10, mastery: 1 },
      { id: 'avoided', weight: 10, mastery: 0 },
    ];
    const t = growTree('bioc301', mixed);
    const leaves = t.limbs.filter((l) => l.kind === 'leaf');
    expect(leaves.some((l) => l.sectionId === 'known')).toBe(true);
    expect(leaves.some((l) => l.sectionId === 'avoided')).toBe(false);
  });

  it('keeps the same skeleton however much you study — only foliage moves', () => {
    const bare = growTree('bioc301', sections(9, 0));
    const full = growTree('bioc301', sections(9, 1));
    const wood = (t: ReturnType<typeof growTree>) =>
      t.limbs.filter((l) => l.kind !== 'leaf').map((l) => l.d).join(' ');
    expect(wood(bare)).toEqual(wood(full));
  });

  it('gives every section a limb of its own', () => {
    const t = growTree('bioc301', sections(6, 0.5));
    const withSection = new Set(t.limbs.map((l) => l.sectionId).filter(Boolean));
    expect(withSection.size).toBe(6);
  });

  it('survives a course with one section, and with none', () => {
    expect(() => growTree('x', sections(1, 1))).not.toThrow();
    expect(growTree('x', []).limbs.length).toBeGreaterThan(0);
  });
});

describe('growTree — foliage is mass, not decoration', () => {
  /**
   * The complaint these exist for: every species still read as a bare winter
   * skeleton however well the course was known, because foliage was a few
   * dozen transparent outlines and nothing ever hid the wood behind it.
   */
  it('carries enough leaves to read as a canopy, not a scatter', () => {
    const t = growTree('bioc301', sections(9, 1));
    expect(t.limbs.filter((l) => l.kind === 'leaf').length).toBeGreaterThan(300);
  });

  it('marks foliage as solid, so it occludes the branches behind it', () => {
    const t = growTree('bioc301', sections(9, 1));
    const leaves = t.limbs.filter((l) => l.kind === 'leaf');
    expect(leaves.every((l) => l.solid)).toBe(true);
    // Wood stays stroke-only, the same language as the icon set.
    expect(t.limbs.filter((l) => l.kind !== 'leaf').every((l) => !l.solid)).toBe(true);
  });

  it('draws foliage after the wood, so paint order can occlude', () => {
    const t = growTree('bioc301', sections(9, 1));
    const lastWood = t.limbs.map((l) => l.kind).lastIndexOf('branch');
    const firstLeaf = t.limbs.findIndex((l) => l.kind === 'leaf');
    expect(firstLeaf).toBeGreaterThan(lastWood);
  });


});

describe('growTree — fading', () => {
  const leavesOf = (t: ReturnType<typeof growTree>, id: string) =>
    t.limbs.filter((l) => l.kind === 'leaf' && l.sectionId === id).map((l) => l.d);
  const one = (mastery: number, learned?: number): TreeSection[] => [
    { id: 'a', weight: 10, mastery, learned },
    { id: 'b', weight: 10, mastery: 0.6 },
  ];

  it('moves no leaf in one section when another section changes', () => {
    const before = leavesOf(growTree('c', one(0.2)), 'b');
    const after = leavesOf(growTree('c', one(0.9)), 'b');
    expect(after).toEqual(before);
  });

  it('regrows exactly the leaves that fell', () => {
    const fresh = growTree('c', one(1, 1));
    const faded = growTree('c', one(0.3, 1));
    const reviewed = growTree('c', one(1, 1));
    expect(leavesOf(reviewed, 'a')).toEqual(leavesOf(fresh, 'a'));
    expect(leavesOf(faded, 'a')).not.toEqual(leavesOf(fresh, 'a'));
  });

  it('never goes bare once studied, however faded', () => {
    const t = growTree('c', one(0, 0.8));
    const onTree = t.limbs.filter((l) => l.kind === 'leaf' && l.sectionId === 'a');
    expect(onTree.length).toBeGreaterThan(0);
  });

  it('puts what faded on the ground, and nothing there when nothing has', () => {
    const ground = (t: ReturnType<typeof growTree>) =>
      t.limbs.filter((l) => l.kind === 'leaf' && l.sectionId === 'a' && Number(/^M-?[\d.]+ (-?[\d.]+)/.exec(l.d)![1]) > t.height - 14);
    expect(ground(growTree('c', one(0.8)))).toHaveLength(0);
    expect(ground(growTree('c', one(0.1, 0.8))).length).toBeGreaterThan(0);
  });

  it('draws a section never studied as bare wood', () => {
    expect(leavesOf(growTree('c', one(0)), 'a')).toHaveLength(0);
  });
});
