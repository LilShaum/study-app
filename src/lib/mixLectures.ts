import type { SessionItem } from './buildSessionItems';
import type { ItemResult } from '@/store/progress';

/** One lecture's practice list, as its own session would ask it. */
export interface LectureList {
  courseId: string;
  items: SessionItem[];
  /** The lecture's progress: a typed term asked straight after one it was mistaken for stays with it. */
  progress?: Record<string, ItemResult>;
}

/**
 * A typed term placed after the card it was mistaken for (buildSessionItems,
 * pairConfusions) travels with that card: the pair is the point.
 */
function unitsOf(items: SessionItem[], progress?: Record<string, ItemResult>): SessionItem[][] {
  const units: SessionItem[][] = [];
  for (const item of items) {
    const unit = units[units.length - 1];
    const partner =
      !!unit && item.type === 'recall' && !item.question && (progress?.[unit[0].id]?.confusedWith ?? []).includes(item.target.id);
    if (partner) unit.push(item);
    else units.push([item]);
  }
  return units;
}

/**
 * Several lectures' practice as one sitting, the lectures mixed.
 *
 * Each lecture keeps its own order (faintest first, weakest first, or its
 * shuffle) and is spread evenly over the whole sitting: card i of a lecture
 * with n lands somewhere in the i-th n-th of it, at random within that
 * slice. So the lectures alternate from the first card to the last, a
 * sitting cut short has asked each lecture's most pressing cards, and two
 * cards of one lecture only move further apart than in its own session
 * (which keeps Review's spacing of related cards). Every card carries its
 * lecture (`_courseId`), which is where its answer is recorded.
 *
 * Why mix at all: telling apart ideas that look alike (two disorders, two
 * pathways from different lectures) is what an exam asks, and practice that
 * mixes related topics did better than practice one topic at a time, a
 * month on, in real science classes (docs/evidence.md, Sana & Yan 2022).
 * It stays a choice: for material that is not alike, and for words, one
 * block at a time did as well or better (Brunmair & Richter 2019; Carvalho &
 * Goldstone 2014). The simulator cannot see either effect: its student has
 * no notion of telling two ideas apart (sim/FINDINGS.md, 2026-10-18).
 */
export function mixLectures(lists: LectureList[], random: () => number = Math.random): SessionItem[] {
  const placed: { at: number; lecture: number; unit: SessionItem[] }[] = [];
  lists.forEach(({ courseId, items, progress }, lecture) => {
    const units = unitsOf(items, progress);
    units.forEach((unit, i) =>
      placed.push({
        // Within [i/n, (i+1)/n): random enough not to fall into a pattern,
        // and never ahead of the lecture's own card before it.
        at: (i + Math.min(random(), 0.999999)) / units.length,
        lecture,
        unit: unit.map((item) => ({ ...item, _courseId: courseId })),
      }),
    );
  });
  return placed.sort((a, b) => a.at - b.at || a.lecture - b.lecture).flatMap((p) => p.unit);
}
