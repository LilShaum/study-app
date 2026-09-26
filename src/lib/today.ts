import type { Course } from '@/schema/course';
import type { ItemResult } from '@/store/progress';
import { examRule } from './exam';
import { isDueFor } from './memory';
import { scoredEntries } from './scored';

/**
 * How today's sitting divides its minutes between Review and Learn.
 *
 * Review first, with whatever is left going to Learn — except in the last
 * few days before an exam, while something it covers is still unstudied,
 * when Review is held to REVIEW_CAP of the sitting and Learn gets the rest.
 *
 * Both halves come from the simulator (sim/FINDINGS.md, 2026-09-26). Capping
 * Review all month was much worse at 30 min/day (28–44% against 50%):
 * everything got seen once and most of it was gone by the exam. Capping it
 * only in the final days was better in almost every scenario and under both
 * memory models — material learned that close to the exam survives to it
 * without reviews, and nothing studied earlier has time to fade.
 */
export const REVIEW_CAP = 0.4;
export const CAP_WITHIN_DAYS = 4;

/** Rough seconds per card, for turning minutes into a number of cards. */
export const REVIEW_SECONDS = 25;

/** A sitting's length when the student has not said. */
export const DEFAULT_MINUTES = 30;

/**
 * Rough seconds a card takes, for fitting a sitting to its minutes. The same
 * figures the simulator's student uses; replace both with measured ones
 * once the study log exists.
 */
const CARD_SECONDS: Record<string, number> = {
  definition: 20,
  example: 40,
  graphic: 30,
  flashcard: 12,
  recall: 15,
  mcq: 35,
};

export const cardSeconds = (item: { type: string }) => CARD_SECONDS[item.type] ?? 20;

export interface Sitting {
  reviewMinutes: number;
  learnMinutes: number;
  /** Due now, and still to learn (for the exam when it has a scope). */
  due: number;
  unseen: number;
}

export function splitSitting(
  course: Course,
  progress: Record<string, ItemResult>,
  now: number,
  minutes: number,
  cap = REVIEW_CAP,
  /** How close to the exam, in days, the cap starts. Null caps whenever something is unseen (sim only). */
  capWithinDays: number | null = CAP_WITHIN_DAYS,
  /** Seconds the due cards will actually take, when the caller has them; estimated otherwise. */
  dueSeconds?: number,
): Sitting {
  const exam = examRule(course, progress, now);
  let due = 0;
  let unseenAll = 0;
  for (const section of course.sections) {
    for (const { id } of scoredEntries(section.items)) {
      const r = progress[id];
      if (!r || r.got + r.missed === 0) unseenAll++;
      else if (isDueFor(r, now, exam.forItem(id))) due++;
    }
  }
  // With a date, what matters is what the exam covers; without, everything.
  const unseen = exam.at != null ? exam.unseen : unseenAll;
  const reviewNeed = (dueSeconds ?? due * REVIEW_SECONDS) / 60;
  const capping = unseen > 0 && (capWithinDays == null || (exam.at != null && exam.at - now <= capWithinDays * 86_400_000));
  const reviewMinutes = Math.min(reviewNeed, capping ? minutes * cap : minutes);
  return { reviewMinutes, learnMinutes: minutes - reviewMinutes, due, unseen };
}
