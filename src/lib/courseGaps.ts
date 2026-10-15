import type { Course, StudyItem } from '@/schema/course';
import { sortedSections } from './sortedSections';
import { someTextCoversTerm } from './termMatch';

export interface SectionGap {
  id: string;
  title: string;
  total: number;
  gradable: number;
}

export interface CourseGaps {
  /** Terms that have a definition but are never named by an MCQ or flashcard. */
  untestedTerms: string[];
  /**
   * Key terms (named in a stated objective or a section's title) that only
   * one MCQ or flashcard uses: asked from one side, so they can be memorised
   * as that one card rather than understood.
   */
  thinKeyTerms: string[];
  /** Sections carrying little or nothing that can actually be scored. */
  thinSections: SectionGap[];
  /** Item counts by type across the whole course. */
  byType: Record<string, number>;
  totalItems: number;
  gradableItems: number;
  /** Share of items that are MCQ or flashcard, 0-1. */
  gradableRatio: number;
}

/** The text a gradable item puts in front of the student. */
/** A defined term's names: as written, without its bracket, the bracket alone, and the source's other names. */
function namesOf(d: Extract<StudyItem, { type: 'definition' }>): string[] {
  const term = d.term ?? '';
  const bracket = term.match(/\(([^)]+)\)/)?.[1]?.trim();
  const bare = term.replace(/\([^)]*\)/g, ' ').trim();
  return [term, bare, bracket ?? '', ...(d.also_known_as ?? [])].filter((n) => n && n.length >= 2);
}

/** What a question asks about: its own words and its answer. */
function askedText(item: StudyItem): string {
  if (item.type === 'mcq') return [item.question, item.options?.[item.correct_index] ?? ''].join(' ');
  if (item.type === 'flashcard') return [item.front, item.back].join(' ');
  return '';
}

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
 * Only `mcq` and `flashcard` items ask a student to USE what they learned. A
 * definition is scored too, but only as its name (Terms mode shows the
 * meaning, the student types the term), and examples and diagrams are read,
 * never tested. So the sharpest signal is a term the course defines but no
 * question ever uses: the student can name it and has never had to apply it.
 * That is why this counts authored questions only, not the app's recall ones.
 *
 * Matching is per-item and token-based (see termMatch). Whole-phrase matching
 * was wrong in the common case: this generator titles definitions "Michaelis
 * constant (Km)" and asks about them as "Km", so every term carrying a
 * parenthetical was reported as never tested — in one real course, 13 of them,
 * including Km itself in a section with eight questions about it. Over-
 * reporting here is not harmless: these names are handed to an AI as work to
 * do.
 */
export function analyseCourseGaps(course: Course): CourseGaps {
  const sections = sortedSections(course);
  const items = sections.flatMap((s) => s.items);

  const byType: Record<string, number> = {};
  for (const item of items) byType[item.type] = (byType[item.type] ?? 0) + 1;

  const gradable = items.filter((i) => i.type === 'mcq' || i.type === 'flashcard');
  const gradableTexts = gradable.map(gradableText);

  const untestedTerms = items
    .filter((i): i is Extract<StudyItem, { type: 'definition' }> => i.type === 'definition')
    .map((d) => d.term)
    .filter((term) => !someTextCoversTerm(gradableTexts, term ?? ''));

  // Key: named in a stated objective or a section title, by any of its
  // names ("Michaelis constant (Km)" is key in a section called "… and Km").
  // Asked: in a question's own words or its answer, not in a distractor or
  // an explanation that only mentions it on the way to something else.
  const keyTexts = [...(course.metadata.inventory?.objectives ?? []), ...sections.map((s) => s.title)];
  const askedTexts = gradable.map(askedText);
  const thinKeyTerms = items
    .filter((i): i is Extract<StudyItem, { type: 'definition' }> => i.type === 'definition' && !i.set_aside)
    .filter((d) => d.term && namesOf(d).some((name) => someTextCoversTerm(keyTexts, name)))
    .filter((d) => askedTexts.filter((t) => namesOf(d).some((name) => someTextCoversTerm([t], name))).length === 1)
    .map((d) => d.term);

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
    thinKeyTerms,
    thinSections,
    byType,
    totalItems: items.length,
    gradableItems: gradable.length,
    gradableRatio: items.length ? gradable.length / items.length : 0,
  };
}
