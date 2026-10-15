import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useCoursesStore } from '@/store/courses';
import { recordAnswer } from '@/store/session';
import { classExams, lecturesOf } from '@/lib/classExams';
import { drawTest, scoreTest, testPool, TEST_LENGTHS, type TestQuestion, type TestScope } from '@/lib/practiceTest';
import { normalisedRationale } from '@/lib/mcqRationale';
import { useKeyboardShortcuts } from '@/lib/useKeyboardShortcuts';

/**
 * "/study/:id/test" (one lecture, `?section=` for one section) and
 * "/class/:code/test" (`?exam=` for what one exam covers, else the whole
 * class): a practice test.
 *
 * Set like an exam rather than a study session: a question, its options,
 * Back and Next. Nothing says right or wrong until the end, because an exam
 * doesn't, and because knowing as you go lets a student steer by it. The end
 * shows the score, each section's share, and every miss with its answer,
 * explanation and why the pick was wrong. The answers count as practice
 * like any other (recordAnswer), so Today knows what the test found.
 */
export function TestRoute() {
  const { id, code } = useParams<{ id?: string; code?: string }>();
  const [search] = useSearchParams();
  const courses = useCoursesStore((s) => s.courses);
  const sectionId = search.get('section');
  const examId = search.get('exam');
  // Judged as of opening the page; rendering must not read the clock.
  const [now] = useState(Date.now);

  const { scopes, title, back, backLabel } = useMemo(() => {
    if (id) {
      const course = courses[id];
      if (!course) return { scopes: [] as TestScope[], title: '', back: '/', backLabel: 'Library' };
      const section = sectionId ? course.sections.find((s) => s.id === sectionId) : undefined;
      return {
        scopes: [{ courseId: id, course, covers: section ? [section.id] : ('all' as const) }],
        title: section ? `${course.metadata.title}: ${section.title}` : course.metadata.title,
        back: `/study/${id}/practice`,
        backLabel: 'Practice',
      };
    }
    const lectures = code ? lecturesOf(courses, code) : [];
    const exam = examId ? classExams(lectures, now).find((e) => e.id === examId) : undefined;
    return {
      scopes: lectures
        .filter(([lid]) => !exam || exam.covers[lid])
        .map(([lid, course]) => ({ courseId: lid, course, covers: exam ? exam.covers[lid] : ('all' as const) })),
      title: exam ? `${code} · ${exam.name}` : (code ?? ''),
      back: `/class/${encodeURIComponent(code ?? '')}`,
      backLabel: code ?? 'Class',
    };
  }, [id, code, courses, sectionId, examId, now]);

  const pool = useMemo(() => testPool(scopes), [scopes]);
  const scopeKey = id ? `lecture:${id}:${sectionId ?? ''}` : `class:${code ?? ''}:${examId ?? ''}`;

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
  answers: (number | null)[];
  at: number;
  done: boolean;
  recorded: boolean;
}

function loadTest(key: string, pool: TestQuestion[]): (Omit<SavedTest, 'refs'> & { test: TestQuestion[] }) | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const saved = JSON.parse(raw) as SavedTest;
    const byRef = new Map(pool.map((q) => [`${q.courseId}/${q.item.id}`, q]));
    const test: TestQuestion[] = [];
    const answers: (number | null)[] = [];
    saved.refs.forEach((r, i) => {
      const q = byRef.get(`${r.courseId}/${r.itemId}`);
      if (q) {
        test.push(q);
        const a = saved.answers[i];
        answers.push(typeof a === 'number' && a >= 0 && a < q.item.options.length ? a : null);
      }
    });
    if (!test.length) return null;
    return { test, answers, at: Math.min(Math.max(0, saved.at | 0), test.length - 1), done: !!saved.done, recorded: !!saved.recorded };
  } catch {
    return null;
  }
}

function TestRun({ storageKey, pool, header, back }: { storageKey: string; pool: TestQuestion[]; header: ReactNode; back: string }) {
  // Read once: re-reading the store as answers are recorded must not
  // reshuffle the questions under the student.
  const [saved] = useState(() => loadTest(storageKey, pool));
  const [test, setTest] = useState<TestQuestion[] | null>(saved?.test ?? null);
  const [answers, setAnswers] = useState<(number | null)[]>(saved?.answers ?? []);
  const [at, setAt] = useState(saved?.at ?? 0);
  const [done, setDone] = useState(saved?.done ?? false);
  const recorded = useRef(saved?.recorded ?? false);

  useEffect(() => {
    try {
      if (!test) localStorage.removeItem(storageKey);
      else {
        const refs = test.map((q) => ({ courseId: q.courseId, itemId: q.item.id }));
        localStorage.setItem(storageKey, JSON.stringify({ refs, answers, at, done, recorded: recorded.current } satisfies SavedTest));
      }
    } catch {
      // Storage full or blocked: the test still works, it just won't survive a reload.
    }
  }, [storageKey, test, answers, at, done]);

  const start = (questions: TestQuestion[]) => {
    setTest(questions);
    setAnswers(questions.map(() => null));
    setAt(0);
    setDone(false);
    recorded.current = false;
    window.scrollTo(0, 0);
  };

  const finish = () => {
    if (!test) return;
    if (!recorded.current) {
      recorded.current = true;
      // Only what was answered: a blank says nothing about memory.
      test.forEach((q, i) => {
        const chose = answers[i];
        if (chose != null) recordAnswer(q.courseId, q.item, chose === q.item.correct_index);
      });
    }
    setDone(true);
    window.scrollTo(0, 0);
  };

  if (!test) return <Setup header={header} pool={pool} onStart={(n) => start(drawTest(pool, n))} />;
  if (done) {
    return (
      <Results
        header={header}
        test={test}
        answers={answers}
        onRetakeMissed={(missed) => start(drawTest(missed))}
        onNew={() => setTest(null)}
      />
    );
  }
  return (
    <Taking
      test={test}
      at={at}
      answers={answers}
      onPick={(i) => setAnswers((a) => a.map((x, n) => (n === at ? i : x)))}
      onBack={() => setAt((n) => Math.max(0, n - 1))}
      onNext={() => (at + 1 < test.length ? setAt(at + 1) : finish())}
      onEnd={finish}
      backTo={back}
    />
  );
}

function Setup({ header, pool, onStart }: { header: ReactNode; pool: TestQuestion[]; onStart: (n?: number) => void }) {
  const lengths = TEST_LENGTHS.filter((n) => n < pool.length);
  const [length, setLength] = useState<number | undefined>(lengths[0]);
  return (
    <div>
      {header}
      <p className="mt-4 max-w-prose text-small text-text-2">
        The medium and hard questions, the ones that ask you to use what you know rather than recognise it. Answers
        wait until the end, as in an exam; then you see your score and every question you missed, with why.
      </p>
      {pool.length === 0 ? (
        <p className="mt-6 border-y border-border py-3 text-small text-text-2">
          There are no medium or hard questions here yet. More practice, on the lecture page, can write some.
        </p>
      ) : (
        <>
          <div className="mt-6 flex flex-col gap-y-1 border-y border-border py-5 sm:flex-row sm:items-baseline sm:gap-x-3">
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
          <button type="button" onClick={() => onStart(length)} className="press press-ink tap-safe mt-6">
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
  onPick,
  onBack,
  onNext,
  onEnd,
  backTo,
}: {
  test: TestQuestion[];
  at: number;
  answers: (number | null)[];
  onPick: (i: number) => void;
  onBack: () => void;
  onNext: () => void;
  onEnd: () => void;
  backTo: string;
}) {
  const q = test[at];
  const chosen = answers[at];
  const last = at + 1 === test.length;
  const answered = answers.filter((a) => a != null).length;

  useKeyboardShortcuts((e) => {
    const n = Number(e.key);
    if (Number.isInteger(n) && n >= 1 && n <= q.item.options.length) {
      e.preventDefault();
      onPick(n - 1);
    } else if (e.key === 'Enter' || e.key === 'ArrowRight') {
      e.preventDefault();
      onNext();
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
          End and mark it
        </button>
      </div>
      <div className="mt-4 flex items-baseline justify-between gap-3 border-b border-border pb-2">
        <span className="mark text-text-3">
          Question {at + 1} of {test.length}
        </span>
        <span className="text-xs tabular-nums text-text-3">{answered} answered</span>
      </div>
      <div className="prose-set mt-4 text-heading text-text">{q.item.question}</div>
      <div role="radiogroup" aria-label="Answer options" className="mt-4 space-y-2">
        {q.item.options.map((opt, i) => {
          const picked = chosen === i;
          return (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={picked}
              onClick={() => onPick(i)}
              className={`flex w-full items-center gap-3 border-0 border-b px-1 py-3 text-left text-small transition-colors ${
                picked ? 'border-accent text-accent' : 'border-border text-text hover:border-text-3'
              }`}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current text-xs font-semibold">
                {'ABCD'[i] ?? i + 1}
              </span>
              <span>{opt}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-6 flex items-center gap-3">
        <button type="button" onClick={onBack} disabled={at === 0} className="press tap-safe disabled:opacity-40">
          Back
        </button>
        <button type="button" onClick={onNext} className="press press-ink tap-safe">
          {last ? 'Finish and mark it' : chosen == null ? 'Skip' : 'Next'}
        </button>
      </div>
    </div>
  );
}

const SECTIONS_SHOWN = 5;

function Results({
  header,
  test,
  answers,
  onRetakeMissed,
  onNew,
}: {
  header: ReactNode;
  test: TestQuestion[];
  answers: (number | null)[];
  onRetakeMissed: (missed: TestQuestion[]) => void;
  onNew: () => void;
}) {
  const result = useMemo(() => scoreTest(test, answers), [test, answers]);
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
            {result.missed.map(({ q, chose }) => {
              const why = chose != null ? normalisedRationale(q.item)?.[chose] : undefined;
              return (
                <li key={`${q.courseId}/${q.item.id}`} className="border-b border-border py-4">
                  <div className="text-xs text-text-3">
                    {lectures > 1 ? `${q.lecture} · ` : ''}
                    {q.section}
                  </div>
                  <div className="prose-set mt-1 text-body text-text">{q.item.question}</div>
                  <div className="mt-2 text-small text-error">
                    {chose == null ? 'No answer' : `✗ ${q.item.options[chose]}`}
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
