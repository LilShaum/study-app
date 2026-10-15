import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useCoursesStore } from '@/store/courses';
import { EMPTY_PROGRESS, useProgressStore } from '@/store/progress';
import { usePlanStore } from '@/store/plan';
import { measuredPace, useStudyLogStore } from '@/store/studyLog';
import { classExams, lecturesOf, type ClassExamView } from '@/lib/classExams';
import { examLabel } from '@/lib/examLabel';
import { todayAcrossCourses, todayLine } from '@/lib/libraryToday';
import { plannedMinutes, studiedToday } from '@/lib/todaySitting';
import { scoredEntries } from '@/lib/scored';
import { roman } from '@/lib/roman';
import { examTime } from '@/lib/memory';
import type { Course } from '@/schema/course';
import type { ItemResult } from '@/store/progress';
import { CourseTree } from '@/components/CourseTree';
import { ClassExamDialog } from '@/components/ClassExamDialog';
import { NewCourseDialog } from '@/components/NewCourseDialog';
import { Icon } from '@/components/Icon';

/** How far into a lecture the student is: never opened, partway, every item answered once. */
function studied(course: Course, progress: Record<string, ItemResult>): string {
  const ids = course.sections.flatMap((s) => scoredEntries(s.items).map((e) => e.id));
  if (!ids.length) return '';
  const done = ids.filter((id) => (progress[id]?.got ?? 0) + (progress[id]?.missed ?? 0) > 0).length;
  if (done === 0) return 'not started';
  if (done === ids.length) return 'all studied';
  return `${Math.round((done / ids.length) * 100)}% studied`;
}

/** "I–III, V, part of VI": the lectures an exam covers, by their numbers on this page. */
function coverage(exam: ClassExamView, lectures: [string, Course][]): string {
  const out: string[] = [];
  let run: number[] = [];
  const flush = () => {
    if (run.length) out.push(run.length > 2 ? `${roman(run[0])}–${roman(run[run.length - 1])}` : run.map(roman).join(', '));
    run = [];
  };
  lectures.forEach(([id], i) => {
    const c = exam.covers[id];
    if (c === 'all') run.push(i + 1);
    else {
      flush();
      if (c) out.push(`part of ${roman(i + 1)}`);
    }
  });
  flush();
  return out.length ? `On it: ${out.join(', ')}` : 'Nothing ticked';
}

/**
 * "/class/:code" — a class: its lectures in order, its exams, and Today for
 * all of it.
 *
 * A class is the class code its lectures share; there is no class object to
 * create or lose. Today here starts in the class's lecture with the nearest
 * exam and carries on through the others (the same split the library uses).
 */
export function ClassRoute() {
  const { code: raw } = useParams<{ code: string }>();
  const code = raw ?? '';
  const courses = useCoursesStore((s) => s.courses);
  const allProgress = useProgressStore((s) => s.byCourse);
  const [now] = useState(Date.now);
  const lectures = useMemo(() => lecturesOf(courses, code), [courses, code]);
  const exams = useMemo(() => classExams(lectures, now), [lectures, now]);
  const total = usePlanStore((s) => s.total);
  const logs = useStudyLogStore((s) => s.byCourse);
  const pace = useMemo(() => measuredPace(logs), [logs]);
  const todays = useMemo(
    () =>
      todayAcrossCourses(
        Object.fromEntries(lectures),
        allProgress,
        now,
        (id) => plannedMinutes(id, now),
        pace,
        (id) => studiedToday(id, now),
      ),
    // `total` is read through plannedMinutes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lectures, allProgress, now, total, pace],
  );
  const [editing, setEditing] = useState<ClassExamView | 'new' | null>(null);
  const [adding, setAdding] = useState(false);

  if (!lectures.length) {
    return (
      <div className="py-6 text-center text-text-2">
        No lectures in {code}.{' '}
        <Link to="/" className="text-accent hover:underline">
          Back to Library
        </Link>
      </div>
    );
  }

  const subject = lectures.map(([, c]) => c.metadata.subject).find(Boolean);
  const next = exams.find((e) => (examTime(e.date) ?? 0) > now);
  const first = todays[0];

  return (
    <div>
      <Link to="/" className="tap-safe inline-flex items-center text-sm text-text-2 hover:text-text">
        ← Library
      </Link>

      <h1 className="mt-4 font-display text-display font-semibold text-text">{code}</h1>
      <p className="mark mt-1 text-text-3">
        {[subject, `${lectures.length} lecture${lectures.length === 1 ? '' : 's'}`, next ? `${next.name} ${examLabel(next.date)}` : null]
          .filter(Boolean)
          .join(' · ')}
      </p>

      <section className="mt-7">
        <ul className="border-y-2 border-text-3">
          <li className="flex items-center gap-4 py-4">
            <div className="min-w-0 flex-1">
              <span className="block font-display text-heading font-semibold text-text">Today</span>
              <span className="block text-small text-text-2">
                {first
                  ? `${first.title}: ${todayLine(first)}${todays.length > 1 ? `; then ${todays.length - 1} more lecture${todays.length === 2 ? '' : 's'}` : ''}`
                  : 'Nothing to do in this class today. What you have studied is still fresh.'}
              </span>
            </div>
            {first && (
              <Link to={`/session/${first.id}/today?class=${encodeURIComponent(code)}`} className="press press-ink tap-safe shrink-0">
                Start
              </Link>
            )}
          </li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="mark mb-2 text-text-3">Exams</h2>
        {exams.length > 0 ? (
          <ul className="border-t border-border">
            {exams.map((e) => {
              const past = (examTime(e.date) ?? 0) <= now;
              return (
                <li key={e.id} className="border-b border-border">
                  <button
                    type="button"
                    onClick={() => setEditing(e)}
                    className="group tap-safe flex w-full items-baseline gap-3 py-3 text-left"
                  >
                    <span className="min-w-0 flex-1">
                      <span className={`block font-display text-body font-semibold ${past ? 'text-text-3' : 'text-text group-hover:text-accent'}`}>
                        {e.name}
                      </span>
                      <span className="block text-small text-text-2">{coverage(e, lectures)}</span>
                    </span>
                    <span className={`mark shrink-0 text-right ${past ? 'text-text-3' : 'text-text-2'}`}>{examLabel(e.date)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="border-y border-border py-3 text-small text-text-2">
            No exams set. Add each one (a midterm, the final) and tick what it covers: each lecture is then planned
            for the next exam it is on.
          </p>
        )}
        <button type="button" onClick={() => setEditing('new')} className="press tap-safe mt-3">
          <Icon name="plus" size={13} />
          Add an exam
        </button>
        {/* The test an exam covers, from every lecture on it; past exams are
            left out, the whole class is always there. */}
        <p className="mt-4 text-small text-text-2">
          <span className="mark mr-2 text-text-3">Practice test</span>
          {exams
            .filter((e) => (examTime(e.date) ?? 0) > now)
            .map((e) => (
              <span key={e.id}>
                <Link
                  to={`/class/${encodeURIComponent(code)}/test?exam=${encodeURIComponent(e.id)}`}
                  className="text-accent underline-offset-4 hover:underline"
                >
                  {e.name}
                </Link>
                <span className="mx-1.5 text-text-3">·</span>
              </span>
            ))}
          <Link to={`/class/${encodeURIComponent(code)}/test`} className="text-accent underline-offset-4 hover:underline">
            the whole class
          </Link>
        </p>
      </section>

      <section className="mt-8">
        <h2 className="mark mb-2 text-text-3">Lectures</h2>
        <ul className="border-t border-border">
          {lectures.map(([id, course], i) => {
            const progress = allProgress[id] ?? EMPTY_PROGRESS;
            const items = course.sections.reduce((n, s) => n + s.items.length, 0);
            return (
              <li key={id} className="group border-b border-border">
                <Link to={`/study/${id}`} className="entry py-3 pr-2">
                  <span className="entry-num mark text-right text-text-3">{roman(i + 1)}</span>
                  <CourseTree courseId={id} course={course} progress={progress} className="entry-art h-10 w-10 sm:h-12 sm:w-12" />
                  <span className="entry-body min-w-0">
                    <span className="flex items-baseline gap-2">
                      <span className="font-display text-body font-semibold leading-snug text-text group-hover:text-accent">
                        {course.metadata.title}
                      </span>
                      <span className="leaders hidden sm:block" aria-hidden="true" />
                    </span>
                  </span>
                  <span className="entry-figs tabular-nums">
                    <span className="mark block text-text-2">
                      {items} item{items === 1 ? '' : 's'}
                    </span>
                    <span className="mark block text-text-3">{studied(course, progress)}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        <button type="button" onClick={() => setAdding(true)} className="press tap-safe mt-3">
          <Icon name="plus" size={13} />
          Add a lecture
        </button>
      </section>

      {editing && (
        <ClassExamDialog
          code={code}
          lectures={lectures}
          exams={exams}
          exam={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
      {adding && <NewCourseDialog classCode={code} onClose={() => setAdding(false)} />}
    </div>
  );
}
