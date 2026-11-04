import type { Tree } from './growTree';

/** Where a section's number sits on the plate, and the branch tip it keys. */
export interface TreeKey {
  sectionId: string;
  /** Its place in the lecture, from 1. */
  n: number;
  tip: { x: number; y: number };
  at: { x: number; y: number };
}

/** How far out from its tip a number starts, in viewBox units. */
const OUTSET = 9;
/** The closest two numbers may sit, in viewBox units: about 20px at phone size. */
const CLEARANCE = 20;
/** How far a number may overhang the drawing: the page's margin has room for it. */
const OVERHANG = 16;
/** Keeps numbers off the trunk's foot and the leaves on the ground. */
const FLOOR = 62;

/** The last point of a path: where a limb ends. */
function endOf(d: string): { x: number; y: number } | null {
  const numbers = d.match(/-?\d+(?:\.\d+)?/g);
  if (!numbers || numbers.length < 2) return null;
  return { x: Number(numbers[numbers.length - 2]), y: Number(numbers[numbers.length - 1]) };
}

/**
 * Numbers for the branches, placed the way a botanical plate keys its parts.
 *
 * Aiming at a limb is what cannot work on a phone: the limbs of eleven
 * sections interleave, and even at the full-screen size the nearest limb is
 * the intended one about 65% of the time (components/CourseTree, measured).
 * A number can be aimed at, says which section it is by matching the Sections
 * list on the same page, and needs no hold on the page, so a finger can still
 * scroll from it. So each section's number sits just outside the tip of its
 * main line, pushed clear of its neighbours; a hairline joins any that had to
 * move back to the tip it names.
 *
 * Deterministic, as the tree is: the same lecture gets the same plate. The
 * main lines come from the wood, which never moves with what has been learned.
 */
export function placeTreeKeys(tree: Tree, sectionIds: string[]): TreeKey[] {
  const keys: TreeKey[] = [];
  sectionIds.forEach((sectionId, i) => {
    // Limbs are pushed root to tip, so the last on the main line ends at its tip.
    const last = tree.limbs.filter((l) => l.sectionId === sectionId && l.spine).at(-1);
    const tip = last && endOf(last.d);
    if (tip) keys.push({ sectionId, n: i + 1, tip, at: { ...tip } });
  });
  if (!keys.length) return keys;

  const cx = keys.reduce((sum, k) => sum + k.tip.x, 0) / keys.length;
  const cy = keys.reduce((sum, k) => sum + k.tip.y, 0) / keys.length;
  for (const k of keys) {
    const dx = k.tip.x - cx;
    const dy = k.tip.y - cy;
    const far = Math.hypot(dx, dy) || 1;
    k.at = { x: k.tip.x + (dx / far) * OUTSET, y: k.tip.y + (dy / far) * OUTSET };
  }

  const clamp = (k: TreeKey) => {
    k.at.x = Math.min(tree.width + OVERHANG, Math.max(-OVERHANG, k.at.x));
    k.at.y = Math.min(tree.height - FLOOR, Math.max(8, k.at.y));
  };
  keys.forEach(clamp);
  // Pairs pushed apart until none is too close, or as near to that as there is room for.
  for (let pass = 0; pass < 200; pass++) {
    let moved = false;
    for (let a = 0; a < keys.length; a++) {
      for (let b = a + 1; b < keys.length; b++) {
        const dx = keys[b].at.x - keys[a].at.x;
        const dy = keys[b].at.y - keys[a].at.y;
        const apart = Math.hypot(dx, dy);
        if (apart >= CLEARANCE) continue;
        moved = true;
        // Two on one spot part by their order, so the answer never varies.
        const ux = apart ? dx / apart : a % 2 ? 1 : -1;
        const uy = apart ? dy / apart : 0;
        const push = (CLEARANCE - apart) / 2 + 0.01;
        keys[a].at.x -= ux * push;
        keys[a].at.y -= uy * push;
        keys[b].at.x += ux * push;
        keys[b].at.y += uy * push;
      }
    }
    keys.forEach(clamp);
    if (!moved) break;
  }
  for (const k of keys) k.at = { x: Math.round(k.at.x * 10) / 10, y: Math.round(k.at.y * 10) / 10 };
  return keys;
}
