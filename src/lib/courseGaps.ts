import type { Course, StudyItem } from '@/schema/course';
import { sortedSections } from './sortedSections';

export interface SectionGap {
  id: string;
  title: string;
  total: number;
  gradable: number;
}

export interface CourseGaps {
  /** Terms that have a definition but are never named by an MCQ or flashcard. */
  untestedTerms: string[];
  /** Sections carrying little or nothing that can actually be scored. */
  thinSections: SectionGap[];
  /** Item counts by type across the whole course. */
  byType: Record<string, number>;
  totalItems: number;
  gradableItems: number;
  /** Share of items that are MCQ or flashcard, 0-1. */
  gradableRatio: number;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** The text a gradable item puts in front of the student. */
function gradableText(item: StudyItem): string {
  if (item.type === 'mcq') {
    return [item.question, ...(item.options ?? []), item.explanation ?? ''].join(' ');
  }
  if (item.type === 'flashcard') {
    return [item.front, item.back, item.hint ?? ''].join(' ');
  }
  return '';
}

/**
 * Works out where a course is weak, so a follow-up generation can be aimed at
 * the gaps instead of producing more of whatever it produced last time.
 *
 * Only `mcq` and `flashcard` items are scored by the app — definitions,
 * examples and diagrams are read, never tested. So the sharpest signal is a
 * term the course defines but never asks about: the student is shown it, then
 * never made to retrieve it, and it never counts toward their accuracy or
 * shows up in Review Missed.
 *
 * Matching is whole-phrase, not substring: " km " must appear as its own token
 * run, or a two-letter term would match half the course and the gap list would
 * silently come back empty.
 */
export function analyseCourseGaps(course: Course): CourseGaps {
  const sections = sortedSections(course);
  const items = sections.flatMap((s) => s.items);

  const byType: Record<string, number> = {};
  for (const item of items) byType[item.type] = (byType[item.type] ?? 0) + 1;

  const gradable = items.filter((i) => i.type === 'mcq' || i.type === 'flashcard');
  const haystack = ` ${norm(gradable.map(gradableText).join(' '))} `;

  const untestedTerms = items
    .filter((i): i is Extract<StudyItem, { type: 'definition' }> => i.type === 'definition')
    .map((d) => d.term)
    .filter((term) => {
      const t = norm(term ?? '');
      return t.length > 1 && !haystack.includes(` ${t} `);
    });

  const thinSections = sections
    .map((s) => ({
      id: s.id,
      title: s.title,
      total: s.items.length,
      gradable: s.items.filter((i) => i.type === 'mcq' || i.type === 'flashcard').length,
    }))
    // A section is thin when it can barely be practised: nothing scorable at
    // all, or fewer than a third of its items scorable.
    .filter((s) => s.total > 0 && (s.gradable === 0 || s.gradable / s.total < 1 / 3));

  return {
    untestedTerms,
    thinSections,
    byType,
    totalItems: items.length,
    gradableItems: gradable.length,
    gradableRatio: items.length ? gradable.length / items.length : 0,
  };
}
