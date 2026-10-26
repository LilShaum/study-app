import { useMemo } from 'react';
import type { DefinitionItem } from '@/schema/course';
import { useCoursesStore } from '@/store/courses';

/** Every definition of a lecture, for its terms to be looked up by name. */
export function useGlossary(courseId: string | undefined): readonly DefinitionItem[] {
  const course = useCoursesStore((s) => (courseId ? s.courses[courseId] : undefined));
  return useMemo(
    () => (course ? course.sections.flatMap((s) => s.items.filter((i): i is DefinitionItem => i.type === 'definition')) : []),
    [course],
  );
}
