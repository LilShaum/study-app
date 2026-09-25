import { create } from 'zustand';
import type { Course } from '@/schema/course';
import { examTime } from '@/lib/memory';
import { buildSessionItems, recallId, type SessionItem, type StudyMode } from '@/lib/buildSessionItems';
import { useProgressStore } from './progress';

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
}

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
  finished: false,
  resumed: false,
  sectionId: null,

  init: (courseId, course, mode, sectionId, resumeItemId) => {
    const progressStore = useProgressStore.getState();
    const missedIds = mode === 'missed' ? progressStore.missedIds(courseId) : undefined;
    // Weakest-first ranks by the student's own history, so it is the one mode
    // that needs the full per-item record rather than a set of ids.
    const progress = mode === 'weakest' || mode === 'review' ? progressStore.getProgress(courseId) : undefined;
    const examAt = examTime(course.metadata.exam_date);
    const items = buildSessionItems(course, mode, { missedIds, sectionId, progress, examAt });
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
      finished: false,
    });
  },

  current: () => get().items[get().index] ?? null,
  total: () => get().items.length,
  hasNext: () => get().index < get().items.length - 1,
  hasPrev: () => get().index > 0,

  next: () => {
    if (!get().hasNext()) return false;
    set((state) => {
      const index = state.index + 1;
      return { index, activeSectionId: state.items[index]?._sectionId ?? null };
    });
    return true;
  },

  prev: () => {
    if (!get().hasPrev()) return false;
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

    set((s) => ({
      answeredIndices: new Set(s.answeredIndices).add(index),
      results: new Map(s.results).set(index, got),
      score: { got: s.score.got + (got ? 1 : 0), missed: s.score.missed + (got ? 0 : 1) },
    }));
    useProgressStore.getState().recordResult(courseId, item.id, got);
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
    set((s) => ({
      results: new Map(s.results).set(index, got),
      score: {
        got: s.score.got + (got ? 1 : -1),
        missed: s.score.missed + (got ? -1 : 1),
      },
    }));
    useProgressStore.getState().reviseResult(courseId, item.id, got);
  },

  jumpToSection: (sectionId) => {
    const idx = get().items.findIndex((i) => i._sectionId === sectionId);
    if (idx >= 0) set({ index: idx, activeSectionId: sectionId });
  },

  finish: () => set({ finished: true }),

  retryMissed: () => {
    const { items, results } = get();
    const seen = new Set<string>();
    const missed = items.filter((item, i) => {
      if (results.get(i) !== false || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
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
