/**
 * How well an item is remembered right now, and how that changes with each
 * answer.
 *
 * The model is the simplest one that captures what docs/evidence.md supports:
 * memory for an item fades with time, a successful retrieval makes it fade
 * more slowly, and the right time to review depends on how well that ITEM is
 * held — not on a fixed ladder of intervals (see the expanding-interval
 * entry there: an expanding schedule helped only when the earlier learning
 * was weak, which is exactly what a per-item estimate adapts to).
 *
 *   R(t) = exp(−t / S)
 *
 * R is the chance of recalling the item t days after it was last answered; S
 * is its stability, in days — how long until R falls to about 37%. Each
 * answer updates S.
 *
 * The exponential shape and every constant below are MODELLING CHOICES, not
 * findings. Nothing in the evidence file fixes them, and they are grouped
 * here so they can be tuned against real use rather than defended as
 * science.
 */

import type { ItemResult } from '@/store/progress';

const DAY_MS = 86_400_000;

/*
 * These two were first set at one day and about five hours, and a simulated
 * student showed what that did (the whole real course, a section learned a
 * day, every review done, exam on day 21): a missed item dropped to five
 * hours, was forgotten again by the next day's sitting, missed again, and
 * stayed there — reviews climbed past 400 a day and on the exam morning the
 * average item stood at 27%. The mistake was treating a miss as if nothing
 * had been learned. After a miss the app shows the right answer, and that is
 * a fresh encoding: so a miss, like a first wrong attempt, leaves an item
 * about as strong as learning it the first time. With that, the same student
 * peaked at 264 reviews a day, falling towards the exam, and averaged 85%
 * on the morning of it.
 */
/** Stability after a first attempt that was right. */
const FIRST_RIGHT_DAYS = 2;
/** …after one that was wrong, and the floor after any miss: the answer has just been shown. */
const FLOOR_DAYS = 1;
/**
 * How much a right answer can grow stability. The growth is scaled by how
 * much had been forgotten, 1 − R: recalling something you still knew cold
 * adds almost nothing, recalling it just before it slipped adds the most.
 * That is the study-phase-retrieval reading of the spacing studies, and it is
 * what makes cramming the same item five times in a row worth one answer.
 */
const GROWTH = 4;
/** What a miss keeps of the stability it had. */
const LAPSE_KEEPS = 0.5;
/** No item's stability passes this: a year is past any course's exam. */
const CEILING_DAYS = 365;

/** An item is due for review once its recall chance falls below this. */
export const DUE_BELOW = 0.75;

const clamp = (s: number) => Math.min(CEILING_DAYS, Math.max(FLOOR_DAYS, s));

/**
 * The item's stability, in days, or null if it has never been answered.
 *
 * Records written before this model existed carry only counts. Those get a
 * stability from the counts — one that doubles with each net right answer —
 * so a course studied last month does not wake up looking untouched, nor
 * looking perfectly remembered.
 */
export function stabilityOf(r: ItemResult | undefined): number | null {
  if (!r || r.lastSeen == null || r.got + r.missed === 0) return null;
  if (r.stability != null) return r.stability;
  const net = r.got - r.missed;
  return net > 0 ? clamp(FIRST_RIGHT_DAYS * 2 ** (net - 1)) : FLOOR_DAYS;
}

/** Recall chance at time `at` (ms), or null if the item has never been answered. */
export function retrievability(r: ItemResult | undefined, at: number): number | null {
  const s = stabilityOf(r);
  if (s == null) return null;
  const days = Math.max(0, (at - r!.lastSeen!) / DAY_MS);
  return Math.exp(-days / s);
}

/** Whether a studied item has faded enough to be worth reviewing. Never-seen items are not due. */
export function isDue(r: ItemResult | undefined, at: number): boolean {
  const R = retrievability(r, at);
  return R != null && R < DUE_BELOW;
}

/**
 * Stability after answering, from the stability before and when it was last
 * answered. `before` of null means this is the first attempt.
 */
export function nextStability(
  before: { stability: number; lastSeen: number } | null,
  got: boolean,
  at: number,
): number {
  if (!before) return got ? FIRST_RIGHT_DAYS : FLOOR_DAYS;
  if (!got) return clamp(before.stability * LAPSE_KEEPS);
  const days = Math.max(0, (at - before.lastSeen) / DAY_MS);
  const R = Math.exp(-days / before.stability);
  return clamp(before.stability * (1 + GROWTH * (1 - R)));
}

/** The pre-answer state nextStability needs, read from a stored record. */
export function memoryBefore(r: ItemResult | undefined): { stability: number; lastSeen: number } | null {
  const stability = stabilityOf(r);
  return stability == null ? null : { stability, lastSeen: r!.lastSeen! };
}

/**
 * The moment an exam date stands for: 9am local on that day. A bare
 * "2026-11-12" parsed as a Date is midnight UTC, which west of Greenwich is
 * the evening BEFORE the exam.
 */
export function examTime(date: string | undefined): number | null {
  const m = date?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 9).getTime();
}

/**
 * How strongly an item should be held on the exam day. Higher than the
 * everyday threshold: between exams, letting an item fade to DUE_BELOW before
 * reviewing it is what makes the review worth most; on the day, it has to be
 * there.
 */
const EXAM_TARGET = 0.9;
/**
 * Slack before the last useful moment. Study happens in sittings, not at the
 * minute the model names, so an exam review comes up a day early rather than
 * at 11pm the night before.
 */
const SITTING_MARGIN_DAYS = 1;

/**
 * Whether a studied item should be reviewed now.
 *
 * Without an exam, that is simply "has faded below the threshold". With one
 * there is a second case, and it is the reason to ask for the date: an item
 * that would arrive at the exam below EXAM_TARGET gets a review timed so that
 * it arrives above it — as LATE as that allows, because the later the review
 * the stronger the item on the day. That is the retention interval steering
 * the gap (Cepeda 2006, docs/evidence.md) without inventing a ratio for how.
 *
 * (The obvious version — "due if its next review would fall after the exam"
 * — never fires: an item not yet due is by definition still above the
 * threshold, so it is above it on the exam day too.)
 *
 * That exam review happens once. The window is a stretch of time, and an
 * item answered inside it is still inside it a minute later — with the
 * sitting's slack it rarely projects above the target even then — so
 * without this an item came straight back as due after the very review the
 * rule asked for, and in the last day or two before an exam Review never
 * emptied. Once answered in the window, only fading brings it back.
 */
export function isDueFor(r: ItemResult | undefined, now: number, examAt: number | null): boolean {
  const s = stabilityOf(r);
  if (s == null) return false;
  if (retrievability(r, now)! < DUE_BELOW) return true;
  const latest = examReviewFrom(r, s, now, examAt);
  return latest != null && now >= latest;
}

/**
 * When the exam review window opens for a studied item — the latest moment
 * a review still leaves it at EXAM_TARGET on the day, less the sitting's
 * slack — or null when there is no exam to time it by, the item will be
 * strong enough on the day anyway, or it has already been answered inside
 * the window.
 */
function examReviewFrom(r: ItemResult | undefined, s: number, now: number, examAt: number | null): number | null {
  if (examAt == null || examAt <= now) return null;
  if (retrievability(r, examAt)! >= EXAM_TARGET) return null;
  // After a review at time x, recall on the day is at least exp(−(exam − x)/s),
  // so the review must fall within s·ln(1/target) of the exam.
  const latest = examAt - (-Math.log(EXAM_TARGET) * s + SITTING_MARGIN_DAYS) * DAY_MS;
  return r!.lastSeen! >= latest ? null : latest;
}

/**
 * Review order: lowest recall first — as of the exam when there is one, since
 * that is the day it has to be there, and as of now when there is not.
 */
export function reviewUrgency(r: ItemResult | undefined, now: number, examAt: number | null): number {
  const at = examAt != null && examAt > now ? examAt : now;
  return retrievability(r, at) ?? 1;
}

/**
 * When a studied item next comes due — the moment isDueFor turns true, if
 * nothing is answered before then. Null for an item never answered.
 */
export function nextDueAt(r: ItemResult | undefined, now: number, examAt: number | null): number | null {
  const s = stabilityOf(r);
  if (s == null) return null;
  const normal = r!.lastSeen! + -Math.log(DUE_BELOW) * s * DAY_MS;
  const latest = examReviewFrom(r, s, now, examAt);
  return latest == null ? normal : Math.min(normal, latest);
}

/**
 * "later today", "tomorrow", "on Thursday", "on 12 Nov" — when, in the words
 * a person plans with. Days are calendar days, not 24-hour spans: something
 * due at 9am after a 10pm session is tomorrow, not "in 11 hours".
 */
export function whenLabel(at: number, now: number): string {
  const day = (t: number) => {
    const d = new Date(t);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };
  const days = Math.round((day(at) - day(now)) / DAY_MS);
  if (days <= 0) return 'later today';
  if (days === 1) return 'tomorrow';
  const d = new Date(at);
  if (days < 7) return `on ${d.toLocaleDateString(undefined, { weekday: 'long' })}`;
  return `on ${d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`;
}
