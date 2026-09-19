import { create } from 'zustand';
import type { Course } from '@/schema/course';
import { buildSessionItems, type SessionItem, type StudyMode } from '@/lib/buildSessionItems';
import { useProgressStore } from './progress';

interface SessionState {
  courseId: string | null;
  mode: StudyMode | null;
  items: SessionItem[];
  index: number;
  score: { got: number; missed: number };
  activeSectionId: string | null;
  answeredIndices: Set<number>;
  /** True once the student has advanced past the last item. */
  finished: boolean;

  init: (courseId: string, course: Course, mode: StudyMode, sectionId?: string) => void;
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
  jumpToSection: (sectionId: string) => void;
  /** Marks the session complete; cleared by init(). */
  finish: () => void;
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
  finished: false,
  sectionId: null,

  init: (courseId, course, mode, sectionId) => {
    const missedIds = mode === 'missed' ? useProgressStore.getState().missedIds(courseId) : undefined;
    const items = buildSessionItems(course, mode, missedIds, sectionId);
    set({
      courseId,
      mode,
      sectionId: sectionId ?? null,
      items,
      index: 0,
      score: { got: 0, missed: 0 },
      activeSectionId: items[0]?._sectionId ?? null,
      answeredIndices: new Set(),
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
      score: { got: s.score.got + (got ? 1 : 0), missed: s.score.missed + (got ? 0 : 1) },
    }));
    useProgressStore.getState().recordResult(courseId, item.id, got);
  },

  jumpToSection: (sectionId) => {
    const idx = get().items.findIndex((i) => i._sectionId === sectionId);
    if (idx >= 0) set({ index: idx, activeSectionId: sectionId });
  },

  finish: () => set({ finished: true }),
}));
