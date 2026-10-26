import type { Course, StudyItem } from '@/schema/course';
import { isWrittenExample, writtenFromExample } from './answerPoints';
import type { ItemResult } from '@/store/progress';
import { shuffle } from './shuffle';
import { sortedSections } from './sortedSections';
import { recallId, scoredEntries } from './scored';
import { CATCH_UP_HOURS, isDueFor, retrievability, reviewUrgency } from './memory';
import { acceptedForms, normalise } from './typedAnswer';
import { spaced, stepSection } from './learnSteps';
import { givesAway, restatesDefinition } from './contentChecks';
import { sectionsToLearn } from './nextToLearn';
import { cardSeconds, DEFAULT_MINUTES, splitSitting } from './today';
import type { ExamRule } from './exam';
import { AGAIN_KEY, AGAIN_SHARE } from '@/store/studyLog';

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
 * The first cards of a list that fit in `minutes`, at the seconds each takes
 * (measured on this device when there is enough, lib/today.ts). Always at
 * least one, so a short sitting still does something.
 *
 * A Review sitting is sized this way. It used to be a fixed 50 cards, which
 * was an hour of MCQs or ten minutes of flashcards; now it is the student's
 * own time a day, most urgent first, and the end of a sitting offers more.
 */
/** However long the minutes, a sitting past this many cards is one nobody finishes; the end offers more. */
export const REVIEW_MAX = 200;

export function fitMinutes<T extends { type: string }>(list: T[], minutes: number, pace?: Record<string, number>): T[] {
  const out: T[] = [];
  let spent = 0;
  for (const item of list) {
    const s = cardSeconds(item, pace);
    // The small allowance keeps float rounding from dropping a card that fits.
    if (out.length && spent + s > minutes * 60 + 1e-6) break;
    out.push(item);
    spent += s;
  }
  return out;
}

type DefinitionItem = Extract<StudyItem, { type: 'definition' }>;
type FlashcardItem = Extract<StudyItem, { type: 'flashcard' }>;

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

/**
 * Learn's reading card for a flashcard not yet answered: the front and the
 * back shown together, to read, before the flashcard itself is asked a few
 * cards later. A friend found Learn asking for facts it had never shown;
 * the reading cards were one-line definitions and the flashcards asked for
 * what was only in the notes. Session-only, never scored, like RecallItem.
 */
export interface PreviewItem {
  id: string;
  type: 'preview';
  source_excerpt?: string;
  difficulty?: FlashcardItem['difficulty'];
  tags?: string[];
  target: FlashcardItem;
}

/**
 * Learn's first card in a section whose place in the student's own slides is
 * known (Section.source_range): read those slides, then either be asked
 * first, with the answers after, or be taught here as usual
 * (components/items/SlidesCard). Session-only, never scored.
 */
export interface SlidesItem {
  id: string;
  type: 'slides';
  /** "slides 12–18", as the course gives it. */
  range: string;
}

export type AnyItem = StudyItem | RecallItem | PreviewItem | SlidesItem;

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
  /**
   * Learn's second look at a section (lib/learnSteps): cards held back from
   * the first meeting, a repeat that could not be spaced or one card too
   * many on one term. Asked at the start of the next sitting, never in the
   * sitting that teaches the rest of the section.
   */
  _second?: boolean;
  /**
   * A class's Practice with the lectures mixed (lib/mixLectures): the
   * lecture this card is from, where its answer, its time and anything done
   * to it are recorded. Absent everywhere else: the session's own lecture.
   */
  _courseId?: string;
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
  /** Restrict the session to these cards (the Practice page's studies, lib/studies.ts). */
  onlyIds?: ReadonlySet<string>;
  /** Per-item history. 'weakest' and 'review' rank by it; 'definitions' and 'review' pair confused terms from it. */
  progress?: Record<string, ItemResult>;
  /** The time to judge "due" at. 'review' only; defaults to the clock. */
  now?: number;
  /** How the exam steers Review (lib/exam.ts). 'review' and 'today'. */
  exam?: ExamRule;
  /** Minutes the student has today. 'today' only. */
  minutes?: number;
  /** Measured seconds per card type (store/studyLog). 'today' only. */
  pace?: Record<string, number>;
  /**
   * Keep only one kind of card: questions, flashcards or terms. 'review',
   * 'weakest' and 'missed' only; the other modes are already one kind or the
   * whole lecture.
   */
  kind?: CardKind;
  /**
   * Learn and Today's new material: no reading cards (definitions, and
   * flashcards shown open), so each card is asked before it is shown
   * (store/learn.ts).
   */
  questionsFirst?: boolean;
}

export type CardKind = 'questions' | 'flashcards' | 'terms';

/** The file item type each kind keeps (a term is a definition until a mode asks for it). */
const KIND_TYPE: Record<CardKind, StudyItem['type']> = {
  questions: 'mcq',
  flashcards: 'flashcard',
  terms: 'definition',
};

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
function learnOrder(
  items: SessionItem[],
  progress?: Record<string, ItemResult>,
  /** Section id to where it is in the student's slides (Section.source_range). */
  ranges?: ReadonlyMap<string, string>,
  /** Questions first (store/learn.ts): no reading cards, and no slides card to ask for it. */
  questionsFirst = false,
): SessionItem[] {
  // Grouped by section first: the sections are already in authored order,
  // and ordering across a boundary would put the whole course's terms first.
  const groups = new Map<string, SessionItem[]>();
  for (const item of items) {
    const group = groups.get(item._sectionId);
    if (group) group.push(item);
    else groups.set(item._sectionId, [item]);
  }
  return [...groups.values()].flatMap((group) => {
    const all = stepSection(group, progress);
    // The steps are cut with the reading in, so a step still holds the
    // terms it would have taught; only the cards that give answers go.
    const steps = questionsFirst ? all.filter((i) => i.type !== 'definition' && i.type !== 'preview') : all;
    if (questionsFirst) return steps;
    const range = ranges?.get(group[0]._sectionId);
    const first = steps[0];
    // A section that says where it is in the slides opens with that, as part
    // of its first step: once the step is done, the card goes with it.
    if (!range || !first || first._step !== 0) return steps;
    const slides: SessionItem = {
      id: `${first._sectionId}~slides`,
      type: 'slides',
      range,
      _sectionTitle: first._sectionTitle,
      _sectionId: first._sectionId,
      _sectionOrder: first._sectionOrder,
      _step: 0,
      _steps: first._steps,
      _block: first._block,
    };
    return [slides, ...steps];
  });
}

/**
 * How well the student knows one item right now, 0-1: the memory model's
 * recall estimate (lib/memory.ts), the same one Review runs on. Lifetime
 * accuracy, which this used to be, never forgets: a term got right five
 * times a month ago ranked as known, however faded it was.
 *
 * Never-attempted items score 0.5 deliberately: an item you have never seen
 * is a bigger risk than one you are likely to recall, and a smaller one than
 * an item you have mostly forgotten. Sorting them into the middle is the
 * honest ranking, and it also means this mode is never empty on a fresh
 * course.
 */
function recallOf(item: SessionItem, now: number, progress?: Record<string, ItemResult>): number {
  return retrievability(progress?.[item.id], now) ?? 0.5;
}

/**
 * Gradable items, worst-known first.
 *
 * Distinct from Review Missed, which holds only what the latest answer got
 * wrong, and from Review, which holds only what has faded past its point:
 * this is everything, faintest first.
 */
function weakestFirst(items: SessionItem[], now: number, progress?: Record<string, ItemResult>): SessionItem[] {
  return items
    .filter(isGradable)
    .map((item, i) => ({ item, i, acc: recallOf(item, now, progress) }))
    .sort((a, b) => {
      if (a.acc !== b.acc) return a.acc - b.acc;
      const ra = progress?.[a.item.id];
      const rb = progress?.[b.item.id];
      // Same recall: the one you've got wrong more times is the weaker.
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
 * A section's second look (SessionItem._second) is left out of a sitting
 * that also teaches the rest of that section, and for CATCH_UP_HOURS after
 * the section was last studied: those cards were held back so they come a
 * sitting later, not minutes later when Learn is pressed again. After that,
 * the next Learn or Today opens with them.
 */
function withoutSecondLook(list: SessionItem[], recent: (sectionId: string) => boolean): SessionItem[] {
  const teaching = new Set(list.filter((i) => !i._second).map((i) => i._sectionId));
  return list.filter((i) => !i._second || !(teaching.has(i._sectionId) || recent(i._sectionId)));
}

/**
 * Flattens a course's sections into one item list for a study mode,
 * porting Session._buildList from the vanilla app 1:1 (including the
 * per-mode filtering/shuffling rules).
 */
export function buildSessionItems(
  course: Course,
  mode: StudyMode,
  { missedIds, sectionId, onlyIds, progress, now = Date.now(), exam, minutes = DEFAULT_MINUTES, pace, kind, questionsFirst }: SessionOptions = {},
): SessionItem[] {
  const sections = sectionId
    ? sortedSections(course).filter((s) => s.id === sectionId)
    : sortedSections(course);

  let items: SessionItem[] = sections.flatMap((section) =>
    // Set aside by the student (schema: set_aside): out of every session.
    // Browse renders from the file and shows them with Put back.
    section.items.filter((item) => (mode === 'browse' || !item.set_aside) && (!onlyIds || onlyIds.has(item.id))).map((item) => ({
      // A long answer laid out as an example is asked, not shown (lib/answerPoints).
      ...(mode !== 'browse' && isWrittenExample(item) ? writtenFromExample(item) : item),
      _sectionTitle: section.title,
      _sectionId: section.id,
      _sectionOrder: section.order ?? 0,
    })),
  );

  // Before the mode turns definitions into typed recall, and right-answered
  // questions into typed questions, so each kind keeps what it was.
  if (kind && (mode === 'review' || mode === 'weakest' || mode === 'missed')) {
    items = items.filter((i) => i.type === KIND_TYPE[kind]);
  }

  const ranges = new Map(course.sections.filter((s) => s.source_range?.trim()).map((s) => [s.id, s.source_range!.trim()]));

  // The pool is the WHOLE course's definitions even when the session is one
  // section: a term confused with one from another section is still a
  // confusion. Built from the course's own objects, so the grader's cache of
  // accepted forms survives from one question to the next.
  const pool: DefinitionItem[] = course.sections.flatMap((s) =>
    s.items.filter((i): i is DefinitionItem => i.type === 'definition'),
  );
  const originals = new Map(pool.map((d) => [d.id, d]));
  // A definition that spells out its own term ("pressure in the root that
  // pushes water up" for root pressure) is still read, but
  // never asked as "name the term": the card would answer itself
  // (lib/contentChecks; scored.ts leaves it out of every count the same way).
  const recallFor = (item: SessionItem): SessionItem | null =>
    item.type === 'definition' && !givesAway(item.term, item.definition) ? toRecall(item, pool, originals.get(item.id) ?? item) : null;
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
    // Typed, a stem that spells out its answer answers itself, and one that
    // is the term's own definition is that term's typed card again: both
    // stay multiple choice (lib/contentChecks).
    if (givesAway(answer, item.question) || restatesDefinition(item.question, target.definition)) return null;
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

  /** Studied in the last few hours: a section's second look waits (see withoutSecondLook). */
  const lastStudied = new Map<string, number>();
  for (const section of course.sections)
    for (const { id } of scoredEntries(section.items)) {
      const at = progress?.[id]?.lastSeen;
      if (at != null && at > (lastStudied.get(section.id) ?? 0)) lastStudied.set(section.id, at);
    }
  const recent = (sectionId: string) => now - (lastStudied.get(sectionId) ?? -Infinity) < CATCH_UP_HOURS * 3_600_000;

  /**
   * A step's new material only: the cards never answered, and the reading
   * for terms not yet asked. Anything answered belongs to Review, on its own
   * schedule. A step was served whole while any card in it was unanswered,
   * so a sitting's new material repeated the typed terms its review had just
   * asked (the owner: 12 of 12 on feedback loops, then "new" material that
   * asked negative feedback again, 2026-10-13). Empty when nothing is new.
   */
  const seen = (id: string) => {
    const r = progress?.[id];
    return !!r && r.got + r.missed > 0;
  };
  const newOnly = (step: SessionItem[]): SessionItem[] => {
    if (!step.some((i) => isGradable(i) && !seen(i.id))) return [];
    return step.filter((i) => (isGradable(i) ? !seen(i.id) : i.type === 'definition' ? !seen(recallId(i.id)) : true));
  };

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
  // No cap on due cards per term (tried 2026-10-13): holding a due card back
  // a day lets it fade past its point, and cost a 20-minute student 3 to 5
  // points in the simulator (sim/FINDINGS.md). A card is asked when it is due.

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
    case 'learn': {
      // Read the definition, then recall it a few cards later in its step.
      const all = learnOrder(withRecall(items), progress, ranges, questionsFirst);
      // Pick up where you stopped, as Today does: a step whose every question
      // has been answered is done, and Review brings it back when it fades.
      // Once every step is done, Learn is the whole thing again.
      const done = new Set<string>();
      const blocks = new Map<string, SessionItem[]>();
      for (const i of all) {
        const list = blocks.get(i._block!);
        if (list) list.push(i);
        else blocks.set(i._block!, [i]);
      }
      // A step with nothing to ask (every term in it spells itself out, see
      // recallFor) was read on the way to the step after it, and is done
      // when that one is. Walked from the end so a run of them follows.
      const order = [...blocks.entries()].reverse();
      order.forEach(([block, list], k) => {
        const asks = list.filter(isGradable);
        const next = order[k - 1];
        if (asks.length ? asks.every((i) => { const r = progress?.[i.id]; return !!r && r.got + r.missed > 0; }) : !!next && done.has(next[0])) done.add(block);
      });
      const byBlock = new Map<string, SessionItem[]>();
      for (const i of withoutSecondLook(all.filter((x) => !done.has(x._block!)), recent)) byBlock.set(i._block!, [...(byBlock.get(i._block!) ?? []), i]);
      const left = [...byBlock.values()].flatMap(newOnly);
      // Learn on one section with little left in it (only its second look,
      // or a couple of cards) carries on into the next section to learn, in the
      // same sitting: it used to ask two cards and stop (fresh-eyes review,
      // 2026-10-13). With nothing after it, the section is the whole thing again.
      let next: SessionItem[] = [];
      // Only while the section still has unanswered cards (held back, or a
      // few): a section chosen when it is all done is studied again whole.
      const unfinished = all.some((i) => isGradable(i) && !seen(i.id));
      if (sectionId && unfinished && (left.every((i) => i._second) || left.filter(isGradable).length < 3)) {
        // Forward only: the sections Learn takes after this one.
        const order = sectionsToLearn(course, progress ?? {}, now);
        const at = order.findIndex(({ section }) => section.id === sectionId);
        for (const { section } of order.slice(at + 1)) {
          const more = buildSessionItems(course, 'learn', { progress, now, exam, questionsFirst, sectionId: section.id });
          if (more.some((i) => isGradable(i) && !seen(i.id))) {
            next = more;
            break;
          }
        }
      }
      items = next.length ? [...left, ...next] : left.length ? left : all;
      break;
    }
    case 'weakest':
      items = weakestFirst(asTyped(asRecall(items)), now, progress);
      break;
    case 'review':
      // Unlimited minutes is how the finish screen counts everything due.
      items = spaced(fitMinutes(dueFirst(items), minutes, pace).slice(0, Number.isFinite(minutes) ? REVIEW_MAX : undefined));
      // A mixed-up partner is a typed term: not in a session kept to questions or flashcards.
      if (!kind || kind === 'terms') items = pairConfusions(items);
      break;
    case 'today': {
      // Nothing left of the day's time and nothing to catch up on (lib/today.ts, minutesLeft).
      if (minutes <= 0) {
        items = [];
        break;
      }
      // One sitting sized to the student's minutes: what is due, for Review's
      // share of the time, then Learn's steps for the rest (lib/today.ts).
      const due = dueFirst(items);
      const plan = splitSitting(course, progress ?? {}, now, minutes, undefined, undefined, due.reduce((n, i) => n + cardSeconds(i, pace), 0));
      const review = plan.reviewMinutes > 0 ? spaced(fitMinutes(due, plan.reviewMinutes, pace)) : [];
      const learn: SessionItem[] = [];
      let learnSpent = 0;
      // Time ran out at a step that would not fit. Stop there: going on to a
      // later section whose step is smaller would teach it out of order,
      // while the one Learn left off in stays unfinished.
      let full = false;
      for (const { section } of sectionsToLearn(course, progress ?? {}, now)) {
        if (full) break;
        const steps = learnOrder(withRecall(items.filter((i) => i._sectionId === section.id)), progress, ranges, questionsFirst);
        for (let s = 0; s < (steps[0]?._steps ?? 0); s++) {
          const step = steps.filter((i) => i._step === s);
          // Carry on where Learn left off: a step whose every question has
          // been answered is done, and Review brings it back when it fades.
          const fresh = newOnly(step);
          if (!fresh.length) continue;
          // The second look waits for the next sitting when this one has
          // already taught the section (see withoutSecondLook).
          if (fresh[0]._second && (recent(section.id) || learn.some((i) => i._sectionId === section.id && !i._second))) continue;
          // A missed first try comes back in its step: new material costs
          // its cards and the expected re-asks (store/studyLog, AGAIN_KEY).
          // Questions first asks before it shows, so far more first tries miss.
          const again = Math.max(pace?.[AGAIN_KEY] ?? AGAIN_SHARE, questionsFirst ? 0.6 : 0);
          const cost = fresh.reduce((n, i) => n + cardSeconds(i, pace) * (isGradable(i) ? 1 + again : 1), 0);
          // Whole steps only, so the sitting ends where a step does; the
          // first one always fits, or a short sitting would teach nothing.
          if ((learn.length || review.length) && learnSpent + cost > plan.learnMinutes * 60) {
            full = true;
            break;
          }
          learn.push(...fresh);
          learnSpent += cost;
        }
        if (learnSpent >= plan.learnMinutes * 60) break;
      }
      // A mixed-up partner brought in beside a due card is part of the review
      // too, whether or not it was due itself.
      items = [...pairConfusions(review).map((i) => ({ ...i, _block: 'review' })), ...learn];
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
