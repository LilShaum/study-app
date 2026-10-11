import { ClassExamSchema, type ClassExam, type Course } from '@/schema/course';
import { examTime } from './memory';
import { sortedSections } from './sortedSections';

/**
 * A class's exams: a midterm or two and a final, each covering some lectures
 * and some of their sections.
 *
 * Where they live: on the lectures. Each lecture carries, in
 * `metadata.exams`, the class exams that cover it and which of its own
 * sections they cover. A lecture already syncs, backs up, exports and
 * travels in a share link as one object, so the exams go everywhere it goes
 * with no new table and no new merge rule. The class's list is gathered from
 * its lectures by exam id.
 *
 * The scheduler still asks one lecture for one exam: the nearest upcoming
 * exam that covers it (lectureExam). Once a midterm has passed, its lectures
 * follow the next exam that covers them, usually the final, on their own.
 *
 * A lecture can also have an exam of its own (`exam_date`, `exam_sections`),
 * set on a lecture with no class; it counts the same way.
 */

/**
 * A lecture's class exams, each checked. A backup or a synced copy does not
 * come through parseCourse, and a hand-edited one could hold anything; a bad
 * entry is skipped rather than breaking every screen that plans.
 */
export function examsOf(course: Course): ClassExam[] {
  const list: unknown = course.metadata.exams;
  if (!Array.isArray(list)) return [];
  // Read on every plan of every lecture; a stored list is replaced, never
  // changed in place, so it is checked once.
  const known = checked.get(list);
  if (known) return known;
  const out = list.flatMap((e) => {
    const r = ClassExamSchema.safeParse(e);
    return r.success ? [r.data] : [];
  });
  checked.set(list, out);
  return out;
}
const checked = new WeakMap<object, ClassExam[]>();

export interface LectureExam {
  /** YYYY-MM-DD, or undefined with no exam at all. */
  date?: string;
  /** Section ids it covers, or undefined for all of them. */
  sections?: string[];
  name?: string;
  /** Where it came from: a class exam by id, or the lecture's own. */
  source?: { kind: 'class'; id: string } | { kind: 'own' };
}

/** The exam that steers this lecture now: the nearest upcoming, else the latest past. */
export function lectureExam(course: Course, now: number): LectureExam {
  const m = course.metadata;
  const all: LectureExam[] = examsOf(course).map((e) => ({
    date: e.date,
    sections: e.sections,
    name: e.name,
    source: { kind: 'class', id: e.id } as const,
  }));
  if (m.exam_date) all.push({ date: m.exam_date, sections: m.exam_sections, source: { kind: 'own' } });
  const timed = all.map((e) => ({ e, at: examTime(e.date) })).filter((x): x is { e: LectureExam; at: number } => x.at != null);
  const upcoming = timed.filter((x) => x.at > now).sort((a, b) => a.at - b.at);
  if (upcoming.length) return upcoming[0].e;
  const past = timed.sort((a, b) => b.at - a.at);
  return past[0]?.e ?? {};
}

/** The lecture with its exam's sections replaced, in whichever place that exam lives. */
export function withExamSections(course: Course, sections: string[], now: number): Course {
  const exam = lectureExam(course, now);
  if (exam.source?.kind === 'class') {
    const id = exam.source.id;
    return {
      ...course,
      metadata: { ...course.metadata, exams: examsOf(course).map((e) => (e.id === id ? { ...e, sections } : e)) },
    };
  }
  return { ...course, metadata: { ...course.metadata, exam_sections: sections } };
}

/** The class a lecture belongs to: its class code, trimmed. Null without one. */
export const classOf = (course: Course): string | null => course.metadata.course_code?.trim() || null;

/** The lectures of one class, in library order (by title). */
export function lecturesOf(courses: Record<string, Course>, code: string): [string, Course][] {
  return Object.entries(courses)
    .filter(([, c]) => classOf(c) === code)
    .sort(([, a], [, b]) => a.metadata.title.localeCompare(b.metadata.title, undefined, { numeric: true }));
}

/** What one exam covers in one lecture: every section, or these. */
export type Coverage = 'all' | string[];

export interface ClassExamView {
  id: string;
  name: string;
  date: string;
  /** Lecture id → what it covers there. Lectures it doesn't cover are absent. */
  covers: Record<string, Coverage>;
}

/**
 * A class's exams, gathered from its lectures, the next one first, then the
 * later ones, then those already sat (most recent first).
 *
 * A lecture's own exam (set before classes existed, or on one lecture
 * alone) joins as an exam named "Exam", one per date, so a class keeps what
 * was set and the first save turns it into a list entry.
 */
export function classExams(lectures: [string, Course][], now: number): ClassExamView[] {
  const byId = new Map<string, ClassExamView>();
  for (const [id, course] of lectures) {
    for (const e of examsOf(course)) {
      const view = byId.get(e.id) ?? { id: e.id, name: e.name, date: e.date, covers: {} };
      view.covers[id] = e.sections?.length ? e.sections : 'all';
      byId.set(e.id, view);
    }
    const own = course.metadata.exam_date;
    if (own && examTime(own) != null) {
      const key = `own-${own}`;
      const view = byId.get(key) ?? { id: key, name: 'Exam', date: own, covers: {} };
      view.covers[id] = course.metadata.exam_sections?.length ? course.metadata.exam_sections : 'all';
      byId.set(key, view);
    }
  }
  const at = (v: ClassExamView) => examTime(v.date) ?? 0;
  const list = [...byId.values()];
  const upcoming = list.filter((v) => at(v) > now).sort((a, b) => at(a) - at(b));
  const past = list.filter((v) => at(v) <= now).sort((a, b) => at(b) - at(a));
  return [...upcoming, ...past];
}

/**
 * Every lecture of the class with its exams set from `exams`: each lecture
 * gets the exams that cover it, with its own sections, and its own single
 * exam is folded in (the list replaces it). Returns only lectures that
 * changed. Sections are stored in course order, and "all" as no list, so a
 * section added later joins the exam the way it does today (lib/exam.ts,
 * examAfterAdding).
 */
export function writeClassExams(lectures: [string, Course][], exams: ClassExamView[]): Record<string, Course> {
  const out: Record<string, Course> = {};
  for (const [id, course] of lectures) {
    const order = sortedSections(course).map((s) => s.id);
    const mine: ClassExam[] = exams
      .filter((e) => e.covers[id])
      .map((e) => {
        const c = e.covers[id];
        const sections = c === 'all' ? undefined : order.filter((s) => c.includes(s));
        return sections && sections.length < order.length ? { id: e.id, name: e.name, date: e.date, sections } : { id: e.id, name: e.name, date: e.date };
      });
    const metadata = { ...course.metadata };
    delete metadata.exam_date;
    delete metadata.exam_sections;
    if (mine.length) metadata.exams = mine;
    else delete metadata.exams;
    if (JSON.stringify(metadata) !== JSON.stringify(course.metadata)) out[id] = { ...course, metadata };
  }
  return out;
}

/** A fresh id for a new exam: short, and unique within the class. */
export function newExamId(taken: Iterable<string>): string {
  const used = new Set(taken);
  for (;;) {
    const id = `exam-${Math.random().toString(36).slice(2, 8)}`;
    if (!used.has(id)) return id;
  }
}
