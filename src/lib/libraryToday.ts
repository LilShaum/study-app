import type { Course } from '@/schema/course';
import { lectureExam } from '@/lib/classExams';
import type { ItemResult } from '@/store/progress';
import { buildSessionItems } from './buildSessionItems';
import { examRule } from './exam';
import { examTime } from './memory';
import { dueCount, minutesLeft, partMinutes } from './today';

export interface CourseToday {
  id: string;
  title: string;
  code?: string;
  minutes: number;
  /** Today's time is spent; this is the short second sitting for what came due since. */
  catchUp: boolean;
  review: number;
  hasNew: boolean;
  /** Whole days to the exam from this morning, or null with no date or once it has passed. */
  examDays: number | null;
}

/** Whole days from today's local midnight to the exam's day; the same count the course page gives. */
export function daysToExam(date: string | undefined, now: number): number | null {
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
  /** Seconds already studied today in a course (store/studyLog). */
  studiedToday: (courseId: string) => number = () => 0,
): CourseToday[] {
  const out: CourseToday[] = [];
  const paceKey = JSON.stringify(pace ?? {});
  for (const [id, course] of Object.entries(courses)) {
    const progress = progressByCourse[id] ?? {};
    const planned = minutesFor(id);
    const studied = studiedToday(id);
    // The same lecture, progress, time and day as last time: the same answer.
    const key = `${id}|${planned}|${studied}|${paceKey}|${Math.floor(now / REUSE_MS)}`;
    const memo = remembered.get(course);
    if (memo && memo.progress === progressByCourse[id] && memo.key === key) {
      if (memo.value) out.push(memo.value);
      continue;
    }
    const value = courseToday(id, course, progress, now, planned, studied, pace);
    remembered.set(course, { progress: progressByCourse[id], key, value });
    if (value) out.push(value);
  }
  // Array.prototype.sort is stable, so ties keep the library's order.
  return sortToday(out);
}

/**
 * Each lecture's answer, kept until the lecture, its progress, the time to
 * spend or the minute changes (the clock only in steps of REUSE_MS: a card
 * that falls due a minute later shows in the sitting itself). Coming back to
 * the library from a lecture page rebuilt every lecture's Today, the
 * library's main cost after the first visit (docs/audits/2026-10-17).
 */
const REUSE_MS = 60_000;
const remembered = new WeakMap<Course, { progress: Record<string, ItemResult> | undefined; key: string; value: CourseToday | null }>();

function courseToday(
  id: string,
  course: Course,
  progress: Record<string, ItemResult>,
  now: number,
  planned: number,
  studied: number,
  pace?: Record<string, number>,
): CourseToday | null {
  const part = partMinutes(planned, daysToExam(lectureExam(course, now).date, now));
  const { minutes, catchUp } = minutesLeft(planned, studied, dueCount(course, progress, now), part);
  const items = buildSessionItems(course, 'today', {
    progress,
    now,
    exam: examRule(course, progress, now),
    minutes,
    pace,
  });
  if (items.length === 0) return null;
  return {
    id,
    title: course.metadata.title,
    code: course.metadata.course_code?.trim() || undefined,
    minutes,
    catchUp,
    review: items.filter((i) => i._block === 'review').length,
    hasNew: items.some((i) => i._block !== 'review'),
    examDays: daysToExam(lectureExam(course, now).date, now),
  };
}

function sortToday(out: CourseToday[]): CourseToday[] {
  return out.sort((a, b) => {
    if (a.examDays != null && b.examDays != null) return a.examDays - b.examDays;
    if (a.examDays != null) return -1;
    if (b.examDays != null) return 1;
    return b.review - a.review;
  });
}

/** "12 to review · new material · exam in 4 days" — only the parts that apply. */
export function todayLine(c: CourseToday): string {
  return [
    c.catchUp ? null : `${Math.round(c.minutes)} min`,
    c.catchUp ? `catch-up: ${c.review} to look at again` : c.review > 0 ? `${c.review} to review` : null,
    c.hasNew ? 'new material' : null,
    c.examDays === 0 ? 'exam today' : c.examDays === 1 ? 'exam tomorrow' : c.examDays != null ? `exam in ${c.examDays} days` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}
