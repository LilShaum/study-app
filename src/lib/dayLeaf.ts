/**
 * A day of study drawn as a leaf (look L3 of docs/proposals/heatmap.md §6):
 * the more time that day, the larger and deeper the leaf; a day without is a
 * small bud.
 *
 * Held to the tree's contract (top of lib/growTree.ts): every mark is a path
 * of curves, never a circle, ellipse or rect; no leaf is its own mirror image
 * (one side fuller than the other); and each day's leaf is varied a little,
 * by its date alone, so the grid looks grown rather than stamped and the same
 * day always draws the same leaf.
 */

export interface DayLeaf {
  /** The filled blade, or the bud on a day without study. */
  blade: string;
  /** The stalk, a stroke. */
  stalk: string;
  /** The midrib, drawn in the paper's colour over a large enough blade; null on small ones. */
  vein: string | null;
}

/**
 * A number from 0 to 1 that belongs to a date (and a salt, for a second
 * trait), the same in every browser: integers and Math.imul only, as
 * growTree's hashUnit.
 */
export function dateUnit(date: string, salt = 0): number {
  let h = Math.imul(Number(date.replace(/-/g, '')) ^ Math.imul(salt + 1, 0x632be5ab), 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** The blade's length by level, as a share of the cell. */
const LENGTH = [0, 0.48, 0.68, 0.86, 1.1];
/** Under this much of the cell, a midrib would be a smudge. */
const VEIN_FROM = 0.78;

const r = (x: number) => Math.round(x * 100) / 100;

/**
 * The leaf (or bud) for one day, in a cell `size` units square with its
 * top-left at the origin. Centred on the cell so a column of them still
 * reads as a week.
 */
export function dayLeaf(date: string, level: 0 | 1 | 2 | 3 | 4, size: number): DayLeaf {
  const u = (salt: number) => dateUnit(date, salt);
  // Leaning to the right, as on a stem in the light, by a varied angle.
  const angle = ((26 + u(1) * 30) * Math.PI) / 180;
  const share = level ? LENGTH[level] * (0.92 + u(2) * 0.16) : 0.3;
  const length = size * share;
  const dx = Math.sin(angle);
  const dy = -Math.cos(angle);
  const c = size / 2;
  // The base sits so the blade's middle lands on the cell's middle.
  const bx = c - (dx * length) / 2;
  const by = c - (dy * length) / 2;
  // Leaf-local frame: s runs along the midrib from the base, t across it.
  const at = (s: number, t: number) => `${r(bx + dx * length * s - dy * length * t)} ${r(by + dy * length * s + dx * length * t)}`;

  if (!level) {
    // A closed bud on a short stalk: a little teardrop, fuller on one side.
    const belly = 0.4 + u(3) * 0.08;
    return {
      blade: `M${at(0, 0)}C${at(0.2, belly)},${at(0.72, belly * 0.7)},${at(1, 0.02)}C${at(0.7, -belly * 0.55)},${at(0.18, -belly * 0.8)},${at(0, 0)}Z`,
      stalk: `M${at(-0.62, 0.12)}Q${at(-0.3, 0.1)},${at(0, 0)}`,
      vein: null,
    };
  }

  // One side fuller than the other: a leaf, not a lens.
  const belly = 0.3 + u(3) * 0.08;
  const skew = 0.62 + u(4) * 0.22;
  const bend = (u(5) - 0.5) * 0.08;
  const blade =
    `M${at(0, 0)}` +
    `C${at(0.16, belly * 0.95)},${at(0.6, belly * 1.08)},${at(1, bend)}` +
    `C${at(0.66, -belly * skew * 0.96)},${at(0.14, -belly * skew * 0.82)},${at(0, 0)}Z`;
  const stalk = `M${at(-0.2, 0.05 + bend)}Q${at(-0.09, 0.04)},${at(0, 0)}`;
  const vein = share >= VEIN_FROM ? `M${at(0.04, 0)}Q${at(0.4, bend * 0.6 + 0.03)},${at(0.76, bend * 0.8)}` : null;
  return { blade, stalk, vein };
}
