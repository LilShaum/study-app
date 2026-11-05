import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useCoursesStore } from '@/store/courses';
import { recordAnswers } from '@/store/session';
import { isMissed, useProgressStore } from '@/store/progress';
import { classExams, lecturesOf } from '@/lib/classExams';
import { answeredRight, DONT_KNOW, drawTest, isMulti, isMultiAnswer, isProblem, isWritten, lecturesIn, scoreTest, testPool, TEST_LENGTHS, type CheckedProblem, type TestAnswer, type TestQuestion, type TestScope } from '@/lib/practiceTest';
import { multiKey, multiReasons, pickedList, statementsRight } from '@/lib/multiKey';
import { answerKind, checkAnswer, shownAnswer, unitOf } from '@/lib/problemAnswer';
import { answerPoints } from '@/lib/answerPoints';
import { optionOrder } from '@/lib/optionOrder';
import { termPicked } from '@/lib/mixUps';
import { onlyStudies, studiesIn } from '@/lib/studies';
import type { Course, MultiItem } from '@/schema/course';
import { normalisedRationale } from '@/lib/mcqRationale';
import { useKeyboardShortcuts } from '@/lib/useKeyboardShortcuts';
import { SourceNote } from '@/components/items/SourceNote';
import { IdeaNote } from '@/components/items/IdeaNote';
import { explanationFor } from '@/lib/learnSteps';
import type { SessionItem } from '@/lib/buildSessionItems';
import { CodeBlock, RichText } from '@/components/items/RichText';
import { SolutionSteps } from '@/components/items/ProblemCard';
import { MultiStatements } from '@/components/items/MultiCard';

/**
 * "/study/:id/test" (one lecture, `?section=` for one section) and
 * "/class/:code/test" (`?exam=` for what one exam covers, else the whole
 * class): a practice test.
 *
 * The exam rehearsal (docs/proposals/practice.md): a question, its options,
 * Back and Next, nothing marked until the test ends, timed if the student
 * sets a time. Marking each answer as it is given is Practice's job; the
 * test was that way from 2026-10-26 until Practice took it on (2026-11-03).
 * The end shows the score, each section's share, and every miss with why,
 * the right answer and the passage from the notes. The answers count as
 * practice like any other (recordAnswer), so Today knows what the test found.
 */
export function TestRoute() {
  const { id, code } = useParams<{ id?: string; code?: string }>();
  const [search] = useSearchParams();
  const courses = useCoursesStore((s) => s.courses);
  const sectionId = search.get('section');
  const examId = search.get('exam');
  // "?study=all|<key>": only the questions on studies (lib/studies.ts).
  const study = search.get('study') || null;
  // Judged as of opening the page; rendering must not read the clock.
  const [now] = useState(Date.now);

  const { scopes, title, back, backLabel } = useMemo(() => {
    // A studies choice keeps only its cards; a lecture with none of them gives none.
    const onlyOf = (course: Course) => onlyStudies(course, study);
    if (id) {
      const course = courses[id];
      if (!course) return { scopes: [] as TestScope[], title: '', back: '/', backLabel: 'Library' };
      const section = sectionId ? course.sections.find((s) => s.id === sectionId) : undefined;
      const studyName = study === 'all' ? 'every study' : study ? studiesIn(course).find((s) => s.key === study)?.label : undefined;
      return {
        scopes: [{ courseId: id, course, covers: section ? [section.id] : ('all' as const), only: onlyOf(course) }],
        title: section ? `${course.metadata.title}: ${section.title}` : studyName ? `${course.metadata.title}: ${studyName}` : course.metadata.title,
        back: `/study/${id}/practice`,
        backLabel: 'Practice',
      };
    }
    const lectures = code ? lecturesOf(courses, code) : [];
    const exam = examId ? classExams(lectures, now).find((e) => e.id === examId) : undefined;
    return {
      scopes: lectures
        .filter(([lid]) => !exam || exam.covers[lid])
        .map(([lid, course]) => ({ courseId: lid, course, covers: exam ? exam.covers[lid] : ('all' as const), only: onlyOf(course) })),
      title: [code, exam?.name, study ? 'every study' : null].filter(Boolean).join(' · '),
      back: `/class/${encodeURIComponent(code ?? '')}`,
      backLabel: code ?? 'Class',
    };
  }, [id, code, courses, sectionId, examId, study, now]);

  const pool = useMemo(() => testPool(scopes), [scopes]);
  const scopeKey = `${id ? `lecture:${id}:${sectionId ?? ''}` : `class:${code ?? ''}:${examId ?? ''}`}${study ? `:study:${study}` : ''}`;

  const header = (
    <>
      <Link to={back} className="tap-safe inline-flex items-center text-sm text-text-2 hover:text-text">
        ← {backLabel}
      </Link>
      <h1 className="mt-4 font-display text-display font-semibold text-text">Practice test</h1>
      <p className="mt-1 text-small text-text-2">{title}</p>
    </>
  );

  // Keyed by what the test covers, so a different lecture, section or exam
  // starts from its own saved test, never from another's.
  return (
    <TestRun
      key={scopeKey}
      storageKey={`arborous:test:${scopeKey}`}
      pool={pool}
      header={header}
      back={back}
      practiceTo={id ? `/study/${id}/practice` : `/class/${encodeURIComponent(code ?? '')}/practice`}
    />
  );
}

/**
 * A test in progress, or its results, kept until the student starts a new
 * one. A phone reloads the app when it has been in the background a while
 * (switching to the slides and back is enough), and Leave is one tap; either
 * used to throw away every answer. Questions are stored by id and looked up
 * again, so an edited lecture drops only what no longer exists.
 */
interface SavedTest {
  refs: { courseId: string; itemId: string }[];
  answers: TestAnswer[];
  /** When each answer was picked: an answer older than the card's latest study is not recorded over it. */
  answeredAt?: (number | null)[];
  /** Each written question's ticked points, once marked. */
  marks?: (boolean[] | null)[];
  /** Ended, and the written answers being ticked. */
  marking?: boolean;
  /** Each question marked as it was answered: right or wrong shown, the answer kept. */
  checked?: boolean[];
  /** Answers at the end, as an exam gives them, rather than as each is answered. */
  atEnd?: boolean;
  /** Orders this test's options (lib/optionOrder), so a reload shows them as before. */
  seed?: string;
  /** A timed test's end, as a time: leaving does not stop the clock, as an exam's does not. */
  endsAt?: number | null;
  /** Questions marked to come back to, as a pencilled "?" beside one on paper. */
  flagged?: boolean[];
  at: number;
  done: boolean;
  recorded: boolean;
  savedAt?: number;
}

/** A test left longer than this starts fresh: what it found is out of date. */
const KEEP_DAYS = 14;

function loadTest(key: string, pool: TestQuestion[]): (Omit<SavedTest, 'refs'> & { test: TestQuestion[] }) | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const saved = JSON.parse(raw) as SavedTest;
    if (!saved.savedAt || Date.now() - saved.savedAt > KEEP_DAYS * 86_400_000) return null;
    const byRef = new Map(pool.map((q) => [`${q.courseId}/${q.item.id}`, q]));
    const test: TestQuestion[] = [];
    const answers: TestAnswer[] = [];
    const answeredAt: (number | null)[] = [];
    const marks: (boolean[] | null)[] = [];
    const checked: boolean[] = [];
    const flagged: boolean[] = [];
    saved.refs.forEach((r, i) => {
      const q = byRef.get(`${r.courseId}/${r.itemId}`);
      if (q) {
        test.push(q);
        const a = saved.answers[i];
        const ok =
          q.item.type === 'mcq'
            ? typeof a === 'number' && a >= DONT_KNOW && a < q.item.options.length
            : q.item.type === 'multi'
              ? a === DONT_KNOW || isMultiAnswer(a, q.item.options.length)
              : typeof a === 'string' || a === DONT_KNOW;
        answers.push(ok ? a : null);
        answeredAt.push(ok ? (saved.answeredAt?.[i] ?? saved.savedAt ?? null) : null);
        // Ticks only while the card still has that many points.
        const m = saved.marks?.[i];
        const points = isWritten(q.item) ? answerPoints(q.item)?.points.length : undefined;
        marks.push(Array.isArray(m) && m.length === points ? m.map(Boolean) : null);
        checked.push(ok && !!saved.checked?.[i]);
        flagged.push(!!saved.flagged?.[i]);
      }
    });
    if (!test.length) return null;
    return {
      test,
      answers,
      answeredAt,
      marks,
      checked,
      flagged,
      atEnd: !!saved.atEnd,
      endsAt: typeof saved.endsAt === 'number' ? saved.endsAt : null,
      marking: !!saved.marking,
      seed: typeof saved.seed === 'string' ? saved.seed : String(saved.savedAt),
      at: Math.min(Math.max(0, saved.at | 0), test.length - 1),
      done: !!saved.done,
      recorded: !!saved.recorded,
      savedAt: saved.savedAt,
    };
  } catch {
    return null;
  }
}

function TestRun({ storageKey, pool, header, back, practiceTo }: { storageKey: string; pool: TestQuestion[]; header: ReactNode; back: string; practiceTo: string }) {
  // Read once: re-reading the store as answers are recorded must not
  // reshuffle the questions under the student.
  const [saved] = useState(() => loadTest(storageKey, pool));
  const [test, setTest] = useState<TestQuestion[] | null>(saved?.test ?? null);
  const [answers, setAnswers] = useState<TestAnswer[]>(saved?.answers ?? []);
  const [answeredAt, setAnsweredAt] = useState<(number | null)[]>(saved?.answeredAt ?? []);
  const [marks, setMarks] = useState<(boolean[] | null)[]>(saved?.marks ?? []);
  const [checked, setChecked] = useState<boolean[]>(saved?.checked ?? []);
  const [flagged, setFlagged] = useState<boolean[]>(saved?.flagged ?? []);
  /** Ending with questions blank or marked: looked over first, as a paper is before it is handed in. */
  const [review, setReview] = useState(false);
  const [atEnd, setAtEnd] = useState(saved?.atEnd ?? false);
  const [endsAt, setEndsAt] = useState<number | null>(saved?.endsAt ?? null);
  /** A timed test's time left, in ms, read by the tick below (rendering does not read the clock). */
  const [left, setLeft] = useState<number | null>(null);
  const [marking, setMarking] = useState(saved?.marking ?? false);
  const [seed, setSeed] = useState(saved?.seed ?? '');
  const [at, setAt] = useState(saved?.at ?? 0);
  const [done, setDone] = useState(saved?.done ?? false);
  const recorded = useRef(saved?.recorded ?? false);
  // What a new test asks first (lib/practiceTest drawTest): what was got
  // wrong last time, a miss or "I don't know", in a test or anywhere; then
  // what has not been on a test; then what was on one longest ago. A miss
  // that went to the back as "tested" never came round again (the owner,
  // 2026-10-26: "Remember, ADAPTIVE").
  const byCourse = useProgressStore((s) => s.byCourse);
  const recordOf = (q: TestQuestion) => byCourse[q.courseId]?.[q.item.id];
  const missedLast = (q: TestQuestion) => isMissed(recordOf(q));
  const firstBy = (q: TestQuestion) => (missedLast(q) ? -1 : (recordOf(q)?.testedAt ?? 0));

  useEffect(() => {
    try {
      if (!test) localStorage.removeItem(storageKey);
      else {
        const refs = test.map((q) => ({ courseId: q.courseId, itemId: q.item.id }));
        const record: SavedTest = { refs, answers, answeredAt, marks, checked, flagged, atEnd, endsAt, marking, seed, at, done, recorded: recorded.current, savedAt: Date.now() };
        localStorage.setItem(storageKey, JSON.stringify(record));
      }
    } catch {
      // Storage full or blocked: the test still works, it just won't survive a reload.
    }
  }, [storageKey, test, answers, answeredAt, marks, checked, flagged, atEnd, endsAt, marking, seed, at, done]);

  // A timed test counts down while it is being taken; at zero it ends and is
  // marked, as an exam is collected when time is called.
  const running = !!test && !done && !marking && endsAt != null;
  const endRef = useRef<() => void>(() => {});
  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const ms = endsAt! - Date.now();
      setLeft(Math.max(0, ms));
      if (ms <= 0) endRef.current();
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [running, endsAt]);

  /** A new test: answers at the end; `minutes` when timed. A retake of the missed keeps no timer. */
  const start = (questions: TestQuestion[], minutes?: number) => {
    setTest(questions);
    setAtEnd(true);
    setEndsAt(minutes ? Date.now() + minutes * 60_000 : null);
    setAnswers(questions.map(() => null));
    setAnsweredAt(questions.map(() => null));
    setMarks(questions.map(() => null));
    setChecked(questions.map(() => false));
    setFlagged(questions.map(() => false));
    setReview(false);
    setMarking(false);
    setSeed(Math.random().toString(36));
    setAt(0);
    setDone(false);
    recorded.current = false;
    window.scrollTo(0, 0);
  };

  const finish = () => {
    if (!test) return;
    if (!recorded.current) {
      recorded.current = true;
      // Only what was answered: a blank says nothing about memory. And not
      // over newer study: a test left on Monday and marked on Wednesday must
      // not put Monday's miss on top of Tuesday's right answer.
      const progress = useProgressStore.getState();
      // When each card was last studied before this test is recorded.
      const studied = test.map((q) => progress.getProgress(q.courseId)[q.item.id]?.lastSeen ?? 0);
      // A written question answered in the head and ticked at the end was
      // answered while the test was being taken: its last answer's time, so
      // newer study elsewhere still wins.
      const lastAnswer = Math.max(0, ...answeredAt.map((t) => t ?? 0));
      // A written question counts once something was written or a point
      // ticked (answered in the head); left blank, it says nothing either.
      // A problem counts once an answer the checker can read was typed.
      const answered = test.map((q, i) =>
        isWritten(q.item)
          ? answers[i] === DONT_KNOW || !!(typeof answers[i] === 'string' && (answers[i] as string).trim()) || !!marks[i]?.some(Boolean)
          : isProblem(q.item)
            ? answers[i] === DONT_KNOW || (typeof answers[i] === 'string' && checkAnswer(q.item, answers[i] as string) !== null)
            : answers[i] != null,
      );
      recordAnswers(
        test.flatMap((q, i) => {
          const chose = answers[i];
          const ticks = marks[i];
          const when = answeredAt[i] ?? (answered[i] ? lastAnswer : 0);
          const seen = studied[i];
          if (!(answered[i] && seen < when)) return [];
          const got = answeredRight(q.item, chose ?? '', ticks);
          // A question still marked "?" when handed in was not sure, as on
          // paper; any other answered multiple choice was. Logged, not
          // scheduled on (docs/proposals/understanding.md).
          const sure = (q.item.type === 'mcq' || q.item.type === 'multi') && chose !== DONT_KNOW ? !flagged[i] : undefined;
          return [{ courseId: q.courseId, item: q.item, got, sure }];
        }),
      );
      // On a test now, newer study or not: the next test asks the others first.
      const testedNow = Date.now();
      const byLecture = new Map<string, string[]>();
      test.forEach((q, i) => {
        if (answered[i]) byLecture.set(q.courseId, [...(byLecture.get(q.courseId) ?? []), q.item.id]);
      });
      for (const [courseId, ids] of byLecture) progress.noteTested(courseId, ids, testedNow);
      // A wrong pick that is another term of the lecture (lib/mixUps), under
      // the same rule: not over newer study of that card.
      const { courses } = useCoursesStore.getState();
      test.forEach((q, i) => {
        const chose = answers[i];
        const course = courses[q.courseId];
        if (q.item.type !== 'mcq' || typeof chose !== 'number' || !course) return;
        if (studied[i] >= (answeredAt[i] ?? 0)) return;
        const other = termPicked(course, q.item, chose);
        if (other) progress.noteConfusion(q.courseId, q.item.id, other);
      });
    }
    setMarking(false);
    setDone(true);
    window.scrollTo(0, 0);
  };

  // Written answers not yet checked are ticked at the end, then the score.
  const unmarked = (test ?? []).some((q, i) => isWritten(q.item) && !checked[i] && answers[i] != null && answers[i] !== '');
  const end = () => {
    if (!test) return;
    if (unmarked && !marking) {
      setMarking(true);
      window.scrollTo(0, 0);
    } else finish();
  };

  // The clock calls the latest end(), kept here after each render.
  useLayoutEffect(() => {
    endRef.current = end;
  });

  const tick = (i: number, k: number) =>
    setMarks((m) => {
      if (!test) return m;
      const item = test[i].item;
      const n = isWritten(item) ? (answerPoints(item)?.points.length ?? 0) : 0;
      const ticks = m[i] ?? Array.from({ length: n }, () => false);
      return test.map((_, j) => (j === i ? ticks.map((v, p) => (p === k ? !v : v)) : (m[j] ?? null)));
    });
  // Marked now: right or wrong shown, and the answer kept as it is.
  const check = () => setChecked((c) => (test ?? []).map((_, n) => n === at || !!c[n]));

  if (!test)
    return (
      <Setup
        header={header}
        pool={pool}
        missedLast={missedLast}
        fresh={(q) => !missedLast(q) && !recordOf(q)?.testedAt}
        practiceTo={practiceTo}
        onStart={(chosen, n, even, minutes) => start(drawTest(chosen, n, even, firstBy), minutes)}
      />
    );
  if (done) {
    return (
      <Results
        header={header}
        test={test}
        answers={answers}
        marks={marks}
        flagged={flagged}
        onRetakeMissed={(missed) => start(drawTest(missed))}
        onNew={() => setTest(null)}
      />
    );
  }
  if (marking) {
    return (
      <Marking
        header={header}
        test={test}
        answers={answers}
        marks={marks}
        checked={checked}
        onTick={tick}
        onDone={finish}
      />
    );
  }
  /** Ending: blank or marked questions are looked over first; time running out hands it in as it is. */
  const handIn = () => {
    const open = test.some((_, n) => !isAnswered(answers[n]) || flagged[n]);
    if (open && !review) setReview(true);
    else {
      setReview(false);
      end();
    }
  };
  if (review) {
    return (
      <HandIn
        test={test}
        answers={answers}
        flagged={flagged}
        left={endsAt != null ? left : null}
        onJump={(n) => {
          setAt(n);
          setReview(false);
        }}
        onBack={() => setReview(false)}
        onEnd={handIn}
      />
    );
  }
  return (
    <Taking
      test={test}
      at={at}
      answers={answers}
      flagged={flagged}
      onFlag={() => setFlagged((f) => test.map((_, n) => (n === at ? !f[n] : !!f[n])))}
      onJump={setAt}
      marks={marks}
      shown={!!checked[at]}
      instant={!atEnd}
      left={endsAt != null ? left : null}
      unmarked={unmarked}
      seed={seed}
      onPick={(a, andCheck) => {
        if (checked[at]) return;
        setAnswers((x) => test.map((_, n) => (n === at ? a : (x[n] ?? null))));
        setAnsweredAt((t) => test.map((_, n) => (n === at ? Date.now() : (t[n] ?? null))));
        if (andCheck && !atEnd) check();
      }}
      onCheck={check}
      onTick={(k) => tick(at, k)}
      onBack={() => setAt((n) => Math.max(0, n - 1))}
      onNext={() => (at + 1 < test.length ? setAt(at + 1) : handIn())}
      onEnd={handIn}
      backTo={back}
    />
  );
}

/** What a new test asks first, when that is not simply everything. */
function firstLine(total: number, missed: number, fresh: number): string {
  if (missed === 0 && fresh === total) return '';
  const parts = [
    missed > 0 && `the ${missed} you last got wrong or didn’t know`,
    fresh > 0 && `${missed > 0 ? 'then ' : 'the '}${fresh} not on a test yet`,
  ].filter(Boolean);
  return parts.length
    ? ` A new test asks first ${parts.join(', ')}.`
    : ' You have had every question here on a test; a new one asks first those you had longest ago.';
}

/** The kinds a test can hold, as the setup ticks them. */
type TestKind = 'mcq' | 'problem' | 'written';
const TEST_KINDS: { value: TestKind; label: string }[] = [
  { value: 'mcq', label: 'Multiple choice' },
  { value: 'problem', label: 'Problems' },
  { value: 'written', label: 'Written answers' },
];
/** Select all that apply is multiple choice to the student: options to pick from (docs/proposals/multi-select.md). */
const kindOfQuestion = (q: TestQuestion): TestKind => (q.item.type === 'mcq' || q.item.type === 'multi' ? 'mcq' : q.problem ? 'problem' : 'written');
/** Exam pace, as a suggestion only: a multiple-choice question, a problem, an answer to write. */
const PACE_SECONDS: Record<TestKind, number> = { mcq: 75, problem: 180, written: 300 };

/**
 * The test's setup (docs/proposals/practice.md): a rehearsal for the exam.
 * Answers are held to the end, as an exam holds them: feedback after a test
 * taught as well as feedback after each answer, or better (docs/evidence.md),
 * and marking as you go is what Practice is for, so the test is the one door
 * that behaves like the exam. What goes on it is ticked: the kinds (multiple
 * choice alone by default, as the owner set on 2026-10-26) and the sections
 * or lectures. A timer is the student's choice, suggested from the questions.
 */
function Setup({
  header,
  pool: all,
  practiceTo,
  missedLast,
  fresh: isFresh,
  onStart,
}: {
  header: ReactNode;
  pool: TestQuestion[];
  practiceTo: string;
  missedLast: (q: TestQuestion) => boolean;
  fresh: (q: TestQuestion) => boolean;
  onStart: (chosen: TestQuestion[], n?: number, even?: boolean, minutes?: number) => void;
}) {
  const present = TEST_KINDS.filter((k) => all.some((q) => kindOfQuestion(q) === k.value));
  const [kinds, setKinds] = useState<TestKind[]>(() => (present.some((k) => k.value === 'mcq') ? ['mcq'] : present.map((k) => k.value)));
  // Where: a lecture's sections, or a class's lectures, ticked.
  const byLecture = lecturesIn(all) > 1;
  const placeOf = (q: TestQuestion) => (byLecture ? q.courseId : q.sectionId);
  const places = useMemo(() => {
    const seen = new Map<string, string>();
    for (const q of all) if (!seen.has(placeOf(q))) seen.set(placeOf(q), byLecture ? q.lecture : q.section);
    return [...seen];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, byLecture]);
  const [off, setOff] = useState<string[]>([]);
  const pool = all.filter((q) => kinds.includes(kindOfQuestion(q)) && !off.includes(placeOf(q)));
  const missed = pool.filter(missedLast).length;
  const fresh = pool.filter(isFresh).length;
  const lengths = TEST_LENGTHS.filter((n) => n < pool.length);
  const [picked, setLength] = useState<number | undefined>(lengths[0]);
  // A length another choice offered may be past this one's questions.
  const length = picked != null && picked >= pool.length ? lengths[0] : picked;
  const [even, setEven] = useState(false);
  const lectures = lecturesIn(pool);
  const asked = length ?? pool.length;
  const suggested = pool.length
    ? Math.max(5, Math.ceil(((pool.reduce((a, q) => a + PACE_SECONDS[kindOfQuestion(q)], 0) / pool.length) * asked) / 60 / 5) * 5)
    : 0;
  const [timed, setTimed] = useState(false);
  const [minutes, setMinutes] = useState<number | null>(null);
  const limit = minutes ?? suggested;
  const toggle = <T,>(list: T[], v: T): T[] => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const row = 'flex flex-col gap-y-1 border-b border-border py-5 sm:flex-row sm:items-baseline sm:gap-x-3';
  const oneOf = <T,>(choices: { value: T; label: string }[], value: T, set: (v: T) => void) => (
    <div className="flex flex-wrap items-baseline gap-x-1 gap-y-1">
      {choices.map((c, i) => (
        <span key={c.label} className="flex items-baseline">
          <button
            type="button"
            aria-pressed={value === c.value}
            onClick={() => set(c.value)}
            className={`tap-safe px-0.5 text-small transition-colors ${value === c.value ? 'text-accent' : 'text-text-2 hover:text-text'}`}
          >
            <span className={value === c.value ? 'underline decoration-accent decoration-2 underline-offset-4' : ''}>{c.label}</span>
          </button>
          {i < choices.length - 1 && <span className="ml-1 text-text-3">·</span>}
        </span>
      ))}
    </div>
  );

  return (
    <div>
      {header}
      <p className="mt-4 max-w-prose text-small text-text-2">
        A rehearsal for the exam: the questions that ask you to use what you know, answers held to the end as an exam holds them,
        then your score, each section, and every question you missed with why.
        {kinds.includes('written') && ' Short and long answers are written, then you tick each point of the model answer you made.'}
        {kinds.includes('problem') && ' Problems are worked out: a number or a short answer is checked, anything else you check against the steps.'}
        {firstLine(pool.length, missed, fresh)}
      </p>
      <p className="mt-2 max-w-prose text-small text-text-3">
        Want each answer marked as you give it?{' '}
        <Link to={practiceTo} className="text-accent underline-offset-4 hover:underline">
          That is Practice
        </Link>
        .
      </p>
      <div className="mt-6 border-t border-border">
        {present.length > 1 && (
          <fieldset className={row}>
            <legend className="mark float-left shrink-0 text-text-3 sm:w-20">On it</legend>
            <div className="clear-left flex flex-wrap gap-x-4 sm:clear-none">
              {present.map((k) => (
                <label key={k.value} className="tap-safe flex cursor-pointer items-baseline gap-2 py-1 text-small text-text">
                  <input type="checkbox" checked={kinds.includes(k.value)} onChange={() => setKinds((ks) => toggle(ks, k.value))} className="accent-accent" />
                  {k.label}
                  <span className="text-xs tabular-nums text-text-3">{all.filter((q) => kindOfQuestion(q) === k.value).length}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
        {places.length > 1 && (
          <div className={row}>
            <span className="mark shrink-0 text-text-3 sm:w-20">From</span>
            <details className="min-w-0 flex-1">
              <summary className="tap-safe cursor-pointer text-small text-text-2 hover:text-text">
                {off.length ? `${places.length - off.length} of ${places.length}` : `All ${places.length}`} {byLecture ? 'lectures' : 'sections'}
              </summary>
              <div className="mt-2">
                {places.map(([key, name], i) => (
                  <label key={key} className="tap-safe flex cursor-pointer items-baseline gap-2 py-1 text-small text-text">
                    <input type="checkbox" checked={!off.includes(key)} onChange={() => setOff((o) => toggle(o, key))} className="accent-accent" />
                    <span className="min-w-0 flex-1">
                      {byLecture ? '' : `${i + 1}. `}
                      {name}
                    </span>
                  </label>
                ))}
              </div>
            </details>
          </div>
        )}
      </div>
      {pool.length === 0 ? (
        <p className="border-b border-border py-3 text-small text-text-2">
          {kinds.length && off.length < places.length
            ? 'There are no medium or hard questions of those kinds here yet. Add questions, on the lecture page, can write some.'
            : 'Tick at least one kind and one part.'}
        </p>
      ) : (
        <>
          <div className={row}>
            <span className="mark shrink-0 text-text-3 sm:w-20">Questions</span>
            {oneOf([...lengths, undefined].map((n) => ({ value: n, label: n == null ? `All ${pool.length}` : String(n) })), length, setLength)}
          </div>
          {/* A drawn test shares itself by how many questions each lecture
              has; an exam often gives each lecture a similar share instead. */}
          {lectures > 1 && length != null && (
            <div className={row}>
              <span className="mark shrink-0 text-text-3 sm:w-20">Lectures</span>
              {oneOf(
                [
                  { value: false, label: 'Each by its size' },
                  { value: true, label: 'Each the same' },
                ],
                even,
                setEven,
              )}
            </div>
          )}
          <div className={row}>
            <span className="mark shrink-0 text-text-3 sm:w-20">Timer</span>
            <div className="min-w-0">
              {oneOf(
                [
                  { value: false, label: 'None' },
                  { value: true, label: 'Timed' },
                ],
                timed,
                setTimed,
              )}
              {timed && (
                <label className="mt-2 flex items-baseline gap-2 text-small text-text-2">
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={300}
                    value={limit}
                    onChange={(e) => setMinutes(Math.max(1, Math.min(300, Number(e.target.value) || 1)))}
                    className="field w-20 text-small"
                  />
                  minutes. Suggested from the questions at about exam pace; when time is up the test ends and is marked.
                </label>
              )}
            </div>
          </div>
          <button type="button" onClick={() => onStart(pool, length, even, timed ? limit : undefined)} className="press press-ink tap-safe mt-6">
            Start the test
          </button>
        </>
      )}
    </div>
  );
}

function Taking({
  test,
  at,
  answers,
  flagged,
  onFlag,
  onJump,
  marks,
  shown,
  instant,
  unmarked,
  seed,
  onPick,
  onCheck,
  onTick,
  onBack,
  onNext,
  onEnd,
  backTo,
  left,
}: {
  /** A timed test's time left, in ms; null when untimed. */
  left: number | null;
  test: TestQuestion[];
  at: number;
  answers: TestAnswer[];
  /** Marked to come back to. */
  flagged: boolean[];
  onFlag: () => void;
  /** Go to a question, as a page of a paper test is turned to. */
  onJump: (n: number) => void;
  marks: (boolean[] | null)[];
  /** This question is marked: right or wrong shown, the answer kept. */
  shown: boolean;
  /** Marked as each is answered; otherwise all at the end, as an exam does. */
  instant: boolean;
  /** Written answers still to tick at the end. */
  unmarked: boolean;
  seed: string;
  /** `andCheck`: mark it at once (an option picked, or I don't know). */
  onPick: (a: TestAnswer, andCheck?: boolean) => void;
  onCheck: () => void;
  onTick: (point: number) => void;
  onBack: () => void;
  onNext: () => void;
  onEnd: () => void;
  backTo: string;
}) {
  const q = test[at];
  const chosen = answers[at];
  const last = at + 1 === test.length;
  const answered = answers.filter(isAnswered).length;
  /** Every question's number, to turn to any of them. */
  const [pages, setPages] = useState(false);
  const blank = typeof chosen === 'string' ? !chosen.trim() : chosen == null;
  // Shown in the test's own order; answers are kept by the file's index.
  const options = useMemo(() => (q.item.type === 'mcq' || q.item.type === 'multi' ? q.item.options : []), [q]);
  const rationales = useMemo(() => (q.item.type === 'mcq' ? normalisedRationale(q.item) : null), [q]);
  const order = useMemo(() => optionOrder(options, `${seed}/${q.courseId}/${q.item.id}`), [options, q, seed]);
  // A written answer is checked by hand, once something is written; a problem by the checker.
  const toCheck = instant && q.item.type !== 'mcq' && !shown && !blank;

  useKeyboardShortcuts((e) => {
    // Enter on a focused control (Back, Leave, End and mark it) does what
    // that control says, and arrows inside the options are the options'
    // own; only an option or the page itself moves the test on.
    const focus = e.target instanceof HTMLElement ? e.target : null;
    const inOptions = !!focus?.closest('[role=radiogroup], [data-statements]');
    if (e.key === 'Enter' && focus?.closest('button, a') && !inOptions) return;
    if (focus?.closest('textarea')) return;
    if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && inOptions) return;
    const n = Number(e.key);
    if (q.item.type === 'mcq' && !shown && Number.isInteger(n) && n >= 1 && n <= order.length) {
      e.preventDefault();
      onPick(order[n - 1], true);
    } else if (q.item.type === 'multi' && !shown && Number.isInteger(n) && n >= 1 && n <= order.length) {
      // A number ticks or unticks its statement; nothing is marked until the end.
      e.preventDefault();
      onPick(toggled(chosen, order[n - 1]));
    } else if (e.key === 'Enter' || e.key === 'ArrowRight') {
      e.preventDefault();
      if (toCheck) onCheck();
      else onNext();
    } else if (e.key === 'ArrowLeft' && at > 0) {
      e.preventDefault();
      onBack();
    }
  });

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <Link to={backTo} className="tap-safe inline-flex items-center text-sm text-text-2 hover:text-text">
          ← Leave
        </Link>
        <button type="button" onClick={onEnd} className="tap-safe text-sm text-text-3 hover:text-text">
          End and see my score
        </button>
      </div>
      <div className="mt-4 flex items-baseline justify-between gap-3 border-b border-border pb-2">
        <button
          type="button"
          aria-expanded={pages}
          onClick={() => setPages((p) => !p)}
          className="tap-safe mark text-text-3 hover:text-text"
        >
          Question {at + 1} of {test.length} {pages ? '▾' : '▸'}
        </button>
        <span className="text-xs tabular-nums text-text-3">
          {answered} answered
          {left != null && (
            <span className={`ml-2 ${left <= 60_000 ? 'text-error' : ''}`} role="timer" aria-live="off">
              · {Math.floor(left / 60_000)}:{String(Math.floor((left % 60_000) / 1000)).padStart(2, '0')} left
            </span>
          )}
        </span>
      </div>
      {pages && (
        <QuestionGrid
          test={test}
          answers={answers}
          flagged={flagged}
          at={at}
          onJump={(n) => {
            onJump(n);
            setPages(false);
          }}
        />
      )}
      {isProblem(q.item) ? (
        <ProblemAsk
          // Its own box per question, so a half-typed answer is never carried to the next.
          key={`${q.courseId}/${q.item.id}`}
          item={q.item}
          chosen={chosen}
          shown={shown}
          onPick={onPick}
          onSubmit={toCheck ? onCheck : onNext}
        />
      ) : isMulti(q.item) ? (
        <MultiAsk item={q.item} chosen={chosen} order={order} shown={shown} onPick={onPick} />
      ) : isWritten(q.item) ? (
        <>
          <div className="prose-set mt-4 text-heading text-text">
            <RichText text={q.item.front} />
          </div>
          {shown ? (
            <WrittenMarked item={q.item} chosen={chosen} ticks={marks[at]} onTick={onTick} />
          ) : (
            <>
              <label htmlFor="test-written" className="sr-only">
                Your answer
              </label>
              <textarea
                id="test-written"
                // Its own box per question, so a half-written answer is never carried to the next.
                key={`${q.courseId}/${q.item.id}`}
                value={typeof chosen === 'string' ? chosen : ''}
                onChange={(e) => onPick(e.target.value)}
                rows={7}
                placeholder="Write it as you would in the exam, or answer in your head and check"
                className="field mt-4 block w-full resize-y text-body"
              />
            </>
          )}
        </>
      ) : (
        <>
          <div className="prose-set mt-4 text-heading text-text"><RichText text={q.item.question} /></div>
          <div role="radiogroup" aria-label="Answer options" className="mt-4 space-y-2">
            {order.map((k, i) => {
              const opt = options[k];
              const picked = chosen === k;
              const right = k === q.item.correct_index;
              // Marked: the right answer and a wrong pick show as such.
              const tone = shown
                ? right
                  ? 'border-success text-success'
                  : picked
                    ? 'border-error text-error'
                    : 'border-border text-text-2'
                : picked
                  ? 'border-accent text-accent'
                  : 'border-border text-text hover:border-text-3';
              // As in a study session (McqCard): each wrong option's reason,
              // the one picked set to be read.
              const why = shown && !right ? rationales?.[k] : undefined;
              const pickedWrong = shown && picked && !right;
              return (
                <div key={i}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={picked}
                    disabled={shown}
                    onClick={() => onPick(k, true)}
                    className={`flex w-full items-center gap-3 border-0 border-b px-1 py-3 text-left text-small transition-colors disabled:cursor-default ${tone}`}
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current text-xs font-semibold">
                      {shown && right ? '✓' : pickedWrong ? '✗' : ('ABCD'[i] ?? i + 1)}
                    </span>
                    <span><RichText text={opt} /></span>
                  </button>
                  {why && (
                    <div className={pickedWrong ? 'mt-1.5 border-l-2 border-error py-0.5 pl-3 text-small text-text-2' : 'mt-1 pl-3 text-xs text-text-3'}>
                      <span className={pickedWrong ? 'text-error' : 'text-text-2'}>{pickedWrong ? 'Why that is wrong: ' : 'Why not: '}</span>
                      <RichText text={why} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {shown && <McqMarked item={q.item} chosen={chosen} order={order} />}
        </>
      )}
      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-4">
        {!shown && (
          <button
            type="button"
            aria-pressed={chosen === DONT_KNOW}
            onClick={() => onPick(DONT_KNOW, true)}
            className={`tap-safe block text-small underline-offset-4 hover:underline ${chosen === DONT_KNOW ? 'text-accent underline decoration-accent decoration-2' : 'text-text-3 hover:text-text'}`}
          >
            I don&rsquo;t know
          </button>
        )}
        <button
          type="button"
          aria-pressed={!!flagged[at]}
          onClick={onFlag}
          className={`tap-safe ml-auto block text-small underline-offset-4 hover:underline ${flagged[at] ? 'text-accent underline decoration-accent decoration-2' : 'text-text-3 hover:text-text'}`}
        >
          {flagged[at] ? 'Marked to come back to' : 'Mark to come back to'}
        </button>
      </div>
      <div className="mt-6 flex items-center gap-3">
        <button type="button" onClick={onBack} disabled={at === 0} className="press tap-safe disabled:opacity-40">
          Back
        </button>
        {toCheck ? (
          // A problem's Check goes through its form, which first asks for a number it can read.
          <button
            type={isProblem(q.item) ? 'submit' : 'button'}
            form={isProblem(q.item) ? PROBLEM_FORM : undefined}
            onClick={isProblem(q.item) ? undefined : onCheck}
            className="press press-ink tap-safe"
          >
            Check
          </button>
        ) : (
          <button type="button" onClick={onNext} className="press press-ink tap-safe">
            {last ? (unmarked ? 'Finish and mark it' : 'See my score') : blank ? 'Skip' : 'Next'}
          </button>
        )}
      </div>
    </div>
  );
}

const PROBLEM_FORM = 'test-problem';

/** A select-all answer with one statement ticked or unticked; nothing ticked is no answer. */
function toggled(chosen: TestAnswer, k: number): TestAnswer {
  const now = new Set(Array.isArray(chosen) ? chosen : []);
  if (now.has(k)) now.delete(k);
  else now.add(k);
  return now.size ? pickedList(now) : null;
}

/**
 * Select all that apply, asked in a test: the statements to tick, in the
 * test's order, kept by the file's index; nothing marked until the end, as
 * every question there. How many are true is never said.
 */
function MultiAsk({
  item,
  chosen,
  order,
  shown,
  onPick,
}: {
  item: MultiItem;
  chosen: TestAnswer;
  /** Entry k is the file index of the statement shown k-th (lib/optionOrder). */
  order: number[];
  shown: boolean;
  onPick: (a: TestAnswer, andCheck?: boolean) => void;
}) {
  const key = multiKey(item);
  const reasons = multiReasons(item);
  const at = (k: number) => order.indexOf(k);
  return (
    <>
      <div className="prose-set mt-4 text-heading text-text">
        <RichText text={item.question} />
      </div>
      <p className="mt-1 text-small text-text-3">Select all that apply.</p>
      <div className="mt-3">
        <MultiStatements
          options={order.map((k) => item.options[k])}
          trueOnes={key ? new Set([...key].map(at)) : null}
          picked={new Set(Array.isArray(chosen) ? chosen.map(at) : [])}
          marked={shown}
          reasons={reasons ? order.map((k) => reasons[k]) : undefined}
          dontKnow={chosen === DONT_KNOW}
          onToggle={shown ? undefined : (i) => onPick(toggled(chosen, order[i]))}
        />
      </div>
      {shown && <MultiMarked item={item} chosen={chosen} />}
    </>
  );
}

/** A select-all question marked as it was answered: right, or how many statements were, with the explanation. */
function MultiMarked({ item, chosen }: { item: MultiItem; chosen: TestAnswer }) {
  const key = multiKey(item);
  const n = item.options.length;
  const right = !!key && Array.isArray(chosen) && statementsRight(key, chosen, n) === n;
  return (
    <div className="mt-4" aria-live="polite">
      <p className={`font-medium ${chosen === DONT_KNOW ? 'text-text' : right ? 'text-success' : 'text-error'}`}>
        {right
          ? '✓ Correct'
          : chosen === DONT_KNOW || !key
            ? 'The true statements are marked ✓.'
            : `✗ Not this time: ${statementsRight(key, Array.isArray(chosen) ? chosen : [], n)} of ${n} statements right.`}
      </p>
      {item.explanation && <p className="mt-1 text-sm text-text-2"><RichText text={item.explanation} /></p>}
      <SourceNote excerpt={item.source_excerpt} open={!right} />
    </div>
  );
}

/** Answered: an option, I don't know, or something written. */
function isAnswered(a: TestAnswer | undefined): boolean {
  return typeof a === 'string' ? !!a.trim() : a != null;
}

/**
 * Every question by number, to turn to any of them as the pages of a paper
 * test (the owner, 2026-11-03): answered ones in ink, the rest faint, a
 * question marked to come back to with a "?", as pencilled beside it.
 */
function QuestionGrid({
  test,
  answers,
  flagged,
  at,
  onJump,
}: {
  test: TestQuestion[];
  answers: TestAnswer[];
  flagged: boolean[];
  at: number | null;
  onJump: (n: number) => void;
}) {
  return (
    <div className="mt-3 border-b border-border pb-3">
      <ol aria-label="Questions" className="flex flex-wrap gap-x-1">
        {test.map((q, n) => {
          const done = isAnswered(answers[n]);
          const here = n === at;
          return (
            <li key={`${q.courseId}/${q.item.id}`}>
              <button
                type="button"
                onClick={() => onJump(n)}
                aria-current={here ? 'step' : undefined}
                aria-label={`Question ${n + 1}, ${done ? 'answered' : 'not answered'}${flagged[n] ? ', marked to come back to' : ''}`}
                className={`tap-safe min-w-[2.25rem] px-1 py-1 text-center text-small tabular-nums ${
                  here
                    ? 'text-accent underline decoration-accent decoration-2 underline-offset-4'
                    : done
                      ? 'font-semibold text-text hover:text-accent'
                      : 'text-text-3 hover:text-text'
                }`}
              >
                {n + 1}
                {flagged[n] && <sup className="ml-px text-accent">?</sup>}
              </button>
            </li>
          );
        })}
      </ol>
      <p className="mt-1 text-xs text-text-3">Faint: not answered yet. ?: marked to come back to.</p>
    </div>
  );
}

/**
 * Before a test is handed in with questions blank or marked: every question
 * by number, what is still open, and the choice to go back or end. A timed
 * test that runs out is handed in as it is, without this.
 */
function HandIn({
  test,
  answers,
  flagged,
  left,
  onJump,
  onBack,
  onEnd,
}: {
  test: TestQuestion[];
  answers: TestAnswer[];
  flagged: boolean[];
  left: number | null;
  onJump: (n: number) => void;
  onBack: () => void;
  onEnd: () => void;
}) {
  const blank = test.filter((_, n) => !isAnswered(answers[n])).length;
  const marked = test.filter((_, n) => flagged[n]).length;
  const open = [blank ? `${blank} not answered` : '', marked ? `${marked} marked to come back to` : ''].filter(Boolean).join(' · ');
  return (
    <div>
      <p className="mark text-text-3">Before you hand it in</p>
      <p className="mt-2 font-display text-heading text-text">{open}.</p>
      {left != null && (
        <p className={`mt-1 text-small tabular-nums ${left <= 60_000 ? 'text-error' : 'text-text-3'}`} role="timer" aria-live="off">
          {Math.floor(left / 60_000)}:{String(Math.floor((left % 60_000) / 1000)).padStart(2, '0')} left
        </p>
      )}
      <QuestionGrid test={test} answers={answers} flagged={flagged} at={null} onJump={onJump} />
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button type="button" onClick={onBack} className="press tap-safe">
          Back to the test
        </button>
        <button type="button" onClick={onEnd} className="press press-ink tap-safe">
          End and see my score
        </button>
      </div>
    </div>
  );
}

/**
 * A problem whose answer the app checks, asked in a test: worked out, the
 * answer typed (its unit beside it), marked as it is given or at the end.
 * No steps as hints here: it is a test.
 */
function ProblemAsk({
  item,
  chosen,
  shown,
  onPick,
  onSubmit,
}: {
  item: CheckedProblem;
  chosen: TestAnswer;
  shown: boolean;
  onPick: (a: TestAnswer) => void;
  onSubmit: () => void;
}) {
  const unit = answerKind(item) === 'number' ? unitOf(item) : '';
  const typed = typeof chosen === 'string' ? chosen : '';
  const [nudge, setNudge] = useState(false);
  return (
    <>
      <div className="prose-set mt-4 text-heading text-text">
        <RichText text={item.question} />
      </div>
      {item.code?.trim() && <CodeBlock code={item.code} />}
      {shown ? (
        <ProblemMarked item={item} chosen={chosen} />
      ) : (
        <form
          id={PROBLEM_FORM}
          onSubmit={(e) => {
            e.preventDefault();
            if (typed.trim() && checkAnswer(item, typed) === null) setNudge(true);
            else onSubmit();
          }}
          className="mt-4 flex items-baseline gap-3"
        >
          <label htmlFor="test-problem-answer" className="sr-only">
            Your answer{unit ? `, in ${unit}` : ''}
          </label>
          <input
            id="test-problem-answer"
            value={typed}
            onChange={(e) => {
              onPick(e.target.value);
              setNudge(false);
            }}
            placeholder="Your answer"
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            autoComplete="off"
            className="field min-w-0 flex-1 text-body"
          />
          {unit && <span className="shrink-0 text-body text-text-2">{unit}</span>}
        </form>
      )}
      {nudge && !shown && (
        <p className="mt-2 text-small text-text-3" role="status">
          Type the answer as a number{unit ? `, in ${unit}` : ''}.
        </p>
      )}
    </>
  );
}

/** A problem marked: right, or the answer and the mistake it came from, then the solution. */
function ProblemMarked({ item, chosen }: { item: CheckedProblem; chosen: TestAnswer }) {
  const typed = typeof chosen === 'string' ? chosen.trim() : '';
  const verdict = chosen === DONT_KNOW || !typed ? null : checkAnswer(item, typed);
  const right = !!verdict?.right;
  const answer = shownAnswer(item);
  return (
    <div className="mt-4" aria-live="polite">
      {typed && <p className="text-small text-text-3">You answered {typed}</p>}
      <p className={`font-medium ${chosen === DONT_KNOW ? 'text-text' : right ? 'text-success' : 'text-error'}`}>
        {right ? `✓ Right: ${answer}.` : chosen === DONT_KNOW ? `The answer is ${answer}.` : `✗ Not this time: the answer is ${answer}.`}
      </p>
      {verdict?.mistake && (
        <p className="mt-2 text-small text-text-2">
          <span className="font-semibold text-text">Where that answer comes from: </span>
          <RichText text={verdict.mistake} />
        </p>
      )}
      <p className="mark mt-4 text-text-3">The solution</p>
      <SolutionSteps steps={item.steps ?? []} />
      {item.takeaway?.trim() && (
        <p className="mt-3 text-small text-text-2">
          <span className="font-semibold text-text">The method: </span>
          <RichText text={item.takeaway} />
        </p>
      )}
      <SourceNote excerpt={item.source_excerpt} open={!right} />
    </div>
  );
}

/** A question marked as it was answered: right, or the answer and why the pick was wrong. */
function McqMarked({ item, chosen, order }: { item: Extract<TestQuestion['item'], { type: 'mcq' }>; chosen: TestAnswer; order: number[] }) {
  const letter = 'ABCD'[order.indexOf(item.correct_index)] ?? '';
  const right = chosen === item.correct_index;
  return (
    <div className="mt-4" aria-live="polite">
      <p className={`font-medium ${chosen === DONT_KNOW ? 'text-text' : right ? 'text-success' : 'text-error'}`}>
        {right ? '✓ Correct' : chosen === DONT_KNOW ? `The answer is ${letter}.` : `✗ Not this time: the answer is ${letter}.`}
      </p>
      {item.explanation && <p className="mt-1 text-sm text-text-2"><RichText text={item.explanation} /></p>}
      {/* After a miss the passage is open: the lesson again, not only the right option. */}
      <SourceNote excerpt={item.source_excerpt} open={!right} />
    </div>
  );
}

/** A written answer marked as it was given: its points to tick, and whether that is full marks. */
function WrittenMarked({ item, chosen, ticks, onTick }: { item: Extract<TestQuestion['item'], { type: 'flashcard' }>; chosen: TestAnswer; ticks: boolean[] | null; onTick: (point: number) => void }) {
  const ap = answerPoints(item);
  const points = ap?.points ?? [];
  const need = ap?.need ?? points.length;
  const made = (ticks ?? []).filter(Boolean).length;
  const unknown = chosen === DONT_KNOW;
  const wrote = typeof chosen === 'string' ? chosen.trim() : '';
  return (
    <div className="mt-4" aria-live="polite">
      <div className="whitespace-pre-wrap border-l-2 border-border-strong pl-3 text-small text-text-2">
        {unknown ? 'You didn’t know.' : wrote || 'Answered in your head.'}
      </div>
      {ap?.lead && <p className="mt-3 text-small text-text">{ap.lead}</p>}
      <p className="mt-3 text-small text-text-3">
        {unknown ? 'The points to make' : `Tick each point you made${need < points.length ? ` (any ${need} of these ${points.length})` : ''}`}
      </p>
      <ul className="mt-1">
        {points.map((point, k) => (
          <li key={k}>
            <label className="flex cursor-pointer items-start gap-3 py-1.5 text-small text-text">
              {unknown ? (
                <span className="mt-0.5 shrink-0 tabular-nums text-text-3">{k + 1}.</span>
              ) : (
                <input type="checkbox" checked={!!ticks?.[k]} onChange={() => onTick(k)} className="tap-safe mt-1 shrink-0 accent-accent" />
              )}
              <span><RichText text={point} /></span>
            </label>
          </li>
        ))}
      </ul>
      {!unknown && (
        <p className={`mt-2 text-small font-medium ${made >= need ? 'text-success' : 'text-text-2'}`}>
          {made >= need ? `✓ ${made} of ${need}: counted as right.` : `${made} of ${need}: short of full marks, counted as wrong.`}
        </p>
      )}
    </div>
  );
}

const SECTIONS_SHOWN = 5;

function Results({
  header,
  test,
  answers,
  marks,
  flagged,
  onRetakeMissed,
  onNew,
}: {
  header: ReactNode;
  test: TestQuestion[];
  answers: TestAnswer[];
  marks: (boolean[] | null)[];
  /** Still marked "?" when handed in: not sure. */
  flagged: boolean[];
  onRetakeMissed: (missed: TestQuestion[]) => void;
  onNew: () => void;
}) {
  const courses = useCoursesStore((st) => st.courses);
  /** The explanation each missed question rests on, from its section (lib/learnSteps explanationFor). */
  const ideaOf = (q: TestQuestion) => {
    const section = courses[q.courseId]?.sections.find((sec) => sec.items.some((it) => it.id === q.item.id));
    const ex = section ? explanationFor(q.item as SessionItem, section.items as SessionItem[]) : null;
    return ex ? { title: ex.title, text: ex.text } : null;
  };
  const unsureRight = test.flatMap((q, n) =>
    (q.item.type === 'mcq' || q.item.type === 'multi') && flagged[n] && answeredRight(q.item, answers[n] ?? null) ? [{ q, chose: answers[n] }] : [],
  );
  const result = useMemo(() => scoreTest(test, answers, marks), [test, answers, marks]);
  const pct = result.total ? Math.round((result.got / result.total) * 100) : 0;
  const lectures = new Set(test.map((q) => q.courseId)).size;
  // Most missed first, then the lowest share: a section missed four times
  // says more than one missed once. A short test touches many sections once
  // each, so only the first few show until asked.
  const sections = [...result.bySection].sort((a, b) => b.total - b.got - (a.total - a.got) || a.got / a.total - b.got / b.total);
  const [allSections, setAllSections] = useState(false);
  const shown = allSections ? sections : sections.slice(0, SECTIONS_SHOWN);
  const actions = (
    <div className="flex flex-wrap items-center gap-3">
      {result.missed.length > 0 && (
        <button type="button" onClick={() => onRetakeMissed(result.missed.map((m) => m.q))} className="press press-ink tap-safe">
          Retake the {result.missed.length} missed
        </button>
      )}
      <button type="button" onClick={onNew} className="press tap-safe">
        New test
      </button>
    </div>
  );
  return (
    <div>
      {header}
      <div className="mt-6 border-y border-border py-5">
        <div className="font-display text-display font-semibold text-text">
          {result.got} of {result.total}
        </div>
        <div className="mt-1 text-small text-text-2">
          {pct}% right
          {result.missed.length > 0 && `. ${result.missed.length} to go over below.`}
        </div>
        <div className="mt-4">{actions}</div>
      </div>

      <section className="mt-8">
        <h2 className="mark mb-2 text-text-3">By section</h2>
        <ul className="border-t border-border">
          {shown.map((r) => (
            <li key={r.key} className="flex items-baseline gap-3 border-b border-border py-2.5">
              <span className="min-w-0 flex-1 text-small text-text">
                {r.section}
                {lectures > 1 && <span className="block text-xs text-text-3">{r.lecture}</span>}
              </span>
              <span className={`shrink-0 text-small tabular-nums ${r.got < r.total ? 'text-text' : 'text-text-3'}`}>
                {r.got} / {r.total}
              </span>
            </li>
          ))}
        </ul>
        {sections.length > SECTIONS_SHOWN && (
          <button type="button" onClick={() => setAllSections((v) => !v)} className="tap-safe mt-1 text-small text-text-3 hover:text-text">
            {allSections ? 'Fewer sections' : `All ${sections.length} sections`}
          </button>
        )}
      </section>

      {result.missed.length > 0 && (
        <section className="mt-8">
          <h2 className="mark mb-2 text-text-3">What you missed</h2>
          <ol className="border-t border-border">
            {result.missed.map(({ q, chose, ticks }) => {
              const where = (
                <div className="text-xs text-text-3">
                  {lectures > 1 ? `${q.lecture} · ` : ''}
                  {q.section}
                </div>
              );
              if (isWritten(q.item)) {
                const points = answerPoints(q.item)?.points ?? [];
                const wrote = typeof chose === 'string' ? chose.trim() : '';
                return (
                  <li key={`${q.courseId}/${q.item.id}`} className="border-b border-border py-4">
                    {where}
                    <div className="prose-set mt-1 text-body text-text">
                      <RichText text={q.item.front} />
                    </div>
                    <div className="mt-2 whitespace-pre-wrap border-l-2 border-border-strong pl-3 text-small text-text-2">
                      {chose === DONT_KNOW ? 'You didn’t know' : wrote || 'Nothing written'}
                    </div>
                    <ul className="mt-2 space-y-1">
                      {points.map((point, k) => (
                        <li key={k} className={`text-small ${ticks?.[k] ? 'text-success' : 'text-error'}`}>
                          {ticks?.[k] ? '✓' : '✗'} <RichText text={point} />
                        </li>
                      ))}
                    </ul>
                    <IdeaNote idea={ideaOf(q)} open />
                    <SourceNote excerpt={q.item.source_excerpt} open />
                  </li>
                );
              }
              if (isProblem(q.item)) {
                const typed = typeof chose === 'string' ? chose.trim() : '';
                const verdict = chose === DONT_KNOW || !typed ? null : checkAnswer(q.item, typed);
                return (
                  <li key={`${q.courseId}/${q.item.id}`} className="border-b border-border py-4">
                    {where}
                    <div className="prose-set mt-1 text-body text-text">
                      <RichText text={q.item.question} />
                    </div>
                    {q.item.code?.trim() && <CodeBlock code={q.item.code} />}
                    <div className="mt-2 text-small text-error">{chose === DONT_KNOW ? 'You didn’t know' : typed ? `✗ ${typed}` : 'No answer'}</div>
                    {verdict?.mistake && (
                      <div className="mt-1 border-l-2 border-error pl-3 text-small text-text-2">
                        <RichText text={verdict.mistake} />
                      </div>
                    )}
                    <div className="mt-2 text-small text-success">✓ {shownAnswer(q.item)}</div>
                    <SolutionSteps steps={q.item.steps ?? []} />
                    <SourceNote excerpt={q.item.source_excerpt} open />
                  </li>
                );
              }
              if (isMulti(q.item)) {
                const key = multiKey(q.item);
                const ticked = Array.isArray(chose) ? chose : [];
                const n = q.item.options.length;
                return (
                  <li key={`${q.courseId}/${q.item.id}`} className="border-b border-border py-4">
                    {where}
                    <div className="prose-set mt-1 text-body text-text"><RichText text={q.item.question} /></div>
                    <div className="mt-2 text-small text-error">
                      {chose === DONT_KNOW
                        ? 'You didn’t know'
                        : !ticked.length || !key
                          ? 'No answer'
                          : `✗ ${statementsRight(key, ticked, n)} of ${n} statements right`}
                    </div>
                    <div className="mt-2">
                      <MultiStatements
                        options={q.item.options}
                        trueOnes={key}
                        picked={new Set(ticked)}
                        marked
                        reasons={multiReasons(q.item)}
                        dontKnow={!ticked.length}
                      />
                    </div>
                    {q.item.explanation && (
                      <div className="mt-2 text-small text-text-2">
                        <RichText text={q.item.explanation} />
                      </div>
                    )}
                    <IdeaNote idea={ideaOf(q)} open />
                    <SourceNote excerpt={q.item.source_excerpt} open />
                  </li>
                );
              }
              const why = typeof chose === 'number' ? normalisedRationale(q.item)?.[chose] : undefined;
              return (
                <li key={`${q.courseId}/${q.item.id}`} className="border-b border-border py-4">
                  {where}
                  <div className="prose-set mt-1 text-body text-text"><RichText text={q.item.question} /></div>
                  <div className="mt-2 text-small text-error">
                    {typeof chose !== 'number' ? 'No answer' : chose === DONT_KNOW ? 'You didn’t know' : `✗ ${q.item.options[chose]}`}
                  </div>
                  {why && <div className="mt-1 border-l-2 border-error pl-3 text-small text-text-2"><RichText text={why} /></div>}
                  <div className="mt-2 text-small text-success">✓ {q.item.options[q.item.correct_index]}</div>
                  {q.item.explanation && (
                    <div className="mt-1 text-small text-text-2">
                      <RichText text={q.item.explanation} />
                    </div>
                  )}
                  <IdeaNote idea={ideaOf(q)} open />
                  <SourceNote excerpt={q.item.source_excerpt} open />
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {unsureRight.length > 0 && (
        <section className="mt-8">
          <h2 className="mark mb-1 text-text-3">Right, but marked ?</h2>
          {/* Feedback on a right answer given unsure doubled what was kept of
              it (Butler, Karpicke & Roediger 2008): the why, as for a miss. */}
          <p className="mb-2 text-small text-text-3">You were not sure of these. Here is why each is right.</p>
          <ol className="border-t border-border">
            {unsureRight.map(({ q, chose }) => (
              <li key={`${q.courseId}/${q.item.id}`} className="border-b border-border py-4">
                <div className="text-xs text-text-3">{q.section}</div>
                <div className="prose-set mt-1 text-body text-text">
                  <RichText text={q.item.type === 'mcq' || q.item.type === 'multi' ? q.item.question : ''} />
                </div>
                {q.item.type === 'mcq' && (
                  <div className="mt-2 text-small text-success">✓ {q.item.options[q.item.correct_index]}</div>
                )}
                {/* Every statement with why it is true or false: each was a judgement, and each was right. */}
                {q.item.type === 'multi' && (
                  <div className="mt-2">
                    <MultiStatements
                      options={q.item.options}
                      trueOnes={multiKey(q.item)}
                      picked={new Set(Array.isArray(chose) ? chose : [])}
                      marked
                      reasons={multiReasons(q.item)}
                    />
                  </div>
                )}
                {(q.item.type === 'mcq' || q.item.type === 'multi') && q.item.explanation && (
                  <div className="mt-1 text-small text-text-2">
                    <RichText text={q.item.explanation} />
                  </div>
                )}
                <IdeaNote idea={ideaOf(q)} open />
                <SourceNote excerpt={q.item.source_excerpt} open />
              </li>
            ))}
          </ol>
        </section>
      )}

      {result.missed.length > 0 && <div className="mt-6">{actions}</div>}
    </div>
  );
}

/**
 * The end of a test with written questions: each one's answer beside the
 * model answer's points, to tick the ones made, before the score. Ticked
 * here once, then fixed: the score and the record follow from it.
 */
function Marking({
  header,
  test,
  answers,
  marks,
  checked,
  onTick,
  onDone,
}: {
  header: ReactNode;
  test: TestQuestion[];
  answers: TestAnswer[];
  marks: (boolean[] | null)[];
  checked: boolean[];
  onTick: (question: number, point: number) => void;
  onDone: () => void;
}) {
  // Those already marked as they were answered are done.
  const written = test.flatMap((q, i) => (isWritten(q.item) && !checked[i] ? [{ q, i, item: q.item }] : []));
  return (
    <div>
      {header}
      <p className="mt-4 max-w-prose text-small text-text-2">
        Before your score: tick each point of the model answer that your answer made. A question counts as right with
        every point, as full marks would.
      </p>
      <ol className="mt-6 border-t border-border">
        {written.map(({ q, i, item }) => {
          const points = answerPoints(item)?.points ?? [];
          const lead = answerPoints(item)?.lead;
          const wrote = typeof answers[i] === 'string' ? (answers[i] as string).trim() : '';
          const made = (marks[i] ?? []).filter(Boolean).length;
          // Nothing to tick: the points are shown to read, and it is a miss.
          const unknown = answers[i] === DONT_KNOW;
          return (
            <li key={`${q.courseId}/${item.id}`} className="border-b border-border py-4">
              <div className="flex items-baseline justify-between gap-3">
                <span className="mark text-text-3">Question {i + 1}</span>
                <span className="text-xs tabular-nums text-text-3">
                  {made} of {answerPoints(item)?.need ?? points.length}
                </span>
              </div>
              <div className="prose-set mt-1 text-body text-text"><RichText text={item.front} /></div>
              <div className="mt-2 whitespace-pre-wrap border-l-2 border-border-strong pl-3 text-small text-text-2">
                {unknown ? 'You didn’t know.' : wrote || 'Nothing written. Tick what you would have said, if anything.'}
              </div>
              {lead && <p className="mt-3 text-small text-text">{lead}</p>}
              <ul className="mt-2">
                {points.map((point, k) => (
                  <li key={k}>
                    <label className="flex cursor-pointer items-start gap-3 py-1.5 text-small text-text">
                      {unknown ? (
                        <span className="mt-0.5 shrink-0 tabular-nums text-text-3">{k + 1}.</span>
                      ) : (
                        <input
                          type="checkbox"
                          checked={!!marks[i]?.[k]}
                          onChange={() => onTick(i, k)}
                          className="tap-safe mt-1 shrink-0 accent-accent"
                        />
                      )}
                      <span><RichText text={point} /></span>
                    </label>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ol>
      <button type="button" onClick={onDone} className="press press-ink tap-safe mt-6">
        See my score
      </button>
    </div>
  );
}
