import type { SessionItem } from '@/lib/buildSessionItems';

/**
 * The simulated student: how they actually forget, answer and spend time.
 *
 * This is the "truth" the app is scored against, and it must NOT be the
 * app's own memory model (lib/memory.ts). Scoring the app against itself
 * only measures whether it agrees with itself. So truth models here are
 * written independently, and any conclusion worth acting on should hold
 * under more than one of them.
 *
 * Every number below is an assumption. Change them freely, but say what
 * changed in sim/FINDINGS.md, because it moves every result.
 */

export interface MemoryModel {
  name: string;
  source: string;
  /** Days an item holds (stability) after its first right answer. */
  first: (ease: number) => number;
  /** Stability after a wrong answer, given what it was (null if never learned). */
  lapse: (before: number | null, ease: number) => number;
  /** Stability after a right answer at recall R. */
  grow: (s: number, recall: number, ease: number) => number;
}

export const MEMORY: Record<string, MemoryModel> = {
  // Shaped like FSRS, the model behind Anki's current scheduler, with its
  // published defaults rounded: a first success holds a couple of days, and
  // a success multiplies stability more the more it had faded (desirable
  // difficulty), and less the more stable it already was.
  fsrs: {
    name: 'fsrs',
    source: 'FSRS-shaped (Anki default parameters, rounded). Not fitted to this student.',
    first: (ease) => 2.4 * ease,
    lapse: (before) => (before == null ? 0.4 : 0.4 + 0.15 * before),
    grow: (s, recall, ease) => s * (1 + 11 * ease * Math.pow(s, -0.14) * (Math.exp(0.94 * (1 - recall)) - 1)),
  },
  // Pessimistic: slow first learning and small gains per review. The first
  // simulation in this project used this, and every schedule looked hopeless
  // under it; kept as the bad case a conclusion should survive.
  harsh: {
    name: 'harsh',
    source: 'Pessimistic hand-set values; the lower bound, not a prediction.',
    first: (ease) => 1.2 * ease,
    lapse: (_before, ease) => 0.3 * ease,
    grow: (s, recall, ease) => s * (1.15 + 2.5 * ease * (1 - recall)),
  },
};

/** Seconds a card takes, by what the student is doing with it. */
export const SECONDS: Record<SessionItem['type'], number> = {
  definition: 20,
  example: 40,
  graphic: 30,
  flashcard: 12,
  recall: 15,
  mcq: 35,
};

/**
 * Chance of a right answer on a card never answered before.
 *
 * A typed term straight after reading it is mostly right, and that fades
 * over an hour; cold, it is mostly wrong. Questions and flashcards seen for
 * the first time are answered from whatever the reading left.
 */
export const FIRST_TIME = {
  primedRecall: 0.9,
  primedFadeMinutes: 60,
  coldRecall: 0.15,
  mcq: 0.6,
  flashcard: 0.65,
};

/** Four options: a guess is right a quarter of the time. */
export const MCQ_GUESS = 0.25;

/** Recall R as a chance of getting this card right. */
export function chanceRight(item: SessionItem, recall: number): number {
  // A typed MCQ (question with options removed) has no options to guess from.
  return item.type === 'mcq' ? recall + (1 - recall) * MCQ_GUESS : recall;
}
