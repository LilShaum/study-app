import type { Tree } from './growTree';

interface Point {
  x: number;
  y: number;
}

/** Where a section's number sits on the plate, and the branch tip it keys. */
export interface TreeKey {
  sectionId: string;
  /** Its place in the lecture, from 1. */
  n: number;
  tip: Point;
  at: Point;
}

/**
 * How far outside the crown's wood the numbers ride, in viewBox units, so
 * that they sit on clear paper past its leaves, which the wood does not
 * show. Four more than before the larger leaves of 2026-11-07, about what
 * they grew by: at 12 and 14, one number in 26 sat on a leaf of a crown in
 * full leaf, where now it is one in 80.
 */
const CLEAR_SIDE = 16;
const CLEAR_TOP = 18;
/** The room left above the highest number, so all of it is on the sheet and can be tapped. */
const HEADROOM = 10;
/** Asked apart along the ring, in viewBox units: a fingertip at phone size. */
const GAP = 26;
/** Numbers stop above this, clear of the trunk's foot and the leaves on the ground. */
const FLOOR = 62;
/** How square the ring's shoulders are, 1 being an ellipse: a crown fills the corners of its box. */
const SQUARENESS = 0.5;
/** How finely the ring is walked. */
const RING_STEPS = 480;
/** The least of the drawing a plate keeps. Any less and a small tree is blown up past its page. */
const LEAST_HEIGHT = 180;

/** The numbers of a path, in pairs: every coordinate in a limb is absolute (lib/growTree). */
function coordinates(d: string): number[] {
  return (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
}

/** How far the wood reaches. Wood only: it never moves with what has been learned. */
function crownOf(tree: Tree) {
  let top = tree.height;
  let left = tree.width;
  let right = 0;
  for (const limb of tree.limbs) {
    if (limb.kind === 'leaf') continue;
    const numbers = coordinates(limb.d);
    for (let i = 0; i + 1 < numbers.length; i += 2) {
      top = Math.min(top, numbers[i + 1]);
      if (limb.kind !== 'trunk') {
        left = Math.min(left, numbers[i]);
        right = Math.max(right, numbers[i]);
      }
    }
  }
  return right > left ? { top, left, right } : { top, left: tree.width / 2 - 20, right: tree.width / 2 + 20 };
}

/**
 * Where a plate of this tree should start its sheet, in viewBox units.
 *
 * A tree grows to whatever height its sections give it inside a fixed sheet,
 * so most have a blank stretch above the crown: on the lecture page that was
 * a quarter of a large tree's height spent on nothing, above the first
 * screen's fold. Cut from the wood, so it never moves as the student learns.
 * A tree that fills its sheet gets a little more paper instead, for its numbers.
 */
export function plateTop(tree: Tree): number {
  const { top } = crownOf(tree);
  return Math.round(Math.min(tree.height - LEAST_HEIGHT, top - CLEAR_TOP - HEADROOM));
}

/**
 * Least-squares placement of ordered points kept `gap` apart inside [0, length]:
 * pool any run that crowds together and centre it on where its members want
 * to be, so a number moves no further from its branch than the room demands.
 */
function spaceAlong(wanted: number[], gap: number, length: number): number[] {
  const pools: { sum: number; count: number }[] = [];
  wanted.forEach((want, i) => {
    let pool = { sum: want - i * gap, count: 1 };
    while (pools.length && pools[pools.length - 1].sum / pools[pools.length - 1].count > pool.sum / pool.count) {
      const last = pools.pop()!;
      pool = { sum: pool.sum + last.sum, count: pool.count + last.count };
    }
    pools.push(pool);
  });
  const last = Math.max(0, length - (wanted.length - 1) * gap);
  const out: number[] = [];
  for (const pool of pools) {
    const at = Math.min(last, Math.max(0, pool.sum / pool.count));
    for (let k = 0; k < pool.count; k++) out.push(at + out.length * gap);
  }
  return out;
}

/** Whether two straight lines cross, each from a to b. */
export function linesCross(a1: Point, a2: Point, b1: Point, b2: Point): boolean {
  const side = (p: Point, q: Point, r: Point) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  return side(a1, a2, b1) * side(a1, a2, b2) < 0 && side(b1, b2, a1) * side(b1, b2, a2) < 0;
}

/**
 * Numbers for the branches, set the way a botanical plate keys its parts.
 *
 * Aiming at a limb is what cannot work on a phone: the limbs of eleven
 * sections interleave, and even at the full-screen size the nearest limb is
 * the intended one about 65% of the time (components/CourseTree, measured).
 * A number can be aimed at, says which section it is by matching the Sections
 * list on the same page, and needs no hold on the page, so a finger can still
 * scroll from it.
 *
 * So the numbers ride a ring just outside the crown, each as near as there is
 * room for to where its branch ends, with a hairline back to the tip. On the
 * crown itself they were lost among the leaves and crowded where several
 * branches end together; outside it they keep a clear page behind them and a
 * fingertip's distance from each other, and their hairlines do not cross.
 *
 * Deterministic, as the tree is: the same lecture gets the same plate. The
 * main lines come from the wood, which never moves with what has been learned.
 */
export function placeTreeKeys(tree: Tree, sectionIds: string[]): TreeKey[] {
  const keys: TreeKey[] = [];
  sectionIds.forEach((sectionId, i) => {
    // Limbs are pushed root to tip, so the last on the main line ends at its tip.
    const last = tree.limbs.filter((l) => l.sectionId === sectionId && l.spine).at(-1);
    const numbers = last && coordinates(last.d);
    if (numbers && numbers.length >= 2) {
      const tip = { x: numbers[numbers.length - 2], y: numbers[numbers.length - 1] };
      keys.push({ sectionId, n: i + 1, tip, at: { ...tip } });
    }
  });
  if (!keys.length) return keys;

  const crown = crownOf(tree);
  const floor = tree.height - FLOOR;
  const cx = (crown.left + crown.right) / 2;
  const rx = (crown.right - crown.left) / 2 + CLEAR_SIDE;
  const cy = crown.top + (floor - crown.top) * 0.6;
  const ry = cy - crown.top + CLEAR_TOP;

  // The ring: up the left, over the top, down the right, measured along its
  // length, and stopping at the floor each side.
  const ring: (Point & { along: number; angle: number })[] = [];
  for (let i = 0; i <= RING_STEPS; i++) {
    const t = -1.5 * Math.PI + (2 * Math.PI * i) / RING_STEPS;
    const x = cx + rx * Math.sign(Math.cos(t)) * Math.abs(Math.cos(t)) ** SQUARENESS;
    const y = cy + ry * Math.sign(Math.sin(t)) * Math.abs(Math.sin(t)) ** SQUARENESS;
    if (y > floor) continue;
    const prior = ring.at(-1);
    ring.push({ x, y, along: prior ? prior.along + Math.hypot(x - prior.x, y - prior.y) : 0, angle: Math.atan2(y - cy, x - cx) });
  }
  const length = ring[ring.length - 1].along;

  /** How far along the ring a branch comes out, going on from the crown's centre through its tip. */
  const wantedAlong = (tip: Point) => {
    const angle = Math.atan2(tip.y - cy, tip.x - cx);
    const off = (p: { angle: number }) => Math.abs(Math.atan2(Math.sin(p.angle - angle), Math.cos(p.angle - angle)));
    return ring.reduce((best, p) => (off(p) < off(best) ? p : best)).along;
  };
  const ordered = keys
    .map((key) => ({ key, along: wantedAlong(key.tip) }))
    .sort((a, b) => a.along - b.along || a.key.n - b.key.n);
  const gap = ordered.length > 1 ? Math.min(GAP, length / (ordered.length - 1)) : 0;
  const spaced = spaceAlong(ordered.map((o) => o.along), gap, length);

  ordered.forEach(({ key }, i) => {
    const found = ring.findIndex((p) => p.along >= spaced[i]);
    const hi = found < 0 ? ring.length - 1 : found;
    const b = ring[hi];
    const a = ring[Math.max(0, hi - 1)];
    const f = b.along > a.along ? (spaced[i] - a.along) / (b.along - a.along) : 0;
    key.at = {
      x: Math.round((a.x + (b.x - a.x) * f) * 10) / 10,
      y: Math.round((a.y + (b.y - a.y) * f) * 10) / 10,
    };
  });

  // Branches end at different depths, so order round the ring cannot promise
  // this alone. Swapping the ends of two crossing lines always shortens them,
  // so it settles.
  for (let pass = 0; pass < keys.length * keys.length; pass++) {
    let swapped = false;
    for (let i = 0; i < keys.length; i++) {
      for (let j = i + 1; j < keys.length; j++) {
        if (linesCross(keys[i].tip, keys[i].at, keys[j].tip, keys[j].at)) {
          [keys[i].at, keys[j].at] = [keys[j].at, keys[i].at];
          swapped = true;
        }
      }
    }
    if (!swapped) break;
  }
  return keys;
}
