import type { Course } from '@/schema/course';
import type { ItemResult } from '@/store/progress';
import { usePlanStore } from '@/store/plan';
import { dayKey, useStudyLogStore } from '@/store/studyLog';
import { dueCount, minutesLeft } from './today';

/** Seconds studied in a course so far today, from the study log. */
export function studiedToday(courseId: string, now: number): number {
  return useStudyLogStore.getState().byCourse[courseId]?.days[dayKey(now)] ?? 0;
}

/**
 * The minutes a Today sitting opened now gets (lib/today.ts, minutesLeft).
 * `fullDay` is "Keep going": the student chose to carry on past the plan,
 * so it is planned afresh at the full daily time.
 */
export function todaySitting(
  courseId: string,
  course: Course,
  progress: Record<string, ItemResult>,
  now: number,
  fullDay = false,
): { minutes: number; catchUp: boolean } {
  const planned = usePlanStore.getState().minutesFor(courseId);
  if (fullDay) return { minutes: planned, catchUp: false };
  return minutesLeft(planned, studiedToday(courseId, now), dueCount(course, progress, now));
}
