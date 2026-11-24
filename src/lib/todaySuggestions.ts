import type { Course } from '@/schema/course';
import { daysToExam } from './libraryToday';
import { classExams, classOf, lectureExam, lectureName } from './classExams';

/**
 * Today on the library, as suggestions (the owner, 2026-11-22: "there will
 * never be a day when I need to review everything I have … it should be
 * replaced with some sort of suggestion with what to study today";
 * docs/proposals/ecosystem.md). Two to four lines, each one tap into an
 * existing way to study, ranked by the nearest exam, then what is fading,
 * then where Learn left off, then a lecture not yet started. Nothing
 * splits a daily time across lectures.
 */
export interface Suggestion {
  /** Stable, for React. */
  key: string;
  /** The class code, or the lecture's title when it has no class. */
  who: string;
  /** What and why, in a few words: "23 fading · midterm in 4 days". */
  what: string;
  /** The button. */
  action: string;
  to: string;
}

export interface LectureState {
  id: string;
  course: Course;
  /** Cards due now. */
  due: number;
  /** Any card ever answered. */
  started: boolean;
  /** Learn was left partway. */
  learnUnderWay: boolean;
}

const MAX = 4;
const PER_CLASS = 2;
/** From this many days out, a class's practice test is suggested. */
const TEST_DAYS = 3;

const examIn = (days: number | null) =>
  days == null ? null : days === 0 ? 'exam today' : days === 1 ? 'exam tomorrow' : `exam in ${days} days`;

export function todaySuggestions(lectures: readonly LectureState[], now: number): Suggestion[] {
  // A class, or a lecture on its own, is one group, in the library's order.
  const groups = new Map<string, LectureState[]>();
  for (const l of lectures) {
    const key = classOf(l.course) ?? `lecture:${l.id}`;
    groups.set(key, [...(groups.get(key) ?? []), l]);
  }
  const ranked = [...groups.entries()].map(([key, ls]) => {
    const code = key.startsWith('lecture:') ? null : key;
    // A class whose exams are all behind it is finished: nothing to suggest.
    const exams = code ? classExams(ls.map((l) => [l.id, l.course] as [string, Course]), now) : [];
    if (exams.length && exams.every((e) => daysToExam(e.date, now) == null)) return { days: null, due: 0, lines: [] as Suggestion[] };
    const days = ls
      .map((l) => daysToExam(lectureExam(l.course, now).date, now))
      .filter((d): d is number => d != null)
      .sort((a, b) => a - b)[0] ?? null;
    const due = ls.reduce((n, l) => n + l.due, 0);
    const name = (l: LectureState) => (code ? lectureName(l.course.metadata.title, code) : l.course.metadata.title);
    const who = code ?? ls[0].course.metadata.title;
    const lines: Suggestion[] = [];
    const exam = examIn(days);
    if (days != null && days <= TEST_DAYS && code)
      lines.push({ key: `${key}:test`, who, what: exam!, action: 'Practice test', to: `/class/${encodeURIComponent(code)}/test` });
    if (due > 0)
      lines.push({
        key: `${key}:review`,
        who,
        // Plain words until the first run teaches "fading" (the owner, 2026-11-24).
        what: [`${due} question${due === 1 ? '' : 's'} to review`, exam].filter(Boolean).join(' · '),
        action: 'Review',
        // Today's sitting: what is fading first. The adaptive quiz was tried
        // here and did a little worse in the simulator (sim/FINDINGS.md,
        // 2026-11-24), so Today stays the daily way in.
        to: code ? `/session/${ls.find((l) => l.due > 0)!.id}/today?class=${encodeURIComponent(code)}` : `/session/${ls[0].id}/today?single=1`,
      });
    const underWay = ls.find((l) => l.learnUnderWay);
    if (underWay)
      lines.push({ key: `${key}:carry`, who, what: name(underWay), action: 'Carry on in Learn', to: `/session/${underWay.id}/learn?resume=1` });
    const fresh = ls.find((l) => !l.started && !l.learnUnderWay);
    if (fresh) lines.push({ key: `${key}:new`, who, what: `${name(fresh)}, not started`, action: 'Learn', to: `/session/${fresh.id}/learn` });
    return { days, due, lines: lines.slice(0, PER_CLASS) };
  });
  // The nearest exam first; then the most fading.
  ranked.sort((a, b) => (a.days ?? Infinity) - (b.days ?? Infinity) || b.due - a.due);
  // Each class's first line before any class's second.
  const out: Suggestion[] = [];
  for (let round = 0; round < PER_CLASS; round++)
    for (const r of ranked) if (r.lines[round] && out.length < MAX) out.push(r.lines[round]);
  return out;
}
