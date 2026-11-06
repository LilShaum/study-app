import type { Course, StudyItem } from '@/schema/course';
import { sortedSections } from './sortedSections';
import { someTextCoversTerm } from './termMatch';
import { multiKey } from './multiKey';

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
  /**
   * Figures the generator marked as content to know (`purpose: "know"`) that
   * no question ever asks about. A graphic is read, never scored, so marking
   * one `know` is a promise the lecture also tests it; this is the promise
   * unkept (docs/proposals/narration.md).
   */
  untestedFigures: string[];
  /** Sections carrying little or nothing that can actually be scored. */
  thinSections: SectionGap[];
  /** Item counts by type across the whole course. */
  byType: Record<string, number>;
  totalItems: number;
  gradableItems: number;
  /** Share of items that are MCQ or flashcard, 0-1. */
  gradableRatio: number;
}

/** An authored question: multiple choice of either sort, a flashcard or a problem. */
const isAsked = (i: StudyItem) => i.type === 'mcq' || i.type === 'multi' || i.type === 'flashcard' || i.type === 'problem';

/** A select-all question's true statements (none when its key is broken, lib/multiKey). */
const trueStatements = (item: Extract<StudyItem, { type: 'multi' }>): string[] =>
  [...(multiKey(item) ?? [])].map((i) => item.options[i] ?? '');

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
  // Its true statements are what it asks the student to know.
  if (item.type === 'multi') return [item.question, ...trueStatements(item)].join(' ');
  if (item.type === 'flashcard') return [item.front, item.back].join(' ');
  if (item.type === 'problem') return item.question;
  return '';
}

function gradableText(item: StudyItem): string {
  if (item.type === 'mcq' || item.type === 'multi') {
    return [item.question, ...(item.options ?? []), item.explanation ?? ''].join(' ');
  }
  if (item.type === 'flashcard') {
    return [item.front, item.back, item.hint ?? ''].join(' ');
  }
  if (item.type === 'problem') return [item.question, ...(item.steps ?? [])].join(' ');
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

  const gradable = items.filter(isAsked);
  const gradableTexts = gradable.map(gradableText);

  // Never tested: no question names it by any of its names (so a section's
  // "Km" counts for "Michaelis constant (Km)", as for the key terms below).
  const untested = items
    .filter((i): i is Extract<StudyItem, { type: 'definition' }> => i.type === 'definition')
    .filter((d) => !namesOf(d).some((name) => someTextCoversTerm(gradableTexts, name)));
  const untestedTerms = untested.map((d) => d.term);

  // Key: named in a stated objective or a section title, by any of its
  // names ("Michaelis constant (Km)" is key in a section called "… and Km").
  // Asked: in a question's own words or its answer, not in a distractor or
  // an explanation that only mentions it on the way to something else.
  const keyTexts = [...(course.metadata.inventory?.objectives ?? []), ...sections.map((s) => s.title)];
  const askedTexts = gradable.map(askedText);
  const thinKeyTerms = items
    .filter((i): i is Extract<StudyItem, { type: 'definition' }> => i.type === 'definition' && !i.set_aside)
    .filter((d) => d.term && namesOf(d).some((name) => someTextCoversTerm(keyTexts, name)))
    // At most one question asks it (none, when it is only mentioned on the
    // way to something else); one no question even mentions is listed as
    // untested instead, never in both.
    .filter((d) => !untested.includes(d))
    .filter((d) => askedTexts.filter((t) => namesOf(d).some((name) => someTextCoversTerm([t], name))).length <= 1)
    .map((d) => d.term);

  /*
   * A figure marked "to know" that nothing asks about.
   *
   * Reported only where the answer is clear, because these names are handed
   * to an AI as work to do and over-reporting is not harmless (see above).
   * Tags are the reliable handle: the generator is asked to reuse one
   * spelling across a lecture, so a figure's tag appearing on no question is
   * a real signal with no token matching to go wrong. A figure without tags
   * is judged on its title, and only when the title is short enough to be
   * matched honestly — "Rod" can be looked for in a question, "Visual field
   * reception has some redundancy" cannot.
   */
  const TITLE_TOKENS = 4;
  const untestedFigures = sections
    .flatMap((s) => s.items.map((item) => ({ item, section: s })))
    .filter((x): x is { item: Extract<StudyItem, { type: 'graphic' }>; section: (typeof sections)[number] } => x.item.type === 'graphic' && !x.item.set_aside)
    .filter(({ item: g }) => g.purpose === 'know')
    .filter(({ item: g, section }) => {
      const tags = (g.tags ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean);
      if (tags.length) {
        // Its own section's questions only: a topic tag every item carries
        // would otherwise mark every figure in the lecture as asked about.
        const near = section.items.filter((q) => q.type === 'mcq' || q.type === 'flashcard' || q.type === 'problem' || q.type === 'multi');
        const onQuestions = new Set(near.flatMap((q) => (q.tags ?? []).map((t) => t.trim().toLowerCase())));
        return !tags.some((t) => onQuestions.has(t));
      }
      const title = (g.title ?? '').trim();
      if (!title || title.split(/\s+/).length > TITLE_TOKENS) return false;
      return !someTextCoversTerm(gradableTexts, title);
    })
    .map(({ item: g }) => g.title)
    .filter(Boolean);

  const thinSections = sections
    .map((s) => ({
      id: s.id,
      title: s.title,
      total: s.items.length,
      gradable: s.items.filter(isAsked).length,
    }))
    // A section is thin when it can barely be practised: nothing scorable at
    // all, or fewer than a third of its items scorable.
    .filter((s) => s.total > 0 && (s.gradable === 0 || s.gradable / s.total < 1 / 3));

  return {
    untestedTerms,
    thinKeyTerms,
    untestedFigures,
    thinSections,
    byType,
    totalItems: items.length,
    gradableItems: gradable.length,
    gradableRatio: items.length ? gradable.length / items.length : 0,
  };
}
