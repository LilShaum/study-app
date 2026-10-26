import type { McqItem } from '@/schema/course';
import { normalisedRationale } from './mcqRationale';

/**
 * Multiple-choice options in a new order each time a question is shown.
 *
 * A lecture file keeps its options in the order they were written, and a
 * generator's habits show there: one generated lecture had every right
 * answer first (owner, 2026-10-21; asked for long before). A student who
 * meets a question twice also learns where its answer sits rather than what
 * it is. So the options are shuffled at every showing, the key and each
 * option's "why not" following.
 *
 * An option that points at the others ("all of the above", "A and C") keeps
 * the written order, or it would point at the wrong ones.
 */
const POINTS_AT_OTHERS = [
  /\b(all|none|both|neither) of (the )?(above|these|them|the options)\b/i,
  /^\s*\(?[A-D]\)?\s*(,|and|or|&)\s*\(?[A-D]\)?(\s*(,|and|or|&)\s*\(?[A-D]\)?)*\s*\.?\s*$/i,
];

/** A small seeded generator, so one showing keeps one order (cyrb53 hash into mulberry32). */
function seeded(seed: string): () => number {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < seed.length; i++) {
    const c = seed.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  let a = (Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The order to show the options in: entry k is the index, in the file, of the option shown k-th. */
const fixedOrder = (options: readonly string[]) => options.some((o) => POINTS_AT_OTHERS.some((p) => p.test(o)));

export function optionOrder(options: readonly string[], seed: string): number[] {
  const order = options.map((_, i) => i);
  if (fixedOrder(options)) return order;
  const rand = seeded(seed);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/** The last order each question was shown in, while the app is open, by question id. */
const lastShown = new Map<string, { seed: string; order: number[] }>();

/**
 * The order for one showing of a question, with its right answer somewhere
 * other than where it was the last time the question was shown. A shuffle
 * alone gave the same order back one time in 24, and the answer in the same
 * place one time in 4: a missed question that came back as it was let the
 * student answer from where it sat (the owner, 2026-10-26). The same seed
 * gives the same order again (a re-render, or React's double call in
 * development).
 */
export function orderForShowing(id: string, options: readonly string[], correctIndex: number, seed: string): number[] {
  const last = lastShown.get(id);
  if (last?.seed === seed) return last.order;
  let order = optionOrder(options, seed);
  const moved = (o: number[]) => !last || last.order.length !== o.length || o.indexOf(correctIndex) !== last.order.indexOf(correctIndex);
  // A fixed order (an option that points at the others) cannot move.
  if (!fixedOrder(options)) for (let k = 1; k < 64 && !moved(order); k++) order = optionOrder(options, `${seed}/${k}`);
  lastShown.set(id, { seed, order });
  return order;
}

/**
 * The question with its options in `order`, its key and its per-option notes
 * following. A broken key is left as it is, for the card to report.
 */
export function inOrder(item: McqItem, order: readonly number[]): McqItem {
  const options = item.options ?? [];
  if (order.length !== options.length || !Number.isInteger(item.correct_index) || item.correct_index < 0 || item.correct_index >= options.length) return item;
  const notes = normalisedRationale(item);
  return {
    ...item,
    options: order.map((i) => options[i]),
    correct_index: order.indexOf(item.correct_index),
    // Notes that cannot be placed are dropped rather than moved to the wrong option.
    distractor_rationale: notes ? order.map((i) => notes[i]) : undefined,
  };
}
