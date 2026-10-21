import type { FlashcardItem } from '@/schema/course';

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
  return { lead: back.slice(0, found[0].at).trim(), points };
}

/** How to check a written answer to this card, or null for an ordinary flip card. */
export function answerPoints(item: Pick<FlashcardItem, 'back' | 'tags'>): AnswerPoints | null {
  const split = splitPoints(item.back);
  if (split) return split;
  return item.tags?.some((t) => WRITTEN_TAGS.has(t)) ? { lead: '', points: [item.back.trim()] } : null;
}
