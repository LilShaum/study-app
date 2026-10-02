/**
 * One daily time, shared between courses.
 *
 * A student has one amount of time a day, not one per course. The simulator
 * tried splitting it four ways between three courses with exams 12, 21 and
 * 31 days off (sim/several.sim.ts; sim/FINDINGS.md, 2026-10-02). A share in
 * proportion to 1 / days left beat an equal split at 45, 60 and 90 minutes a
 * day under both simulated students — by 6 to 12 points on the average exam
 * under one, 4 to 5 under the other — and left the three exams closer
 * together, not further apart. Giving a course in its last week a bigger
 * fixed share did less well than the plain proportion.
 */

/** A course with no exam date counts as one this far off. */
export const NO_EXAM_DAYS = 30;

export interface ShareCourse {
  id: string;
  /** Whole days to the exam, or null with no date (or once it has passed). */
  examDays: number | null;
  /** Whether there is anything to do in it: nothing due and nothing new takes no time. */
  active: boolean;
}

export function shareMinutes(total: number, courses: ShareCourse[]): Record<string, number> {
  const weight = (c: ShareCourse) => (c.active ? 1 / Math.max(1, c.examDays ?? NO_EXAM_DAYS) : 0);
  const sum = courses.reduce((n, c) => n + weight(c), 0);
  return Object.fromEntries(courses.map((c) => [c.id, sum > 0 ? (total * weight(c)) / sum : 0]));
}
