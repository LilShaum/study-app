import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useKeyboardShortcuts } from '@/lib/useKeyboardShortcuts';
import type { Course } from '@/schema/course';
import { buildSessionItems, type SessionItem, type StudyMode } from '@/lib/buildSessionItems';
import { phaseOf, type LearnPhase } from '@/lib/learnSteps';
import { useSessionStore, restartCardTimer, fileItemOf, lectureOf, cardKey } from '@/store/session';
import { onlyStudies } from '@/lib/studies';
import { toast } from '@/store/toast';
import { useResumeStore } from '@/store/resume';
import { CourseTree } from '@/components/CourseTree';
import { EMPTY_PROGRESS, useProgressStore } from '@/store/progress';
import { ItemRenderer } from '@/components/items/ItemRenderer';
import { SectionJump } from './SectionJump';
import { SessionRail } from './SessionRail';
import { MixedLectures } from './MixedLectures';
import { CATCH_UP_HOURS, missedThisSitting, nextDueAt, whenLabel } from '@/lib/memory';
import { examRule } from '@/lib/exam';
import { useCoursesStore } from '@/store/courses';
import { measuredPace, useStudyLogStore } from '@/store/studyLog';
import { todayAcrossCourses, type CourseToday } from '@/lib/libraryToday';
import { plannedMinutes, studiedToday, todaySitting } from '@/lib/todaySitting';
import { CATCH_UP_MINUTES, PART_GAP_HOURS } from '@/lib/today';
import { sectionsToLearn } from '@/lib/nextToLearn';
import { useLearnStore } from '@/store/learn';
import { lectureName, lecturesOf } from '@/lib/classExams';
import { choiceOf, countBasis, practiceCount, practiceLink } from '@/lib/practice';
import { answerPoints } from '@/lib/answerPoints';
import { termPicked } from '@/lib/mixUps';

type CardMode = Exclude<StudyMode, 'browse'>;

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
  /** With classCode: the class Practice's choice was this lecture only, so the end offers no next lecture. */
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

/** A short- or long-answer card (lib/answerPoints) has its own keys, whatever the mode. */
const WRITTEN_HINTS: KeyHint[] = [
  { keys: ['Space'], label: 'show the answer' },
  { keys: ['1', '–', '9'], label: 'tick a point' },
  { keys: ['Enter'], label: 'done' },
  ...NAV_HINTS,
];
const ONE_POINT_HINTS: KeyHint[] = [
  { keys: ['Space'], label: 'show the answer' },
  { keys: ['G'], label: 'got it' },
  { keys: ['M'], label: 'missed it' },
  ...NAV_HINTS,
];

const EMPTY_COPY: Record<CardMode, { title: string; text: string }> = {
  learn: { title: 'Nothing to learn yet', text: 'This lecture has no items to walk through.' },
  weakest: {
    title: 'Nothing to rank',
    text: 'Weakest First orders the questions and flashcards you can be scored on, and this lecture has none yet.',
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
  review: {
    title: 'Nothing is due',
    text: 'Everything you have studied is still fresh. Review brings items back as they start to fade. New material comes through Learn.',
  },
  mixed: { title: 'No items', text: 'This lecture has no items yet.' },
  today: {
    title: 'Nothing for today',
    text: 'Nothing is due and everything here has been studied. Add material after your next lecture, or practise with Quiz or Mixed.',
  },
  missed: {
    title: 'Nothing to review',
    text:
      "You haven't missed anything yet, or you've already nailed it on a retry. Study some Quiz or Flashcards to build up practice history.",
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
  const phase = phaseOf(item.type);
  // Today's sitting opens with what is due; say so, the way a step is named.
  if (item._block === 'review') {
    return (
      <div className="mb-4 flex items-baseline gap-3 border-b border-border pb-2 text-small">
        <span className="mark shrink-0 whitespace-nowrap text-text-3">Review</span>
        <span className="min-w-0 text-text-2">what you have studied and are starting to lose</span>
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
      {/* How every step starts, for every lecture (store/learn.ts). Skipping
          the reading suits material already met in the lecture or slides:
          simulated, it was level for material never met and ahead for
          material met before (sim/FINDINGS.md, 2026-10-12). */}
      <button
        type="button"
        onClick={onSwitch}
        className="tap-safe ml-auto whitespace-nowrap text-text-3 underline-offset-4 hover:text-text hover:underline"
      >
        {questionsFirst ? 'Read first' : 'Skip the reading'}
      </button>
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
      return clip(item.question);
    default:
      return '';
  }
}

/** Every mode except Browse — one item at a time. */
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
  const questionsFirst = useLearnStore((s) => s.questionsFirst);
  const items = useSessionStore((s) => s.items);
  const index = useSessionStore((s) => s.index);
  const score = useSessionStore((s) => s.score);
  const current = useSessionStore((s) => s.current());
  const written = current?.type === 'flashcard' ? answerPoints(current) : null;
  const hints = written ? (written.points.length === 1 ? ONE_POINT_HINTS : WRITTEN_HINTS) : KEY_HINTS[mode];
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
      bookmark &&
      bookmark.mode === mode &&
      (bookmark.sectionId ?? undefined) === sectionId &&
      (bookmark.kind ?? null) === useSessionStore.getState().pendingKind &&
      (bookmark.study ?? null) === useSessionStore.getState().pendingStudy &&
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
      // The latest answer to each card in the step, copies included.
      shaky: [
        ...inStep
          .filter(({ n }) => results.has(n))
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
    setNextCourse(mode === 'today' ? nextCourseFor() : null);
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
        navigate(home);
        return;
      }
      if (pause) {
        if (e.key === 'Enter' || e.key === 'ArrowRight') {
          e.preventDefault();
          setPause(null);
          restartCardTimer();
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
      <div className="mx-auto flex max-w-2xl flex-col items-center py-10 text-center sm:px-10">
        {/* A mixed sitting grew several trees: they are in the list below. */}
        {!mixedClass && (
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
        )}
        <h1 className={`${mixedClass ? '' : 'mt-5 '}font-display text-title font-semibold text-text`}>
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
            {moreDue} more {moreDue === 1 ? 'is' : 'are'} due.
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
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
    );
  }

  return (
    <div className="mx-auto max-w-2xl py-6 sm:px-6 lg:grid lg:max-w-5xl lg:grid-cols-[minmax(0,1fr)_13rem] lg:gap-12">
      <div className="min-w-0">
      <div className="mb-4 flex items-center justify-between">
        <Link to={home} className="tap-safe inline-flex items-center text-sm text-text-2 hover:text-text">
          ← Back
        </Link>
        <span className="flex items-baseline gap-2">
          <span className="mark text-text-2">
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

      {/* Sections are a lecture's; a mixed sitting has no runs of one to jump to. */}
      {!mixedClass && <SectionJump items={items} mode={mode} activeSectionId={activeSectionId} onJump={jumpToSection} />}

      {resumed && (
        <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-border bg-surface px-4 py-2 text-sm">
          <span className="text-text-2">Picked up where you left off.</span>
          <button type="button" onClick={() => restart()} className="text-accent hover:underline">
            Start from the beginning
          </button>
        </div>
      )}

      {(mode === 'learn' || mode === 'today') && current && !pause && (
        <StepLine
          item={current}
          questionsFirst={questionsFirst}
          onSwitch={() => {
            useLearnStore.getState().setQuestionsFirst(!questionsFirst);
            // Rebuilt from this card on: a flashcard shown open carries on
            // at the flashcard, a definition at its typed term.
            const here = current.type === 'preview' ? current.target.id : current.id;
            init(courseId, course, mode, sectionId, here);
            // The same sitting carrying on, not a saved place picked up.
            useSessionStore.setState({ resumed: false });
          }}
        />
      )}
      {mixedClass ? (
        // No lecture is named on a card: which one it is from is part of the question.
        <p className="mb-4 text-xs text-text-3">
          {mode === 'review'
            ? 'What you have studied and are starting to lose, every lecture mixed together, each one’s faintest early.'
            : mode === 'weakest'
              ? 'Every lecture mixed together, each one’s likeliest to be forgotten early.'
              : 'Every lecture mixed together.'}
        </p>
      ) : (
        <>
          {mode === 'review' && (
            <p className="mb-4 text-xs text-text-3">
              What you have studied and are starting to lose, faintest first.
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
            <p className="mx-auto mt-2 max-w-prose text-small text-text-2">{pause.terms.join(' · ')}</p>
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

      {current && !pause && (
        <ItemRenderer
          // By position as well as id: a missed card that comes back is the
          // same item, and must start unanswered.
          key={`${current.id}@${index}`}
          item={current}
          frame="sheet"
          onAnswered={(got, picked) => {
            record(got);
            // A wrong pick that is another term of the lecture is a mix-up,
            // kept so Review asks that term beside this question (lib/mixUps).
            if (got || picked == null || current.type !== 'mcq') return;
            const lecture = lectureOf(current, courseId);
            const lectureCourse = useCoursesStore.getState().courses[lecture];
            const other = lectureCourse && termPicked(lectureCourse, current, picked);
            if (other) useProgressStore.getState().noteConfusion(lecture, current.id, other);
          }}
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
          onReadThem={() => useSessionStore.getState().askFirst(current._sectionId)}
          onOverride={setResult}
          onConfused={(otherId) => useProgressStore.getState().noteConfusion(lectureOf(current, courseId), current.id, otherId)}
          onNext={handleNext}
          learning={current._step !== undefined}
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

      {/* Hidden on touch, where there's no keyboard to hint about. */}
      <p
        className={`mt-4 hidden flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-3 lg:!hidden ${pause ? '' : '[@media(hover:hover)]:flex'}`}
      >
        {hints.map((hint) => (
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
      <SessionRail
        items={items}
        index={index}
        course={course}
        score={score}
        hints={pause ? [] : hints}
        // A mixed sitting shows neither which lecture the card is from (that
        // is part of the question) nor its parts (a run is a card or two).
        parts={!mixedClass}
        figure={
          /* The course's tree with the section you are in lit: the one
             screen you spend the most time on otherwise has nothing of the
             course on it but its text. */
          mixedClass ? undefined : (
            <CourseTree courseId={courseId} course={course} progress={progress} className="h-40" highlight={activeSectionId} />
          )
        }
      />
    </div>
  );
}
