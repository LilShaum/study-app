import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Course } from '@/schema/course';
import { parseCourseFile } from '@/schema/parseCourse';
import { slugifyCourseId } from '@/lib/slugify';

interface CoursesState {
  courses: Record<string, Course>;

  /** Parses + validates a File, then stores it. Mirrors Store.save(). */
  importCourse: (file: File) => Promise<{ ok: true; id: string; course: Course } | { ok: false; error: string }>;
  /** Adds an already-validated course (used by import + legacy migration). */
  addCourse: (course: Course) => string;
  updateCourse: (id: string, course: Course) => void;
  removeCourse: (id: string) => void;

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
        const id = slugifyCourseId(course);
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

      _hydrateFromLegacy: (courses) => {
        set((state) => ({ courses: { ...courses, ...state.courses } }));
      },
    }),
    {
      name: 'arborous:courses',
      partialize: (state) => ({ courses: state.courses }),
    },
  ),
);
