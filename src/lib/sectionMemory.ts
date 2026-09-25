import type { Section } from '@/schema/course';
import type { ItemResult } from '@/store/progress';
import { examTime, isDueFor, retrievability } from './memory';
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
 * How much of what a section learned would still be recalled now: the mean
 * recall chance (lib/memory.ts) over the items studied in it. 1 straight
 * after studying, falling as they fade, rising again when they are reviewed.
 * Items never studied are not counted — unseen is not forgotten.
 */
export function heldShare(section: Section, progress: Record<string, ItemResult>, now: number): number {
  let sum = 0;
  let n = 0;
  for (const { id } of scoredEntries(section.items)) {
    const R = retrievability(progress[id], now);
    if (R == null) continue;
    sum += R;
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
  examDate?: string,
): SectionMemory {
  const stats = sectionStats(section, progress);
  const learned = learnedShare(stats.studied, stats.gradable, stats.accuracy);
  const examAt = examTime(examDate);
  return {
    learned,
    held: learned * heldShare(section, progress, now),
    due: scoredEntries(section.items).filter(({ id }) => isDueFor(progress[id], now, examAt)).length,
    studied: stats.studied,
  };
}
