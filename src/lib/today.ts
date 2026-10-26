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
// The first student's own medians (their study log, 2026-10-12), which
// replaced guesses that ran about a quarter short: a typed term took 25 s,
// not 15. A device's own times take over once it has enough of a type
// (store/studyLog, measuredPace).
const CARD_SECONDS: Record<string, number> = {
  definition: 22,
  // Read once, 2 to 4 sentences: a guess, as sim/student.ts has it.
  explain: 30,
  example: 40,
  graphic: 25,
  flashcard: 13,
  recall: 25,
  mcq: 40,
  preview: 5,
};

/** Seconds a card takes: measured on this device when there is enough (store/studyLog), guessed otherwise. */
export const cardSeconds = (item: { type: string }, pace?: Record<string, number>) =>
  pace?.[item.type] ?? CARD_SECONDS[item.type] ?? 20;

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

/**
 * In the last days before an exam, the day's time in parts a few hours
 * apart. Simulated (sim/FINDINGS.md, 2026-10-12): the last three days in
 * three sittings three hours apart beat one sitting by about 2 to 3 points
 * under both students, while a separate Cram mode (the weakest cards
 * drilled first, new material without its examples) lost 6 to 9 points by
 * re-drilling the same cards and leaving more of the exam never studied.
 */
export const PARTS_WITHIN_DAYS = 3;
export const PARTS = 3;
export const PART_GAP_HOURS = 3;
/** A day's time below this stays one sitting however close the exam: a part would be too short to be one. */
export const PARTS_FROM_MINUTES = 30;

/** Minutes in one part of the day, or null when the day is one sitting. `examDays` as libraryToday's daysToExam. */
export function partMinutes(planned: number, examDays: number | null): number | null {
  if (examDays == null || examDays < 1 || examDays > PARTS_WITHIN_DAYS || planned < PARTS_FROM_MINUTES) return null;
  return planned / PARTS;
}

/** A second, short sitting later the same day, for what has come due since: mostly that day's misses. */
export const CATCH_UP_MINUTES = 5;

/** How many studied items are due now (exam timing included). */
export function dueCount(course: Course, progress: Record<string, ItemResult>, now: number): number {
  const exam = examRule(course, progress, now);
  let n = 0;
  for (const section of course.sections)
    for (const { id } of scoredEntries(section.items)) if (isDueFor(progress[id], now, exam.forItem(id))) n++;
  return n;
}

/**
 * Minutes for a Today sitting opened now: what is left of the day's plan
 * after what was already studied today. Once the plan is spent, a short
 * catch-up while anything is due, and nothing otherwise.
 *
 * The catch-up is the simulator's finding (sim/FINDINGS.md, 2026-10-02): a
 * five-minute second sitting a few hours after the first, on the cards that
 * have come due since, was worth several points on the exam under both
 * simulated students, taken out of the same daily time.
 */
export function minutesLeft(
  planned: number,
  studiedSeconds: number,
  due: number,
  /** Near an exam, one part of the day (partMinutes): no sitting is longer. */
  part: number | null = null,
): { minutes: number; catchUp: boolean } {
  const left = planned - studiedSeconds / 60;
  const sized = (m: number) => (part != null ? Math.min(m, part) : m);
  // Nothing studied yet: the plan itself, however small. A short share of a
  // daily time split between courses (lib/dailyShare) is still a sitting,
  // not a plan already spent.
  if (studiedSeconds <= 0 && planned > 0) return { minutes: sized(planned), catchUp: false };
  if (left >= CATCH_UP_MINUTES) return { minutes: sized(left), catchUp: false };
  return due > 0 ? { minutes: CATCH_UP_MINUTES, catchUp: true } : { minutes: 0, catchUp: false };
}
