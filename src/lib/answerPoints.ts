import type { ExampleItem, FlashcardItem, StudyItem } from '@/schema/course';

/**
 * A flashcard asked as an exam question: written out, then checked point by
 * point against the model answer, as an exam marks it.
 *
 * The generator writes a short- or long-answer card's back as numbered
 * points, "(1) … (2) … (3) …" (prompts/generator.md), and tags it; either
 * makes it one. Flipping a card and saying "got it" is the kindest grade in
 * the app; writing first and finding each point in what was written is the
 * retrieval the exam asks for (docs/evidence.md, testing effect).
 */
export interface AnswerPoints {
  /** Text before the first numbered point, shown above the list. */
  lead: string;
  /** One entry per point to find in the answer; never empty. */
  points: string[];
  /**
   * How many points make full marks: every one, unless the question asks
   * for some of them ("Name three…" with five listed, "Any three of:").
   */
  need: number;
}

const NUMBER_WORDS: Record<string, number> = { two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
/** "Name three…", "any 3 of": a number the student is asked for, not a count of marks. */
const ASKED_FOR = /\b(?:name|list|give|state|identify|any)\s+(two|three|four|five|six|seven|eight|nine|ten|\d{1,2})\b(?!\s*marks?)/i;

/** The points needed for full marks: the number asked for, when it is fewer than the points listed. */
function needed(text: string, points: number): number {
  const m = ASKED_FOR.exec(text);
  const n = m ? (NUMBER_WORDS[m[1].toLowerCase()] ?? Number(m[1])) : NaN;
  return n >= 1 && n < points ? n : points;
}

const WRITTEN_TAGS = new Set(['short-answer', 'long-answer', 'assignment-style']);

/**
 * "(1)" or "1)" at the start of the text or after a space, numbered from 1
 * in order and all written the way the first one is.
 */
const MARKER = /(?:^|\s)(\(?)(\d{1,2})\)\s/g;

/** The back split at its numbered points, or null when it has fewer than two in order. */
export function splitPoints(back: string): AnswerPoints | null {
  const found: { at: number; end: number }[] = [];
  let style: string | undefined;
  for (const m of back.matchAll(MARKER)) {
    if (Number(m[2]) !== found.length + 1 || (style !== undefined && m[1] !== style)) continue;
    style = m[1];
    const at = m.index + (m[0].length - m[0].trimStart().length);
    found.push({ at, end: m.index + m[0].length });
  }
  if (found.length < 2) return null;
  const points = found.map((f, k) => back.slice(f.end, found[k + 1]?.at ?? back.length).trim()).filter(Boolean);
  if (points.length < 2) return null;
  const lead = back.slice(0, found[0].at).trim();
  return { lead, points, need: needed(lead, points.length) };
}

/** How to check a written answer to this card, or null for an ordinary flip card. */
export function answerPoints(item: Pick<FlashcardItem, 'back' | 'tags'> & { front?: string }): AnswerPoints | null {
  const split = splitPoints(item.back);
  // The question may ask for some of the points listed ("Name three…").
  if (split) return { ...split, need: Math.min(split.need, needed(item.front ?? '', split.points.length)) };
  return item.tags?.some((t) => WRITTEN_TAGS.has(t)) ? { lead: '', points: [item.back.trim()], need: 1 } : null;
}

const WRITTEN_TITLE = /^(long|short)[- ]answer\b/i;

/**
 * A long or short answer written as a worked `example`: a model answer laid
 * out in steps, tagged or titled as one. Read as an example, its answer was
 * shown before the student ever tried it, and since examples are not scored,
 * Review never brought it back: in a course that has long answers, they
 * were the one kind never practised (2026-10-26). Everywhere a student is asked, it is a
 * written question instead (`writtenFromExample`); Browse still shows it
 * as the model answer.
 */
export function isWrittenExample(item: StudyItem): item is ExampleItem {
  if (item.type !== 'example' || (item.steps?.length ?? 0) < 2) return false;
  return !!item.tags?.some((t) => t === 'long-answer' || t === 'short-answer') || WRITTEN_TITLE.test(item.title ?? '');
}

/** The written question a long-answer example is asked as: its steps the points, its takeaway above them. */
export function writtenFromExample(ex: ExampleItem): FlashcardItem {
  const title = (ex.title ?? '').trim() || 'Long answer';
  const context = ex.context?.trim();
  const front = context ? `${title}${/[.?!:]$/.test(title) ? '' : '.'} ${context}` : title;
  const points = (ex.steps ?? []).map((step, k) => `(${k + 1}) ${String(step).trim()}`).join(' ');
  const tags = ex.tags?.includes('long-answer') || ex.tags?.includes('short-answer') ? ex.tags : [...(ex.tags ?? []), 'long-answer'];
  return {
    id: ex.id,
    type: 'flashcard',
    front,
    back: ex.takeaway?.trim() ? `${ex.takeaway.trim()} ${points}` : points,
    ...(ex.difficulty ? { difficulty: ex.difficulty } : {}),
    tags,
    ...(ex.source_excerpt ? { source_excerpt: ex.source_excerpt } : {}),
    ...(ex.set_aside ? { set_aside: ex.set_aside } : {}),
  } as FlashcardItem;
}

/** A point that says why or how: a reason, a consequence, a mechanism, not a bare name. */
const GLOSS = /,\s*(the|a|an|its|their)\s/i;
const EXPLAINS = /\b(because|so|since|which|that|by|when|means|leads?|causes?|therefore|thus|while|whereas|through|in order|due to)\b/i;

/**
 * Points that explain nothing: names, labels, short questions. A list asked
 * as "Write the answer" is memorised on the spot, word by word (the owner's
 * nutrition lectures, 2026-10-26: five organizations, five qualities of a
 * diet, four design questions). It belongs in multiple choice.
 */
export function isListOfNames(points: readonly string[]): boolean {
  const explains = (p: string) =>
    // A question to ask is a label, however long ("Was it double-blind?").
    !p.trim().endsWith('?') &&
    // A reason, a gloss after a comma ("Liquid water, the solvent life's
    // chemistry needs"), or a sentence long enough to carry one.
    (EXPLAINS.test(p) || GLOSS.test(p) || p.trim().split(/\s+/).length >= 12);
  return points.filter(explains).length * 2 < points.length;
}
