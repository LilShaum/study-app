import type { Course, Section } from '@/schema/course';
import type { ItemResult } from '@/store/progress';
import { scoredEntries } from './scored';
import { sortedSections } from './sortedSections';

/**
 * The section Learn should teach next: the first, in course order, holding
 * anything scorable that has never been answered. Null once every section
 * has been worked through — then Learn falls back to the whole course.
 *
 * Learn used to start at item 1 of the whole course every time: one 722-item
 * walk, from the top, however much of it you had already done. A student
 * asks "what do I learn next", and this answers it.
 *
 * Sections with nothing scorable (all examples or diagrams) never hold Learn
 * up: there is nothing in them to mark as learned.
 */
export function nextSectionToLearn(
  course: Course,
  progress: Record<string, ItemResult>,
): { section: Section; index: number } | null {
  const sections = sortedSections(course);
  for (let index = 0; index < sections.length; index++) {
    const section = sections[index];
    const unanswered = scoredEntries(section.items).some(({ id }) => {
      const r = progress[id];
      return !r || r.got + r.missed === 0;
    });
    if (unanswered) return { section, index };
  }
  return null;
}
