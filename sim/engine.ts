import type { Course } from '@/schema/course';
import { recallId, type SessionItem } from '@/lib/buildSessionItems';
import { examRule } from '@/lib/exam';
import { splitSitting } from '@/lib/today';
import { forecast } from './experiments/forecast';
import { examTime, isDueFor, retrievability } from '@/lib/memory';
import { nextSectionToLearn } from '@/lib/nextToLearn';
import { scoredEntries } from '@/lib/scored';
import { sortedSections } from '@/lib/sortedSections';
import { useProgressStore } from '@/store/progress';
import { usePlanStore } from '@/store/plan';
import { useStudyLogStore } from '@/store/studyLog';
import { useSessionStore } from '@/store/session';
import { makeCourse, SHAPES } from './course';
import { rng, type Rand } from './random';
import { chanceRight, FIRST_TIME, MEMORY, SECONDS } from './student';

const DAY = 864e5;
const MIN = 6e4;
const COURSE_ID = 'sim';
/** Day 0 is a Saturday evening, a month before a late-October midterm. */
const START = new Date(2026, 8, 26, 19).getTime();

export interface Scenario {
  name: string;
  /** What this scenario is for, in a line. */
  why: string;
  shape: keyof typeof SHAPES | string;
  memory: keyof typeof MEMORY | string;
  /** Days of study before exam morning. */
  days: number;
  /** Minutes studied on a given day. */
  minutes: (day: number, r: Rand) => number;
  /** Sections released so far: `atStart`, then one every `everyDays`. */
  release: { atStart: number; everyDays: number };
  /** Whether the student gave the app the exam date. */
  examDate: boolean;
  /** Which sections the exam covers (0-based). All when omitted. */
  scope?: number[];
  /**
   * The exam covers only sections released at least this many days before
   * it: what is taught in the last days before a test is usually not on it.
   * Ignored when `scope` is given.
   */
  scopeCutoffDays?: number;
  /** Whether the student told the app which sections the exam covers. */
  tellsScope?: boolean;
  policy: keyof typeof POLICIES | string;
}

export interface DayRow {
  day: number;
  minutes: number;
  available: number;
  dueAtStart: number;
  reviewed: number;
  learnedNew: number;
  studied: number;
  /** In-scope items released but never studied, and whether the exam was steering Review. */
  unseen: number;
  protecting: boolean;
}

export interface Metrics {
  /** Expected exam score on the scope, 0-1: MCQs get the guessing floor, the rest do not. */
  expectedScore: number;
  /** Share of scope items still held at R >= 0.8 on exam morning. */
  held: number;
  /** Share of scope items never answered once. */
  neverStudied: number;
  /** What the app itself would have estimated the expected score to be. */
  appEstimate: number;
  /** Total minutes studied, and the share of them spent in Review. */
  minutes: number;
  reviewShare: number;
  /** Share of review answers given while the item was still >= 0.95 (too early to help much). */
  earlyReviews: number;
  /** Share of review answers given after it had fallen below 0.5 (too late: relearning). */
  lateReviews: number;
  /**
   * The late ones split by what the item was, as shares of all reviews: its
   * first review after being learned, its first after a miss, or a mature
   * item (reviewed right at least once before). They sum to lateReviews.
   */
  lateFirst: number;
  lateAfterMiss: number;
  lateMature: number;
  /** The most items due at the start of any one day. */
  peakDue: number;
  /** Day every scope section had been opened, or null if one never was. */
  allStartedDay: number | null;
  /** Expected score per scope section, in course order. */
  bySection: number[];
  /**
   * What the app's forecast (lib/forecast.ts) said on day 0 and day 10, as
   * [low, high, truth]: truth is the exam score on the sections the app had
   * when it said it (it cannot know later lectures).
   */
  forecast0: [number, number, number] | null;
  forecast10: [number, number, number] | null;
  /** Share of the known sections the forecast said would never be studied on day 0 / 10, and the truth: [said, truth]. */
  unseen0: [number, number] | null;
  unseen10: [number, number] | null;
}

export interface RunResult {
  scenario: string;
  seed: number;
  metrics: Metrics;
  days: DayRow[];
}

interface Truth {
  s: number;
  last: number;
  /** The last answer was a miss: the next review is the first since it was shown. */
  lapsed: boolean;
  /** Right answers since it was first learned or last missed. */
  successes: number;
}

/** The context a policy gets each day: its budget and the app's two doors. */
export interface Day {
  day: number;
  budgetMs: number;
  usedMs: () => number;
  /** Sections released so far. */
  available: number;
  /** Open Review, as the course page does, and study until it ends or time does. */
  review: (capMs?: number) => 'done' | 'out' | 'empty';
  /** Press Today: one sitting the app sizes to the day's minutes. */
  today: () => 'done' | 'out' | 'empty';
  /** Open Learn on the section the course page suggests. False when there is none to learn. */
  learn: (capMs?: number) => boolean;
  /** Scored items released but never answered. */
  unseen: () => number;
  /** How the app's Today plan would divide this day's minutes (lib/today.ts). */
  split: (cap?: number, withinDays?: number | null) => { reviewMs: number; learnMs: number };
  daysLeft: number;
}

export type Policy = (d: Day) => void;

/**
 * The Today plan: the split lib/today.ts computes, then Review up to its
 * share, Learn with the rest, and anything left over back to Review.
 */
const today =
  (cap?: number, withinDays?: number | null): Policy =>
  (d) => {
    const { reviewMs } = d.split(cap, withinDays);
    for (let k = 0; k < 20 && d.usedMs() < reviewMs; k++) if (d.review(reviewMs) !== 'done') break;
    while (d.usedMs() < d.budgetMs && d.learn()) {
      /* keep learning */
    }
    for (let k = 0; k < 20 && d.usedMs() < d.budgetMs; k++) if (d.review() !== 'done') break;
  };

export const POLICIES: Record<string, Policy> = {
  /** The student presses Today once, with their minutes set, and stops when it ends. */
  'today-button-once': (d) => {
    d.today();
  },
  /**
   * The same, and takes "Keep going" at the end while they still have time:
   * the sitting is planned in whole steps and usually ends a little early.
   */
  'today-button': (d) => {
    for (let k = 0; k < 5 && d.usedMs() < d.budgetMs; k++) if (d.today() !== 'done') break;
  },
  /** The Today plan as the app ships it (lib/today.ts defaults). */
  today: today(),
  /**
   * Experiment, 2026-09-26: cap Review at 60% whenever anything is unseen,
   * all month. Much worse at 30 min/day; kept for reference.
   */
  'today-cap-always': today(0.6, null),
  /**
   * What the app suggests today: Review leads the course page while
   * anything is due, then Learn carries on with the next section.
   */
  'follow-app': (d) => {
    for (let k = 0; k < 20 && d.usedMs() < d.budgetMs; k++) if (d.review() !== 'done') break;
    while (d.usedMs() < d.budgetMs && d.learn()) {
      /* keep learning */
    }
  },
  /**
   * An experiment: give new material its share first — what is unseen,
   * spread over the days left — then review. Tested 2026-09-25 and found far
   * worse at 30-45 min/day; kept as a reference point.
   */
  'learn-quota-first': (d) => {
    const perItemMs = 1.2 * MIN;
    const quota = Math.min(d.budgetMs * 0.7, (d.unseen() / Math.max(1, d.daysLeft - 2)) * perItemMs * 1.3);
    while (d.usedMs() < quota && d.learn(quota)) {
      /* keep learning */
    }
    for (let k = 0; k < 20 && d.usedMs() < d.budgetMs; k++) if (d.review() !== 'done') break;
    while (d.usedMs() < d.budgetMs && d.learn()) {
      /* keep learning */
    }
  },
};

export function simulate(sc: Scenario, seed: number): RunResult {
  const shape = SHAPES[sc.shape];
  const memory = MEMORY[sc.memory];
  const policy = POLICIES[sc.policy];
  if (!shape || !memory || !policy) throw new Error(`${sc.name}: unknown shape, memory or policy`);

  const full: Course = makeCourse(shape, 1);
  const examDay = new Date(START + sc.days * DAY);
  const examIso = `${examDay.getFullYear()}-${String(examDay.getMonth() + 1).padStart(2, '0')}-${String(examDay.getDate()).padStart(2, '0')}`;
  const examAt = examTime(examIso)!;
  const sections = sortedSections(full);
  const idsOf = (i: number) => scoredEntries(sections[i].items).map((e) => e.id);
  const releasedOn = (i: number) =>
    i < sc.release.atStart ? 0 : Math.ceil((i - sc.release.atStart + 1) * sc.release.everyDays);
  const scope =
    sc.scope ??
    sections.map((_, i) => i).filter((i) => sc.scopeCutoffDays == null || releasedOn(i) <= sc.days - sc.scopeCutoffDays);
  const scopeIds = scope.flatMap(idsOf);
  // The app sees the course as the student has built it so far: a section
  // is added when its lecture is, as with Add material.
  const courseOn = (available: number): Course => ({
    ...full,
    metadata: {
      ...full.metadata,
      ...(sc.examDate ? { exam_date: examIso } : {}),
      ...(sc.tellsScope ? { exam_sections: scope.map((i) => sections[i].id) } : {}),
    },
    sections: sections.slice(0, available),
  });
  const typeOf = new Map(sections.flatMap((s) => scoredEntries(s.items).map((e) => [e.id, e.item.type] as const)));

  const r = rng(seed * 7919 + 17);
  // How easy each item is for this student, 0.5-1.5.
  const ease = new Map<string, number>();
  const easeOf = (id: string) => ease.get(id) ?? (ease.set(id, 0.5 + r()), ease.get(id)!);
  const truth = new Map<string, Truth>();
  const primed = new Map<string, number>();
  const recallAt = (id: string, t: number) => {
    const T = truth.get(id);
    return T ? memory.recall((t - T.last) / DAY, T.s) : null;
  };
  const reviewing = (item: SessionItem, mode: string) => mode === 'review' || item._block === 'review';

  useProgressStore.setState({ byCourse: {} });
  // The simulated student's card times are the simulator's own assumptions;
  // logging them would feed them back as "measured" pace.
  useStudyLogStore.setState({ byCourse: {}, logCard: () => {}, logAnswer: () => {} });
  const store = useSessionStore.getState;
  let now = START;
  Date.now = () => now;

  const rows: DayRow[] = [];
  let reviewMs = 0;
  let totalMs = 0;
  let reviews = 0;
  let early = 0;
  let late = 0;
  let lateFirst = 0;
  let lateAfterMiss = 0;
  let lateMature = 0;
  let peakDue = 0;
  let allStartedDay: number | null = null;
  let resume: { section: string; item: string } | null = null;
  const forecasts: Record<number, { f: [number, number]; ids: string[]; unseen: number } | null> = {};

  for (let day = 0; day < sc.days; day++) {
    now = START + day * DAY;
    const available = Math.min(sections.length, sc.release.atStart + Math.floor(day / sc.release.everyDays));
    const budgetMs = sc.minutes(day, r) * MIN;
    let used = 0;
    let reviewed = 0;
    let learnedNew = 0;
    const course = courseOn(available);
    const progAtStart = useProgressStore.getState().getProgress(COURSE_ID);
    const exam = examRule(course, progAtStart, now);
    const dueAtStart = Object.keys(progAtStart).filter((id) => isDueFor(progAtStart[id], now, exam.forItem(id))).length;
    peakDue = Math.max(peakDue, dueAtStart);

    const answer = (item: SessionItem, mode: string) => {
      const R = recallAt(item.id, now);
      let p: number;
      if (R != null) p = chanceRight(item, R);
      else if (item.type === 'recall') {
        const at = primed.get(item.id);
        p = at != null ? FIRST_TIME.primedRecall * Math.exp(-(now - at) / (FIRST_TIME.primedFadeMinutes * MIN)) : FIRST_TIME.coldRecall;
      } else p = item.type === 'mcq' ? FIRST_TIME.mcq : FIRST_TIME.flashcard;
      const got = r() < p;
      const e = easeOf(item.id);
      const T = truth.get(item.id);
      // A review is a review whichever door it came through: Today's sitting
      // opens with its due cards. Judged by session mode alone, the suite's
      // default policy reported no reviews at all (2026-09-26 audit).
      if (reviewing(item, mode) && R != null && T) {
        reviews++;
        if (R >= 0.95) early++;
        if (R < 0.5) {
          late++;
          if (T.lapsed) lateAfterMiss++;
          else if (T.successes === 0) lateFirst++;
          else lateMature++;
        }
      }
      if (T == null) learnedNew++;
      else if (reviewing(item, mode)) reviewed++;
      truth.set(item.id, {
        s: got ? (T ? memory.grow(T.s, R ?? 0, e) : memory.first(e)) : memory.lapse(T?.s ?? null, e),
        last: now,
        lapsed: !got,
        // A first right answer starts the count; a right review adds to it.
        successes: got ? (T && !T.lapsed ? T.successes + 1 : 0) : 0,
      });
      store().record(got);
    };

    const run = (mode: 'review' | 'learn' | 'today', capMs: number, sectionId?: string, resumeId?: string) => {
      store().init(COURSE_ID, course, mode, sectionId, resumeId);
      if (!store().items.length) return 'empty' as const;
      for (;;) {
        if (used >= capMs) return 'out' as const;
        const item = store().current()!;
        const ms = SECONDS[item.type] * 1000;
        now += ms;
        used += ms;
        if (reviewing(item, mode)) reviewMs += ms;
        if (item.type === 'definition') primed.set(recallId(item.id), now);
        if (item.type === 'mcq' || item.type === 'flashcard' || item.type === 'recall') answer(item, mode);
        if (!store().next()) return 'done' as const;
      }
    };

    const d: Day = {
      day,
      budgetMs,
      usedMs: () => used,
      available,
      daysLeft: sc.days - day,
      review: (capMs = budgetMs) => run('review', capMs),
      today: () => {
        usePlanStore.setState({ byCourse: { [COURSE_ID]: { minutes: budgetMs / MIN } } });
        return run('today', budgetMs);
      },
      learn: (capMs = budgetMs) => {
        const next = nextSectionToLearn(course, useProgressStore.getState().getProgress(COURSE_ID));
        if (!next || next.index >= available || used >= capMs) return false;
        const out = run('learn', capMs, next.section.id, resume?.section === next.section.id ? resume.item : undefined);
        resume = out === 'out' ? { section: next.section.id, item: store().current()!.id } : null;
        return out === 'done';
      },
      split: (cap, withinDays) => {
        const plan = splitSitting(course, useProgressStore.getState().getProgress(COURSE_ID), now, budgetMs / MIN, cap, withinDays);
        return { reviewMs: plan.reviewMinutes * MIN, learnMs: plan.learnMinutes * MIN };
      },
      unseen: () => {
        const prog = useProgressStore.getState().getProgress(COURSE_ID);
        let n = 0;
        for (let i = 0; i < available; i++) for (const id of idsOf(i)) if (!prog[id]) n++;
        return n;
      },
    };
    // What the app would have told the student this morning. The forecast
    // uses the whole course's released sections; it is scored against the
    // scenario's true exam scope only when the student told the app.
    if ((day === 0 || day === 10) && sc.examDate) {
      const f = forecast(course, progAtStart, now, budgetMs / MIN || 1);
      const known = course.sections.map((s) => sections.indexOf(s)).filter((i) => !sc.tellsScope || scope.includes(i));
      forecasts[day] = f ? { f: [f.low, f.high], ids: known.flatMap(idsOf), unseen: f.unseen } : null;
    }
    if (budgetMs > 0) policy(d);
    totalMs += used;

    const prog = useProgressStore.getState().getProgress(COURSE_ID);
    if (allStartedDay == null && scope.every((i) => idsOf(i).some((id) => prog[id]))) allStartedDay = day;
    rows.push({
      day,
      minutes: Math.round(used / MIN),
      available,
      dueAtStart,
      reviewed,
      learnedNew,
      studied: Object.keys(prog).length,
      unseen: exam.unseen,
      protecting: exam.protecting,
    });
  }

  // Exam morning.
  const score = (id: string, R: number) => (typeOf.get(id) === 'mcq' ? R + (1 - R) * 0.25 : R);
  const prog = useProgressStore.getState().getProgress(COURSE_ID);
  let expected = 0;
  let held = 0;
  let never = 0;
  let app = 0;
  for (const id of scopeIds) {
    const R = recallAt(id, examAt) ?? 0;
    expected += score(id, R);
    if (R >= 0.8) held++;
    if (!truth.has(id)) never++;
    app += score(id, retrievability(prog[id], examAt) ?? 0);
  }
  const n = scopeIds.length || 1;
  const truthOn = (ids: string[]) => ids.reduce((sum, id) => sum + score(id, recallAt(id, examAt) ?? 0), 0) / (ids.length || 1);
  const unseenOn = (d: number): [number, number] | null => {
    const f = forecasts[d];
    return f ? [f.unseen, f.ids.filter((id) => !truth.has(id)).length / (f.ids.length || 1)] : null;
  };
  const scored = (d: number): [number, number, number] | null => {
    const f = forecasts[d];
    return f ? [f.f[0], f.f[1], truthOn(f.ids)] : null;
  };
  const bySection = scope.map((i) => {
    const ids = idsOf(i);
    return ids.reduce((sum, id) => sum + score(id, recallAt(id, examAt) ?? 0), 0) / (ids.length || 1);
  });

  return {
    scenario: sc.name,
    seed,
    days: rows,
    metrics: {
      expectedScore: expected / n,
      held: held / n,
      neverStudied: never / n,
      appEstimate: app / n,
      minutes: Math.round(totalMs / MIN),
      reviewShare: totalMs ? reviewMs / totalMs : 0,
      earlyReviews: reviews ? early / reviews : 0,
      lateReviews: reviews ? late / reviews : 0,
      lateFirst: reviews ? lateFirst / reviews : 0,
      lateAfterMiss: reviews ? lateAfterMiss / reviews : 0,
      lateMature: reviews ? lateMature / reviews : 0,
      peakDue,
      allStartedDay,
      bySection,
      forecast0: scored(0),
      forecast10: scored(10),
      unseen0: unseenOn(0),
      unseen10: unseenOn(10),
    },
  };
}
