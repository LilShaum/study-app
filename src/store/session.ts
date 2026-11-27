import { create } from 'zustand';
import type { Course } from '@/schema/course';
import { buildSessionItems, recallId, type CardKind, type SessionItem, type StudyMode } from '@/lib/buildSessionItems';
import { sectionsFor, type PracticeChoice } from '@/lib/practiceChoice';
import { isMissed, useProgressStore, type ItemResult } from './progress';
import { answerPoints } from '@/lib/answerPoints';
import { examRule } from '@/lib/exam';
import { usePlanStore } from './plan';
import { useLearnStore } from './learn';
import { todaySitting } from '@/lib/todaySitting';
import { measuredPace, useStudyLogStore, type AnswerEvent } from './studyLog';
import { getPersonalScale, retrievability, type Grade } from '@/lib/memory';
import { applyPersonalScale } from '@/lib/personalScale';
import { twinsOf } from '@/lib/linkedTerms';
import { useCoursesStore } from './courses';
import { onlyStudies } from '@/lib/studies';
import { mixLectures } from '@/lib/mixLectures';
import { ADAPTIVE_WINDOW } from '@/lib/buildSessionItems';

/** The adaptive quiz plans its next window when this few cards are left. */
const ADAPTIVE_TOP_UP = 3;

/**
 * When the current card was put in front of the student. Kept outside the
 * store: it changes on every card and nothing renders from it.
 */
let shownAt = Date.now();

/**
 * The lecture a card belongs to: its own in a class's mixed Practice
 * (lib/mixLectures), else the session's.
 */
export function lectureOf(item: SessionItem, sessionCourseId: string): string {
  return item._courseId ?? sessionCourseId;
}

/**
 * A card's identity within a sitting. Two lectures can use the same item id,
 * so a mixed sitting tells them apart by lecture; anywhere else it is the id.
 */
export function cardKey(item: SessionItem): string {
  return item._courseId ? `${item._courseId}\u0000${item.id}` : item.id;
}

/** Log how long the card now showing was up, as the student leaves it. */
function logCurrentCard(state: { courseId: string | null; items: SessionItem[]; index: number }) {
  const item = state.items[state.index];
  if (!item || !state.courseId) return;
  const now = Date.now();
  useStudyLogStore.getState().logCard(lectureOf(item, state.courseId), item.type, (now - shownAt) / 1000, now);
  shownAt = now;
}

/**
 * Starts the current card's clock afresh: for a card shown again after the
 * student sat on a pause screen, which is not time spent on the card.
 */
export function restartCardTimer() {
  shownAt = Date.now();
}

interface SessionState {
  courseId: string | null;
  mode: StudyMode | null;
  items: SessionItem[];
  index: number;
  score: { got: number; missed: number };
  activeSectionId: string | null;
  answeredIndices: Set<number>;
  /** What each answered index was recorded as, so an override knows what it is correcting. */
  results: Map<number, boolean>;
  /**
   * The course's progress as the session began, so its end can show what the
   * session changed on the tree. Progress records are replaced, never
   * mutated, so holding the object is a true snapshot.
   */
  startProgress: Record<string, ItemResult>;
  /** The same for every lecture in the sitting (a mixed sitting has several). */
  startByCourse: Record<string, Record<string, ItemResult>>;
  /**
   * A class's Practice with the lectures mixed (initMixed): the lectures in
   * it, in class order. Null for a session of one lecture.
   */
  lectures: string[] | null;
  /** True once the student has advanced past the last item. */
  finished: boolean;
  /** True when this session started from a saved bookmark rather than item 1. */
  resumed: boolean;

  /**
   * Which kind of card Review, Weakest and Missed keep (the Practice page's
   * "Kind"), or null for all of them. Set by SessionRoute before the session
   * starts and left set, so restarting or "Keep reviewing" keeps the filter.
   */
  pendingKind: CardKind | null;
  setPendingKind: (kind: CardKind | null) => void;
  /**
   * The Practice page's studies choice: 'all', one study's key
   * (lib/studies.ts), or null for every card. Set and kept like pendingKind.
   */
  pendingStudy: string | null;
  setPendingStudy: (study: string | null) => void;
  /** A Practice sitting as the student built it (lib/practiceChoice). Set and kept like pendingKind. */
  pendingPractice: PracticeChoice | null;
  setPendingPractice: (choice: PracticeChoice | null) => void;
  /**
   * The minutes the student picked for this Today sitting on the lecture
   * page ("I have 15"), or null for the planned time. Set like pendingKind;
   * a resumed sitting or Keep going ignores it.
   */
  pendingMinutes: number | null;
  setPendingMinutes: (minutes: number | null) => void;
  /** `fullDay`: Today planned at the full daily time, ignoring what was studied today ("Keep going"). */
  init: (courseId: string, course: Course, mode: StudyMode, sectionId?: string, resumeItemId?: string, fullDay?: boolean) => void;
  /**
   * A class's Practice with the lectures mixed in one sitting
   * (lib/mixLectures): each lecture's list as its own session of `mode`
   * builds it (with the pending kind and studies), spread through the
   * sitting. Each card carries its lecture, and its answer is recorded there.
   * `courseId` is the lecture the session was opened from; `resume` a
   * bookmark's card, by lecture and id. Practice modes only: not Learn or
   * Today, whose steps and plan are one lecture's.
   */
  initMixed: (courseId: string, lectures: [string, Course][], mode: StudyMode, resume?: { courseId: string; itemId: string }) => void;
  /** The section this session is scoped to, or null for the whole course. */
  sectionId: string | null;
  current: () => SessionItem | null;
  total: () => number;
  hasNext: () => boolean;
  hasPrev: () => boolean;
  next: () => boolean;
  prev: () => boolean;
  /** Records the current item's result exactly once per index, mirroring Session.record. */
  /** `grade`: how well a right answer was known, when the student said (a flip card's Hard or Easy). */
  /**
   * `sure`: a multiple-choice answer given as sure (true) or marked Not
   * sure (false), logged with the answer. It changes no schedule: the
   * simulator found both rules tried cost more than they gave
   * (sim/FINDINGS.md, 2026-11-03); the log is there to test them on real
   * answers.
   */
  record: (got: boolean, grade?: Grade, sure?: boolean) => void;
  /** The adaptive quiz: plan the next window onto the end of the sitting. */
  topUp: () => void;
  /** Learn only: put a missed card back a few cards on. */
  requeue: (index: number) => void;
  /** Take back a requeued copy that has not been reached, when a miss is overruled. */
  unqueue: (index: number) => void;
  /**
   * The student overruling a verdict on the current item. Corrects the
   * recorded attempt — in the session tally and in stored progress — instead
   * of adding a second one. Records normally if nothing was recorded yet.
   */
  setResult: (got: boolean) => void;
  /** "I wasn't sure", after the current card was answered: its logged answer becomes not sure. */
  markUnsure: () => void;
  jumpToSection: (sectionId: string) => void;
  /**
   * Learn, at a section's start: questions first. Its reading cards still
   * ahead (definitions, flashcards shown open, explanations, worked examples,
   * figures) are dropped, so each card is asked before anything explains it,
   * the why and the passage shown after a miss; then the session moves on.
   */
  askFirst: (sectionId: string) => void;
  /** Learn: this section read here first, as usual; the next card. */
  readFirst: (sectionId: string) => void;
  /**
   * Partway into a section, the other way (the owner, 2026-11-22: "ensure
   * that you can change … even after first selecting one option and having
   * starting the section"). Questions first drops the reading still ahead;
   * read first puts the current step's reading back in front of the card on
   * screen, and the rest of the section's ahead. Answers so far are kept.
   */
  switchReading: (questionsFirst: boolean) => void;
  /**
   * The card on screen was set aside: it and every copy of it still ahead
   * leave the sitting (their file item, so a definition takes its typed term
   * with it). The caller moves the session on. `lecture`: the card's own
   * lecture, so a mixed sitting drops only that lecture's copies.
   */
  dropAhead: (fileItemId: string, lecture?: string) => void;
  /** Marks the session complete; cleared by init(). */
  finish: () => void;
  /**
   * Go straight back over what this session got wrong: the same items, just
   * the missed ones, as a fresh run. Answers are recorded as usual — and the
   * memory model gives an answer seconds after the last one almost no credit,
   * so a retry cannot inflate how well an item is held; it only teaches it.
   */
  retryMissed: () => void;
  /**
   * Ids whose latest answer in this sitting was wrong. In Learn a missed card
   * comes back until it is right, so a first miss that was put right later
   * is not still missed.
   */
  stillMissed: () => string[];
}

/** How many cards on a missed card comes back in Learn. */
const AGAIN_AFTER = 3;
/** Comes back at most this many times; after that it is left to Review. */
export const AGAIN_MAX = 3;

/** The by-position answer records, renumbered after a card is added or taken out. */
function shifted(s: { answeredIndices: Set<number>; results: Map<number, boolean> }, move: (n: number) => number) {
  return {
    answeredIndices: new Set([...s.answeredIndices].map(move)),
    results: new Map([...s.results].map(([n, got]) => [move(n), got] as [number, boolean])),
  };
}

/** The course-file item a session card comes from: a typed term is its definition's. */
export function fileItemOf(item: SessionItem): string {
  if (item.type === 'recall') return item.question ? item.id : item.target.id;
  if (item.type === 'preview') return item.target.id;
  return item.id;
}

/**
 * Whether a card is set aside in its lecture now. A miss set aside as not on
 * the exam is not one to go over again (the owner, 2026-11-17: "when i hit
 * not on exam on a question i got wrong, it shows up again in the review what
 * you got wrong section"). Read live, so Undo on the toast puts it back.
 */
export function isSetAside(item: SessionItem, sessionCourseId: string | null): boolean {
  if (!sessionCourseId) return false;
  const course = useCoursesStore.getState().courses[lectureOf(item, sessionCourseId)];
  const id = fileItemOf(item);
  return !!course?.sections.some((s) => s.items.some((i) => i.id === id && i.set_aside));
}

/**
 * The cards that teach before asking: left out of a section started
 * questions first, so nothing explains a question before it is asked (the
 * owner, 2026-11-22: "when you do click skip the reading the explanations
 * still show up before questions"). The why and the passage open after a
 * miss or Not sure instead.
 */
const READING_TYPES = new Set<SessionItem['type']>(['definition', 'preview', 'explain', 'example', 'graphic', 'slides']);

/** The section's reading cards after `from`, unanswered, taken out, the answers by position moved with their cards. */
function withoutReading(
  s: { items: SessionItem[]; answeredIndices: Set<number>; results: Map<number, boolean> },
  sectionId: string,
  from: number,
) {
  const keep = s.items.map((item, n) => !(n > from && item._sectionId === sectionId && READING_TYPES.has(item.type) && !s.answeredIndices.has(n)));
  const moved = new Map<number, number>();
  let to = 0;
  keep.forEach((k, n) => {
    if (k) moved.set(n, to++);
  });
  return { items: s.items.filter((_, n) => keep[n]), ...shifted(s, (n) => moved.get(n) ?? n) };
}

const isGradable = (item: SessionItem) =>
  item.type === 'mcq' || item.type === 'multi' || item.type === 'flashcard' || item.type === 'recall' || item.type === 'problem';

/** Ephemeral, in-memory only — an active study session is not persisted. */
/**
 * A term never answered in this lecture but answered in another one where it
 * means the same (lib/linkedTerms) starts from that record, so what the
 * student studied before answers were mirrored counts too. Only fills gaps:
 * a record this lecture already has is its own.
 */
function adoptLinkedTerms(courseId: string): void {
  const courses = useCoursesStore.getState().courses;
  const all = useProgressStore.getState().byCourse;
  const mine = all[courseId] ?? {};
  const course = courses[courseId];
  if (!course) return;
  const adopted: Record<string, ItemResult> = {};
  for (const section of course.sections) {
    for (const item of section.items) {
      if (item.type !== 'definition') continue;
      const id = recallId(item.id);
      if (mine[id]) continue;
      const from = twinsOf(courses, courseId, id)
        .map((t) => all[t.courseId]?.[t.id])
        .filter((r): r is ItemResult => !!r && r.lastSeen != null)
        .sort((a, b) => (b.lastSeen ?? 0) - (a.lastSeen ?? 0))[0];
      if (from) {
        const { confusedWith: _ids, ...record } = from;
        void _ids;
        adopted[id] = record;
      }
    }
  }
  if (Object.keys(adopted).length)
    useProgressStore.setState((st) => ({ byCourse: { ...st.byCourse, [courseId]: { ...(st.byCourse[courseId] ?? {}), ...adopted } } }));
}

/** What every new sitting starts from, whichever way it is built. */
const freshSitting = () => ({
  score: { got: 0, missed: 0 },
  answeredIndices: new Set<number>(),
  results: new Map<number, boolean>(),
  finished: false,
});

/**
 * One lecture's list for a mode, as a session of it asks it: init's, and
 * each lecture's part of a mixed sitting. `resuming`: Today's sitting is
 * already under way, or carries on past the plan.
 */
function listFor(
  courseId: string,
  course: Course,
  mode: StudyMode,
  { sectionId, resuming, kind, study, practice, exclude }: { sectionId?: string; resuming: boolean; kind: CardKind | null; study: string | null; practice?: PracticeChoice | null; exclude?: ReadonlySet<string> },
): { items: SessionItem[]; progress: Record<string, ItemResult> } {
  const progressStore = useProgressStore.getState();
  const missedIds = mode === 'missed' || mode === 'practice' || mode === 'adaptive' ? progressStore.missedIds(courseId) : undefined;
  // Weakest-first ranks by the student's own history, so it is the one mode
  // that needs the full per-item record rather than a set of ids.
  // Weakest and Review rank by history, Terms pairs mixed-up terms from it,
  // and a question already answered right comes back typed — so every mode
  // that builds from it gets it.
  const progress = progressStore.getProgress(courseId);
  const items = buildSessionItems(course, mode, {
    missedIds,
    sectionId,
    progress,
    exam: examRule(course, progress, Date.now()),
    minutes:
      mode === 'today'
        ? // A resumed sitting is the one already under way: the time spent in it
          // is already in the day's total, so re-planning from what is left
          // would shrink it, or empty it, under the bookmark.
          (!resuming && useSessionStore.getState().pendingMinutes) ||
          todaySitting(courseId, course, progress, Date.now(), resuming).minutes
        : usePlanStore.getState().minutesFor(courseId),
    pace: measuredPace(useStudyLogStore.getState().byCourse),
    kind: kind ?? undefined,
    onlyIds: onlyStudies(course, mode === 'practice' ? (practice?.study ?? null) : study),
    ...(mode === 'practice' && practice
      ? {
          practice: {
            kinds: new Set(practice.kinds),
            which: new Set(practice.which),
            order: practice.order,
            sectionIds: sectionsFor(practice, courseId),
            newCap: practice.newCap,
          },
        }
      : {}),
    questionsFirst: useLearnStore.getState().everySection,
    exclude,
  });
  return { items, progress };
}

export const useSessionStore = create<SessionState>()((set, get) => ({
  courseId: null,
  mode: null,
  items: [],
  index: 0,
  score: { got: 0, missed: 0 },
  activeSectionId: null,
  answeredIndices: new Set(),
  results: new Map(),
  startProgress: {},
  startByCourse: {},
  lectures: null,
  finished: false,
  resumed: false,
  sectionId: null,
  pendingKind: null,
  setPendingKind: (kind) => set({ pendingKind: kind }),
  pendingStudy: null,
  setPendingStudy: (study) => set({ pendingStudy: study }),
  pendingPractice: null,
  setPendingPractice: (choice) => set({ pendingPractice: choice }),
  pendingMinutes: null,
  setPendingMinutes: (minutes) => set({ pendingMinutes: minutes }),

  init: (courseId, course, mode, sectionId, resumeItemId, fullDay = false) => {
    adoptLinkedTerms(courseId);
    // The student's own forgetting rate, refitted from their answers so far.
    applyPersonalScale();
    const { items, progress } = listFor(courseId, course, mode, {
      sectionId,
      resuming: fullDay || !!resumeItemId,
      kind: get().pendingKind,
      study: get().pendingStudy,
      practice: get().pendingPractice,
    });
    shownAt = Date.now();
    // Resume by id, not position: Mixed and Review Missed reshuffle each start
    // and Weakest First reorders as accuracy changes, so a saved index would
    // land on a different item. An id the list no longer holds (the item was
    // edited away, or the mode now filters it out) falls back to the start.
    // A bookmark saved before typed recall existed points at a DEFINITION, and
    // the modes that now ask for definitions rather than show them serve its
    // recall question under a different id. Without the second lookup those
    // bookmarks silently restarted from item 1.
    const find = (id: string) => items.findIndex((i) => i.id === id);
    const resumeIndex = resumeItemId
      ? find(resumeItemId) >= 0
        ? find(resumeItemId)
        : find(recallId(resumeItemId))
      : -1;
    const index = resumeIndex >= 0 ? resumeIndex : 0;
    // Carried on partway into a section started questions first: it carries
    // on that way. At a section's start its first card asks again.
    let list = { items, answeredIndices: new Set<number>(), results: new Map<number, boolean>() };
    const here = items[index];
    if (here && (mode === 'learn' || mode === 'today') && here.type !== 'slides' && useLearnStore.getState().startedQuestionsFirst(courseId, here._sectionId))
      list = withoutReading(list, here._sectionId, index);
    set({
      ...freshSitting(),
      courseId,
      mode,
      sectionId: sectionId ?? null,
      items: list.items,
      index,
      resumed: resumeIndex >= 0,
      activeSectionId: items[index]?._sectionId ?? null,
      startProgress: progress,
      startByCourse: { [courseId]: progress },
      lectures: null,
    });
  },

  initMixed: (courseId, lectures, mode, resume) => {
    if (mode === 'learn' || mode === 'today' || mode === 'browse') {
      // Not a practice mode: one lecture's session, as before.
      const own = lectures.find(([id]) => id === courseId);
      if (own) get().init(courseId, own[1], mode, undefined, resume?.courseId === courseId ? resume.itemId : undefined);
      return;
    }
    for (const [id] of lectures) adoptLinkedTerms(id);
    applyPersonalScale();
    const lists = lectures.map(([id, course]) => ({
      courseId: id,
      ...listFor(id, course, mode, { resuming: false, kind: get().pendingKind, study: get().pendingStudy, practice: get().pendingPractice }),
    }));
    const items = mixLectures(lists);
    shownAt = Date.now();
    // As init: by id, and a definition's bookmark finds its typed term. Here
    // the id is only unique with its lecture.
    const find = (id: string) => items.findIndex((i) => i._courseId === resume?.courseId && i.id === id);
    const found = resume ? find(resume.itemId) : -1;
    const resumeIndex = resume && found < 0 ? find(recallId(resume.itemId)) : found;
    const index = resumeIndex >= 0 ? resumeIndex : 0;
    const startByCourse = Object.fromEntries(lists.map((l) => [l.courseId, l.progress]));
    set({
      ...freshSitting(),
      courseId,
      mode,
      sectionId: null,
      items,
      index,
      resumed: resumeIndex >= 0,
      activeSectionId: items[index]?._sectionId ?? null,
      startProgress: startByCourse[courseId] ?? useProgressStore.getState().getProgress(courseId),
      startByCourse,
      lectures: lectures.map(([id]) => id),
    });
  },

  current: () => get().items[get().index] ?? null,
  total: () => get().items.length,
  hasNext: () => get().index < get().items.length - 1,
  hasPrev: () => get().index > 0,

  next: () => {
    // The adaptive quiz plans its next window before the last one runs out.
    if (get().mode === 'adaptive' && get().items.length - get().index <= ADAPTIVE_TOP_UP) get().topUp();
    if (!get().hasNext()) return false;
    logCurrentCard(get());
    set((state) => {
      const index = state.index + 1;
      return { index, activeSectionId: state.items[index]?._sectionId ?? null };
    });
    return true;
  },

  topUp: () => {
    const { courseId, items, lectures } = get();
    if (!courseId) return;
    const courses = useCoursesStore.getState().courses;
    const ids = lectures ?? [courseId];
    // Every card already in this sitting, by lecture: not planned again.
    const lists = ids.flatMap((id) => {
      const course = courses[id];
      if (!course) return [];
      const exclude = new Set(items.filter((i) => lectureOf(i, courseId) === id).map((i) => i.id));
      return [{ courseId: id, ...listFor(id, course, 'adaptive', { resuming: false, kind: null, study: null, exclude }) }];
    });
    const more = lectures ? mixLectures(lists).slice(0, ADAPTIVE_WINDOW) : (lists[0]?.items ?? []);
    if (more.length) set((s) => ({ items: [...s.items, ...more] }));
  },

  prev: () => {
    if (!get().hasPrev()) return false;
    logCurrentCard(get());
    set((state) => {
      const index = state.index - 1;
      return { index, activeSectionId: state.items[index]?._sectionId ?? null };
    });
    return true;
  },

  record: (got, grade, sure) => {
    const state = get();
    const item = state.current();
    const { courseId, index } = state;
    if (!item || !courseId || state.answeredIndices.has(index)) return;

    // The tally counts first attempts: a card that came back after a miss
    // and was then got right is one miss, not a miss and a correct answer.
    const first = !item._again;
    set((s) => ({
      answeredIndices: new Set(s.answeredIndices).add(index),
      results: new Map(s.results).set(index, got),
      score: first
        ? { got: s.score.got + (got ? 1 : 0), missed: s.score.missed + (got ? 0 : 1) }
        : s.score,
    }));
    recordAnswer(lectureOf(item, courseId), item, got, got || grade === 'firm' ? grade : undefined, sure);
    if (!got) get().requeue(index);
  },

  requeue: (index) => {
    const { mode, items } = get();
    const item = items[index];
    // The adaptive quiz re-asks a miss a few cards on too (docs/proposals/zen.md).
    const learning = mode === 'learn' || mode === 'adaptive' || (mode === 'today' && item?._step !== undefined);
    if (!learning || !item || !isGradable(item) || (item._again ?? 0) >= AGAIN_MAX) return;
    // A written answer of several points is not asked again minutes later:
    // that is memorising a list on the spot, again and again (the owner,
    // 2026-10-26). Review brings it back on a later day, which is what held
    // in the simulator (sim/FINDINGS.md, 2026-10-12).
    if (item.type === 'flashcard' && (answerPoints(item)?.points.length ?? 0) >= 2) return;
    // Nor a problem: its whole solution was just shown, so minutes later it
    // would be worked from memory of that, not from the method.
    if (item.type === 'problem') return;
    // Until it is right once, and no more: a higher bar in the first sitting
    // buys nothing that lasts once it is relearned on a later day (Vaughn,
    // Dunlosky & Rawson 2016, in docs/evidence.md). Review is that later day.
    // It stays in its own step: a few cards on, or as the step's last card
    // if the step ends sooner. A miss that came back in the next step, still
    // labelled with the old one, was a friend's complaint.
    let end = index;
    while (end + 1 < items.length && items[end + 1]._block === item._block) end++;
    let at = Math.min(index + 1 + AGAIN_AFTER, end + 1);
    // Before the step's question to write, which is asked last as the
    // thorough test (lib/learnSteps): a retry after it read as the order
    // going wrong (the owner, 2026-10-26). Unless that is straight after itself.
    const writing = items.findIndex((i, n) => n > index + 1 && n < at && ((i.type === 'flashcard' && !!answerPoints(i)) || i.type === 'problem'));
    if (writing > 0) at = writing;
    // Never straight after itself: with nothing in between it is only the
    // answer just seen, clicked again. Left to the catch-up and Review.
    if (at === index + 1) return;
    const copy: SessionItem = { ...item, _again: (item._again ?? 0) + 1 };
    // Answers are kept by position, so anything already answered past the
    // insertion (reached by going back with Prev) moves along with its card.
    set((s) => ({
      items: [...items.slice(0, at), copy, ...items.slice(at)],
      ...shifted(s, (n) => (n >= at ? n + 1 : n)),
    }));
  },

  unqueue: (index) => {
    const { items } = get();
    const item = items[index];
    if (!item) return;
    const pending = items.findIndex((i, n) => n > index && i.id === item.id && (i._again ?? 0) > (item._again ?? 0));
    if (pending < 0 || get().answeredIndices.has(pending)) return;
    set((s) => ({
      items: items.filter((_, n) => n !== pending),
      ...shifted(s, (n) => (n > pending ? n - 1 : n)),
    }));
  },

  setResult: (got) => {
    const state = get();
    const item = state.current();
    const { courseId, index } = state;
    if (!item || !courseId) return;
    const was = state.results.get(index);
    if (was === undefined) {
      state.record(got);
      return;
    }
    if (was === got) return;
    const first = !item._again;
    set((s) => ({
      results: new Map(s.results).set(index, got),
      score: first
        ? { got: s.score.got + (got ? 1 : -1), missed: s.score.missed + (got ? -1 : 1) }
        : s.score,
    }));
    const lecture = lectureOf(item, courseId);
    useProgressStore.getState().reviseResult(lecture, item.id, got);
    for (const twin of twinsOf(useCoursesStore.getState().courses, lecture, item.id))
      useProgressStore.getState().reviseResult(twin.courseId, twin.id, got);
    if (got) get().unqueue(index);
    else get().requeue(index);
  },

  markUnsure: () => {
    const { courseId, index } = get();
    const item = get().current();
    if (!item || !courseId || !get().answeredIndices.has(index)) return;
    useStudyLogStore.getState().markUnsure(lectureOf(item, courseId), item.id);
  },

  jumpToSection: (sectionId) => {
    const idx = get().items.findIndex((i) => i._sectionId === sectionId);
    if (idx < 0) return;
    logCurrentCard(get());
    set({ index: idx, activeSectionId: sectionId });
  },

  dropAhead: (fileItemId, lecture) => {
    const { items, index, courseId } = get();
    // In a mixed sitting two lectures can share an item id: only this lecture's goes.
    const same = (item: SessionItem) =>
      fileItemOf(item) === fileItemId && (!lecture || !courseId || lectureOf(item, courseId) === lecture);
    const keep = items.map((item, n) => n <= index || !same(item) || get().answeredIndices.has(n));
    const moved = new Map<number, number>();
    let to = 0;
    keep.forEach((k, n) => {
      if (k) moved.set(n, to++);
    });
    set((s) => ({ items: items.filter((_, n) => keep[n]), ...shifted(s, (n) => moved.get(n) ?? n) }));
  },

  askFirst: (sectionId) => {
    const { items, index, courseId } = get();
    if (courseId) useLearnStore.getState().setQuestionsFirst(lectureOf(items[index] ?? items[0], courseId), sectionId, true);
    set((s) => withoutReading(s, sectionId, s.index));
    get().next();
  },

  readFirst: (sectionId) => {
    const { items, index, courseId } = get();
    if (courseId && items[index]) useLearnStore.getState().setQuestionsFirst(lectureOf(items[index], courseId), sectionId, false);
    get().next();
  },

  switchReading: (questionsFirst) => {
    const { items, index, courseId, mode, sectionId } = get();
    const here = items[index];
    if (!here || !courseId || (mode !== 'learn' && mode !== 'today')) return;
    const lecture = lectureOf(here, courseId);
    useLearnStore.getState().setQuestionsFirst(lecture, here._sectionId, questionsFirst);
    if (questionsFirst) {
      set((s) => withoutReading(s, here._sectionId, s.index));
      return;
    }
    const course = useCoursesStore.getState().courses[lecture];
    if (!course) return;
    const fresh = listFor(lecture, course, mode, {
      sectionId: sectionId ?? undefined,
      resuming: true,
      kind: null,
      study: null,
    }).items;
    const at = fresh.findIndex((i) => i.id === here.id && !i._again);
    if (at < 0) return;
    // The step's reading before this card, not already met in this sitting.
    const seen = new Set(items.slice(0, index).map((i) => i.id));
    let from = at;
    while (from > 0 && fresh[from - 1]._sectionId === here._sectionId && fresh[from - 1]._step === fresh[at]._step) from--;
    const reading = fresh.slice(from, at).filter((i) => READING_TYPES.has(i.type) && i.type !== 'slides' && !seen.has(i.id));
    const ahead = fresh.slice(at);
    set((s) => ({
      items: [...s.items.slice(0, index), ...reading, ...ahead],
      // What was answered past here belongs to cards now rebuilt: only answers up to here are kept.
      answeredIndices: new Set([...s.answeredIndices].filter((n) => n < index)),
      results: new Map([...s.results].filter(([n]) => n < index)),
    }));
  },

  finish: () => {
    logCurrentCard(get());
    set({ finished: true });
  },

  stillMissed: () => {
    const { items, results, courseId } = get();
    const last = new Map<string, boolean>();
    for (const [i, got] of [...results].sort((a, b) => a[0] - b[0])) {
      const item = items[i];
      if (item && !isSetAside(item, courseId)) last.set(cardKey(item), got);
    }
    return [...last].filter(([, got]) => !got).map(([id]) => id);
  },

  retryMissed: () => {
    const { items } = get();
    const ids = new Set(get().stillMissed());
    const seen = new Set<string>();
    const missed = items
      .filter((item) => {
        const key = cardKey(item);
        if (!ids.has(key) || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((item) => ({ ...item, _again: undefined }));
    if (!missed.length) return;
    set({
      items: missed,
      index: 0,
      resumed: false,
      score: { got: 0, missed: 0 },
      activeSectionId: missed[0]._sectionId,
      answeredIndices: new Set(),
      results: new Map(),
      finished: false,
    });
  },
}));

/**
 * One answer into the memory model and the study log, with the same term in
 * the student's other lectures. Every way of answering a card goes through
 * here: a study session (record, above) and a practice test (TestRoute).
 */
function recordAnswer(courseId: string, item: { id: string; type: string }, got: boolean, grade?: Grade, sure?: boolean): void {
  recordAnswers([{ courseId, item, got, grade, sure }]);
}

/**
 * Several answers at once (a practice test's whole batch): one write per
 * lecture to each store, rather than two for every card, which on a big
 * library froze a phone for a moment when a 40-question test was marked.
 */
export function recordAnswers(answers: { courseId: string; item: { id: string; type: string }; got: boolean; grade?: Grade; sure?: boolean }[]): void {
  const now = Date.now();
  const scale = getPersonalScale();
  const courses = useCoursesStore.getState().courses;
  const events = new Map<string, AnswerEvent[]>();
  const results = new Map<string, { itemId: string; got: boolean; grade?: Grade }[]>();
  const add = <T,>(m: Map<string, T[]>, k: string, v: T) => m.set(k, [...(m.get(k) ?? []), v]);
  for (const { courseId, item, got, grade, sure } of answers) {
    const before = useProgressStore.getState().getProgress(courseId)[item.id];
    add(events, courseId, {
      at: now,
      type: item.type,
      got,
      sinceHours: before?.lastSeen != null ? (now - before.lastSeen) / 3_600_000 : null,
      // The record keeps the memory before its latest answer; stability
      // that did not rise means that answer was a miss.
      afterMiss: isMissed(before),
      predicted: retrievability(before, now),
      scale,
      ...(got && grade === 'hard' ? { grade: 'hard' as const } : !got && grade === 'firm' ? { grade: 'firm' as const } : {}),
      ...(sure != null ? { sure } : {}),
      item: item.id,
    });
    add(results, courseId, { itemId: item.id, got, ...(grade ? { grade } : {}) });
    // The same term in the student's other lectures (lib/linkedTerms).
    for (const twin of twinsOf(courses, courseId, item.id)) add(results, twin.courseId, { itemId: twin.id, got, ...(grade ? { grade } : {}) });
  }
  for (const [courseId, list] of events) useStudyLogStore.getState().logAnswers(courseId, list);
  for (const [courseId, list] of results) useProgressStore.getState().recordResults(courseId, list);
}
