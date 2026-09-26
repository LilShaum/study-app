import type { Course } from '@/lib/schema/course';
import type { ItemResult } from '@/lib/store/progress';
import { examRule } from '@/lib/exam';
import { examTime, isDueFor, memoryBefore, nextStability, reviewUrgency, stabilityOf } from '@/lib/memory';
import { sectionsToLearn } from '@/lib/nextToLearn';
import { scoredEntries } from '@/lib/scored';
import { sortedSections } from '@/lib/sortedSections';
import { cardSeconds, splitSitting } from '@/lib/today';

/**
 * EXPERIMENT — not in the app. See sim/FINDINGS.md, 2026-09-26: the
 * readiness forecast failed its check against the simulator and was held
 * back until it can be calibrated on real study logs (Phase 2).
 *
 * Where the student will stand on exam morning if they keep studying for
 * `minutes` a day with Today.
 *
 * A projection, day by day, with the app's own memory model and the same
 * rules Today uses — so what it says is what following the app does.
 *
 * Memory is the student's own: the app's model says how likely each review
 * was to come back right, the student's answers say how often it did, and
 * the gap is fitted as one number (see `forgetting`). The simulator showed
 * why: the app's model alone was right about an FSRS-shaped student and
 * badly hopeful about one who forgets faster (sim/FINDINGS.md). The range is
 * the uncertainty in that fit: wide with few reviews, narrowing with more.
 *
 * It covers the sections added so far — the app cannot know lectures that
 * have not happened.
 */
export interface Forecast {
  /** Expected share of exam questions answered right, 0-1. */
  low: number;
  high: number;
  /** Sections on the exam that would still be untouched on the day. */
  unstarted: { id: string; title: string }[];
  /** Share of what the exam covers that would never have been studied. */
  unseen: number;
  /** Days of study left, counting today if nothing has been done today. */
  days: number;
  /** How the student forgets against the app's model: <1 faster, >1 slower. */
  pace: number;
  /** Reviews the fit rests on. */
  evidence: number;
}

/**
 * How fast this student forgets, as a multiplier on the app's stabilities,
 * with the range the evidence allows.
 *
 * Every answer given after an earlier one is a test of the model: it
 * predicted recall R from the gap and the stability before, and the answer
 * was right or wrong. The latest such answer per item is known (the record
 * keeps the memory before it, and whether stability rose says whether it was
 * right). The multiplier is the one that makes those predictions most likely,
 * and the range is every multiplier within two log-likelihood units of it —
 * about a 95% interval. With no evidence the range is wide on purpose.
 */
export function forgetting(progress: Record<string, ItemResult>): { pace: number; low: number; high: number; n: number } {
  const obs: { days: number; s: number; got: boolean }[] = [];
  for (const r of Object.values(progress)) {
    const b = r.before;
    if (!b || r.lastSeen == null || r.stability == null) continue;
    obs.push({ days: Math.max(0, (r.lastSeen - b.lastSeen) / DAY_MS), s: b.stability, got: r.stability > b.stability });
  }
  const grid = Array.from({ length: 41 }, (_, i) => 0.2 * Math.pow(10, i / 40)); // 0.2 – 2
  const ll = grid.map((f) =>
    obs.reduce((sum, o) => {
      const R = Math.min(0.999, Math.max(0.001, Math.exp(-o.days / (o.s * f))));
      return sum + Math.log(o.got ? R : 1 - R);
    }, 0),
  );
  // Weak prior at 1 (the app's model), so a handful of answers cannot swing it.
  const post = ll.map((v, i) => v - 2 * Math.log(grid[i]) ** 2);
  const best = post.indexOf(Math.max(...post));
  const within = grid.filter((_, i) => post[i] >= post[best] - 2);
  return { pace: grid[best], low: Math.min(...within), high: Math.max(...within), n: obs.length };
}

const DAY_MS = 86_400_000;
const EVENING = 19;
/** MCQs have four options: a guess is right a quarter of the time. */
const GUESS = 0.25;

export function forecast(
  course: Course,
  progress: Record<string, ItemResult>,
  now: number,
  minutes: number,
): Forecast | null {
  const examAt = examTime(course.metadata.exam_date);
  if (examAt == null || examAt <= now) return null;

  const sections = sortedSections(course);
  const scope = new Set(course.metadata.exam_sections?.length ? course.metadata.exam_sections : sections.map((s) => s.id));
  const typeOf = new Map<string, string>();
  const sectionOf = new Map<string, string>();
  // Seconds Learn takes per scored item in a section, reading included.
  const learnCost = new Map<string, number>();
  for (const s of sections) {
    const scored = scoredEntries(s.items);
    for (const { id, item } of scored) {
      typeOf.set(id, item.type === 'definition' ? 'recall' : item.type);
      sectionOf.set(id, s.id);
    }
    const seconds = s.items.reduce((n, i) => n + cardSeconds(i) + (i.type === 'definition' ? cardSeconds({ type: 'recall' }) : 0), 0);
    learnCost.set(s.id, scored.length ? seconds / scored.length : 0);
  }

  // Start today unless today's studying is done.
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const studiedToday = Object.values(progress).some((r) => (r.lastSeen ?? 0) >= today.getTime());
  const first = new Date(today);
  first.setDate(first.getDate() + (studiedToday ? 1 : 0));
  first.setHours(EVENING);
  const days: number[] = [];
  for (let t = first.getTime(); t < examAt - DAY_MS / 4; t += DAY_MS) days.push(Math.max(t, now));

  const project = (factor: number) => {
    const state: Record<string, ItemResult> = { ...progress };
    const recallAt = (r: ItemResult | undefined, at: number) => {
      const s = stabilityOf(r);
      return s == null ? null : Math.exp(-Math.max(0, at - r!.lastSeen!) / DAY_MS / (s * factor));
    };
    // A review is right with chance R, so memory moves by the expected
    // amount rather than as if every likely answer were right — which made
    // the first version 10–15 points too hopeful in the simulator.
    const answer = (id: string, chance: number, at: number) => {
      const prev = state[id] ?? { got: 0, missed: 0, lastSeen: null };
      const before = memoryBefore(prev);
      state[id] = {
        got: prev.got + (chance >= 0.5 ? 1 : 0),
        missed: prev.missed + (chance >= 0.5 ? 0 : 1),
        lastSeen: at,
        stability: chance * nextStability(before, true, at) + (1 - chance) * nextStability(before, false, at),
      };
    };

    for (const t of days) {
      const exam = examRule(course, state, t);
      const due = [...typeOf.keys()]
        .filter((id) => isDueFor(state[id], t, exam.forItem(id)))
        .sort((a, b) => reviewUrgency(state[a], t, exam.forItem(a)) - reviewUrgency(state[b], t, exam.forItem(b)));
      const cost = (id: string) => cardSeconds({ type: typeOf.get(id)! });
      const plan = splitSitting(course, state, t, minutes, undefined, undefined, due.reduce((n, id) => n + cost(id), 0));
      let left = minutes * 60;
      let reviewLeft = plan.reviewMinutes * 60;
      for (const id of due) {
        if (cost(id) > reviewLeft) break;
        reviewLeft -= cost(id);
        left -= cost(id);
        answer(id, recallAt(state[id], t) ?? 0, t);
      }
      // Learn with the rest, and with whatever Review did not need, as
      // "Keep going" does.
      for (const { section } of sectionsToLearn(course, state, t)) {
        const each = learnCost.get(section.id) ?? 60;
        for (const { id } of scoredEntries(section.items)) {
          if (left < each) break;
          const r = state[id];
          if (r && r.got + r.missed > 0) continue;
          answer(id, 1, t);
          left -= each;
        }
        if (left <= 0) break;
      }
    }

    let score = 0;
    let n = 0;
    let never = 0;
    const touched = new Set<string>();
    for (const [id, type] of typeOf) {
      const sid = sectionOf.get(id)!;
      if (!scope.has(sid)) continue;
      const R = recallAt(state[id], examAt) ?? 0;
      if (state[id]) touched.add(sid);
      else never++;
      score += type === 'mcq' ? R + (1 - R) * GUESS : R;
      n++;
    }
    return { score: n ? score / n : 0, touched, never: n ? never / n : 0 };
  };

  const fit = forgetting(progress);
  const high = project(fit.high);
  const low = project(fit.low);
  return {
    low: low.score,
    high: high.score,
    unstarted: sections
      .filter((s) => scope.has(s.id) && !high.touched.has(s.id) && scoredEntries(s.items).length)
      .map((s) => ({ id: s.id, title: s.title })),
    unseen: high.never,
    days: days.length,
    pace: fit.pace,
    evidence: fit.n,
  };
}
