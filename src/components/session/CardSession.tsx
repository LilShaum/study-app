import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useKeyboardShortcuts } from '@/lib/useKeyboardShortcuts';
import type { Course } from '@/schema/course';
import { buildSessionItems, type SessionItem, type StudyMode } from '@/lib/buildSessionItems';
import { explanationFor, phaseOfItem, type LearnPhase } from '@/lib/learnSteps';
import { useSessionStore, restartCardTimer, fileItemOf, isSetAside, lectureOf, cardKey, AGAIN_MAX } from '@/store/session';
import { onlyStudies } from '@/lib/studies';
import { toast } from '@/store/toast';
import { resumesOnOpen, useResumeStore } from '@/store/resume';
import { CourseTree } from '@/components/CourseTree';
import { answered, EMPTY_PROGRESS, useProgressStore } from '@/store/progress';
import { ItemRenderer } from '@/components/items/ItemRenderer';
import { RichText } from '@/components/items/RichText';
import type { ComesBack } from '@/components/items/FlashcardCard';
import { SectionJump } from './SectionJump';
import { SessionGlossary } from './SessionGlossary';
import { AdaptiveBar } from './AdaptiveBar';
import { glossaryOf } from '@/lib/glossary';
import { SessionRail } from './SessionRail';
import type { CardStage } from '@/lib/useReportStage';
import { useMediaQuery, WIDE } from '@/lib/useMediaQuery';
import { useSwipe } from '@/lib/useSwipe';
import { ThumbBar } from '@/components/ThumbBar';
import { Sheet } from '@/components/Sheet';
import { MixedLectures } from './MixedLectures';
import { CATCH_UP_HOURS, inWords, missedThisSitting, nextDueAt, whenLabel, type Grade } from '@/lib/memory';
import { examRule } from '@/lib/exam';
import { useCoursesStore } from '@/store/courses';
import { useLearnStore } from '@/store/learn';
import { measuredPace, useStudyLogStore } from '@/store/studyLog';
import { todayAcrossCourses, type CourseToday } from '@/lib/libraryToday';
import { plannedMinutes, studiedToday, todaySitting } from '@/lib/todaySitting';
import { CATCH_UP_MINUTES, PART_GAP_HOURS } from '@/lib/today';
import { sectionsToLearn } from '@/lib/nextToLearn';
import { lectureName, lecturesOf } from '@/lib/classExams';
import { choiceCount, choiceLink, choiceOf, countBasis, practiceCount, practiceLink } from '@/lib/practice';
import { encodeChoice } from '@/lib/practiceChoice';
import { answerPoints } from '@/lib/answerPoints';
import { answerKind } from '@/lib/problemAnswer';
import { termPicked } from '@/lib/mixUps';

type CardMode = Exclude<StudyMode, 'browse'>;

/** The cards that ask: while one is unanswered the glossary stays shut. */
const QUESTION_TYPES = new Set<SessionItem['type']>(['mcq', 'multi', 'flashcard', 'recall', 'problem']);

/** How far back (and ahead, after Prev) answered cards stay as they were left. */
const KEEP_NEAR = 15;
const uids = new WeakMap<SessionItem, number>();
let lastUid = 0;
/** A card's key for the sitting: the object, so it holds while cards are added or dropped around it. */
function cardUid(item: SessionItem): number {
  let uid = uids.get(item);
  if (uid === undefined) uids.set(item, (uid = ++lastUid));
  return uid;
}

interface CardSessionProps {
  courseId: string;
  course: Course;
  mode: CardMode;
  /** Scope the session to one section; undefined studies the whole course. */
  sectionId?: string;
  /** Start from the saved bookmark for this course rather than at item 1. */
  resume?: boolean;
  /** Today from a class page: the next lecture offered is the class's. */
  classCode?: string;
  /**
   * This lecture only, so the end offers no next lecture: the class
   * Practice's choice was one lecture, or Today was started from the
   * library's one-lecture row rather than its Start for the whole day
   * (docs/proposals/design-audit.md §3A).
   */
  single?: boolean;
  /**
   * With classCode: the class's lectures mixed in one sitting
   * (store/session initMixed), rather than this lecture and then the next.
   */
  mixed?: boolean;
}

const MODE_LABELS: Record<CardMode, string> = {
  learn: 'Learn',
  weakest: 'Weakest first',
  quiz: 'Multiple choice',
  flashcards: 'Flashcards',
  definitions: 'Terms',
  problems: 'Problems',
  practice: 'Practice',
  mixed: 'Everything',
  missed: 'Mistakes',
  review: 'Review',
  today: 'Today',
  adaptive: 'Adaptive quiz',
};

interface KeyHint {
  keys: string[];
  label: string;
}

const NAV_HINTS: KeyHint[] = [
  { keys: ['←', '→'], label: 'prev / next' },
  { keys: ['Esc'], label: 'back' },
];

/** A select-all question: a number ticks or unticks its statement. */
const MULTI_HINTS: KeyHint[] = [
  { keys: ['1', '–', '6'], label: 'tick' },
  { keys: ['Enter'], label: 'check' },
  ...NAV_HINTS,
];

const ALL_CARD_KEYS: KeyHint[] = [
  { keys: ['1', '–', '4'], label: 'choose' },
  { keys: ['Space'], label: 'flip' },
  { keys: ['Enter'], label: 'check' },
  { keys: ['G'], label: 'got' },
  { keys: ['H'], label: 'hard' },
  { keys: ['M'], label: 'missed' },
  ...NAV_HINTS,
];

/**
 * When a flip card comes back after each grade, for the words under its
 * buttons: the progress store's own after-answer rule, then when that
 * record is next due (an exam near included). A miss in Learn comes back
 * in the same sitting (store/session requeue), and says so. Undefined for
 * any other card.
 */
function comesBackFor(item: SessionItem, lectureId: string, lecture: Course | undefined, mode: StudyMode): ComesBack | undefined {
  if (item.type !== 'flashcard' || answerPoints(item)) return undefined;
  const now = Date.now();
  const progress = useProgressStore.getState().getProgress(lectureId);
  const was = progress[item.id];
  const examAt = lecture ? examRule(lecture, progress, now).covering(item.id) : null;
  const when = (got: boolean, grade?: Grade) => {
    const at = nextDueAt(answered(was, got, now, grade), now, examAt);
    return at == null ? '' : inWords(at - now);
  };
  const requeues = (mode === 'learn' || (mode === 'today' && item._step !== undefined)) && (item._again ?? 0) < AGAIN_MAX;
  return { got: when(true), hard: when(true, 'hard'), missed: requeues ? 'again this sitting' : when(false) };
}

/** A question's explanation, from its section of its own lecture (lib/learnSteps explanationFor). */
function ideaFor(item: SessionItem, lecture: Course | undefined): { title: string; text: string } | null {
  if ((item.type !== 'mcq' && item.type !== 'multi') || !lecture) return null;
  const section = lecture.sections.find((s) => s.id === item._sectionId);
  const ex = section ? explanationFor(item, section.items as SessionItem[]) : null;
  return ex ? { title: ex.title, text: ex.text } : null;
}

const KEY_HINTS: Record<CardMode, KeyHint[]> = {
  adaptive: ALL_CARD_KEYS,
  learn: ALL_CARD_KEYS,
  weakest: ALL_CARD_KEYS,
  review: ALL_CARD_KEYS,
  today: ALL_CARD_KEYS,
  quiz: [
    { keys: ['1', '–', '4'], label: 'choose' },
    { keys: ['Enter'], label: 'check' },
    ...NAV_HINTS,
  ],
  flashcards: [
    { keys: ['Space'], label: 'flip' },
    { keys: ['G'], label: 'got it' },
    { keys: ['H'], label: 'hard' },
    { keys: ['M'], label: 'missed it' },
    ...NAV_HINTS,
  ],
  definitions: [{ keys: ['Enter'], label: 'check' }, ...NAV_HINTS],
  problems: [{ keys: ['Enter'], label: 'check' }, ...NAV_HINTS],
  practice: ALL_CARD_KEYS,
  mixed: [
    { keys: ['1', '–', '4'], label: 'choose' },
    { keys: ['Space'], label: 'flip' },
    { keys: ['Enter'], label: 'check' },
    { keys: ['G'], label: 'got' },
    { keys: ['H'], label: 'hard' },
    { keys: ['M'], label: 'missed' },
    ...NAV_HINTS,
  ],
  missed: [
    { keys: ['1', '–', '4'], label: 'choose' },
    { keys: ['Space'], label: 'flip' },
    { keys: ['Enter'], label: 'check' },
    ...NAV_HINTS,
  ],
};

/** A short- or long-answer card (lib/answerPoints) has its own keys, whatever the mode. */
const WRITTEN_HINTS: KeyHint[] = [
  { keys: ['Space'], label: 'show the answer' },
  { keys: ['1', '–', '9'], label: 'tick a point' },
  { keys: ['Enter'], label: 'done' },
  ...NAV_HINTS,
];
/** A problem checked against its steps (lib/problemAnswer, 'self'). */
const STEPS_HINTS: KeyHint[] = [
  { keys: ['Space'], label: 'show the solution' },
  { keys: ['1', '–', '9'], label: 'tick a step' },
  { keys: ['Enter'], label: 'done' },
  ...NAV_HINTS,
];
const ONE_POINT_HINTS: KeyHint[] = [
  { keys: ['Space'], label: 'show the answer' },
  { keys: ['G'], label: 'got it' },
  { keys: ['M'], label: 'missed it' },
  ...NAV_HINTS,
];

/** "1–4" for a run of number keys, else the keys side by side. */
function keyText(keys: string[]): string {
  return keys[1] === '–' ? keys.join('') : keys.join(' / ');
}

/**
 * The keys that work on this card right now, for the line under it: from the
 * card, whether it is answered, and the stage it reports (flipped, "I don't
 * know"), so no key is listed that would do nothing. The full list stays
 * behind the ? button.
 */
function keysFor(
  current: SessionItem | null | undefined,
  hints: KeyHint[],
  written: ReturnType<typeof answerPoints>,
  stage: CardStage,
  answeredNow: boolean,
  pause: boolean,
): KeyHint[] {
  if (!current || pause) return [];
  const next: KeyHint = { keys: ['→'], label: 'next' };
  const pick = (list: KeyHint[], ...first: string[]) => list.filter((h) => first.includes(h.keys[0]));
  /** The number keys run to the card's own count, not the list's. */
  const upTo = (list: KeyHint[], n: number) =>
    list.map((h) => (h.keys.length === 3 ? { ...h, keys: [h.keys[0], '–', String(Math.min(9, Math.max(1, n)))] } : h));
  const enterNext: KeyHint = { keys: ['Enter'], label: 'next' };
  switch (current.type) {
    case 'mcq':
    case 'multi':
      return answeredNow ? [next] : pick(hints, '1', 'Enter');
    case 'flashcard':
      if (written) {
        if (stage === 'front') return pick(WRITTEN_HINTS, 'Space');
        if (stage === 'dont') return [enterNext];
        return written.points.length === 1 ? pick(ONE_POINT_HINTS, 'G', 'M') : upTo(pick(WRITTEN_HINTS, '1', 'Enter'), written.points.length);
      }
      if (stage === 'front') return pick(KEY_HINTS.flashcards, 'Space');
      return stage === 'dont' ? [enterNext] : pick(KEY_HINTS.flashcards, 'G', 'H', 'M');
    case 'problem':
      if (answeredNow) return [next];
      if (answerKind(current) !== 'self') return [{ keys: ['Enter'], label: 'check' }];
      if (stage === 'front') return pick(STEPS_HINTS, 'Space');
      return stage === 'dont' ? [{ keys: ['Enter'], label: 'done' }] : upTo(pick(STEPS_HINTS, '1', 'Enter'), current.steps?.length ?? 1);
    case 'recall':
    case 'slides':
      return [next];
    default:
      // Reading cards: Enter moves on as well as the arrow.
      return [{ keys: ['Enter', '→'], label: 'next' }];
  }
}

const EMPTY_COPY: Record<CardMode, { title: string; text: string }> = {
  // New cards come only from parts already studied (sim/FINDINGS.md, 2026-11-24).
  adaptive: { title: 'Nothing to quiz yet', text: 'The quiz asks about parts you have studied. Learn a section first, then come back.' },
  learn: { title: 'Nothing to learn yet', text: 'This lecture has no items to walk through.' },
  weakest: {
    title: 'Nothing to rank',
    text: 'Nothing to score yet in this lecture.',
  },
  quiz: { title: 'No MCQ items', text: "This lecture doesn't have any MCQ items yet. Try Browse or Mixed mode." },
  flashcards: {
    title: 'No Flashcard items',
    text: "This lecture doesn't have any Flashcard items yet. Try Browse or Mixed mode.",
  },
  definitions: {
    title: 'No terms',
    text: "This lecture doesn't have any definitions to ask you for yet. Try Browse or Mixed mode.",
  },
  practice: {
    title: 'Nothing to practise',
    text: 'No card matches what was ticked. Go back to Practice and tick more kinds, cards or sections.',
  },
  problems: {
    title: 'No problems',
    text: "This lecture doesn't have any problems to work out yet. Add questions, on the lecture page, can write some.",
  },
  review: {
    title: 'Nothing to review',
    text: 'Everything you have studied is still fresh.',
  },
  mixed: { title: 'No items', text: 'This lecture has no items yet.' },
  today: {
    title: 'Nothing for today',
    text: 'Nothing to review, and everything here has been studied.',
  },
  missed: {
    title: 'Nothing to review',
    text: 'Nothing missed yet.',
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
function StepLine({ item, questionsFirst, onSwitch }: { item: SessionItem; questionsFirst: boolean; onSwitch: () => void }) {
  const phase = item._phase ?? phaseOfItem(item);
  // Today's sitting opens with what is due; say so, the way a step is named.
  if (item._block === 'review') {
    return (
      <div className="mb-4 flex items-baseline gap-3 border-b border-border pb-2 text-small">
        <span className="mark shrink-0 whitespace-nowrap text-text-3">Review</span>
        <span className="min-w-0 text-text-2">fading, faintest first</span>
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
      {item._again ? <span className="whitespace-nowrap text-text-2">Again, from earlier</span> : null}
      {/* The section's choice, changed partway (the owner, 2026-11-22). Not
          on the section's first card, which asks it. */}
      {item.type !== 'slides' && (
        <button
          type="button"
          onClick={onSwitch}
          className="tap-safe ml-auto whitespace-nowrap text-text-3 underline-offset-4 hover:text-text hover:underline"
        >
          {questionsFirst ? 'Read it here first' : 'Questions first'}
        </button>
      )}
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
  /** What the step's last answer to it was wrong, named for the student. */
  shaky: string[];
  /** When those are worth one more look: the catch-up (lib/memory.ts). */
  backAt: number;
}

/** A card named in a few words: its term, or the start of its question. */
function shortName(item: SessionItem): string {
  const clip = (s: string) => {
    const words = s.trim().split(/\s+/);
    return words.length > 7 ? `${words.slice(0, 7).join(' ')}…` : s.trim();
  };
  switch (item.type) {
    case 'recall':
      return item.question ? clip(item.question) : item.target.term;
    case 'flashcard':
      return clip(item.front);
    case 'mcq':
    case 'multi':
      return clip(item.question);
    default:
      return '';
  }
}

/** Every mode except Browse — one item at a time. */
/** A built Practice sitting's choice, as its bookmark keeps it. */
function practiceKeyOf(mode: StudyMode): string | null {
  const p = mode === 'practice' ? useSessionStore.getState().pendingPractice : null;
  return p ? encodeChoice(p) : null;
}

export function CardSession({ courseId, course, mode, sectionId, resume = false, classCode, single = false, mixed = false }: CardSessionProps) {
  const navigate = useNavigate();
  // A practice session opened from a class's Practice runs through the class:
  // its ways out lead back there, and its end offers the next lecture.
  const practiceClass = classCode && mode !== 'today' && mode !== 'learn' ? classCode : undefined;
  // The class's lectures mixed in one sitting: every card carries its own
  // lecture, and everything done to a card is done in that lecture.
  const mixedClass = practiceClass && mixed && !single ? practiceClass : undefined;
  const home = practiceClass ? `/class/${encodeURIComponent(practiceClass)}/practice` : `/study/${courseId}`;
  const homeLabel = practiceClass ? 'Back to Practice' : 'Back to lecture';
  // The lecture's glossary, beside the card on a wide screen. A mixed sitting
  // spans several lectures, so it has none.
  const glossary = useMemo(() => (mixedClass ? [] : glossaryOf(course)), [course, mixedClass]);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  // Three columns from 1280px: the glossary then has its own margin, so the
  // button that swaps it in only exists below that (and is not drawn twice).
  const threeColumns = useMediaQuery('(min-width: 1280px)');
  // A phone: Prev and Next at the bottom in thumb reach, the glossary as a
  // sheet, and a swipe to go on once the answer is in.
  const wideLayout = useMediaQuery(WIDE);
  const [phoneGlossary, setPhoneGlossary] = useState(false);
  /** Where each card is (flipped, answered), as the card reports it: the keys under the card follow. */
  const [stages, setStages] = useState<Record<number, CardStage>>({});
  const [keysOpen, setKeysOpen] = useState(false);
  // Read after the session has recorded its results, so the tree on the
  // finish screen is the tree this session just grew.
  const progress = useProgressStore((s) => s.getProgress(courseId) ?? EMPTY_PROGRESS);
  /** A card's lecture, and that lecture's file: its own in a mixed sitting, else this one. */
  const lectureFor = (item: SessionItem): { id: string; course: Course } | null => {
    const id = lectureOf(item, courseId);
    const c = id === courseId ? course : useCoursesStore.getState().courses[id];
    return c ? { id, course: c } : null;
  };
  /** The class's lectures as they are now, read rather than subscribed to (as the lecture is, below). */
  const classLectures = () => (mixedClass ? lecturesOf(useCoursesStore.getState().courses, mixedClass) : []);
  const init = useSessionStore((s) => s.init);
  const items = useSessionStore((s) => s.items);
  const index = useSessionStore((s) => s.index);
  const answeredIndices = useSessionStore((s) => s.answeredIndices);
  const score = useSessionStore((s) => s.score);
  const current = useSessionStore((s) => s.current());
  const written = current?.type === 'flashcard' ? answerPoints(current) : null;
  const hints = written
    ? written.points.length === 1
      ? ONE_POINT_HINTS
      : WRITTEN_HINTS
    : current?.type === 'problem'
      ? answerKind(current) === 'self'
        ? STEPS_HINTS
        : [{ keys: ['Enter'], label: 'check' }, ...NAV_HINTS]
      : current?.type === 'multi'
        ? [{ keys: ['1', '–', String(Math.min(9, current.options.length))], label: 'tick' }, ...MULTI_HINTS.slice(1)]
        : current?.type === 'mcq'
          ? KEY_HINTS[mode].map((h) =>
              h.keys.length === 3 && h.keys[2] === '4' ? { ...h, keys: ['1', '–', String(Math.min(9, current.options.length))] } : h,
            )
          : KEY_HINTS[mode];
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
  /** A question on screen, not yet answered: the glossary is shut, as it would hold the answer. */
  // The adaptive quiz's line: whether anything that was due is left.
  const sessionResults = useSessionStore((s) => s.results);
  // Due is judged as of opening the sitting; rendering must not read the clock.
  const [openedAt] = useState(Date.now);
  const adaptive = useMemo(() => {
    if (mode !== 'adaptive') return { dueLeft: false, dueAtStart: false };
    const st = useSessionStore.getState();
    const asked = new Set([...sessionResults.keys()].map((n) => st.items[n] && cardKey(st.items[n])));
    const now = openedAt;
    const dueLeft = (st.lectures ?? [courseId]).some((id) => {
      const c = id === courseId ? course : useCoursesStore.getState().courses[id];
      if (!c) return false;
      const progress = useProgressStore.getState().getProgress(id);
      return buildSessionItems(c, 'review', { progress, now, exam: examRule(c, progress, now), minutes: Infinity }).some(
        (i) => !asked.has(st.lectures ? `${id}\u0000${i.id}` : i.id),
      );
    });
    // Whether anything was due when the sitting began, from the progress it
    // began with: only then is "everything due is done" news.
    const dueAtStart = (st.lectures ?? [courseId]).some((id) => {
      const c = id === courseId ? course : useCoursesStore.getState().courses[id];
      const progress = st.startByCourse[id] ?? {};
      return !!c && buildSessionItems(c, 'review', { progress, now, exam: examRule(c, progress, now), minutes: Infinity }).length > 0;
    });
    return { dueLeft, dueAtStart };
    // Recomputed after every answer; the course and mode are fixed for a sitting.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionResults, mode]);
  // Subscribed, so the step line's switch follows the section's choice.
  const sectionQuestionsFirst = useLearnStore((s) => (current ? s.startedQuestionsFirst(lectureOf(current, courseId), current._sectionId) : false));
  const questionUp = !pause && !!current && QUESTION_TYPES.has(current.type) && !answeredIndices.has(index);
  // Only once the answer is showing, never on a question still waiting for
  // one (a swipe can be an accident). A flipped flashcard takes its own
  // swipes, as its verdict.
  // The page that comes in after a swipe slides in from the side it came
  // from, as the one before slid off (styles/index.css, page-in).
  const [turned, setTurned] = useState<'next' | 'back' | null>(null);
  const cardSwipe = useSwipe({
    enabled: !wideLayout && !pause && !!current && !questionUp,
    onLeft: () => {
      setTurned('next');
      handleNext();
    },
    onRight: hasPrev
      ? () => {
          setTurned('back');
          prev();
        }
      : undefined,
  });
  useEffect(() => {
    if (!turned) return;
    const t = window.setTimeout(() => setTurned(null), 400);
    return () => window.clearTimeout(t);
  }, [turned]);
  const keysNow = keysFor(current, hints, written, stages[index] ?? 'front', answeredIndices.has(index), !!pause);

  useEffect(() => {
    // Read the bookmark rather than subscribing to it: this session writes one
    // on every card, and a subscription would re-run this effect and restart
    // the session each time.
    // Continue, or a mode that picks up where it was left (store/resume resumesOnOpen).
    const saved = useResumeStore.getState().getBookmark(courseId);
    const bookmark = saved && (resume || resumesOnOpen(mode, saved, Date.now())) ? saved : null;
    const usable =
      bookmark &&
      bookmark.mode === mode &&
      (bookmark.sectionId ?? undefined) === sectionId &&
      (bookmark.kind ?? null) === useSessionStore.getState().pendingKind &&
      (bookmark.study ?? null) === useSessionStore.getState().pendingStudy &&
      (bookmark.practice ?? null) === practiceKeyOf(mode) &&
      !!bookmark.mixed === !!mixedClass
        ? bookmark.itemId
        : undefined;
    // The lecture as it is now, read rather than subscribed to: setting a
    // card aside mid-sitting (or a sync landing) changes the lecture, and a
    // subscription restarted the sitting from its first card.
    const courses = useCoursesStore.getState().courses;
    if (mixedClass) {
      // Every lecture of the class; the bookmark's card may be in any of them.
      const resumeAt = usable ? { courseId: bookmark?.itemCourseId ?? courseId, itemId: usable } : undefined;
      useSessionStore.getState().initMixed(courseId, lecturesOf(courses, mixedClass), mode, resumeAt);
      return;
    }
    const atStart = courses[courseId];
    if (atStart) init(courseId, atStart, mode, sectionId, usable);
  }, [courseId, mode, sectionId, resume, init, mixedClass]);

  // Remember where you are, so closing the tab 60 cards into a 151-card
  // session doesn't mean starting again. Item 1 is not worth remembering —
  // that is just "you opened it" — so the bookmark starts once you've moved.
  useEffect(() => {
    if (finished || !current || index === 0) return;
    // A mixed sitting keeps its bookmark in the lecture it was opened in, as
    // any sitting does (so it never takes the place of another lecture's own
    // bookmark), and notes which lecture the card is from.
    useResumeStore.getState().save(courseId, {
      mode,
      sectionId: sectionId ?? null,
      kind: useSessionStore.getState().pendingKind,
      study: useSessionStore.getState().pendingStudy,
      practice: practiceKeyOf(mode),
      classCode: practiceClass ?? null,
      single,
      ...(mixedClass ? { mixed: true, itemCourseId: lectureOf(current, courseId) } : {}),
      itemId: current.id,
      index,
      total,
      updatedAt: Date.now(),
    });
  }, [courseId, mode, sectionId, index, current, total, finished, practiceClass, single, mixedClass]);

  /** `fullDay`: "Keep going" carries on past the day's plan, so Today is planned afresh at the full time. */
  const restart = (fullDay = false) => {
    useResumeStore.getState().clear(courseId);
    if (mixedClass) useSessionStore.getState().initMixed(courseId, classLectures(), mode);
    else init(courseId, course, mode, sectionId, undefined, fullDay);
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
  /** Today only: the next course with something to do, worked out as the sitting ends. */
  const [nextCourse, setNextCourse] = useState<CourseToday | null>(null);
  /** A class's Practice: the class's next lecture with cards for the same choice, worked out as the session ends. */
  const [nextPractice, setNextPractice] = useState<{ title: string; to: string; count: number } | null>(null);
  /** Learn only: the next section with something to learn, worked out as the session ends. */
  const [nextSection, setNextSection] = useState<{ id: string; title: string } | null>(null);
  const nextPracticeFor = (): { title: string; to: string; count: number } | null => {
    // A mixed sitting already had every lecture in it.
    if (!practiceClass || single || mixedClass) return null;
    const built = useSessionStore.getState().pendingPractice;
    if (mode === 'practice') {
      if (!built) return null;
      const lectures = lecturesOf(useCoursesStore.getState().courses, practiceClass);
      const now = Date.now();
      for (const [id, c] of lectures.slice(lectures.findIndex(([lid]) => lid === courseId) + 1)) {
        const count = choiceCount(c, id, built, useProgressStore.getState().getProgress(id), useProgressStore.getState().missedIds(id), now);
        if (count > 0) return { title: lectureName(c.metadata.title, practiceClass), count, to: choiceLink(id, built, practiceClass) };
      }
      return null;
    }
    const { pendingKind, pendingStudy } = useSessionStore.getState();
    const choice = choiceOf(mode, pendingKind);
    if (!choice) return null;
    const lectures = lecturesOf(useCoursesStore.getState().courses, practiceClass);
    const from = pendingStudy ? { study: pendingStudy } : {};
    const now = Date.now();
    for (const [id, c] of lectures.slice(lectures.findIndex(([lid]) => lid === courseId) + 1)) {
      const progress = useProgressStore.getState().getProgress(id);
      const count = practiceCount(countBasis(c, progress, useProgressStore.getState().missedIds(id), from, now), choice.cards, choice.kind);
      if (count > 0) return { title: lectureName(c.metadata.title, practiceClass), count, to: practiceLink(id, choice.cards, choice.kind, from, practiceClass) };
    }
    return null;
  };
  const nextCourseFor = (): CourseToday | null => {
    const now = Date.now();
    const others = todayAcrossCourses(
      useCoursesStore.getState().courses,
      useProgressStore.getState().byCourse,
      now,
      (id) => plannedMinutes(id, now),
      measuredPace(useStudyLogStore.getState().byCourse),
      (id) => studiedToday(id, now),
    ).filter((c) => c.id !== courseId);
    if (classCode) return others.find((c) => c.code === classCode) ?? null;
    return others[0] ?? null;
  };
  const appointmentFor = (): string | null => {
    const { items: done, results } = useSessionStore.getState();
    const prog = useProgressStore.getState().getProgress(courseId);
    const now = Date.now();
    // Close to the exam the day comes in parts (lib/today.ts): say when the
    // next one is, and the misses come back in it.
    if (mode === 'today') {
      const left = todaySitting(courseId, course, prog, now);
      const back = now + PART_GAP_HOURS * 3_600_000;
      if (left.part != null && !left.catchUp && left.minutes >= CATCH_UP_MINUTES && new Date(back).toDateString() === new Date(now).toDateString()) {
        const missedAny = [...results.keys()].some((i) => missedThisSitting(prog[done[i]?.id ?? '']));
        return `Next sitting after ${new Date(back).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}${missedAny ? ', and what you missed comes back in it' : ''}. This close to the exam, a few shorter sittings spread over the day do more than one long one.`;
      }
    }
    // Each card answered, once, with its record in its own lecture (a mixed
    // sitting's cards are in several).
    const answered = new Map<string, SessionItem>();
    for (const i of results.keys()) if (done[i]) answered.set(cardKey(done[i]), done[i]);
    const recordOf = (item: SessionItem) => useProgressStore.getState().getProgress(lectureOf(item, courseId))[item.id];
    // Misses first: one more look a few hours on is the cheapest gain there is
    // (lib/memory.ts, catchUpDue), but only if the student knows to come back.
    // Put right by a retry still counts: the later look is what lasts.
    const missed = [...answered.values()].filter((item) => missedThisSitting(recordOf(item)));
    if (missed.length) {
      const back = Math.max(...missed.map((item) => recordOf(item)!.lastSeen ?? now)) + CATCH_UP_HOURS * 3_600_000;
      const sameDay = new Date(back).toDateString() === new Date(now).toDateString();
      const n = missed.length === 1 ? 'The one you missed is' : `The ${missed.length} you missed are`;
      return sameDay
        ? `${n} worth one more look after ${new Date(back).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}. Open Today then: five minutes makes them stick.`
        : `${n} back first thing tomorrow.`;
    }
    const exams = new Map<string, ReturnType<typeof examRule> | null>();
    const examOf = (item: SessionItem) => {
      const id = lectureOf(item, courseId);
      if (!exams.has(id)) {
        const lecture = lectureFor(item);
        exams.set(id, lecture ? examRule(lecture.course, useProgressStore.getState().getProgress(id), now) : null);
      }
      return exams.get(id);
    };
    const dues = [...answered.values()]
      .map((item) => nextDueAt(recordOf(item), now, examOf(item)?.covering(item.id) ?? null))
      .filter((t): t is number => t != null);
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
    const { items: all, index: at, results, courseId: sittingId } = useSessionStore.getState();
    const here = all[at];
    const after = all[at + 1];
    if ((mode !== 'learn' && mode !== 'today') || !here?._block || !after || after._block === here._block) return null;
    const inStep = all.map((item, n) => ({ item, n })).filter(({ item }) => item._block === here._block);
    const owner = inStep.find(({ item }) => !item._again)?.item ?? here;
    const sectionDone = after._sectionId !== here._sectionId;
    // At a section's end, the section's steps in this sitting: under "End of
    // <section>", the last step's score alone read as the section's.
    const covered =
      sectionDone && here._block !== 'review'
        ? all
            .slice(0, at + 1)
            .map((item, n) => ({ item, n }))
            .filter(({ item }) => item._sectionId === here._sectionId && item._block !== 'review')
        : inStep;
    const first = covered.filter(({ item, n }) => !item._again && results.has(n));
    return {
      reviewDone: here._block === 'review',
      step: owner._step ?? 0,
      steps: owner._steps ?? 1,
      section: owner._sectionTitle,
      sectionDone,
      terms: covered.flatMap(({ item }) =>
        item.type === 'definition' || (item.type === 'recall' && !item.question && !item._again)
          ? [item.type === 'definition' ? item.term : item.target.term]
          : [],
      ).filter((t, i, list) => t && list.indexOf(t) === i),
      got: first.filter(({ n }) => results.get(n)).length,
      asked: first.length,
      // The latest answer to each card in the step, copies included.
      shaky: [
        ...inStep
          // Set aside as not on the exam: not one that "comes back".
          .filter(({ item, n }) => results.has(n) && !isSetAside(item, sittingId))
          .reduce((last, { item, n }) => last.set(item.id, { item, got: results.get(n)! }), new Map<string, { item: SessionItem; got: boolean }>())
          .values(),
      ]
        .filter((r) => !r.got)
        .map((r) => shortName(r.item))
        .filter(Boolean),
      backAt: Date.now() + CATCH_UP_HOURS * 3_600_000,
    };
  };

  // "Not needed?" under the card: which of the two reasons, once asked.
  // Tied to the card it was opened on, so it closes when the card changes.
  const [askingAt, setAskingAt] = useState<number | null>(null);
  const asking = askingAt === index;
  const setAsking = (on: boolean) => setAskingAt(on ? index : null);
  const setAsideNow = (reason: 'not-needed' | 'wrong') => {
    setAsking(false);
    const card = useSessionStore.getState().current();
    if (!card) return;
    // In the card's own lecture: in a mixed sitting, not necessarily this one.
    const lecture = lectureFor(card);
    if (!lecture) return;
    const fileId = fileItemOf(card);
    const sectionOf = lecture.course.sections.find((sec) => sec.items.some((i) => i.id === fileId));
    if (!sectionOf) return;
    useCoursesStore.getState().setAside(lecture.id, sectionOf.id, fileId, reason);
    useSessionStore.getState().dropAhead(fileId, lecture.id);
    const where = mixedClass ? `in ${lectureName(lecture.course.metadata.title, mixedClass)}` : 'on the lecture page';
    toast(reason === 'wrong' ? `Set aside as wrong. It is under Set aside ${where}, and in Fix.` : `Set aside. It is under Set aside ${where}, to put back any time.`, {
      type: 'success',
      actionLabel: 'Undo',
      onAction: () => useCoursesStore.getState().setAside(lecture.id, sectionOf.id, fileId, null),
    });
    handleNext();
  };

  /** The pause between steps, left backwards: the card that ended the step, as it was left. */
  const backFromPause = () => {
    setPause(null);
    prev();
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
      // In every lecture of a mixed sitting.
      const still = (mixedClass ? classLectures() : [[courseId, course] as [string, Course]]).reduce(
        (n, [id, c]) =>
          n +
          buildSessionItems(c, 'review', {
            sectionId,
            progress: useProgressStore.getState().getProgress(id),
            exam: examRule(c, useProgressStore.getState().getProgress(id), Date.now()),
            // Every card still due, not one more sitting's worth.
            minutes: Infinity,
            // The Practice page's kind and studies, which "Keep reviewing" keeps too.
            kind: useSessionStore.getState().pendingKind ?? undefined,
            onlyIds: onlyStudies(c, useSessionStore.getState().pendingStudy),
          }).length,
        0,
      );
      setMoreDue(still);
      // While more is due now, "these come back tomorrow" is not the news.
      setAppointment(still > 0 ? null : appointmentFor());
    } else {
      setMoreDue(0);
      setAppointment(appointmentFor());
    }
    // One lecture was asked for, so the day stops with it.
    setNextCourse(mode === 'today' && !single ? nextCourseFor() : null);
    setNextPractice(nextPracticeFor());
    // Learn's "Keep going": the section Learn would teach next, not this one again.
    const after = mode === 'learn' ? sectionsToLearn(course, useProgressStore.getState().getProgress(courseId)).find(({ section }) => section.id !== sectionId) : undefined;
    setNextSection(after ? { id: after.section.id, title: after.section.title } : null);
    finish();
  };
  const retryMissed = useSessionStore((s) => s.retryMissed);

  // Session-level keys. The cards own their own shortcuts (1-4, Space, G/M,
  // Enter) since only they know their internal state.
  useKeyboardShortcuts(
    (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        // The full list of keys closes first; Escape only leaves with it shut.
        if (keysOpen) setKeysOpen(false);
        else navigate(home);
        return;
      }
      if (pause) {
        if (e.key === 'Enter' || e.key === 'ArrowRight') {
          e.preventDefault();
          setPause(null);
          restartCardTimer();
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          backFromPause();
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
      } else if (e.key === 'Enter' && (current?.type === 'example' || current?.type === 'explain' || current?.type === 'graphic')) {
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
      <div className="mx-auto max-w-2xl py-10 text-center sm:px-10">
        <Link to={home} className="tap-safe inline-flex items-center text-sm text-text-2 hover:text-text">
          ← Back
        </Link>
        <h1 className="mt-4 text-xl font-semibold text-text">{copy.title}</h1>
        <p className="mt-2 text-text-2">{copy.text}</p>
        <Link
          to={home}
          className="press press-ink mt-4"
        >
          {homeLabel}
        </Link>
      </div>
    );
  }

  if (finished) {
    const attempted = score.got + score.missed;
    const pct = attempted > 0 ? Math.round((score.got / attempted) * 100) : 100;
    // Not score.missed: in Learn a miss comes back until it is right, and
    // one put right in the sitting is not still to retry.
    const missedKeys = stillMissed();
    const missedNow = missedKeys.length;
    // A computer has room to face the tree with the result (design-update.md).
    const spreadEnd = wideLayout && !mixedClass;
    const missedItems = missedKeys
      .map((key) => items.find((it) => cardKey(it) === key))
      .filter((it): it is SessionItem => !!it)
      .map((it) => {
        const c = it as unknown as { question?: string; front?: string; term?: string; title?: string };
        return c.question ?? c.front ?? c.term ?? c.title ?? '';
      })
      .filter(Boolean);
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
      <div
        className={
          spreadEnd
            ? 'mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_minmax(0,30rem)] items-start gap-14 py-10'
            : 'mx-auto flex max-w-2xl flex-col items-center py-10 text-center sm:px-10'
        }
      >
        {/* A mixed sitting grew several trees: they are in the list below. */}
        {!mixedClass && (
          <div className={spreadEnd ? 'sticky top-6 flex justify-center' : undefined}>
            <CourseTree
              courseId={courseId}
              course={course}
              progress={progress}
              className={spreadEnd ? 'h-[30rem] max-w-full' : 'h-44 sm:h-56'}
              // What this session changed, shown on the tree: leaves won back
              // rise from the ground, new ones grow. It replaced a draw-on of the
              // whole tree, which looked the same whatever the session had done.
              grewFrom={startProgress}
            />
          </div>
        )}
        {/* On a computer the right page: the result, what was missed, and
            what comes next, facing the tree that grew. */}
        <div className={spreadEnd ? 'flex min-w-0 flex-col items-start border-l border-border pl-10 text-left' : 'contents'}>
        <h1 className={`${mixedClass || spreadEnd ? '' : 'mt-5 '}font-display text-title font-semibold text-text`}>
          {MODE_LABELS[mode]} finished
        </h1>
        <div className="mt-3 flex justify-center gap-5 text-small tabular-nums">
          <span className="text-success">{score.got} correct</span>
          <span className="text-error">{score.missed} missed</span>
          {attempted > 0 && <span className="text-text-2">{pct}%</span>}
        </div>
        {mixedClass && <MixedLectures classCode={mixedClass} />}
        {appointment && <p className="mt-3 max-w-prose text-small text-text-2">{appointment}</p>}
        {moreDue > 0 && (
          <p className="mt-3 max-w-prose text-small text-text-2">
            {moreDue} more {moreDue === 1 ? 'is' : 'are'} waiting to review.
          </p>
        )}
        {spreadEnd && missedItems.length > 0 && (
          <section aria-label="Still to get right" className="mt-6 w-full">
            <h2 className="mark mb-1 text-text-3">Still to get right</h2>
            <ol className="divide-y divide-border border-y border-border text-small text-text-2">
              {missedItems.slice(0, 8).map((text, i) => (
                <li key={i} className="line-clamp-2 py-2">
                  <RichText text={text} />
                </li>
              ))}
            </ol>
            {missedItems.length > 8 && <p className="mt-1 text-small text-text-3">and {missedItems.length - 8} more</p>}
          </section>
        )}
        <div className={`mt-6 flex flex-wrap gap-3 ${spreadEnd ? '' : 'justify-center'}`}>
          {/* Straight back over what went wrong, while the correction is
              fresh — the most useful next step when there is one, so it
              leads. */}
          {moreDue > 0 && (
            <button type="button" onClick={() => restart()} className="press press-ink tap-safe">
              Keep reviewing
            </button>
          )}
          {mode === 'today' && (
            <button type="button" onClick={() => restart(true)} className="press press-ink tap-safe">
              Keep going
            </button>
          )}
          {/* A class's Practice carries on in the next lecture with cards for it. */}
          {nextPractice && (
            <Link to={nextPractice.to} className={`press tap-safe max-w-full ${moreDue > 0 ? '' : 'press-ink'}`}>
              Next: {nextPractice.title}, {nextPractice.count} card{nextPractice.count === 1 ? '' : 's'}
            </Link>
          )}
          {nextSection && (
            <Link
              to={`/session/${courseId}/learn?section=${encodeURIComponent(nextSection.id)}`}
              className="press press-ink tap-safe max-w-full"
            >
              Next: {nextSection.title}
            </Link>
          )}
          {missedNow > 0 && (
            <button
              type="button"
              onClick={retryMissed}
              // Never the lead: the screen has just said the misses are
              // worth one more look in a few hours, and the simulator found
              // re-asking them now adds nothing to that (sim/FINDINGS.md,
              // 2026-10-02). There for a quiz in ten minutes.
              className="press tap-safe"
            >
              Try the {missedNow} you missed again
            </button>
          )}
          {/* Today is planned in whole steps, so it usually ends a little
              short of the time set aside; carrying on is a fresh plan from
              where things now stand. The simulator found this is what makes
              Today match its plan (sim/FINDINGS.md). */}
          {/* In Review with more due, "Keep reviewing" already is this. */}
          {moreDue === 0 && mode !== 'today' && (
            <button
              type="button"
              onClick={() => restart()}
              className={`press tap-safe ${missedNow > 0 || nextSection || nextPractice ? '' : 'press-ink'}`}
            >
              Study again
            </button>
          )}
          <Link
            to={home}
            // The lead when nothing else is: with misses waiting for later,
            // stopping here is the advice.
            className={`press tap-safe ${missedNow > 0 && !(moreDue > 0 || mode === 'today' || nextSection || nextPractice) ? 'press-ink' : ''}`}
          >
            {homeLabel}
          </Link>
        </div>
        {mode === 'today' && nextCourse && (
          <Link
            to={`/session/${nextCourse.id}/today${classCode ? `?class=${encodeURIComponent(classCode)}` : ''}`}
            className="press tap-safe mt-3 max-w-full"
          >
            Next: Today in {classCode ? lectureName(nextCourse.title, classCode) : nextCourse.title}
          </Link>
        )}
        </div>
      </div>
    );
  }

  return (
    // Phone: the card alone. 1024px: card and a left margin. 1280px: a margin
    // each side, the card centred even when there is no glossary to fill one.
    <div className="mx-auto max-w-2xl pb-28 pt-6 short:pt-2 wide:pb-6 sm:px-6 wide:grid wide:max-w-none wide:grid-cols-[13rem_minmax(0,44rem)] wide:justify-center wide:gap-10 xl:grid-cols-[15rem_minmax(0,42rem)_17rem] xl:gap-8">
      <div className="min-w-0 wide:col-start-2 wide:row-start-1">
      <div className="mb-4 flex items-center justify-between">
        <Link to={home} className="tap-safe inline-flex items-center text-sm text-text-2 hover:text-text">
          ← Back
        </Link>
        <span className="flex items-baseline gap-2">
          <span className="mark text-text-2">
            {MODE_LABELS[mode]}
          </span>
          <span className="whitespace-nowrap text-xs tabular-nums text-text-3">
            {/* The adaptive quiz has no end, so no total. */}
            {mode === 'adaptive' ? index + 1 : `${index + 1} / ${items.length}`}
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

      {/* Sections are a lecture's; a mixed sitting has no runs of one to jump to. */}
      {/* On a phone held sideways it moves to the side column (below), so the
          card is on the first screen. */}
      {!mixedClass && (
        <div className="sideways:hidden">
          <SectionJump items={items} mode={mode} activeSectionId={activeSectionId} onJump={jumpToSection} />
        </div>
      )}

      {resumed && (
        <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-border bg-surface px-4 py-2 text-sm">
          <span className="text-text-2">Picked up where you left off.</span>
          <button type="button" onClick={() => restart()} className="text-accent hover:underline">
            Start from the beginning
          </button>
        </div>
      )}

      {mode === 'adaptive' && current && !pause && (
        <AdaptiveBar dueDone={adaptive.dueAtStart && !adaptive.dueLeft} />
      )}
      {(mode === 'learn' || mode === 'today') && current && !pause && (
        <StepLine
          item={current}
          questionsFirst={sectionQuestionsFirst}
          onSwitch={() => useSessionStore.getState().switchReading(!sectionQuestionsFirst)}
        />
      )}
      {mixedClass ? (
        // No lecture is named on a card: which one it is from is part of the question.
        <p className="mb-4 text-xs text-text-3">
          {mode === 'review'
            ? 'Fading, every lecture mixed together.'
            : mode === 'weakest'
              ? 'Every lecture mixed together, each one’s likeliest to be forgotten early.'
              : 'Every lecture mixed together.'}
        </p>
      ) : (
        <>
          {mode === 'review' && (
            <p className="mb-4 text-xs text-text-3">
              Fading, faintest first.
            </p>
          )}
          {mode === 'weakest' && (
            <p className="mb-4 text-xs text-text-3">
              Ordered by how likely you are to have forgotten each one, faintest first. Anything you haven&rsquo;t seen yet comes in the middle.
            </p>
          )}
        </>
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
          {pause.reviewDone &&
            (() => {
              // What is new, by count and section: the section's name alone
              // read as the one just reviewed when it was half learned.
              const ahead = items.slice(index).filter((i) => !i._again && i._block !== 'review');
              const sections = [...new Set(ahead.map((i) => i._sectionTitle))];
              const inFirst = ahead.filter((i) => i._sectionTitle === sections[0]).length;
              return sections.length ? (
                <p className="mx-auto mt-2 max-w-prose text-small text-text-2">
                  Next, new material you have not met yet: {inFirst} {inFirst === 1 ? 'card' : 'cards'} in {sections[0]}
                  {sections.length > 1 ? `, then ${sections[1]}${sections.length > 2 ? ' and more' : ''}` : ''}.
                </p>
              ) : null;
            })()}
          {!pause.reviewDone && pause.terms.length > 0 && (
            <p className="mx-auto mt-2 max-w-prose text-small text-text-2">
              <span className="text-text-3">Covered: </span>
              {pause.terms.length > 6 ? `${pause.terms.slice(0, 5).join(' · ')} and ${pause.terms.length - 5} more` : pause.terms.join(' · ')}
            </p>
          )}
          {/* What did not settle, by name, and when it comes back: the
              catch-up a few hours on (lib/memory.ts, catchUpDue). */}
          {pause.shaky.length > 0 && (
            <p className="mx-auto mt-3 max-w-prose text-small text-text-2">
              <span className="text-error">Not yet: </span>
              {(() => {
                // Four by name at most; the rest as a count, so a hard step
                // does not fill the screen. No full stop after a clipped name.
                const named = pause.shaky.slice(0, 4).join(' · ');
                const more = pause.shaky.length - 4;
                const list = more > 0 ? `${named} and ${more} more` : named;
                return list.endsWith('…') ? list : `${list}.`;
              })()}{' '}
              {pause.shaky.length === 1 ? 'It comes' : 'They come'} back in Today after{' '}
              {new Date(pause.backAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.
            </p>
          )}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {/* Back to the card just answered (the owner, 2026-11-20: "an
                option to go back beside next section and stop here"). */}
            <button type="button" onClick={backFromPause} className="press tap-safe">
              ← Back
            </button>
            <button type="button" onClick={() => {
              setPause(null);
              restartCardTimer();
            }} className="press press-ink tap-safe" autoFocus>
              {pause.reviewDone ? 'Start learning' : pause.sectionDone ? 'Next section' : 'Next step'}
            </button>
            <Link to={`/study/${courseId}`} className="press tap-safe">
              Stop here
            </Link>
          </div>
        </div>
      )}

      {/*
        * Going back shows the answer given (the owner, 2026-11-17: going back
        * in Learn showed the card reset). Each answered card nearby stays
        * mounted, hidden, so Prev finds it as it was left: the option picked
        * in the order it was shown, the words written, the verdict and the
        * why. Keyed by the card object, which a copy of a missed card is not,
        * so a card that comes back starts unanswered.
        */}
      <div {...cardSwipe.handlers} style={cardSwipe.style}>
      {items.map((it, n) => {
        const here = n === index;
        if (!here && (!answeredIndices.has(n) || Math.abs(n - index) > KEEP_NEAR)) return null;
        const lecture = lectureFor(it);
        return (
          <div key={cardUid(it)} hidden={!here || !!pause} className={here && turned ? `page-in-${turned}` : undefined}>
            <ItemRenderer
              item={it}
              courseId={lectureOf(it, courseId)}
              frame="sheet"
              onAnswered={(got, picked, sure) => {
                record(got, undefined, sure);
                // A wrong pick that is another term of the lecture is a mix-up,
                // kept so Review asks that term beside this question (lib/mixUps).
                if (got || picked == null || it.type !== 'mcq') return;
                const lectureId = lectureOf(it, courseId);
                const lectureCourse = useCoursesStore.getState().courses[lectureId];
                const other = lectureCourse && termPicked(lectureCourse, it, picked);
                if (other) useProgressStore.getState().noteConfusion(lectureId, it.id, other);
              }}
              // Grading a flashcard also advances it, as the vanilla app did —
              // otherwise the card just flips back and looks like nothing happened.
              onGot={(grade) => {
                record(true, grade);
                handleNext();
              }}
              comesBack={comesBackFor(it, lectureOf(it, courseId), lecture?.course, mode)}
              idea={ideaFor(it, lecture?.course)}
              onMissed={() => {
                record(false);
                handleNext();
              }}
              onReadThem={() => useSessionStore.getState().askFirst(it._sectionId)}
              onTeachHere={() => useSessionStore.getState().readFirst(it._sectionId)}
              onOverride={setResult}
              onUnsure={() => useSessionStore.getState().markUnsure()}
              onConfused={(otherId) => useProgressStore.getState().noteConfusion(lectureOf(it, courseId), it.id, otherId)}
              onNext={handleNext}
              learning={it._step !== undefined}
              onStage={(st) => setStages((p) => (p[n] === st ? p : { ...p, [n]: st }))}
              keyboardEnabled={here && !pause}
            />
          </div>
        );
      })}
      </div>

      {wideLayout ? (
        <div className={`mt-4 flex justify-between ${pause ? 'hidden' : ''}`}>
          <button type="button" disabled={!hasPrev} onClick={prev} className="press">
            ← Prev
          </button>
          <button type="button" onClick={handleNext} className="press">
            {hasNext ? 'Next →' : 'Finish'}
          </button>
        </div>
      ) : (
        !pause && (
          // On a phone the way through the sitting is at the bottom, where the
          // thumb is, with the lecture's glossary between (a sheet, shut
          // while a question waits for its answer, as on a computer).
          <ThumbBar>
            <div className="flex items-center justify-between gap-3">
              <button type="button" disabled={!hasPrev} onClick={prev} className="press tap-safe">
                ← Prev
              </button>
              {glossary.length > 0 && !mixedClass && (
                <button
                  type="button"
                  onClick={() => setPhoneGlossary(true)}
                  disabled={questionUp}
                  className="tap-safe flex flex-col items-center text-small text-text-2 disabled:text-text-3"
                >
                  Glossary
                  {questionUp && <span className="sr-only">, after you answer</span>}
                </button>
              )}
              <button type="button" onClick={handleNext} className="press tap-safe">
                {hasNext ? 'Next →' : 'Finish'}
              </button>
            </div>
          </ThumbBar>
        )
      )}
      {phoneGlossary && !questionUp && (
        <Sheet label="Glossary" onClose={() => setPhoneGlossary(false)}>
          <div className="px-5 py-4">
            <SessionGlossary entries={glossary} card={current} />
          </div>
        </Sheet>
      )}

      {/* Set a card aside without leaving the sitting: a slide shown to
          illustrate, a table the teacher said to skip, a card that is wrong.
          Kept in the file, listed under Set aside on the lecture page. */}
      {current && current.type !== 'slides' && !pause && (
        <div className="mt-3 flex flex-wrap items-baseline justify-end gap-x-4 gap-y-1 text-small">
          {asking ? (
            <>
              <span className="text-text-3">Set aside as</span>
              <button type="button" className="tap-safe text-text-2 underline-offset-4 hover:text-text hover:underline" onClick={() => setAsideNow('not-needed')}>
                not on my exam
              </button>
              <button type="button" className="tap-safe text-text-2 underline-offset-4 hover:text-text hover:underline" onClick={() => setAsideNow('wrong')}>
                wrong or badly written
              </button>
              <button type="button" className="tap-safe text-text-3 hover:text-text" onClick={() => setAsking(false)}>
                Cancel
              </button>
            </>
          ) : (
            <button type="button" className="tap-safe text-text-3 underline-offset-4 hover:text-text hover:underline" onClick={() => setAsking(true)}>
              Not needed?
            </button>
          )}
        </div>
      )}

      {/* The keys that work on this card now, one quiet line. Only where there
          is a keyboard to hint about: a wide screen that can hover. */}
      {!pause && keysNow.length > 0 && (
        <div className="mt-4 hidden text-center text-xs text-text-3 wide:[@media(hover:hover)]:block">
          <p>
            {keysNow.map((hint, i) => (
              <span key={hint.keys.join()}>
                {i > 0 && ' · '}
                <span className="font-mono text-[11px] text-text-2">{keyText(hint.keys)}</span> {hint.label}
              </span>
            ))}
            {' · '}
            <button
              type="button"
              onClick={() => setKeysOpen((o) => !o)}
              aria-label="All keys"
              aria-expanded={keysOpen}
              className="font-mono text-[11px] text-text-3 hover:text-text"
            >
              ?
            </button>
          </p>
          {keysOpen && (
            <ul className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
              {hints.map((hint) => (
                <li key={hint.keys.join()}>
                  <span className="font-mono text-[11px] text-text-2">{keyText(hint.keys)}</span> {hint.label}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      </div>

      {/* Left margin: the tree large and where you are in the sitting. Below
          1280px the glossary swaps in here instead of having a margin. */}
      <div className="hidden min-w-0 wide:col-start-1 wide:row-start-1 wide:block">
        {glossary.length > 0 && wideLayout && !threeColumns && (
          <div className="mb-4">
            <button
              type="button"
              onClick={() => setGlossaryOpen((o) => !o)}
              aria-expanded={glossaryOpen && !questionUp}
              aria-describedby={questionUp ? 'glossary-shut' : undefined}
              disabled={questionUp && !glossaryOpen}
              className="press press-quiet tap-safe"
            >
              {glossaryOpen ? '← This sitting' : 'Glossary'}
            </button>
            {questionUp && !glossaryOpen && (
              // Greyed is enough to see; the reason is for a screen reader (the
              // owner, 2026-11-25: no explainer text under the glossary).
              <span id="glossary-shut" className="sr-only">
                Opens after you answer.
              </span>
            )}
          </div>
        )}
        {glossaryOpen && !threeColumns ? (
          questionUp ? (
            /* Shut while a question is asked: the term asked would be in it
               (the owner, 2026-11-17). A bare rule; the reason is read out only. */
            <p id="glossary-shut" className="border-t border-border pt-3">
              <span className="sr-only">Shut while a question is asked. It opens after you answer.</span>
            </p>
          ) : (
            <SessionGlossary entries={glossary} card={current} />
          )
        ) : (
          <>
            {!mixedClass && (
              <div className="hidden sideways:block">
                <SectionJump items={items} mode={mode} activeSectionId={activeSectionId} onJump={jumpToSection} />
              </div>
            )}
            <SessionRail
              items={items}
              index={index}
              course={course}
              score={score}
              // A mixed sitting shows neither which lecture the card is from (that
              // is part of the question) nor its parts (a run is a card or two).
              parts={!mixedClass}
              figure={
                /* The course's tree with the section you are in lit, and the
                   leaves held at where the sitting began so a miss does not
                   take one off mid-sitting; new ones bud as they are learned. */
                mixedClass ? undefined : (
                  <CourseTree
                    courseId={courseId}
                    course={course}
                    progress={progress}
                    className="h-72 w-full"
                    highlight={activeSectionId}
                    growOnly={startProgress}
                  />
                )
              }
            />
          </>
        )}
      </div>

      {/* Right margin (1280px up): the glossary, always there. */}
      <div className="hidden min-w-0 xl:col-start-3 xl:row-start-1 xl:block">
        {threeColumns && glossary.length > 0 && (
          <div className="sticky top-6 max-h-[calc(100vh-3rem)] self-start overflow-y-auto">
            {questionUp ? (
              <section aria-label="Glossary" className="text-small">
                <h2 className="mark mb-2 text-text-3 opacity-60">Glossary</h2>
                <p id="glossary-shut" className="border-t border-border pt-3">
                  <span className="sr-only">Shut while a question is asked. It opens after you answer.</span>
                </p>
              </section>
            ) : (
              <SessionGlossary entries={glossary} card={current} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
