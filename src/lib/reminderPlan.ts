import type { Course } from '@/schema/course';
import type { ItemResult } from '@/store/progress';
import type { ReminderSettings } from '@/store/reminders';
import { lectureExam } from './classExams';
import { daysToExam } from './libraryToday';
import { CATCH_UP_HOURS, missedThisSitting } from './memory';
import { scoredEntries } from './scored';
import { dueCount } from './today';

/**
 * The next week of reminders, worked out on the device, which has the memory
 * model and the lectures; the server only sends them at their time
 * (docs/proposals/notifications.md). Planned again each time the app opens
 * or is put away, so what is said is never more than a day out of date and a
 * day already studied loses its reminder.
 *
 * Never a streak, never "you haven't studied": each one says what is there.
 */
export interface Reminder {
  kind: 'daily' | 'second-look' | 'exam';
  sendAt: number;
  title: string;
  body: string;
  /** Hash route the tap opens, e.g. "#/study/abc". */
  url: string;
}

export interface PlanInput {
  courses: Record<string, Course>;
  progress: Record<string, Record<string, ItemResult>>;
  now: number;
  settings: Pick<ReminderSettings, 'daily' | 'time' | 'secondLook' | 'exam'>;
  /** The day's planned minutes for a course (lib/todaySitting, plannedMinutes). */
  minutesFor: (courseId: string, at: number) => number;
  /** Seconds studied today in all courses together. */
  studiedTodaySeconds: number;
}

const DAYS = 7;
const HOUR = 3_600_000;
/** No second look between these hours; the daily reminder covers the morning. */
const QUIET_FROM = 22;
const QUIET_UNTIL = 8;

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function atTime(now: number, dayOffset: number, time: string): number {
  const [h, m] = time.split(':').map(Number);
  const d = new Date(now);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(h || 0, m || 0, 0, 0);
  return d.getTime();
}

const nameOf = (c: Course) => c.metadata.course_code?.trim() || c.metadata.title;
const unstudied = (c: Course, p: Record<string, ItemResult>) =>
  c.sections.reduce((n, s) => n + scoredEntries(s.items).filter(({ id }) => !p[id]).length, 0);

/** What a day holds at `at`, as one line, or null when there is nothing to do. */
function dayLine(input: PlanInput, at: number): string | null {
  const work = Object.entries(input.courses)
    .map(([id, c]) => {
      const p = input.progress[id] ?? {};
      return { id, c, due: dueCount(c, p, at), fresh: unstudied(c, p) };
    })
    .filter((w) => w.due > 0 || w.fresh > 0);
  if (!work.length) return null;
  const minutes = Math.round(work.reduce((n, w) => n + input.minutesFor(w.id, at), 0));
  const top = [...work].sort((a, b) => b.due - a.due)[0]!;
  const others = work.length - 1;
  const what = top.due > 0 ? `${top.due} to review in ${nameOf(top.c)}` : `New material in ${nameOf(top.c)}`;
  const more = others > 0 ? `, and ${plural(others, 'more lecture')}` : '';
  return `${what}${more}.${minutes > 0 ? ` About ${minutes} minutes.` : ''}`;
}

interface ExamDay {
  title: string;
  url: string;
  toLearn: number;
}

/** Exams three days or one day away on the day of `at`, one per exam even when it covers several lectures. */
function examsOn(input: PlanInput, at: number): ExamDay[] {
  const byExam = new Map<string, ExamDay>();
  for (const [id, c] of Object.entries(input.courses)) {
    const exam = lectureExam(c, at);
    const days = daysToExam(exam.date, at);
    if (days !== 3 && days !== 1) continue;
    const code = c.metadata.course_code?.trim();
    const key = `${code ?? id}|${exam.name ?? ''}|${exam.date}`;
    const label = exam.name ? `${code ? `${code} ` : ''}${exam.name}` : `${code ?? c.metadata.title} exam`;
    const prev = byExam.get(key);
    const toLearn = unstudied(c, input.progress[id] ?? {}) + (prev?.toLearn ?? 0);
    byExam.set(key, {
      title: `${label} ${days === 1 ? 'tomorrow' : 'in 3 days'}`,
      url: code ? `#/class/${encodeURIComponent(code)}` : `#/study/${id}`,
      toLearn,
    });
  }
  return [...byExam.values()];
}

/** The latest sitting's misses, ready a few hours on (lib/memory, catchUpDue). */
function secondLook(input: PlanInput): Reminder | null {
  let best: { id: string; c: Course; at: number; count: number } | null = null;
  for (const [id, c] of Object.entries(input.courses)) {
    const p = input.progress[id] ?? {};
    const missed = c.sections
      .flatMap((s) => scoredEntries(s.items))
      .map(({ id: itemId }) => p[itemId])
      .filter(
        (r): r is ItemResult => missedThisSitting(r) && r!.lastSeen != null && r!.lastSeen > input.now - CATCH_UP_HOURS * HOUR,
      );
    if (!missed.length) continue;
    const last = Math.max(...missed.map((r) => r.lastSeen!));
    if (!best || last > best.at) best = { id, c, at: last, count: missed.length };
  }
  if (!best) return null;
  const sendAt = best.at + CATCH_UP_HOURS * HOUR;
  const hour = new Date(sendAt).getHours();
  if (hour >= QUIET_FROM || hour < QUIET_UNTIL) return null;
  return {
    kind: 'second-look',
    sendAt,
    title: 'Ready for a second look',
    body: `${best.count === 1 ? 'The one' : `The ${best.count}`} you missed in ${nameOf(best.c)} ${best.count === 1 ? 'is' : 'are'} worth another try now.`,
    url: `#/study/${best.id}`,
  };
}

export function planReminders(input: PlanInput): Reminder[] {
  const { now, settings } = input;
  const out: Reminder[] = [];
  if (settings.daily || settings.exam) {
    for (let day = 0; day < DAYS; day++) {
      const at = atTime(now, day, settings.time);
      if (at <= now) continue;
      const exams = settings.exam ? examsOn(input, at) : [];
      // A day already studied in full loses its daily reminder; an exam's stays.
      const studiedEnough =
        day === 0 &&
        input.studiedTodaySeconds >= 60 * Object.keys(input.courses).reduce((n, id) => n + input.minutesFor(id, at), 0);
      const line = settings.daily && !studiedEnough ? dayLine(input, at) : null;
      if (exams.length) {
        // One notification for the day: the nearest exam leads, the day's line under it.
        const e = exams[0]!;
        const body =
          line ??
          (e.toLearn > 0 ? `${e.toLearn} still to learn.` : 'Everything in it has been studied; a review keeps it there.');
        out.push({
          kind: 'exam',
          sendAt: at,
          title: e.title,
          body,
          url: e.url,
        });
      } else if (line) {
        out.push({
          kind: 'daily',
          sendAt: at,
          title: 'Today’s study',
          body: line,
          url: '#/',
        });
      }
    }
  }
  if (settings.secondLook) {
    const look = secondLook(input);
    if (look && look.sendAt > now) out.push(look);
  }
  return out.sort((a, b) => a.sendAt - b.sendAt);
}
