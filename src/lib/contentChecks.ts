import { normaliseTerm } from './termMatch';

/**
 * Two questions about the cards themselves, shared by the session order
 * (lib/learnSteps), the course check (lib/courseHealth) and the session
 * audit (lib/sessionAudit), so the three never disagree.
 *
 * Both came from the owner's first real study of a biology lecture
 * (docs/proposals/content-quality.md): "name the term" cards whose own
 * definition spelled the answer out, and the same fact asked twice in a row
 * in nearly the same words.
 */

const STOP = new Set(
  'the a an and or of to in on at by for with from into onto as is are was were be been being has have had it its this that these those which what who whom whose when where why how does do did can could would should may might will shall than then there their them they not no yes also more most less least very such some any each every both either neither other another between among about after before during over under through within without per via one two three first second'.split(
    ' ',
  ),
);

/*
 * A session compares every card with every card before it, and the library
 * builds a Today for every lecture, so each text is cut into words once.
 */
const stemCache = new Map<string, Set<string>>();
const answerCache = new Map<string, Set<string>>();
function cached(cache: Map<string, Set<string>>, text: string, make: () => Set<string>): Set<string> {
  let hit = cache.get(text);
  if (!hit) {
    if (cache.size > 20_000) cache.clear();
    hit = make();
    cache.set(text, hit);
  }
  return hit;
}

/** The content words of a text, cut to a stem so a word family matches: signal, signals, signaling. */
export function stems(text: string): Set<string> {
  return cached(
    stemCache,
    text,
    () =>
      new Set(
        normaliseTerm(text)
          .split(' ')
          // Short symbols count ("x" in x-intercept, "Km"); bare numbers do not.
          .filter((w) => w && !STOP.has(w) && !/^\d+$/.test(w))
          .map((w) => w.slice(0, 5)),
      ),
  );
}

/**
 * A definition gives its term away when every content word of the term (by
 * stem, so "signaling" counts for "signal") is already in the definition:
 * "The way cells communicate … a signaling cell sends a signal" for "cell
 * signaling". Asked as "name the term", it tests reading, not memory. What
 * is in brackets in the term (an abbreviation) is left out.
 */
export function givesAway(term: string, definition: string): boolean {
  // Words, not symbols: a definition of "Km" or "X" may well use the symbol.
  const want = new Set([...stems(term.replace(/\([^)]*\)/g, ' '))].filter((w) => w.length >= 3));
  if (!want.size) return false;
  const have = stems(definition);
  for (const w of want) if (!have.has(w)) return false;
  return true;
}

/** What a card asks and what it wants, for comparing cards. */
export interface Asked {
  question: string;
  answer: string;
  /** What else the card shows once answered (an MCQ's explanation). */
  after?: string;
}

const SUPERSCRIPT = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const UNITS = new Set('1 m mm um nm pm mol mmol umol min s sec h hr l ml ul g mg ug kg kj kcal j k c'.split(' '));

/**
 * The words and numbers of an answer, for comparing answers. Exponents count
 * as digits ("10⁻⁶ to 10⁻¹ M"), and a capital letter on its own is a name,
 * not an article: "Protein kinase A" and "Protein kinase C" are two answers.
 */
function answerTokens(text: string): Set<string> {
  return cached(answerCache, text, () => answerTokensOf(text));
}

function answerTokensOf(text: string): Set<string> {
  const folded = text.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (c) => String(SUPERSCRIPT.indexOf(c))).replace(/\b([A-Z])\b/g, ' $1$1$1 ');
  return new Set(
    normaliseTerm(folded)
      .split(' ')
      // Units say nothing about which answer it is: 50 µmol·min⁻¹ and
      // 100 µmol·min⁻¹ share only their units.
      .filter((w) => w && !STOP.has(w) && !UNITS.has(w))
      // Cut to a stem like the questions' words, so "cell" is "cells".
      .map((w) => (/^\d+$/.test(w) ? w : w.slice(0, 5))),
  );
}

function share(a: Set<string>, b: Set<string>): { shared: number; share: number } {
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  let shared = 0;
  for (const w of small) if (large.has(w)) shared++;
  return { shared, share: small.size ? shared / small.size : 0 };
}

/**
 * The same answer: word for word, or most of the words of a short one
 * ("Between 10⁻⁶ and 10⁻¹ M" and "10⁻⁶ to 10⁻¹ M"). Long answers share
 * words without saying the same thing.
 */
export function sameAnswer(a: Asked, b: Asked): boolean {
  const x = normaliseTerm(a.answer);
  if (x.length >= 3 && x === normaliseTerm(b.answer)) return true;
  if (sameName(a.answer, b.answer)) return true;
  const ax = answerTokens(a.answer);
  const ay = answerTokens(b.answer);
  if (Math.min(ax.size, ay.size) > 4) return false;
  const o = share(ax, ay);
  return o.shared >= 2 && o.share >= 0.75;
}

/**
 * Two short answers that are one name: "Autocrine" and "Autocrine
 * signaling", "Steroids" and "Steroid messengers". An MCQ answered with the
 * term just typed from its definition is that definition asked again.
 */
export function sameName(a: string, b: string): boolean {
  // Names, not values or formulas: 1/Vmax and Km/Vmax are two answers.
  if (/[\d/=+×·−]/.test(a + b)) return false;
  const x = answerTokens(a);
  const y = answerTokens(b);
  const [small, large] = x.size <= y.size ? [x, y] : [y, x];
  if (!small.size || large.size > 3 || large.size < 2) return false;
  for (const w of small) if (!large.has(w)) return false;
  return true;
}

/** Share of the smaller question's content words that the other has too, and of the larger's. */
export function questionOverlap(a: Asked, b: Asked): { shared: number; share: number; ofLarger: number } {
  const x = stems(a.question);
  const y = stems(b.question);
  const o = share(x, y);
  return { ...o, ofLarger: o.shared / Math.max(x.size, y.size, 1) };
}

/**
 * A card that answers a later one: the later card's answer printed in what
 * the earlier one showed, its question, answer or explanation. The owner's
 * example: the typed term "cell signaling", whose definition reads "a
 * signaling cell sends a signal", and next "name the cell that sends a
 * signal". Only one way round: an earlier card asked for a term, and a later
 * question naming it, gives nothing away. Answers of one word are left out;
 * too many are everyday words ("increases").
 */
export function revealsAnswer(earlier: Asked, later: Asked): boolean {
  const shownText = [earlier.question, earlier.answer, earlier.after ?? ''].join(' ');
  const want = normaliseTerm(later.answer.replace(/\([^)]*\)/g, ' '));
  if (want.length >= 6 && want.includes(' ') && ` ${normaliseTerm(shownText)} `.includes(` ${want} `)) return true;
  // Or reworded: every word the answer adds to its own question is on the
  // earlier card ("within ranges, by feedback loops" after a definition of
  // homeostasis that says so). Three words at least, so a one-word answer
  // that happens to be used ("increases") is not a reveal.
  const asked = stems(later.question);
  const adds = [...stems(later.answer)].filter((w) => !asked.has(w) && w.length >= 3);
  if (adds.length < 3) return false;
  const shown = stems(shownText);
  return adds.filter((w) => shown.has(w)).length / adds.length >= 0.8;
}

/**
 * Two cards that ask the same thing:
 *
 * - the same answer, when it is more than one word, or the questions share
 *   some words too (two questions answered "Increases" are not one fact),
 *   unless the two are a contrast (see parallel below);
 * - nearly the same question ("What range do typical Km values fall in?" and
 *   "Typical Km values fall in which range?"), or questions that share most
 *   of their words with answers that share most of theirs.
 *
 * Two facts about one subject (a plot's slope and its intercept, two kinases)
 * share words in the question but not the answer, and are not the same; nor
 * is a fact and a worked problem that uses it.
 * Kept in different steps (lib/learnSteps), so the second is answered from
 * memory of the subject, not of the card before.
 */
export function sameFact(a: Asked, b: Asked): boolean {
  const q = questionOverlap(a, b);
  const exact = normaliseTerm(a.answer).length >= 3 && normaliseTerm(a.answer) === normaliseTerm(b.answer);
  if (exact) return answerTokens(a.answer).size >= 2 || q.shared >= 2;
  // Two parallel questions, each with a subject the other lacks ("what does a
  // competitive inhibitor do…" and "what does a mixed inhibitor do…"): a
  // contrast worth asking side by side, however alike their answers read.
  const x = stems(a.question);
  const y = stems(b.question);
  const parallel = q.shared >= 2 && [...x].some((w) => !y.has(w)) && [...y].some((w) => !x.has(w));
  if (sameName(a.answer, b.answer)) return true;
  if (sameAnswer(a, b)) return !parallel;
  // Nearly the same question, whatever the answers say: "What range do
  // typical Km values fall in?" answered in molar, and in words. Both ways
  // round, so a short question inside a worked problem about it is not the
  // same question ("what is the x-intercept?").
  if (q.shared >= 4 && q.share >= 0.9 && q.ofLarger >= 0.75) return true;
  if (parallel || q.shared < 3 || q.share < 0.6) return false;
  return share(answerTokens(a.answer), answerTokens(b.answer)).share >= 0.75;
}

/** A later card that should not follow an earlier one closely: the same fact, or answered by it. */
export function answeredBy(earlier: Asked, later: Asked): boolean {
  return sameFact(earlier, later) || revealsAnswer(earlier, later);
}

/**
 * A question that asks a term back from its own definition: most of its
 * words are the definition's. The typed term already asks that, and harder.
 */
export function restatesDefinition(question: string, definition: string): boolean {
  const q = stems(question);
  if (!q.size) return false;
  const d = stems(definition);
  let shared = 0;
  for (const w of q) if (d.has(w)) shared++;
  return shared / q.size >= 0.4;
}
