import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { safeJSONStorage } from '@/lib/safeStorage';
import type { Course } from '@/schema/course';
import type { CardKind, StudyMode } from '@/lib/buildSessionItems';
import { recallId } from '@/lib/scored';

export interface Bookmark {
  mode: StudyMode;
  /** The section the session was scoped to, or null for the whole course. */
  sectionId: string | null;
  /** The Practice page's kind filter (questions, flashcards, terms), so Continue keeps it. */
  kind?: CardKind | null;
  /** The Practice page's studies choice, so Continue keeps it. */
  study?: string | null;
  /** A class's Practice, so Continue still runs through the class (and `single` keeps it to this lecture). */
  classCode?: string | null;
  single?: boolean;
  /**
   * The class's lectures mixed in one sitting. Kept, like any bookmark, in
   * the lecture the sitting was opened in; Continue there opens the mixed
   * sitting again.
   */
  mixed?: boolean;
  /** A mixed sitting's: the lecture of the card `itemId` names, when it is not this one. */
  itemCourseId?: string;
  /**
   * Where to pick up, as an item id rather than a position.
   *
   * Position would be wrong for half the modes: Mixed and Review Missed
   * reshuffle on every start, and Weakest First reorders as your accuracy
   * changes, so index 47 means a different item next time. An id survives all
   * of that, and survives the course being edited around it.
   */
  itemId: string;
  /** Position at the time of saving — display only ("item 47 of 151"). */
  index: number;
  total: number;
  updatedAt: number;
}

interface ResumeState {
  /** One bookmark per course: the last place you actually were. */
  byCourse: Record<string, Bookmark>;

  getBookmark: (courseId: string) => Bookmark | null;
  save: (courseId: string, bookmark: Bookmark) => void;
  clear: (courseId: string) => void;
  /** Used by the library's delete-with-undo, to put one back. */
  restore: (courseId: string, bookmark: Bookmark | null) => void;
}

export const useResumeStore = create<ResumeState>()(
  persist(
    (set, get) => ({
      byCourse: {},

      getBookmark: (courseId) => get().byCourse[courseId] ?? null,

      save: (courseId, bookmark) => {
        set((state) => ({ byCourse: { ...state.byCourse, [courseId]: bookmark } }));
      },

      clear: (courseId) => {
        set((state) => {
          if (!state.byCourse[courseId]) return state;
          const byCourse = { ...state.byCourse };
          delete byCourse[courseId];
          return { byCourse };
        });
      },

      restore: (courseId, bookmark) => {
        if (!bookmark) return;
        set((state) => ({ byCourse: { ...state.byCourse, [courseId]: bookmark } }));
      },
    }),
    {
      name: 'arborous:resume',
      storage: safeJSONStorage,
      partialize: (state) => ({ byCourse: state.byCourse }),
    },
  ),
);

/**
 * Whether opening a mode picks up at its bookmark without Continue being
 * pressed. Learn always does: its order is set by the lecture and the
 * student's progress, so the card they were on is where they want to be,
 * and leaving to check the Glossary or the slides (or a phone reloading the
 * app on the way back) used to restart the step (the owner, 2026-10-26).
 * Today does within the same day, when it is the same sitting; tomorrow's is
 * a new plan. The Practice modes reshuffle, so they start fresh unless
 * Continue is pressed. The bookmark must be for the same section and filters
 * (CardSession checks those).
 */
export function resumesOnOpen(mode: StudyMode, bookmark: Pick<Bookmark, 'updatedAt'>, now: number): boolean {
  if (mode === 'learn') return true;
  if (mode === 'today') return new Date(bookmark.updatedAt).toDateString() === new Date(now).toDateString();
  return false;
}

/**
 * Whether a bookmark still points at something in the course, so Continue is
 * offered only when it can land somewhere.
 *
 * A bookmark outlives the item it points at — the item can be edited away,
 * the section deleted. And a typed-recall card is scored, and bookmarked,
 * under an id the course file does not hold (lib/scored.ts): a bookmark saved
 * on one used to be judged unresolvable, so Continue never appeared for
 * Terms, and disappeared from Learn, Review and Today whenever the last card
 * seen was a term to type.
 */
export function bookmarkResolves(course: Course, bookmark: Bookmark): boolean {
  return course.sections.some(
    (s) =>
      (bookmark.sectionId === null || s.id === bookmark.sectionId) &&
      s.items.some((i) => i.id === bookmark.itemId || (i.type === 'definition' && recallId(i.id) === bookmark.itemId)),
  );
}
