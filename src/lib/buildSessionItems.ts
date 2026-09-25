import type { Course, StudyItem } from '@/schema/course';
import type { ItemResult } from '@/store/progress';
import { shuffle } from './shuffle';
import { sortedSections } from './sortedSections';
import { recallId } from './scored';

export const STUDY_MODES = [
  'browse',
  'learn',
  'quiz',
  'flashcards',
  'definitions',
  'mixed',
  'weakest',
  'missed',
] as const;
export type StudyMode = (typeof STUDY_MODES)[number];

type DefinitionItem = Extract<StudyItem, { type: 'definition' }>;

export { recallId } from './scored';

/**
 * A question the APP writes, from a definition the generator wrote: here is
 * the meaning, type the term.
 *
 * It exists because definitions were half of a generated course and none of
 * them could be scored — read, never retrieved. And recall is the stronger
 * kind of practice: the testing-effect meta-analysis in docs/evidence.md
 * finds recall tests beat recognition tests, and every other gradable item in
 * the app is either multiple choice or a self-graded flip.
 *
 * It lives only in a session and never in the course file, so it cannot leak
 * into an export or fail an import — and asks nothing more of the generator.
 * It carries the ORIGINAL definition object and the course's whole list of
 * them, both by reference: the grader caches each term's accepted forms
 * against the object, and it needs every term in the course to tell a slipped
 * key from a confused term.
 */
export interface RecallItem {
  id: string;
  type: 'recall';
  source_excerpt?: string;
  difficulty?: DefinitionItem['difficulty'];
  tags?: string[];
  /** The definition this asks for. */
  target: DefinitionItem;
  /** Every definition in the course, shared by all recall items. */
  pool: readonly DefinitionItem[];
}

export type AnyItem = StudyItem | RecallItem;

// A discriminated union, so this must be an intersection (an `interface
// extends` can't add fields to a non-object union type).
export type SessionItem = AnyItem & {
  _sectionTitle: string;
  _sectionId: string;
  _sectionOrder: number;
};

function toRecall(item: SessionItem & DefinitionItem, pool: readonly DefinitionItem[], original: DefinitionItem): SessionItem {
  return {
    id: recallId(item.id),
    type: 'recall',
    source_excerpt: item.source_excerpt,
    difficulty: item.difficulty,
    tags: item.tags,
    target: original,
    pool,
    _sectionTitle: item._sectionTitle,
    _sectionId: item._sectionId,
    _sectionOrder: item._sectionOrder,
  };
}

export interface SessionOptions {
  /** Item ids the student has missed more often than got. Only 'missed' uses it. */
  missedIds?: ReadonlySet<string>;
  /** Restrict the session to one section. Undefined studies the whole course. */
  sectionId?: string;
  /** Per-item history. Only 'weakest' uses it. */
  progress?: Record<string, ItemResult>;
}

/**
 * Learn mode's three stages.
 *
 * The order is the point: a student meets a term, sees it used, recalls it
 * from a prompt, then applies it under exam conditions. Everything here is
 * built from items the generator already produced — no new content, no AI.
 */
export const LEARN_STAGES = [
  { key: 'learn', label: 'Learn', hint: 'Read the terms, examples and diagrams', types: ['definition', 'example', 'graphic'] },
  { key: 'recall', label: 'Recall', hint: 'Pull it back from memory', types: ['flashcard', 'recall'] },
  { key: 'apply', label: 'Apply', hint: 'Use it on exam-style questions', types: ['mcq'] },
] as const;

export type LearnStage = (typeof LEARN_STAGES)[number];

/** Which learn stage an item belongs to; -1 for a type no stage claims. */
export function learnStageIndex(type: AnyItem['type']): number {
  return LEARN_STAGES.findIndex((s) => (s.types as readonly string[]).includes(type));
}

// Definitions come before the examples and diagrams that use them, so the
// first thing a student meets in a section is the vocabulary for it. In the
// recall stage the typed terms come AFTER the flashcards, so there is a run of
// other questions between reading a definition and being asked for it —
// recalling it straight after reading it would test the last ten seconds.
const WITHIN_STAGE: Partial<Record<AnyItem['type'], number>> = {
  definition: 0,
  example: 1,
  graphic: 2,
  flashcard: 0,
  recall: 1,
};

const isGradable = (i: AnyItem) => i.type === 'mcq' || i.type === 'flashcard' || i.type === 'recall';

/**
 * Order a section's items as a taught sequence rather than a filter.
 *
 * Every other card mode answers "show me one type"; this one answers "teach
 * me this section", which is the question a student actually has. Sections
 * stay in their authored order, so studying the whole course in learn mode
 * walks it section by section instead of front-loading every definition in
 * the course before a single question.
 */
function learnOrder(items: SessionItem[]): SessionItem[] {
  // Grouped by section first, then ordered inside each group: the sections
  // are already in authored order, and sorting across a section boundary
  // would put every definition in the course ahead of every question.
  const groups = new Map<string, SessionItem[]>();
  for (const item of items) {
    const group = groups.get(item._sectionId);
    if (group) group.push(item);
    else groups.set(item._sectionId, [item]);
  }

  return [...groups.values()].flatMap((group) =>
    group
      .map((item, i) => ({ item, i }))
      .sort((a, b) => {
        const stageA = learnStageIndex(a.item.type);
        const stageB = learnStageIndex(b.item.type);
        if (stageA !== stageB) return stageA - stageB;
        const withinA = WITHIN_STAGE[a.item.type] ?? 0;
        const withinB = WITHIN_STAGE[b.item.type] ?? 0;
        if (withinA !== withinB) return withinA - withinB;
        return a.i - b.i;
      })
      .map((e) => e.item),
  );
}

/**
 * How well the student knows one item, as a 0-1 accuracy.
 *
 * Never-attempted items score 0.5 deliberately: an item you have never seen
 * is a bigger risk than one you have answered right three times, and a
 * smaller one than an item you keep getting wrong. Sorting them into the
 * middle is the honest ranking, and it also means this mode is never empty
 * on a fresh course.
 */
function accuracyOf(item: SessionItem, progress?: Record<string, ItemResult>): number {
  const r = progress?.[item.id];
  const attempts = r ? r.got + r.missed : 0;
  if (!attempts) return 0.5;
  return r!.got / attempts;
}

/**
 * Gradable items, worst-known first.
 *
 * Distinct from Review Missed, which is a binary filter (missed > got) and so
 * drops everything you are shaky-but-net-positive on — a 3/5 item disappears
 * from Review Missed entirely while still being the thing most likely to cost
 * you marks.
 */
function weakestFirst(items: SessionItem[], progress?: Record<string, ItemResult>): SessionItem[] {
  return items
    .filter(isGradable)
    .map((item, i) => ({ item, i, acc: accuracyOf(item, progress) }))
    .sort((a, b) => {
      if (a.acc !== b.acc) return a.acc - b.acc;
      const ra = progress?.[a.item.id];
      const rb = progress?.[b.item.id];
      // Same accuracy: the one you've got wrong more times is the weaker.
      const missedDiff = (rb?.missed ?? 0) - (ra?.missed ?? 0);
      if (missedDiff !== 0) return missedDiff;
      // Then the one you haven't seen in longest (never seen sorts first).
      const seenA = ra?.lastSeen ?? 0;
      const seenB = rb?.lastSeen ?? 0;
      if (seenA !== seenB) return seenA - seenB;
      return a.i - b.i;
    })
    .map((e) => e.item);
}

/**
 * Flattens a course's sections into one item list for a study mode,
 * porting Session._buildList from the vanilla app 1:1 (including the
 * per-mode filtering/shuffling rules).
 */
export function buildSessionItems(
  course: Course,
  mode: StudyMode,
  { missedIds, sectionId, progress }: SessionOptions = {},
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

  // The pool is the WHOLE course's definitions even when the session is one
  // section: a term confused with one from another section is still a
  // confusion. Built from the course's own objects, so the grader's cache of
  // accepted forms survives from one question to the next.
  const pool: DefinitionItem[] = course.sections.flatMap((s) =>
    s.items.filter((i): i is DefinitionItem => i.type === 'definition'),
  );
  const originals = new Map(pool.map((d) => [d.id, d]));
  const recallFor = (item: SessionItem): SessionItem | null =>
    item.type === 'definition' ? toRecall(item, pool, originals.get(item.id) ?? item) : null;
  /** Each definition followed by its recall question. */
  const withRecall = (list: SessionItem[]) =>
    list.flatMap((i) => {
      const r = recallFor(i);
      return r ? [i, r] : [i];
    });
  /** Each definition REPLACED by its recall question. */
  const asRecall = (list: SessionItem[]) => list.map((i) => recallFor(i) ?? i);

  switch (mode) {
    case 'quiz':
      items = items.filter((i) => i.type === 'mcq');
      break;
    case 'flashcards':
      items = items.filter((i) => i.type === 'flashcard');
      break;
    case 'definitions':
      // Terms: type the word from its meaning. Reading the glossary is what
      // Browse is for.
      items = asRecall(items.filter((i) => i.type === 'definition'));
      break;
    case 'mixed':
      // Practice, so a definition is asked for rather than shown.
      items = shuffle(asRecall(items));
      break;
    case 'learn':
      // Read the definition in the Learn stage, recall it in the Recall stage.
      items = learnOrder(withRecall(items));
      break;
    case 'weakest':
      items = weakestFirst(asRecall(items), progress);
      break;
    case 'missed':
      items = shuffle(asRecall(items).filter((i) => missedIds?.has(i.id)));
      break;
    case 'browse':
      // Browse renders straight from course.sections and only uses this
      // list for the "no items" empty-state check — left unfiltered.
      break;
  }

  return items;
}
