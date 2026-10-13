import type { AnswerEvent } from '@/store/studyLog';
import { useStudyLogStore } from '@/store/studyLog';
import { setPersonalScale } from './memory';

/**
 * How much slower (above 1) or faster (below 1) this student forgets than the
 * memory model assumes, fitted from their own review answers.
 *
 * The model's defaults are a guess about students in general. The owner's
 * first backup (2026-10-13) had reviews a week or more after first answers
 * where the model expected about 8% recall and they got 11 of 12: under the
 * defaults, everything they learned came back the next day, and every
 * sitting was review. Anki's FSRS fits its parameters to each user's history
 * for the same reason; this fits one number.
 *
 * Cautious by construction: the fit is pulled toward 1 (a log-normal prior,
 * PRIOR_SD), so a handful of answers moves it a little and only a clear
 * pattern moves it far, and it is held to [MIN, MAX]. PRIOR_SD 0.3 was
 * chosen in the simulator (sim/FINDINGS.md, 2026-10-13): 0.5 cost the
 * default student up to 2 points; 0.3 kept it level and still gave a slow
 * forgetter +8 to +9. Answers given within
 * an hour of the last one (a miss coming back in the same sitting) say
 * nothing about forgetting and are left out.
 */

const PRIOR_SD = 0.3;
const MIN = 1 / 3;
const MAX = 4;
const MCQ_GUESS = 0.25;

export function fitPersonalScale(answers: readonly AnswerEvent[]): number {
  const reviews = answers.filter((a) => a.predicted != null && a.sinceHours != null && a.sinceHours >= 1);
  if (!reviews.length) return 1;
  // Recall at the default scale: predicted was read as exp(-d / (S·scale)).
  const base = reviews.map((a) => ({ r0: Math.pow(Math.min(1, Math.max(1e-6, a.predicted!)), a.scale ?? 1), mcq: a.type === 'mcq', got: a.got }));
  let best = 1;
  let bestScore = -Infinity;
  for (let m = MIN; m <= MAX + 1e-9; m *= 1.03) {
    let score = -(Math.log(m) ** 2) / (2 * PRIOR_SD ** 2);
    for (const { r0, mcq, got } of base) {
      const r = Math.pow(r0, 1 / m);
      const p = Math.min(0.999, Math.max(0.001, mcq ? r + (1 - r) * MCQ_GUESS : r));
      score += got ? Math.log(p) : Math.log(1 - p);
    }
    if (score > bestScore) {
      bestScore = score;
      best = m;
    }
  }
  return best;
}

/** Fits the scale from every lecture's log and puts it into effect. Forgetting is the student's, not a lecture's. */
export function applyPersonalScale(): number {
  const answers = Object.values(useStudyLogStore.getState().byCourse).flatMap((log) => log.answers);
  const scale = fitPersonalScale(answers);
  setPersonalScale(scale);
  return scale;
}
