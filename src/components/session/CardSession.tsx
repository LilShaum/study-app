import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useKeyboardShortcuts } from '@/lib/useKeyboardShortcuts';
import type { Course } from '@/schema/course';
import { buildSessionItems, REVIEW_SITTING, type SessionItem, type StudyMode } from '@/lib/buildSessionItems';
import { phaseOf, type LearnPhase } from '@/lib/learnSteps';
import { useSessionStore } from '@/store/session';
import { useResumeStore } from '@/store/resume';
import { CourseTree } from '@/components/CourseTree';
import { EMPTY_PROGRESS, useProgressStore } from '@/store/progress';
import { ItemRenderer } from '@/components/items/ItemRenderer';
import { SectionJump } from './SectionJump';
import { nextDueAt, whenLabel } from '@/lib/memory';
import { examRule } from '@/lib/exam';

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
  today: 'Today',
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
  today: ALL_CARD_KEYS,
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
  today: {
    title: 'Nothing for today',
    text: 'Nothing is due and everything here has been studied. Add material after your next lecture, or practise with Quiz or Mixed.',
  },
  missed: {
    title: 'Nothing to review',
    text:
      "You haven't missed anything yet — or you've already nailed it on a retry. Study some Quiz or Flashcards to build up practice history.",
  },
};

const PHASES: { key: LearnPhase; label: string }[] = [
  { key: 'read', label: 'Read' },
  { key: 'recall', label: 'Recall' },
  { key: 'apply', label: 'Apply' },
];

/**
 * Where you are in Learn: which step of the section, and which part of it.
 *
 * Set as a ruled line in the page's own voice. It used to be a boxed panel
 * naming one of three stages that each lasted forty cards, so it said the
 * same thing for minutes at a time.
 */
function StepLine({ item }: { item: SessionItem }) {
  const phase = phaseOf(item.type);
  // Today's sitting opens with what is due; say so, the way a step is named.
  if (item._block === 'review') {
    return (
      <div className="mb-4 flex items-baseline gap-3 border-b border-border pb-2 text-small">
        <span className="mark text-text-3">Review</span>
        <span className="text-text-2">what you have studied and are starting to lose</span>
        {item._again ? <span className="ml-auto whitespace-nowrap text-text-2">Again, from earlier</span> : null}
      </div>
    );
  }
  if (item._step === undefined || !phase) return null;
  const at = PHASES.findIndex((p) => p.key === phase);
  return (
    <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border pb-2 text-small">
      <span className="mark whitespace-nowrap text-text-3">
        Step {item._step + 1} of {item._steps}
      </span>
      {/* All three parts where there is room; on a phone, the one you are in. */}
      <span className="flex items-baseline gap-2 whitespace-nowrap" aria-label={`Part: ${PHASES[at].label}`}>
        {PHASES.map((p, i) => (
          <span
            key={p.key}
            className={i === at ? 'text-text' : 'hidden text-text-3 sm:inline'}
            aria-hidden="true"
          >
            {p.label}
          </span>
        ))}
      </span>
      {item._again ? <span className="ml-auto whitespace-nowrap text-text-2">Again, from earlier</span> : null}
    </div>
  );
}

/** What the step just finished covered, for the pause after it. */
interface Pause {
  /** Today only: the review part of the sitting has ended and Learn is next. */
  reviewDone: boolean;
  step: number;
  steps: number;
  section: string;
  /** True when the next card is in another section. */
  sectionDone: boolean;
  terms: string[];
  got: number;
  asked: number;
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
  const startProgress = useSessionStore((s) => s.startProgress);
  const finish = useSessionStore((s) => s.finish);
  const resumed = useSessionStore((s) => s.resumed);
  const activeSectionId = useSessionStore((s) => s.activeSectionId);
  const jumpToSection = useSessionStore((s) => s.jumpToSection);
  const stillMissed = useSessionStore((s) => s.stillMissed);
  /** Learn: the pause between two steps, while it is showing. */
  const [pause, setPause] = useState<Pause | null>(null);

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
  /** Review only: how many are still due once this sitting is done. */
  const [moreDue, setMoreDue] = useState(0);
  const appointmentFor = (): string | null => {
    const { items: done, results } = useSessionStore.getState();
    const prog = useProgressStore.getState().getProgress(courseId);
    const now = Date.now();
    const exam = examRule(course, prog, now);
    const ids = new Set([...results.keys()].map((i) => done[i]?.id).filter(Boolean) as string[]);
    const dues = [...ids].map((itemId) => nextDueAt(prog[itemId], now, exam.covering(itemId))).filter((t): t is number => t != null);
    if (!dues.length) return null;
    const first = Math.min(...dues);
    const endOfThatDay = new Date(first);
    endOfThatDay.setHours(23, 59, 59, 999);
    const n = dues.filter((t) => t <= endOfThatDay.getTime()).length;
    const when = whenLabel(first, now);
    if (n === dues.length) return dues.length === 1 ? `This comes back ${when}.` : `These come back ${when}.`;
    return `${n} of these come back ${when}; the rest later.`;
  };

  /** The step that ends at the current card, summed up for the pause. */
  const pauseAfter = (): Pause | null => {
    const { items: all, index: at, results } = useSessionStore.getState();
    const here = all[at];
    const after = all[at + 1];
    if ((mode !== 'learn' && mode !== 'today') || !here?._block || !after || after._block === here._block) return null;
    const inStep = all.map((item, n) => ({ item, n })).filter(({ item }) => item._block === here._block);
    const first = inStep.filter(({ item, n }) => !item._again && results.has(n));
    const owner = inStep.find(({ item }) => !item._again)?.item ?? here;
    return {
      reviewDone: here._block === 'review',
      step: owner._step ?? 0,
      steps: owner._steps ?? 1,
      section: owner._sectionTitle,
      sectionDone: after._sectionId !== here._sectionId,
      terms: inStep.flatMap(({ item }) =>
        item.type === 'definition' || (item.type === 'recall' && !item.question && !item._again)
          ? [item.type === 'definition' ? item.term : item.target.term]
          : [],
      ).filter((t, i, list) => t && list.indexOf(t) === i),
      got: first.filter(({ n }) => results.get(n)).length,
      asked: first.length,
    };
  };

  const handleNext = () => {
    const stop = pauseAfter();
    if (next()) {
      if (stop) setPause(stop);
      return;
    }
    // Finishing is the one clean end: there is nothing left to come back to.
    useResumeStore.getState().clear(courseId);
    if (mode === 'review') {
      const still = buildSessionItems(course, 'review', {
        sectionId,
        progress: useProgressStore.getState().getProgress(courseId),
        exam: examRule(course, useProgressStore.getState().getProgress(courseId), Date.now()),
      }).length;
      setMoreDue(still);
      // While more is due now, "these come back tomorrow" is not the news.
      setAppointment(still > 0 ? null : appointmentFor());
    } else {
      setMoreDue(0);
      setAppointment(appointmentFor());
    }
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
      if (pause) {
        if (e.key === 'Enter' || e.key === 'ArrowRight') {
          e.preventDefault();
          setPause(null);
        }
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
    // Not score.missed: in Learn a miss comes back until it is right, and
    // one put right in the sitting is not still to retry.
    const missedNow = stillMissed().length;
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
          // What this session changed, shown on the tree: leaves won back
          // rise from the ground, new ones grow. It replaced a draw-on of the
          // whole tree, which looked the same whatever the session had done.
          grewFrom={startProgress}
        />
        <h1 className="mt-5 font-display text-title font-semibold text-text">
          {MODE_LABELS[mode]} finished
        </h1>
        <div className="mt-3 flex justify-center gap-5 text-small tabular-nums">
          <span className="text-success">{score.got} correct</span>
          <span className="text-error">{score.missed} missed</span>
          {attempted > 0 && <span className="text-text-2">{pct}%</span>}
        </div>
        {appointment && <p className="mt-3 max-w-prose text-small text-text-2">{appointment}</p>}
        {moreDue > 0 && (
          <p className="mt-3 max-w-prose text-small text-text-2">
            {moreDue} more {moreDue === 1 ? 'is' : 'are'} due.
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {/* Straight back over what went wrong, while the correction is
              fresh — the most useful next step when there is one, so it
              leads. */}
          {moreDue > 0 && (
            <button type="button" onClick={restart} className="press press-ink tap-safe">
              Review the next {Math.min(moreDue, REVIEW_SITTING)}
            </button>
          )}
          {mode === 'today' && (
            <button type="button" onClick={restart} className="press press-ink tap-safe">
              Keep going
            </button>
          )}
          {missedNow > 0 && (
            <button
              type="button"
              onClick={retryMissed}
              className={`press tap-safe ${moreDue > 0 || mode === 'today' ? '' : 'press-ink'}`}
            >
              Try the {missedNow} you missed again
            </button>
          )}
          {/* Today is planned in whole steps, so it usually ends a little
              short of the time set aside; carrying on is a fresh plan from
              where things now stand. The simulator found this is what makes
              Today match its plan (sim/FINDINGS.md). */}
          {/* In Review with more due, "Review the next" already is this. */}
          {moreDue === 0 && mode !== 'today' && (
            <button
              type="button"
              onClick={restart}
              className={`press tap-safe ${missedNow > 0 ? '' : 'press-ink'}`}
            >
              Study again
            </button>
          )}
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

      {(mode === 'learn' || mode === 'today') && current && !pause && <StepLine item={current} />}
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

      {pause && (
        /*
         * A place to stop. Learn used to run a whole section as one sitting
         * of up to 114 cards with nowhere to put it down; now each step ends
         * here, says what it covered, and the next one is one key away. Stop
         * keeps your place: the bookmark already points at the next step.
         */
        <div className="border-b border-border pb-8 pt-6 text-center">
          <p className="mark text-text-3">
            {pause.reviewDone
              ? 'Review done'
              : pause.sectionDone
                ? `End of ${pause.section}`
                : `Step ${pause.step + 1} of ${pause.steps} done`}
          </p>
          {pause.asked > 0 && (
            <p className="mt-2 font-display text-heading font-semibold text-text">
              {pause.got} of {pause.asked} right first time
            </p>
          )}
          {pause.reviewDone && (
            <p className="mx-auto mt-2 max-w-prose text-small text-text-2">
              Next, new material: {items[index]?._sectionTitle}
            </p>
          )}
          {!pause.reviewDone && pause.terms.length > 0 && (
            <p className="mx-auto mt-2 max-w-prose text-small text-text-2">{pause.terms.join(' · ')}</p>
          )}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button type="button" onClick={() => setPause(null)} className="press press-ink tap-safe" autoFocus>
              {pause.reviewDone ? 'Start learning' : pause.sectionDone ? 'Next section' : 'Next step'}
            </button>
            <Link to={`/study/${courseId}`} className="press tap-safe">
              Stop here
            </Link>
          </div>
        </div>
      )}

      {current && !pause && (
        <ItemRenderer
          // By position as well as id: a missed card that comes back is the
          // same item, and must start unanswered.
          key={`${current.id}@${index}`}
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
          onConfused={(otherId) => useProgressStore.getState().noteConfusion(courseId, current.id, otherId)}
          onNext={handleNext}
          keyboardEnabled
        />
      )}

      <div className={`mt-4 flex justify-between ${pause ? 'hidden' : ''}`}>
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
      <p
        className={`mt-4 hidden flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-3 ${pause ? '' : '[@media(hover:hover)]:flex'}`}
      >
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
