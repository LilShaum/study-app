import type { ItemResult } from '@/store/progress';
import type { AnyItem, SessionItem } from './buildSessionItems';
import { previewId, recallId } from './scored';
import { answeredBy, type Asked } from './contentChecks';
import { coversTokens, normaliseTerm, termTokens } from './termMatch';
import { answerPoints } from './answerPoints';

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

/** Cards asked on one term at its first meeting, its typed name included; the rest wait a sitting. */
export const TERM_BUDGET = 3;

/**
 * A term that turns up in more than this share of a section's other items is
 * the section's subject, not a step's. "Receptor" in a section on receptors
 * would otherwise pull every question into whichever step happened to
 * define it.
 */
const GENERIC_SHARE = 0.4;

export type LearnPhase = 'read' | 'recall' | 'apply';

export function phaseOf(type: AnyItem['type']): LearnPhase | null {
  if (type === 'definition' || type === 'example' || type === 'graphic' || type === 'preview' || type === 'slides') return 'read';
  if (type === 'flashcard' || type === 'recall') return 'recall';
  if (type === 'mcq') return 'apply';
  return null;
}

// Inside a step: everything to read, then the asking in the order it was
// read, the questions last. First read, first asked puts every ask as far
// from its reading as the step allows: asked two cards after it was shown,
// the answer is still in mind and is repeated, not recalled. Delaying the
// first test is what helped long-term retention in Karpicke & Roediger
// (2007, docs/evidence.md).
const ORDER: Record<AnyItem['type'], number> = {
  slides: -1,
  definition: 0,
  example: 1,
  graphic: 2,
  preview: 3,
  recall: 4,
  flashcard: 5,
  mcq: 6,
};

type Def = Extract<AnyItem, { type: 'definition' }>;

/** Every name a definition goes by, as token sets: "Michaelis constant (Km)" is also "Km". */
function namesOf(def: Def): Set<string>[] {
  const term = def.term ?? '';
  const inner = [...term.matchAll(/\(([^)]+)\)/g)].map((m) => m[1]);
  const outer = term.replace(/\([^)]*\)/g, ' ');
  return (
    [term, outer, ...inner, ...(def.also_known_as ?? [])]
      // One letter is not a name anything can be matched on.
      .filter((n) => normaliseTerm(n).replace(/ /g, '').length >= 2)
      .map(termTokens)
      .filter((t) => t.size > 0)
  );
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

/**
 * Two excerpts are the same passage when most of the shorter one's words are
 * in the longer. Short words ("the", "and", "is") say nothing about a passage.
 */
const MIN_OVERLAP = 0.6;

function excerptWords(item: SessionItem): Set<string> {
  const excerpt = 'source_excerpt' in item ? item.source_excerpt : undefined;
  return new Set([...termTokens(excerpt ?? '')].filter((w) => w.length >= 4));
}

/**
 * A card practises a worked example when most of its own words are in the
 * example: the same quantities, the same method. Measured on five real
 * lectures, such pairs share 0.5 to 0.84 of the card's words; unrelated
 * cards of the same section, under 0.4.
 */
const PRACTISES = 0.5;

function contentWords(item: SessionItem): Set<string> {
  return new Set([...termTokens(textOf(item))].filter((w) => w.length >= 4));
}

/** Answered at least once: past its first meeting. */
const answeredBefore = (item: SessionItem, progress?: Record<string, ItemResult>): boolean => {
  const r = progress?.[item.id];
  return !!r && r.got + r.missed > 0;
};

/**
 * A short or long answer of several points to write (lib/answerPoints): the
 * synthesis a section builds to. A one-point written card (a calculation)
 * is not: it practises a method its worked example shows, and its outline
 * would be the worked answer before the method.
 */
const isWritten = (item: SessionItem): boolean => item.type === 'flashcard' && (answerPoints(item)?.points.length ?? 0) >= 2;

/**
 * Any card asked as "Write the answer", one point or several: the hardest
 * kind of ask, so it comes after the multiple choice on the same material,
 * as the more thorough test (the owner, 2026-10-26: "these long written
 * questions should usually come after multiple choice since they are
 * harder").
 */
const isWrittenCard = (item: SessionItem): boolean => item.type === 'flashcard' && !!answerPoints(item);

function overlap(a: Set<string>, b: Set<string>): number {
  const small = a.size <= b.size ? a : b;
  const large = small === a ? b : a;
  // Fewer than three words is too little to call two passages the same.
  if (small.size < 3) return 0;
  let shared = 0;
  for (const w of small) if (large.has(w)) shared++;
  return shared / small.size;
}

/** Answered right before, and not more often wrong than right: no need to read it again first. */
function knows(def: Def, progress?: Record<string, ItemResult>): boolean {
  const r = progress?.[recallId(def.id)];
  return !!r && r.got > 0 && r.got >= r.missed;
}

/**
 * Cards in a step, at most, readings included. A friend found a step of "4
 * terms" was 22 cards before any misses came back, which did not feel like 4
 * terms. A step this size is a few minutes.
 */
export const STEP_CARDS = 12;

/** What a card asks and wants, for telling two cards on one fact apart. */
export function askedOf(item: SessionItem): Asked | null {
  switch (item.type) {
    case 'mcq':
      return {
        question: item.question,
        answer: item.options[item.correct_index] ?? '',
        after: item.explanation,
      };
    case 'flashcard':
      return { question: item.front, answer: item.back };
    case 'recall':
      return item.question
        ? { question: item.question, answer: item.answer ?? item.target.term }
        : { question: item.target.definition, answer: item.target.term };
    default:
      return null;
  }
}

/**
 * Cards between a card and a later one it answers, at least, wherever they
 * fall: by then the first card's wording is out of mind. Held by
 * sessionAudit.test.ts on the test lectures.
 */
export const MIN_GAP = 5;

/**
 * What a card puts in front of the student that could answer a later card:
 * what it asks and its answer, or a definition read (its meaning and term).
 */
interface Shown {
  asked: Asked;
  /** A read definition's id: its own typed term is meant to follow it. */
  def?: string;
}

export function shownOf(item: SessionItem): Shown | null {
  if (item.type === 'definition') return { asked: { question: item.definition, answer: item.term }, def: item.id };
  const asked = item._again ? null : askedOf(item);
  return asked ? { asked } : null;
}

/** An earlier card that answers a later ask, the definition and its own typed term aside. */
export function answers(earlier: Shown, item: SessionItem, asked: Asked): boolean {
  if (earlier.def && item.type === 'recall' && item.target.id === earlier.def) return false;
  return answeredBy(earlier.asked, asked);
}

/** The first card too close after one that answers it, as [earlier, later] positions, or null. */
export function tooClose(list: readonly SessionItem[]): [number, number] | null {
  const shown = list.map((item, n) => ({ n, item, shown: shownOf(item) })).filter((x) => x.shown);
  for (let j = 0; j < shown.length; j++) {
    const later = shown[j];
    if (later.item.type === 'definition') continue;
    for (let i = j - 1; i >= 0 && later.n - shown[i].n - 1 < MIN_GAP; i--) {
      if (answers(shown[i].shown!, later.item, later.shown!.asked)) return [shown[i].n, later.n];
    }
  }
  return null;
}

/**
 * A review list in the same order, except that no card comes fewer than
 * MIN_GAP cards after one that answers it, where the list allows. Learn
 * spaces its cards this way (apart, below) but Review had no rule: due cards
 * sorted by urgency put a term's cards side by side, and on the owner's five
 * lectures 2 to 16 cards a review sitting came a card or two after one that
 * printed their answer (sim/lecture.sim.ts, 2026-10-13). Same cards, so the
 * same time; each takes the first place far enough from its twins, and one
 * that fits nowhere keeps its place at the end.
 */
export function spaced(list: SessionItem[]): SessionItem[] {
  const out: SessionItem[] = [];
  const left = [...list];
  while (left.length) {
    const k = left.findIndex((item) => {
      const shown = shownOf(item);
      if (!shown) return true;
      for (let i = Math.max(0, out.length - MIN_GAP); i < out.length; i++) {
        const before = shownOf(out[i]);
        if (before && out[i].id !== item.id && answers(before, item, shown.asked)) return false;
      }
      return true;
    });
    out.push(...left.splice(k < 0 ? 0 : k, 1));
  }
  return out;
}

/**
 * Steps with no card asked in the step of one that answers it, or fewer than
 * MIN_GAP cards after it, as far as the section allows. A definition read
 * counts as showing its meaning: an MCQ whose answer is the term just read
 * and typed, or a flashcard whose answer that definition spells out, is the
 * definition again, not a new question (the owner's "rereading the same
 * definition"). Such a card goes to the end of the next step, and on again
 * if it is still too close there. In the last step it goes to the end if
 * that is MIN_GAP cards on, and otherwise gets a step of its own, a second
 * look at the section once everything else has been asked.
 */
function apart(steps: SessionItem[][]): SessionItem[][] {
  const out = steps.map((s) => [...s]);
  const before: { n: number; shown: Shown }[] = [];
  let n = 0;
  for (let s = 0; s < out.length; s++) {
    const inStep: Shown[] = [];
    const stay: SessionItem[] = [];
    const moved: SessionItem[] = [];
    for (const item of out[s]) {
      const shown = shownOf(item);
      const at = n + stay.length;
      // Past the last step a card only moves on from a twin in its own step:
      // there the gap cannot grow, and each new step holds fewer cards.
      const clash =
        !!shown &&
        item.type !== 'definition' &&
        (inStep.some((k) => answers(k, item, shown.asked)) ||
          (s < steps.length && before.some((k) => at - k.n - 1 < MIN_GAP && answers(k.shown, item, shown.asked))));
      if (clash) {
        moved.push(item);
        continue;
      }
      if (shown) inStep.push(shown);
      stay.push(item);
    }
    stay.forEach((item, k) => {
      const shown = shownOf(item);
      if (shown) before.push({ n: n + k, shown });
    });
    // The section's last step: at its end, if that is far enough from the
    // twin, rather than a step of one or two cards with a pause after it.
    if (moved.length && s === steps.length - 1 && !tooClose([...stay, ...moved])) {
      out[s] = [...stay, ...moved];
      break;
    }
    n += stay.length;
    out[s] = stay;
    if (!moved.length) continue;
    if (s + 1 === out.length) out.push([]);
    out[s + 1] = [...out[s + 1], ...moved];
  }
  // Steps past the original last are the second look.
  return out
    .map((st, k) => (k < steps.length ? st : st.map((item) => ({ ...item, _second: true }))))
    .filter((st) => st.length);
}

/**
 * A step of a card or two is a pause screen after every card or two. One
 * that small joins the step before it when the two fit in one and no card
 * comes too soon after one that answers it; its reading moves up with the
 * rest of the step's reading, so it is still read before it is asked.
 */
function joinSmall(steps: SessionItem[][]): SessionItem[][] {
  const SMALL = 3;
  const out: SessionItem[][] = [];
  steps.forEach((step, k) => {
    const prev = out.at(-1);
    const joined = prev && [...prev, ...step].sort((a, b) => ORDER[a.type] - ORDER[b.type]);
    // Sorting the two together moves cards nearer the steps on either side,
    // so their edges are checked too.
    const before = (out.at(-2) ?? []).slice(-MIN_GAP);
    const after = (steps[k + 1] ?? []).slice(0, MIN_GAP);
    if (
      prev &&
      !!prev[0]._second === !!step[0]._second &&
      joined!.length <= STEP_CARDS &&
      Math.min(prev.length, step.length) <= SMALL &&
      !tooClose([...before, ...joined!, ...after])
    )
      out[out.length - 1] = joined!;
    else out.push(step);
  });
  return out;
}

/**
 * One section's items as a sequence of steps.
 *
 * Each item comes back carrying `_step`, `_steps` and `_block`, which the
 * session uses to say where you are and to pause between steps. A term you
 * have already answered right skips its reading card; it is still asked.
 *
 * A flashcard is asked, never shown open first. It used to be: its answer
 * on a reading card, then the same card asked a few cards later, which the
 * owner's first real study read as being handed the answer and then asked
 * for it (docs/proposals/content-quality.md). The flip shows the answer
 * anyway, and a wrong first try with the answer after teaches at least as
 * well as reading it (Kornell, Hays & Bjork 2009, docs/evidence.md).
 *
 * Two cards that ask one fact, or where the first prints the second's answer
 * (lib/contentChecks, answeredBy), are kept apart: the later one moves to the
 * next step (see apart), so it is answered from memory of the subject and not
 * of the card before.
 */
export function stepSection(group: SessionItem[], progress?: Record<string, ItemResult>): SessionItem[] {
  const defs = group.filter((i): i is SessionItem & Def => i.type === 'definition');
  const others = group.filter((i) => i.type !== 'definition' && i.type !== 'recall' && i.type !== 'preview');
  const texts = new Map(others.map((i) => [i, termTokens(textOf(i))]));
  const uses = (text: Set<string>, n: Set<string>[]) => n.some((t) => coversTokens(text, t));
  const defNames = defs.map((d) => namesOf(d));
  const genericIdx = new Set(
    defNames
      .map((n, k) => ({ n, k }))
      .filter(({ n }) => others.length > 4 && others.filter((o) => uses(texts.get(o)!, n)).length > others.length * GENERIC_SHARE)
      .map(({ k }) => k),
  );
  const defWords = defs.map((d) => excerptWords(d));
  // What each item matches does not depend on how the terms are cut into
  // steps, so it is worked out once, not once per try below.
  const termsOf = new Map<SessionItem, number[]>();
  const passagesOf = new Map<SessionItem, { k: number; score: number }[]>();
  for (const item of others) {
    const hits = defs.map((_, k) => k).filter((k) => uses(texts.get(item)!, defNames[k]));
    const specific = hits.filter((k) => !genericIdx.has(k));
    const pick = specific.length ? specific : hits;
    if (pick.length) {
      termsOf.set(item, pick);
      continue;
    }
    const words = excerptWords(item);
    passagesOf.set(
      item,
      defs.map((_, k) => ({ k, score: overlap(words, defWords[k]) })).filter((p) => p.score >= MIN_OVERLAP),
    );
  }

  const readAt = new Map(defs.map((d, k) => [d.id, k]));
  const exampleWords = new Map(others.filter((i) => i.type === 'example').map((ex) => [ex, contentWords(ex)]));
  const cardWords = new Map(others.filter((i) => i.type === 'flashcard' || i.type === 'mcq').map((i) => [i, contentWords(i)]));

  /** Which step every item goes in, with the terms cut into `defSteps` steps. */
  const place = (defSteps: number) => {
    const stepOfK = (k: number) => Math.floor((k * defSteps) / defs.length);
    const stepOfDef = new Map<string, number>();
    // Spread evenly, so 9 terms are 3+3+3 and not 4+4+1.
    defs.forEach((d, k) => stepOfDef.set(d.id, stepOfK(k)));
    const stepOf = new Map<SessionItem, number>();
    const leftover: SessionItem[] = [];
    for (const item of others) {
      const terms = termsOf.get(item);
      // The LAST step among the terms it uses: by then all of them are taught.
      if (terms) {
        stepOf.set(item, Math.max(...terms.map(stepOfK)));
        continue;
      }
      // An item that names no term but quotes the same passage as a
      // definition was written from what that definition teaches: it goes in
      // that step. Ties go to the later step: by then both have been read.
      let best: { step: number; score: number } | null = null;
      for (const { k, score } of passagesOf.get(item) ?? []) {
        const step = stepOfK(k);
        if (!best || score > best.score || (score === best.score && step > best.step)) best = { step, score };
      }
      if (best) stepOf.set(item, best.step);
      else leftover.push(item);
    }
    // What still matches nothing waits for a last step of its own, after every
    // term is taught. An early step must never ask about what it did not show.
    // A section with no terms has nothing to wait for and is cut by count; one
    // with a single step already reads everything before it asks anything.
    let steps = defSteps;
    if (defs.length && defSteps > 1 && leftover.length) {
      for (const item of leftover) stepOf.set(item, defSteps);
      steps = defSteps + 1;
    } else {
      for (const type of ['example', 'graphic', 'flashcard', 'mcq'] as const) {
        const ofType = leftover.filter((i) => i.type === type);
        ofType.forEach((item, k) => stepOf.set(item, Math.floor((k * defSteps) / ofType.length)));
      }
    }
    // A card that practises a worked example comes after it, never before:
    // placed by the terms it names, a calculation could be set a step before
    // the formula and the example that shows the method (a real lecture,
    // 2026-10-26). The example teaches, then the card asks.
    for (const [ex, words] of exampleWords) {
      const at = stepOf.get(ex);
      if (at == null) continue;
      for (const item of others) {
        if (item.type !== 'flashcard' && item.type !== 'mcq') continue;
        if ((stepOf.get(item) ?? 0) >= at) continue;
        const own = cardWords.get(item)!;
        if (own.size >= 3 && [...own].filter((w) => words.has(w)).length / own.size >= PRACTISES) stepOf.set(item, at);
      }
    }
    // An exam question to write (a short or long answer) pulls the section
    // together: it is asked in the last step, once its parts have been taught
    // and asked, so the whole answer is recalled rather than just read.
    for (const item of others) if (isWrittenCard(item)) stepOf.set(item, steps - 1);
    for (const item of group) {
      if (item.type === 'definition') stepOf.set(item, stepOfDef.get(item.id)!);
      if (item.type === 'recall') stepOf.set(item, stepOfDef.get(item.target.id) ?? 0);
    }

    const out: SessionItem[][] = [];
    for (let s = 0; s < steps; s++) {
      const inStep: SessionItem[] = [];
      group.forEach((item) => {
        if (stepOf.get(item) !== s) return;
        if (item.type === 'definition' && knows(item, progress)) return;
        inStep.push(item);
      });
      // A typed term is asked in the order its definition was read, which is
      // the order of the definitions in the section; one whose definition is
      // not here goes after them.
      const rank = (item: SessionItem, i: number) =>
        item.type === 'recall' ? (readAt.get(item.target.id) ?? group.length + i) : i;
      out.push(
        inStep
          .map((item, i) => ({ item, i: rank(item, i) }))
          // A written question last of all: it gathers what the step asked.
          .sort((a, b) => Number(isWrittenCard(a.item)) - Number(isWrittenCard(b.item)) || ORDER[a.item.type] - ORDER[b.item.type] || a.i - b.i)
          .map(({ item }) => item),
      );
    }
    return out;
  };

  // A section with no terms is cut by count instead, about ten cards a step.
  let defSteps = defs.length ? Math.ceil(defs.length / STEP_TERMS) : Math.max(1, Math.ceil(others.length / (STEP_TERMS * 2.5)));
  let built = place(defSteps);
  // Fewer terms a step while a step runs long, down to one term each.
  while (defs.length && defSteps < defs.length && Math.max(...built.map((s) => s.length)) > STEP_CARDS) {
    built = place(++defSteps);
  }
  // A first meeting asks at most TERM_BUDGET cards on one term (its typed
  // name first, in step order); the rest wait for the second look, the next
  // sitting. Every card on a basic idea in one go was the owner's "all my
  // time on feedback loops, the same question in different formats".
  const perTerm = new Map<number, number>();
  const held: SessionItem[] = [];
  // A written question in a section of one step would be asked a few cards
  // after its outline is read (below): that is reading it back. It waits for
  // the second look, the next sitting, and is recalled then.
  if (built.length === 1 && built[0].some(isWritten) && built[0].some((i) => !isWritten(i))) {
    held.push(...built[0].filter(isWritten));
    built = [built[0].filter((i) => !isWritten(i))];
  }
  built = built.map((step) =>
    step.filter((item) => {
      if (phaseOf(item.type) === 'read') return true;
      const k = item.type === 'recall' ? readAt.get(item.target.id) : termsOf.get(item)?.at(-1);
      if (k === undefined) return true;
      const n = (perTerm.get(k) ?? 0) + 1;
      perTerm.set(k, n);
      if (n <= TERM_BUDGET) return true;
      held.push(item);
      return false;
    }),
  );
  built = apart(built);
  if (held.length) built.push(held.map((item) => ({ ...item, _second: true })));
  // A step still too long (one term with many questions, or the last step of
  // what fits no term) asks the rest in a step of its own, after its reading,
  // so nothing is asked before it is shown.
  const cut: SessionItem[][] = [];
  for (const step of built) {
    if (step.length <= STEP_CARDS) {
      cut.push(step);
      continue;
    }
    const reads = step.filter((i) => phaseOf(i.type) === 'read');
    const asks = step.filter((i) => phaseOf(i.type) !== 'read');
    let part = { asks: [] as SessionItem[], size: reads.length };
    const parts = [part];
    for (const ask of asks) {
      // Every part asks at least one thing, however much it has to read.
      if (part.asks.length && part.size + 1 > STEP_CARDS) {
        part = { asks: [], size: 0 };
        parts.push(part);
      }
      part.asks.push(ask);
      part.size += 1;
    }
    parts.forEach((p, k) => cut.push([...(k === 0 ? reads : []), ...p.asks]));
  }
  // A step can end up empty: every term known and nothing else placed in it.
  const steps = joinSmall(cut.filter((s) => s.length));
  // Last, after every other rule has moved cards about: in every step, the
  // second look included, a card to write comes after everything else. The
  // second look opens the next sitting, and it used to open with the written
  // questions held back from a one-step section (the owner, 2026-10-26).
  for (let k = 0; k < steps.length; k++) steps[k] = [...steps[k].filter((i) => !isWrittenCard(i)), ...steps[k].filter(isWrittenCard)];
  // What the section builds to, first: each written question not yet
  // answered opens the section with its points, to read, and is asked at the
  // section's end (or the next sitting). Asked cold, a three-point answer
  // the student had never met was "get it wrong on purpose, then memorise
  // the answer" (the owner, 2026-10-26). The section between the two is what
  // makes it a recall, not a reading back. Skip the reading leaves it out
  // (buildSessionItems learnOrder), for a student who has read the slides.
  const outlines = steps
    .flat()
    .filter((i): i is SessionItem & { type: 'flashcard' } => isWritten(i) && !answeredBefore(i, progress))
    .map(
      (card): SessionItem => ({
        id: previewId(card.id),
        type: 'preview',
        target: card,
        ...(card.difficulty ? { difficulty: card.difficulty } : {}),
        _sectionTitle: card._sectionTitle,
        _sectionId: card._sectionId,
        _sectionOrder: card._sectionOrder,
        _courseId: card._courseId,
      }) as SessionItem,
    );
  if (outlines.length && steps.length) steps[0] = [...outlines, ...steps[0]];
  return steps.flatMap((step, s) =>
    step.map((item) => ({
      ...item,
      _step: s,
      _steps: steps.length,
      _block: `${item._sectionId}#${s}`,
    })),
  );
}
