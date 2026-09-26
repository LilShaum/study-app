import { create } from 'zustand';
import type { Course } from '@/schema/course';
import { buildSessionItems, recallId, type SessionItem, type StudyMode } from '@/lib/buildSessionItems';
import { useProgressStore, type ItemResult } from './progress';
import { examRule } from '@/lib/exam';
import { usePlanStore } from './plan';
import { measuredPace, useStudyLogStore } from './studyLog';
import { retrievability } from '@/lib/memory';

/**
 * When the current card was put in front of the student. Kept outside the
 * store: it changes on every card and nothing renders from it.
 */
let shownAt = Date.now();

/** Log how long the card now showing was up, as the student leaves it. */
function logCurrentCard(state: { courseId: string | null; items: SessionItem[]; index: number }) {
  const item = state.items[state.index];
  if (!item || !state.courseId) return;
  const now = Date.now();
  useStudyLogStore.getState().logCard(state.courseId, item.type, (now - shownAt) / 1000, now);
  shownAt = now;
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
  /** True once the student has advanced past the last item. */
  finished: boolean;
  /** True when this session started from a saved bookmark rather than item 1. */
  resumed: boolean;

  init: (courseId: string, course: Course, mode: StudyMode, sectionId?: string, resumeItemId?: string) => void;
  /** The section this session is scoped to, or null for the whole course. */
  sectionId: string | null;
  current: () => SessionItem | null;
  total: () => number;
  hasNext: () => boolean;
  hasPrev: () => boolean;
  next: () => boolean;
  prev: () => boolean;
  /** Records the current item's result exactly once per index, mirroring Session.record. */
  record: (got: boolean) => void;
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
  jumpToSection: (sectionId: string) => void;
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
export const AGAIN_AFTER = 3;
/** Comes back at most this many times; after that it is left to Review. */
export const AGAIN_MAX = 3;

/** The by-position answer records, renumbered after a card is added or taken out. */
function shifted(s: { answeredIndices: Set<number>; results: Map<number, boolean> }, move: (n: number) => number) {
  return {
    answeredIndices: new Set([...s.answeredIndices].map(move)),
    results: new Map([...s.results].map(([n, got]) => [move(n), got] as [number, boolean])),
  };
}

const isGradable = (item: SessionItem) =>
  item.type === 'mcq' || item.type === 'flashcard' || item.type === 'recall';

/** Ephemeral, in-memory only — an active study session is not persisted. */
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
  finished: false,
  resumed: false,
  sectionId: null,

  init: (courseId, course, mode, sectionId, resumeItemId) => {
    const progressStore = useProgressStore.getState();
    const missedIds = mode === 'missed' ? progressStore.missedIds(courseId) : undefined;
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
      minutes: usePlanStore.getState().minutesFor(courseId),
      pace: measuredPace(useStudyLogStore.getState().byCourse),
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
    set({
      courseId,
      mode,
      sectionId: sectionId ?? null,
      items,
      index,
      resumed: resumeIndex >= 0,
      score: { got: 0, missed: 0 },
      activeSectionId: items[index]?._sectionId ?? null,
      answeredIndices: new Set(),
      results: new Map(),
      startProgress: progress,
      finished: false,
    });
  },

  current: () => get().items[get().index] ?? null,
  total: () => get().items.length,
  hasNext: () => get().index < get().items.length - 1,
  hasPrev: () => get().index > 0,

  next: () => {
    if (!get().hasNext()) return false;
    logCurrentCard(get());
    set((state) => {
      const index = state.index + 1;
      return { index, activeSectionId: state.items[index]?._sectionId ?? null };
    });
    return true;
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

  record: (got) => {
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
    const before = useProgressStore.getState().getProgress(courseId)[item.id];
    const now = Date.now();
    useStudyLogStore.getState().logAnswer(courseId, {
      at: now,
      type: item.type,
      got,
      sinceHours: before?.lastSeen != null ? (now - before.lastSeen) / 3_600_000 : null,
      // The record keeps the memory before its latest answer; stability
      // that did not rise means that answer was a miss.
      afterMiss: before
        ? before.before
          ? (before.stability ?? 0) <= before.before.stability
          : before.missed > 0 && before.got === 0
        : false,
      predicted: retrievability(before, now),
    });
    useProgressStore.getState().recordResult(courseId, item.id, got);
    if (!got) get().requeue(index);
  },

  requeue: (index) => {
    const { mode, items } = get();
    const item = items[index];
    const learning = mode === 'learn' || (mode === 'today' && item?._step !== undefined);
    if (!learning || !item || !isGradable(item) || (item._again ?? 0) >= AGAIN_MAX) return;
    // Until it is right once, and no more: a higher bar in the first sitting
    // buys nothing that lasts once it is relearned on a later day (Vaughn,
    // Dunlosky & Rawson 2016, in docs/evidence.md). Review is that later day.
    const at = Math.min(index + 1 + AGAIN_AFTER, items.length);
    const neighbour = items[at - 1];
    const copy: SessionItem = { ...item, _again: (item._again ?? 0) + 1, _block: neighbour._block };
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
    useProgressStore.getState().reviseResult(courseId, item.id, got);
    if (got) get().unqueue(index);
    else get().requeue(index);
  },

  jumpToSection: (sectionId) => {
    const idx = get().items.findIndex((i) => i._sectionId === sectionId);
    if (idx >= 0) set({ index: idx, activeSectionId: sectionId });
  },

  finish: () => {
    logCurrentCard(get());
    set({ finished: true });
  },

  stillMissed: () => {
    const { items, results } = get();
    const last = new Map<string, boolean>();
    for (const [i, got] of [...results].sort((a, b) => a[0] - b[0])) {
      const item = items[i];
      if (item) last.set(item.id, got);
    }
    return [...last].filter(([, got]) => !got).map(([id]) => id);
  },

  retryMissed: () => {
    const { items } = get();
    const ids = new Set(get().stillMissed());
    const seen = new Set<string>();
    const missed = items
      .filter((item) => {
        if (!ids.has(item.id) || seen.has(item.id)) return false;
        seen.add(item.id);
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
