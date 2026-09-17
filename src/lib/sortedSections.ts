import type { Course, Section } from '@/schema/course';

/**
 * Sections in their intended order.
 *
 * `section.order` is part of the .study.json format and the app read it into
 * display metadata, but never actually sorted on it — so a course whose
 * sections were written out of sequence rendered in array order and silently
 * ignored the field. Stable within equal `order` values, so files that omit
 * it keep their authored order.
 */
export function sortedSections(course: Course): Section[] {
  return course.sections
    .map((section, index) => ({ section, index }))
    .sort((a, b) => (a.section.order ?? 0) - (b.section.order ?? 0) || a.index - b.index)
    .map(({ section }) => section);
}
