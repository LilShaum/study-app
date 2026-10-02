import type { Course } from '@/schema/course';
import type { ItemResult } from '@/store/progress';
import { usePlanStore } from '@/store/plan';
import { dayKey, useStudyLogStore } from '@/store/studyLog';
import { useCoursesStore } from '@/store/courses';
import { useProgressStore } from '@/store/progress';
import { scoredEntries } from './scored';
import { daysToExam } from './libraryToday';
import { shareMinutes } from './dailyShare';
import { dueCount, minutesLeft } from './today';

/** Seconds studied in a course so far today, from the study log. */
export function studiedToday(courseId: string, now: number): number {
  return useStudyLogStore.getState().byCourse[courseId]?.days[dayKey(now)] ?? 0;
}

/** Whether a course has anything to do today: something due, or something never studied. */
function hasWork(course: Course, progress: Record<string, ItemResult>, now: number): boolean {
  if (dueCount(course, progress, now) > 0) return true;
  return course.sections.some((s) => scoredEntries(s.items).some(({ id }) => !progress[id]));
}

/**
 * The day's minutes for a course: its own setting, or, with one daily time
 * for all courses, its share of that (lib/dailyShare.ts).
 */
export function plannedMinutes(courseId: string, now: number): number {
  const plan = usePlanStore.getState();
  if (plan.total == null) return plan.minutesFor(courseId);
  const courses = useCoursesStore.getState().courses;
  const progress = useProgressStore.getState().byCourse;
  const share = shareMinutes(
    plan.total,
    Object.entries(courses).map(([id, c]) => ({
      id,
      examDays: daysToExam(c.metadata.exam_date, now),
      active: hasWork(c, progress[id] ?? {}, now),
    })),
  );
  return share[courseId] ?? 0;
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
  const planned = plannedMinutes(courseId, now);
  if (fullDay) return { minutes: planned, catchUp: false };
  return minutesLeft(planned, studiedToday(courseId, now), dueCount(course, progress, now));
}
