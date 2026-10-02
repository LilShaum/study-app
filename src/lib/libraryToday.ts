import type { Course } from '@/schema/course';
import type { ItemResult } from '@/store/progress';
import { buildSessionItems } from './buildSessionItems';
import { examRule } from './exam';
import { examTime } from './memory';

export interface CourseToday {
  id: string;
  title: string;
  code?: string;
  minutes: number;
  review: number;
  hasNew: boolean;
  /** Whole days to the exam from this morning, or null with no date or once it has passed. */
  examDays: number | null;
}

/** Whole days from today's local midnight to the exam's day; the same count the course page gives. */
function daysToExam(date: string | undefined, now: number): number | null {
  const at = examTime(date);
  if (at == null) return null;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const exam = new Date(at);
  exam.setHours(0, 0, 0, 0);
  const days = Math.round((exam.getTime() - today.getTime()) / 86_400_000);
  return days < 0 ? null : days;
}

/**
 * What pressing Today would give in each course, ordered by where to start.
 *
 * Each session is built by the same call the course page makes, so the
 * library's answer and the sitting cannot disagree. A course with an exam
 * coming leads, the nearest first; the rest go by how much is waiting to be
 * reviewed, since that is what slips if it is left.
 */
export function todayAcrossCourses(
  courses: Record<string, Course>,
  progressByCourse: Record<string, Record<string, ItemResult>>,
  now: number,
  minutesFor: (courseId: string) => number,
  pace?: Record<string, number>,
): CourseToday[] {
  const out: CourseToday[] = [];
  for (const [id, course] of Object.entries(courses)) {
    const progress = progressByCourse[id] ?? {};
    const minutes = minutesFor(id);
    const items = buildSessionItems(course, 'today', {
      progress,
      now,
      exam: examRule(course, progress, now),
      minutes,
      pace,
    });
    if (items.length === 0) continue;
    out.push({
      id,
      title: course.metadata.title,
      code: course.metadata.course_code?.trim() || undefined,
      minutes,
      review: items.filter((i) => i._block === 'review').length,
      hasNew: items.some((i) => i._block !== 'review'),
      examDays: daysToExam(course.metadata.exam_date, now),
    });
  }
  // Array.prototype.sort is stable, so ties keep the library's order.
  return out.sort((a, b) => {
    if (a.examDays != null && b.examDays != null) return a.examDays - b.examDays;
    if (a.examDays != null) return -1;
    if (b.examDays != null) return 1;
    return b.review - a.review;
  });
}
