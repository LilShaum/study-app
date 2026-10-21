import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { useCoursesStore } from '@/store/courses';
import { EMPTY_PROGRESS, useProgressStore } from '@/store/progress';
import { sortedSections } from '@/lib/sortedSections';
import { testPool } from '@/lib/practiceTest';
import { classOf, lectureName, lecturesOf } from '@/lib/classExams';
import { onlyStudies, studiesIn } from '@/lib/studies';
import { CARDS, KINDS, LECTURES, countBasis, examSoon, lecturesFor, practiceCount, practiceLink, sittingSize, type Cards, type From, type Kind, type Lectures, type LecturesPick } from '@/lib/practice';
import { usePlanStore } from '@/store/plan';
import { measuredPace, useStudyLogStore } from '@/store/studyLog';
import { roman } from '@/lib/roman';
import type { Course } from '@/schema/course';

/** One lecture a choice reaches, and where in it. */
interface Target {
  courseId: string;
  course: Course;
  from: From;
}

/**
 * The choice of "From", as one string a <select> can hold: '' for all of it,
 * `section:<id>` (a lecture's), `lecture:<id>` (a class's), `study:all`, or
 * `study:<lecture id>|<study key>`.
 */
function targetsOf(from: string, lectures: [string, Course][]): Target[] {
  const all = (f: From) => lectures.map(([courseId, course]) => ({ courseId, course, from: f }));
  if (from.startsWith('section:')) return all({ sectionId: from.slice(8) });
  if (from.startsWith('lecture:')) return all({}).filter((t) => t.courseId === from.slice(8));
  if (from === 'study:all') return all({ study: 'all' });
  if (from.startsWith('study:')) {
    // Split at the first bar only: a study's key is free text from a tag.
    const bar = from.indexOf('|');
    const courseId = from.slice(6, bar);
    return all({ study: from.slice(bar + 1) }).filter((t) => t.courseId === courseId);
  }
  return all({});
}

interface Saved {
  cards: Cards | null;
  kind: Kind;
  from: string;
  /** A class's: how the student chose to take its lectures, and whether an exam was close then (lib/practice lecturesFor). */
  lecturesPick?: LecturesPick;
}

const savedKey = (scope: string) => `arborous:practice:${scope}`;

/**
 * The Lectures pick saved here. Before 2026-10-19 the page saved
 * `lectures` whether or not it was picked, so a saved "in-turn" is most
 * likely the old default and is not kept; a saved "mixed" was a pick, made
 * with no exam close (mixing was never the default then).
 */
function readPick(saved: Partial<Saved> & { lectures?: unknown }): LecturesPick | undefined {
  const p = saved.lecturesPick;
  if (p && typeof p === 'object' && LECTURES.some((l) => l.value === p.value)) return { value: p.value, nearExam: !!p.nearExam };
  return saved.lectures === 'mixed' ? { value: 'mixed', nearExam: false } : undefined;
}

/** The choice left here last time, each part kept only if it is still a choice. */
function loadChoice(scope: string): Saved | null {
  try {
    const raw = localStorage.getItem(savedKey(scope));
    const saved = raw ? (JSON.parse(raw) as Partial<Saved>) : null;
    if (!saved || typeof saved !== 'object') return null;
    return {
      cards: CARDS.some((c) => c.value === saved.cards) ? (saved.cards as Cards) : null,
      kind: KINDS.some((k) => k.value === saved.kind) ? (saved.kind as Kind) : 'all',
      from: typeof saved.from === 'string' ? saved.from : '',
      lecturesPick: readPick(saved),
    };
  } catch {
    return null;
  }
}

/**
 * "/study/:id/practice?section=<id>" and "/class/:code/practice": drill
 * outside the plan.
 *
 * It replaces six format-named modes on the course page (Quiz, Flashcards,
 * Terms, Mixed, Weakest first, Mistakes) and the separate Review row.
 * They were one question asked six ways: which cards, of which kind, from
 * where. Here each is a choice of its own, with how many cards it would give.
 *
 * A class's Practice asks the same across every lecture with its code. A
 * choice that spans several runs them in turn by default: each lecture's
 * session ends by offering the next lecture with cards for it (CardSession,
 * `?class=`). Or, chosen under Lectures, all of them in one sitting with the
 * lectures mixed (`?mix=1`, lib/mixLectures; sim/FINDINGS.md 2026-10-18 for
 * why it is a choice and not the default). The choice is remembered per
 * lecture and per class, so coming back from a session finds it as it was
 * left.
 */
export function PracticeRoute() {
  const { id, code } = useParams<{ id?: string; code?: string }>();
  // A fresh page for each lecture and class: following "the whole class"
  // from a lecture's Practice must load the class's own choices, not carry
  // the lecture's over (and then save them as the class's).
  return <PracticePage key={id ? `lecture:${id}` : `class:${code ?? ''}`} />;
}

function PracticePage() {
  const { id, code } = useParams<{ id?: string; code?: string }>();
  const [params] = useSearchParams();
  const courses = useCoursesStore((s) => s.courses);
  const byCourse = useProgressStore((s) => s.byCourse);
  // Judged as of opening the page; rendering must not read the clock.
  const [now] = useState(Date.now);

  const course = id ? courses[id] : undefined;
  const lectures = useMemo<[string, Course][]>(
    () => (id ? (course ? [[id, course]] : []) : code ? lecturesOf(courses, code) : []),
    [id, code, course, courses],
  );
  const scope = id ? `lecture:${id}` : `class:${code ?? ''}`;

  const sections = useMemo(() => (course ? sortedSections(course) : []), [course]);
  const studies = useMemo(
    () => lectures.flatMap(([courseId, c]) => studiesIn(c).map((s) => ({ ...s, courseId, lecture: lectureName(c.metadata.title, code) }))),
    [lectures, code],
  );
  const fromValues = useMemo(
    () =>
      new Set([
        '',
        ...sections.map((s) => `section:${s.id}`),
        ...(id ? [] : lectures.map(([lid]) => `lecture:${lid}`)),
        ...(studies.length ? ['study:all'] : []),
        ...(studies.length > 1 || !id ? studies.map((s) => `study:${s.courseId}|${s.key}`) : []),
      ]),
    [sections, lectures, studies, id],
  );

  const [saved] = useState(() => loadChoice(scope));
  const asked = params.get('section');
  const [from, setFrom] = useState(() =>
    asked && fromValues.has(`section:${asked}`) ? `section:${asked}` : saved && fromValues.has(saved.from) ? saved.from : '',
  );
  // Null until chosen: the default depends on what is due, so it is worked out below.
  const [pickedCards, setPickedCards] = useState<Cards | null>(saved?.cards ?? null);
  const [pickedKind, setPickedKind] = useState<Kind>(saved?.kind ?? 'all');
  // Mixed together in the last week before an exam, one at a time otherwise,
  // unless picked in the same situation (lib/practice lecturesFor).
  const [lecturesPick, setLecturesPick] = useState<LecturesPick | null>(saved?.lecturesPick ?? null);
  const soon = useMemo(() => (id ? null : examSoon(lectures, now)), [id, lectures, now]);
  const pickedLectures: Lectures = lecturesFor(lecturesPick, !!soon);
  // Mixed because the exam is close, not because the student picked it: said under Start.
  const mixedForExam = !!soon && pickedLectures === 'mixed' && lecturesPick?.nearExam !== true;

  useEffect(() => {
    try {
      localStorage.setItem(
        savedKey(scope),
        JSON.stringify({ cards: pickedCards, kind: pickedKind, from, ...(!id && lecturesPick ? { lecturesPick } : {}) } satisfies Saved),
      );
    } catch {
      // Storage blocked: the page still works, it just starts fresh next time.
    }
  }, [scope, pickedCards, pickedKind, from, lecturesPick, id]);

  const targets = useMemo(() => targetsOf(fromValues.has(from) ? from : '', lectures), [from, fromValues, lectures]);

  const bases = useMemo(
    () =>
      targets.map((t) =>
        countBasis(t.course, byCourse[t.courseId] ?? EMPTY_PROGRESS, useProgressStore.getState().missedIds(t.courseId), t.from, now),
      ),
    [targets, byCourse, now],
  );
  // The sitting under Start is fitted to the daily time at the measured
  // pace: read again when either changes.
  const logs = useStudyLogStore((st) => st.byCourse);
  const pace = useMemo(() => measuredPace(logs), [logs]);
  const minutesFor = usePlanStore((st) => st.minutesFor);
  usePlanStore((st) => st.byCourse);
  // How many cards each combination would give, per lecture, by the call the session makes.
  const counts = useMemo(() => {
    const out = {} as Record<Cards, Record<Kind, number[]>>;
    for (const { value: cards } of CARDS) {
      out[cards] = {} as Record<Kind, number[]>;
      for (const { value: kind } of KINDS) out[cards][kind] = bases.map((b) => practiceCount(b, cards, kind));
    }
    return out;
  }, [bases]);
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

  // The practice test over the same part: a lecture's own test for one
  // lecture, the class's for more than one.
  const test = useMemo(() => {
    const scopes = targets.map((t) => ({
      courseId: t.courseId,
      course: t.course,
      covers: t.from.sectionId ? [t.from.sectionId] : ('all' as const),
      only: onlyStudies(t.course, t.from.study),
    }));
    const one = targets.length === 1 ? targets[0] : null;
    const q = new URLSearchParams();
    if (one?.from.sectionId) q.set('section', one.from.sectionId);
    if (targets[0]?.from.study) q.set('study', targets[0].from.study);
    const qs = q.toString() ? `?${q}` : '';
    return {
      count: testPool(scopes).length,
      to: one && (id || from !== '') ? `/study/${one.courseId}/test${qs}` : `/class/${encodeURIComponent(code ?? '')}/test${qs}`,
    };
  }, [targets, id, code, from]);

  if (!id && !code) return <Navigate to="/" replace />;
  if (!lectures.length) {
    return (
      <div className="py-6 text-center text-text-2">
        {id ? 'Lecture not found.' : `No lectures in ${code}.`}{' '}
        <Link to="/" className="text-accent hover:underline">
          Back to Library
        </Link>
      </div>
    );
  }

  // A choice that has run out of cards (another choice changed under it)
  // gives way. Cards first: the one picked, else Due now, else Weakest first,
  // else whatever has cards. Then the kind falls back to All kinds.
  const cards: Cards =
    (pickedCards ? [pickedCards] : [])
      .concat(['due', 'weakest', 'everything', 'missed'])
      .find((c) => sum(counts[c][pickedKind]) > 0) ?? 'weakest';
  const kind: Kind = sum(counts[cards][pickedKind]) > 0 ? pickedKind : 'all';
  const perLecture = counts[cards][kind];
  const n = sum(perLecture);
  const first = perLecture.findIndex((x) => x > 0);
  const reached = perLecture.filter((x) => x > 0).length;
  const spans = reached > 1;
  // Mixing is a choice only when this choice has cards in more than one lecture.
  const mixing = !id && spans && pickedLectures === 'mixed';
  // From a class's Practice the session carries the class, so its ways out
  // lead back here and, over several lectures, each one's end offers the
  // next, or they are all in one sitting, mixed.
  const to = first >= 0 ? practiceLink(targets[first].courseId, cards, kind, targets[first].from, code, !spans, mixing) : '';
  // The sitting Start opens, as it will be: the first lecture's, or every
  // lecture's when mixed. The counts above are cards to answer, all of them.
  const opens = first < 0 ? [] : mixing ? perLecture.flatMap((x, i) => (x > 0 ? [i] : [])) : [first];
  const sitting = opens
    .map((i) => sittingSize(bases[i], cards, kind, minutesFor(targets[i].courseId), pace))
    .reduce((a, b) => ({ answer: a.answer + b.answer, read: a.read + b.read }), { answer: 0, read: 0 });
  const note = sittingNote(sitting, opens.reduce((a, i) => a + perLecture[i], 0), mixing);

  const classCode = course ? classOf(course) : code;
  const classSize = classCode ? lecturesOf(courses, classCode).length : 0;
  const nothingStudied = lectures.every(([lid]) => Object.keys(byCourse[lid] ?? {}).length === 0);

  return (
    <div>
      {id ? (
        <Link to={`/study/${id}`} className="tap-safe inline-flex items-center text-sm text-text-2 hover:text-text">
          ← {course!.metadata.title}
        </Link>
      ) : (
        <Link to={`/class/${encodeURIComponent(code!)}`} className="tap-safe inline-flex items-center text-sm text-text-2 hover:text-text">
          ← {code}
        </Link>
      )}
      <h1 className="mt-4 font-display text-display font-semibold text-text">Practice</h1>
      {!id && (
        <p className="mark mt-1 text-text-3">
          {code} · {lectures.length} lecture{lectures.length === 1 ? '' : 's'}
        </p>
      )}
      <p className="mt-2 max-w-prose text-small text-text-2">
        {id
          ? 'Drill this lecture outside the plan: before a class quiz, or a section that feels shaky.'
          : 'Drill the whole class outside the plan: its lectures one at a time, or mixed together in one sitting.'}{' '}
        Today still decides what comes back when; a card that is not fading yet gains little from more practice.
      </p>
      {/* Practice drills what has been taught. On material never opened,
          every choice is cold, so say where to begin. */}
      {nothingStudied && (
        <p className="mt-3 max-w-prose text-small text-text-2">
          Nothing here has been studied yet.{' '}
          <Link
            to={id ? `/session/${id}/learn` : `/class/${encodeURIComponent(code!)}`}
            className="text-accent underline-offset-4 hover:underline"
          >
            {id ? 'Learn' : 'Today'}
          </Link>{' '}
          teaches it a few terms at a time; Practice is for after.
        </p>
      )}
      {id && classCode && classSize > 1 && (
        <p className="mt-3 text-small text-text-2">
          Or practise every lecture in {classCode}:{' '}
          <Link to={`/class/${encodeURIComponent(classCode)}/practice`} className="text-accent underline-offset-4 hover:underline">
            the whole class
          </Link>
          .
        </p>
      )}

      <div className="mt-6 space-y-5 border-y border-border py-5">
        <Choices
          label="Cards"
          choices={CARDS.map((c) => ({ ...c, count: sum(counts[c.value][kind]) }))}
          value={cards}
          onPick={(v) => setPickedCards(v)}
          note={CARDS.find((c) => c.value === cards)?.use}
        />
        <Choices
          label="Kind"
          choices={KINDS.map((k) => ({ ...k, count: sum(counts[cards][k.value]) }))}
          value={kind}
          onPick={(v) => setPickedKind(v)}
        />
        <div className="flex flex-col gap-y-1 sm:flex-row sm:items-baseline sm:gap-x-3">
          <span className="mark shrink-0 text-text-3 sm:w-16">From</span>
          <label className="min-w-0 sm:max-w-sm sm:flex-1">
            <span className="sr-only">{id ? 'Part of the lecture' : 'Part of the class'}</span>
            <select
              value={fromValues.has(from) ? from : ''}
              onChange={(e) => setFrom(e.target.value)}
              className="field tap-safe w-full truncate text-small text-text-2"
            >
              <option value="">{id ? 'The whole lecture' : 'The whole class'}</option>
              {id ? (
                <optgroup label="Sections">
                  {sections.map((s, i) => (
                    <option key={s.id} value={`section:${s.id}`}>
                      {i + 1}. {s.title}
                    </option>
                  ))}
                </optgroup>
              ) : (
                <optgroup label="Lectures">
                  {lectures.map(([lid, c], i) => (
                    <option key={lid} value={`lecture:${lid}`}>
                      {roman(i + 1)}. {lectureName(c.metadata.title, code)}
                    </option>
                  ))}
                </optgroup>
              )}
              {studies.length > 0 && (
                <optgroup label="Studies">
                  <option value="study:all">{studies.length === 1 ? 'The study' : `All ${studies.length} studies`}</option>
                  {(studies.length > 1 || !id) &&
                    studies.map((s) => (
                      <option key={`${s.courseId}|${s.key}`} value={`study:${s.courseId}|${s.key}`}>
                        {s.label}
                        {id ? '' : ` · ${s.lecture}`}
                      </option>
                    ))}
                </optgroup>
              )}
            </select>
          </label>
        </div>
        {/* Only when the choice has cards in more than one lecture: with one, there is nothing to mix. */}
        {!id && spans && (
          <Choices label="Lectures" choices={LECTURES} value={pickedLectures} onPick={(v) => setLecturesPick({ value: v, nearExam: !!soon })} />
        )}
      </div>

      <div className="mt-6">
        {n > 0 ? (
          <>
            <Link to={to} className="press press-ink tap-safe">
              Start
            </Link>
            {!spans && note && <p className="mt-3 max-w-prose text-small text-text-3">{sentence(note)}</p>}
            {spans && !mixing && (
              <p className="mt-3 max-w-prose text-small text-text-3">
                Starts in {lectureName(targets[first].course.metadata.title, code)}, then carries on through {reached - 1} more lecture
                {reached === 2 ? '' : 's'}.{note && ` In ${lectureName(targets[first].course.metadata.title, code)}: ${note}.`}
              </p>
            )}
            {spans && mixing && (
              <p className="mt-3 max-w-prose text-small text-text-3">
                Cards from {reached} lectures in one sitting, mixed together, so you have to tell their ideas apart, as an exam
                does.{mixedForExam && soon && ` Mixed because ${soon.name} is ${soon.days === 0 ? 'today' : soon.days === 1 ? 'tomorrow' : `in ${soon.days} days`}.`}
                {note && ` ${sentence(note)}`}
              </p>
            )}
          </>
        ) : (
          <p className="text-small text-text-3">Nothing to practise here yet.</p>
        )}
      </div>

      <section className="mt-10 border-t border-border pt-5">
        <h2 className="mark text-text-3">Practice test</h2>
        <p className="mt-2 max-w-prose text-small text-text-2">
          The medium and hard questions{from ? ' from this part' : ''}, asked as an exam asks them: no answers until the
          end, then your score and every question you missed.{' '}
          <span className="tabular-nums text-text-3">
            {test.count} question{test.count === 1 ? '' : 's'}.
          </span>
        </p>
        {test.count > 0 && (
          <Link to={test.to} className="press tap-safe mt-3">
            Take a practice test
          </Link>
        )}
      </section>
    </div>
  );
}

/**
 * What the sitting holds beyond the count beside the choice, if anything:
 * Due now fits the daily time (the end of the sitting offers the rest), and
 * a sitting can have cards to read along the way that the count leaves out.
 * `each`: several lectures mixed, each fitted to its own daily time.
 */
function sittingNote({ answer, read }: { answer: number; read: number }, of: number, each: boolean): string | null {
  if (answer < of)
    return `${each ? 'each lecture’s' : 'your'} daily time fits ${answer} of the ${of}${read ? `, with ${read} to read` : ''}, and the end offers the rest`;
  if (read) return `${answer + read} cards, ${read} of them to read rather than answer`;
  return null;
}

const sentence = (text: string) => `${text[0].toUpperCase()}${text.slice(1)}.`;

/**
 * A row of choices set like the library's Classes and Tags: the label in small
 * caps, the choice picked underscored rather than filled, a middle dot between.
 * A choice with no cards is quiet and cannot be picked. On a phone the label
 * sits above its choices, as the View and Lecture rows on the course page do.
 */
function Choices<T extends string>({
  label,
  choices,
  value,
  onPick,
  note,
}: {
  label: string;
  /** Without a count, a choice is a way of doing it rather than a set of cards: never empty. */
  choices: { value: T; label: string; count?: number }[];
  value: T;
  onPick: (value: T) => void;
  /** What the picked choice is for, under the row. */
  note?: string;
}) {
  return (
    <div className="flex flex-col gap-y-1 sm:flex-row sm:items-baseline sm:gap-x-3">
      <span className="mark shrink-0 text-text-3 sm:w-16">{label}</span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-1 gap-y-1">
        {choices.map((c, i) => {
          const active = c.value === value;
          const empty = c.count === 0;
          return (
            <span key={c.value} className="flex items-baseline">
              <button
                type="button"
                disabled={empty}
                aria-pressed={active}
                onClick={() => onPick(c.value)}
                className={`group tap-safe px-0.5 text-small transition-colors ${
                  empty ? 'cursor-default text-text-3' : active ? 'text-accent' : 'text-text-2 hover:text-text'
                }`}
              >
                {/* The label carries the underline, so the count beside it stays plain. */}
                <span
                  className={
                    empty
                      ? ''
                      : active
                        ? 'underline decoration-accent decoration-2 underline-offset-4'
                        : 'group-hover:underline group-hover:underline-offset-4'
                  }
                >
                  {c.label}
                </span>
                {c.count != null && <span className="ml-1.5 text-xs tabular-nums text-text-3">{c.count}</span>}
              </button>
              {i < choices.length - 1 && <span className="ml-1 text-text-3">·</span>}
            </span>
          );
        })}
        </div>
        {note && <p className="mt-1 text-small text-text-3">{note}</p>}
      </div>
    </div>
  );
}
