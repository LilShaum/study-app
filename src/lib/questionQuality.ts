import type { Course, StudyItem } from '@/schema/course';

/**
 * Checks on what the questions ASK, as opposed to whether the file is
 * well formed.
 *
 * courseHealth already catches the structural faults — a misaligned rationale
 * array, a duplicate id, a term defined and never tested. Those are the ones
 * that make a course broken. These are the ones that make a course
 * *flattering*: it looks complete, every count is right, and it still leaves
 * you unprepared, because the questions give their answers away or only ever
 * ask you to recognise a sentence you have already read.
 *
 * Each measure here is deliberately mechanical. A generator will ignore a
 * rule it is merely told — the option-length tell below survived a prompt
 * that already said "distractors should be plausible" — so the rules worth
 * having are the ones that can be checked afterwards and reported.
 */

export interface Mcq {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
}

const isMcq = (i: StudyItem): i is Extract<StudyItem, { type: 'mcq' }> => i.type === 'mcq';
const isGradable = (i: StudyItem) => i.type === 'mcq' || i.type === 'flashcard';

/** What a gradable item asks, whichever type it is. */
export function stemOf(item: StudyItem): string {
  if (item.type === 'mcq') return item.question;
  if (item.type === 'flashcard') return item.front;
  return '';
}

/** What it accepts as right, for measuring against the source. */
function answerOf(item: StudyItem): string {
  if (item.type === 'mcq') return item.options[item.correct_index] ?? '';
  if (item.type === 'flashcard') return item.back;
  return '';
}

/* ------------------------------------------------------------------ *
 * 1. Option-length telegraphing
 * ------------------------------------------------------------------ */

export interface LengthBias {
  mcqs: number;
  longestIsCorrect: number;
  /** Mean correct-option length divided by mean distractor length. */
  ratio: number;
  /** How many standard deviations above chance, for a fair coin at 1-in-4. */
  z: number;
  /** MCQs whose longest option runs past twice the mean of the four. */
  lopsided: string[];
}

/**
 * Whether a student who knows nothing can beat chance by picking the longest
 * option.
 *
 * A correct answer tends to grow because it has to be *true*, and truth
 * usually needs the qualifying clause that a wrong answer can do without. So
 * this is the default failure of generated multiple choice, not an exotic
 * one, and it is invisible to every other check: the file is valid, the
 * counts are right, and the exam still measures something other than
 * knowledge.
 *
 * Reported as a z-score rather than a percentage because a percentage means
 * nothing at small n. Eight of twelve looks alarming and is unremarkable;
 * seventy of a hundred and twenty-eight is not.
 */
export function lengthBias(course: Course): LengthBias {
  const mcqs = course.sections.flatMap((s) => s.items).filter(isMcq);
  const n = mcqs.length;
  let longestIsCorrect = 0;
  let correctTotal = 0;
  let distractorTotal = 0;
  let distractorCount = 0;
  const lopsided: string[] = [];

  for (const m of mcqs) {
    const lens = m.options.map((o) => String(o).length);
    const correct = lens[m.correct_index] ?? 0;
    if (lens.length && correct === Math.max(...lens)) longestIsCorrect += 1;
    correctTotal += correct;
    lens.forEach((l, i) => {
      if (i === m.correct_index) return;
      distractorTotal += l;
      distractorCount += 1;
    });
    const mean = lens.reduce((a, b) => a + b, 0) / Math.max(1, lens.length);
    if (mean > 0 && Math.max(...lens) > mean * 2) lopsided.push(m.id);
  }

  const expected = n * 0.25;
  const sd = Math.sqrt(n * 0.25 * 0.75);
  return {
    mcqs: n,
    longestIsCorrect,
    ratio: distractorCount > 0 && n > 0 ? correctTotal / n / (distractorTotal / distractorCount) : 1,
    z: sd > 0 ? (longestIsCorrect - expected) / sd : 0,
    lopsided,
  };
}

/* ------------------------------------------------------------------ *
 * 2. How much a question restates its own source
 * ------------------------------------------------------------------ */

const words = (s: string) => new Set(String(s).toLowerCase().match(/[a-z]{4,}/g) ?? []);

/**
 * The share of a question's own vocabulary that came straight from the
 * passage it cites.
 *
 * A stand-in for "is this testing the subject or testing whether you read the
 * slide". At the top of the range the item is the source sentence with a
 * question mark on it — answerable by matching words, forgotten by the exam,
 * where the sentence will not be in front of you. It is only a proxy: a
 * question about a formula legitimately reuses the formula's own terms. But
 * it is a proxy that can be computed, and it agrees with slower judgements —
 * on a course measured by hand the least-restated items were the ones that
 * asked for a calculation.
 */
export function restatement(item: StudyItem): number {
  const asked = words(`${stemOf(item)} ${answerOf(item)}`);
  if (!asked.size) return 0;
  const source = words(item.source_excerpt ?? '');
  let shared = 0;
  asked.forEach((w) => {
    if (source.has(w)) shared += 1;
  });
  return shared / asked.size;
}

/* ------------------------------------------------------------------ *
 * 3. Questions cued to the document rather than the subject
 * ------------------------------------------------------------------ */

/**
 * "According to the notes", "on the Chemical Messengers slide", "listed
 * together on one line".
 *
 * These are grounded — they are about something really in the source — and
 * still worthless, because what they teach is the layout of a document the
 * student will not have in the exam. The worst of them test typesetting.
 */
const SOURCE_CUED =
  /\b(?:the notes|per the notes|according to the notes|in the notes|listed in the notes|the slides?\b|on the [a-z ]{0,30}slide|on one line|in figure \d|the figure above)\b/i;

export const isSourceCued = (text: string) => SOURCE_CUED.test(text);

/* ------------------------------------------------------------------ *
 * 4. Whether anything beyond recall is being asked
 * ------------------------------------------------------------------ */

const APPLIES =
  /\b(?:if|when|suppose|predict|would happen|blocked|inhibits?|inhibited|mutation|mutant|knock(?:ed)? ?out|calculate|compute|given that|patient|drug|what effect|results? in|consequence|stops? working|fails?|cannot|no longer)\b/i;
const COMPARES =
  /\b(?:differs?|difference|distinguish|compared? with|versus|\bvs\b|unlike|whereas|rather than|instead of|which pair|both)\b/i;

/**
 * A crude read of whether a stem asks for anything past retrieval.
 *
 * Crude on purpose: it looks for the shapes a question takes when it asks you
 * to do something with a fact — put it under a condition, or set it against a
 * neighbour. It will miss a well-written applied question that uses none of
 * these words, and it will accept a recall question that happens to contain
 * "when". It is not a grade. It is a way of noticing that a whole section
 * contains nothing of the kind, which is the finding that matters and which
 * no one spots by reading.
 */
export const asksBeyondRecall = (text: string) => APPLIES.test(text) || COMPARES.test(text);

/* ------------------------------------------------------------------ *
 * Whole-course rollup
 * ------------------------------------------------------------------ */

export interface QuestionQuality {
  length: LengthBias;
  gradable: number;
  /** Gradable items at or above RESTATED_AT overlap with their own excerpt. */
  restated: string[];
  sourceCued: string[];
  beyondRecall: number;
  /** Sections whose gradable items are all plain recall. */
  recallOnlySections: string[];
}

/** Above this share of shared vocabulary, a question is mostly its own source. */
export const RESTATED_AT = 0.5;

export function analyseQuestionQuality(course: Course): QuestionQuality {
  const gradable = course.sections.flatMap((s) => s.items).filter(isGradable);
  const recallOnlySections: string[] = [];

  for (const section of course.sections) {
    const g = section.items.filter(isGradable);
    // A section with nothing gradable is a different complaint, already made
    // by the low-gradable check; do not report it twice here.
    if (g.length >= 4 && !g.some((i) => asksBeyondRecall(stemOf(i)))) {
      recallOnlySections.push(section.title);
    }
  }

  return {
    length: lengthBias(course),
    gradable: gradable.length,
    restated: gradable.filter((i) => restatement(i) >= RESTATED_AT).map((i) => i.id),
    sourceCued: gradable.filter((i) => isSourceCued(stemOf(i))).map((i) => i.id),
    beyondRecall: gradable.filter((i) => asksBeyondRecall(stemOf(i))).length,
    recallOnlySections,
  };
}
