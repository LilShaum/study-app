import type { ItemResult } from '@/store/progress';
import type { AnyItem, SessionItem } from './buildSessionItems';
import { recallId } from './scored';
import { coversTokens, normaliseTerm, termTokens } from './termMatch';

/**
 * Learn, in steps.
 *
 * Learn used to serve a section as three blocks: every definition, then
 * every flashcard and typed term, then every question. Measured on a real
 * course, one section read as 37 definitions in a row before a single
 * question, and a term was asked for 50 to 60 cards after it was read. By
 * then the reading has been displaced by thirty-six other definitions, and
 * the recall tests which of them survived, not whether this one was learned.
 *
 * So a section is cut into steps of a few terms each, and each step teaches
 * its terms and then asks about them: read, recall, apply. A question joins
 * the step whose terms it uses, so it arrives once everything it needs has
 * been taught and not much later. Quizzing straight after teaching, with
 * the answer shown, is the classroom testing effect in docs/evidence.md
 * (Yang et al. 2021).
 */

/** Terms taught per step. Four keeps a step to roughly ten cards on a dense section. */
export const STEP_TERMS = 4;

/**
 * A term that turns up in more than this share of a section's other items is
 * the section's subject, not a step's. "Receptor" in a section on receptors
 * would otherwise pull every question into whichever step happened to
 * define it.
 */
const GENERIC_SHARE = 0.4;

export type LearnPhase = 'read' | 'recall' | 'apply';

export function phaseOf(type: AnyItem['type']): LearnPhase | null {
  if (type === 'definition' || type === 'example' || type === 'graphic') return 'read';
  if (type === 'flashcard' || type === 'recall') return 'recall';
  if (type === 'mcq') return 'apply';
  return null;
}

// Inside a step: the terms, then what uses them; the flashcards before the
// typed terms, so a few cards stand between reading a term and being asked
// for it; the questions last.
const ORDER: Record<AnyItem['type'], number> = {
  definition: 0,
  example: 1,
  graphic: 2,
  flashcard: 3,
  recall: 4,
  mcq: 5,
};

type Def = Extract<AnyItem, { type: 'definition' }>;

/** Every name a definition goes by, as token sets: "Michaelis constant (Km)" is also "Km". */
function namesOf(def: Def): Set<string>[] {
  const term = def.term ?? '';
  const inner = [...term.matchAll(/\(([^)]+)\)/g)].map((m) => m[1]);
  const outer = term.replace(/\([^)]*\)/g, ' ');
  return [term, outer, ...inner, ...(def.also_known_as ?? [])]
    // One letter is not a name anything can be matched on.
    .filter((n) => normaliseTerm(n).replace(/ /g, '').length >= 2)
    .map(termTokens)
    .filter((t) => t.size > 0);
}

/** The words an item puts in front of the student. */
function textOf(item: SessionItem): string {
  switch (item.type) {
    case 'mcq':
      return [item.question, item.options?.[item.correct_index] ?? '', item.explanation ?? ''].join(' ');
    case 'flashcard':
      return [item.front, item.back].join(' ');
    case 'example':
      return [item.title, item.context ?? '', ...(item.steps ?? []), item.takeaway ?? ''].join(' ');
    case 'graphic':
      return [item.title, item.caption ?? '', item.alt_text].join(' ');
    default:
      return '';
  }
}

/** Answered right before, and not more often wrong than right: no need to read it again first. */
function knows(def: Def, progress?: Record<string, ItemResult>): boolean {
  const r = progress?.[recallId(def.id)];
  return !!r && r.got > 0 && r.got >= r.missed;
}

/**
 * One section's items as a sequence of steps.
 *
 * Each item comes back carrying `_step`, `_steps` and `_block`, which the
 * session uses to say where you are and to pause between steps. A term you
 * have already answered right skips its reading card; it is still asked.
 */
export function stepSection(group: SessionItem[], progress?: Record<string, ItemResult>): SessionItem[] {
  const defs = group.filter((i): i is SessionItem & Def => i.type === 'definition');
  const others = group.filter((i) => i.type !== 'definition' && i.type !== 'recall');
  // A section with no terms is cut by count instead, about ten cards a step.
  const steps = defs.length
    ? Math.ceil(defs.length / STEP_TERMS)
    : Math.max(1, Math.ceil(others.length / (STEP_TERMS * 2.5)));
  const stepOfDef = new Map<string, number>();
  // Spread evenly, so 9 terms are 3+3+3 and not 4+4+1.
  defs.forEach((d, k) => stepOfDef.set(d.id, Math.floor((k * steps) / defs.length)));

  const texts = new Map(others.map((i) => [i, termTokens(textOf(i))]));
  const names = defs.map((d) => ({ step: stepOfDef.get(d.id)!, names: namesOf(d) }));
  const uses = (text: Set<string>, n: Set<string>[]) => n.some((t) => coversTokens(text, t));
  const generic = new Set(
    names.filter((d) => others.length > 4 && others.filter((o) => uses(texts.get(o)!, d.names)).length > others.length * GENERIC_SHARE),
  );

  const stepOf = new Map<SessionItem, number>();
  const unplaced: SessionItem[] = [];
  for (const item of others) {
    const text = texts.get(item)!;
    const hits = names.filter((d) => uses(text, d.names));
    const specific = hits.filter((d) => !generic.has(d));
    const pick = specific.length ? specific : hits;
    // The LAST step among the terms it uses: by then all of them are taught.
    if (pick.length) stepOf.set(item, Math.max(...pick.map((d) => d.step)));
    else unplaced.push(item);
  }
  // Items that name no term keep their place in the section: the k-th of a
  // type goes as far through the steps as it is through that type.
  for (const type of ['example', 'graphic', 'flashcard', 'mcq'] as const) {
    const ofType = unplaced.filter((i) => i.type === type);
    ofType.forEach((item, k) => stepOf.set(item, Math.floor((k * steps) / ofType.length)));
  }
  for (const item of group) {
    if (item.type === 'definition') stepOf.set(item, stepOfDef.get(item.id)!);
    if (item.type === 'recall') stepOf.set(item, stepOfDef.get(item.target.id) ?? 0);
  }

  const out: SessionItem[] = [];
  for (let s = 0; s < steps; s++) {
    const inStep = group
      .map((item, i) => ({ item, i }))
      .filter(({ item }) => stepOf.get(item) === s)
      .filter(({ item }) => !(item.type === 'definition' && knows(item, progress)))
      .sort((a, b) => ORDER[a.item.type] - ORDER[b.item.type] || a.i - b.i)
      .map(({ item }) => item);
    // Typed terms in a different order from the reading, half-way round, so
    // the first one asked is not the one read last.
    const recalls = inStep.filter((i) => i.type === 'recall');
    const half = Math.floor(recalls.length / 2);
    const turned = [...recalls.slice(half), ...recalls.slice(0, half)];
    let r = 0;
    for (const item of inStep) {
      const placed = item.type === 'recall' ? turned[r++] : item;
      out.push({ ...placed, _step: s, _steps: steps, _block: `${placed._sectionId}#${s}` });
    }
  }
  // A step can end up empty: every term known and nothing else placed in it.
  const used = [...new Set(out.map((i) => i._step))];
  if (used.length === steps) return out;
  return out.map((i) => ({ ...i, _step: used.indexOf(i._step!), _steps: used.length, _block: `${i._sectionId}#${used.indexOf(i._step!)}` }));
}
