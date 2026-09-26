import type { Course, StudyItem } from '@/schema/course';
import type { ItemResult } from '@/store/progress';
import { shuffle } from './shuffle';
import { sortedSections } from './sortedSections';
import { recallId } from './scored';
import { isDueFor, reviewUrgency } from './memory';
import { acceptedForms, normalise } from './typedAnswer';
import { stepSection } from './learnSteps';
import { sectionsToLearn } from './nextToLearn';
import { cardSeconds, DEFAULT_MINUTES, splitSitting } from './today';
import type { ExamRule } from './exam';

export const STUDY_MODES = [
  'browse',
  'learn',
  'quiz',
  'flashcards',
  'definitions',
  'mixed',
  'weakest',
  'missed',
  'review',
  'today',
] as const;
export type StudyMode = (typeof STUDY_MODES)[number];

/**
 * The most a Review sitting holds. A student learning a 474-item course over
 * two weeks meets two hundred and more due in a day (simulated; see
 * lib/memory.ts), and a sitting that long is one nobody finishes. The most
 * urgent come first, and the end of a sitting offers the next.
 */
export const REVIEW_SITTING = 50;

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
  /**
   * Set when this asks a multiple-choice QUESTION with its options taken
   * away, rather than asking for a term by its definition: the question's
   * text, its right option as written, and its explanation. The id is then
   * the question's own, so it is scored as the same question.
   */
  question?: string;
  answer?: string;
  explanation?: string;
}

export type AnyItem = StudyItem | RecallItem;

// A discriminated union, so this must be an intersection (an `interface
// extends` can't add fields to a non-object union type).
export type SessionItem = AnyItem & {
  _sectionTitle: string;
  _sectionId: string;
  _sectionOrder: number;
  /** Learn only: which step of its section this is, of how many (see lib/learnSteps). */
  _step?: number;
  _steps?: number;
  /**
   * Learn only: the step this card sits in, as "section#step". A missed card
   * that comes back is placed a few cards on and takes the block of wherever
   * it lands, so a pause between steps falls where the steps change on
   * screen, not where the item came from.
   */
  _block?: string;
  /** How many times this card has come back after a miss in this sitting. */
  _again?: number;
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
  /** Per-item history. 'weakest' and 'review' rank by it; 'definitions' and 'review' pair confused terms from it. */
  progress?: Record<string, ItemResult>;
  /** The time to judge "due" at. 'review' only; defaults to the clock. */
  now?: number;
  /** How the exam steers Review (lib/exam.ts). 'review' and 'today'. */
  exam?: ExamRule;
  /** Minutes the student has today. 'today' only. */
  minutes?: number;
}

const isGradable = (i: AnyItem) => i.type === 'mcq' || i.type === 'flashcard' || i.type === 'recall';

/**
 * Order the items as a taught sequence rather than a filter.
 *
 * Every other card mode answers "show me one type"; this one answers "teach
 * me this section", which is the question a student actually has. Sections
 * stay in their authored order, and each is taught in steps of a few terms
 * (see lib/learnSteps), so studying the whole course walks it section by
 * section, a few terms at a time.
 */
function learnOrder(items: SessionItem[], progress?: Record<string, ItemResult>): SessionItem[] {
  // Grouped by section first: the sections are already in authored order,
  // and ordering across a boundary would put the whole course's terms first.
  const groups = new Map<string, SessionItem[]>();
  for (const item of items) {
    const group = groups.get(item._sectionId);
    if (group) group.push(item);
    else groups.set(item._sectionId, [item]);
  }
  return [...groups.values()].flatMap((group) => stepSection(group, progress));
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
  { missedIds, sectionId, progress, now = Date.now(), exam, minutes = DEFAULT_MINUTES }: SessionOptions = {},
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

  // Every definition in the course with its section, so a term can be asked
  // for next to the one it was mistaken for even when that one lives in
  // another section, or is not otherwise due.
  const placedDefs = new Map<string, SessionItem>();
  for (const section of course.sections) {
    for (const item of section.items) {
      if (item.type !== 'definition') continue;
      placedDefs.set(item.id, {
        ...item,
        _sectionTitle: section.title,
        _sectionId: section.id,
        _sectionOrder: section.order ?? 0,
      });
    }
  }
  /**
   * Put each term straight after the one it has been mistaken for.
   *
   * The interleaving meta-analysis in docs/evidence.md finds that setting
   * things side by side helps most when they are easy to confuse — and a
   * typed answer that named the wrong term is the most direct evidence there
   * is of that. So a pair the student actually mixed up comes back as a
   * pair, one after the other, until they stop mixing it up.
   */
  /*
   * A multiple-choice question, asked again without its options.
   *
   * Only once it has been answered right as multiple choice — recognising
   * the answer comes first, producing it is the step after, and the harder
   * retrieval is the one that sticks (docs/evidence.md). And only when its
   * right option is itself a term the course defines, so the grader knows
   * every name the answer goes by and which near misses are other terms.
   * Stems that lean on the options ("which of these…") cannot stand alone
   * and are left as they are.
   */
  const defByForm = new Map<string, DefinitionItem>();
  for (const d of pool) for (const f of acceptedForms(d)) if (!defByForm.has(f.norm)) defByForm.set(f.norm, d);
  const NEEDS_OPTIONS = /\b(of these|the following|which option|options?\b)/i;
  const typedFrom = (item: SessionItem): SessionItem | null => {
    if (item.type !== 'mcq' || !progress?.[item.id]?.got) return null;
    if (NEEDS_OPTIONS.test(item.question)) return null;
    const answer = item.options[item.correct_index];
    const target = answer ? defByForm.get(normalise(answer)) : undefined;
    if (!answer || !target) return null;
    return {
      id: item.id,
      type: 'recall',
      source_excerpt: item.source_excerpt,
      difficulty: item.difficulty,
      tags: item.tags,
      target,
      pool,
      question: item.question,
      answer,
      explanation: item.explanation,
      _sectionTitle: item._sectionTitle,
      _sectionId: item._sectionId,
      _sectionOrder: item._sectionOrder,
    };
  };
  const asTyped = (list: SessionItem[]) => list.map((i) => typedFrom(i) ?? i);

  const pairConfusions = (list: SessionItem[]): SessionItem[] => {
    const byId = new Map(list.map((i) => [i.id, i]));
    const placed = new Set<string>();
    const out: SessionItem[] = [];
    for (const item of list) {
      if (placed.has(item.id)) continue;
      out.push(item);
      placed.add(item.id);
      for (const defId of progress?.[item.id]?.confusedWith ?? []) {
        const rid = recallId(defId);
        if (placed.has(rid)) continue;
        const def = placedDefs.get(defId);
        const partner = byId.get(rid) ?? (def ? recallFor(def) : null);
        if (!partner) continue;
        out.push(partner);
        placed.add(rid);
      }
    }
    return out;
  };

  /**
   * What has been studied and is fading, faintest first — or, with an exam
   * date, what would be faintest on the day (see lib/memory.ts). Never-seen
   * items are not here: new material comes through Learn.
   */
  const dueFirst = (list: SessionItem[]) =>
    asTyped(asRecall(list))
      .filter(isGradable)
      .filter((i) => isDueFor(progress?.[i.id], now, exam?.forItem(i.id) ?? null))
      .map((item, i) => ({ item, i, u: reviewUrgency(progress?.[item.id], now, exam?.forItem(item.id) ?? null) }))
      .sort((a, b) => a.u - b.u || a.i - b.i)
      .map((e) => e.item);

  switch (mode) {
    case 'quiz':
      items = asTyped(items.filter((i) => i.type === 'mcq'));
      break;
    case 'flashcards':
      items = items.filter((i) => i.type === 'flashcard');
      break;
    case 'definitions':
      // Terms: type the word from its meaning. Reading the glossary is what
      // Browse is for.
      items = pairConfusions(asRecall(items.filter((i) => i.type === 'definition')));
      break;
    case 'mixed':
      // Practice, so a definition is asked for rather than shown.
      items = shuffle(asTyped(asRecall(items)));
      break;
    case 'learn':
      // Read the definition, then recall it a few cards later in its step.
      items = learnOrder(withRecall(items), progress);
      break;
    case 'weakest':
      items = weakestFirst(asTyped(asRecall(items)), progress);
      break;
    case 'review':
      items = pairConfusions(dueFirst(items).slice(0, REVIEW_SITTING));
      break;
    case 'today': {
      // One sitting sized to the student's minutes: what is due, for Review's
      // share of the time, then Learn's steps for the rest (lib/today.ts).
      const due = dueFirst(items);
      const plan = splitSitting(course, progress ?? {}, now, minutes, undefined, undefined, due.reduce((n, i) => n + cardSeconds(i), 0));
      const review: SessionItem[] = [];
      let spent = 0;
      for (const item of due) {
        if (review.length && spent + cardSeconds(item) > plan.reviewMinutes * 60) break;
        if (plan.reviewMinutes <= 0) break;
        review.push({ ...item, _block: 'review' });
        spent += cardSeconds(item);
      }
      const learn: SessionItem[] = [];
      let learnSpent = 0;
      for (const { section } of sectionsToLearn(course, progress ?? {}, now)) {
        const steps = learnOrder(withRecall(items.filter((i) => i._sectionId === section.id)), progress);
        for (let s = 0; s < (steps[0]?._steps ?? 0); s++) {
          const step = steps.filter((i) => i._step === s);
          // Carry on where Learn left off: a step whose every question has
          // been answered is done, and Review brings it back when it fades.
          const answered = (i: SessionItem) => {
            const r = progress?.[i.id];
            return !isGradable(i) || (!!r && r.got + r.missed > 0);
          };
          if (step.every(answered)) continue;
          const cost = step.reduce((n, i) => n + cardSeconds(i), 0);
          // Whole steps only, so the sitting ends where a step does; the
          // first one always fits, or a short sitting would teach nothing.
          if ((learn.length || review.length) && learnSpent + cost > plan.learnMinutes * 60) break;
          learn.push(...step);
          learnSpent += cost;
        }
        if (learnSpent >= plan.learnMinutes * 60) break;
      }
      items = [...pairConfusions(review), ...learn];
      break;
    }
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
