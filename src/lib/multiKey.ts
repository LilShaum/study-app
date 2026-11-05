import type { MultiItem } from '@/schema/course';

/**
 * A select-all-that-apply question's key, read once for every place that
 * marks one (the card, the practice test, the lecture check), so they cannot
 * disagree about which statements are true (docs/proposals/multi-select.md).
 */

/**
 * The true statements, as indices into `options`, or null when the key
 * cannot be trusted: no statement named true, or one named that is not
 * there. A broken key is the file's fault: nothing is marked against the
 * student, as for a multiple-choice key that points outside its options.
 */
export function multiKey(item: Pick<MultiItem, 'options' | 'correct'>): Set<number> | null {
  const n = item.options?.length ?? 0;
  const correct = Array.isArray(item.correct) ? item.correct : [];
  if (!correct.length) return null;
  if (correct.some((i) => !Number.isInteger(i) || i < 0 || i >= n)) return null;
  return new Set(correct);
}

/**
 * All or nothing: right only when every true statement is picked and no
 * false one. A part-right answer to a question about one idea means part of
 * the idea is not known, as a written answer missing a point is.
 */
export function multiRight(key: ReadonlySet<number>, picked: Iterable<number>): boolean {
  const chosen = new Set(picked);
  if (chosen.size !== key.size) return false;
  for (const i of chosen) if (!key.has(i)) return false;
  return true;
}

/** How many statements were judged right: the true ones picked and the false ones left. */
export function statementsRight(key: ReadonlySet<number>, picked: Iterable<number>, count: number): number {
  const chosen = new Set(picked);
  let right = 0;
  for (let i = 0; i < count; i++) if (chosen.has(i) === key.has(i)) right++;
  return right;
}

/**
 * One reason per statement, in order, or undefined when they cannot be
 * placed: a list of another length would put a reason under the wrong
 * statement, which is worse than none.
 */
export function multiReasons(item: Pick<MultiItem, 'options' | 'option_rationale'>): string[] | undefined {
  const list = item.option_rationale;
  const n = item.options?.length ?? 0;
  if (!Array.isArray(list) || list.length !== n || !n) return undefined;
  return list.map((r) => (typeof r === 'string' ? r.trim() : ''));
}

/** A picked answer kept as the student's: the statements' indices in the file, each once, in order. */
export const pickedList = (picked: Iterable<number>): number[] => [...new Set(picked)].sort((a, b) => a - b);
