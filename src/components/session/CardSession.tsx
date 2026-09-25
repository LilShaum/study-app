import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useKeyboardShortcuts } from '@/lib/useKeyboardShortcuts';
import type { Course } from '@/schema/course';
import { LEARN_STAGES, learnStageIndex, type AnyItem, type StudyMode } from '@/lib/buildSessionItems';
import { useSessionStore } from '@/store/session';
import { useResumeStore } from '@/store/resume';
import { CourseTree } from '@/components/CourseTree';
import { Fleuron } from '@/components/Fleuron';
import { EMPTY_PROGRESS, useProgressStore } from '@/store/progress';
import { ItemRenderer } from '@/components/items/ItemRenderer';
import { SectionJump } from './SectionJump';
import { examTime, nextDueAt, whenLabel } from '@/lib/memory';

type CardMode = Exclude<StudyMode, 'browse'>;

interface CardSessionProps {
  courseId: string;
  course: Course;
  mode: CardMode;
  /** Scope the session to one section; undefined studies the whole course. */
  sectionId?: string;
  /** Start from the saved bookmark for this course rather than at item 1. */
  resume?: boolean;
}

const MODE_LABELS: Record<CardMode, string> = {
  learn: 'Learn',
  weakest: 'Weakest first',
  quiz: 'Quiz',
  flashcards: 'Flashcards',
  definitions: 'Terms',
  mixed: 'Mixed',
  missed: 'Review Missed',
  review: 'Review',
};

interface KeyHint {
  keys: string[];
  label: string;
}

const NAV_HINTS: KeyHint[] = [
  { keys: ['←', '→'], label: 'prev / next' },
  { keys: ['Esc'], label: 'back' },
];

const ALL_CARD_KEYS: KeyHint[] = [
  { keys: ['1', '–', '4'], label: 'select' },
  { keys: ['Space'], label: 'flip' },
  { keys: ['Enter'], label: 'check / next' },
  { keys: ['G'], label: 'got' },
  { keys: ['M'], label: 'missed' },
  ...NAV_HINTS,
];

const KEY_HINTS: Record<CardMode, KeyHint[]> = {
  learn: ALL_CARD_KEYS,
  weakest: ALL_CARD_KEYS,
  review: ALL_CARD_KEYS,
  quiz: [
    { keys: ['1', '–', '4'], label: 'select' },
    { keys: ['Enter'], label: 'check / next' },
    ...NAV_HINTS,
  ],
  flashcards: [
    { keys: ['Space'], label: 'flip' },
    { keys: ['G'], label: 'got it' },
    { keys: ['M'], label: 'missed it' },
    ...NAV_HINTS,
  ],
  definitions: [{ keys: ['Enter'], label: 'check / next' }, ...NAV_HINTS],
  mixed: [
    { keys: ['1', '–', '4'], label: 'select' },
    { keys: ['Space'], label: 'flip' },
    { keys: ['Enter'], label: 'check / next' },
    { keys: ['G'], label: 'got' },
    { keys: ['M'], label: 'missed' },
    ...NAV_HINTS,
  ],
  missed: [
    { keys: ['1', '–', '4'], label: 'select' },
    { keys: ['Space'], label: 'flip' },
    { keys: ['Enter'], label: 'check / next' },
    ...NAV_HINTS,
  ],
};

const EMPTY_COPY: Record<CardMode, { title: string; text: string }> = {
  learn: { title: 'Nothing to learn yet', text: 'This course has no items to walk through.' },
  weakest: {
    title: 'Nothing to rank',
    text: 'Weakest First orders the questions and flashcards you can be scored on, and this course has none yet.',
  },
  quiz: { title: 'No MCQ items', text: "This course doesn't have any MCQ items yet. Try Browse or Mixed mode." },
  flashcards: {
    title: 'No Flashcard items',
    text: "This course doesn't have any Flashcard items yet. Try Browse or Mixed mode.",
  },
  definitions: {
    title: 'No terms',
    text: "This course doesn't have any definitions to ask you for yet. Try Browse or Mixed mode.",
  },
  review: {
    title: 'Nothing is due',
    text: 'Everything you have studied is still fresh. Review brings items back as they start to fade — new material comes through Learn.',
  },
  mixed: { title: 'No items', text: 'This course has no items yet.' },
  missed: {
    title: 'Nothing to review',
    text:
      "You haven't missed anything yet — or you've already nailed it on a retry. Study some Quiz or Flashcards to build up practice history.",
  },
};

/**
 * Where you are in the taught sequence.
 *
 * Learn mode reorders content the student already has, so without this the
 * only visible difference from Mixed is that the cards happen to arrive in a
 * better order. Naming the stage is what makes the sequence teachable.
 */
function LearnStageBanner({ item }: { item: { type: AnyItem['type']; _sectionTitle: string } }) {
  const stage = learnStageIndex(item.type);
  if (stage < 0) return null;
  const { label, hint } = LEARN_STAGES[stage];

  return (
    <div className="mb-4 rounded-lg border border-border bg-surface px-4 py-2.5">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-text">{label}</span>
        <span className="ml-auto flex gap-1" aria-hidden="true">
          {LEARN_STAGES.map((s, i) => (
            <span
              key={s.key}
              className={`h-px w-6 ${i <= stage ? 'bg-text' : 'bg-border-strong'}`}
            />
          ))}
        </span>
      </div>
      <div className="mt-0.5 text-xs text-text-3">{hint}</div>
    </div>
  );
}

/** Every mode except Browse — one item at a time. */
export function CardSession({ courseId, course, mode, sectionId, resume = false }: CardSessionProps) {
  const navigate = useNavigate();
  // Read after the session has recorded its results, so the tree on the
  // finish screen is the tree this session just grew.
  const progress = useProgressStore((s) => s.getProgress(courseId) ?? EMPTY_PROGRESS);
  const init = useSessionStore((s) => s.init);
  const items = useSessionStore((s) => s.items);
  const index = useSessionStore((s) => s.index);
  const score = useSessionStore((s) => s.score);
  const current = useSessionStore((s) => s.current());
  const total = useSessionStore((s) => s.total());
  const hasNext = useSessionStore((s) => s.hasNext());
  const hasPrev = useSessionStore((s) => s.hasPrev());
  const next = useSessionStore((s) => s.next);
  const prev = useSessionStore((s) => s.prev);
  const record = useSessionStore((s) => s.record);
  const setResult = useSessionStore((s) => s.setResult);
  // `finished` lives in the session store rather than in local state: it
  // describes the session, so init() clears it as part of starting one. Held
  // locally it had to be reset from an effect, which meant a setState during
  // an effect body and an extra render pass on every session start.
  const finished = useSessionStore((s) => s.finished);
  const finish = useSessionStore((s) => s.finish);
  const resumed = useSessionStore((s) => s.resumed);
  const activeSectionId = useSessionStore((s) => s.activeSectionId);
  const jumpToSection = useSessionStore((s) => s.jumpToSection);

  useEffect(() => {
    // Read the bookmark rather than subscribing to it: this session writes one
    // on every card, and a subscription would re-run this effect and restart
    // the session each time.
    const bookmark = resume ? useResumeStore.getState().getBookmark(courseId) : null;
    const usable =
      bookmark && bookmark.mode === mode && (bookmark.sectionId ?? undefined) === sectionId
        ? bookmark.itemId
        : undefined;
    init(courseId, course, mode, sectionId, usable);
  }, [courseId, course, mode, sectionId, resume, init]);

  // Remember where you are, so closing the tab 60 cards into a 151-card
  // session doesn't mean starting again. Item 1 is not worth remembering —
  // that is just "you opened it" — so the bookmark starts once you've moved.
  useEffect(() => {
    if (finished || !current || index === 0) return;
    useResumeStore.getState().save(courseId, {
      mode,
      sectionId: sectionId ?? null,
      itemId: current.id,
      index,
      total,
      updatedAt: Date.now(),
    });
  }, [courseId, mode, sectionId, index, current, total, finished]);

  const restart = () => {
    useResumeStore.getState().clear(courseId);
    init(courseId, course, mode, sectionId);
  };

  /**
   * When what was just studied comes back, said as a plan: "12 of these come
   * back tomorrow". Worked out once, at the moment the session ends — from
   * the answers it just recorded — rather than while rendering, which must
   * not read the clock.
   *
   * This is the app's reason to return, and deliberately not a streak: not
   * "don't break your chain", but the date on which the things you learned
   * today will actually be slipping.
   */
  const [appointment, setAppointment] = useState<string | null>(null);
  const appointmentFor = (): string | null => {
    const { items: done, results } = useSessionStore.getState();
    const prog = useProgressStore.getState().getProgress(courseId);
    const now = Date.now();
    const examAt = examTime(course.metadata.exam_date);
    const ids = new Set([...results.keys()].map((i) => done[i]?.id).filter(Boolean) as string[]);
    const dues = [...ids].map((itemId) => nextDueAt(prog[itemId], now, examAt)).filter((t): t is number => t != null);
    if (!dues.length) return null;
    const first = Math.min(...dues);
    const endOfThatDay = new Date(first);
    endOfThatDay.setHours(23, 59, 59, 999);
    const n = dues.filter((t) => t <= endOfThatDay.getTime()).length;
    const when = whenLabel(first, now);
    if (n === dues.length) return dues.length === 1 ? `This comes back ${when}.` : `These come back ${when}.`;
    return `${n} of these come back ${when}; the rest later.`;
  };

  const handleNext = () => {
    if (next()) return;
    // Finishing is the one clean end: there is nothing left to come back to.
    useResumeStore.getState().clear(courseId);
    setAppointment(appointmentFor());
    finish();
  };
  const retryMissed = useSessionStore((s) => s.retryMissed);

  // Session-level keys. The cards own their own shortcuts (1-4, Space, G/M,
  // Enter) since only they know their internal state.
  useKeyboardShortcuts(
    (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        navigate(`/study/${courseId}`);
        return;
      }
      // Inside the MCQ radiogroup, arrows move the selection instead — the
      // card's own handler owns them there.
      const inRadioGroup = document.activeElement?.closest('[role="radiogroup"]');
      if (inRadioGroup) return;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft' && hasPrev) {
        e.preventDefault();
        prev();
      } else if (e.key === 'Enter' && (current?.type === 'example' || current?.type === 'graphic')) {
        // Cards with no internal state advance on Enter.
        e.preventDefault();
        handleNext();
      }
    },
    !finished && total > 0,
  );

  if (total === 0) {
    const copy = EMPTY_COPY[mode];
    return (
      <div className="mx-auto max-w-2xl p-10 text-center">
        <Link to={`/study/${courseId}`} className="tap-safe inline-flex items-center text-sm text-text-2 hover:text-text">
          ← Back
        </Link>
        <h1 className="mt-4 text-xl font-semibold text-text">{copy.title}</h1>
        <p className="mt-2 text-text-2">{copy.text}</p>
        <Link
          to={`/study/${courseId}`}
          className="press press-ink mt-4"
        >
          Back to Course
        </Link>
      </div>
    );
  }

  if (finished) {
    const attempted = score.got + score.missed;
    const pct = attempted > 0 ? Math.round((score.got / attempted) * 100) : 100;
    return (
      /*
       * The end of a session is where the tree pays off.
       *
       * It used to be a green tick, three numbers and two buttons — the one
       * moment in the app where something has actually been earned, and the
       * most generic screen in it. The course's own tree draws itself on
       * here, carrying the growth this session just put into it, because a
       * number cannot show you that a branch you had never opened is now in
       * leaf.
       */
      <div className="mx-auto flex max-w-2xl flex-col items-center p-10 text-center">
        <CourseTree
          courseId={courseId}
          course={course}
          progress={progress}
          className="h-44 sm:h-56"
          animate
        />
        <Fleuron className="mt-4" />
        <h1 className="mt-3 font-display text-title font-semibold text-text">
          {MODE_LABELS[mode]} finished
        </h1>
        <div className="mt-3 flex justify-center gap-5 text-small tabular-nums">
          <span className="text-success">{score.got} correct</span>
          <span className="text-error">{score.missed} missed</span>
          {attempted > 0 && <span className="text-text-2">{pct}%</span>}
        </div>
        {appointment && <p className="mt-3 max-w-prose text-small text-text-2">{appointment}</p>}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {/* Straight back over what went wrong, while the correction is
              fresh — the most useful next step when there is one, so it
              leads. */}
          {score.missed > 0 && (
            <button type="button" onClick={retryMissed} className="press press-ink tap-safe">
              Try the {score.missed} you missed again
            </button>
          )}
          <button
            type="button"
            onClick={restart}
            className={`press tap-safe ${score.missed > 0 ? '' : 'press-ink'}`}
          >
            Study again
          </button>
          <Link
            to={`/study/${courseId}`}
            className="press tap-safe"
          >
            Back to course
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative mx-auto max-w-2xl p-6">
      {/* A marginal figure: the course's tree with the section you are in
          lit, in the margin a page has anyway. The one screen you spend the
          most time on had nothing of the course on it but its text. */}
      <div className="absolute -left-40 top-24 hidden xl:block" aria-hidden="true">
        <CourseTree
          courseId={courseId}
          course={course}
          progress={progress}
          className="h-40"
          highlight={activeSectionId}
        />
      </div>
      <div className="mb-4 flex items-center justify-between">
        <Link to={`/study/${courseId}`} className="tap-safe inline-flex items-center text-sm text-text-2 hover:text-text">
          ← Back
        </Link>
        <span className="flex items-baseline gap-2">
          <span className="rounded border border-border px-2.5 py-0.5 text-xs font-medium text-text-2">
            {MODE_LABELS[mode]}
          </span>
          <span className="whitespace-nowrap text-xs tabular-nums text-text-3">
            {index + 1} / {items.length}
          </span>
        </span>
        <div className="flex gap-3 text-sm">
          <span className="text-success">✓ {score.got}</span>
          <span className="text-error">✗ {score.missed}</span>
        </div>
      </div>

      {/* The bar alone. Its caption said "12 / 46" directly under a bar that
          was already 26% full, and sat above a section readout and a stage
          readout — four statements of where you are before any content. */}
      {/* A rule that inks in, not a pill that fills with blue. The rounded
          accent bar was the last painted surface in the app and read as a
          browser download bar; a hairline whose left portion is struck in
          full ink says the same thing in the page's own voice. */}
      <div className="mb-4 h-px w-full bg-border-strong">
        <div
          className="h-px bg-text transition-all"
          style={{ width: `${((index + 1) / items.length) * 100}%` }}
        />
      </div>

      <SectionJump items={items} mode={mode} activeSectionId={activeSectionId} onJump={jumpToSection} />

      {resumed && (
        <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-border bg-surface px-4 py-2 text-sm">
          <span className="text-text-2">Picked up where you left off.</span>
          <button type="button" onClick={restart} className="text-accent hover:underline">
            Start from the beginning
          </button>
        </div>
      )}

      {mode === 'learn' && current && <LearnStageBanner item={current} />}
      {mode === 'review' && (
        <p className="mb-4 text-xs text-text-3">
          What you have studied and are starting to lose, faintest first.
        </p>
      )}
      {mode === 'weakest' && (
        <p className="mb-4 text-xs text-text-3">
          Ordered by your own accuracy — shakiest first, then anything you haven&rsquo;t seen yet.
        </p>
      )}

      {current && (
        <ItemRenderer
          key={current.id}
          item={current}
          frame="sheet"
          onAnswered={record}
          // Grading a flashcard also advances it, as the vanilla app did —
          // otherwise the card just flips back and looks like nothing happened.
          onGot={() => {
            record(true);
            handleNext();
          }}
          onMissed={() => {
            record(false);
            handleNext();
          }}
          onOverride={setResult}
          onNext={handleNext}
          keyboardEnabled
        />
      )}

      <div className="mt-4 flex justify-between">
        <button
          type="button"
          disabled={!hasPrev}
          onClick={prev}
          className="press"
        >
          ← Prev
        </button>
        <button
          type="button"
          onClick={handleNext}
          className="press"
        >
          {hasNext ? 'Next →' : 'Finish'}
        </button>
      </div>

      {/* Hidden on touch, where there's no keyboard to hint about. */}
      <p className="mt-4 hidden flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-3 [@media(hover:hover)]:flex">
        {KEY_HINTS[mode].map((hint) => (
          <span key={hint.keys.join()} className="flex items-center gap-1">
            {hint.keys.map((k) => (
              <kbd key={k} className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[11px]">
                {k}
              </kbd>
            ))}
            <span>{hint.label}</span>
          </span>
        ))}
      </p>
    </div>
  );
}
