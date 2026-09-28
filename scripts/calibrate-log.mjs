#!/usr/bin/env node
/**
 * Reads a real study log and measures what the simulator and the memory
 * model only assume.
 *
 *   node scripts/calibrate-log.mjs arborous-backup-2026-10-10.json
 *
 * Accepts a backup file ("Back up everything" in Help), which carries the log
 * for every course and, with Sync, every device; or one course's log from
 * "Copy study log" (#/help?devtools).
 *
 * What it measures, and what each one decides (sim/FINDINGS.md):
 * - Seconds per card, by type — replaces the guesses in sim/student.ts and
 *   lib/today.ts (the app already uses its own measured pace).
 * - How fast a missed card is forgotten — the number the audit found every
 *   "reviews come too late" question waits on. If recall a day after a miss
 *   is low, missed cards should come back sooner than the next sitting.
 * - Whether the app's recall predictions are right — if answers come back
 *   right less often than predicted, the memory model is too optimistic.
 * - First-time accuracy — the simulated student's FIRST_TIME constants.
 *
 * Dependency-free, like audit-course.mjs.
 */
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

/** Four options: a guess is right a quarter of the time. */
const GUESS = 0.25;

/** The pooled log from any of the accepted file shapes. */
export function readLog(json) {
  let byCourse;
  if (json?.kind === 'arborous-backup') {
    const raw = json.data?.['arborous:study-log'];
    byCourse = raw ? JSON.parse(raw).state?.byCourse ?? {} : {};
  } else if (json?.byCourse) byCourse = json.byCourse;
  else if (json?.state?.byCourse) byCourse = json.state.byCourse;
  else byCourse = { course: json };
  const logs = Object.values(byCourse).filter(Boolean);
  return {
    times: logs.flatMap((l) => l.times ?? []),
    answers: logs.flatMap((l) => l.answers ?? []).sort((a, b) => a.at - b.at),
    days: logs.reduce((acc, l) => {
      for (const [d, s] of Object.entries(l.days ?? {})) acc[d] = (acc[d] ?? 0) + s;
      return acc;
    }, {}),
  };
}

const median = (xs) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

/** Chance of a right answer at recall R: a multiple-choice question can be guessed. */
const chance = (type, R) => (type === 'mcq' ? R + (1 - R) * GUESS : R);

/**
 * Stability, in hours, that best explains a set of answers under R = exp(-t/S):
 * the maximum-likelihood S on a log grid from 15 minutes to 60 days.
 */
export function fitStabilityHours(answers) {
  let best = null;
  for (let s = 0.25; s <= 24 * 60; s *= 1.05) {
    let ll = 0;
    for (const a of answers) {
      const p = Math.min(0.999, Math.max(0.001, chance(a.type, Math.exp(-a.sinceHours / s))));
      ll += a.got ? Math.log(p) : Math.log(1 - p);
    }
    if (!best || ll > best.ll) best = { s, ll };
  }
  return best?.s ?? null;
}

/**
 * How the app's predictions compare with what happened: real recall taken as
 * predicted^k. k near 1: the model is right; above 1: you forget faster than
 * it thinks; below 1: slower.
 */
export function fitExponent(answers) {
  let best = null;
  for (let k = 0.2; k <= 5; k += 0.05) {
    let ll = 0;
    for (const a of answers) {
      const p = Math.min(0.999, Math.max(0.001, chance(a.type, Math.pow(a.predicted, k))));
      ll += a.got ? Math.log(p) : Math.log(1 - p);
    }
    if (!best || ll > best.ll) best = { k, ll };
  }
  return best ? Math.round(best.k * 100) / 100 : null;
}

const pct = (x) => (x == null ? '—' : `${Math.round(x * 100)}%`);

/** The whole report, as lines of text, with the thresholds below which a number is not worth quoting. */
export function report(log) {
  const out = [];
  const { times, answers } = log;
  const days = Object.keys(log.days).length;
  out.push(`${answers.length} answers and ${times.length} timed cards, over ${days} day(s) of study.`);

  out.push('', 'Seconds per card (median; the app plans with its own measured pace once a type has 15):');
  const types = [...new Set(times.map((t) => t.type))].sort();
  for (const type of types) {
    const xs = times.filter((t) => t.type === type).map((t) => t.seconds);
    out.push(`  ${type.padEnd(11)} ${String(median(xs)).padStart(4)} s   (n=${xs.length})`);
  }

  out.push('', 'First answer on a card (right, raw):');
  const firsts = answers.filter((a) => a.sinceHours == null);
  for (const type of [...new Set(firsts.map((a) => a.type))].sort()) {
    const xs = firsts.filter((a) => a.type === type);
    out.push(`  ${type.padEnd(11)} ${pct(xs.filter((a) => a.got).length / xs.length).padStart(4)}   (n=${xs.length})`);
  }

  const afterMiss = answers.filter((a) => a.afterMiss && a.sinceHours != null);
  out.push('', `After a miss (${afterMiss.length} answers):`);
  for (const [lo, hi, label] of [
    [0, 1, 'under 1 h'],
    [1, 6, '1–6 h'],
    [6, 30, '6–30 h (next day)'],
    [30, 80, '30–80 h'],
    [80, Infinity, 'later'],
  ]) {
    const xs = afterMiss.filter((a) => a.sinceHours >= lo && a.sinceHours < hi);
    if (xs.length) out.push(`  ${label.padEnd(18)} ${pct(xs.filter((a) => a.got).length / xs.length).padStart(4)} right   (n=${xs.length})`);
  }
  const MIN_FIT = 30;
  if (afterMiss.length >= MIN_FIT) {
    const s = fitStabilityHours(afterMiss);
    out.push(
      `  Fitted memory after a miss: about ${s < 48 ? `${Math.round(s)} hours` : `${Math.round(s / 24)} days`} to fade to 37%.`,
      `  The app assumes 24 hours (FLOOR_DAYS). At the fitted rate, recall a day later is ${pct(Math.exp(-24 / s))}.`,
    );
  } else out.push(`  Not enough yet to fit (need ${MIN_FIT}).`);

  const reviews = answers.filter((a) => a.predicted != null && !a.afterMiss);
  out.push('', `The app's predictions on reviews (${reviews.length} answers, not counting after a miss):`);
  for (const [lo, hi] of [
    [0, 0.5],
    [0.5, 0.75],
    [0.75, 0.9],
    [0.9, 1.01],
  ]) {
    const xs = reviews.filter((a) => a.predicted >= lo && a.predicted < hi);
    if (!xs.length) continue;
    const predicted = xs.reduce((n, a) => n + chance(a.type, a.predicted), 0) / xs.length;
    const actual = xs.filter((a) => a.got).length / xs.length;
    out.push(`  predicted ${pct(lo)}–${pct(Math.min(1, hi))}:  expected ${pct(predicted)} right, got ${pct(actual)}   (n=${xs.length})`);
  }
  if (reviews.length >= MIN_FIT) {
    const k = fitExponent(reviews);
    out.push(
      `  Fitted: real recall ≈ predicted^${k}. ${
        k > 1.15 ? 'You forget faster than the app assumes.' : k < 0.87 ? 'You remember longer than the app assumes.' : 'The app is about right.'
      }`,
    );
  } else out.push(`  Not enough yet to fit (need ${MIN_FIT}).`);
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const file = process.argv[2];
  if (!file) {
    console.error('usage: node scripts/calibrate-log.mjs <backup or study-log .json>');
    process.exit(2);
  }
  console.log(report(readLog(JSON.parse(fs.readFileSync(file, 'utf8')))).join('\n'));
}
