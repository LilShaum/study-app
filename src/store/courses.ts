import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Course, StudyItem } from '@/schema/course';
import { parseCourseFile } from '@/schema/parseCourse';
import { slugifyCourseId } from '@/lib/slugify';
import { safeJSONStorage } from '@/lib/safeStorage';

interface CoursesState {
  courses: Record<string, Course>;

  /** Parses + validates a File, then stores it. Mirrors Store.save(). */
  importCourse: (file: File) => Promise<{ ok: true; id: string; course: Course } | { ok: false; error: string }>;
  /** Adds an already-validated course (used by import + legacy migration). */
  addCourse: (course: Course) => string;
  updateCourse: (id: string, course: Course) => void;
  removeCourse: (id: string) => void;

  /** Replaces one item in place (edit-in-browse). */
  updateItem: (courseId: string, sectionId: string, itemId: string, updated: StudyItem) => void;
  /**
   * Removes one item, returning it with the index it occupied so an undo can
   * put it back where it was rather than at the end of the section.
   */
  deleteItem: (courseId: string, sectionId: string, itemId: string) => { item: StudyItem; index: number } | null;
  /** Inserts an item (new item, or an undo restore), at the given index or the end. */
  insertItem: (courseId: string, sectionId: string, item: StudyItem, atIndex?: number) => void;

  /** Bulk-replace, used only by the one-time legacy-data migration. */
  _hydrateFromLegacy: (courses: Record<string, Course>) => void;
}

export const useCoursesStore = create<CoursesState>()(
  persist(
    (set, get) => ({
      courses: {},

      importCourse: async (file) => {
        const result = await parseCourseFile(file);
        if (!result.ok) return result;
        const id = get().addCourse(result.course);
        return { ok: true, id, course: result.course };
      },

      addCourse: (course) => {
        const baseId = slugifyCourseId(course);
        const existing = get().courses;

        // The id is derived from course_code||title and is lossy ("BIOL 200"
        // and "biol-200" both slug to "biol_200"), so two genuinely different
        // courses can collide and silently overwrite each other.
        //
        // Re-importing the SAME course (same title) should still overwrite —
        // that's how you update a regenerated course. A different title on the
        // same slug gets a suffixed id instead of destroying the first one.
        let id = baseId;
        const collision = existing[baseId];
        if (collision && collision.metadata.title !== course.metadata.title) {
          let n = 2;
          while (existing[`${baseId}_${n}`]) n++;
          id = `${baseId}_${n}`;
        }

        set((state) => ({ courses: { ...state.courses, [id]: course } }));
        return id;
      },

      updateCourse: (id, course) => {
        set((state) => ({ courses: { ...state.courses, [id]: course } }));
      },

      removeCourse: (id) => {
        set((state) => {
          const courses = { ...state.courses };
          delete courses[id];
          return { courses };
        });
      },

      updateItem: (courseId, sectionId, itemId, updated) => {
        set((state) => {
          const course = state.courses[courseId];
          if (!course) return state;
          const sections = course.sections.map((s) =>
            s.id === sectionId
              ? { ...s, items: s.items.map((it) => (it.id === itemId ? updated : it)) }
              : s,
          );
          return { courses: { ...state.courses, [courseId]: { ...course, sections } } };
        });
      },

      deleteItem: (courseId, sectionId, itemId) => {
        let removed: { item: StudyItem; index: number } | null = null;
        set((state) => {
          const course = state.courses[courseId];
          if (!course) return state;
          const sections = course.sections.map((s) => {
            if (s.id !== sectionId) return s;
            const idx = s.items.findIndex((it) => it.id === itemId);
            if (idx === -1) return s;
            removed = { item: s.items[idx], index: idx };
            const items = s.items.slice();
            items.splice(idx, 1);
            return { ...s, items };
          });
          return { courses: { ...state.courses, [courseId]: { ...course, sections } } };
        });
        return removed;
      },

      insertItem: (courseId, sectionId, item, atIndex) => {
        set((state) => {
          const course = state.courses[courseId];
          if (!course) return state;
          const sections = course.sections.map((s) => {
            if (s.id !== sectionId) return s;
            const items = s.items.slice();
            items.splice(atIndex ?? items.length, 0, item);
            return { ...s, items };
          });
          return { courses: { ...state.courses, [courseId]: { ...course, sections } } };
        });
      },

      _hydrateFromLegacy: (courses) => {
        set((state) => ({ courses: { ...courses, ...state.courses } }));
      },
    }),
    {
      name: 'arborous:courses',
      storage: safeJSONStorage,
      partialize: (state) => ({ courses: state.courses }),
    },
  ),
);
