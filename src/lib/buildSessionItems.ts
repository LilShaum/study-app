import type { Course, StudyItem } from '@/schema/course';
import { shuffle } from './shuffle';
import { sortedSections } from './sortedSections';

export const STUDY_MODES = ['browse', 'quiz', 'flashcards', 'definitions', 'mixed', 'missed'] as const;
export type StudyMode = (typeof STUDY_MODES)[number];

// StudyItem is a discriminated union, so this must be an intersection
// (an `interface extends` can't add fields to a non-object union type).
export type SessionItem = StudyItem & {
  _sectionTitle: string;
  _sectionId: string;
  _sectionOrder: number;
};

/**
 * Flattens a course's sections into one item list for a study mode,
 * porting Session._buildList from the vanilla app 1:1 (including the
 * per-mode filtering/shuffling rules).
 */
export function buildSessionItems(
  course: Course,
  mode: StudyMode,
  missedIds?: ReadonlySet<string>,
  /** Restrict the session to one section. Undefined studies the whole course. */
  sectionId?: string,
): SessionItem[] {
  const sections = sectionId
    ? sortedSections(course).filter((s) => s.id === sectionId)
    : sortedSections(course);

  let items: SessionItem[] = sections.flatMap((section) =>
    section.items.map((item) => ({
      ...item,
      _sectionTitle: section.title,
      _sectionId: section.id,
      _sectionOrder: section.order ?? 0,
    })),
  );

  switch (mode) {
    case 'quiz':
      items = items.filter((i) => i.type === 'mcq');
      break;
    case 'flashcards':
      items = items.filter((i) => i.type === 'flashcard');
      break;
    case 'definitions':
      items = items.filter((i) => i.type === 'definition');
      break;
    case 'mixed':
      items = shuffle(items);
      break;
    case 'missed':
      items = shuffle(items.filter((i) => missedIds?.has(i.id)));
      break;
    case 'browse':
      // Browse renders straight from course.sections and only uses this
      // list for the "no items" empty-state check — left unfiltered.
      break;
  }

  return items;
}
