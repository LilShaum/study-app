import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useCoursesStore } from '@/store/courses';
import { recordAnswers } from '@/store/session';
import { isMissed, useProgressStore } from '@/store/progress';
import { classExams, lecturesOf } from '@/lib/classExams';
import { answeredRight, DONT_KNOW, drawTest, isWritten, lecturesIn, scoreTest, testPool, TEST_LENGTHS, type TestAnswer, type TestQuestion, type TestScope } from '@/lib/practiceTest';
import { answerPoints } from '@/lib/answerPoints';
import { optionOrder } from '@/lib/optionOrder';
import { termPicked } from '@/lib/mixUps';
import { onlyStudies, studiesIn } from '@/lib/studies';
import type { Course } from '@/schema/course';
import { normalisedRationale } from '@/lib/mcqRationale';
import { useKeyboardShortcuts } from '@/lib/useKeyboardShortcuts';
import { SourceNote } from '@/components/items/SourceNote';

/**
 * "/study/:id/test" (one lecture, `?section=` for one section) and
 * "/class/:code/test" (`?exam=` for what one exam covers, else the whole
 * class): a practice test.
 *
 * A question, its options, Back and Next, each answer marked as it is given:
 * right, or the right answer, why the pick was wrong and the explanation
 * (the owner, 2026-10-26: "MAKE IT TELL YOU IF THE QUESTION IS CORRECT OR
 * WRONG RIGHT AWAY"; it used to wait until the end, as an exam does). A
 * written answer is checked against its points. The end shows the score,
 * each section's share, and every miss. The answers count as practice
 * like any other (recordAnswer), so Today knows what the test found.
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
  return <TestRun key={scopeKey} storageKey={`arborous:test:${scopeKey}`} pool={pool} header={header} back={back} />;
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
    saved.refs.forEach((r, i) => {
      const q = byRef.get(`${r.courseId}/${r.itemId}`);
      if (q) {
        test.push(q);
        const a = saved.answers[i];
        const ok = isWritten(q.item) ? typeof a === 'string' || a === DONT_KNOW : typeof a === 'number' && a >= DONT_KNOW && a < q.item.options.length;
        answers.push(ok ? a : null);
        answeredAt.push(ok ? (saved.answeredAt?.[i] ?? saved.savedAt ?? null) : null);
        // Ticks only while the card still has that many points.
        const m = saved.marks?.[i];
        const points = isWritten(q.item) ? answerPoints(q.item)?.points.length : undefined;
        marks.push(Array.isArray(m) && m.length === points ? m.map(Boolean) : null);
        checked.push(ok && !!saved.checked?.[i]);
      }
    });
    if (!test.length) return null;
    return {
      test,
      answers,
      answeredAt,
      marks,
      checked,
      atEnd: !!saved.atEnd,
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

function TestRun({ storageKey, pool, header, back }: { storageKey: string; pool: TestQuestion[]; header: ReactNode; back: string }) {
  // Read once: re-reading the store as answers are recorded must not
  // reshuffle the questions under the student.
  const [saved] = useState(() => loadTest(storageKey, pool));
  const [test, setTest] = useState<TestQuestion[] | null>(saved?.test ?? null);
  const [answers, setAnswers] = useState<TestAnswer[]>(saved?.answers ?? []);
  const [answeredAt, setAnsweredAt] = useState<(number | null)[]>(saved?.answeredAt ?? []);
  const [marks, setMarks] = useState<(boolean[] | null)[]>(saved?.marks ?? []);
  const [checked, setChecked] = useState<boolean[]>(saved?.checked ?? []);
  const [atEnd, setAtEnd] = useState(saved?.atEnd ?? false);
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
        const record: SavedTest = { refs, answers, answeredAt, marks, checked, atEnd, marking, seed, at, done, recorded: recorded.current, savedAt: Date.now() };
        localStorage.setItem(storageKey, JSON.stringify(record));
      }
    } catch {
      // Storage full or blocked: the test still works, it just won't survive a reload.
    }
  }, [storageKey, test, answers, answeredAt, marks, checked, atEnd, marking, seed, at, done]);

  const start = (questions: TestQuestion[], answersAtEnd = atEnd) => {
    setTest(questions);
    setAtEnd(answersAtEnd);
    setAnswers(questions.map(() => null));
    setAnsweredAt(questions.map(() => null));
    setMarks(questions.map(() => null));
    setChecked(questions.map(() => false));
    setMarking(false);
    setSeed(Math.random().toString(36));
    setAt(0);
    setDone(false);
    recorded.current = false;
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
      const answered = test.map((q, i) =>
        isWritten(q.item)
          ? answers[i] === DONT_KNOW || !!(typeof answers[i] === 'string' && (answers[i] as string).trim()) || !!marks[i]?.some(Boolean)
          : answers[i] != null,
      );
      recordAnswers(
        test.flatMap((q, i) => {
          const chose = answers[i];
          const ticks = marks[i];
          const when = answeredAt[i] ?? (answered[i] ? lastAnswer : 0);
          const seen = studied[i];
          return answered[i] && seen < when ? [{ courseId: q.courseId, item: q.item, got: answeredRight(q.item, chose ?? '', ticks) }] : [];
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
        if (isWritten(q.item) || typeof chose !== 'number' || !course) return;
        if (studied[i] >= (answeredAt[i] ?? 0)) return;
        const other = termPicked(course, q.item, chose);
        if (other) progress.noteConfusion(q.courseId, q.item.id, other);
      });
    }
    setMarking(false);
    setDone(true);
    window.scrollTo(0, 0);
  };

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
        onStart={(chosen, n, even, answersAtEnd) => start(drawTest(chosen, n, even, firstBy), answersAtEnd)}
      />
    );
  if (done) {
    return (
      <Results
        header={header}
        test={test}
        answers={answers}
        marks={marks}
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
  return (
    <Taking
      test={test}
      at={at}
      answers={answers}
      marks={marks}
      shown={!!checked[at]}
      instant={!atEnd}
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
      onNext={() => (at + 1 < test.length ? setAt(at + 1) : end())}
      onEnd={end}
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

function Setup({
  header,
  pool: all,
  missedLast,
  fresh: isFresh,
  onStart,
}: {
  header: ReactNode;
  pool: TestQuestion[];
  missedLast: (q: TestQuestion) => boolean;
  fresh: (q: TestQuestion) => boolean;
  onStart: (chosen: TestQuestion[], n?: number, even?: boolean, answersAtEnd?: boolean) => void;
}) {
  // As you go by default (the owner, 2026-10-26: "TELL YOU IF THE QUESTION
  // IS CORRECT OR WRONG RIGHT AWAY"), or at the end, as an exam does
  // ("MAKE IT SO U CAN CHOOSE IF U GET ANSWERS AT THE END OR AT START").
  const [answersAtEnd, setAnswersAtEnd] = useState(false);
  // Multiple choice only, unless written answers are asked for too (the
  // owner, 2026-10-26: "BY DEFAULT ONLY MULTIPLE CHOICE BUT YOU CAN CHOOSE
  // WHAT GOES ON IT BEFORE").
  const [written, setWritten] = useState(false);
  const hasWritten = all.some((q) => isWritten(q.item));
  const pool = written ? all : all.filter((q) => !isWritten(q.item));
  const missed = pool.filter(missedLast).length;
  const fresh = pool.filter(isFresh).length;
  const lengths = TEST_LENGTHS.filter((n) => n < pool.length);
  const [picked, setLength] = useState<number | undefined>(lengths[0]);
  // A length the other choice offered may be past this one's questions.
  const length = picked != null && picked >= pool.length ? lengths[0] : picked;
  const [even, setEven] = useState(false);
  const lectures = lecturesIn(pool);
  return (
    <div>
      {header}
      <p className="mt-4 max-w-prose text-small text-text-2">
        The medium and hard questions, the ones that ask you to use what you know rather than recognise it.
        {answersAtEnd
          ? ' Answers wait until the end, as in an exam; then your score and every question you missed, with why.'
          : ' Each answer is marked as you give it, right or wrong with why; at the end, your score and every question you missed.'}
        {written &&
          ' Short and long answers are written, as the exam has you write them; then you tick each point of the model answer you made.'}
        {firstLine(pool.length, missed, fresh)}
      </p>
      {hasWritten && (
        <div className="mt-6 flex flex-col gap-y-1 border-t border-border py-5 sm:flex-row sm:items-baseline sm:gap-x-3">
          <span className="mark shrink-0 text-text-3 sm:w-20">On it</span>
          <div className="flex flex-wrap items-baseline gap-x-1 gap-y-1">
            {[
              { value: false, label: 'Multiple choice' },
              { value: true, label: 'Multiple choice and written answers' },
            ].map((c, i) => (
              <span key={c.label} className="flex items-baseline">
                <button
                  type="button"
                  aria-pressed={written === c.value}
                  onClick={() => setWritten(c.value)}
                  className={`tap-safe px-0.5 text-small transition-colors ${written === c.value ? 'text-accent' : 'text-text-2 hover:text-text'}`}
                >
                  <span className={written === c.value ? 'underline decoration-accent decoration-2 underline-offset-4' : ''}>{c.label}</span>
                </button>
                {i === 0 && <span className="ml-1 text-text-3">·</span>}
              </span>
            ))}
          </div>
        </div>
      )}
      {pool.length === 0 ? (
        <p className="mt-6 border-y border-border py-3 text-small text-text-2">
          There are no medium or hard {written ? 'questions' : 'multiple choice questions'} here yet. More practice, on the lecture page, can write some.
        </p>
      ) : (
        <>
          <div className={`flex flex-col gap-y-1 border-y border-border py-5 sm:flex-row sm:items-baseline sm:gap-x-3 ${hasWritten ? '' : 'mt-6'}`}>
            <span className="mark shrink-0 text-text-3 sm:w-20">Questions</span>
            <div className="flex flex-wrap items-baseline gap-x-1 gap-y-1">
              {[...lengths, undefined].map((n, i, all) => {
                const active = n === length;
                return (
                  <span key={n ?? 'all'} className="flex items-baseline">
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => setLength(n)}
                      className={`tap-safe px-0.5 text-small transition-colors ${active ? 'text-accent' : 'text-text-2 hover:text-text'}`}
                    >
                      <span className={active ? 'underline decoration-accent decoration-2 underline-offset-4' : ''}>
                        {n ?? `All ${pool.length}`}
                      </span>
                    </button>
                    {i < all.length - 1 && <span className="ml-1 text-text-3">·</span>}
                  </span>
                );
              })}
            </div>
          </div>
          {/* A drawn test shares itself by how many questions each lecture
              has; an exam often gives each lecture a similar share instead.
              Asking for all of them, there is nothing to share. */}
          {lectures > 1 && length != null && (
            <div className="flex flex-col gap-y-1 border-b border-border py-5 sm:flex-row sm:items-baseline sm:gap-x-3">
              <span className="mark shrink-0 text-text-3 sm:w-20">Lectures</span>
              <div className="flex flex-wrap items-baseline gap-x-1 gap-y-1">
                {[
                  { value: false, label: 'Each by its size' },
                  { value: true, label: 'Each the same' },
                ].map((c, i) => (
                  <span key={c.label} className="flex items-baseline">
                    <button
                      type="button"
                      aria-pressed={even === c.value}
                      onClick={() => setEven(c.value)}
                      className={`tap-safe px-0.5 text-small transition-colors ${even === c.value ? 'text-accent' : 'text-text-2 hover:text-text'}`}
                    >
                      <span className={even === c.value ? 'underline decoration-accent decoration-2 underline-offset-4' : ''}>{c.label}</span>
                    </button>
                    {i === 0 && <span className="ml-1 text-text-3">·</span>}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="flex flex-col gap-y-1 border-b border-border py-5 sm:flex-row sm:items-baseline sm:gap-x-3">
            <span className="mark shrink-0 text-text-3 sm:w-20">Answers</span>
            <div className="flex flex-wrap items-baseline gap-x-1 gap-y-1">
              {[
                { value: false, label: 'As you go' },
                { value: true, label: 'At the end' },
              ].map((c, i) => (
                <span key={c.label} className="flex items-baseline">
                  <button
                    type="button"
                    aria-pressed={answersAtEnd === c.value}
                    onClick={() => setAnswersAtEnd(c.value)}
                    className={`tap-safe px-0.5 text-small transition-colors ${answersAtEnd === c.value ? 'text-accent' : 'text-text-2 hover:text-text'}`}
                  >
                    <span className={answersAtEnd === c.value ? 'underline decoration-accent decoration-2 underline-offset-4' : ''}>{c.label}</span>
                  </button>
                  {i === 0 && <span className="ml-1 text-text-3">·</span>}
                </span>
              ))}
            </div>
          </div>
          <button type="button" onClick={() => onStart(pool, length, even, answersAtEnd)} className="press press-ink tap-safe mt-6">
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
}: {
  test: TestQuestion[];
  at: number;
  answers: TestAnswer[];
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
  const answered = answers.filter((a) => (typeof a === 'string' ? a.trim() : a != null)).length;
  const blank = typeof chosen === 'string' ? !chosen.trim() : chosen == null;
  // Shown in the test's own order; answers are kept by the file's index.
  const options = useMemo(() => (isWritten(q.item) ? [] : q.item.options), [q]);
  const rationales = useMemo(() => (isWritten(q.item) ? null : normalisedRationale(q.item)), [q]);
  const order = useMemo(() => optionOrder(options, `${seed}/${q.courseId}/${q.item.id}`), [options, q, seed]);
  // A written answer is checked by hand, once something is written.
  const toCheck = instant && isWritten(q.item) && !shown && !blank;

  useKeyboardShortcuts((e) => {
    // Enter on a focused control (Back, Leave, End and mark it) does what
    // that control says, and arrows inside the options are the options'
    // own; only an option or the page itself moves the test on.
    const focus = e.target instanceof HTMLElement ? e.target : null;
    const inOptions = !!focus?.closest('[role=radiogroup]');
    if (e.key === 'Enter' && focus?.closest('button, a') && !inOptions) return;
    if (focus?.closest('textarea')) return;
    if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && inOptions) return;
    const n = Number(e.key);
    if (!isWritten(q.item) && !shown && Number.isInteger(n) && n >= 1 && n <= order.length) {
      e.preventDefault();
      onPick(order[n - 1], true);
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
        <span className="mark text-text-3">
          Question {at + 1} of {test.length}
        </span>
        <span className="text-xs tabular-nums text-text-3">{answered} answered</span>
      </div>
      {isWritten(q.item) ? (
        <>
          <div className="prose-set mt-4 text-heading text-text">{q.item.front}</div>
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
          <div className="prose-set mt-4 text-heading text-text">{q.item.question}</div>
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
                    <span>{opt}</span>
                  </button>
                  {why && (
                    <div className={pickedWrong ? 'mt-1.5 border-l-2 border-error py-0.5 pl-3 text-small text-text-2' : 'mt-1 pl-3 text-xs text-text-3'}>
                      <span className={pickedWrong ? 'text-error' : 'text-text-2'}>{pickedWrong ? 'Why that is wrong: ' : 'Why not: '}</span>
                      {why}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {shown && <McqMarked item={q.item} chosen={chosen} order={order} />}
        </>
      )}
      {!shown && (
        <button
          type="button"
          aria-pressed={chosen === DONT_KNOW}
          onClick={() => onPick(DONT_KNOW, true)}
          className={`tap-safe mt-3 block text-small underline-offset-4 hover:underline ${chosen === DONT_KNOW ? 'text-accent underline decoration-accent decoration-2' : 'text-text-3 hover:text-text'}`}
        >
          I don&rsquo;t know
        </button>
      )}
      <div className="mt-6 flex items-center gap-3">
        <button type="button" onClick={onBack} disabled={at === 0} className="press tap-safe disabled:opacity-40">
          Back
        </button>
        {toCheck ? (
          <button type="button" onClick={onCheck} className="press press-ink tap-safe">
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

/** A question marked as it was answered: right, or the answer and why the pick was wrong. */
function McqMarked({ item, chosen, order }: { item: Extract<TestQuestion['item'], { type: 'mcq' }>; chosen: TestAnswer; order: number[] }) {
  const letter = 'ABCD'[order.indexOf(item.correct_index)] ?? '';
  const right = chosen === item.correct_index;
  return (
    <div className="mt-4" aria-live="polite">
      <p className={`font-medium ${chosen === DONT_KNOW ? 'text-text' : right ? 'text-success' : 'text-error'}`}>
        {right ? '✓ Correct' : chosen === DONT_KNOW ? `The answer is ${letter}.` : `✗ Not this time: the answer is ${letter}.`}
      </p>
      {item.explanation && <p className="mt-1 text-sm text-text-2">{item.explanation}</p>}
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
              <span>{point}</span>
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
  onRetakeMissed,
  onNew,
}: {
  header: ReactNode;
  test: TestQuestion[];
  answers: TestAnswer[];
  marks: (boolean[] | null)[];
  onRetakeMissed: (missed: TestQuestion[]) => void;
  onNew: () => void;
}) {
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
                    <div className="prose-set mt-1 text-body text-text">{q.item.front}</div>
                    <div className="mt-2 whitespace-pre-wrap border-l-2 border-border-strong pl-3 text-small text-text-2">
                      {chose === DONT_KNOW ? 'You didn’t know' : wrote || 'Nothing written'}
                    </div>
                    <ul className="mt-2 space-y-1">
                      {points.map((point, k) => (
                        <li key={k} className={`text-small ${ticks?.[k] ? 'text-success' : 'text-error'}`}>
                          {ticks?.[k] ? '✓' : '✗'} {point}
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              }
              const why = typeof chose === 'number' ? normalisedRationale(q.item)?.[chose] : undefined;
              return (
                <li key={`${q.courseId}/${q.item.id}`} className="border-b border-border py-4">
                  {where}
                  <div className="prose-set mt-1 text-body text-text">{q.item.question}</div>
                  <div className="mt-2 text-small text-error">
                    {typeof chose !== 'number' ? 'No answer' : chose === DONT_KNOW ? 'You didn’t know' : `✗ ${q.item.options[chose]}`}
                  </div>
                  {why && <div className="mt-1 border-l-2 border-error pl-3 text-small text-text-2">{why}</div>}
                  <div className="mt-2 text-small text-success">✓ {q.item.options[q.item.correct_index]}</div>
                  {q.item.explanation && <div className="mt-1 text-small text-text-2">{q.item.explanation}</div>}
                </li>
              );
            })}
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
              <div className="prose-set mt-1 text-body text-text">{item.front}</div>
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
                      <span>{point}</span>
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
