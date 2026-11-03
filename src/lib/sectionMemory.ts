import type { Section } from '@/schema/course';
import type { ItemResult } from '@/store/progress';
import type { ExamRule } from './exam';
import { DUE_BELOW, isDueFor, retrievability } from './memory';
import { scoredEntries } from './scored';
import { sectionStats } from './sectionStats';

/**
 * How much of a section counts as learned, 0..1.
 *
 * Coverage times confidence: studying every scorable item badly is not the
 * same as studying half of them well, and neither is mastery. The floor of
 * 0.35 on the accuracy term means work always shows — a branch you have
 * struggled with still leafs, just thinly.
 */
export function learnedShare(studied: number, gradable: number, accuracy: number | null): number {
  if (!gradable || !studied) return 0;
  const coverage = studied / gradable;
  const confidence = accuracy === null ? 0.5 : 0.35 + (accuracy / 100) * 0.65;
  return Math.max(0, Math.min(1, coverage * confidence));
}

/**
 * How much of what a section learned is still held: over the items ever
 * answered right, each counts in full until it fades to the point where
 * Review asks it again (DUE_BELOW), and in part below that. 1 after
 * studying, falling as cards come due, rising again when they are reviewed.
 *
 * Two things are not forgetting, and are left out. A card never studied:
 * unseen is not forgotten. A card never yet got right: it was never learned,
 * and it already thins the branch through the section's accuracy
 * (learnedShare). Counted here, every miss in a sitting read as a leaf lost
 * a few hours later, and the owner swiped a section studied that day and
 * watched it drop its leaves (2026-11-03). And a card still above the review
 * point is not lost either: a leaf falls when its card is due, the same
 * signal Today acts on.
 */
export function heldShare(section: Section, progress: Record<string, ItemResult>, now: number): number {
  let sum = 0;
  let n = 0;
  for (const { id } of scoredEntries(section.items)) {
    const r = progress[id];
    if (!r || r.got <= 0) continue;
    const R = retrievability(r, now);
    if (R == null) continue;
    sum += Math.min(1, R / DUE_BELOW);
    n++;
  }
  return n ? sum / n : 1;
}

export interface SectionMemory {
  learned: number;
  /** learned × heldShare: what the tree shows in leaf. */
  held: number;
  due: number;
  studied: number;
}

/**
 * The one reading of a section's memory the tree and the Progress page both
 * draw from — so the leaves on a branch and the figures beside its name can
 * never disagree.
 */
export function sectionMemory(
  section: Section,
  progress: Record<string, ItemResult>,
  now: number,
  exam?: ExamRule,
): SectionMemory {
  const stats = sectionStats(section, progress);
  const learned = learnedShare(stats.studied, stats.gradable, stats.accuracy);
  const examAt = exam?.forSection(section.id) ?? null;
  return {
    learned,
    held: learned * heldShare(section, progress, now),
    due: scoredEntries(section.items).filter(({ id }) => isDueFor(progress[id], now, examAt)).length,
    studied: stats.studied,
  };
}
